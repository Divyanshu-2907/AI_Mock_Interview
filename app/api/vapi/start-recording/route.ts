import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json();
    
    // Mock Vapi call creation for development
    const callId = uuidv4();
    
    console.log('Mock Vapi recording started with config:', config);

    return NextResponse.json({
      callId,
      status: 'recording',
      webSocketUrl: `wss://mock-vapi-url.com/calls/${callId}`,
    });
  } catch (error) {
    console.error('Error starting recording:', error);
    return NextResponse.json(
      { error: 'Failed to start recording' },
      { status: 500 }
    );
  }
}
