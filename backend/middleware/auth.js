/**
 * Firebase Auth middleware for API routes.
 * requireAuth: validates Bearer token, sets req.auth = { uid, email, role }, 401 if missing/invalid.
 */

const admin = require('firebase-admin');

async function verifyToken(idToken) {
  if (!idToken) return null;
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}

async function getAuthUser(decoded) {
  if (!decoded?.uid) return null;
  try {
    const doc = await admin.firestore().collection('users').doc(decoded.uid).get();
    if (!doc.exists) return { uid: decoded.uid, email: decoded.email || null, role: null };
    const data = doc.data();
    return { uid: decoded.uid, email: data.email || decoded.email, role: data.role || null };
  } catch {
    return { uid: decoded.uid, email: decoded.email || null, role: null };
  }
}

/** Require valid Firebase user. Sets req.auth = { uid, email, role }. Returns 401 if no/invalid token. */
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const decoded = await verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized: valid Firebase token required' });
  }
  req.auth = await getAuthUser(decoded);
  next();
}

/** Optional auth: set req.auth if valid token present, else req.auth = null. Never 401. */
async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const decoded = await verifyToken(token);
  req.auth = decoded ? await getAuthUser(decoded) : null;
  next();
}

module.exports = { requireAuth, optionalAuth, verifyToken, getAuthUser };
