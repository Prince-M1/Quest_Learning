import mongoose from 'mongoose';

const caseStudyResponseSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  subunit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subunit',
    required: true,
    index: true
  },
  case_study_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CaseStudy',
    required: true
  },
  answer_a: {
    type: String,
    default: ''
  },
  score_a: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  feedback_a: {
    type: String,
    default: ''
  },
  answer_b: {
    type: String,
    default: ''
  },
  score_b: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  feedback_b: {
    type: String,
    default: ''
  },
  answer_c: {
    type: String,
    default: ''
  },
  score_c: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  feedback_c: {
    type: String,
    default: ''
  },
  answer_d: {
    type: String,
    default: ''
  },
  score_d: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  feedback_d: {
    type: String,
    default: ''
  },
  total_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  },
  completed_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for faster lookups
caseStudyResponseSchema.index({ student_id: 1, subunit_id: 1 });

export default mongoose.model('CaseStudyResponse', caseStudyResponseSchema);