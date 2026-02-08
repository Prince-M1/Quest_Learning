import mongoose from 'mongoose';

const attentionCheckSchema = new mongoose.Schema({
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  choice_a: {
    type: String,
    required: true
  },
  choice_b: {
    type: String,
    required: true
  },
  choice_c: {
    type: String,
    required: true
  },
  choice_d: {
    type: String,
    required: true
  },
  correct_choice: {
    type: String,
    required: true,
    enum: ['a', 'b', 'c', 'd']
  },
  check_order: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying by video
attentionCheckSchema.index({ video_id: 1, check_order: 1 });

export default mongoose.model('AttentionCheck', attentionCheckSchema);