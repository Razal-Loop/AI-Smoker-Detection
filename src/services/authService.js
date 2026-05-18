import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export const login = async (email, password, expectedRole = null) => {
  if (!auth || !db) {
    throw new Error('Firebase is not configured. Please update src/config/firebase.js with your Firebase config.');
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    let userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    // If user document doesn't exist and it's an admin login, try to create it (requires Firestore rule allowing it)
    if (!userDoc.exists() && expectedRole === 'admin') {
      console.log('⚠️ Admin user document not found. Creating automatically...');
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email,
          role: 'admin',
          name: 'Admin User',
          createdAt: new Date().toISOString(),
        });
        console.log('✅ Admin user document created successfully');
        // Fetch the newly created document
        userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      } catch (createError) {
        console.error('Error creating admin user document:', createError);
        await firebaseSignOut(auth);
        const isPermissionError = createError?.code === 'permission-denied' || createError?.message?.includes('permission');
        if (isPermissionError) {
          throw new Error(
            'Admin user document is missing and could not be created from the app (Firestore rules). ' +
            'Ask someone with backend access to run: node backend/scripts/create-admin-user.js "' + email + '" <your-password> "Admin"'
          );
        }
        throw new Error('Failed to create admin user document. Please create it manually in Firestore.');
      }
    }
    
    if (!userDoc.exists()) {
      await firebaseSignOut(auth);
      throw new Error('User not found in database. Please contact administrator.');
    }
    
    const userData = userDoc.data();
    const userRole = userData.role;
    
    // Validate role if expected role is provided
    if (expectedRole && userRole !== expectedRole) {
      await firebaseSignOut(auth);
      throw new Error(`Access denied. This account is registered as ${userRole}, not ${expectedRole}. Please use the correct login screen.`);
    }
    
    // Validate that user has a valid role
    const validRoles = ['admin', 'student', 'guard', 'security_head'];
    if (!validRoles.includes(userRole)) {
      await firebaseSignOut(auth);
      throw new Error('Invalid user role. Please contact administrator.');
    }
    
    return {
      user: userCredential.user,
      role: userRole,
      userData: userData,
    };
  } catch (error) {
    throw error;
  }
};

export const createUser = async (email, password, userData) => {
  if (!auth || !db) {
    throw new Error('Firebase is not configured. Please update src/config/firebase.js with your Firebase config.');
  }
  try {
    // Only admin can create users, this should be checked in the component
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      ...userData,
      email,
      createdAt: new Date().toISOString(),
    });
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  if (!auth) {
    return;
  }
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};


