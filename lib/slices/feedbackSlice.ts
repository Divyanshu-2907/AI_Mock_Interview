import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface SpeechPattern {
  pace: number; // words per minute
  fillerWords: number; // count of filler words
  clarity: number; // 0-100 score
  confidence: number; // 0-100 score
  engagement: number; // 0-100 score
  pauses: {
    count: number;
    averageDuration: number;
    appropriate: boolean;
  };
}

export interface FeedbackMetrics {
  overallScore: number; // 0-100
  categories: {
    content: number;
    delivery: number;
    structure: number;
    confidence: number;
  };
  strengths: string[];
  improvements: string[];
  speechPattern: SpeechPattern;
  detailedAnalysis: {
    keywordUsage: Record<string, number>;
    sentiment: 'positive' | 'neutral' | 'negative';
    complexity: 'simple' | 'moderate' | 'complex';
    length: 'too_short' | 'appropriate' | 'too_long';
  };
}

export interface BatchFeedback {
  sessionId: string;
  responses: Array<{
    questionId: string;
    feedback: FeedbackMetrics;
    timestamp: number;
  }>;
  sessionSummary: {
    averageScore: number;
    improvementAreas: string[];
    strengthAreas: string[];
    recommendations: string[];
  };
}

interface FeedbackState {
  currentFeedback: FeedbackMetrics | null;
  batchFeedback: BatchFeedback[];
  processingQueue: Array<{
    sessionId: string;
    questionId: string;
    response: string;
    timestamp: number;
  }>;
  loading: boolean;
  error: string | null;
  realTimeUpdates: boolean;
  batchProcessing: boolean;
  cache: Record<string, FeedbackMetrics>; // Response ID -> Feedback
}

const initialState: FeedbackState = {
  currentFeedback: null,
  batchFeedback: [],
  processingQueue: [],
  loading: false,
  error: null,
  realTimeUpdates: true,
  batchProcessing: false,
  cache: {},
};

export const generateFeedback = createAsyncThunk(
  'feedback/generateFeedback',
  async (data: { sessionId: string; questionId: string; response: string; audioData?: ArrayBuffer }) => {
    const response = await fetch('/api/feedback/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to generate feedback');
    return response.json();
  }
);

export const processBatchFeedback = createAsyncThunk(
  'feedback/processBatch',
  async (sessionId: string) => {
    const response = await fetch(`/api/feedback/batch/${sessionId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to process batch feedback');
    return response.json();
  }
);

export const analyzeSpeechPattern = createAsyncThunk(
  'feedback/analyzeSpeech',
  async (audioData: { audio: ArrayBuffer; duration: number; sessionId: string }) => {
    const response = await fetch('/api/feedback/speech-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audioData),
    });
    if (!response.ok) throw new Error('Failed to analyze speech pattern');
    return response.json();
  }
);

const feedbackSlice = createSlice({
  name: 'feedback',
  initialState,
  reducers: {
    setCurrentFeedback: (state, action: PayloadAction<FeedbackMetrics>) => {
      state.currentFeedback = action.payload;
    },
    addToProcessingQueue: (state, action: PayloadAction<{
      sessionId: string;
      questionId: string;
      response: string;
      timestamp: number;
    }>) => {
      state.processingQueue.push(action.payload);
    },
    removeFromProcessingQueue: (state, action: PayloadAction<number>) => {
      state.processingQueue.splice(action.payload, 1);
    },
    clearProcessingQueue: (state) => {
      state.processingQueue = [];
    },
    toggleRealTimeUpdates: (state) => {
      state.realTimeUpdates = !state.realTimeUpdates;
    },
    setBatchProcessing: (state, action: PayloadAction<boolean>) => {
      state.batchProcessing = action.payload;
    },
    cacheFeedback: (state, action: PayloadAction<{ responseId: string; feedback: FeedbackMetrics }>) => {
      state.cache[action.payload.responseId] = action.payload.feedback;
    },
    clearCache: (state) => {
      state.cache = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateFeedback.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateFeedback.fulfilled, (state, action) => {
        state.loading = false;
        state.currentFeedback = action.payload;
        state.cache[action.payload.responseId || 'current'] = action.payload;
      })
      .addCase(generateFeedback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate feedback';
      })
      .addCase(processBatchFeedback.pending, (state) => {
        state.batchProcessing = true;
      })
      .addCase(processBatchFeedback.fulfilled, (state, action) => {
        state.batchProcessing = false;
        state.batchFeedback.push(action.payload);
        state.processingQueue = [];
      })
      .addCase(processBatchFeedback.rejected, (state, action) => {
        state.batchProcessing = false;
        state.error = action.error.message || 'Failed to process batch feedback';
      })
      .addCase(analyzeSpeechPattern.fulfilled, (state, action) => {
        if (state.currentFeedback) {
          state.currentFeedback.speechPattern = action.payload;
        }
      });
  },
});

export const {
  setCurrentFeedback,
  addToProcessingQueue,
  removeFromProcessingQueue,
  clearProcessingQueue,
  toggleRealTimeUpdates,
  setBatchProcessing,
  cacheFeedback,
  clearCache,
  clearError,
} = feedbackSlice.actions;

export default feedbackSlice.reducer;
