// OpenAI API helper functions (replaces Base44 integrations)

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

function addAdditionalPropertiesToSchema(schema) {
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

export async function InvokeLLM({ prompt, response_json_schema, add_context_from_internet = false }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Please add VITE_OPENAI_API_KEY to your .env file');
  }

  if (add_context_from_internet) {
    console.warn('add_context_from_internet is not supported with OpenAI API. Ignoring this parameter.');
  }

  try {
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: prompt
      }]
    };

    if (response_json_schema) {
      requestBody.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'response',
          strict: true,
          schema: addAdditionalPropertiesToSchema(response_json_schema)
        }
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    if (response_json_schema) {
      return JSON.parse(content);
    }
    
    return content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

export async function GenerateImage({ prompt }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Please add VITE_OPENAI_API_KEY to your .env file');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI Image API Error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    return {
      url: data.data[0].url,
      revised_prompt: data.data[0].revised_prompt
    };
  } catch (error) {
    console.error('OpenAI Image Generation Error:', error);
    throw error;
  }
}

// Placeholder functions for features not yet implemented
export async function SendEmail({ to, subject, body }) {
  console.warn('SendEmail: Use backend API at /api/email/send instead');
  throw new Error('SendEmail is not implemented. Use the backend email API.');
}

export async function SendSMS(params) {
  console.warn('SendSMS: Not implemented');
  throw new Error('SendSMS is not implemented yet.');
}

export async function UploadFile(params) {
  console.warn('UploadFile: Not implemented');
  throw new Error('UploadFile is not implemented yet.');
}

export async function ExtractDataFromUploadedFile(params) {
  console.warn('ExtractDataFromUploadedFile: Not implemented');
  throw new Error('ExtractDataFromUploadedFile is not implemented yet.');
}

// Legacy exports for backward compatibility
export const Core = {
  InvokeLLM,
  GenerateImage,
  SendEmail,
  SendSMS,
  UploadFile,
  ExtractDataFromUploadedFile
};