import mongoose from 'mongoose';

const questionResponseSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
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
  },
  session_type: {
    type: String,
    enum: ['new_topic', 'review'],
    required: true
  },
  subunit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subunit',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
questionResponseSchema.index({ student_id: 1, quiz_id: 1 });
questionResponseSchema.index({ student_id: 1, subunit_id: 1 });

export default mongoose.model('QuestionResponse', questionResponseSchema);