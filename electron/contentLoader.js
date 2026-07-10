/**
 * Content pack loader. Packs are folders of versioned JSON files:
 *   content-packs/<packId>/pack.json + concepts/*.json
 * Loaded once at startup; the app never mutates content.
 */
const fs = require("fs");
const path = require("path");

function loadPacks(packsDir) {
  const packs = [];
  const concepts = new Map();
  if (!fs.existsSync(packsDir)) return { packs, concepts };

  for (const packId of fs.readdirSync(packsDir)) {
    const packPath = path.join(packsDir, packId);
    const manifestPath = path.join(packPath, "pack.json");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const conceptDir = path.join(packPath, "concepts");
    const ids = [];
    for (const f of fs.readdirSync(conceptDir).filter((x) => x.endsWith(".json"))) {
      const c = JSON.parse(fs.readFileSync(path.join(conceptDir, f), "utf8"));
      if (concepts.has(c.id)) throw new Error(`Duplicate concept id across packs: ${c.id}`);
      concepts.set(c.id, c);
      ids.push(c.id);
    }
    packs.push({ ...manifest, id: packId, conceptIds: ids });
  }
  return { packs, concepts };
}

/** Lightweight card for list views (never ship full lesson to list UI). */
function conceptCard(c) {
  return {
    id: c.id, name: c.name, grade: c.grade, strand: c.strand,
    prerequisites: c.prerequisites,
    world: c.gameMission?.world || null,
    character: c.gameMission?.character || null,
  };
}

module.exports = { loadPacks, conceptCard };
