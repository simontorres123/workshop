import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { app } from '@/lib/firebase/client'; // Suponiendo que la configuración del cliente estará aquí

const auth = getAuth(app);

export const authService = {
  signInWithEmail: (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  },

  signOut: () => {
    return firebaseSignOut(auth);
  },

  onAuthStateChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // La verificación del token se hará en el backend (middleware) usando el SDK de Admin
};
