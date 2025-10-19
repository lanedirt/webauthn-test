'use client';

import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';

interface DebugLog {
  timestamp: string;
  step: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: unknown;
}

interface LoginFormProps {
  onLogin: (user: { id: number; username: string }) => void;
  onDebugLog: (logs: DebugLog[]) => void;
}

export default function LoginForm({ onLogin, onDebugLog }: LoginFormProps) {
  const [isPasswordLogin, setIsPasswordLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        onLogin({ id: data.userId, username: data.username });
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get authentication options
      const optionsResponse = await fetch('/api/passkeys/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username || undefined })
      });

      const optionsData = await optionsResponse.json();
      if (!optionsData.success) {
        throw new Error(optionsData.error || 'Failed to get authentication options');
      }

      onDebugLog(optionsData.debugLogs || []);

      // Start authentication
      const credential = await startAuthentication(optionsData.options);

      // Verify authentication
      const verifyResponse = await fetch('/api/passkeys/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...credential,
          challenge: optionsData.challenge
        })
      });

      const verifyData = await verifyResponse.json();
      onDebugLog(verifyData.debugLogs || []);

      if (verifyData.success) {
        onLogin({ id: verifyData.userId, username: verifyData.username });
      } else {
        setError(verifyData.message || 'Passkey authentication failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Passkey authentication failed';
      setError(errorMessage);
      onDebugLog([{
        timestamp: new Date().toISOString(),
        step: 'authentication-error',
        type: 'error',
        message: errorMessage,
        data: error
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Login
        </h2>

        <div className="mb-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setIsPasswordLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isPasswordLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setIsPasswordLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !isPasswordLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Passkey
            </button>
          </div>
        </div>

        {isPasswordLogin ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="passkey-username" className="block text-sm font-medium text-gray-700 mb-1">
                Username (optional)
              </label>
              <input
                type="text"
                id="passkey-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Leave empty to show all available passkeys"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your username to authenticate with your specific passkeys, or leave empty to see all available passkeys.
              </p>
            </div>
            <button
              onClick={handlePasskeyLogin}
              disabled={loading}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Login with Passkey'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
