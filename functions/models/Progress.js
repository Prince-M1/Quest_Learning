import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
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
  unit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  curriculum_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curriculum'
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  completed_at: {
    type: Date
  },
  attempts: {
    type: Number,
    default: 0
  },
  // Additional fields for review tracking
  new_session_completed: {
    type: Boolean,
    default: false
  },
  new_session_score: {
    type: Number,
    min: 0,
    max: 100
  },
  review_count: {
    type: Number,
    default: 0
  },
  last_review_date: {
    type: Date
  },
  last_review_score: {
    type: Number,
    min: 0,
    max: 100
  },
  next_review_date: {
    type: Date
  },
  learned_status: {
    type: String,
    enum: ['not_learned', 'learning', 'learned'],
    default: 'not_learned'
  },
  urgency_status: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  }
}, {
  timestamps: true
});

// Index to prevent duplicate progress records
progressSchema.index({ student_id: 1, subunit_id: 1 }, { unique: true });

// Static method for bulk creation
progressSchema.statics.bulkCreate = async function(records) {
  try {
    // Add default values to each record
    const recordsWithDefaults = records.map(record => ({
      ...record,
      status: record.status || 'not_started',
      attempts: record.attempts || 0,
      new_session_completed: record.new_session_completed || false,
      review_count: record.review_count || 0,
      learned_status: record.learned_status || 'not_learned',
      urgency_status: record.urgency_status || 'low',
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    // Use insertMany with ordered:false to continue on duplicates
    const result = await this.insertMany(recordsWithDefaults, { 
      ordered: false,
      rawResult: true 
    });
    
    return { 
      success: true, 
      insertedCount: result.insertedCount || result.length,
      message: 'Bulk create completed' 
    };
  } catch (error) {
    // If error is duplicate key, some records were still inserted
    if (error.code === 11000) {
      return { 
        success: true, 
        insertedCount: error.result?.nInserted || 0,
        message: 'Bulk create completed (some records already existed)' 
      };
    }
    throw error;
  }
};

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;