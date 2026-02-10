// ✅ SECURE VERSION - Calls backend instead of OpenAI directly
// NO API KEYS IN FRONTEND!

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Invoke an LLM with a prompt and optional JSON schema for structured output
 * @param {Object} options
 * @param {string} options.prompt - The prompt to send to the LLM
 * @param {Object} options.response_json_schema - Optional JSON schema for structured response
 * @returns {Promise<Object>} The LLM response (parsed JSON if schema provided)
 */
export async function invokeLLM({ prompt, response_json_schema }) {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('🤖 [FRONTEND] Calling backend LLM endpoint...');

    const response = await fetch(`${API_BASE}/api/ai/invoke-llm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        response_json_schema
      })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || errorData.details || 'LLM invocation failed');
    }

    const data = await response.json();
    console.log('✅ [FRONTEND] LLM response received');
    
    // ✅ FIX: Handle both schema and non-schema responses correctly
    if (response_json_schema) {
      // With schema: backend returns parsed JSON directly
      return data;
    } else {
      // Without schema: backend returns { response: "text" }
      // Extract the response field to avoid rendering object as React child
      return data.response || data;
    }
    
  } catch (error) {
    console.error("❌ [FRONTEND] Error invoking LLM:", error);
    throw error;
  }
}

/**
 * Generate an image using DALL-E
 * @param {Object} options
 * @param {string} options.prompt - The image generation prompt
 * @returns {Promise<Object>} Object containing { url, revised_prompt }
 */
export async function generateImage({ prompt }) {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('🎨 [FRONTEND] Calling backend image generation endpoint...');

    const response = await fetch(`${API_BASE}/api/ai/generate-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || errorData.details || 'Image generation failed');
    }

    const data = await response.json();
    console.log('✅ [FRONTEND] Image generated successfully');
    
    // Returns { url: "...", revised_prompt: "..." }
    return data;
    
  } catch (error) {
    console.error("❌ [FRONTEND] Error generating image:", error);
    throw error;
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