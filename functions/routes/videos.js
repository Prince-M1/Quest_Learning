import express from 'express';
import jwt from 'jsonwebtoken';
import Video from '../models/Video.js';
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';
import ytdl from '@distube/ytdl-core';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import stream from 'stream';

const router = express.Router();
const pipeline = promisify(stream.pipeline);

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

// ✅ HYBRID TRANSCRIPT FETCHER - Tries captions first, then audio transcription
router.post('/fetch-transcript', async (req, res) => {
  const tempFiles = []; // Track temp files for cleanup

  try {
    const { videoId } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ 
        error: 'videoId is required',
        code: 'MISSING_VIDEO_ID' 
      });
    }

    console.log('📝 [TRANSCRIPT] Starting hybrid fetch for video:', videoId);

    // ═══════════════════════════════════════════════════════
    // STEP 1: Try YouTube Captions (Fast & Free)
    // ═══════════════════════════════════════════════════════
    console.log('📝 [TRANSCRIPT] Attempt 1: YouTube captions...');
    
    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (transcriptData && transcriptData.length > 0) {
        const transcript = transcriptData.map(item => item.text).join(' ');
        const timestampedSegments = transcriptData.map(item => ({
          timestamp: item.offset / 1000,
          text: item.text
        }));

        console.log('✅ [TRANSCRIPT] Success via YouTube captions!');
        
        return res.json({
          transcript,
          timestampedSegments,
          videoId: videoId,
          method: 'youtube_captions'
        });
      }
    } catch (captionError) {
      console.log('⚠️ [TRANSCRIPT] YouTube captions failed:', captionError.message);
      console.log('📝 [TRANSCRIPT] Falling back to audio transcription...');
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: Fallback to Audio Transcription (Whisper)
    // ═══════════════════════════════════════════════════════
    console.log('🎵 [TRANSCRIPT] Attempt 2: Audio transcription with Whisper...');
    
    // Check if video is accessible
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(videoUrl);
    
    if (!info) {
      throw new Error('Could not access video information');
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download audio
    const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);
    tempFiles.push(audioPath);
    
    console.log('⬇️ [TRANSCRIPT] Downloading audio...');
    
    const audioStream = ytdl(videoUrl, {
      quality: 'lowestaudio',
      filter: 'audioonly',
    });

    await pipeline(audioStream, fs.createWriteStream(audioPath));
    
    console.log('✅ [TRANSCRIPT] Audio downloaded');
    console.log('🤖 [TRANSCRIPT] Transcribing with Whisper...');

    // Transcribe with OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'verbose_json', // Get timestamps
      language: 'en'
    });

    console.log('✅ [TRANSCRIPT] Whisper transcription complete!');

    // Format the response
    const transcript = transcription.text;
    
    // Create timestamped segments from Whisper segments if available
    const timestampedSegments = transcription.segments?.map(segment => ({
      timestamp: segment.start,
      text: segment.text.trim()
    })) || [];

    // Clean up temp files
    cleanupTempFiles(tempFiles);

    res.json({
      transcript,
      timestampedSegments,
      videoId: videoId,
      method: 'audio_transcription',
      duration: transcription.duration
    });
    
  } catch (error) {
    console.error('❌ [TRANSCRIPT] All methods failed:', error);
    
    // Clean up temp files on error
    cleanupTempFiles(tempFiles);
    
    // Determine error type and return appropriate response
    if (error.message?.includes('Video unavailable')) {
      return res.status(400).json({
        error: 'This video is unavailable or private',
        code: 'VIDEO_UNAVAILABLE',
        details: error.message
      });
    }
    
    if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
      return res.status(429).json({
        error: 'Rate limited by YouTube. Please try again in a few minutes.',
        code: 'RATE_LIMITED'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch transcript. The video may not be accessible or may have restrictions.',
      code: 'TRANSCRIPT_FAILED',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Helper function to clean up temporary files
function cleanupTempFiles(files) {
  files.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log('🗑️ [CLEANUP] Deleted temp file:', file);
      }
    } catch (err) {
      console.error('⚠️ [CLEANUP] Failed to delete temp file:', file, err);
    }
  });
}

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