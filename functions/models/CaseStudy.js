import mongoose from 'mongoose';

const caseStudySchema = new mongoose.Schema({
  subunit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subunit',
    required: true
  },
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: false
  },
  scenario: {
    type: String,
    required: true
  },
  question_a: {
    type: String,
    required: true
  },
  answer_a: {
    type: String,
    default: ''
  },
  question_b: {
    type: String,
    required: true
  },
  answer_b: {
    type: String,
    default: ''
  },
  question_c: {
    type: String,
    required: true
  },
  answer_c: {
    type: String,
    default: ''
  },
  question_d: {
    type: String,
    required: true
  },
  answer_d: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for faster lookups
caseStudySchema.index({ subunit_id: 1 });

export default mongoose.model('CaseStudy', caseStudySchema);