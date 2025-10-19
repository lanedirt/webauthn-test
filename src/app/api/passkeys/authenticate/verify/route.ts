import { NextRequest, NextResponse } from 'next/server';
import { verifyPasskeyAuthentication } from '@/lib/webauthn';
import { dbQueries, generateSessionId } from '@/lib/database-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challenge } = body;

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge is required' },
        { status: 400 }
      );
    }

    const result = await verifyPasskeyAuthentication(body, challenge, dbQueries);

    if (!result.verified) {
      return NextResponse.json({
        success: false,
        message: 'Passkey authentication failed',
        debugLogs: result.debugLogs
      });
    }

    // Create session
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    dbQueries.createSession.run(sessionId, result.userId, 'passkey-login', expiresAt.toISOString());

    const response = NextResponse.json({
      success: true,
      message: 'Passkey authentication successful',
      userId: result.userId,
      username: result.username,
      debugLogs: result.debugLogs
    });

    // Set session cookie
    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;

  } catch (error) {
    console.error('Passkey authentication verify error:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify passkey authentication',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
