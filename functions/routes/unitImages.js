import express from 'express';
import jwt from 'jsonwebtoken';
import UnitImage from '../models/UnitImage.js';

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

// GET all unit images
router.get("/", async (req, res) => {
  try {
    console.log('🖼️ [UNIT-IMAGES] Fetching all unit images');
    const images = await UnitImage.find();
    console.log(`✅ [UNIT-IMAGES] Found ${images.length} images`);
    res.json(images);
  } catch (error) {
    console.error('❌ [UNIT-IMAGES] Error fetching images:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET unit image by unit_id
router.get("/unit/:unitId", async (req, res) => {
  try {
    console.log('🖼️ [UNIT-IMAGES] Fetching image for unit:', req.params.unitId);
    const image = await UnitImage.findOne({ unit_id: req.params.unitId });
    
    if (!image) {
      console.log('❌ [UNIT-IMAGES] Image not found');
      return res.status(404).json({ message: "Unit image not found" });
    }
    
    console.log('✅ [UNIT-IMAGES] Found image:', image._id);
    res.json(image);
  } catch (error) {
    console.error('❌ [UNIT-IMAGES] Error fetching image:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST create unit image
router.post("/", async (req, res) => {
  try {
    console.log('🖼️ [UNIT-IMAGES] Creating new unit image');
    const unitImage = new UnitImage(req.body);
    const savedImage = await unitImage.save();
    console.log('✅ [UNIT-IMAGES] Created image:', savedImage._id);
    res.status(201).json(savedImage);
  } catch (error) {
    console.error('❌ [UNIT-IMAGES] Error creating image:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT update unit image
router.put("/:id", async (req, res) => {
  try {
    console.log('🖼️ [UNIT-IMAGES] Updating image:', req.params.id);
    const updatedImage = await UnitImage.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!updatedImage) {
      console.log('❌ [UNIT-IMAGES] Image not found');
      return res.status(404).json({ message: "Unit image not found" });
    }
    
    console.log('✅ [UNIT-IMAGES] Updated image:', updatedImage._id);
    res.json(updatedImage);
  } catch (error) {
    console.error('❌ [UNIT-IMAGES] Error updating image:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE unit image
router.delete("/:id", async (req, res) => {
  try {
    console.log('🖼️ [UNIT-IMAGES] Deleting image:', req.params.id);
    const deletedImage = await UnitImage.findByIdAndDelete(req.params.id);
    
    if (!deletedImage) {
      console.log('❌ [UNIT-IMAGES] Image not found');
      return res.status(404).json({ message: "Unit image not found" });
    }
    
    console.log('✅ [UNIT-IMAGES] Deleted image:', deletedImage._id);
    res.json({ message: "Unit image deleted successfully" });
  } catch (error) {
    console.error('❌ [UNIT-IMAGES] Error deleting image:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;