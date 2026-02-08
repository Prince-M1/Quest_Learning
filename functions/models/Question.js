import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  quiz_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  question_text: {
    type: String,
    required: true
  },
  choice_1: {
    type: String,
    required: true
  },
  choice_2: {
    type: String,
    required: true
  },
  choice_3: {
    type: String,
    required: true
  },
  choice_4: {
    type: String,
    required: true
  },
  correct_choice: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  question_order: {
    type: Number,
    default: 0
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Index for faster lookups
questionSchema.index({ quiz_id: 1 });
questionSchema.index({ question_order: 1 });

export default mongoose.model('Question', questionSchema);