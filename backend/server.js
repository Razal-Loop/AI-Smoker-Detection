const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const admin = require('firebase-admin');

// Read ServiceAccount from environment variable (Railway) or file (local)
let serviceAccount;
if (process.env.NODE_ENV === 'test') {
  serviceAccount = {};
} else if (process.env.SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    console.log('✅ Using ServiceAccount from environment variable');
  } catch (e) {
    console.error('Error parsing SERVICE_ACCOUNT_JSON, falling back to file:', e);
    serviceAccount = require('./serviceAccount.json');
  }
} else {
  serviceAccount = require('./serviceAccount.json');
  console.log('✅ Using ServiceAccount from file');
}

const detectionService = require('./services/detectionService');
const { requireAuth } = require('./middleware/auth');
const { apiLimiter, detectionProcessLimiter, detectionControlLimiter } = require('./middleware/rateLimit');
const { errorHandler, log } = require('./middleware/errorHandler');

// Use env bucket or derive from ServiceAccount. GCS bucket name must be project-id.appspot.com
// (not .firebasestorage.app — that is for client download URLs only).
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ||
  (serviceAccount && serviceAccount.project_id ? `${serviceAccount.project_id}.appspot.com` : '');
if (process.env.NODE_ENV !== 'test') {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: storageBucket || 'default',
  });
}

const app = express();
const server = http.createServer(app);

