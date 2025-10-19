import { NextRequest, NextResponse } from 'next/server';
import { verifyPasskeyRegistration } from '@/lib/webauthn';
import { dbQueries, type Session } from '@/lib/database-server';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { challenge } = body;

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge is required' },
        { status: 400 }
      );
    }

    // Verify challenge
    const challengeSession = dbQueries.getSession.get(`challenge-${sessionId}`) as Session | undefined;
    if (!challengeSession || challengeSession.challenge !== challenge) {
      return NextResponse.json(
        { error: 'Invalid challenge' },
        { status: 400 }
      );
    }

    const result = await verifyPasskeyRegistration(body, challenge, session.user_id, dbQueries);

    // Clean up challenge session
    dbQueries.deleteSession.run(`challenge-${sessionId}`);

    return NextResponse.json({
      success: result.verified,
      message: result.verified ? 'Passkey registered successfully' : 'Passkey registration failed',
      credentialId: result.credentialId,
      debugLogs: result.debugLogs
    });

  } catch (error) {
    console.error('Passkey registration verify error:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify passkey registration',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
