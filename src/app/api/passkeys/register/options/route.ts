import { NextRequest, NextResponse } from 'next/server';
import { generatePasskeyRegistrationOptions } from '@/lib/webauthn';
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

    const { username } = await request.json();
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const result = await generatePasskeyRegistrationOptions(session.user_id, username, dbQueries);

    // Store challenge in session
    dbQueries.createSession.run(
      `challenge-${sessionId}`,
      session.user_id,
      result.challenge,
      new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    );

    return NextResponse.json({
      success: true,
      options: result.options,
      challenge: result.challenge,
      debugLogs: result.debugLogs
    });

  } catch (error) {
    console.error('Passkey registration options error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate registration options',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
