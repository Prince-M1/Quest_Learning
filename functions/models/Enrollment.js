import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  student_full_name: {
    type: String,
    required: true
  },
  student_email: {
    type: String,
    required: true
  },
  enrollment_date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index to prevent duplicate enrollments
enrollmentSchema.index({ student_id: 1, class_id: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;