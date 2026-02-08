import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";

const router = express.Router({ mergeParams: true });

// GET all units
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const units = await db.collection("units").find({}).toArray();
    
    const formattedUnits = units.map(u => ({
      ...u,
      id: u._id.toString()
    }));
    
    res.json(formattedUnits);
  } catch (err) {
    console.error("GET /units error:", err);
    res.status(500).json({ message: "Failed to fetch units" });
  }
});

// ✅ NEW: GET units by curriculum ID
router.get("/curriculum/:curriculumId", async (req, res) => {
  try {
    const db = await connectDB();
    const { curriculumId } = req.params;
    
    console.log("🔍 Fetching units for curriculum:", curriculumId);
    
    const units = await db.collection("units").find({
      curriculum_id: curriculumId
    }).sort({ unit_order: 1 }).toArray();
    
    console.log(`✅ Found ${units.length} units for curriculum ${curriculumId}`);
    
    const formattedUnits = units.map(u => ({
      ...u,
      id: u._id.toString()
    }));
    
    res.json(formattedUnits);
  } catch (err) {
    console.error("GET units by curriculum error:", err);
    res.status(500).json({ message: "Failed to fetch curriculum units" });
  }
});

// GET single unit by ID
router.get("/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const unit = await db.collection("units").findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.json({ ...unit, id: unit._id.toString() });
  } catch (err) {
    console.error("GET unit error:", err);
    res.status(500).json({ message: "Failed to fetch unit" });
  }
});

// POST new unit
router.post("/", async (req, res) => {
  try {
    const { curriculum_id, unit_name, unit_order, icon } = req.body;

    if (!curriculum_id || !unit_name) {
      return res.status(400).json({ message: "curriculum_id and unit_name are required" });
    }

    const db = await connectDB();

    const newUnit = {
      curriculum_id,
      unit_name,
      unit_order: Number(unit_order) || 1,
      icon: icon || "BookOpen",
      createdAt: new Date(),
    };

    const result = await db.collection("units").insertOne(newUnit);

    console.log("✅ [UNIT] Created with ID:", result.insertedId.toString());

    res.status(201).json({
      ...newUnit,
      _id: result.insertedId,
      id: result.insertedId.toString()
    });
  } catch (err) {
    console.error("POST unit error:", err);
    res.status(500).json({ message: "Failed to create unit", error: err.message });
  }
});

export default router;