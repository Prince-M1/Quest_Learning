import mongoose from 'mongoose';

const attentionCheckResponseSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attention_check_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttentionCheck',
    required: true
  },
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  subunit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subunit',
    required: true
  },
  selected_choice: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  },
  is_correct: {
    type: Boolean,
    required: true
  },
  session_type: {
    type: String,
    enum: ['new_topic', 'review'],
    default: 'new_topic'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const AttentionCheckResponse = mongoose.model('AttentionCheckResponse', attentionCheckResponseSchema);

export default AttentionCheckResponse;