/**
 * Expo app config. Production backend URLs are set via environment variables
 * so the app connects to your deployed API and Socket server.
 *
 * Physical device (same WiFi as dev machine): backend at devHost:3000.
 * Set devHost to your machine's LAN IP (e.g. 192.168.18.56). Override with
 * EXPO_PUBLIC_DEV_HOST=10.0.2.2 when using Android emulator.
 *
 * EAS Build (production APK):
 *   Set in Expo dashboard → Project → Environment variables → production:
 *     EXPO_PUBLIC_API_URL    = https://your-backend.fly.dev/api
 *     EXPO_PUBLIC_SOCKET_URL = https://your-backend.fly.dev
 */
const appJson = require('./app.json');

// Physical device: use your PC's LAN IP so the app can reach the backend. Emulator: use 10.0.2.2.
const DEFAULT_DEV_HOST = '192.168.18.56:8081';

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || null,
      socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || null,
      devHost: process.env.EXPO_PUBLIC_DEV_HOST || DEFAULT_DEV_HOST,
    },
  },
};
