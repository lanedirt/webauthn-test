import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type GenerateAuthenticationOptionsOpts,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';

// Database query types
interface DbQueries {
  getPasskeysByUserId: { all: (userId: number) => unknown[] };
  getUserByUsername: { get: (username: string) => unknown };
  getPasskeyByCredentialId: { get: (credentialId: string) => unknown };
  createPasskey: { run: (...args: unknown[]) => void };
  updatePasskeyCounter: { run: (counter: number, credentialId: string) => void };
}

interface Passkey {
  credential_id: string;
  device_type: string;
  transports: string | null;
  counter: number;
}

interface User {
  id: number;
  username: string;
}

interface PasskeyWithUser extends Passkey {
  user_id: number;
  username: string;
  public_key: string;
}

// WebAuthn configuration
const RP_ID = process.env.WEBAUTHN_RP_ID || (process.env.NODE_ENV === 'production' ? 'yourdomain.com' : 'localhost');
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'WebAuthn Test Demo';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || (process.env.NODE_ENV === 'production'
  ? 'https://yourdomain.com'
  : 'http://localhost:3200');

// Debug logging interface
export interface DebugLog {
  timestamp: string;
  step: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: unknown;
}

export class WebAuthnDebugger {
  private logs: DebugLog[] = [];

  log(step: string, type: DebugLog['type'], message: string, data?: unknown) {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      step,
      type,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined
    };
    this.logs.push(log);
    console.log(`[WebAuthn Debug] ${step}: ${message}`, data || '');
  }

  getLogs(): DebugLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  getLastError(): DebugLog | null {
    return this.logs.filter(log => log.type === 'error').pop() || null;
  }
}

// Global webauthnDebugger instance
export const webauthnDebugger = new WebAuthnDebugger();

