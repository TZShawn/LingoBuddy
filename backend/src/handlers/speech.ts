import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getConversation, createInteraction, updateInteraction, getConversationInteractions } from '../utils/database';
import { success, badRequest, error, notFound, internalServerError } from '../utils/response';
import { transcribeAudio, chatGenerateResponse, textToSpeech } from '../utils/apis';
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
    console.log('Transcribe event:', JSON.stringify(event, null, 2));
    
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: TranscribeRequest = JSON.parse(event.body);

    if (!body.audioFile || !body.conversationId || !body.language) {
      return badRequest('audioFile, conversationId, and language are required');
    }

    // Get userId from body or headers
    const userId = body.userId || getUserId(event);
    if (!userId) {
      return badRequest('User ID is required');
    }

    // Get conversation
    const conversation = await getConversation(body.conversationId);

    // Transcribe audio using Deepgram
    console.log('Starting transcription...');
    const transcribedText = await transcribeAudio(body.audioFile, body.language);
    // const transcribedText = 'Hello, do you what do you like to eat?';
    console.log('Transcription completed:', transcribedText);

    // Save user message to database
    console.log('Creating user interaction...');
    const interaction = await createInteraction(body.conversationId, transcribedText, 'user');
    console.log('User interaction created:', interaction.id);

    return success({
      text: transcribedText,
      interactionId: interaction.id,
    });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    if (error.message.includes('No rows')) {
      return notFound('Conversation not found');
    }
    
    // Use internalServerError for unhandled exceptions to ensure CORS headers are included
    if (error.statusCode >= 500 || !error.statusCode) {
      return internalServerError(error.message || 'Failed to transcribe audio');
    }
    return error(error.message || 'Failed to transcribe audio', 400);
  }
};

export const generateResponse = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Generate response event:', JSON.stringify(event, null, 2));
    
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: GenerateResponseRequest = JSON.parse(event.body);
    
    if (!body.text || !body.conversationId || !body.language) {
      return badRequest('text, conversationId, and language are required');
    }
    
    // Get conversation
    const conversation = await getConversation(body.conversationId);

    // Get conversation history for context
    const interactions = await getConversationInteractions(body.conversationId);
    const conversationHistory = interactions
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .filter(i => i.sender === 'user' || i.sender === 'ai')
      .map(i => ({
        role: i.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: i.message
      }));

    // Generate AI response using OpenAI
    console.log('Generating AI response...');

    const languageToVoiceId = {
      'en': {voiceId: 'cgSgspJ2msm6clMCkdW9', gender: 'female', name: 'Alice'},
      'es': {voiceId: 'EXAVITQu4vr4xnSDxMaL', gender: 'female', name: 'Alice'},
      'fr': {voiceId: '4VZIsMPtgggwNg7OXbPY', gender: 'male', name: 'James'},
      'it': {voiceId: 'Xb7hH8MSUJpSbSDYk0k2', gender: 'female', name: 'Alice'},
      'ja': {voiceId: 'PmgfHCGeS5b7sH90BOOJ', gender: 'female', name: 'Alice'},
      'ko': {voiceId: 'AW5wrnG1jVizOYY7R1Oo', gender: 'female', name: 'Alice'},
      'zh': {voiceId: '4VZIsMPtgggwNg7OXbPY', gender: 'male', name: 'James'},
    };

    const {voiceId, gender, name} = languageToVoiceId[conversation.language as keyof typeof languageToVoiceId];

    /////////////////////////////////////////////////////UNCOMMENT THIS WHEN READY TO USE OPENAI ///////////////////////////
    const aiResponse = await chatGenerateResponse(
      body.text,
      conversation.language,
      conversationHistory,
      gender,
      name
    );

    // const aiResponse = 'Hi Shawn, I like to eat pizza and burgers.';
    console.log('AI response generated:', aiResponse.substring(0, 100) + '...');


    // Convert AI response to speech using 11Labs
    console.log('Converting to speech...');

    const audioFile = await textToSpeech(aiResponse, voiceId);
    console.log('Speech conversion completed');

    // Create new AI interaction
    console.log('Creating AI interaction...');
    const aiInteraction = await createInteraction(body.conversationId, aiResponse, 'ai');
    console.log('AI interaction created:', aiInteraction.id);

    return success({
      aiResponse,
      audioFile,
      interactionId: aiInteraction.id,
    });
  } catch (error: any) {
    console.error('Generate response error:', error);
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    if (error.message.includes('No rows')) {
      return notFound('Conversation not found');
    }
    
    // Use internalServerError for unhandled exceptions to ensure CORS headers are included
    if (error.statusCode >= 500 || !error.statusCode) {
      return internalServerError(error.message || 'Failed to generate response');
    }
    return error(error.message || 'Failed to generate response', 400);
  }
};
