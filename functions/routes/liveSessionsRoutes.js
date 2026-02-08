const express = require('express');
const router = express.Router();
const LiveSession = require('../models/LiveSession');
const LiveSessionParticipant = require('../models/LiveSessionParticipant');
const LiveSessionResponse = require('../models/LiveSessionResponse');
const { protect } = require('../middleware/auth');

// @route   GET /api/live-sessions/code/:code
// @desc    Get live session by join code
// @access  Private
router.get('/code/:code', protect, async (req, res) => {
  try {
    const session = await LiveSession.findOne({ 
      session_code: req.params.code.toUpperCase() 
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session by code:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/live-sessions/:id
// @desc    Get live session by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/live-sessions/:id/participants
// @desc    Get all participants for a session
// @access  Private
router.get('/:id/participants', protect, async (req, res) => {
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
    console.error('Error fetching participants:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/live-sessions/participants
// @desc    Create a new participant
// @access  Private
router.post('/participants', protect, async (req, res) => {
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

    // Validate required fields
    if (!session_code || !display_name) {
      return res.status(400).json({ 
        message: 'Session code and display name are required' 
      });
    }

    // Check if session exists
    const session = await LiveSession.findOne({ session_code });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if participant already exists
    const existingParticipant = await LiveSessionParticipant.findOne({
      session_code,
      student_id
    });

    if (existingParticipant) {
      return res.status(400).json({ 
        message: 'You have already joined this session',
        participant: existingParticipant
      });
    }

    const participant = new LiveSessionParticipant({
      session_id: session_id || session._id,
      session_code,
      student_id: student_id || null,
      display_name,
      score: score || 0,
      current_phase: current_phase || 'waiting',
      current_question: current_question || 0
    });

    await participant.save();

    res.status(201).json(participant);
  } catch (error) {
    console.error('Error creating participant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/live-sessions/participants/:id
// @desc    Get participant by ID
// @access  Private
router.get('/participants/:id', protect, async (req, res) => {
  try {
    const participant = await LiveSessionParticipant.findById(req.params.id);

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    res.json(participant);
  } catch (error) {
    console.error('Error fetching participant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/live-sessions/participants/:id
// @desc    Update participant
// @access  Private
router.put('/participants/:id', protect, async (req, res) => {
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

    res.json(participant);
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/live-sessions/responses
// @desc    Save quiz response
// @access  Private
router.post('/responses', protect, async (req, res) => {
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
      session_code,
      participant_id,
      question_id,
      selected_choice,
      is_correct
    });

    await response.save();

    res.status(201).json(response);
  } catch (error) {
    console.error('Error saving response:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/live-sessions
// @desc    Create a new live session (for teachers)
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
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
      status
    } = req.body;

    // Validate required fields
    if (!session_name || !session_code || !teacher_id) {
      return res.status(400).json({ 
        message: 'Session name, code, and teacher ID are required' 
      });
    }

    // Check if code already exists
    const existingSession = await LiveSession.findOne({ session_code });
    if (existingSession) {
      return res.status(400).json({ 
        message: 'Session code already in use. Please use a different code.' 
      });
    }

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
      status: status || 'waiting'
    });

    await session.save();

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/live-sessions/:id
// @desc    Update live session (for teachers)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
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

    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/live-sessions/:id
// @desc    Delete live session (for teachers)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Delete all related participants and responses
    await LiveSessionParticipant.deleteMany({ session_code: session.session_code });
    await LiveSessionResponse.deleteMany({ session_code: session.session_code });
    await session.deleteOne();

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;