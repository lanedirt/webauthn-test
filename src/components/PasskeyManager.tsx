'use client';

import { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';

interface Passkey {
  id: number;
  credentialId: string;
  deviceType: string;
  backedUp: boolean;
  transports: string[] | null;
  createdAt: string;
  lastUsedAt: string | null;
}

interface DebugLog {
  timestamp: string;
  step: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: unknown;
}

interface PasskeyManagerProps {
  user: { id: number; username: string };
  onDebugLog: (logs: DebugLog[]) => void;
}

export default function PasskeyManager({ user, onDebugLog }: PasskeyManagerProps) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const loadPasskeys = async () => {
    try {
      const response = await fetch('/api/passkeys/list');
      const data = await response.json();

      if (data.success) {
        setPasskeys(data.passkeys);
      } else {
        setError(data.error || 'Failed to load passkeys');
      }
    } catch {
      setError('Failed to load passkeys');
    }
  };

  useEffect(() => {
    loadPasskeys();
  }, []);

  const registerPasskey = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRegistering(true);

      // Get registration options
      const optionsResponse = await fetch('/api/passkeys/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });

      const optionsData = await optionsResponse.json();
      if (!optionsData.success) {
        throw new Error(optionsData.error || 'Failed to get registration options');
      }

      onDebugLog(optionsData.debugLogs || []);

      // Start registration
      const credential = await startRegistration(optionsData.options);

      // Verify registration
      const verifyResponse = await fetch('/api/passkeys/register/verify', {
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
        await loadPasskeys();
        setError(null);
      } else {
        setError(verifyData.message || 'Registration failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      onDebugLog([{
        timestamp: new Date().toISOString(),
        step: 'registration-error',
        type: 'error',
        message: errorMessage,
        data: err
      }]);
    } finally {
      setLoading(false);
      setIsRegistering(false);
    }
  };

  const deletePasskey = async (passkeyId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/passkeys/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkeyId })
      });

      const data = await response.json();
      if (data.success) {
        await loadPasskeys();
      } else {
        setError(data.error || 'Failed to delete passkey');
      }
    } catch (err) {
      setError('Failed to delete passkey');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDeviceIcon = (deviceType: string) => {
    return deviceType === 'platform' ? '📱' : '🔑';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Passkeys</h3>
        <button
          onClick={registerPasskey}
          disabled={loading || isRegistering}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegistering ? 'Registering...' : 'Add Passkey'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {passkeys.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">No passkeys registered yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Click &quot;Add Passkey&quot; to register your first passkey
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getDeviceIcon(passkey.deviceType)}</span>
                <div>
                  <div className="font-medium text-gray-900">
                    {passkey.deviceType === 'platform' ? 'Platform Passkey' : 'Cross-Platform Passkey'}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {passkey.credentialId.substring(0, 16)}...
                  </div>
                  <div className="text-xs text-gray-400">
                    Created: {formatDate(passkey.createdAt)}
                    {passkey.lastUsedAt && (
                      <span> • Last used: {formatDate(passkey.lastUsedAt)}</span>
                    )}
                  </div>
                  {passkey.backedUp && (
                    <div className="text-xs text-green-600">✓ Backed up</div>
                  )}
                  {passkey.transports && (
                    <div className="text-xs text-gray-500">
                      Transports: {passkey.transports.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => deletePasskey(passkey.id)}
                disabled={loading}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
