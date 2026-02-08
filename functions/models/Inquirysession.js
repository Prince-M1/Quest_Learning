import mongoose from 'mongoose';

const inquirySessionSchema = new mongoose.Schema({
  subunit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subunit',
    required: true
  },
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: false
  },
  hook_image_prompt: {
    type: String,
    required: true
  },
  hook_image_url: {
    type: String,
    required: true
  },
  hook_question: {
    type: String,
    required: true
  },
  relevant_past_memories: {
    type: Array,
    default: []
  },
  socratic_system_prompt: {
    type: String,
    required: true
  },
  tutor_first_message: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model('InquirySession', inquirySessionSchema);