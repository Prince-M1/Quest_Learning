import express from 'express';
import OpenAI from 'openai';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Initialize OpenAI with your API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ EXISTING: Generate complete live session content
router.post('/generate-session', authenticateToken, async (req, res) => {
  try {
    const {
      sessionName,
      subunitName,
      videoUrl,
      questionDifficulty,
      questionCount
    } = req.body;

    console.log('🤖 Generating AI content for session:', sessionName);

    const difficultyInstructions = questionDifficulty === "easy"
      ? `All ${questionCount} questions should be EASY difficulty (basic recall and understanding).`
      : questionDifficulty === "medium"
      ? `All ${questionCount} questions should be MEDIUM difficulty (application and analysis).`
      : questionDifficulty === "hard"
      ? `All ${questionCount} questions should be HARD difficulty (synthesis, evaluation, complex scenarios).`
      : questionCount === 10
      ? `Create 4 EASY, 4 MEDIUM, and 2 HARD questions.`
      : questionCount === 20
      ? `Create 8 EASY, 8 MEDIUM, and 4 HARD questions.`
      : `Create 12 EASY, 12 MEDIUM, and 6 HARD questions.`;

    // Generate all content in parallel
    const [questionsResponse, attentionChecksResponse, caseStudyResponse, inquiryResponse] = await Promise.all([
      // Generate quiz questions
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates educational content. Always respond with valid JSON only, no additional text."
          },
          {
            role: "user",
            content: `Create ${questionCount} multiple-choice quiz questions for a live learning session about "${subunitName}".

${difficultyInstructions}

EASY questions: Direct recall of facts, basic conceptual understanding, simple identification
MEDIUM questions: Application to new situations, comparison/contrast, cause-and-effect
HARD questions: Multi-step reasoning, evaluation/justification, complex real-world applications

Return JSON with this structure:
{
  "questions": [
    {
      "id": "q1",
      "question_text": "Question text here?",
      "choice_1": "First option",
      "choice_2": "Second option",
      "choice_3": "Third option",
      "choice_4": "Fourth option",
      "correct_choice": 1,
      "question_order": 1,
      "difficulty": "${questionDifficulty === 'mixed' ? 'easy or medium or hard as appropriate' : questionDifficulty}"
    }
  ]
}

Make questions engaging and suitable for a competitive live session.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      }),

      // Generate attention checks
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates educational content. Always respond with valid JSON only, no additional text."
          },
          {
            role: "user",
            content: `Generate multiple-choice attention check questions for a 600 second video about "${subunitName}".

Instructions:
1. Place ONE attention check approximately every 60 seconds of video (so a 10-min video = ~10 checks)
2. Start first check around 60 seconds, then space them evenly throughout
3. Create questions that test key concepts related to the topic
4. Each question must test comprehension of key concepts
5. Questions should be recall or comprehension-based
6. Provide 4 multiple-choice options with exactly one correct answer

Return JSON with timestamps and complete multiple-choice questions:
{
  "checks": [
    {
      "timestamp": 65,
      "question": "What is being explained right now?",
      "choice_a": "Option 1",
      "choice_b": "Option 2",
      "choice_c": "Option 3",
      "choice_d": "Option 4",
      "correct_choice": "A"
    }
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      }),

      // Generate case study
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates educational content. Always respond with valid JSON only, no additional text."
          },
          {
            role: "user",
            content: `Create a case study scenario with one free-response question for "${subunitName}".

Return JSON:
{
  "scenario": "A realistic scenario description...",
  "question": "A thought-provoking question about the scenario..."
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      }),

      // Generate inquiry content
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates educational content. Always respond with valid JSON only, no additional text."
          },
          {
            role: "user",
            content: `Create an inquiry-based learning introduction for "${subunitName}".

This is the FIRST step before students watch the video. The goal is to spark curiosity and activate prior knowledge.

Generate:
1. A DALL-E 3 prompt for a curiosity-inducing image (no text in image)
2. A hook question that makes students wonder about the topic
3. A Socratic tutor system prompt that guides students through inquiry
4. The tutor's first welcoming message

Return JSON:
{
  "hook_image_prompt": "Detailed DALL-E 3 prompt for an engaging image...",
  "hook_question": "What do you think causes...?",
  "socratic_system_prompt": "You are a Socratic tutor helping students explore ${subunitName}. Guide them with questions, never give direct answers...",
  "tutor_first_message": "Welcome! Let's think about this together..."
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    ]);

    // Parse responses
    const questionsData = JSON.parse(questionsResponse.choices[0].message.content);
    const attentionChecksData = JSON.parse(attentionChecksResponse.choices[0].message.content);
    const caseStudyData = JSON.parse(caseStudyResponse.choices[0].message.content);
    const inquiryData = JSON.parse(inquiryResponse.choices[0].message.content);

    // Generate hook image with DALL-E
    console.log('🎨 Generating hook image...');
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: inquiryData.hook_image_prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });

    const hookImageUrl = imageResponse.data[0].url;

    // Return all generated content
    res.json({
      questions: questionsData.questions || [],
      attentionChecks: attentionChecksData.checks || [],
      caseStudy: caseStudyData,
      inquiry: {
        ...inquiryData,
        hook_image_url: hookImageUrl
      }
    });

  } catch (error) {
    console.error('❌ AI Generation Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate session content',
      details: error.message 
    });
  }
});

// ✅ NEW: General purpose LLM invocation for curriculum generation
router.post('/invoke-llm', authenticateToken, async (req, res) => {
  try {
    const { prompt, response_json_schema } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    console.log('🤖 [AI] Invoking LLM...');

    const messages = [
      {
        role: "user",
        content: prompt
      }
    ];

    const completionParams = {
      model: "gpt-4o-mini",
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
      const parsed = JSON.parse(content);
      console.log('✅ [AI] LLM invocation successful (JSON)');
      return res.json(parsed);
    }

    console.log('✅ [AI] LLM invocation successful (text)');
    res.json({ response: content });

  } catch (error) {
    console.error('❌ [AI] LLM Error:', error);
    res.status(500).json({ 
      error: 'LLM invocation failed',
      details: error.message 
    });
  }
});

// ✅ NEW: Image generation endpoint
router.post('/generate-image', authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    console.log('🎨 [AI] Generating image...');

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024",
      quality: "standard"
    });

    console.log('✅ [AI] Image generated successfully');

    res.json({
      url: response.data[0].url,
      revised_prompt: response.data[0].revised_prompt
    });

  } catch (error) {
    console.error('❌ [AI] Image generation error:', error);
    res.status(500).json({ 
      error: 'Image generation failed',
      details: error.message 
    });
  }
});

export default router;