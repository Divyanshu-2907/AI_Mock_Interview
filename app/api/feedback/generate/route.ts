import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/firebase/admin';
import { OptimizedFirestore } from '@/lib/firebase-optimized';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { sessionId, questionId, response, audioData } = await request.json();

    // Generate comprehensive feedback using AI
    const feedbackPrompt = generateFeedbackPrompt(response, sessionId, questionId);
    
    const { text: feedbackText } = await generateText({
      model: openai('gpt-4-turbo'),
      prompt: feedbackPrompt,
      temperature: 0.3,
      maxTokens: 800,
    });

    const feedback = parseFeedbackResponse(feedbackText);

    // Analyze speech patterns if audio data is provided
    let speechAnalysis = null;
    if (audioData) {
      speechAnalysis = await analyzeSpeechPatterns(audioData);
      feedback.speechPattern = speechAnalysis;
    }

    // Store feedback with optimized batch operations
    await OptimizedFirestore.batchWrite([{
      type: 'set',
      collection: 'feedback',
      docId: `${sessionId}_${questionId}`,
      data: {
        sessionId,
        questionId,
        feedback,
        timestamp: Date.now(),
        responseLength: response.length,
        hasAudio: !!audioData,
      }
    }]);

    // Log performance metrics
    const duration = Date.now() - startTime;
    await OptimizedFirestore.logPerformanceMetrics('generate_feedback', duration, {
      sessionId,
      questionId,
      hasAudio: !!audioData,
    });

    return NextResponse.json({
      sessionId,
      questionId,
      feedback,
      speechAnalysis,
      processingTime: duration,
    });

  } catch (error) {
    console.error('Error generating feedback:', error);
    
    // Log error metrics
    const duration = Date.now() - startTime;
    await OptimizedFirestore.logPerformanceMetrics('generate_feedback_error', duration, {
      error: error.message,
    });

    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}

function generateFeedbackPrompt(response: string, sessionId: string, questionId: string): string {
  return `Analyze this interview response and provide comprehensive feedback:

Response: "${response}"

Please provide feedback in JSON format with this structure:
{
  "overallScore": 0-100,
  "categories": {
    "content": 0-100,
    "delivery": 0-100,
    "structure": 0-100,
    "confidence": 0-100
  },
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "detailedAnalysis": {
    "keywordUsage": {"keyword": count},
    "sentiment": "positive|neutral|negative",
    "complexity": "simple|moderate|complex",
    "length": "too_short|appropriate|too_long"
  }
}

Focus on:
- Content relevance and accuracy
- Communication clarity
- Structure and organization
- Confidence and engagement
- Areas for improvement
- Specific strengths to highlight`;
}

function parseFeedbackResponse(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback structure
    return {
      overallScore: 75,
      categories: {
        content: 75,
        delivery: 75,
        structure: 75,
        confidence: 75,
      },
      strengths: ['Good response structure'],
      improvements: ['Could be more detailed'],
      detailedAnalysis: {
        keywordUsage: {},
        sentiment: 'neutral',
        complexity: 'moderate',
        length: 'appropriate',
      },
    };
  } catch (error) {
    console.error('Error parsing feedback response:', error);
    throw new Error('Invalid feedback format');
  }
}

async function analyzeSpeechPatterns(audioData: ArrayBuffer): Promise<any> {
  try {
    // This would integrate with Vapi AI's speech analysis
    // For now, return a mock analysis
    return {
      pace: 120, // words per minute
      fillerWords: [
        { word: 'um', count: 2, positions: [15, 45] },
        { word: 'like', count: 1, positions: [30] }
      ],
      pauses: [
        { start: 10, end: 12, duration: 2 },
        { start: 25, end: 27, duration: 2 }
      ],
      sentiment: 'neutral',
      clarity: 85,
      engagement: 78,
    };
  } catch (error) {
    console.error('Error analyzing speech patterns:', error);
    return null;
  }
}
