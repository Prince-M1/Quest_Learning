import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema({
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
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  correct_answers: {
    type: Number,
    required: true
  },
  total_questions: {
    type: Number,
    required: true
  },
  completed_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
quizResultSchema.index({ student_id: 1, quiz_id: 1 });
quizResultSchema.index({ student_id: 1, completed_at: -1 });

export default mongoose.model('QuizResult', quizResultSchema);