import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type VerifyAuthenticationResponseOpts,
  type PublicKeyCredentialDescriptor,
} from '@simplewebauthn/server';

// WebAuthn configuration
const RP_ID = process.env.NODE_ENV === 'production' ? 'yourdomain.com' : 'localhost';
const RP_NAME = 'WebAuthn Test Demo';
const ORIGIN = process.env.NODE_ENV === 'production'
  ? 'https://yourdomain.com'
  : 'http://localhost:3000';

// Debug logging interface
export interface DebugLog {
  timestamp: string;
  step: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

export class WebAuthnDebugger {
  private logs: DebugLog[] = [];

  log(step: string, type: DebugLog['type'], message: string, data?: any) {
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
  dbQueries: any
): Promise<{ options: any; challenge: string; debugLogs: DebugLog[] }> {
  try {
    webauthnDebugger.clearLogs();
    webauthnDebugger.log('registration-start', 'info', 'Starting passkey registration process', { userId, username });

    // Get existing passkeys for this user
    const existingPasskeys = dbQueries.getPasskeysByUserId.all(userId) as any[];
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
  body: any,
  expectedChallenge: string,
  userId: number,
  dbQueries: any
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

    if (verification.verified && verification.registrationInfo) {
      const credentialId = Buffer.from(verification.registrationInfo.credential.id).toString('base64url');

      // Store the passkey in database
      const deviceType = verification.registrationInfo.aaguid === '00000000-0000-0000-0000-000000000000'
        ? 'platform'
        : 'cross-platform';

      const transports = body.response?.transports ? JSON.stringify(body.response.transports) : null;

      dbQueries.createPasskey.run(
        userId,
        credentialId,
        Buffer.from(verification.registrationInfo.credential.publicKey).toString('base64url'),
        0, // counter starts at 0 for new passkeys
        deviceType,
        verification.registrationInfo.credentialBackedUp,
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
      credentialId: verification.verified && verification.registrationInfo
        ? Buffer.from(verification.registrationInfo.credential.id).toString('base64url')
        : '',
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
  dbQueries: any
): Promise<{ options: any; challenge: string; debugLogs: DebugLog[] }> {
  try {
    webauthnDebugger.clearLogs();
    webauthnDebugger.log('auth-start', 'info', 'Starting passkey authentication process', { username });

    let allowCredentials: any[] = [];

    if (username) {
      // Get user's passkeys
      const user = dbQueries.getUserByUsername.get(username) as any;
      if (user) {
        const passkeys = dbQueries.getPasskeysByUserId.all(user.id) as any[];
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
  body: any,
  expectedChallenge: string,
  dbQueries: any
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
    const credentialId = Buffer.from(body.rawId, 'base64url').toString('base64url');
    const passkey = dbQueries.getPasskeyByCredentialId.get(credentialId) as any;

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

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.credential_id,
        publicKey: passkey.public_key,
        counter: passkey.counter,
      },
    });

    webauthnDebugger.log('auth-verify-result', 'info', 'Authentication verification completed', {
      verified: verification.verified,
      hasAuthenticationInfo: !!verification.authenticationInfo,
    });

    if (verification.verified) {
      // Update counter (simplified for now)
      dbQueries.updatePasskeyCounter.run(
        passkey.counter + 1,
        credentialId
      );

      webauthnDebugger.log('auth-verify-updated', 'success', 'Passkey counter updated', {
        newCounter: passkey.counter + 1
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
export function getWebAuthnSupport(): { supported: boolean; details: any } {
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
