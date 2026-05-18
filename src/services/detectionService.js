// Detection service for fetching detections from Firestore
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

/** Proof image URL from detection or challan (Firestore stores both imageUrl and detectionImageUrl). */
export const getProofImageUrl = (item) =>
  (item && (item.imageUrl || item.detectionImageUrl)) || null;

export const getDetections = async (filters = {}) => {
  try {
    let q = collection(db, 'detections');

    if (filters.cameraId) {
      q = query(q, where('cameraId', '==', filters.cameraId));
    }

    if (filters.studentId) {
      q = query(q, where('studentId', '==', filters.studentId));
    }

    q = query(q, orderBy('timestamp', 'desc'));
    const limitCount = filters.limit != null ? filters.limit : 50;
    q = query(q, limit(limitCount));

    const querySnapshot = await getDocs(q);
    const detections = [];
    querySnapshot.forEach((doc) => {
      detections.push({ id: doc.id, ...doc.data() });
    });

    return detections;
  } catch (error) {
    console.error('Error fetching detections:', error);
    throw error;
  }
};

export const getDetectionsWithStudents = async (limitCount = 50) => {
  try {
    const detections = await getDetections({ limit: limitCount });
    // Filter to only show detections with matched students
    return detections.filter(d => d.matchedStudent || d.studentId);
  } catch (error) {
    console.error('Error fetching detections with students:', error);
    throw error;
  }
};





