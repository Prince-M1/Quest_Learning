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
const MAX_VIDEO_DURATION = 900; // 15 minutes (Render-safe)

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

// ✅ HYBRID TRANSCRIPT FETCHER
router.post('/fetch-transcript', async (req, res) => {
  const tempFiles = [];

  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({
        error: 'videoId is required',
        code: 'MISSING_VIDEO_ID'
      });
    }

    console.log('📝 [TRANSCRIPT] Starting hybrid fetch for video:', videoId);

    // ─────────────────────────────────────────
    // STEP 1: Try YouTube captions
    // ─────────────────────────────────────────
    console.log('📝 [TRANSCRIPT] Attempt 1: YouTube captions...');

    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);

      if (transcriptData && transcriptData.length > 0) {
        const transcript = transcriptData.map(item => item.text).join(' ');
        const timestampedSegments = transcriptData.map(item => ({
          timestamp: item.offset / 1000,
          text: item.text
        }));

        console.log('✅ [TRANSCRIPT] Success via YouTube captions');

        return res.json({
          transcript,
          timestampedSegments,
          videoId,
          method: 'youtube_captions'
        });
      }
    } catch (captionError) {
      console.log('⚠️ [TRANSCRIPT] YouTube captions failed:', captionError.message);
      console.log('📝 [TRANSCRIPT] Falling back to audio transcription...');
    }

    // ─────────────────────────────────────────
    // STEP 2: Audio transcription fallback
    // ─────────────────────────────────────────
    console.log('🎵 [TRANSCRIPT] Attempt 2: Audio transcription');

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(videoUrl);

    if (!info) {
      throw new Error('Could not retrieve video info');
    }

    const durationSeconds = parseInt(info.videoDetails.lengthSeconds, 10);
    if (durationSeconds > MAX_VIDEO_DURATION) {
      return res.status(400).json({
        error: 'Video too long for transcription. Please choose a video under 15 minutes.',
        code: 'VIDEO_TOO_LONG',
        duration: durationSeconds
      });
    }

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const audioPath = path.join(tempDir, `${videoId}_audio.webm`);
    tempFiles.push(audioPath);

    console.log('⬇️ [TRANSCRIPT] Downloading audio...');

    const audioStream = ytdl(videoUrl, {
      filter: 'audioonly',
      quality: 'lowestaudio'
    });

    await pipeline(audioStream, fs.createWriteStream(audioPath));

    console.log('✅ [TRANSCRIPT] Audio downloaded');
    console.log('🤖 [TRANSCRIPT] Transcribing with Whisper...');

    const transcription = await Promise.race([
      openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        response_format: 'verbose_json'
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Whisper timeout')), 120000)
      )
    ]);

    const transcript = transcription.text;
    const timestampedSegments = transcription.segments?.map(segment => ({
      timestamp: segment.start,
      text: segment.text.trim()
    })) || [];

    cleanupTempFiles(tempFiles);

    return res.json({
      transcript,
      timestampedSegments,
      videoId,
      method: 'audio_transcription',
      duration: transcription.duration
    });

  } catch (error) {
    console.error('❌ [TRANSCRIPT] Failed:', error);

    cleanupTempFiles(tempFiles);

    if (error.message?.includes('Video unavailable')) {
      return res.status(400).json({
        error: 'This video is unavailable or private',
        code: 'VIDEO_UNAVAILABLE'
      });
    }

    if (error.message?.includes('timeout')) {
      return res.status(504).json({
        error: 'Transcription timed out. Try a shorter video.',
        code: 'TRANSCRIPTION_TIMEOUT'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch transcript',
      code: 'TRANSCRIPT_FAILED',
      details: error.message
    });
  }
});

// Cleanup helper
function cleanupTempFiles(files) {
  files.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log('🗑️ [CLEANUP] Deleted:', file);
      }
    } catch (err) {
      console.error('⚠️ [CLEANUP] Failed:', file, err);
    }
  });
}

// ✅ Generate attention checks
router.post('/generate-attention-checks', async (req, res) => {
  try {
    const { transcript, videoDuration } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `Based on this video transcript, create 5 attention check questions evenly distributed.

Video Duration: ${videoDuration || 120}
Transcript: ${transcript.substring(0, 3000)}

Return valid JSON only.`
      }],
      response_format: { type: "json_object" }
    });

    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (error) {
    console.error('❌ Attention check error:', error);
    res.status(500).json({ error: 'Failed to generate attention checks' });
  }
});

// CRUD ROUTES (UNCHANGED)
router.get('/', async (req, res) => {
  const videos = await Video.find({}).sort({ createdAt: -1 });
  res.json(videos);
});

router.get('/subunit/:subunitId', async (req, res) => {
  const videos = await Video.find({ subunit_id: req.params.subunitId });
  res.json(videos);
});

router.get('/:id', async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json(video);
});

router.post('/', async (req, res) => {
  const video = new Video(req.body);
  await video.save();
  res.status(201).json(video);
});

router.put('/:id', async (req, res) => {
  const video = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json(video);
});

router.delete('/:id', async (req, res) => {
  const video = await Video.findByIdAndDelete(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json({ message: 'Video deleted successfully' });
});

export default router;
