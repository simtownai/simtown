import logger from "../../shared/logger"
import client from "../openai/openai"
import { zodResponseFormat } from "openai/helpers/zod.mjs"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { z } from "zod"

type ValidateFunction<T> = (response: T) => { isValid: boolean; error?: string }

export async function generateJson<T>(
  prompt: string,
  responseSchema: z.ZodSchema<T>,
  validate: ValidateFunction<T>,
  model: string = "gpt-4o-mini",
  maxAttempts: number = 5,
  temperature: number = 1.1,
): Promise<T> {
  let attempts = 0
  let messages = [{ role: "system", content: prompt }] as ChatCompletionMessageParam[]

  while (attempts < maxAttempts) {
    attempts++
    const completion = await client.beta.chat.completions.parse({
      model,
      messages,
      response_format: zodResponseFormat(responseSchema, "response"),
      temperature: temperature,
    })

    const parsed = completion.choices[0].message.parsed
    if (!parsed) {
      throw new Error("Couldn't parse the response")
    }

    const validation = validate(parsed)
    if (validation.isValid) {
      return parsed
    } else {
      messages.push({ role: "system", content: validation.error } as ChatCompletionMessageParam)
      logger.error(`(${attempts}/${maxAttempts}) Invalid response: ${validation.error}`)
    }
  }
  throw new Error("Couldn't get a valid response after max attempts")
}
