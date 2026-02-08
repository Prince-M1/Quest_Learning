import express from 'express';
import jwt from 'jsonwebtoken';
import Class from '../models/Class.js';

const router = express.Router();

// Auth middleware (same as in auth.js)
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
router.use(authMiddleware);

// GET all classes (for students to see their enrolled classes)
router.get('/', async (req, res) => {
  try {
    console.log('📚 [CLASSES] Fetching all classes');
    
    const classes = await Class.find({}).sort({ created_date: -1 });
    
    const formattedClasses = classes.map(cls => ({
      ...cls.toObject(),
      id: cls._id.toString()
    }));
    
    console.log(`✅ [CLASSES] Found ${formattedClasses.length} classes`);
    res.json(formattedClasses);
  } catch (error) {
    console.error('❌ [CLASSES] Error fetching all classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});
// Find class by join code
router.get('/join-code/:code', async (req, res) => {  try {
    const joinCode = req.params.code.toUpperCase().trim();
    
    const classData = await Class.findOne({ join_code: joinCode });
    
    if (!classData) {
      return res.status(404).json({ error: 'Class not found with this join code' });
    }
    
    res.json(classData);
  } catch (error) {
    console.error('Error finding class by join code:', error);
    res.status(500).json({ error: 'Failed to find class' });
  }
});

// GET /api/classes/teacher/:teacherId - Get all classes for a teacher
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    console.log(`📚 [CLASSES] Fetching classes for teacher: ${teacherId}`);
    
    const classes = await Class.find({ teacher_id: teacherId }).sort({ created_date: -1 });
    
    // Format for frontend (add id field)
    const formattedClasses = classes.map(cls => ({
      ...cls.toObject(),
      id: cls._id.toString()
    }));
    
    console.log(`✅ [CLASSES] Found ${formattedClasses.length} classes`);
    res.json(formattedClasses);
  } catch (error) {
    console.error('❌ [CLASSES] Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET /api/classes/:id - Get single class
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📚 [CLASSES] Fetching class: ${id}`);
    
    const classDoc = await Class.findById(id);
    
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Format for frontend
    const formattedClass = {
      ...classDoc.toObject(),
      id: classDoc._id.toString()
    };
    
    console.log(`✅ [CLASSES] Found class: ${formattedClass.class_name}`);
    res.json(formattedClass);
  } catch (error) {
    console.error('❌ [CLASSES] Error fetching class:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// POST /api/classes - Create new class
router.post('/', async (req, res) => {
  try {
    const { class_name, curriculum_id, teacher_id, join_code } = req.body;
    
    console.log(`📚 [CLASSES] Creating class: ${class_name}`);
    
    // Validate required fields
    if (!class_name || !curriculum_id || !teacher_id || !join_code) {
      return res.status(400).json({ 
        error: 'Missing required fields: class_name, curriculum_id, teacher_id, join_code' 
      });
    }
    
    const newClass = new Class({
      class_name,
      curriculum_id,
      teacher_id,
      join_code,
      created_date: new Date()
    });
    
    await newClass.save();
    
    // Format for frontend
    const formattedClass = {
      ...newClass.toObject(),
      id: newClass._id.toString()
    };
    
    console.log(`✅ [CLASSES] Created class: ${formattedClass.class_name} (${formattedClass.id})`);
    res.status(201).json(formattedClass);
  } catch (error) {
    console.error('❌ [CLASSES] Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// DELETE /api/classes/:id - Delete class
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📚 [CLASSES] Deleting class: ${id}`);
    
    const classDoc = await Class.findByIdAndDelete(id);
    
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    console.log(`✅ [CLASSES] Deleted class: ${classDoc.class_name}`);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('❌ [CLASSES] Error deleting class:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// PUT /api/classes/:id - Update class
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`📚 [CLASSES] Updating class: ${id}`);
    
    const classDoc = await Class.findByIdAndUpdate(id, updates, { new: true });
    
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Format for frontend
    const formattedClass = {
      ...classDoc.toObject(),
      id: classDoc._id.toString()
    };
    
    console.log(`✅ [CLASSES] Updated class: ${formattedClass.class_name}`);
    res.json(formattedClass);
  } catch (error) {
    console.error('❌ [CLASSES] Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

export default router;