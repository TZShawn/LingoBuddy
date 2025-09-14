export interface User {
  id: string;
  username: string;
  password: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  language: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  conversation_id: string;
  message: string;
  sender: 'user' | 'ai';
  created_at: string;
}

export interface Language {
  code: string;
  name: string;
  native_name: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TranscribeRequest {
  audioFile: string; // base64 encoded audio
  conversationId: string;
  language: string;
  userId?: string;
}

export interface TranscribeResponse {
  text: string;
  interactionId: string;
}

export interface GenerateResponseRequest {
  text: string;
  conversationId: string;
  language: string;
}

export interface GenerateResponseResponse {
  aiResponse: string;
  audioFile: string; // base64 encoded audio
  interactionId: string;
}

export interface CreateConversationRequest {
  userId: string;
  language: string;
  title?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
}

export interface TranslateWordRequest {
  word: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface TranslateWordResponse {
  originalWord: string;
  translatedWord: string;
  partOfSpeech?: string;
  confidence?: number;
}

export interface SplitAndTranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface SplitAndTranslateResponse {
  segments: Array<{
    text: string;
    translation: string;
    hoverable: boolean;
    partOfSpeech?: string;
  }>;
}