import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
  followUpQuestions?: string[];
}

export interface InterviewSession {
  id: string;
  userId: string;
  jobRole: string;
  experience: string;
  questions: Question[];
  currentQuestionIndex: number;
  startTime: number;
  endTime?: number;
  status: 'preparing' | 'active' | 'completed' | 'paused';
  responses: Array<{
    questionId: string;
    response: string;
    duration: number;
    timestamp: number;
    feedback?: {
      score: number;
      strengths: string[];
      improvements: string[];
      speechPatterns?: {
        pace: number;
        fillerWords: number;
        clarity: number;
      };
    };
  }>;
}

interface InterviewState {
  currentSession: InterviewSession | null;
  sessions: InterviewSession[];
  loading: boolean;
  error: string | null;
  questionBank: Question[];
}

const initialState: InterviewState = {
  currentSession: null,
  sessions: [],
  loading: false,
  error: null,
  questionBank: [],
};

export const startInterview = createAsyncThunk(
  'interview/startInterview',
  async (config: { jobRole: string; experience: string }) => {
    const response = await fetch('/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to start interview');
    return response.json();
  }
);

export const submitResponse = createAsyncThunk(
  'interview/submitResponse',
  async (data: { sessionId: string; questionId: string; response: string; duration: number }) => {
    const response = await fetch('/api/interview/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit response');
    return response.json();
  }
);

export const completeInterview = createAsyncThunk(
  'interview/completeInterview',
  async (sessionId: string) => {
    const response = await fetch(`/api/interview/complete/${sessionId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to complete interview');
    return response.json();
  }
);

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    setCurrentSession: (state, action: PayloadAction<InterviewSession>) => {
      state.currentSession = action.payload;
    },
    updateSessionStatus: (state, action: PayloadAction<{ status: InterviewSession['status'] }>) => {
      if (state.currentSession) {
        state.currentSession.status = action.payload.status;
      }
    },
    nextQuestion: (state) => {
      if (state.currentSession && state.currentSession.currentQuestionIndex < state.currentSession.questions.length - 1) {
        state.currentSession.currentQuestionIndex += 1;
      }
    },
    previousQuestion: (state) => {
      if (state.currentSession && state.currentSession.currentQuestionIndex > 0) {
        state.currentSession.currentQuestionIndex -= 1;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    addQuestionToBank: (state, action: PayloadAction<Question>) => {
      state.questionBank.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startInterview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startInterview.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload;
        state.sessions.push(action.payload);
      })
      .addCase(startInterview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to start interview';
      })
      .addCase(submitResponse.fulfilled, (state, action) => {
        if (state.currentSession) {
          const responseIndex = state.currentSession.responses.findIndex(
            r => r.questionId === action.payload.questionId
          );
          if (responseIndex >= 0) {
            state.currentSession.responses[responseIndex] = action.payload;
          } else {
            state.currentSession.responses.push(action.payload);
          }
        }
      })
      .addCase(completeInterview.fulfilled, (state, action) => {
        if (state.currentSession) {
          state.currentSession.status = 'completed';
          state.currentSession.endTime = Date.now();
          state.currentSession = { ...state.currentSession, ...action.payload };
        }
      });
  },
});

export const {
  setCurrentSession,
  updateSessionStatus,
  nextQuestion,
  previousQuestion,
  clearError,
  addQuestionToBank,
} = interviewSlice.actions;

export default interviewSlice.reducer;
