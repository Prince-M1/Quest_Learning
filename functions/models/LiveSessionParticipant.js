import mongoose from 'mongoose';

const liveSessionParticipantSchema = new mongoose.Schema({
  session_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiveSession',
    required: true
  },
  session_code: {
    type: String,
    required: true,
    uppercase: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Can be null for guest participants
  },
  display_name: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  current_phase: {
    type: String,
    enum: ['waiting', 'inquiry', 'video', 'quiz', 'completed'],
    default: 'waiting'
  },
  current_question: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster lookups
liveSessionParticipantSchema.index({ session_code: 1 });
liveSessionParticipantSchema.index({ session_id: 1 });
liveSessionParticipantSchema.index({ student_id: 1 });
liveSessionParticipantSchema.index({ score: -1 }); // For leaderboard sorting

export default mongoose.model('LiveSessionParticipant', liveSessionParticipantSchema);