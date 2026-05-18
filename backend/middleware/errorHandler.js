/**
 * Central error handler and logger.
 * Use: app.use(errorHandler) at the end of routes.
 */

const isProduction = process.env.NODE_ENV === 'production';

function log(level, message, meta = {}) {
  const payload = { timestamp: new Date().toISOString(), level, message, ...meta };
  if (isProduction && level === 'debug') return;
  if (level === 'error') {
    console.error(JSON.stringify(payload));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

function errorHandler(err, req, res, next) {
  log('error', err.message || 'Unknown error', {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  const status = err.status || err.statusCode || 500;
  const message = isProduction && status === 500 ? 'Internal server error' : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
}

module.exports = { errorHandler, log };