// Production: restrict CORS to frontend origin(s)
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : undefined);
const io = new Server(server, {
  cors: {
    origin: corsOrigin || '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors(corsOrigin ? { origin: corsOrigin.split(',').map(s => s.trim()) } : {}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    log('debug', `${req.method} ${req.path}`);
    next();
  });
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Server is running' }));
app.use('/api', apiLimiter);

// -------------------
// SOCKET.IO CONNECTION
// -------------------
io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  // Receive base64 frame from mobile Expo camera
  socket.on('frame', async ({ cameraId, image }) => {
    if (!cameraId || !image) {
      socket.emit('detection_error', { error: 'Missing cameraId or image' });
      return;
    }

    try {
      const buffer = Buffer.from(image, 'base64');
      // Use processFrame which includes face recognition
      const result = await detectionService.processFrame(cameraId, buffer, io);

      // Send detection results back to client
      socket.emit('detection_result', result);
    } catch (err) {
      console.error('Frame processing error:', err);
      socket.emit('detection_error', { error: err.message });
    }
  });

  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// -------------------
// IMAGE UPLOAD DETECTION
// -------------------
const multer = require('multer');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = 'uploads/';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.post('/api/detection/process', detectionProcessLimiter, requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  try {
    const result = await detectionService.detectSmoking(req.file.path);
    fs.unlink(req.file.path, () => { });
    res.json({ success: true, detections: result.detections });
  } catch (err) {
    console.error('Image detection error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Detection endpoints
app.post('/api/detection/start', detectionControlLimiter, requireAuth, async (req, res) => {
  try {
    const { cameraId, cameraUrl } = req.body;
    if (!cameraId) {
      return res.status(400).json({ success: false, error: 'cameraId is required' });
    }

    await detectionService.startDetection(cameraId, io, cameraUrl);
    res.json({ success: true, message: 'Detection started', cameraId });
  } catch (error) {
    log('error', 'Error starting detection', { error: error.message });
    console.error('Error starting detection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/detection/stop', detectionControlLimiter, requireAuth, async (req, res) => {
  try {
    const { cameraId } = req.body;
    if (!cameraId) {
      return res.status(400).json({ success: false, error: 'cameraId is required' });
    }

    await detectionService.stopDetection(cameraId);
    res.json({ success: true, message: 'Detection stopped', cameraId });
  } catch (error) {
    console.error('Error stopping detection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/detection/status/:cameraId', requireAuth, (req, res) => {
  const { cameraId } = req.params;
  const status = detectionService.activeDetections[cameraId] || { isActive: false };
  res.json(status);
});

// Challan endpoints (using Firestore)
app.get('/api/challans', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.query;
    const db = admin.firestore();
    let q = db.collection('challans');

    if (studentId) {
      q = q.where('studentId', '==', studentId);
    }

    const snapshot = await q.orderBy('createdAt', 'desc').get();
    const challans = [];
    snapshot.forEach(doc => {
      challans.push({ id: doc.id, ...doc.data() });
    });

    res.json(challans);
  } catch (error) {
    log('error', 'Error fetching challans', { error: error.message });
    console.error('Error fetching challans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validation helpers
function validateChallanCreate(body) {
  const { amount } = body || {};
  const num = Number(amount);
  if (amount === undefined || amount === null || Number.isNaN(num) || num <= 0) {
    return { error: 'amount must be a positive number' };
  }
  const status = body.status;
  if (status && !['pending', 'paid', 'cancelled'].includes(status)) {
    return { error: 'status must be pending, paid, or cancelled' };
  }
  return null;
}

function validateChallanUpdate(body) {
  if (body.amount !== undefined) {
    const num = Number(body.amount);
    if (Number.isNaN(num) || num < 0) return { error: 'amount must be a non-negative number' };
  }
  if (body.status && !['pending', 'paid', 'cancelled'].includes(body.status)) {
    return { error: 'status must be pending, paid, or cancelled' };
  }
  return null;
}

app.post('/api/challans', requireAuth, async (req, res) => {
  const validation = validateChallanCreate(req.body);
  if (validation) return res.status(400).json({ error: validation.error });

  try {
    const db = admin.firestore();
    const { studentId, studentName, amount, reason, description, location, imageUrl, status } = req.body;
    const challanData = {
      studentId: studentId ? String(studentId).trim() : 'UNIDENTIFIED',
      studentName: studentName ? String(studentName) : 'UNKNOWN ENTITY',
      amount: Number(amount),
      reason: reason != null ? String(reason) : (description || ''),
      description: description != null ? String(description) : '',
      location: location != null ? String(location) : '',
      imageUrl: imageUrl != null ? String(imageUrl) : '',
      status: status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('challans').add(challanData);
    res.json({ id: docRef.id, ...challanData });
  } catch (error) {
    log('error', 'Error creating challan', { error: error.message });
    console.error('Error creating challan:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/challans/:id', requireAuth, async (req, res) => {
  const validation = validateChallanUpdate(req.body);
  if (validation) return res.status(400).json({ error: validation.error });

  try {
    const { id } = req.params;
    const db = admin.firestore();
    const allowed = ['status', 'amount', 'reason'];
    const updates = { updatedAt: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (updates.amount !== undefined) updates.amount = Number(updates.amount);

    await db.collection('challans').doc(id).update(updates);
    const doc = await db.collection('challans').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Challan not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error updating challan:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/challans/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = admin.firestore();
    await db.collection('challans').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting challan:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/challans/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = admin.firestore();
    const doc = await db.collection('challans').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching challan:', error);
    res.status(500).json({ error: error.message });
  }
});

// User endpoints
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const { role } = req.query;
    const db = admin.firestore();
    let q = db.collection('users');

    if (role) {
      q = q.where('role', '==', role);
    }

    const snapshot = await q.get();
    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

async function authenticateAdmin(req, res, next) {
  try {
    const idToken = req.headers.authorization?.split(' ')[1];
    if (!idToken) return res.status(401).json({ error: 'No token provided' });
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userRef = admin.firestore().collection('users').doc(decodedToken.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'User is not admin' });
    }
    req.admin = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

app.post('/api/users', authenticateAdmin, async (req, res) => {
  try {
    const { email, password, name, role, photoBase64, ...extra } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['student', 'guard', 'security_head'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    let foundUser;
    try {
      foundUser = await admin.auth().getUserByEmail(email);
    } catch { }

    if (foundUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    let photoUrl = extra.photoUrl || null;

    // Handle photo upload if provided via Base64
    if (photoBase64 && role === 'student') {
      try {
        const bucket = admin.storage().bucket();
        const filename = `student-photos/${email}_${Date.now()}.jpg`;
        const file = bucket.file(filename);

        const buffer = Buffer.from(photoBase64, 'base64');
        await file.save(buffer, {
          metadata: { contentType: 'image/jpeg' },
          public: true,
          resumable: false
        });

        // Construct a public URL
        photoUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      } catch (uploadError) {
        console.error('Error uploading photo to storage:', uploadError);
        // Continue user creation even if photo upload fails, but log it
      }
    }

    const userRecord = await admin.auth().createUser({ email, password, displayName: name });
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      name,
      role,
      ...extra,
      photoUrl,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ success: true, userId: userRecord.uid, photoUrl });
  } catch (e) {
    console.error('Error creating user:', e);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, name, role, photoBase64, ...extra } = req.body;
    const db = admin.firestore();

    // Verification: Admin can edit anyone, users can only edit themselves
    if (req.user.role !== 'admin' && req.user.uid !== id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const updates = {};
    const authUpdates = {};

    if (email) {
      authUpdates.email = email;
      updates.email = email;
    }
    if (name) {
      authUpdates.displayName = name;
      updates.name = name;
    }
    if (password) {
      authUpdates.password = password;
    }
    if (role && req.user.role === 'admin') {
      updates.role = role;
    }

    // Handle photo update if provided
    if (photoBase64) {
      try {
        const bucket = admin.storage().bucket();
        const filename = `student-photos/${email || id}_${Date.now()}.jpg`;
        const file = bucket.file(filename);
        const buffer = Buffer.from(photoBase64, 'base64');
        await file.save(buffer, {
          metadata: { contentType: 'image/jpeg' },
          public: true,
          resumable: false
        });
        updates.photoUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      } catch (err) {
        console.error('Photo upload error during update:', err);
      }
    }

    // Merge extra fields (studentId, etc)
    Object.assign(updates, extra);
    updates.updatedAt = new Date().toISOString();

    // Update Firebase Auth if needed
    if (Object.keys(authUpdates).length > 0) {
      await admin.auth().updateUser(id, authUpdates);
    }

    // Update Firestore
    await db.collection('users').doc(id).update(updates);

    res.json({ success: true, updates });
  } catch (e) {
    console.error('Error updating user:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = admin.firestore();
    const doc = await db.collection('users').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Guards activity endpoint
app.get('/api/guards/activity', requireAuth, async (req, res) => {
  try {
    const db = admin.firestore();
    const guardsSnapshot = await db.collection('users').where('role', '==', 'guard').get();
    const guards = [];

    guardsSnapshot.forEach(doc => {
      guards.push({ id: doc.id, ...doc.data() });
    });

    const activity = guards.map(guard => ({
      guardId: guard.id,
      guardName: guard.name,
      isActive: false, // Can be enhanced with real-time tracking
      lastActive: null,
    }));

    res.json(activity);
  } catch (error) {
    console.error('Error fetching guards activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Live detections endpoint
app.get('/api/detections/live', requireAuth, async (req, res) => {
  try {
    const db = admin.firestore();
    const detectionsSnapshot = await db.collection('detections')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const recentDetections = [];
    detectionsSnapshot.forEach(doc => {
      recentDetections.push({ id: doc.id, ...doc.data() });
    });

    const challansSnapshot = await db.collection('challans').get();
    const totalDetections = challansSnapshot.size;

    const activeCount = Object.keys(detectionService.activeDetections || {}).filter(
      id => detectionService.activeDetections[id]?.isActive
    ).length;

    res.json({
      activeCameras: activeCount,
      totalDetections,
      recentDetections,
    });
  } catch (error) {
    console.error('Error fetching live detections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Camera endpoints
app.get('/api/cameras', requireAuth, async (req, res) => {
  try {
    const db = admin.firestore();
    const camerasSnapshot = await db.collection('cameras').get();
    const cameras = [];
    camerasSnapshot.forEach(doc => {
      cameras.push({ id: doc.id, ...doc.data() });
    });
    res.json(cameras);
  } catch (error) {
    console.error('Error fetching cameras:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cameras', requireAuth, async (req, res) => {
  try {
    const { id, name, url, location, type } = req.body;
    if (!id || !name || !url) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const db = admin.firestore();
    const camerasSnapshot = await db.collection('cameras').where('id', '==', id).get();
    if (!camerasSnapshot.empty) {
      return res.status(400).json({ success: false, error: 'Camera ID already exists' });
    }

    const newCamera = {
      id, name, url, location: location || '', type,
      status: 'offline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.collection('cameras').add(newCamera);

    res.json({ success: true, camera: newCamera });
  } catch (error) {
    console.error('Error adding camera:', error);
    res.status(500).json({ error: error.message });
  }
});

// Central error handler (must be last middleware)
app.use(errorHandler);

// -------------------
// START SERVER
// -------------------
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 = reachable from emulator (10.0.2.2) and LAN
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 AI Smoker Detection Backend running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Warm up face recognition cache on startup (don't await - non-blocking)
    detectionService.warmUpFaceCache().then(() => {
      // Start real-time sync after initial warm-up
      detectionService.listenForStudentChanges();
    }).catch(err => {
      console.warn('⚠️ Face cache warmer failed to initialize:', err.message);
    });

    if (PORT === 3000) {
      console.log(`  Android emulator → use http://10.0.2.2:${PORT}/api in app config`);
    }
  });
} else {
  module.exports = { app, server };
}
