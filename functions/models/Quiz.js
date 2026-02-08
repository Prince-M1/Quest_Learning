import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  subunit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subunit',
    required: true
  },
  quiz_type: {
    type: String,
    enum: ['new_topic', 'review'],
    required: true
  },
  title: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for faster lookups
quizSchema.index({ subunit_id: 1 });
quizSchema.index({ quiz_type: 1 });

export default mongoose.model('Quiz', quizSchema);