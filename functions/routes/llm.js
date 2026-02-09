import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Invoke LLM (Claude)
router.post('/invoke', authMiddleware, async (req, res) => {
  try {
    const { prompt, response_json_schema, add_context_from_internet = false } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🤖 [LLM] Invoking Claude...');
    
    // Build the message
    const messages = [{ role: 'user', content: prompt }];
    
    // If JSON schema is provided, use structured output
    let response;
    if (response_json_schema) {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages,
        tools: [{
          name: 'generate_response',
          description: 'Generate a structured response',
          input_schema: response_json_schema
        }],
        tool_choice: { type: 'tool', name: 'generate_response' }
      });

      // Extract the tool use result
      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (toolUse) {
        console.log('✅ [LLM] Structured response generated');
        return res.json(toolUse.input);
      }
    } else {
      // Regular text response
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages
      });

      const textContent = response.content.find(block => block.type === 'text');
      if (textContent) {
        console.log('✅ [LLM] Text response generated');
        return res.json({ response: textContent.text });
      }
    }

    return res.status(500).json({ error: 'No valid response from LLM' });

  } catch (error) {
    console.error('❌ [LLM] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;