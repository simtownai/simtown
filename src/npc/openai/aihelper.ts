import { z } from "zod"

export interface FunctionSchema {
  type: string
  function: {
    name: string
    description: string
    parameters: {
      type: string
      properties: { [key: string]: any }
      required: string[]
    }
  }
}

const zodTypeToJsonSchema = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBoolean: "boolean",
  ZodArray: "array",
  ZodObject: "object",
  ZodNull: "null",
  ZodUndefined: "undefined",
  // Add other Zod types as needed
} as const

export function functionToSchema(
  func: (...args: any[]) => any,
  paramSchema: z.ZodObject<any>,
  description: string = "",
): FunctionSchema {
  const parameters: Record<string, any> = {}
  const required = new Set<string>() // Use a Set to ensure uniqueness

  const shape = paramSchema.shape || {}

  Object.entries(shape).forEach(([paramName, zodType]) => {
    parameters[paramName] = getJsonSchemaForZodType(zodType)

    if (!(zodType instanceof z.ZodOptional)) {
      required.add(paramName) // Add to Set
    }
  })

  const result = {
    type: "function",
    function: {
      name: func.name,
      description: description.trim(),
      parameters: {
        type: "object",
        properties: parameters,
        required: Array.from(required), // Convert Set to Array
      },
    },
  }
  return result
}

function getJsonSchemaForZodType(zodType: z.ZodTypeAny): any {
  if (zodType instanceof z.ZodOptional) {
    return getJsonSchemaForZodType(zodType.unwrap())
  }

  // Handle Discriminated Unions
  if (zodType instanceof z.ZodDiscriminatedUnion) {
    const discriminator = zodType.discriminator
    const variants = zodType.options

    const oneOf = variants.map((variant) => {
      const variantSchema = getJsonSchemaForZodType(variant)
      // Ensure the discriminator is a constant in each variant
      if (variant instanceof z.ZodObject) {
        // Use a Set to manage required fields within each variant
        const variantRequired = new Set<string>(variantSchema.required || [])

        return {
          ...variantSchema,
          properties: {
            ...variantSchema.properties,
            [discriminator]: {
              const: variant.shape[discriminator]._def.value,
              type: "string",
            },
          },
          required: Array.from(variantRequired).includes(discriminator)
            ? Array.from(variantRequired)
            : [...Array.from(variantRequired), discriminator],
        }
      }
      return variantSchema
    })

    return {
      oneOf,
      discriminator: {
        propertyName: discriminator,
      },
    }
  }

  const typeKind = zodType._def.typeName as z.ZodFirstPartyTypeKind
  const baseSchema = { type: zodTypeToJsonSchema[typeKind as keyof typeof zodTypeToJsonSchema] || "string" }

  if (zodType instanceof z.ZodArray) {
    return {
      ...baseSchema,
      items: getJsonSchemaForZodType(zodType.element),
    }
  }

  if (zodType instanceof z.ZodObject) {
    const properties: Record<string, any> = {}
    const required = new Set<string>() // Use a Set to ensure uniqueness

    Object.entries(zodType.shape).forEach(([key, value]) => {
      properties[key] = getJsonSchemaForZodType(value as z.ZodTypeAny)
      if (!(value instanceof z.ZodOptional)) {
        required.add(key) // Add to Set
      }
    })

    return {
      ...baseSchema,
      properties,
      required: required.size > 0 ? Array.from(required) : undefined, // Convert Set to Array
    }
  }

  if (zodType instanceof z.ZodEnum) {
    return {
      ...baseSchema,
      enum: zodType._def.values,
    }
  }

  return baseSchema
}
