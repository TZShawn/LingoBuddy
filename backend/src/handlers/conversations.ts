import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createConversation, getConversations, getConversation, deleteConversation, getConversationInteractions } from '../utils/database';
import { success, badRequest, error, notFound, internalServerError } from '../utils/response';
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
    console.log('Create conversation event:', JSON.stringify(event, null, 2));
    
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: CreateConversationRequest = JSON.parse(event.body);
    console.log('Parsed body:', body);
    
    if (!body.language) {
      return badRequest('Language is required');
    }

    if (!body.userId) {
      return badRequest('User ID is required');
    }

    const userId = body.userId;
    console.log('Creating conversation for userId:', userId);
    
    const conversation = await createConversation(
      uuidv4(),
      userId,
      body.language,
      body.title,
      new Date().toISOString(),
    );

    console.log('Created conversation:', conversation);
    return success(conversation, 201);
  } catch (error: any) {
    console.error('Create conversation error:', error);
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    // Use internalServerError for unhandled exceptions to ensure CORS headers are included
    if (error.statusCode >= 500 || !error.statusCode) {
      return internalServerError(error.message || 'Failed to create conversation');
    }
    return error(error.message || 'Failed to create conversation', 400);
  }
};

export const list = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('List conversations event:', JSON.stringify(event, null, 2));
    
    if (!event.pathParameters?.userId) {
      console.log('No userId in path parameters');
      return badRequest('User ID is required');
    }
    
    const userId = event.pathParameters?.userId;
    console.log('Fetching conversations for userId:', userId);
    
    const conversations = await getConversations(userId);
    console.log('Retrieved conversations:', conversations.length);
    
    return success(conversations);
  } catch (error: any) {
    console.error('List conversations error:', error);
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    // Use internalServerError for unhandled exceptions to ensure CORS headers are included
    if (error.statusCode >= 500 || !error.statusCode) {
      return internalServerError(error.message || 'Failed to fetch conversations');
    }
    return error(error.message || 'Failed to fetch conversations', 400);
  }
};

export const get = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const conversationId = event.pathParameters?.id;
    if (!conversationId) {
      return badRequest('Conversation ID is required');
    }

    const conversation = await getConversation(conversationId);
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

    if (!event.body) {
      return badRequest('Request body is required');
    }

    await deleteConversation(conversationId, JSON.parse(event.body).userId);

    return success({ message: 'Conversation deleted successfully' });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    if (error.message.includes('No rows')) {
      return notFound('Conversation not found');
    }
    return error(error.message || 'Failed to delete conversation', 400);
  }
};
