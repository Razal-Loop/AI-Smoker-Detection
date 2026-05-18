const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

const CHALLAN_CONF_THRESHOLD = parseFloat(process.env.CHALLAN_CONF_THRESHOLD || '0.6', 10);

function isSmokingLabel(label) {
  if (!label || typeof label !== 'string') return false;
  const n = label.toLowerCase();
  return ['smoker', 'smoking', 'cigarette', 'cigar', 'smoke', 'cig', 'smk', 'vape', 'tobacco'].some(k => n.includes(k));
}

function smokingConfidenceOk(detection) {
  const conf = detection && (detection.confidence != null ? detection.confidence : 1);
  return typeof conf === 'number' && !Number.isNaN(conf) && conf >= CHALLAN_CONF_THRESHOLD;
}

class DetectionService {
  constructor() {
    this.activeDetections = {};     // Tracks active cameras
    this.pythonProcesses = {};      // One Python process per camera
    this.isWarmingCache = false;
    this.studentsListener = null;
    this.recentChallans = {};       // Cool-down tracker: { studentId: timestamp }
  }

  /**
   * LISTEN FOR STUDENT CHANGES
   * Real-time sync of biometric cache when new students register.
   */
  listenForStudentChanges() {
    if (this.studentsListener) return;

    console.log('📡 Subscribing to Student Biometric Updates...');
    this.studentsListener = admin.firestore().collection('users')
      .where('role', '==', 'student')
      .onSnapshot(snapshot => {
        // Debounce if many changes happen at once
        if (this.warmupTimer) clearTimeout(this.warmupTimer);
        this.warmupTimer = setTimeout(() => {
          this.warmUpFaceCache().catch(err => console.error('Cache sync error:', err));
        }, 5000); // Wait 5s for batch updates
      }, err => {
        console.error('Student listener error:', err);
      });
  }

