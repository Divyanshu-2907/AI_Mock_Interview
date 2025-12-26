import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const { callId } = params;
    
    console.log(`Mock stopping recording for call: ${callId}`);

    // Mock transcription and analysis data
    const mockTranscription = {
      text: "This is a mock transcription of the user's response. In a real implementation, this would contain the actual transcribed speech from the Vapi recording.",
      duration: 45,
      words: 120,
      speaker: 'user'
    };

    const mockAnalysis = {
      sentiment: 'positive',
      confidence: 0.85,
      keyTopics: ['technical skills', 'problem solving', 'communication'],
      clarity: 0.9,
      pacing: 'good'
    };

    return NextResponse.json({
      callId,
      status: 'completed',
      transcription: mockTranscription,
      analysis: mockAnalysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error stopping recording:', error);
    return NextResponse.json(
      { error: 'Failed to stop recording' },
      { status: 500 }
    );
  }
}
