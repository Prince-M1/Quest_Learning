import mongoose from 'mongoose';

const liveSessionResponseSchema = new mongoose.Schema({
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
  participant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiveSessionParticipant',
    required: true
  },
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selected_choice: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  is_correct: {
    type: Boolean,
    required: true
  }
}, {
  timestamps: true
});

// Index for faster lookups
liveSessionResponseSchema.index({ session_code: 1 });
liveSessionResponseSchema.index({ participant_id: 1 });
liveSessionResponseSchema.index({ session_id: 1 });

export default mongoose.model('LiveSessionResponse', liveSessionResponseSchema);