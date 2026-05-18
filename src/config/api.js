import { Platform } from 'react-native';

/**
 * API and Socket URLs for backend.
 * Production: Set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_SOCKET_URL in EAS Build env or app.config.js extra.
 */

const PORT = 3000;

function stripPort(host) {
  if (typeof host !== 'string') return host;
  const trimmed = host.trim();
  const colon = trimmed.lastIndexOf(':');
  if (colon <= 0) return trimmed;
  const afterColon = trimmed.slice(colon + 1);
  if (/^\d+$/.test(afterColon)) return trimmed.slice(0, colon);
  return trimmed;
}

const getDevHost = () => {
  // Try process.env first (Standard for Expo SDK 50+)
  const envHost = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DEV_HOST;
  if (typeof envHost === 'string' && envHost.trim()) return stripPort(envHost.trim());

  // Basic platform defaults
  return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
};

const DEV_HOST = getDevHost();
const DEV_API = `http://${DEV_HOST}:${PORT}/api`;
const DEV_SOCKET = `http://${DEV_HOST}:${PORT}`;
const PROD_API_PLACEHOLDER = 'https://your-production-url.com/api';
const PROD_SOCKET_PLACEHOLDER = 'https://your-production-url.com';

function resolveApiBaseUrl() {
  let url = null;

  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (typeof envUrl === 'string' && envUrl) url = envUrl;
  }

  if (!url) {
    url = typeof __DEV__ !== 'undefined' && __DEV__ ? DEV_API : PROD_API_PLACEHOLDER;
  }

  return (typeof url === 'string' && url) ? url : DEV_API;
}

function resolveSocketUrl() {
  let url = null;

  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SOCKET_URL) {
    const envUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
    if (typeof envUrl === 'string' && envUrl) url = envUrl;
  }

  if (!url) {
    url = typeof __DEV__ !== 'undefined' && __DEV__ ? DEV_SOCKET : PROD_SOCKET_PLACEHOLDER;
  }

  return (typeof url === 'string' && url) ? url : DEV_SOCKET;
}

let _apiBaseUrl = null;
let _socketUrl = null;

export function getApiBaseUrl() {
  if (_apiBaseUrl === null) {
    _apiBaseUrl = resolveApiBaseUrl();
  }
  return _apiBaseUrl;
}

export function getSocketUrl() {
  if (_socketUrl === null) {
    _socketUrl = resolveSocketUrl();
  }
  return _socketUrl;
}

export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('[API config] API_BASE_URL:', getApiBaseUrl());
}
