import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDocFromServer } from "firebase/firestore";
import LoginPage from './components/LoginPage';
import POSLayout from './components/POSLayout';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test Firestore Connection
    const testConnection = async () => {
      try {
        // Silent connection test to verify configuration
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        // Only log if it's a critical configuration error
        if (error.message.includes('the client is offline')) {
          console.error("Firestore connection failed: Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
         <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {user ? <POSLayout /> : <LoginPage />}
    </ErrorBoundary>
  );
};

export default App;