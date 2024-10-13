import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default client;