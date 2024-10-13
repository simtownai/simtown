import dotenv from "dotenv"
import OpenAI from "openai"

// Load environment variables from .env file
dotenv.config()

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default client
