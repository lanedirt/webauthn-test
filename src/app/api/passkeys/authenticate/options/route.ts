import { NextRequest, NextResponse } from 'next/server';
import { generatePasskeyAuthenticationOptions } from '@/lib/webauthn';
import { dbQueries } from '@/lib/database-server';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    const result = await generatePasskeyAuthenticationOptions(username, dbQueries);

    // Store challenge in a temporary way (in production, use Redis or similar)
    // For now, we'll return it and the client will send it back
    return NextResponse.json({
      success: true,
      options: result.options,
      challenge: result.challenge,
      debugLogs: result.debugLogs
    });

  } catch (error) {
    console.error('Passkey authentication options error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate authentication options',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
