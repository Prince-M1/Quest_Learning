import express from 'express';
import jwt from 'jsonwebtoken';
import Video from '../models/Video.js';
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

// ✅ Fetch transcript from YouTube
router.post('/fetch-transcript', async (req, res) => {
  try {
    const { videoId } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    console.log('📝 Fetching transcript for video:', videoId);

    // Fetch transcript using youtube-transcript package
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Combine all transcript segments into one string
    const transcript = transcriptData.map(item => item.text).join(' ');
    
    // Also return timestamped segments
    const timestampedSegments = transcriptData.map(item => ({
      timestamp: item.offset / 1000, // Convert to seconds
      text: item.text
    }));

    console.log('✅ Transcript fetched successfully. Length:', transcript.length);

    res.json({
      transcript,
      timestampedSegments
    });
  } catch (error) {
    console.error('❌ Error fetching transcript:', error);
    
    // Handle transcript disabled error specifically
    if (error.message.includes('Transcript is disabled') || 
        error.name === 'YoutubeTranscriptDisabledError') {
      console.log('⚠️ No transcript available for video:', videoId);
      return res.status(400).json({ 
        error: 'This video does not have captions/transcripts enabled. Please select a different video with captions.',
        code: 'NO_TRANSCRIPT'
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      error: 'Failed to fetch transcript',
      message: error.message 
    });
  }
});

// ✅ Generate attention checks using OpenAI
router.post('/generate-attention-checks', async (req, res) => {
  try {
    const { transcript, videoDuration } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    console.log('🔔 Generating attention checks...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `Based on this video transcript, create 5 attention check questions evenly distributed throughout the video duration.

Video Duration: ${videoDuration || 120} seconds
Transcript: ${transcript.substring(0, 3000)}

For each question:
- Create a timestamp (in seconds) evenly spaced through the video
- Write a multiple choice question about content BEFORE that timestamp
- Provide 4 answer choices (A, B, C, D)
- Indicate which choice is correct (1-4)

Return ONLY valid JSON in this exact format:
{
  "attention_checks": [
    {
      "timestamp": 30,
      "question": "What concept was just explained?",
      "choice_a": "Option A",
      "choice_b": "Option B", 
      "choice_c": "Option C",
      "choice_d": "Option D",
      "correct_choice": 1,
      "check_order": 1
    }
  ]
}`
      }],
      response_format: { type: "json_object" }
    });

    const parsedResponse = JSON.parse(completion.choices[0].message.content);

    console.log('✅ Generated', parsedResponse.attention_checks?.length || 0, 'attention checks');

    res.json(parsedResponse);
  } catch (error) {
    console.error('❌ Error generating attention checks:', error);
    res.status(500).json({ 
      error: 'Failed to generate attention checks',
      message: error.message 
    });
  }
});

// Get all videos
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find({}).sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get videos by subunit_id
router.get('/subunit/:subunitId', async (req, res) => {
  try {
    const videos = await Video.find({
      subunit_id: req.params.subunitId
    });
    
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get video by ID
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Create video
router.post('/', async (req, res) => {
  try {
    const video = new Video(req.body);
    await video.save();
    
    res.status(201).json(video);
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Failed to create video' });
  }
});

// Update video
router.put('/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// Delete video
router.delete('/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

export default router;