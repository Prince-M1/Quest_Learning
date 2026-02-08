import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";
import Progress from "../models/Progress.js";

const router = express.Router();

// GET all progress (for TeacherClassDetail page)
router.get('/', async (req, res) => {
  try {
    const db = await connectDB();
    const progress = await db.collection("progress").find({}).toArray();
    
    const formattedProgress = progress.map(p => ({
      ...p,
      id: p._id.toString()
    }));
    
    res.json(formattedProgress);
  } catch (error) {
    console.error('Error fetching all progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// POST bulk create progress records
router.post('/bulk', async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'Records array cannot be empty' });
    }

    // Convert string IDs to ObjectIds
    const formattedRecords = records.map(record => ({
      student_id: new ObjectId(record.student_id),
      subunit_id: new ObjectId(record.subunit_id),
      unit_id: record.unit_id ? new ObjectId(record.unit_id) : undefined,
      curriculum_id: record.curriculum_id ? new ObjectId(record.curriculum_id) : undefined,
      status: record.status || 'not_started',
      attempts: record.attempts || 0
    }));

    const result = await Progress.bulkCreate(formattedRecords);
    res.status(201).json(result);
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all progress for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const db = await connectDB();
    const progress = await db.collection("progress").find({ 
      student_id: new ObjectId(req.params.studentId) 
    }).toArray();
    
    const formattedProgress = progress.map(p => ({
      ...p,
      id: p._id.toString()
    }));
    
    res.json(formattedProgress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get progress for specific subunit
router.get('/student/:studentId/subunit/:subunitId', async (req, res) => {
  try {
    const db = await connectDB();
    const progress = await db.collection("progress").findOne({
      student_id: new ObjectId(req.params.studentId),
      subunit_id: new ObjectId(req.params.subunitId)
    });
    
    if (progress) {
      res.json({ ...progress, id: progress._id.toString() });
    } else {
      res.status(404).json({ error: 'Progress not found' });
    }
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Initialize progress for curriculum
router.post('/initialize', async (req, res) => {
  try {
    const { student_id, curriculum_id } = req.body;
    const db = await connectDB();

    // Get all units for this curriculum
    const units = await db.collection("units").find({ 
      curriculum_id: curriculum_id 
    }).toArray();
    
    if (units.length === 0) {
      return res.json({ message: 'No units found' });
    }

    // Get all subunits for these units
    const unitIds = units.map(u => u._id);
    const subunits = await db.collection("subunits").find({ 
      unit_id: { $in: unitIds } 
    }).toArray();

    if (subunits.length === 0) {
      return res.json({ message: 'No subunits found' });
    }

    // Create progress records for each subunit (skip if already exists)
    let created = 0;
    for (const subunit of subunits) {
      const existingProgress = await db.collection("progress").findOne({
        student_id: new ObjectId(student_id),
        subunit_id: subunit._id
      });

      if (!existingProgress) {
        await db.collection("progress").insertOne({
          student_id: new ObjectId(student_id),
          subunit_id: subunit._id,
          unit_id: subunit.unit_id,
          curriculum_id: curriculum_id,
          status: 'not_started',
          score: null,
          attempts: 0,
          new_session_completed: false,
          review_count: 0,
          learned_status: 'not_learned',
          urgency_status: 'low',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        created++;
      }
    }

    res.json({ 
      message: 'Progress initialized',
      recordsCreated: created
    });
  } catch (error) {
    console.error('Error initializing progress:', error);
    res.status(500).json({ error: 'Failed to initialize progress' });
  }
});

// Update progress for student/subunit
router.put('/student/:studentId/subunit/:subunitId', async (req, res) => {
  try {
    const { 
      status, 
      score, 
      completed_at, 
      new_session_completed, 
      new_session_score, 
      review_count,
      last_review_date,
      last_review_score,
      next_review_date,
      learned_status,
      urgency_status
    } = req.body;
    
    const db = await connectDB();
    const studentId = new ObjectId(req.params.studentId);
    const subunitId = new ObjectId(req.params.subunitId);

    // Find existing progress
    let progress = await db.collection("progress").findOne({
      student_id: studentId,
      subunit_id: subunitId
    });

    // Prepare update data
    const updateData = {
      updatedAt: new Date()
    };

    if (status) updateData.status = status;
    if (score !== undefined) updateData.score = score;
    if (new_session_completed !== undefined) updateData.new_session_completed = new_session_completed;
    if (new_session_score !== undefined) updateData.new_session_score = new_session_score;
    if (review_count !== undefined) updateData.review_count = review_count;
    if (last_review_date) updateData.last_review_date = new Date(last_review_date);
    if (last_review_score !== undefined) updateData.last_review_score = last_review_score;
    if (next_review_date) updateData.next_review_date = new Date(next_review_date);
    if (learned_status) updateData.learned_status = learned_status;
    if (urgency_status) updateData.urgency_status = urgency_status;
    if (completed_at) updateData.last_review_date = new Date(completed_at);
    if (status === 'completed' && !updateData.last_review_date) {
      updateData.last_review_date = new Date();
    }

    if (!progress) {
      // Create new progress record
      const newProgress = {
        student_id: studentId,
        subunit_id: subunitId,
        status: status || 'in_progress',
        attempts: 1,
        new_session_completed: false,
        review_count: 0,
        learned_status: 'not_learned',
        urgency_status: 'low',
        createdAt: new Date(),
        ...updateData
      };
      
      const result = await db.collection("progress").insertOne(newProgress);
      res.json({ ...newProgress, _id: result.insertedId, id: result.insertedId.toString() });
    } else {
      // Update existing progress
      if (status === 'in_progress' || status === 'completed') {
        updateData.attempts = (progress.attempts || 0) + 1;
      }
      
      await db.collection("progress").updateOne(
        { _id: progress._id },
        { $set: updateData }
      );
      
      const updatedProgress = await db.collection("progress").findOne({ _id: progress._id });
      res.json({ ...updatedProgress, id: updatedProgress._id.toString() });
    }
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Update progress by ID (needed for PracticeSession)
router.put('/:id', async (req, res) => {
  try {
    const { 
      learned_status, 
      last_review_date, 
      last_review_score, 
      next_review_date, 
      review_count, 
      urgency_status,
      status,
      new_session_completed,
      new_session_score
    } = req.body;
    
    const db = await connectDB();
    const updateData = {
      updatedAt: new Date()
    };

    if (learned_status !== undefined) updateData.learned_status = learned_status;
    if (last_review_date) updateData.last_review_date = new Date(last_review_date);
    if (last_review_score !== undefined) updateData.last_review_score = last_review_score;
    if (next_review_date) updateData.next_review_date = new Date(next_review_date);
    if (review_count !== undefined) updateData.review_count = review_count;
    if (urgency_status) updateData.urgency_status = urgency_status;
    if (status) updateData.status = status;
    if (new_session_completed !== undefined) updateData.new_session_completed = new_session_completed;
    if (new_session_score !== undefined) updateData.new_session_score = new_session_score;

    await db.collection("progress").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    
    const updatedProgress = await db.collection("progress").findOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    res.json({ ...updatedProgress, id: updatedProgress._id.toString() });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Delete all progress for curriculum
router.delete('/student/:studentId/curriculum/:curriculumId', async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("progress").deleteMany({
      student_id: new ObjectId(req.params.studentId),
      curriculum_id: req.params.curriculumId
    });
    
    res.json({ 
      message: 'Progress deleted',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting progress:', error);
    res.status(500).json({ error: 'Failed to delete progress' });
  }
});

export default router;