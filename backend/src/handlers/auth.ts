import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createUser, authenticateUser } from '../utils/database';
import { success, badRequest, error, unauthorized } from '../utils/response';
import { SignupRequest, LoginRequest } from '../types';

export const signup = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: SignupRequest = JSON.parse(event.body);
    
    if (!body.email || !body.password) {
      return badRequest('Email and password are required');
    }

    if (body.password.length < 6) {
      return badRequest('Password must be at least 6 characters');
    }

    const user = await createUser(body.email, body.password);
    return success(user, 201);
  } catch (error: any) {
    console.error('Signup error:', error);
    return error(error.message || 'Failed to create user', 400);
  }
};

export const login = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: LoginRequest = JSON.parse(event.body);
    
    if (!body.email || !body.password) {
      return badRequest('Email and password are required');
    }

    const user = await authenticateUser(body.email, body.password);
    return success(user);
  } catch (error: any) {
    console.error('Login error:', error);
    return unauthorized('Invalid credentials');
  }
};
