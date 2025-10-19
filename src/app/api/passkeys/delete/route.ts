import { NextRequest, NextResponse } from 'next/server';
import { dbQueries, type Session } from '@/lib/database-server';

export async function DELETE(request: NextRequest) {
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

    const { passkeyId } = await request.json();
    if (!passkeyId) {
      return NextResponse.json(
        { error: 'Passkey ID is required' },
        { status: 400 }
      );
    }

    const result = dbQueries.deletePasskey.run(passkeyId, session.user_id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Passkey not found or not owned by user' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Passkey deleted successfully'
    });

  } catch (error) {
    console.error('Delete passkey error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
