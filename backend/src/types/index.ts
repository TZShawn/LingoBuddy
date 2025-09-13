export interface User {
  id: string;
  email: string;
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
  user_message: string;
  ai_response: string;
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
  language: string;
  title?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}
