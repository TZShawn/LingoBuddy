import { createClient } from '@supabase/supabase-js';
import { User, Conversation, Interaction } from '../types';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is not set');
}
if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_KEY environment variable is not set');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// User operations
export async function createUser(username: string, password: string): Promise<User> {
  try {
    const {data, error} = await supabase.from('users').insert({
      id: uuidv4(),
      created_at: new Date().toISOString(),
      username,
      password,
    }).select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

export async function getUserInfo(username: string): Promise<User> {
  try {
    const {data, error} = await supabase.from('users').select('*').eq('username', username).single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Authenticate user error:', error);
    throw error;
  }
}

// Conversation operations
export async function createConversation(
  id: string,
  userId: string,
  language: string,
  title?: string,
  created_at?: string,
): Promise<Conversation> {
  const conversationData = {
    id,
    user_id: userId,
    language,
    title: title || `Conversation in ${language}`,
    created_at: created_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('conversations')
    .insert(conversationData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error;
  return data || [];
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteConversation(conversationId: string, userId: string): Promise<void> {
  // First delete all interactions
  await supabase
    .from('interactions')
    .delete()
    .eq('conversation_id', conversationId);

  // Then delete the conversation
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Interaction operations
export async function createInteraction(
  conversationId: string,
  message: string,
  sender: 'user' | 'ai'
): Promise<Interaction> {
  const interactionData = {
    conversation_id: conversationId,
    message: message,
    sender: sender,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('interactions')
    .insert(interactionData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInteraction(
  interactionId: string,
  message: string
): Promise<Interaction> {
  const { data, error } = await supabase
    .from('interactions')
    .update({ message: message })
    .eq('id', interactionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversationInteractions(conversationId: string): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}
