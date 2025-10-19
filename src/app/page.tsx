'use client';

import { useState, useEffect } from 'react';
import RegisterForm from '@/components/RegisterForm';
import LoginForm from '@/components/LoginForm';
import PasskeyManager from '@/components/PasskeyManager';
import WebAuthnSupport from '@/components/WebAuthnSupport';
import DebugPanel from '@/components/DebugPanel';
import { DebugLog } from '@/lib/webauthn';

interface User {
  id: number;
  username: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    setShowRegister(false);
  };

  const handleRegister = (userData: User) => {
    setUser(userData);
    setShowRegister(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setDebugLogs([]);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleDebugLog = (logs: DebugLog[]) => {
    setDebugLogs(prev => [...prev, ...logs]);
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            WebAuthn Passkey Demo
          </h1>
          <p className="text-lg text-gray-600">
            Test and debug WebAuthn passkey authentication
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Main Content */}
            <div className="space-y-6">
              {!user ? (
                <>
                  {!showRegister ? (
                    <LoginForm onLogin={handleLogin} onDebugLog={handleDebugLog} />
                  ) : (
                    <RegisterForm onRegister={handleRegister} />
                  )}

                  <div className="text-center">
                    <button
                      onClick={() => setShowRegister(!showRegister)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {showRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
                    </button>
                  </div>

                  <WebAuthnSupport />
                </>
              ) : (
                <>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Welcome, {user.username}!
                      </h2>
                      <p className="text-gray-600">Manage your passkeys and test authentication</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                    >
                      Logout
                    </button>
                  </div>

                  <PasskeyManager user={user} onDebugLog={handleDebugLog} />
                </>
              )}
            </div>

            {/* Right Column - Info */}
            <div className="space-y-6">
              {!user ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">How to Use</h3>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-500 font-bold">1.</span>
                        <span>Create an account with username and password</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-500 font-bold">2.</span>
                        <span>Login and add one or more passkeys to your account</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-500 font-bold">3.</span>
                        <span>Logout and test logging in with your passkey</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-500 font-bold">4.</span>
                        <span>Use the debug panel to see all WebAuthn messages and errors</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Password-based authentication</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Passkey registration and authentication</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Multiple passkeys per account</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Comprehensive debug logging</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Browser compatibility check</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Local SQLite database</span>
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <WebAuthnSupport />
              )}
            </div>
          </div>
        </div>

        <DebugPanel logs={debugLogs} onClear={clearDebugLogs} />
      </div>
    </div>
  );
}