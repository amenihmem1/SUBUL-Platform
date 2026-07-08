'use client';

import React, { createContext, useContext, useReducer, type ReactNode } from 'react';

export interface UserPreferences {
  compactMode: boolean;
  showAnimations: boolean;
  darkMode: boolean;
}

export interface UserState {
  userName: string;
  streak: number;
  notifications: number;
  totalXP: number;
  userLevel: number;
  preferences: UserPreferences;
}

interface AppContextType {
  state: UserState;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  updateNotifications: (count: number) => void;
  updateStreak: (streak: number) => void;
  addXP: (amount: number) => void;
}

// Initial state
const initialState: UserState = {
  userName: 'Nour',
  streak: 7,
  notifications: 3,
  totalXP: 450,
  userLevel: 3,
  preferences: {
    compactMode: false,
    showAnimations: true,
    darkMode: false
  }
};

// Actions
type AppAction = 
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'UPDATE_NOTIFICATIONS'; payload: number }
  | { type: 'UPDATE_STREAK'; payload: number }
  | { type: 'ADD_XP'; payload: number };

// Reducer
function appReducer(state: UserState, action: AppAction): UserState {
  switch (action.type) {
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload }
      };
    case 'UPDATE_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload
      };
    case 'UPDATE_STREAK':
      return {
        ...state,
        streak: action.payload
      };
    case 'ADD_XP':
      const newXP = state.totalXP + action.payload;
      const newLevel = Math.floor(newXP / 150) + 1; // 150 XP per level
      return {
        ...state,
        totalXP: newXP,
        userLevel: newLevel
      };
    default:
      return state;
  }
}

// Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const updatePreferences = (preferences: Partial<UserPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
  };

  const updateNotifications = (count: number) => {
    dispatch({ type: 'UPDATE_NOTIFICATIONS', payload: count });
  };

  const updateStreak = (streak: number) => {
    dispatch({ type: 'UPDATE_STREAK', payload: streak });
  };

  const addXP = (amount: number) => {
    dispatch({ type: 'ADD_XP', payload: amount });
  };

  return (
    <AppContext.Provider value={{
      state,
      updatePreferences,
      updateNotifications,
      updateStreak,
      addXP
    }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
