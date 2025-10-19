'use client';

import { useEffect, useState } from 'react';
import { getWebAuthnSupport } from '@/lib/webauthn';

export default function WebAuthnSupport() {
  const [support, setSupport] = useState<{ supported: boolean; details: any } | null>(null);

  useEffect(() => {
    setSupport(getWebAuthnSupport());
  }, []);

  if (!support) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">WebAuthn Support Check</h3>
        <p className="text-gray-600">Checking browser support...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-2">WebAuthn Support Check</h3>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className={`text-2xl ${support.supported ? 'text-green-500' : 'text-red-500'}`}>
            {support.supported ? '✅' : '❌'}
          </span>
          <span className={`font-medium ${support.supported ? 'text-green-700' : 'text-red-700'}`}>
            {support.supported ? 'WebAuthn Supported' : 'WebAuthn Not Supported'}
          </span>
        </div>
        
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex items-center space-x-2">
            <span className={support.details.hasPublicKeyCredential ? 'text-green-600' : 'text-red-600'}>
              {support.details.hasPublicKeyCredential ? '✅' : '❌'}
            </span>
            <span>PublicKeyCredential API</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={support.details.hasNavigatorCredentials ? 'text-green-600' : 'text-red-600'}>
              {support.details.hasNavigatorCredentials ? '✅' : '❌'}
            </span>
            <span>Navigator.credentials</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={support.details.hasCreate ? 'text-green-600' : 'text-red-600'}>
              {support.details.hasCreate ? '✅' : '❌'}
            </span>
            <span>credentials.create()</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={support.details.hasGet ? 'text-green-600' : 'text-red-600'}>
              {support.details.hasGet ? '✅' : '❌'}
            </span>
            <span>credentials.get()</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mt-3">
          <div>Platform: {support.details.platform}</div>
          <div>User Agent: {support.details.userAgent.substring(0, 50)}...</div>
        </div>
      </div>
    </div>
  );
}
