import express from 'express';
import jwt from 'jsonwebtoken';
import { YoutubeTranscript } from 'youtube-transcript';

const router = express.Router();

// Auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Missing Bearer token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Apply auth middleware to all routes
router.use(authMiddleware);

// POST /api/functions/fetchTranscript
// Fetches YouTube video transcript
router.post('/fetchTranscript', async (req, res) => {
  try {
    const { videoId } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ 
        error: 'videoId is required',
        transcript: '',
        success: false
      });
    }

    console.log('📝 [FETCH TRANSCRIPT] Fetching for video:', videoId);
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const fullTranscript = transcript.map(item => item.text).join(' ');
    
    console.log('✅ [FETCH TRANSCRIPT] Success:', fullTranscript.length, 'characters');
    
    res.json({
      transcript: fullTranscript,
      success: true
    });
  } catch (error) {
    console.error('❌ [FETCH TRANSCRIPT] Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch transcript',
      message: error.message,
      transcript: '',
      success: false
    });
  }
});

// POST /api/functions/generateAttentionChecks
// Generates attention check questions for a video using AI
router.post('/generateAttentionChecks', async (req, res) => {
  try {
    const { transcript, videoDuration } = req.body;
    
    if (!transcript || !videoDuration) {
      return res.status(400).json({ 
        error: 'transcript and videoDuration are required',
        attention_checks: [],
        success: false
      });
    }

    // Calculate number of checks (1 per minute)
    const numChecks = Math.floor(videoDuration / 60);
    
    console.log('🔔 [GENERATE CHECKS] Creating', numChecks, 'checks for', videoDuration, 'second video');
    
    if (numChecks === 0) {
      return res.json({ 
        attention_checks: [],
        success: true
      });
    }

    // Generate attention checks using AI (OpenAI)
    const prompt = `Based on this video transcript, create ${numChecks} attention check questions to ensure students are paying attention.

Transcript: ${transcript.substring(0, 4000)}

Video Duration: ${videoDuration} seconds

Requirements:
1. Create ${numChecks} questions evenly spaced throughout the video
2. Each question should test comprehension of specific content
3. Questions should be clear and have 4 multiple choice options (A, B, C, D)
4. One option should be clearly correct
5. Space timestamps evenly (approximately every 60 seconds)

Return ONLY valid JSON with this EXACT structure:
{
  "attention_checks": [
    {
      "timestamp": 60,
      "question": "What was the main point discussed in the introduction?",
      "choice_a": "Option A text",
      "choice_b": "Option B text",
      "choice_c": "Option C text",
      "choice_d": "Option D text",
      "correct_choice": "A",
      "check_order": 1
    }
  ]
}`;

    // Dynamic import to avoid circular dependencies
    const { invokeLLM } = await import('../utils/openai.js');
    
    const response = await invokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          attention_checks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timestamp: { type: "number" },
                question: { type: "string" },
                choice_a: { type: "string" },
                choice_b: { type: "string" },
                choice_c: { type: "string" },
                choice_d: { type: "string" },
                correct_choice: { type: "string", enum: ["A", "B", "C", "D"] },
                check_order: { type: "number" }
              },
              required: ["timestamp", "question", "choice_a", "choice_b", "choice_c", "choice_d", "correct_choice", "check_order"]
            }
          }
        },
        required: ["attention_checks"]
      }
    });

    console.log('✅ [GENERATE CHECKS] Created', response.attention_checks?.length || 0, 'checks');

    res.json({
      attention_checks: response.attention_checks || [],
      success: true
    });
  } catch (error) {
    console.error('❌ [GENERATE CHECKS] Error:', error.message);
    res.status(500).json({
      error: 'Failed to generate attention checks',
      message: error.message,
      attention_checks: [],
      success: false
    });
  }
});

export default router;