import { NextResponse } from 'next/server';
import db from '@/lib/database-server';

export async function GET() {
  try {
    // Check database connectivity
    const result = db.prepare('SELECT 1').get();

    if (!result) {
      throw new Error('Database query failed');
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
