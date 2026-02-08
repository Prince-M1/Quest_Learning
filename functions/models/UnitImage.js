import mongoose from "mongoose";

const unitImageSchema = new mongoose.Schema(
  {
    unit_id: { 
      type: String, 
      required: true
    },
    image_url: { 
      type: String, 
      required: true 
    }
  },
  { 
    timestamps: true 
  }
);

// Ensure one image per unit
unitImageSchema.index({ unit_id: 1 }, { unique: true });

export default mongoose.model("UnitImage", unitImageSchema);