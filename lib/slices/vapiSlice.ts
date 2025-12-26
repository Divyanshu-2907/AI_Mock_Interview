import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import Vapi from '@vapi-ai/web';

export interface VapiConfig {
  apiKey: string;
  assistantId?: string;
  model: {
    provider: 'openai' | 'anthropic' | 'google';
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  voice: {
    provider: 'elevenlabs' | 'playht' | 'azure';
    voiceId: string;
    stability?: number;
    similarityBoost?: number;
  };
}

export interface QuestionGenerationRequest {
  jobRole: string;
  experience: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  previousQuestions?: string[];
  userResponses?: Array<{
    question: string;
    response: string;
    feedback?: any;
  }>;
  adaptiveMode: boolean;
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
  followUpQuestions?: string[];
  expectedKeywords: string[];
  evaluationCriteria: string[];
  adaptiveReasoning?: string;
}

export interface SpeechAnalysisResult {
  transcript: string;
  confidence: number;
  duration: number;
  speechPatterns: {
    pace: number; // words per minute
    fillerWords: Array<{ word: string; count: number; positions: number[] }>;
    pauses: Array<{ start: number; end: number; duration: number }>;
    sentiment: 'positive' | 'neutral' | 'negative';
    clarity: number; // 0-100
    engagement: number; // 0-100
  };
  linguisticFeatures: {
    complexity: number;
    vocabulary: number;
    grammar: number;
    coherence: number;
  };
}

interface VapiState {
  config: VapiConfig | null;
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  currentCall: any;
  generatedQuestions: GeneratedQuestion[];
  speechAnalysis: SpeechAnalysisResult | null;
  loading: boolean;
  error: string | null;
  adaptiveMode: boolean;
  questionHistory: Array<{
    request: QuestionGenerationRequest;
    result: GeneratedQuestion;
    timestamp: number;
  }>;
}

const initialState: VapiState = {
  config: null,
  isConnected: false,
  isRecording: false,
  isProcessing: false,
  currentCall: null,
  generatedQuestions: [],
  speechAnalysis: null,
  loading: false,
  error: null,
  adaptiveMode: true,
  questionHistory: [],
};

export const initializeVapi = createAsyncThunk(
  'vapi/initialize',
  async (config: VapiConfig) => {
    const vapi = new Vapi(config.apiKey);
    return { vapi, config };
  }
);

export const generateAdaptiveQuestion = createAsyncThunk(
  'vapi/generateQuestion',
  async (request: QuestionGenerationRequest) => {
    const response = await fetch('/api/vapi/generate-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to generate question');
    return response.json();
  }
);

export const startVoiceRecording = createAsyncThunk(
  'vapi/startRecording',
  async (_, { getState }) => {
    const state = getState() as { vapi: VapiState };
    if (!state.vapi.config) throw new Error('Vapi not initialized');
    
    const response = await fetch('/api/vapi/start-recording', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: state.vapi.config }),
    });
    if (!response.ok) throw new Error('Failed to start recording');
    return response.json();
  }
);

export const stopVoiceRecording = createAsyncThunk(
  'vapi/stopRecording',
  async (callId: string) => {
    const response = await fetch(`/api/vapi/stop-recording/${callId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to stop recording');
    return response.json();
  }
);

export const analyzeSpeechPattern = createAsyncThunk(
  'vapi/analyzeSpeech',
  async (audioData: { audio: ArrayBuffer; callId: string }) => {
    const response = await fetch('/api/vapi/analyze-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audioData),
    });
    if (!response.ok) throw new Error('Failed to analyze speech');
    return response.json();
  }
);

export const getRealTimeTranscription = createAsyncThunk(
  'vapi/getTranscription',
  async (callId: string) => {
    const response = await fetch(`/api/vapi/transcription/${callId}`);
    if (!response.ok) throw new Error('Failed to get transcription');
    return response.json();
  }
);

const vapiSlice = createSlice({
  name: 'vapi',
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<VapiConfig>) => {
      state.config = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    setCurrentCall: (state, action) => {
      state.currentCall = action.payload;
    },
    addGeneratedQuestion: (state, action: PayloadAction<GeneratedQuestion>) => {
      state.generatedQuestions.push(action.payload);
    },
    clearGeneratedQuestions: (state) => {
      state.generatedQuestions = [];
    },
    setSpeechAnalysis: (state, action: PayloadAction<SpeechAnalysisResult>) => {
      state.speechAnalysis = action.payload;
    },
    toggleAdaptiveMode: (state) => {
      state.adaptiveMode = !state.adaptiveMode;
    },
    addToQuestionHistory: (state, action: PayloadAction<{
      request: QuestionGenerationRequest;
      result: GeneratedQuestion;
      timestamp: number;
    }>) => {
      state.questionHistory.push(action.payload);
    },
    clearQuestionHistory: (state) => {
      state.questionHistory = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    disconnect: (state) => {
      state.isConnected = false;
      state.isRecording = false;
      state.isProcessing = false;
      state.currentCall = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeVapi.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeVapi.fulfilled, (state, action) => {
        state.loading = false;
        state.config = action.payload.config;
        state.isConnected = true;
      })
      .addCase(initializeVapi.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to initialize Vapi';
      })
      .addCase(generateAdaptiveQuestion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateAdaptiveQuestion.fulfilled, (state, action) => {
        state.loading = false;
        state.generatedQuestions.push(action.payload);
      })
      .addCase(generateAdaptiveQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate question';
      })
      .addCase(startVoiceRecording.fulfilled, (state, action) => {
        state.isRecording = true;
        state.currentCall = action.payload;
      })
      .addCase(stopVoiceRecording.fulfilled, (state) => {
        state.isRecording = false;
        state.isProcessing = true;
      })
      .addCase(analyzeSpeechPattern.fulfilled, (state, action) => {
        state.speechAnalysis = action.payload;
        state.isProcessing = false;
      })
      .addCase(getRealTimeTranscription.fulfilled, (state, action) => {
        if (state.speechAnalysis) {
          state.speechAnalysis.transcript = action.payload.transcript;
          state.speechAnalysis.confidence = action.payload.confidence;
        }
      });
  },
});

export const {
  setConfig,
  setConnected,
  setRecording,
  setProcessing,
  setCurrentCall,
  addGeneratedQuestion,
  clearGeneratedQuestions,
  setSpeechAnalysis,
  toggleAdaptiveMode,
  addToQuestionHistory,
  clearQuestionHistory,
  clearError,
  disconnect,
} = vapiSlice.actions;

export default vapiSlice.reducer;
