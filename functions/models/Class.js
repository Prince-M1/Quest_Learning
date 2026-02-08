import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  class_name: {
    type: String,
    required: true
  },
  curriculum_id: {
    type: String,
    required: true
  },
  teacher_id: {
    type: String,
    required: true,
    index: true
  },
  join_code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  created_date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add index for teacher queries
classSchema.index({ teacher_id: 1, created_date: -1 });

export default mongoose.model('Class', classSchema);