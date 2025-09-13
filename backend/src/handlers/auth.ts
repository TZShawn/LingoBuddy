import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createUser, getUserInfo } from '../utils/database';
import { success, badRequest, error, unauthorized } from '../utils/response';
import { SignupRequest, LoginRequest } from '../types';

export const signup = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const body: SignupRequest = JSON.parse(event.body);
    
    if (!body.username || !body.password) {
      return badRequest('username and password are required');
    }

    const user = await createUser(body.username, body.password);
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
    
    if (!body.username || !body.password) {
      return badRequest('username and password are required');
    }

    const user = await getUserInfo(body.username);
    if (!user) {
      return badRequest('Invalid username');
    }

    if (user.password !== body.password) {
      return badRequest('Invalid Password');
    }

    return success(user);
  } catch (error: any) {
    console.error('Login error:', error);
    return error(error.message || 'Failed to login', 400);
  }
};
