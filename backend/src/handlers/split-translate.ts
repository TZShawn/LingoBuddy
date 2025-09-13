import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, badRequest, error } from '../utils/response';
import { splitAndTranslateText } from '../utils/apis';
import { SplitAndTranslateRequest } from '../types';

export const splitAndTranslateHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: SplitAndTranslateRequest = JSON.parse(event.body);
    
    if (!body.text || !body.sourceLanguage || !body.targetLanguage) {
      return badRequest('text, sourceLanguage, and targetLanguage are required');
    }

    if (!body.text.trim()) {
      return badRequest('Text cannot be empty');
    }

    const result = await splitAndTranslateText(
      body.text,
      body.sourceLanguage,
      body.targetLanguage
    );

    return success(result);
  } catch (error: any) {
    console.error('Split and translate error:', error);
    return error(error.message || 'Failed to split and translate text', 400);
  }
};
