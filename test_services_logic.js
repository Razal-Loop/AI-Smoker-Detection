const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const httpReq = require('http');

async function runTests() {
    console.log('🚀 Starting System Services Test...\n');

    // 1. Check Python Dependencies
    console.log('📦 Checking Python Environment...');
    try {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const checkPython = (cmd, args) => new Promise((resolve) => {
            const proc = spawn(cmd, args);
            let output = '';
            proc.stdout.on('data', d => output += d);
            proc.stderr.on('data', d => output += d);
            proc.on('close', code => resolve({ code, output }));
        });

        const pyVer = await checkPython(pythonCmd, ['--version']);
        console.log(`  ✅ Python Version: ${pyVer.output.trim() || 'Found'}`);

        const libs = ['ultralytics', 'cv2', 'face_recognition', 'torch'];
        for (const lib of libs) {
            const libCheck = await checkPython(pythonCmd, ['-c', `import ${lib}; print("${lib} ok")`]);
            if (libCheck.code === 0) {
                console.log(`  ✅ Library ${lib}: OK`);
            } else {
                console.log(`  ❌ Library ${lib}: MISSING or ERROR`);
            }
        }
    } catch (err) {
        console.error('  ❌ Error checking Python:', err.message);
    }

    // 2. Test YOLO Model Loading
    console.log('\n🧠 Testing YOLO Model Loading...');
    const modelPath = path.resolve('backend/models/best.pt');
    if (fs.existsSync(modelPath)) {
        console.log('  ✅ Model exists at', modelPath);
        // Simple script to load model and exit
        const loadResult = await new Promise((resolve) => {
            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
            const proc = spawn(pythonCmd, ['-c', `from ultralytics import YOLO; model = YOLO(r"${modelPath}"); print("Model loaded successfully")`]);
            let out = '';
            proc.stdout.on('data', d => out += d);
            proc.on('close', code => resolve({ code, out }));
        });
        if (loadResult.code === 0) {
            console.log('  ✅ Model loading: SUCCESS');
        } else {
            console.log('  ❌ Model loading: FAILED');
        }
    } else {
        console.log('  ❌ Model file MISSING');
    }

    // 3. Test Frame Detection Script
    console.log('\n🖼️ Testing Frame Detection Script...');
    const testImagePath = path.resolve('backend/test-fixtures/test.jpg');
    const detectionScript = path.resolve('backend/services/yolo_frame_detection.py');

    if (fs.existsSync(testImagePath) && fs.existsSync(detectionScript)) {
        const frameResult = await new Promise((resolve) => {
            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
            const imageBuffer = fs.readFileSync(testImagePath);
            const proc = spawn(pythonCmd, [detectionScript, modelPath]);

            let out = '';
            let err = '';
            proc.stdout.on('data', d => out += d);
            proc.stderr.on('data', d => err += d);

            proc.on('close', code => resolve({ code, out, err }));

            proc.stdin.write(imageBuffer);
            proc.stdin.end();
        });

        if (frameResult.code === 0) {
            try {
                const json = JSON.parse(frameResult.out);
                console.log('  ✅ Script execution: SUCCESS');
                console.log(`  ✅ Detections found: ${json.detections ? json.detections.length : 0}`);
                if (json.detections && json.detections.length > 0) {
                    console.log(`  📝 Labels: ${json.detections.map(d => d.label).join(', ')}`);
                }
            } catch (e) {
                console.log('  ❌ JSON Parse Error:', e.message);
                console.log('  Raw Output:', frameResult.out.substring(0, 200));
            }
        } else {
            console.log('  ❌ Script execution: FAILED');
            console.log('  Error:', frameResult.err);
        }
    } else {
        console.log('  ❌ Missing test.jpg or detection script');
    }

    // 4. Check Backend Server
    console.log('\n🌐 Checking Backend API Health...');
    try {
        const healthResult = await new Promise((resolve) => {
            const req = httpReq.get('http://localhost:3000/api/health', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ ok: res.statusCode === 200, data }));
            });
            req.on('error', () => resolve({ ok: false }));
            req.end();
        });
        if (healthResult.ok) {
            console.log('  ✅ API Health: OK');
        } else {
            console.log('  ⚠️  API not reachable on localhost:3000 (Expected if not running)');
        }
    } catch (err) {
        console.log('  ⚠️  API Check Error');
    }

    console.log('\n✨ Test Run Complete.');
}

runTests();
