import mongoose from "mongoose";

const ResidentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    section: { type: String, required: true },
    building: { type: String, required: true },
    door: { type: String, required: true },
    carPlate: { type: String, required: true, unique: true },
    phonePrimary: { type: String, required: true },
    phoneSecondary: { type: String, default: null },

    numeroDeMacaron: { type: String, required: true, unique: true } // NEW REQUIRED FIELD
  },
  { timestamps: true }
);

export default mongoose.model("Resident", ResidentSchema);
