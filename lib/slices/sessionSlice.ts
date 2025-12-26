import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface UserSession {
  id: string;
  userId: string;
  socketId?: string;
  status: 'active' | 'inactive' | 'connecting' | 'disconnected';
  lastActivity: number;
  metadata: {
    userAgent: string;
    ip?: string;
    location?: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
  };
  performance: {
    latency: number;
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
    bandwidth?: number;
  };
}

interface SessionState {
  activeSessions: Record<string, UserSession>;
  totalSessions: number;
  maxConcurrentSessions: number;
  sessionHistory: UserSession[];
  loading: boolean;
  error: string | null;
  connectionPool: {
    available: number;
    total: number;
    active: number;
  };
}

const initialState: SessionState = {
  activeSessions: {},
  totalSessions: 0,
  maxConcurrentSessions: 100,
  sessionHistory: [],
  loading: false,
  error: null,
  connectionPool: {
    available: 100,
    total: 100,
    active: 0,
  },
};

export const createSession = createAsyncThunk(
  'session/createSession',
  async (userData: { userId: string; metadata: UserSession['metadata'] }) => {
    const response = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  }
);

export const updateSessionActivity = createAsyncThunk(
  'session/updateActivity',
  async ({ sessionId, activity }: { sessionId: string; activity: Partial<UserSession> }) => {
    const response = await fetch(`/api/sessions/${sessionId}/activity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity),
    });
    if (!response.ok) throw new Error('Failed to update session activity');
    return response.json();
  }
);

export const terminateSession = createAsyncThunk(
  'session/terminateSession',
  async (sessionId: string) => {
    const response = await fetch(`/api/sessions/${sessionId}/terminate`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to terminate session');
    return sessionId;
  }
);

export const getConnectionPoolStatus = createAsyncThunk(
  'session/getConnectionPoolStatus',
  async () => {
    const response = await fetch('/api/sessions/pool-status');
    if (!response.ok) throw new Error('Failed to get connection pool status');
    return response.json();
  }
);

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    addSession: (state, action: PayloadAction<UserSession>) => {
      state.activeSessions[action.payload.id] = action.payload;
      state.totalSessions += 1;
      state.connectionPool.active += 1;
      state.connectionPool.available -= 1;
    },
    removeSession: (state, action: PayloadAction<string>) => {
      const session = state.activeSessions[action.payload];
      if (session) {
        state.sessionHistory.push({ ...session, status: 'disconnected' });
        delete state.activeSessions[action.payload];
        state.connectionPool.active -= 1;
        state.connectionPool.available += 1;
      }
    },
    updateSession: (state, action: PayloadAction<{ sessionId: string; updates: Partial<UserSession> }>) => {
      const session = state.activeSessions[action.payload.sessionId];
      if (session) {
        Object.assign(session, action.payload.updates);
      }
    },
    updateConnectionPool: (state, action: PayloadAction<Partial<SessionState['connectionPool']>>) => {
      Object.assign(state.connectionPool, action.payload);
    },
    cleanupInactiveSessions: (state) => {
      const now = Date.now();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
      
      Object.entries(state.activeSessions).forEach(([sessionId, session]) => {
        if (now - session.lastActivity > inactiveThreshold) {
          state.sessionHistory.push({ ...session, status: 'inactive' });
          delete state.activeSessions[sessionId];
          state.connectionPool.active -= 1;
          state.connectionPool.available += 1;
        }
      });
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.loading = false;
        state.activeSessions[action.payload.id] = action.payload;
        state.totalSessions += 1;
        state.connectionPool.active += 1;
        state.connectionPool.available -= 1;
      })
      .addCase(createSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create session';
      })
      .addCase(updateSessionActivity.fulfilled, (state, action) => {
        const session = state.activeSessions[action.payload.id];
        if (session) {
          Object.assign(session, action.payload);
        }
      })
      .addCase(terminateSession.fulfilled, (state, action) => {
        const session = state.activeSessions[action.payload];
        if (session) {
          state.sessionHistory.push({ ...session, status: 'disconnected' });
          delete state.activeSessions[action.payload];
          state.connectionPool.active -= 1;
          state.connectionPool.available += 1;
        }
      })
      .addCase(getConnectionPoolStatus.fulfilled, (state, action) => {
        state.connectionPool = action.payload;
      });
  },
});

export const {
  addSession,
  removeSession,
  updateSession,
  updateConnectionPool,
  cleanupInactiveSessions,
  clearError,
} = sessionSlice.actions;

export default sessionSlice.reducer;
