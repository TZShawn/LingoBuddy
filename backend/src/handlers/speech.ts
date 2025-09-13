import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getConversation, createInteraction, updateInteraction, getConversationInteractions } from '../utils/database';
import { success, badRequest, error, notFound } from '../utils/response';
import { transcribeAudio, generateResponse, textToSpeech } from '../utils/apis';
import { TranscribeRequest, GenerateResponseRequest } from '../types';

// Helper function to get user ID from headers
const getUserId = (event: APIGatewayProxyEvent): string => {
  const userId = event.headers['x-user-id'] || event.headers['X-User-Id'];
  if (!userId) {
    throw new Error('User ID is required');
  }
  return userId as string;
};

export const transcribe = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: TranscribeRequest = JSON.parse(event.body);
    
    if (!body.audioFile || !body.conversationId || !body.language) {
      return badRequest('audioFile, conversationId, and language are required');
    }

    const userId = getUserId(event);
    
    // Verify conversation belongs to user
    await getConversation(body.conversationId, userId);

    // Transcribe audio using Deepgram
    const transcribedText = await transcribeAudio(body.audioFile, body.language);

    // Save user message to database
    const interaction = await createInteraction(body.conversationId, transcribedText);

    return success({
      text: transcribedText,
      interactionId: interaction.id,
    });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    if (error.message.includes('No rows')) {
      return notFound('Conversation not found');
    }
    return error(error.message || 'Failed to transcribe audio', 400);
  }
};

export const generateResponse = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: GenerateResponseRequest = JSON.parse(event.body);
    
    if (!body.text || !body.conversationId || !body.language) {
      return badRequest('text, conversationId, and language are required');
    }

    const userId = getUserId(event);
    
    // Verify conversation belongs to user
    const conversation = await getConversation(body.conversationId, userId);

    // Get conversation history for context
    const interactions = await getConversationInteractions(body.conversationId);
    const conversationHistory = interactions
      .filter(i => i.user_message && i.ai_response)
      .map(i => [
        { role: 'user' as const, content: i.user_message },
        { role: 'assistant' as const, content: i.ai_response }
      ])
      .flat();

    // Generate AI response using OpenAI
    const aiResponse = await generateResponse(
      body.text,
      conversation.language,
      conversationHistory
    );

    // Convert AI response to speech using 11Labs
    const audioFile = await textToSpeech(aiResponse);

    // Find the interaction to update (should be the most recent one with the user message)
    const recentInteraction = interactions
      .filter(i => i.user_message === body.text && !i.ai_response)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    let interactionId: string;
    if (recentInteraction) {
      // Update existing interaction
      const updatedInteraction = await updateInteraction(recentInteraction.id, aiResponse);
      interactionId = updatedInteraction.id;
    } else {
      // Create new interaction (fallback)
      const newInteraction = await createInteraction(body.conversationId, body.text, aiResponse);
      interactionId = newInteraction.id;
    }

    return success({
      aiResponse,
      audioFile,
      interactionId,
    });
  } catch (error: any) {
    console.error('Generate response error:', error);
    if (error.message.includes('No rows')) {
      return notFound('Conversation not found');
    }
    return error(error.message || 'Failed to generate response', 400);
  }
};
