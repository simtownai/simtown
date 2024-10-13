// import { FunctionSchema } from './AiBrain';



import { z } from 'zod';

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
  ZodString: 'string',
  ZodNumber: 'number',
  ZodBoolean: 'boolean',
  ZodArray: 'array',
  ZodObject: 'object',
  ZodNull: 'null',
  ZodUndefined: 'undefined',
  // Add other Zod types as needed
} as const;

export function functionToSchema(
    func: (...args: any[]) => any,
    paramSchema: z.ZodObject<any>,
    description: string = ''
): FunctionSchema {
    const parameters: Record<string, any> = {};
    const required: string[] = [];

    const shape = paramSchema.shape || {};

    Object.entries(shape).forEach(([paramName, zodType]) => {
        // @ts-ignore
        parameters[paramName] = getJsonSchemaForZodType(zodType);
    
        if (!(zodType instanceof z.ZodOptional)) {
            required.push(paramName);
        }
    });

  const result = {
    type: 'function',
    function: {
      name: func.name,
      description: description.trim(),
      parameters: {
        type: 'object',
        properties: parameters,
        required: required,
      },
    },
  };
    return result;
}

function getJsonSchemaForZodType(zodType: z.ZodTypeAny): any {
  if (zodType instanceof z.ZodOptional) {
    return getJsonSchemaForZodType(zodType.unwrap());
  }
  const typeKind = zodType._def.typeName as z.ZodFirstPartyTypeKind;
  const baseSchema = { type: zodTypeToJsonSchema[typeKind as keyof typeof zodTypeToJsonSchema] || 'string' };

  if (zodType instanceof z.ZodArray) {
    return {
      ...baseSchema,
      items: getJsonSchemaForZodType(zodType.element),
    };
  }

  if (zodType instanceof z.ZodObject) {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    Object.entries(zodType.shape).forEach(([key, value]) => {
      properties[key] = getJsonSchemaForZodType(value as z.ZodTypeAny);
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    });

    return {
      ...baseSchema,
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (zodType instanceof z.ZodEnum) {
    return {
      ...baseSchema,
      enum: zodType._def.values,
    };
  }

  return baseSchema;
}
