import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { createUser } from './authService';

// Safe FileSystem import for environments where it might be missing
let FileSystem = null;
try {
  FileSystem = require('expo-file-system');
} catch (e) {
  console.warn('expo-file-system not available. Photo uploads will be disabled.');
}

export const getUsers = async (role = null) => {
  try {
    let q = collection(db, 'users');
    if (role) {
      q = query(q, where('role', '==', role));
    }

    const querySnapshot = await getDocs(q);
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });

    return users;
  } catch (error) {
    console.error('getUsers error:', error);
    return [];
  }
};

export const addUser = async (email, password, userData, authToken = null) => {
  try {
    // Try to use backend API if token is provided (enforces admin-only)
    if (authToken) {
      const { createUserAPI } = require('./apiService');

      // If student and has photoUri, convert to base64 for backend upload
      let photoBase64 = null;
      if (userData.role === 'student' && userData.photoUri && FileSystem) {
        try {
          photoBase64 = await FileSystem.readAsStringAsync(userData.photoUri, {
            encoding: 'base64',
          });
        } catch (fsErr) {
          console.error('Error reading photo for backend upload:', fsErr);
        }
      }

      const result = await createUserAPI({
        email,
        password,
        ...userData,
        photoBase64, // Send base64 string to backend
      }, authToken);
      return result;
    }

    // Fallback to direct Firebase creation
    console.warn('No auth token provided, using direct Firebase creation');
    const user = await createUser(email, password, userData);
    return user;
  } catch (error) {
    throw new Error(error.message || 'Failed to add user');
  }
};

export const getUserById = async (userId) => {
  try {
    const docSnap = await getDoc(doc(db, 'users', userId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const updateUser = async (userId, updates) => {
  try {
    const { updateUserAPI } = require('./apiService');

    // Check if we need to convert photoUri to base64 for backend upload
    if (updates.photoUri && FileSystem) {
      try {
        updates.photoBase64 = await FileSystem.readAsStringAsync(updates.photoUri, {
          encoding: 'base64',
        });
        delete updates.photoUri;
      } catch (err) {
        console.error('Error reading photo for update:', err);
      }
    }

    const result = await updateUserAPI(userId, updates);
    return result;
  } catch (error) {
    throw new Error(error.message || 'Failed to update user');
  }
};

export const deleteUser = async (userId) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    throw error;
  }
};

export const uploadStudentPhoto = async (imageUri, email) => {
  if (!FileSystem) {
    throw new Error('Photo upload unavailable: FileSystem missing');
  }
  try {
    return await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });
  } catch (error) {
    console.error('Error reading photo locally:', error);
    throw error;
  }
};
