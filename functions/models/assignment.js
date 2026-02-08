import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  class_id: {
    type: String,
    required: true,
    index: true
  },
  subunit_id: {
    type: String,
    required: true,
    index: true
  },
  due_date: {
    type: String,
    required: true
  },
  created_date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add compound index for class and subunit queries
assignmentSchema.index({ class_id: 1, subunit_id: 1 });

export default mongoose.model('Assignment', assignmentSchema);