# LingoBuddy Backend

A serverless backend for a conversational language learning app built with AWS Lambda and Supabase.

## Features

- User authentication (signup/login)
- Conversation management
- Speech-to-text transcription (Deepgram)
- AI-powered responses (OpenAI)
- Text-to-speech generation (11Labs)
- Conversation history storage

## Tech Stack

- **Runtime**: Node.js 18.x with TypeScript
- **Framework**: AWS Serverless Framework
- **Database**: Supabase (PostgreSQL)
- **APIs**: Deepgram, OpenAI, 11Labs
- **Deployment**: AWS Lambda + API Gateway

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- AWS CLI configured with appropriate permissions
- Serverless Framework installed globally: `npm install -g serverless`
- Supabase account and project

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Environment Variables

Copy the example environment file and fill in your API keys:

```bash
cp env.example .env
```

Fill in the following variables in `.env`:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# API Keys
DEEPGRAM_API_KEY=your_deepgram_api_key
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional: Custom settings
OPENAI_MODEL=gpt-3.5-turbo
ELEVENLABS_VOICE_ID=default_voice_id
```

### 4. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL commands from `supabase-schema.sql` to create the database schema

### 5. Deploy

Deploy to AWS:

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

## API Endpoints

### Authentication
- `POST /auth/signup` - Create new user account
- `POST /auth/login` - User login

### Conversations
- `POST /conversations` - Create new conversation
- `GET /conversations` - List user's conversations
- `GET /conversations/{id}` - Get specific conversation with interactions
- `DELETE /conversations/{id}` - Delete conversation

### Speech Processing
- `POST /speech/transcribe` - Transcribe audio to text
- `POST /speech/generate-response` - Generate AI response and TTS

### Languages
- `GET /languages` - Get available languages

## Request/Response Examples

### Create Conversation
```json
POST /conversations
Headers: { "X-User-Id": "user-uuid" }
Body: {
  "language": "es",
  "title": "Spanish Practice"
}
```

### Transcribe Speech
```json
POST /speech/transcribe
Headers: { "X-User-Id": "user-uuid" }
Body: {
  "audioFile": "base64-encoded-audio",
  "conversationId": "conversation-uuid",
  "language": "es"
}
```

### Generate Response
```json
POST /speech/generate-response
Headers: { "X-User-Id": "user-uuid" }
Body: {
  "text": "Hola, ¿cómo estás?",
  "conversationId": "conversation-uuid",
  "language": "es"
}
```

## Development

### Local Development
```bash
# Install serverless-offline for local testing
npm install -g serverless-offline

# Start local development server
npm run offline
```

### Testing
```bash
npm test
```

## Architecture

The backend follows a two-step speech processing flow:

1. **Transcription**: Audio → Deepgram → Text (saved to DB)
2. **Response Generation**: Text → OpenAI → AI Response → 11Labs → Audio (saved to DB)

This allows the frontend to show transcribed text immediately while the AI processes the response in the background.

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- API keys stored as environment variables
- CORS enabled for frontend integration

## Cost Optimization

- Serverless architecture scales to zero when not in use
- Efficient database queries with proper indexing
- Optimized API calls to external services
