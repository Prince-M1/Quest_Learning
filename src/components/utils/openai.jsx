const OPENAI_API_KEY = "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";

// Recursively add additionalProperties: false and required arrays to all objects in the schema
function addAdditionalPropertiesToSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  
  const newSchema = { ...schema };
  
  if (newSchema.type === 'object') {
    if (!('additionalProperties' in newSchema)) {
      newSchema.additionalProperties = false;
    }
    
    // Add required array with all property keys if properties exist
    if (newSchema.properties && !newSchema.required) {
      newSchema.required = Object.keys(newSchema.properties);
    }
  }
  
  if (newSchema.properties) {
    newSchema.properties = Object.fromEntries(
      Object.entries(newSchema.properties).map(([key, value]) => [
        key,
        addAdditionalPropertiesToSchema(value)
      ])
    );
  }
  
  if (newSchema.items) {
    newSchema.items = addAdditionalPropertiesToSchema(newSchema.items);
  }
  
  return newSchema;
}

export async function invokeLLM({ prompt, response_json_schema, add_context_from_internet = false }) {
  const { base44 } = await import("@/api/base44Client");
  
  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema,
    add_context_from_internet
  });

  return result;
}

export async function generateImage({ prompt }) {
  const { base44 } = await import("@/api/base44Client");
  
  const result = await base44.integrations.Core.GenerateImage({ prompt });
  
  return result;
}