import express from "express";
import Resident from "../models/Resident.js";

const router = express.Router();

/** Health check (used to wake Render) */
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/** Get all residents (used for initial sync / pull) */
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
      return res.status(400).json({
        error: "Car plate ou numéro de macaron déjà existant"
      });
    }
    res.status(400).json({ error: "Invalid resident data" });
  }
});

/**
 * Sync (push-only helper):
 * Accepts either:
 *   - an array: [ {...}, {...} ]
 *   - or an object: { residents: [ {...} ] }
 * Inserts only new docs (duplicates are ignored thanks to unique indexes).
 * Returns the REAL inserted count even if duplicates exist.
 */
router.post("/sync", async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : req.body?.residents;

    if (!Array.isArray(payload)) {
      return res.status(400).json({ error: "Body must be an array or { residents: [...] }" });
    }

    // Optional: small normalization (safe)
    const residents = payload.map(r => ({
      fullName: (r.fullName ?? "").toString().trim().toLowerCase(),
      section: (r.section ?? "").toString().trim(),
      building: (r.building ?? "").toString().trim(),
      door: (r.door ?? "").toString().trim(),
      carPlate: (r.carPlate ?? "").toString().trim().toLowerCase(),
      phonePrimary: (r.phonePrimary ?? "").toString().trim(),
      phoneSecondary: (r.phoneSecondary ?? "").toString().trim(),
      numeroDeMacaron: (r.numeroDeMacaron ?? "").toString().trim()
    }));

    // Insert many, keep going on duplicate key errors
    const inserted = await Resident.insertMany(residents, { ordered: false });

    return res.status(201).json({
      syncedCount: inserted.length,
      message: "Sync terminé"
    });
  } catch (err) {
    // ✅ Key part: if duplicates happened, Mongo throws but still inserted some docs.
    // For BulkWriteError, the driver gives us nInserted.
    const nInserted =
      err?.result?.nInserted ??
      err?.result?.insertedCount ??
      err?.insertedDocs?.length ??
      0;

    // If we inserted at least 1, treat as success (partial)
    if (nInserted > 0) {
      return res.status(201).json({
        syncedCount: nInserted,
        message: "Sync terminé (avec doublons ignorés)"
      });
    }

    // If nothing inserted and it's duplicate-only, return syncedCount 0 (not an error)
    if (err?.code === 11000) {
      return res.status(200).json({
        syncedCount: 0,
        message: "Aucun nouveau résident à synchroniser"
      });
    }

    return res.status(500).json({ error: "Sync failed" });
  }
});

/** Update resident */
router.put("/:id", async (req, res) => {
  try {
    const resident = await Resident.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!resident) {
      return res.status(404).json({ error: "Resident not found" });
    }

    res.json(resident);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        error: "Car plate ou numéro de macaron déjà existant"
      });
    }
    res.status(400).json({ error: "Update failed" });
  }
});

/** Delete resident (optional) */
router.delete("/:id", async (req, res) => {
  try {
    await Resident.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Delete failed" });
  }
});

export default router;
