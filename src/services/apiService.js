// API service - URLs from src/config/api.js (env-aware for production)
import { getApiBaseUrl } from '../config/api';
import { auth } from '../config/firebase';

/** Message shown when backend is not reachable (e.g. not running or firewall). */
export const BACKEND_UNREACHABLE_MSG =
  'Backend unreachable. Start it first: run "npm run backend" in another terminal (or cd backend && npm start), then try again.';

export function isNetworkError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('network error') ||
    name === 'typeerror' ||
    msg.includes('failed to fetch')
  );
}

let _networkWarned = false;

const getAuthToken = async () => {
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch (e) {
    return null;
  }
};

export const apiRequest = async (endpoint, options = {}) => {
  const { headers = {}, ...restOptions } = options;
  const token = await getAuthToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers,
      },
      ...restOptions,
    });

    if (response.status === 401) {
      throw new Error('Session expired or unauthorized. Please sign in again.');
    }

    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    if (isNetworkError(error)) {
      if (__DEV__ && !_networkWarned) {
        _networkWarned = true;
        console.warn('[Network] Backend not reachable at', url, '—', BACKEND_UNREACHABLE_MSG);
      }
      throw new Error(BACKEND_UNREACHABLE_MSG);
    }
    console.error('API Error:', error.message || error);
    if (error.message) {
      throw error;
    }
    throw new Error(error.message || 'Network error occurred');
  }
};

// Detection API
export const startDetection = async (cameraId) => {
  return apiRequest('/detection/start', {
    method: 'POST',
    body: JSON.stringify({ cameraId }),
  });
};

export const stopDetection = async (cameraId) => {
  return apiRequest('/detection/stop', {
    method: 'POST',
    body: JSON.stringify({ cameraId }),
  });
};

export const getDetectionStatus = async (cameraId) => {
  return apiRequest(`/detection/status/${cameraId}`);
};

export const processImage = async (imageUri) => {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  });

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/detection/process`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...headers,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('Session expired or unauthorized. Please sign in again.');
    }
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      if (__DEV__) {
        console.warn('[Network] Backend not reachable —', BACKEND_UNREACHABLE_MSG);
      }
      throw new Error(BACKEND_UNREACHABLE_MSG);
    }
    throw err;
  }
};

// Challan API
export const getChallansAPI = async (studentId = null) => {
  const query = studentId ? `?studentId=${studentId}` : '';
  return apiRequest(`/challans${query}`);
};

export const createChallanAPI = async (challanData) => {
  return apiRequest('/challans', {
    method: 'POST',
    body: JSON.stringify(challanData),
  });
};

export const updateChallanAPI = async (challanId, updates) => {
  return apiRequest(`/challans/${challanId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteChallanAPI = async (challanId) => {
  return apiRequest(`/challans/${challanId}`, {
    method: 'DELETE',
  });
};

// User API
export const getUsersAPI = async (role = null) => {
  const query = role ? `?role=${role}` : '';
  return apiRequest(`/users${query}`);
};

export const createUserAPI = async (userData, authToken = null) => {
  const token = authToken || await getAuthToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return apiRequest('/users', {
    method: 'POST',
    headers,
    body: JSON.stringify(userData),
  });
};

export const updateUserAPI = async (userId, userData) => {
  return apiRequest(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(userData),
  });
};

// Guards Activity API
export const getGuardsActivityAPI = async () => {
  return apiRequest('/guards/activity');
};

// Live Detections API
export const getLiveDetectionsAPI = async () => {
  return apiRequest('/detections/live');
};

/** Ping backend health; returns true if reachable, false otherwise. Does not throw. */
export const checkBackendHealth = async () => {
  try {
    const baseUrl = getApiBaseUrl();
    const healthUrl = baseUrl.replace(/\/api\/?$/, '') + '/api/health';
    const res = await fetch(healthUrl, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
};

// Camera API
export const getCamerasAPI = async () => {
  return apiRequest('/cameras');
};

export const addCameraAPI = async (cameraData) => {
  return apiRequest('/cameras', {
    method: 'POST',
    body: JSON.stringify(cameraData),
  });
};


