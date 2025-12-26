import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import interviewReducer from './slices/interviewSlice';
import sessionReducer from './slices/sessionSlice';
import feedbackReducer from './slices/feedbackSlice';
import vapiReducer from './slices/vapiSlice';

export const store = configureStore({
  reducer: {
    interview: interviewReducer,
    session: sessionReducer,
    feedback: feedbackReducer,
    vapi: vapiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'vapi/initialize/fulfilled'],
        ignoredPaths: ['vapi.vapi'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