// Registration functions
export async function generatePasskeyRegistrationOptions(
  userId: number,
  username: string,
  dbQueries: DbQueries
): Promise<{ options: PublicKeyCredentialCreationOptionsJSON; challenge: string; debugLogs: DebugLog[] }> {
  try {
    webauthnDebugger.clearLogs();
    webauthnDebugger.log('registration-start', 'info', 'Starting passkey registration process', { userId, username });

    // Get existing passkeys for this user
    const existingPasskeys = dbQueries.getPasskeysByUserId.all(userId) as Passkey[];
    webauthnDebugger.log('registration-query', 'info', 'Retrieved existing passkeys', {
      count: existingPasskeys.length,
      passkeys: existingPasskeys.map(p => ({ id: p.credential_id, device_type: p.device_type }))
    });

    const excludeCredentials = existingPasskeys.map(passkey => ({
      id: passkey.credential_id,
      type: 'public-key' as const,
      transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
    }));

    const options: GenerateRegistrationOptionsOpts = {
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: Buffer.from(userId.toString()),
      userName: username,
      userDisplayName: username,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
      excludeCredentials,
      timeout: 60000,
    };

    webauthnDebugger.log('registration-options', 'info', 'Generated registration options', options);

    const registrationOptions = await generateRegistrationOptions(options);
    webauthnDebugger.log('registration-generated', 'success', 'Registration options generated successfully', registrationOptions);

    return {
      options: registrationOptions,
      challenge: registrationOptions.challenge,
      debugLogs: webauthnDebugger.getLogs()
    };
  } catch (error) {
    webauthnDebugger.log('registration-error', 'error', 'Failed to generate registration options', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export async function verifyPasskeyRegistration(
  body: RegistrationResponseJSON,
  expectedChallenge: string,
  userId: number,
  dbQueries: DbQueries
): Promise<{ verified: boolean; credentialId: string; debugLogs: DebugLog[] }> {
  try {
    webauthnDebugger.clearLogs();
    webauthnDebugger.log('verification-start', 'info', 'Starting passkey verification process', {
      expectedChallenge: expectedChallenge.substring(0, 20) + '...',
      userId
    });

    webauthnDebugger.log('verification-input', 'info', 'Received registration response', {
      id: body.id,
      rawId: body.rawId,
      response: {
        attestationObject: body.response?.attestationObject ? 'present' : 'missing',
        clientDataJSON: body.response?.clientDataJSON ? 'present' : 'missing',
      }
    });

    // Log verification parameters
    webauthnDebugger.log('verification-params', 'info', 'Verification parameters', {
      expectedChallenge: expectedChallenge.substring(0, 20) + '...',
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    webauthnDebugger.log('verification-result', 'info', 'Verification completed', {
      verified: verification.verified,
      hasRegistrationInfo: !!verification.registrationInfo,
    });

    if (!verification.verified) {
      // Log detailed failure information
      webauthnDebugger.log('verification-failed', 'error', 'Registration verification FAILED', {
        verified: false,
        reason: 'Verification returned false - possible causes: challenge mismatch, origin mismatch, RP ID mismatch, or invalid attestation',
        expectedChallenge: expectedChallenge.substring(0, 20) + '...',
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        receivedResponse: {
          id: body.id,
          type: body.type,
          responseFields: Object.keys(body.response || {})
        }
      });
    }

    if (verification.verified && verification.registrationInfo) {
      // Use the credential ID from the client response (already in base64url format)
      const credentialId = body.id;

      // Store the passkey in database
      const deviceType = verification.registrationInfo.aaguid === '00000000-0000-0000-0000-000000000000'
        ? 'platform'
        : 'cross-platform';

      const transports = body.response?.transports ? JSON.stringify(body.response.transports) : null;

      dbQueries.createPasskey.run(
        userId,
        credentialId,
        Buffer.from(verification.registrationInfo.credential.publicKey).toString('base64url'),
        verification.registrationInfo.credential.counter,
        deviceType,
        verification.registrationInfo.credentialBackedUp ? 1 : 0,
        transports
      );

      webauthnDebugger.log('verification-stored', 'success', 'Passkey stored in database', {
        credentialId,
        deviceType,
        backedUp: verification.registrationInfo.credentialBackedUp,
        transports
      });
    }

    return {
      verified: verification.verified,
      credentialId: verification.verified ? body.id : '',
      debugLogs: webauthnDebugger.getLogs()
    };
  } catch (error) {
    webauthnDebugger.log('verification-error', 'error', 'Failed to verify registration', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      body: body
    });
    throw error;
  }
}

// Authentication functions
export async function generatePasskeyAuthenticationOptions(
  username: string | undefined,
  dbQueries: DbQueries
): Promise<{ options: PublicKeyCredentialRequestOptionsJSON; challenge: string; debugLogs: DebugLog[] }> {
  try {
    webauthnDebugger.clearLogs();
    webauthnDebugger.log('auth-start', 'info', 'Starting passkey authentication process', { username });

    let allowCredentials: Array<{ id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }> = [];

    if (username) {
      // Get user's passkeys
      const user = dbQueries.getUserByUsername.get(username) as User | undefined;
      if (user) {
        const passkeys = dbQueries.getPasskeysByUserId.all(user.id) as Passkey[];
        allowCredentials = passkeys.map(passkey => ({
          id: passkey.credential_id,
          type: 'public-key' as const,
          transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
        }));
        webauthnDebugger.log('auth-credentials', 'info', 'Found user passkeys', {
          username,
          passkeyCount: passkeys.length,
          credentials: allowCredentials.map(c => ({ id: c.id, transports: c.transports }))
        });
      }
    }

    const options: GenerateAuthenticationOptionsOpts = {
      rpID: RP_ID,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: 'preferred',
      timeout: 60000,
    };

    webauthnDebugger.log('auth-options', 'info', 'Generated authentication options', options);

    const authenticationOptions = await generateAuthenticationOptions(options);
    webauthnDebugger.log('auth-generated', 'success', 'Authentication options generated successfully', authenticationOptions);

    return {
      options: authenticationOptions,
      challenge: authenticationOptions.challenge,
      debugLogs: webauthnDebugger.getLogs()
    };
  } catch (error) {
    webauthnDebugger.log('auth-error', 'error', 'Failed to generate authentication options', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export async function verifyPasskeyAuthentication(
  body: AuthenticationResponseJSON,
  expectedChallenge: string,
  dbQueries: DbQueries
): Promise<{ verified: boolean; userId: number; username: string; debugLogs: DebugLog[] }> {
  try {
    webauthnDebugger.clearLogs();
    webauthnDebugger.log('auth-verify-start', 'info', 'Starting passkey authentication verification', {
      expectedChallenge: expectedChallenge.substring(0, 20) + '...',
      credentialId: body.id
    });

    webauthnDebugger.log('auth-verify-input', 'info', 'Received authentication response', {
      id: body.id,
      rawId: body.rawId,
      response: {
        authenticatorData: body.response?.authenticatorData ? 'present' : 'missing',
        clientDataJSON: body.response?.clientDataJSON ? 'present' : 'missing',
        signature: body.response?.signature ? 'present' : 'missing',
        userHandle: body.response?.userHandle ? 'present' : 'missing',
      }
    });

    // Find the passkey in database
    // body.id is the base64url-encoded credential ID
    const credentialId = body.id;
    const passkey = dbQueries.getPasskeyByCredentialId.get(credentialId) as PasskeyWithUser | undefined;

    if (!passkey) {
      webauthnDebugger.log('auth-verify-error', 'error', 'Passkey not found in database', { credentialId });
      throw new Error('Passkey not found');
    }

    webauthnDebugger.log('auth-verify-found', 'info', 'Found passkey in database', {
      credentialId,
      userId: passkey.user_id,
      username: passkey.username,
      counter: passkey.counter
    });

    // Log verification parameters
    webauthnDebugger.log('auth-verify-params', 'info', 'Verification parameters', {
      expectedChallenge: expectedChallenge.substring(0, 20) + '...',
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      storedCounter: passkey.counter,
      credentialIdMatch: passkey.credential_id === credentialId
    });

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.credential_id,
        publicKey: new Uint8Array(Buffer.from(passkey.public_key, 'base64url')),
        counter: passkey.counter,
      },
    });

    webauthnDebugger.log('auth-verify-result', 'info', 'Authentication verification completed', {
      verified: verification.verified,
      hasAuthenticationInfo: !!verification.authenticationInfo,
    });

    if (!verification.verified) {
      // Log detailed failure information
      webauthnDebugger.log('auth-verify-failed', 'error', 'Authentication verification FAILED', {
        verified: false,
        reason: 'Verification returned false - possible causes: signature mismatch, challenge mismatch, origin mismatch, RP ID mismatch, or counter anomaly',
        expectedChallenge: expectedChallenge.substring(0, 20) + '...',
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        storedPublicKey: passkey.public_key.substring(0, 40) + '...',
        storedCounter: passkey.counter,
        credentialId: credentialId,
        receivedResponse: {
          id: body.id,
          type: body.type,
          responseFields: Object.keys(body.response || {})
        }
      });
    }

    if (verification.verified && verification.authenticationInfo) {
      // Update counter with the actual value from the authentication response
      const newCounter = verification.authenticationInfo.newCounter;
      dbQueries.updatePasskeyCounter.run(
        newCounter,
        credentialId
      );

      webauthnDebugger.log('auth-verify-updated', 'success', 'Passkey counter updated', {
        oldCounter: passkey.counter,
        newCounter: newCounter
      });
    }

    return {
      verified: verification.verified,
      userId: passkey.user_id,
      username: passkey.username,
      debugLogs: webauthnDebugger.getLogs()
    };
  } catch (error) {
    webauthnDebugger.log('auth-verify-error', 'error', 'Failed to verify authentication', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      body: body
    });
    throw error;
  }
}

// Utility functions
export function getWebAuthnSupport(): { supported: boolean; details: {
  hasPublicKeyCredential: boolean;
  hasNavigatorCredentials: boolean;
  hasCreate: boolean;
  hasGet: boolean;
  userAgent: string;
  platform: string;
} } {
  const details = {
    hasPublicKeyCredential: typeof window !== 'undefined' && 'PublicKeyCredential' in window,
    hasNavigatorCredentials: typeof window !== 'undefined' && 'credentials' in navigator,
    hasCreate: typeof window !== 'undefined' && 'credentials' in navigator && 'create' in navigator.credentials,
    hasGet: typeof window !== 'undefined' && 'credentials' in navigator && 'get' in navigator.credentials,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
    platform: typeof window !== 'undefined' ? navigator.platform : 'server',
  };

  const supported = details.hasPublicKeyCredential && details.hasNavigatorCredentials && details.hasCreate && details.hasGet;

  return { supported, details };
}

export function formatCredentialId(credentialId: string): string {
  try {
    return Buffer.from(credentialId, 'base64url').toString('hex');
  } catch {
    return credentialId;
  }
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}
