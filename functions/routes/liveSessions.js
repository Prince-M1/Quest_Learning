import express from 'express';
import LiveSession from '../models/LiveSession.js';
import LiveSessionParticipant from '../models/LiveSessionParticipant.js';
import LiveSessionResponse from '../models/LiveSessionResponse.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/live-sessions/code/:code
// @desc    Get live session by join code
// @access  Private
router.get('/code/:code', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Finding session with code:', req.params.code.toUpperCase());
    
    const session = await LiveSession.findOne({ 
      session_code: req.params.code.toUpperCase() 
    });

    if (!session) {
      console.log('❌ Session not found');
      return res.status(404).json({ message: 'Session not found' });
    }

    console.log('✅ Session found:', session.session_name);
    res.json(session);
  } catch (error) {
    console.error('❌ Error fetching session by code:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/live-sessions/code/:code/participants
// @desc    Get participants for a session by code
// @access  Public (needed for polling)
router.get('/code/:code/participants', async (req, res) => {
  try {
    console.log('📊 Fetching participants for code:', req.params.code.toUpperCase());
    
    const participants = await LiveSessionParticipant.find({ 
      session_code: req.params.code.toUpperCase() 
    }).sort({ score: -1 });

    console.log('✅ Found participants:', participants.length);
    res.json(participants);
  } catch (error) {
    console.error('❌ Error fetching participants by code:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/live-sessions/code/:code/responses
// @desc    Get responses for a session by code
// @access  Public (needed for polling)
router.get('/code/:code/responses', async (req, res) => {
  try {
    console.log('📊 Fetching responses for code:', req.params.code.toUpperCase());
    
    const responses = await LiveSessionResponse.find({ 
      session_code: req.params.code.toUpperCase() 
    });

    console.log('✅ Found responses:', responses.length);
    res.json(responses);
  } catch (error) {
    console.error('❌ Error fetching responses by code:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/live-sessions
// @desc    Get all sessions for the authenticated teacher
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching sessions for teacher:', req.userId);
    
    const sessions = await LiveSession.find({ 
      teacher_id: req.userId 
    }).sort({ created_at: -1 });

    console.log('✅ Found sessions:', sessions.length);
    res.json(sessions);
  } catch (error) {
    console.error('❌ Error fetching sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/live-sessions/:id
// @desc    Get live session by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('❌ Error fetching session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/live-sessions/:id/participants
// @desc    Get all participants for a session
// @access  Private
router.get('/:id/participants', authenticateToken, async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const participants = await LiveSessionParticipant.find({ 
      session_code: session.session_code 
    }).sort({ score: -1 });

    res.json(participants);
  } catch (error) {
    console.error('❌ Error fetching participants:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/live-sessions/participants
// @desc    Create a new participant
// @access  Private
router.post('/participants', authenticateToken, async (req, res) => {
  try {
    const {
      session_id,
      session_code,
      student_id,
      display_name,
      score,
      current_phase,
      current_question
    } = req.body;

    console.log('🔍 Creating participant:', { session_code, display_name });

    // Validate required fields
    if (!session_code || !display_name) {
      return res.status(400).json({ 
        message: 'Session code and display name are required' 
      });
    }

    // Check if session exists
    const session = await LiveSession.findOne({ session_code: session_code.toUpperCase() });
    if (!session) {
      console.log('❌ Session not found for code:', session_code);
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if participant already exists (only if student_id is provided)
    if (student_id) {
      const existingParticipant = await LiveSessionParticipant.findOne({
        session_code: session_code.toUpperCase(),
        student_id
      });

      if (existingParticipant) {
        console.log('⚠️ Participant already exists');
        return res.status(400).json({ 
          message: 'You have already joined this session',
          participant: existingParticipant
        });
      }
    }

    const participant = new LiveSessionParticipant({
      session_id: session_id || session._id,
      session_code: session_code.toUpperCase(),
      student_id: student_id || null,
      display_name,
      score: score || 0,
      current_phase: current_phase || 'waiting',
      current_question: current_question || 0
    });

    await participant.save();
    console.log('✅ Participant created:', participant._id);

    res.status(201).json(participant);
  } catch (error) {
    console.error('❌ Error creating participant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/live-sessions/participants/:id
// @desc    Get participant by ID
// @access  Private
router.get('/participants/:id', authenticateToken, async (req, res) => {
  try {
    const participant = await LiveSessionParticipant.findById(req.params.id);

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    res.json(participant);
  } catch (error) {
    console.error('❌ Error fetching participant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/live-sessions/participants/:id
// @desc    Update participant
// @access  Private
router.put('/participants/:id', authenticateToken, async (req, res) => {
  try {
    const participant = await LiveSessionParticipant.findById(req.params.id);

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Update fields
    const allowedUpdates = ['score', 'current_phase', 'current_question'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        participant[field] = req.body[field];
      }
    });

    await participant.save();
    console.log('✅ Participant updated:', participant._id);

    res.json(participant);
  } catch (error) {
    console.error('❌ Error updating participant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/live-sessions/responses
// @desc    Save quiz response
// @access  Private
router.post('/responses', authenticateToken, async (req, res) => {
  try {
    const {
      session_id,
      session_code,
      participant_id,
      question_id,
      selected_choice,
      is_correct
    } = req.body;

    const response = new LiveSessionResponse({
      session_id,
      session_code: session_code.toUpperCase(),
      participant_id,
      question_id,
      selected_choice,
      is_correct
    });

    await response.save();
    console.log('✅ Quiz response saved');

    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Error saving response:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/live-sessions
// @desc    Create a new live session (for teachers)
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Received create session request');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔑 User ID from token:', req.userId);
    
    const {
      session_name,
      session_code,
      teacher_id,
      class_id,
      subunit_id,
      subunit_name,
      video_url,
      video_duration,
      attention_checks,
      inquiry_content,
      questions,
      case_study,
      status
    } = req.body;

    console.log('🔍 Extracted fields:', {
      session_name,
      session_code,
      teacher_id,
      has_attention_checks: !!attention_checks,
      has_inquiry_content: !!inquiry_content,
      has_questions: !!questions
    });

    // Validate required fields
    if (!session_name) {
      console.log('❌ Missing session_name');
      return res.status(400).json({ message: 'Session name is required' });
    }
    
    if (!session_code) {
      console.log('❌ Missing session_code');
      return res.status(400).json({ message: 'Session code is required' });
    }
    
    if (!teacher_id) {
      console.log('❌ Missing teacher_id');
      return res.status(400).json({ message: 'Teacher ID is required' });
    }

    console.log('✅ All required fields present');

    // Check if code already exists
    const existingSession = await LiveSession.findOne({ session_code: session_code.toUpperCase() });
    if (existingSession) {
      console.log('❌ Session code already exists:', session_code);
      return res.status(400).json({ 
        message: 'Session code already in use. Please use a different code.' 
      });
    }

    console.log('✅ Session code is unique');

    const session = new LiveSession({
      session_name,
      session_code: session_code.toUpperCase(),
      teacher_id,
      class_id,
      subunit_id,
      subunit_name,
      video_url,
      video_duration,
      attention_checks: attention_checks || [],
      inquiry_content,
      questions: questions || [],
      case_study,
      status: status || 'waiting'
    });

    console.log('💾 Saving session to database...');
    await session.save();
    console.log('✅ Live session created:', session._id);

    res.status(201).json(session);
  } catch (error) {
    console.error('❌ Error creating session:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/live-sessions/:id
// @desc    Update live session (for teachers)
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('📝 UPDATE SESSION REQUEST');
    console.log('Session ID:', req.params.id);
    console.log('Update data:', req.body);
    console.log('Requested by user:', req.userId);

    const session = await LiveSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Update fields
    const allowedUpdates = ['status', 'session_name', 'video_url', 'video_duration', 'attention_checks', 'questions'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        session[field] = req.body[field];
      }
    });

    await session.save();
    console.log('✅ Session updated:', session._id);

    res.json(session);
  } catch (error) {
    console.error('❌ Error updating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/live-sessions/:id
// @desc    Delete live session (for teachers)
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️ ==================== DELETE SESSION REQUEST ====================');
    console.log('Session ID:', req.params.id);
    console.log('Requested by user:', req.userId);
    console.log('Request timestamp:', new Date().toISOString());
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    // Log stack trace to see WHERE this is being called from
    const stack = new Error().stack;
    console.log('📍 CALL STACK:');
    console.log(stack);
    console.log('================================================================');

    const session = await LiveSession.findById(req.params.id);

    if (!session) {
      console.log('❌ Session not found for deletion');
      return res.status(404).json({ message: 'Session not found' });
    }

    console.log('🔍 Session details:', {
      code: session.session_code,
      name: session.session_name,
      teacher_id: session.teacher_id,
      status: session.status
    });

    // Delete all related participants and responses
    const deletedParticipants = await LiveSessionParticipant.deleteMany({ session_code: session.session_code });
    const deletedResponses = await LiveSessionResponse.deleteMany({ session_code: session.session_code });
    
    console.log('🗑️ Deleted participants:', deletedParticipants.deletedCount);
    console.log('🗑️ Deleted responses:', deletedResponses.deletedCount);
    
    await session.deleteOne();

    console.log('✅ Session deleted:', session._id);
    console.log('================================================================');
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;