import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, serverError } from '../utils/response';
import { SUPPORTED_LANGUAGES } from '../utils/apis';

export const list = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    return success(SUPPORTED_LANGUAGES);
  } catch (error: any) {
    console.error('List languages error:', error);
    return serverError('Failed to fetch languages');
  }
};
