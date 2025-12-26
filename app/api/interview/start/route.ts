import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, config } = await request.json();

    // Mock interview start for development
    const interviewId = uuidv4();
    const mockInterview = {
      id: interviewId,
      sessionId: sessionId || uuidv4(),
      status: 'active',
      config: {
        jobRole: config?.jobRole || 'Software Engineer',
        experience: config?.experience || 'mid',
        difficulty: config?.difficulty || 'medium',
        category: config?.category || 'technical',
      },
      startedAt: new Date().toISOString(),
      currentQuestionIndex: 0,
      questions: [
        {
          id: 'q1',
          text: `Tell me about your experience as a ${config?.jobRole || 'Software Engineer'}.`,
          category: config?.category || 'technical',
          difficulty: config?.difficulty || 'medium',
          timeLimit: 120,
        },
        {
          id: 'q2', 
          text: `What's your approach to solving complex problems in your field?`,
          category: 'behavioral',
          difficulty: config?.difficulty || 'medium',
          timeLimit: 120,
        },
        {
          id: 'q3',
          text: `Describe a challenging project you've worked on recently.`,
          category: 'situational',
          difficulty: config?.difficulty || 'medium',
          timeLimit: 120,
        },
      ],
    };

    return NextResponse.json({
      interview: mockInterview,
      firstQuestion: mockInterview.questions[0],
    });

  } catch (error) {
    console.error('Error starting interview:', error);
    return NextResponse.json(
      { error: 'Failed to start interview' },
      { status: 500 }
    );
  }
}
