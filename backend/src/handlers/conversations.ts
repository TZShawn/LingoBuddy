import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createConversation, getConversations, getConversation, deleteConversation, getConversationInteractions } from '../utils/database';
import { success, badRequest, error, notFound } from '../utils/response';
import { CreateConversationRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get user ID from headers (you might want to implement JWT validation)
const getUserId = (event: APIGatewayProxyEvent): string => {
  // For MVP, we'll use a simple header. In production, use JWT validation
  const userId = event.headers['x-user-id'] || event.headers['X-User-Id'];
  if (!userId) {
    throw new Error('User ID is required');
  }
  return userId as string;
};

export const create = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: CreateConversationRequest = JSON.parse(event.body);
    
    if (!body.language) {
      return badRequest('Language is required');
    }

    const userId = getUserId(event);
    const conversation = await createConversation(
      uuidv4(),
      userId,
      body.language,
      body.title,
      new Date().toISOString(),
      new Date().toISOString()
    );

    return success(conversation, 201);
  } catch (error: any) {
    console.error('Create conversation error:', error);
    return error(error.message || 'Failed to create conversation', 400);
  }
};

export const list = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserId(event);
    const conversations = await getConversations(userId);
    return success(conversations);
  } catch (error: any) {
    console.error('List conversations error:', error);
    return error(error.message || 'Failed to fetch conversations', 400);
  }
};

export const get = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const conversationId = event.pathParameters?.id;
    if (!conversationId) {
      return badRequest('Conversation ID is required');
    }

    const userId = getUserId(event);
    const conversation = await getConversation(conversationId, userId);
    const interactions = await getConversationInteractions(conversationId);

    return success({
      ...conversation,
      interactions,
    });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    if (error.message.includes('No rows')) {
      return notFound('Conversation not found');
    }
    return error(error.message || 'Failed to fetch conversation', 400);
  }
};

export const deleteConversationHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const conversationId = event.pathParameters?.id;
    if (!conversationId) {
      return badRequest('Conversation ID is required');
    }

    const userId = getUserId(event);
    await deleteConversation(conversationId, userId);

    return success({ message: 'Conversation deleted successfully' });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    if (error.message.includes('No rows')) {
      return notFound('Conversation not found');
    }
    return error(error.message || 'Failed to delete conversation', 400);
  }
};
