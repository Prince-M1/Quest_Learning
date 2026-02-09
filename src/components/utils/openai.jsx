import OpenAI from 'openai';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "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";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only if you're calling from browser - otherwise remove this
});

/**
 * Invoke an LLM with a prompt and optional JSON schema for structured output
 * @param {Object} options
 * @param {string} options.prompt - The prompt to send to the LLM
 * @param {Object} options.response_json_schema - Optional JSON schema for structured response
 * @param {boolean} options.add_context_from_internet - Whether to add web context (not implemented)
 * @returns {Promise<Object>} The LLM response
 */
export async function invokeLLM({ prompt, response_json_schema, add_context_from_internet = false }) {
  try {
    const messages = [
      {
        role: "user",
        content: prompt
      }
    ];

    const completionParams = {
      model: "gpt-4o-mini", // or "gpt-4o" for more complex tasks
      messages,
      temperature: 0.7
    };

    // If a JSON schema is provided, use structured output
    if (response_json_schema) {
      completionParams.response_format = { type: "json_object" };
      
      // Add schema instructions to the prompt
      messages[0].content = `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(response_json_schema, null, 2)}`;
    }

    const completion = await openai.chat.completions.create(completionParams);
    
    const content = completion.choices[0].message.content;

    // If we expect JSON, parse it
    if (response_json_schema) {
      return JSON.parse(content);
    }

    return { response: content };
  } catch (error) {
    console.error("Error invoking LLM:", error);
    throw new Error(`LLM invocation failed: ${error.message}`);
  }
}

/**
 * Generate an image using DALL-E
 * @param {Object} options
 * @param {string} options.prompt - The image generation prompt
 * @returns {Promise<Object>} Object containing the image URL
 */
export async function generateImage({ prompt }) {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });

    return {
      url: response.data[0].url,
      revised_prompt: response.data[0].revised_prompt
    };
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error(`Image generation failed: ${error.message}`);
  }
}

// Helper function for backwards compatibility with addAdditionalPropertiesToSchema
export function addAdditionalPropertiesToSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  
  const newSchema = { ...schema };
  
  if (newSchema.type === 'object') {
    if (!('additionalProperties' in newSchema)) {
      newSchema.additionalProperties = false;
    }
    
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