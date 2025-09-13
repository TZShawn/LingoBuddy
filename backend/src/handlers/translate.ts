import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, badRequest, error } from '../utils/response';
import { translateWord } from '../utils/apis';
import { TranslateWordRequest } from '../types';

export const translateWordHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: TranslateWordRequest = JSON.parse(event.body);
    
    if (!body.word || !body.sourceLanguage || !body.targetLanguage) {
      return badRequest('word, sourceLanguage, and targetLanguage are required');
    }

    // Clean the word (remove punctuation, convert to lowercase)
    const cleanWord = body.word.trim().toLowerCase().replace(/[^\w\s]/g, '');
    
    if (!cleanWord) {
      return badRequest('Invalid word provided');
    }

    const translation = await translateWord(
      cleanWord,
      body.sourceLanguage,
      body.targetLanguage
    );

    return success({
      originalWord: body.word,
      translatedWord: translation.translatedWord,
      partOfSpeech: translation.partOfSpeech,
      confidence: translation.confidence,
    });
  } catch (error: any) {
    console.error('Translate word error:', error);
    return error(error.message || 'Failed to translate word', 400);
  }
};
