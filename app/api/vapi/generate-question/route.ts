import { NextRequest, NextResponse } from 'next/server';
import { VapiClient } from '@vapi-ai/server-sdk';
import { db } from '@/firebase/admin';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(request: NextRequest) {
  try {
    const { jobRole, experience, difficulty, category, previousQuestions, userResponses, adaptiveMode } = await request.json();

    // Generate adaptive question based on user history
    const prompt = generateAdaptivePrompt(jobRole, experience, difficulty, category, previousQuestions, userResponses, adaptiveMode);
    
    // Initialize Vapi with your API key from environment
    const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! });
    
    // Generate the question using AI SDK
    const { text } = await generateText({
      model: openai('gpt-4-turbo'),
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    const generatedQuestion = parseQuestionResponse(text);

    // Store in Firebase for analytics and caching
    await db.collection('generated_questions').add({
      ...generatedQuestion,
      metadata: {
        jobRole,
        experience,
        difficulty,
        category,
        adaptiveMode,
        timestamp: Date.now(),
        previousQuestions: previousQuestions?.length || 0,
      },
    });

    return NextResponse.json(generatedQuestion);
  } catch (error) {
    console.error('Error generating question:', error);
    return NextResponse.json(
      { error: 'Failed to generate question' },
      { status: 500 }
    );
  }
}

function generateAdaptivePrompt(
  jobRole: string,
  experience: string,
  difficulty: string,
  category: string,
  previousQuestions?: string[],
  userResponses?: Array<{ question: string; response: string; feedback?: any }>,
  adaptiveMode?: boolean
): string {
  let prompt = `Generate a ${difficulty} interview question for a ${experience} level ${jobRole} position in the ${category} category.`;

  if (adaptiveMode && userResponses && userResponses.length > 0) {
    const recentResponses = userResponses.slice(-3);
    const performanceAnalysis = analyzeRecentPerformance(recentResponses);
    
    prompt += `\n\nAdaptive context based on recent performance:\n${performanceAnalysis}`;
    prompt += `\n\nGenerate a question that ${getAdaptiveInstruction(performanceAnalysis)}`;
  }

  if (previousQuestions && previousQuestions.length > 0) {
    prompt += `\n\nPrevious questions asked: ${previousQuestions.join(', ')}`;
    prompt += `\n\nEnsure this question is different and covers a new aspect.`;
  }

  prompt += `\n\nFormat your response as JSON with this structure:
{
  "text": "The question text",
  "category": "${category}",
  "difficulty": "${difficulty}",
  "timeLimit": 120,
  "followUpQuestions": ["Follow-up 1", "Follow-up 2"],
  "expectedKeywords": ["keyword1", "keyword2"],
  "evaluationCriteria": ["criterion1", "criterion2"],
  "adaptiveReasoning": "Why this question was chosen based on performance"
}`;

  return prompt;
}

function analyzeRecentPerformance(responses: Array<{ question: string; response: string; feedback?: any }>): string {
  const analysis = {
    averageScore: 0,
    strengthAreas: [] as string[],
    improvementAreas: [] as string[],
    responsePatterns: {
      length: 'appropriate',
      confidence: 'moderate',
      technicalDepth: 'moderate',
    },
  };

  let totalScore = 0;
  responses.forEach(response => {
    if (response.feedback) {
      totalScore += response.feedback.overallScore || 0;
      
      if (response.feedback.strengths) {
        analysis.strengthAreas.push(...response.feedback.strengths);
      }
      
      if (response.feedback.improvements) {
        analysis.improvementAreas.push(...response.feedback.improvements);
      }
    }
  });

  analysis.averageScore = totalScore / responses.length;

  return JSON.stringify(analysis, null, 2);
}

function getAdaptiveInstruction(performance: string): string {
  const perf = JSON.parse(performance);
  
  if (perf.averageScore < 60) {
    return 'focuses on fundamental concepts and builds confidence';
  } else if (perf.averageScore < 80) {
    return 'challenges the user with more complex scenarios';
  } else {
    return 'tests advanced concepts and problem-solving abilities';
  }
}

function parseQuestionResponse(response: string): any {
  try {
    // Extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback if no JSON found
    return {
      id: Math.random().toString(36).substr(2, 9),
      text: response,
      category: 'general',
      difficulty: 'medium',
      timeLimit: 120,
      followUpQuestions: [],
      expectedKeywords: [],
      evaluationCriteria: [],
    };
  } catch (error) {
    console.error('Error parsing question response:', error);
    throw new Error('Invalid question format');
  }
}
