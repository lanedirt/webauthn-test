import { NextRequest, NextResponse } from 'next/server';
import { dbQueries, type Session, type Passkey } from '@/lib/database-server';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = dbQueries.getSession.get(sessionId) as Session | undefined;
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const passkeys = dbQueries.getPasskeysByUserId.all(session.user_id) as Passkey[];

    const formattedPasskeys = passkeys.map(passkey => ({
      id: passkey.id,
      credentialId: passkey.credential_id,
      deviceType: passkey.device_type,
      backedUp: passkey.backed_up,
      transports: passkey.transports ? JSON.parse(passkey.transports) : null,
      createdAt: passkey.created_at,
      lastUsedAt: passkey.last_used_at
    }));

    return NextResponse.json({
      success: true,
      passkeys: formattedPasskeys
    });

  } catch (error) {
    console.error('List passkeys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
