import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  subunit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subunit',
    required: true
  },
  video_url: {
    type: String,
    required: true
  },
  video_transcript: {
    type: String,
    default: ''
  },
  duration_seconds: {
    type: Number,
    default: 120
  },
  title: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for faster lookups
videoSchema.index({ subunit_id: 1 });

export default mongoose.model('Video', videoSchema);