import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";

const router = express.Router({ mergeParams: true });

// GET all curricula OR single curriculum by query param
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const { id } = req.query;
    
    // If id query param is provided, fetch single curriculum
    if (id) {
      console.log("🔍 Fetching curriculum by query param id:", id);
      
      const curriculum = await db.collection("curricula").findOne({
        _id: new ObjectId(id),
      });

      if (!curriculum) {
        return res.status(404).json({ message: "Curriculum not found" });
      }

      return res.json({ 
        ...curriculum, 
        id: curriculum._id.toString(),
        created_date: curriculum.createdAt || new Date()
      });
    }
    
    // Otherwise, fetch all curricula
    const curricula = await db.collection("curricula").find({}).toArray();
    
    const formattedCurricula = curricula.map(c => ({
      ...c,
      id: c._id.toString()
    }));
    
    res.json(formattedCurricula);
  } catch (err) {
    console.error("GET /curriculum error:", err);
    res.status(500).json({ message: "Failed to fetch curricula" });
  }
});

// ✅ NEW: GET curricula by teacher ID
router.get("/teacher/:teacherId", async (req, res) => {
  try {
    const db = await connectDB();
    const { teacherId } = req.params;
    
    console.log("🔍 Fetching curricula for teacher:", teacherId);
    
    const curricula = await db.collection("curricula").find({
      teacher_id: teacherId
    }).toArray();
    
    console.log(`✅ Found ${curricula.length} curricula for teacher ${teacherId}`);
    
    const formattedCurricula = curricula.map(c => ({
      ...c,
      id: c._id.toString(),
      created_date: c.createdAt || new Date()
    }));
    
    res.json(formattedCurricula);
  } catch (err) {
    console.error("GET curricula by teacher error:", err);
    res.status(500).json({ message: "Failed to fetch teacher curricula" });
  }
});

// GET single curriculum by ID
router.get("/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const curriculum = await db.collection("curricula").findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!curriculum) {
      return res.status(404).json({ message: "Curriculum not found" });
    }

    res.json({ 
      ...curriculum, 
      id: curriculum._id.toString(),
      created_date: curriculum.createdAt || new Date()
    });
  } catch (err) {
    console.error("GET curriculum error:", err);
    res.status(500).json({ message: "Failed to fetch curriculum" });
  }
});

// POST new curriculum
router.post("/", async (req, res) => {
  console.log("🔍 [CURRICULUM] POST route hit!");
  console.log("🔍 [CURRICULUM] Request body:", req.body);
  
  try {
    const { teacher_id, subject_name, curriculum_difficulty } = req.body;

    if (!teacher_id || !subject_name) {
      return res.status(400).json({ message: "teacher_id and subject_name are required" });
    }

    const db = await connectDB();

    const newCurriculum = {
      teacher_id,
      subject_name,
      curriculum_difficulty: curriculum_difficulty || "High",
      createdAt: new Date(),
    };

    const result = await db.collection("curricula").insertOne(newCurriculum);

    console.log("✅ [CURRICULUM] Created with ID:", result.insertedId.toString());

    res.status(201).json({
      ...newCurriculum,
      _id: result.insertedId,
      id: result.insertedId.toString(),
      created_date: newCurriculum.createdAt
    });
  } catch (err) {
    console.error("POST curriculum error:", err);
    res.status(500).json({ message: "Failed to create curriculum", error: err.message });
  }
});

// DELETE curriculum by ID
router.delete("/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const { id } = req.params;
    
    console.log("🗑️ Deleting curriculum:", id);
    
    // Also delete associated units and subunits
    const units = await db.collection("units").find({ curriculum_id: id }).toArray();
    const unitIds = units.map(u => u._id.toString());
    
    // Delete subunits
    if (unitIds.length > 0) {
      await db.collection("subunits").deleteMany({ 
        unit_id: { $in: unitIds.map(id => new ObjectId(id)) } 
      });
    }
    
    // Delete units
    await db.collection("units").deleteMany({ curriculum_id: id });
    
    // Delete curriculum
    const result = await db.collection("curricula").deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Curriculum not found" });
    }

    console.log("✅ Deleted curriculum and associated data");
    res.json({ message: "Curriculum deleted successfully" });
  } catch (err) {
    console.error("DELETE curriculum error:", err);
    res.status(500).json({ message: "Failed to delete curriculum" });
  }
});

export default router;