import express from 'express';
import jwt from 'jsonwebtoken';
import assignment from '../models/assignment.js';

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
router.use(authMiddleware);

// GET /api/assignments/class/:classId - Get all assignments for a class
router.get('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    console.log(`📝 [ASSIGNMENTS] Fetching assignments for class: ${classId}`);
    
    const assignments = await Assignment.find({ class_id: classId }).sort({ due_date: 1 });
    
    // Format for frontend (add id field)
    const formattedAssignments = assignments.map(assign => ({
      ...assign.toObject(),
      id: assign._id.toString()
    }));
    
    console.log(`✅ [ASSIGNMENTS] Found ${formattedAssignments.length} assignments`);
    res.json(formattedAssignments);
  } catch (error) {
    console.error('❌ [ASSIGNMENTS] Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/assignments/classes - Get assignments for multiple classes
router.post('/classes', async (req, res) => {
  try {
    const { classIds } = req.body;
    console.log(`📝 [ASSIGNMENTS] Fetching assignments for ${classIds.length} classes`);
    
    const assignments = await Assignment.find({ 
      class_id: { $in: classIds } 
    }).sort({ due_date: 1 });
    
    // Format for frontend
    const formattedAssignments = assignments.map(assign => ({
      ...assign.toObject(),
      id: assign._id.toString()
    }));
    
    console.log(`✅ [ASSIGNMENTS] Found ${formattedAssignments.length} assignments`);
    res.json(formattedAssignments);
  } catch (error) {
    console.error('❌ [ASSIGNMENTS] Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/assignments/:id - Get single assignment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📝 [ASSIGNMENTS] Fetching assignment: ${id}`);
    
    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Format for frontend
    const formattedAssignment = {
      ...assignment.toObject(),
      id: assignment._id.toString()
    };
    
    console.log(`✅ [ASSIGNMENTS] Found assignment`);
    res.json(formattedAssignment);
  } catch (error) {
    console.error('❌ [ASSIGNMENTS] Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// POST /api/assignments - Create new assignment
router.post('/', async (req, res) => {
  try {
    const { class_id, subunit_id, due_date } = req.body;
    
    console.log(`📝 [ASSIGNMENTS] Creating assignment for class: ${class_id}`);
    
    // Validate required fields
    if (!class_id || !subunit_id || !due_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: class_id, subunit_id, due_date' 
      });
    }
    
    const newAssignment = new Assignment({
      class_id,
      subunit_id,
      due_date,
      created_date: new Date()
    });
    
    await newAssignment.save();
    
    // Format for frontend
    const formattedAssignment = {
      ...newAssignment.toObject(),
      id: newAssignment._id.toString()
    };
    
    console.log(`✅ [ASSIGNMENTS] Created assignment: ${formattedAssignment.id}`);
    res.status(201).json(formattedAssignment);
  } catch (error) {
    console.error('❌ [ASSIGNMENTS] Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// PUT /api/assignments/:id - Update assignment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`📝 [ASSIGNMENTS] Updating assignment: ${id}`);
    
    const assignment = await Assignment.findByIdAndUpdate(id, updates, { new: true });
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Format for frontend
    const formattedAssignment = {
      ...assignment.toObject(),
      id: assignment._id.toString()
    };
    
    console.log(`✅ [ASSIGNMENTS] Updated assignment`);
    res.json(formattedAssignment);
  } catch (error) {
    console.error('❌ [ASSIGNMENTS] Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// DELETE /api/assignments/:id - Delete assignment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📝 [ASSIGNMENTS] Deleting assignment: ${id}`);
    
    const assignment = await Assignment.findByIdAndDelete(id);
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    console.log(`✅ [ASSIGNMENTS] Deleted assignment`);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('❌ [ASSIGNMENTS] Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

export default router;