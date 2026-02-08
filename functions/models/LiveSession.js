import mongoose from 'mongoose';

const attentionCheckSchema = new mongoose.Schema({
  timestamp: {
    type: Number,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  choice_a: String,
  choice_b: String,
  choice_c: String,
  choice_d: String,
  correct_choice: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  }
}, { _id: false });

const inquiryContentSchema = new mongoose.Schema({
  hook_question: String,
  hook_image_url: String
}, { _id: false });

const questionSchema = new mongoose.Schema({
  question_text: {
    type: String,
    required: true
  },
  choice_1: String,
  choice_2: String,
  choice_3: String,
  choice_4: String,
  correct_choice: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  }
});

const liveSessionSchema = new mongoose.Schema({
  session_name: {
    type: String,
    required: true
  },
  session_code: {
    type: String,
    required: true,
    uppercase: true,
    minlength: 6,
    maxlength: 6
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  subunit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subunit'
  },
  subunit_name: String,
  video_url: String,
  video_duration: Number, // in seconds
  attention_checks: [attentionCheckSchema],
  inquiry_content: inquiryContentSchema,
  questions: [questionSchema],
  status: {
    type: String,
    enum: ['waiting', 'active', 'ended'],
    default: 'waiting'
  }
}, {
  timestamps: true
});

// Index for faster lookups
liveSessionSchema.index({ session_code: 1 }, { unique: true });
liveSessionSchema.index({ teacher_id: 1 });
liveSessionSchema.index({ status: 1 });

export default mongoose.model('LiveSession', liveSessionSchema);