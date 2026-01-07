import express from "express";
import Resident from "../models/Resident.js";

const router = express.Router();

/**
 * Health check (used to wake Render)
 */
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * Get all residents (used for initial sync)
 */
router.get("/", async (req, res) => {
  try {
    const residents = await Resident.find().sort({ updatedAt: -1 });
    res.json(residents);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch residents" });
  }
});

/**
 * Search residents
 * ?section=GH1&building=B&doorNumber=12
 * ?carPlate=12345A
 * ?fullName=John
 */
router.get("/search", async (req, res) => {
  try {
    const { section, building, doorNumber, carPlate, fullName } = req.query;

    let query = {};

    if (section) query.section = section;
    if (building && doorNumber) {
      query.building = building;
      query.doorNumber = doorNumber;
    }
    if (carPlate) query.carPlate = carPlate;
    if (fullName) {
      query.fullName = { $regex: fullName, $options: "i" };
    }

    const residents = await Resident.find(query);
    res.json(residents);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * Create resident
 */
router.post("/", async (req, res) => {
  try {
    const resident = await Resident.create(req.body);
    res.status(201).json(resident);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Car plate already exists" });
    }
    res.status(400).json({ error: "Invalid resident data" });
  }
});

/**
 * Update resident
 */
router.put("/:id", async (req, res) => {
  try {
    const resident = await Resident.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!resident) {
      return res.status(404).json({ error: "Resident not found" });
    }

    res.json(resident);
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
});

/**
 * Delete resident (optional)
 */
router.delete("/:id", async (req, res) => {
  try {
    await Resident.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Delete failed" });
  }
});

export default router;
