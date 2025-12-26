import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock connection pool data for development
    const mockData = {
      active: Math.floor(Math.random() * 10) + 1,
      available: 95,
      total: 100,
      connectionQuality: 'excellent',
      avgLatency: Math.floor(Math.random() * 100) + 50,
      recentOperations: Math.floor(Math.random() * 20) + 5,
      discrepancy: {
        detected: false,
      },
    };

    return NextResponse.json(mockData);

  } catch (error) {
    console.error('Error getting pool status:', error);
    return NextResponse.json(
      { error: 'Failed to get pool status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, count } = await request.json();

    const currentMetrics = {
      active: Math.floor(Math.random() * 10) + 1,
      available: 95,
      total: 100,
      latency: Math.floor(Math.random() * 100) + 50,
    };

    let newMetrics = { ...currentMetrics };

    switch (action) {
      case 'expand':
        newMetrics.total = Math.min(currentMetrics.total + (count || 10), 200);
        newMetrics.available = newMetrics.total - currentMetrics.active;
        break;

      case 'shrink':
        if (currentMetrics.active < currentMetrics.total - (count || 10)) {
          newMetrics.total = Math.max(currentMetrics.total - (count || 10), 50);
          newMetrics.available = newMetrics.total - currentMetrics.active;
        }
        break;

      case 'reset':
        newMetrics = {
          active: 0,
          available: 100,
          total: 100,
          latency: 0,
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      action: 'completed',
      previousMetrics: currentMetrics,
      newMetrics,
    });

  } catch (error) {
    console.error('Error managing pool:', error);
    return NextResponse.json(
      { error: 'Failed to manage pool' },
      { status: 500 }
    );
  }
}
