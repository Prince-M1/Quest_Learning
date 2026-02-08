import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";

const router = express.Router({ mergeParams: true });

// GET all subunits
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const subunits = await db.collection("subunits").find({}).toArray();
    
    const formattedSubunits = subunits.map(s => ({
      ...s,
      id: s._id.toString()
    }));
    
    res.json(formattedSubunits);
  } catch (err) {
    console.error("GET /subunits error:", err);
    res.status(500).json({ message: "Failed to fetch subunits" });
  }
});

// ✅ NEW: GET subunits by unit ID
router.get("/unit/:unitId", async (req, res) => {
  try {
    const db = await connectDB();
    const { unitId } = req.params;
    
    console.log("🔍 Fetching subunits for unit:", unitId);
    
    // Try both ObjectId and string matching for flexibility
    let subunits = await db.collection("subunits").find({
      unit_id: new ObjectId(unitId)
    }).sort({ subunit_order: 1 }).toArray();
    
    // If no results, try string matching (in case unit_id was stored as string)
    if (subunits.length === 0) {
      subunits = await db.collection("subunits").find({
        unit_id: unitId
      }).sort({ subunit_order: 1 }).toArray();
    }
    
    console.log(`✅ Found ${subunits.length} subunits for unit ${unitId}`);
    
    const formattedSubunits = subunits.map(s => ({
      ...s,
      id: s._id.toString()
    }));
    
    res.json(formattedSubunits);
  } catch (err) {
    console.error("GET subunits by unit error:", err);
    res.status(500).json({ message: "Failed to fetch unit subunits" });
  }
});

// GET single subunit by ID
router.get("/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const subunit = await db.collection("subunits").findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!subunit) {
      return res.status(404).json({ message: "Subunit not found" });
    }

    res.json({ ...subunit, id: subunit._id.toString() });
  } catch (err) {
    console.error("GET subunit error:", err);
    res.status(500).json({ message: "Failed to fetch subunit" });
  }
});

// POST new subunit
router.post("/", async (req, res) => {
  try {
    const { subunit_name, learning_standard, unit_id, subunit_order } = req.body;

    if (!subunit_name || !unit_id) {
      return res.status(400).json({ message: "subunit_name and unit_id are required" });
    }

    const db = await connectDB();

    const newSubunit = {
      subunit_name,
      learning_standard: learning_standard || subunit_name,
      unit_id: new ObjectId(unit_id), 
      subunit_order: Number(subunit_order) || 1,
      createdAt: new Date(),
    };

    const result = await db.collection("subunits").insertOne(newSubunit);

    console.log("✅ [SUBUNIT] Created with ID:", result.insertedId.toString());

    res.status(201).json({
      ...newSubunit,
      _id: result.insertedId,
      id: result.insertedId.toString()
    });
  } catch (err) {
    console.error("POST subunit error:", err);
    res.status(500).json({ message: "Failed to create subunit", error: err.message });
  }
});

export default router;