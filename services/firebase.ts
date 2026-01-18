import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = () => {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
};

let app: any = null;
let auth: any = null;
let db: any = null;
let googleProvider: any = null;

if (isFirebaseConfigured()) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const signUpWithEmail = async (email: string, password: string, displayName?: string): Promise<AuthUser> => {
  if (!auth) throw new Error('Firebase not configured');
  const result = await createUserWithEmailAndPassword(auth, email, password);
  
  if (displayName && result.user) {
    try {
      await updateProfile(result.user, { displayName });
    } catch (err) {
      console.error('Failed to update display name:', err);
    }
  }
  
  await createUserProfile(result.user);
  
  return {
    uid: result.user.uid,
    email: result.user.email,
    displayName: displayName || result.user.displayName,
    photoURL: result.user.photoURL
  };
};

export const signInWithEmail = async (email: string, password: string): Promise<AuthUser> => {
  if (!auth) throw new Error('Firebase not configured');
  const result = await signInWithEmailAndPassword(auth, email, password);
  return {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL
  };
};

export const signInWithGoogle = async (): Promise<AuthUser> => {
  if (!auth || !googleProvider) throw new Error('Firebase not configured');
  const result = await signInWithPopup(auth, googleProvider);
  
  // Create user profile if first time
  await createUserProfile(result.user);
  
  return {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL
  };
};

export const logOut = async (): Promise<void> => {
  if (!auth) throw new Error('Firebase not configured');
  await signOut(auth);
};

export const onAuthChange = (callback: (user: AuthUser | null) => void): (() => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
    } else {
      callback(null);
    }
  });
};

export interface ChatMessage {
  role: 'user' | 'agent' | 'system';
  text: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  messages: ChatMessage[];
  searchParams?: {
    rank?: number;
    category?: string;
    course?: string;
    location?: string;
  };
  recommendations?: any[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  lastActive: Date;
  totalSessions: number;
  savedLists: any[];
}

const createUserProfile = async (user: User): Promise<void> => {
  if (!db) return;
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      totalSessions: 0,
      savedLists: [],
      chatHistory: []
    });
  } else {
    await updateDoc(userRef, {
      lastActive: serverTimestamp()
    });
  }
};

export const saveChatSession = async (
  userId: string, 
  session: Omit<ChatSession, 'id'>
): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const sessionId = `session_${Date.now()}`;
  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, {
    chatHistory: arrayUnion({
      ...session,
      id: sessionId
    }),
    totalSessions: (await getDoc(userRef)).data()?.totalSessions + 1 || 1,
    lastActive: serverTimestamp()
  });
  
  return sessionId;
};

export const getUserChatHistory = async (userId: string): Promise<ChatSession[]> => {
  if (!db) return [];
  
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    return data.chatHistory || [];
  }
  
  return [];
};

export const saveUserList = async (
  userId: string, 
  listName: string, 
  colleges: any[]
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, {
    savedLists: arrayUnion({
      name: listName,
      colleges,
      savedAt: new Date().toISOString()
    })
  });
};

export const getUserSavedLists = async (userId: string): Promise<any[]> => {
  if (!db) return [];
  
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    return data.savedLists || [];
  }
  
  return [];
};

// Save current working list for a user
export const saveCurrentList = async (userId: string, colleges: any[]): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, {
    currentList: colleges,
    lastActive: serverTimestamp()
  });
};

// Get current working list for a user
export const getCurrentList = async (userId: string): Promise<any[]> => {
  if (!db) return [];
  
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    return data.currentList || [];
  }
  
  return [];
};

export const saveSessionToLocal = (session: ChatSession): void => {
  const sessions = getLocalSessions();
  sessions.push(session);
  // Keep only last 10 sessions
  const trimmed = sessions.slice(-10);
  localStorage.setItem('seatsathi_sessions', JSON.stringify(trimmed));
};

export const getLocalSessions = (): ChatSession[] => {
  try {
    const data = localStorage.getItem('seatsathi_sessions');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveListToLocal = (listName: string, colleges: any[]): void => {
  const lists = getLocalLists();
  lists.push({
    name: listName,
    colleges,
    savedAt: new Date().toISOString()
  });
  localStorage.setItem('seatsathi_lists', JSON.stringify(lists));
};

export const getLocalLists = (): any[] => {
  try {
    const data = localStorage.getItem('seatsathi_lists');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// Test Firebase connection
export const testFirebaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (!db) {
    return { success: false, message: 'Firebase not configured' };
  }
  
  try {
    const testRef = doc(db, '_test', 'connection');
    await setDoc(testRef, { 
      testTime: serverTimestamp(),
      status: 'connected' 
    });
    console.log('✅ Firebase Firestore connection successful!');
    return { success: true, message: 'Firebase Firestore connected successfully!' };
  } catch (error: any) {
    console.error('❌ Firebase connection failed:', error);
    return { success: false, message: `Firebase error: ${error.message}` };
  }
};

export { auth, db };
