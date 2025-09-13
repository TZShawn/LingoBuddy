import { APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../types';

export function success<T>(data: T, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify({
      success: true,
      data,
    } as ApiResponse<T>),
  };
}

export function error(message: string, statusCode: number = 400): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify({
      success: false,
      error: message,
    } as ApiResponse),
  };
}

export function serverError(message: string = 'Internal server error'): APIGatewayProxyResult {
  return error(message, 500);
}

export function badRequest(message: string): APIGatewayProxyResult {
  return error(message, 400);
}

export function unauthorized(message: string = 'Unauthorized'): APIGatewayProxyResult {
  return error(message, 401);
}

export function notFound(message: string = 'Resource not found'): APIGatewayProxyResult {
  return error(message, 404);
}
