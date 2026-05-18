/**
 * Rate limiting for API and heavy endpoints.
 * In production, consider Redis store for multi-instance.
 */

const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

/** General API: 100 requests per 15 minutes per IP */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Detection process (image upload): 30 per 15 min per IP */
const detectionProcessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 30 : 100,
  message: { error: 'Too many detection requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Detection start/stop: 20 per 15 min per IP */
const detectionControlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 60,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, detectionProcessLimiter, detectionControlLimiter };
