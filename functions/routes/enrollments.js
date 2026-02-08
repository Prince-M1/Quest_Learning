import express from 'express';
import jwt from 'jsonwebtoken';
import Enrollment from '../models/Enrollment.js';
import Class from '../models/Class.js';

const router = express.Router();

// Auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Missing Bearer token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Apply auth middleware to all routes
// Apply auth middleware to all routes
router.use(authMiddleware);

// NEW: Get enrollment by query params (for TeacherStudentDetail page)
// MUST be FIRST before other routes
router.get('/', async (req, res) => {
  try {
    const { studentId, classId } = req.query;
    
    // If both studentId and classId are provided, find that specific enrollment
    if (studentId && classId) {
      console.log('📚 [ENROLLMENTS] Query params:', { studentId, classId });
      
      const enrollment = await Enrollment.findOne({
        student_id: studentId,
        class_id: classId
      });
      
      if (enrollment) {
        console.log('✅ [ENROLLMENTS] Found enrollment:', enrollment._id);
        return res.json(enrollment);
      } else {
        console.log('❌ [ENROLLMENTS] No enrollment found');
        return res.status(404).json({ error: 'Enrollment not found' });
      }
    }
    
    // Otherwise, return all enrollments (or you can restrict this)
    const enrollments = await Enrollment.find({}).sort({ enrollment_date: -1 });
    res.json(enrollments);
    
  } catch (error) {
    console.error('❌ [ENROLLMENTS] Error fetching enrollment:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment' });
  }
});

// IMPORTANT: More specific routes MUST come BEFORE less specific ones!
// ... rest of your existing routes stay the same
// IMPORTANT: More specific routes MUST come BEFORE less specific ones!

// Check if student is enrolled in a specific class (MUST be before /student/:studentId)
router.get('/student/:studentId/class/:classId', async (req, res) => {
  try {
    console.log('📚 [ENROLLMENTS] Checking enrollment:', req.params.studentId, req.params.classId);
    
    const enrollment = await Enrollment.findOne({
      student_id: req.params.studentId,
      class_id: req.params.classId
    });
    
    if (enrollment) {
      console.log('✅ [ENROLLMENTS] Found enrollment:', enrollment._id);
      res.json(enrollment);
    } else {
      console.log('❌ [ENROLLMENTS] No enrollment found');
      res.status(404).json({ error: 'Enrollment not found' });
    }
  } catch (error) {
    console.error('❌ [ENROLLMENTS] Error checking enrollment:', error);
    res.status(500).json({ error: 'Failed to check enrollment' });
  }
});

// Get all enrollments for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    console.log('📚 [ENROLLMENTS] Fetching enrollments for student:', req.params.studentId);
    
    const enrollments = await Enrollment.find({ student_id: req.params.studentId })
      .populate('class_id')
      .sort({ enrollment_date: -1 });
    
    console.log(`✅ [ENROLLMENTS] Found ${enrollments.length} enrollments`);
    res.json(enrollments);
  } catch (error) {
    console.error('❌ [ENROLLMENTS] Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Get all students in a class
router.get('/class/:classId', async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ class_id: req.params.classId })
      .populate('student_id')
      .sort({ enrollment_date: -1 });
    
    res.json(enrollments);
  } catch (error) {
    console.error('❌ [ENROLLMENTS] Error fetching class enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch class enrollments' });
  }
});

// Create new enrollment (student joins class)
router.post('/', async (req, res) => {
  try {
    const { student_id, class_id, student_full_name, student_email } = req.body;
    
    console.log('📚 [ENROLLMENTS] Creating enrollment:', { student_id, class_id });
    
    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({ student_id, class_id });
    if (existingEnrollment) {
      console.log('⚠️ [ENROLLMENTS] Already enrolled');
      return res.status(400).json({ error: 'Already enrolled in this class' });
    }
    
    // Verify class exists
    const classExists = await Class.findById(class_id);
    if (!classExists) {
      console.log('❌ [ENROLLMENTS] Class not found');
      return res.status(404).json({ error: 'Class not found' });
    }
    
    const enrollment = new Enrollment({
      student_id,
      class_id,
      student_full_name,
      student_email,
      enrollment_date: new Date()
    });
    
    await enrollment.save();
    
    console.log('✅ [ENROLLMENTS] Created enrollment:', enrollment._id);
    res.status(201).json(enrollment);
  } catch (error) {
    console.error('❌ [ENROLLMENTS] Error creating enrollment:', error);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});

// Delete enrollment (student leaves class or teacher removes student)
router.delete('/:enrollmentId', async (req, res) => {
  try {
    const enrollment = await Enrollment.findByIdAndDelete(req.params.enrollmentId);
    
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('❌ [ENROLLMENTS] Error deleting enrollment:', error);
    res.status(500).json({ error: 'Failed to delete enrollment' });
  }
});

export default router;