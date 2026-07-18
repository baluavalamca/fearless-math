/**
 * Content pack loader. Packs are folders of versioned JSON files:
 *   content-packs/<packId>/pack.json + concepts/*.json
 * Loaded once at startup; the app never mutates content.
 */
const fs = require("fs");
const path = require("path");

function loadPacks(packsDir) {
  const packs = [];
  // Concepts are grouped by language. Translated packs (language "hi"/"te") carry
  // the SAME concept ids as English, so a child's progress/unlock graph — keyed by
  // id — is shared across languages. The duplicate-id guard is scoped PER language.
  const conceptsByLang = new Map(); // lang -> Map(id -> concept)
  if (!fs.existsSync(packsDir)) return { packs, concepts: new Map(), conceptsByLang };

  for (const packId of fs.readdirSync(packsDir)) {
    const packPath = path.join(packsDir, packId);
    const manifestPath = path.join(packPath, "pack.json");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const lang = manifest.language || "en";
    if (!conceptsByLang.has(lang)) conceptsByLang.set(lang, new Map());
    const langConcepts = conceptsByLang.get(lang);
    const conceptDir = path.join(packPath, "concepts");
    const ids = [];
    for (const f of fs.readdirSync(conceptDir).filter((x) => x.endsWith(".json"))) {
      const c = JSON.parse(fs.readFileSync(path.join(conceptDir, f), "utf8"));
      if (langConcepts.has(c.id)) throw new Error(`Duplicate concept id in ${lang} packs: ${c.id}`);
      langConcepts.set(c.id, c);
      ids.push(c.id);
    }
    packs.push({ ...manifest, id: packId, language: lang, conceptIds: ids });
  }
  // `concepts` (the canonical, math-truth map) is always English: the unlock graph,
  // answer checking, and prerequisites resolve against it regardless of display language.
  const concepts = conceptsByLang.get("en") || new Map();
  return { packs, concepts, conceptsByLang };
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
