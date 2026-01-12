import express from "express";
import Resident from "../models/Resident.js";

const router = express.Router();

/** Health check */
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/** Get all residents */
router.get("/", async (req, res) => {
  try {
    const residents = await Resident.find().sort({ updatedAt: -1 });
    res.json(residents);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch residents" });
  }
});

/** Search residents */
router.get("/search", async (req, res) => {
  try {
    const { section, building, door, carPlate, fullName, numeroDeMacaron } = req.query;

    let query = {};

    if (section) query.section = section;
    if (building && door) {
      query.building = building;
      query.door = door;
    }
    if (carPlate) query.carPlate = carPlate;
    if (fullName) query.fullName = { $regex: fullName, $options: "i" };
    if (numeroDeMacaron) query.numeroDeMacaron = numeroDeMacaron;

    const residents = await Resident.find(query);
    res.json(residents);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

/** Create resident */
router.post("/", async (req, res) => {
  try {
    const resident = await Resident.create(req.body);
    res.status(201).json(resident);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Car plate or numero de macaron already exists" });
    }
    res.status(400).json({ error: "Invalid resident data" });
  }
});

/** Update resident */
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

/** Delete resident */
router.delete("/:id", async (req, res) => {
  try {
    await Resident.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Delete failed" });
  }
});

/** Sync residents (bulk insert, ignore duplicates) */
router.post("/sync", async (req, res) => {
  try {
    const residents = req.body;

    if (!Array.isArray(residents)) {
      return res.status(400).json({ error: "Invalid data format" });
    }

    const result = await Resident.insertMany(residents, {
      ordered: false // continue even if duplicates exist
    });

    res.json({
      insertedCount: result.length,
      insertedResidents: result
    });
  } catch (err) {
    // Mongo duplicate key error is expected during sync
    if (err.code === 11000 || err.writeErrors) {
      return res.json({
        insertedCount: err.insertedDocs?.length || 0,
        insertedResidents: err.insertedDocs || []
      });
    }

    res.status(500).json({ error: "Sync failed" });
  }
});

export default router;
