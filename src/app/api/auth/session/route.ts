import { NextRequest, NextResponse } from 'next/server';
import { dbQueries, type Session } from '@/lib/database-server';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ user: null });
    }

    const session = dbQueries.getSession.get(sessionId) as Session | undefined;
    if (!session) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: session.user_id,
        username: session.username
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null });
  }
}
