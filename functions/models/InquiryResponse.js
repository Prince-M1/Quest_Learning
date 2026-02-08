import mongoose from 'mongoose';

const inquiryResponseSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subunit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subunit',
    required: true
  },
  inquiry_session_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InquirySession',
    required: true
  },
  initial_guess: {
    type: String,
    required: true
  },
  conversation_history: {
    type: Array,
    default: []
  },
  completed_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('InquiryResponse', inquiryResponseSchema);