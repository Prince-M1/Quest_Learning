import mongoose from 'mongoose';

const learningSessionSchema = new mongoose.Schema({
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
  session_type: {
    type: String,
    enum: ['new_topic', 'review'],
    required: true
  },
  start_time: {
    type: Date,
    required: true
  },
  end_time: {
    type: Date,
    required: true
  },
  total_time_seconds: {
    type: Number,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  review_number: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
learningSessionSchema.index({ student_id: 1, subunit_id: 1 });
learningSessionSchema.index({ student_id: 1, start_time: -1 });

export default mongoose.model('LearningSession', learningSessionSchema);