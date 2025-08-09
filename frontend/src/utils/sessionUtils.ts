import { MessageWithAgent, ChatSession } from '@/types/chat';

export const createSessionFromMessages = (
  messages: MessageWithAgent[],
  sessionId?: string
): ChatSession => {
  const id = sessionId || `session_${Date.now()}`;
  const title = messages.length > 0 
    ? messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? '...' : '')
    : 'New Session';
    
  return {
    id,
    userId: 'user',
    messages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title
  };
};

export const saveSessionsToStorage = (sessions: ChatSession[]): void => {
  try {
    localStorage.setItem('htkk_ai_sessions', JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save sessions to localStorage:', error);
  }
};

export const loadSessionsFromStorage = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem('htkk_ai_sessions');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load sessions from localStorage:', error);
    return [];
  }
};

export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
