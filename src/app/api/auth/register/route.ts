import { NextRequest, NextResponse } from 'next/server';
import { dbQueries, hashPassword } from '@/lib/database-server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = dbQueries.getUserByUsername.get(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = hashPassword(password);
    const result = dbQueries.createUser.run(username, passwordHash);
    const userId = result.lastInsertRowid as number;

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      userId,
      username
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