  /**
   * WARM UP FACE CACHE
   * Downloads student photos and pre-encodes them to speed up recognition.
   */
  async warmUpFaceCache() {
    if (this.isWarmingCache) return;
    this.isWarmingCache = true;
    console.log('🔥 Initializing Biometric Cache Warmer...');

    try {
      const studentsSnapshot = await admin.firestore().collection('users')
        .where('role', '==', 'student')
        .get();

      const students = [];
      studentsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.photoUrl) {
          students.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            studentId: data.studentId,
            photoUrl: data.photoUrl
          });
        }
      });

      if (students.length === 0) {
        console.log('ℹ️ No students with photos found for caching.');
        this.isWarmingCache = false;
        return;
      }

      const pythonScript = path.join(__dirname, 'face_encoder.py');
      const cachePath = path.join(__dirname, 'student_encodings.pkl');
      const studentsJson = JSON.stringify(students);

      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const proc = spawn(pythonCmd, [pythonScript, studentsJson, cachePath]);

      proc.stdout.on('data', (data) => {
        try {
          const result = JSON.parse(data.toString());
          if (result.status === 'success') {
            console.log(`✅ Biometric Cache Ready: ${result.encoded_count} students encoded in ${result.duration_sec}s`);
          }
        } catch (e) {
          // Progress updates or other text
          if (data.toString().includes('Encoded:')) {
            // Optional: log progress
          }
        }
      });

      proc.on('close', (code) => {
        this.isWarmingCache = false;
      });

    } catch (err) {
      console.error('❌ Failed to warm up biometric cache:', err);
      this.isWarmingCache = false;
    }
  }

  /**
   * START LIVE DETECTION
   * For mobile/guard app cameras, frames are sent via socket; do not spawn a live Python process.
   * For fixed cameras (RTSP/URL), spawn yolo_live_detection.py.
   */
  async startDetection(cameraId, io, cameraUrl = null) {
    if (this.activeDetections[cameraId]?.isActive) {
      console.log(`[${cameraId}] Detection already active`);
      return;
    }

    const isAppCamera = /mobile-cam|guard-cam/i.test(cameraId || '');
    this.activeDetections[cameraId] = {
      isActive: true,
      startTime: new Date().toISOString(),
    };

    if (isAppCamera) {
      console.log(`[${cameraId}] App camera: detection active (frames via socket)`);
      return;
    }

    const pythonScript = path.join(__dirname, 'yolo_live_detection.py');
    const modelPath = path.resolve(__dirname, '../models/best.pt');

    if (!fs.existsSync(pythonScript)) {
      throw new Error("Python live detection script missing.");
    }
    if (!fs.existsSync(modelPath)) {
      throw new Error("YOLO model file missing.");
    }

    // Default to camera ID if no URL provided
    const cameraSource = cameraUrl || cameraId;
    const args = [pythonScript, cameraId, cameraSource, modelPath];

    // Use python3 if available, fallback to python
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const pyProcess = spawn(pythonCmd, args);

    this.pythonProcesses[cameraId] = pyProcess;

    // Listen for Python stdout (JSON detections)
    pyProcess.stdout.on('data', async (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (let line of lines) {
        try {
          const detection = JSON.parse(line.trim());
          await this.handleDetection(detection, cameraId, io);
        } catch (err) {
          // Ignore non-JSON lines (like print statements)
          if (line.trim() && !line.trim().startsWith('{')) {
            console.log(`[${cameraId}] Python output:`, line.trim());
          }
        }
      }
    });

    // Listen for Python stderr (errors)
    pyProcess.stderr.on('data', (data) => {
      console.error(`[${cameraId}] Python error:`, data.toString());
    });

    // Handle process exit and auto-reconnect
    pyProcess.on('close', (code) => {
      console.warn(`[${cameraId}] Detection process exited with code ${code}`);
      delete this.pythonProcesses[cameraId];
      if (this.activeDetections[cameraId]?.isActive) {
        console.log(`[${cameraId}] Attempting to restart detection in 5s...`);
        setTimeout(() => this.startDetection(cameraId, io, cameraUrl || cameraId), 5000);
      }
    });

    pyProcess.on('error', (err) => {
      console.error(`[${cameraId}] Failed to start Python process:`, err);
      delete this.pythonProcesses[cameraId];
      this.activeDetections[cameraId].isActive = false;
    });
  }

  /**
   * STOP LIVE DETECTION
   */
  async stopDetection(cameraId) {
    if (!this.activeDetections[cameraId]) {
      return;
    }

    this.activeDetections[cameraId].isActive = false;

    if (this.pythonProcesses[cameraId]) {
      try {
        this.pythonProcesses[cameraId].kill();
      } catch (err) {
        console.error(`[${cameraId}] Error killing process:`, err);
      }
      delete this.pythonProcesses[cameraId];
    }

    delete this.activeDetections[cameraId];
    console.log(`[${cameraId}] Detection stopped.`);
  }

  /**
   * MATCH FACE WITH STUDENT
   * Uses face recognition to identify student from detected face
   */
  async matchFaceWithStudent(faceImagePath) {
    try {
      const db = admin.firestore();
      // Get all students
      const studentsSnapshot = await db.collection('users')
        .where('role', '==', 'student')
        .get();

      const students = [];
      studentsSnapshot.forEach(doc => {
        const data = doc.data();
        // Filter students with photos (Firestore doesn't support != null)
        if (data.photoUrl) {
          students.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            studentId: data.studentId,
            photoUrl: data.photoUrl
          });
        }
      });

      if (students.length === 0) {
        return null;
      }

      const pythonScript = path.join(__dirname, 'face_recognition.py');
      const studentsJson = JSON.stringify(students);

      return new Promise((resolve, reject) => {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const proc = spawn(pythonCmd, [pythonScript, faceImagePath, studentsJson]);

        let output = '';
        let errorOutput = '';

        proc.stdout.on('data', (data) => {
          output += data.toString();
        });

        proc.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(output);
              resolve(result.matchedStudent);
            } catch (err) {
              console.error('Error parsing face recognition result:', err);
              resolve(null);
            }
          } else {
            // Check for missing library specifically
            if (errorOutput.includes('ModuleNotFoundError') && errorOutput.includes('face_recognition')) {
              console.warn('⚠️ Face recognition skipped: library not installed in Python environment.');
            } else {
              console.error('Face recognition failed:', errorOutput);
            }
            resolve(null);
          }
        });

        proc.on('error', (err) => {
          console.error('Face recognition process error:', err);
          resolve(null);
        });
      });
    } catch (err) {
      console.error('Error matching face:', err);
      return null;
    }
  }

  /**
   * HANDLE DETECTION RESULTS
   * Save image to Firebase Storage, metadata to Firestore, emit via Socket.io
   * Match faces with students and auto-generate challans
   */
  async handleDetection(result, cameraId, io) {
    if (!result || !result.detected) {
      return;
    }

    const detections = result.detections || [result]; // Support both old single-det and new grouped format
    let imageUrl = null;
    let matchedStudent = null;

    // Save proof image to Firebase Storage
    const reportPath = result.report_image || result.report_image;
    if (reportPath && fs.existsSync(reportPath)) {
      try {
        const bucket = admin.storage().bucket();
        const buffer = fs.readFileSync(reportPath);
        const filename = `detections/${cameraId}_${uuidv4()}.jpg`;
        const file = bucket.file(filename);
        await file.save(buffer, { contentType: "image/jpeg" });
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        result.imageUrl = imageUrl;

        // Try to match face with student IF smoking was detected in this frame
        const hasSmoking = detections.some(d => isSmokingLabel(d.label));

        if (hasSmoking) {
          // If we have specific face crops (new format)
          if (result.face_images && result.face_images.length > 0) {
            for (const face of result.face_images) {
              if (fs.existsSync(face.path)) {
                matchedStudent = await this.matchFaceWithStudent(face.path);
                fs.unlink(face.path, () => { }); // Clean up face crop
                if (matchedStudent) break;
              }
            }
          }
          // Fallback to matching from the main report image (old format or backup)
          if (!matchedStudent && (result.label === 'face' || result.label === 'smoker')) {
            matchedStudent = await this.matchFaceWithStudent(reportPath);
          }
        }

        // Remove local report file
        fs.unlink(reportPath, (err) => {
          if (err) console.error(`[${cameraId}] Failed to delete temp image:`, err);
        });
      } catch (err) {
        console.error(`[${cameraId}] Firebase save error:`, err);
      }
    }

    // Save metadata to Firestore
    try {
      const db = admin.firestore();
      const detectionData = {
        cameraId,
        timestamp: result.timestamp || new Date().toISOString(),
        imageUrl: imageUrl || null,
        detectionImageUrl: imageUrl || null,
        detections: detections.map(d => ({ label: d.label, confidence: d.confidence, bbox: d.bbox })),
        detected: true,
      };

      if (matchedStudent) {
        detectionData.studentId = matchedStudent.id;
        detectionData.studentName = matchedStudent.name;
        detectionData.studentEmail = matchedStudent.email;
        detectionData.studentStudentId = matchedStudent.studentId;
        detectionData.matchConfidence = matchedStudent.confidence;
      }

      const docRef = await db.collection("detections").add(detectionData);
      const detectionId = docRef.id;

      // Auto-generate challan with cool-down (e.g., 5 minutes)
      const smokingDet = detections.find(d => isSmokingLabel(d.label) && smokingConfidenceOk(d));
      const COOLDOWN_MS = 5 * 60 * 1000; // 5 minute cool-down

      if (matchedStudent && smokingDet) {
        const lastChallanTime = this.recentChallans[matchedStudent.id] || 0;
        const now = Date.now();

        if (now - lastChallanTime > COOLDOWN_MS) {
          try {
            const challanAmount = parseInt(process.env.CHALLAN_AMOUNT || '500', 10);
            await db.collection("challans").add({
              studentId: matchedStudent.id,
              studentName: matchedStudent.name,
              studentEmail: matchedStudent.email,
              amount: challanAmount,
              status: 'pending',
              description: 'Smoking detected via AI camera system',
              location: result.location || 'Campus Sector A',
              detectionId,
              detectionImageUrl: imageUrl,
              imageUrl: imageUrl,
              createdAt: new Date().toISOString(),
              autoGenerated: true,
            });
            this.recentChallans[matchedStudent.id] = now;
            console.log(`[${cameraId}] ✅ Auto-generated challan for ${matchedStudent.name} (Amount: Rs ${challanAmount})`);
          } catch (challanErr) {
            console.error(`[${cameraId}] Failed to auto-generate challan:`, challanErr);
          }
        } else {
          console.log(`[${cameraId}] ⏳ Skipping challan for ${matchedStudent.name} (Cool-down active)`);
        }
      }
    } catch (err) {
      console.error(`[${cameraId}] Firestore save error:`, err);
    }

    // Emit via Socket.io
    if (io) {
      io.emit("detection", { cameraId, ...result, detections, matchedStudent });
    }
  }

  /**
   * IMAGE UPLOAD DETECTION
   */
  async detectSmoking(imagePath) {
    const pythonScript = path.join(__dirname, 'yolo_image_detection.py');
    const modelPath = path.resolve(__dirname, '../models/best.pt');

    if (!fs.existsSync(pythonScript)) {
      throw new Error("Python image detection script missing.");
    }
    if (!fs.existsSync(modelPath)) {
      throw new Error("YOLO model file missing.");
    }

    return new Promise((resolve, reject) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const pyProcess = spawn(pythonCmd, [pythonScript, imagePath, modelPath]);
      let output = "";
      let errorOutput = "";

      pyProcess.stdout.on("data", (data) => {
        output += data.toString();
      });

      pyProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error("Python error:", data.toString());
      });

      pyProcess.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (err) {
            reject(new Error(`Invalid JSON output from Python: ${output.substring(0, 200)}`));
          }
        } else {
          reject(new Error(`Detection failed with code ${code}: ${errorOutput.substring(0, 200)}`));
        }
      });

      pyProcess.on("error", (err) => {
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });
    });
  }

  /**
   * PROCESS SINGLE FRAME FROM MOBILE APP (Socket.io)
   * @param {string} cameraId
   * @param {Buffer} frameBuffer - JPEG buffer
   * @param {SocketIO.Server} io
   */
  async processFrame(cameraId, frameBuffer, io) {
    const pythonScript = path.join(__dirname, 'yolo_frame_detection.py');
    const modelPath = path.resolve(__dirname, '../models/best.pt');

    if (!fs.existsSync(pythonScript) || !fs.existsSync(modelPath)) {
      throw new Error("Python script or model missing");
    }

    return new Promise((resolve, reject) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const proc = spawn(pythonCmd, [pythonScript, modelPath]);

      let output = '';
      let errorOutput = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`[${cameraId}] Python error:`, data.toString());
      });

      proc.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${errorOutput.substring(0, 200)}`));
          return;
        }

        try {
          const result = JSON.parse(output);

          if (result.modelClasses && result.modelClasses.length > 0 && process.env.NODE_ENV !== 'production') {
            console.log(`[${cameraId}] Model classes: ${result.modelClasses.join(', ')}`);
          }
          if (result.detections && result.detections.length > 0) {
            const labels = result.detections.map(d => d.label).filter(Boolean);
            console.log(`[${cameraId}] Detections (${result.detections.length}): ${labels.join(', ')}`);
          }

          const hasSmoking = result.detections?.some(d =>
            isSmokingLabel(d.label)
          );

          // Save snapshot only when smoking is detected (image of smoker)
          if (hasSmoking && result.snapshot) {
            try {
              const bucket = admin.storage().bucket();
              const fileName = `detections/${cameraId}_${uuidv4()}.jpg`;
              const file = bucket.file(fileName);
              await file.save(Buffer.from(result.snapshot, 'base64'), { contentType: 'image/jpeg' });
              result.imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            } catch (err) {
              console.error(`[${cameraId}] Failed to save snapshot:`, err);
            }
          }

          // Match faces and identify students (only when smoking detected)
          let matchedStudent = null;

          if (hasSmoking && result.faceImages && result.faceImages.length > 0) {
            try {
              // Create temp directory if it doesn't exist
              const tempDir = path.join(__dirname, '../temp');
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }

              // Try to match each detected face
              for (const faceImage of result.faceImages) {
                if (faceImage.image) {
                  // Save base64 face image temporarily
                  const tempPath = path.join(tempDir, `face_${uuidv4()}.jpg`);
                  const imageBuffer = Buffer.from(faceImage.image, 'base64');
                  fs.writeFileSync(tempPath, imageBuffer);

                  matchedStudent = await this.matchFaceWithStudent(tempPath);

                  // Clean up temp file
                  fs.unlink(tempPath, () => { });

                  if (matchedStudent) {
                    result.matchedStudent = matchedStudent;
                    console.log(`[${cameraId}] Matched student: ${matchedStudent.name} (confidence: ${matchedStudent.confidence})`);
                    break; // Use first match
                  }
                }
              }
            } catch (err) {
              console.error(`[${cameraId}] Face matching error:`, err);
            }
          }

          // Save to Firestore only when smoking is detected AND we have proof image (so every record has proof)
          if (hasSmoking) {
            const proofUrl = result.imageUrl || null;
            if (proofUrl) {
              try {
                const db = admin.firestore();
                const detectionData = {
                  cameraId,
                  detections: result.detections,
                  timestamp: new Date().toISOString(),
                  imageUrl: proofUrl,
                  detectionImageUrl: proofUrl,
                };

                if (matchedStudent) {
                  detectionData.studentId = matchedStudent.id;
                  detectionData.studentName = matchedStudent.name;
                  detectionData.studentEmail = matchedStudent.email;
                  detectionData.studentStudentId = matchedStudent.studentId;
                  detectionData.matchConfidence = matchedStudent.confidence;
                }

                const detRef = await db.collection("detections").add(detectionData);
                const detectionId = detRef.id;

                const hasSmokingHighConf = result.detections.some(d =>
                  isSmokingLabel(d.label) && smokingConfidenceOk(d)
                );

                if (matchedStudent && hasSmokingHighConf) {
                  try {
                    await db.collection("challans").add({
                      studentId: matchedStudent.id,
                      studentName: matchedStudent.name,
                      studentEmail: matchedStudent.email,
                      amount: 500,
                      status: 'pending',
                      description: 'Smoking detected via AI camera system',
                      location: 'Campus',
                      detectionId,
                      detectionImageUrl: proofUrl,
                      imageUrl: proofUrl,
                      createdAt: new Date().toISOString(),
                      autoGenerated: true,
                    });
                    console.log(`[${cameraId}] Auto-generated challan for ${matchedStudent.name}`);
                  } catch (challanErr) {
                    console.error(`[${cameraId}] Failed to auto-generate challan:`, challanErr);
                  }
                }
              } catch (err) {
                console.error(`[${cameraId}] Failed to save to Firestore:`, err);
              }
            } else {
              console.warn(`[${cameraId}] Smoking detected but no proof image (Storage save may have failed); skipping Firestore save.`);
            }
          }

          // Emit via socket only when smoking was detected (capture event)
          if (io && hasSmoking) {
            io.emit('detection', { cameraId, ...result });
          }

          resolve(result);
        } catch (err) {
          reject(new Error(`Failed to parse result: ${err.message}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });

      // Send frame buffer to Python via stdin
      proc.stdin.write(frameBuffer);
      proc.stdin.end();
    });
  }
}

module.exports = new DetectionService();
