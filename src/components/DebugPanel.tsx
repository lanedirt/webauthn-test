'use client';

import { useState } from 'react';
import { DebugLog } from '@/lib/webauthn';

interface DebugPanelProps {
  logs: DebugLog[];
  onClear: () => void;
}

export default function DebugPanel({ logs, onClear }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getLogIcon = (type: DebugLog['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getLogColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatData = (data: unknown) => {
    if (!data) return null;
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="text-sm font-medium text-gray-900">
          WebAuthn Debug Log ({logs.length})
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={onClear}
            className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
          >
            Clear
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      <div className={`overflow-y-auto ${isExpanded ? 'max-h-80' : 'max-h-32'}`}>
        {logs.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 text-center">
            No debug logs yet
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`p-2 rounded border text-xs ${getLogColor(log.type)}`}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-sm">{getLogIcon(log.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{log.step}</span>
                      <span className="text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <div className="mt-1 text-gray-700">{log.message}</div>
                    {(log.data && isExpanded) ? (
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {formatData(log.data)}
                      </pre>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
