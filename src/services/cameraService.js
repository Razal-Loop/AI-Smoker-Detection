// Camera detection service - connects to backend API
import { 
  startDetection as startDetectionAPI, 
  stopDetection as stopDetectionAPI,
  getDetectionStatus as getDetectionStatusAPI,
  getLiveDetectionsAPI
} from './apiService';

export const startDetection = async (cameraId) => {
  try {
    return await startDetectionAPI(cameraId);
  } catch (error) {
    console.error('Error starting detection:', error);
    if (__DEV__) {
      return { success: true, cameraId, message: 'Detection started (mock)' };
    }
    throw error;
  }
};

export const stopDetection = async (cameraId) => {
  try {
    return await stopDetectionAPI(cameraId);
  } catch (error) {
    console.error('Error stopping detection:', error);
    if (__DEV__) {
      return { success: true, cameraId, message: 'Detection stopped (mock)' };
    }
    throw error;
  }
};

export const getDetectionStatus = async (cameraId) => {
  try {
    const status = await getDetectionStatusAPI(cameraId);
    return {
      isActive: status.isActive || false,
      detections: status.detections || [],
    };
  } catch (error) {
    console.error('Error getting detection status:', error);
    if (__DEV__) {
      return { isActive: false, detections: [] };
    }
    throw error;
  }
};

export const getLiveDetections = async () => {
  try {
    return await getLiveDetectionsAPI();
  } catch (error) {
    if (__DEV__) {
      return { activeCameras: 0, totalDetections: 0, recentDetections: [] };
    }
    console.error('Error getting live detections:', error);
    throw error;
  }
};

