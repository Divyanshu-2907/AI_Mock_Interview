import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/admin';
import { OptimizedFirestore } from '@/lib/firebase-optimized';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const startTime = Date.now();
  
  try {
    const { sessionId } = params;

    // Get all feedback for this session
    const feedbackQuery = await db.collection('feedback')
      .where('sessionId', '==', sessionId)
      .orderBy('timestamp', 'asc')
      .get();

    const feedbackItems = feedbackQuery.docs.map(doc => doc.data());

    if (feedbackItems.length === 0) {
      return NextResponse.json({
        sessionId,
        responses: [],
        sessionSummary: {
          averageScore: 0,
          improvementAreas: [],
          strengthAreas: [],
          recommendations: [],
        },
      });
    }

    // Calculate session summary
    const scores = feedbackItems.map(item => item.feedback.overallScore);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Analyze patterns across all responses
    const allStrengths = feedbackItems.flatMap(item => item.feedback.strengths);
    const allImprovements = feedbackItems.flatMap(item => item.feedback.improvements);

    // Count frequency of strengths and improvements
    const strengthFrequency = countFrequency(allStrengths);
    const improvementFrequency = countFrequency(allImprovements);

    // Get top areas
    const strengthAreas = Object.entries(strengthFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([area]) => area);

    const improvementAreas = Object.entries(improvementFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([area]) => area);

    // Generate recommendations based on improvement areas
    const recommendations = generateRecommendations(improvementAreas, averageScore);

    const batchFeedback = {
      sessionId,
      responses: feedbackItems,
      sessionSummary: {
        averageScore: Math.round(averageScore),
        improvementAreas,
        strengthAreas,
        recommendations,
      },
    };

    // Update session with summary
    await db.collection('interview_sessions').doc(sessionId).update({
      'summary.averageScore': Math.round(averageScore),
      'summary.strengthAreas': strengthAreas,
      'summary.improvementAreas': improvementAreas,
      'summary.recommendations': recommendations,
      'summary.feedbackProcessed': true,
      'summary.processedAt': new Date(),
    });

    // Log performance metrics
    const duration = Date.now() - startTime;
    await OptimizedFirestore.logPerformanceMetrics('batch_feedback', duration, {
      sessionId,
      responseCount: feedbackItems.length,
    });

    return NextResponse.json(batchFeedback);

  } catch (error) {
    console.error('Error processing batch feedback:', error);
    
    const duration = Date.now() - startTime;
    await OptimizedFirestore.logPerformanceMetrics('batch_feedback_error', duration, {
      sessionId: params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to process batch feedback' },
      { status: 500 }
    );
  }
}

function countFrequency(items: string[]): Record<string, number> {
  const frequency: Record<string, number> = {};
  
  items.forEach(item => {
    // Normalize item (lowercase, trim)
    const normalized = item.toLowerCase().trim();
    frequency[normalized] = (frequency[normalized] || 0) + 1;
  });

  return frequency;
}

function generateRecommendations(improvementAreas: string[], averageScore: number): string[] {
  const recommendations: string[] = [];

  // Score-based recommendations
  if (averageScore < 60) {
    recommendations.push('Focus on fundamental concepts and build confidence with basic questions');
    recommendations.push('Practice structuring responses with clear introduction and conclusion');
  } else if (averageScore < 80) {
    recommendations.push('Work on providing more specific examples and details');
    recommendations.push('Practice advanced problem-solving scenarios');
  } else {
    recommendations.push('Focus on advanced topics and industry-specific knowledge');
    recommendations.push('Work on leadership and strategic thinking examples');
  }

  // Area-specific recommendations
  const areaRecommendations: Record<string, string> = {
    'communication': 'Practice active listening and clear articulation of thoughts',
    'confidence': 'Use power posing and breathing techniques to boost confidence',
    'structure': 'Use the STAR method (Situation, Task, Action, Result) for behavioral questions',
    'technical': 'Review core technical concepts and practice coding challenges',
    'content': 'Research the company and role to provide more relevant answers',
    'delivery': 'Record yourself practicing to identify and eliminate filler words',
  };

  improvementAreas.forEach(area => {
    const recommendation = areaRecommendations[area.toLowerCase()];
    if (recommendation && !recommendations.includes(recommendation)) {
      recommendations.push(recommendation);
    }
  });

  return recommendations.slice(0, 5); // Limit to 5 recommendations
}
