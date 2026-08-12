/**
 * Tiny local (offline, no-AI) matcher: given some free text (a question, or a
 * homework problem transcribed from a photo) find a lesson in the concept
 * library whose name shares meaningful words with it.
 *
 * Originally lived inside AskRobo.tsx ("grounding" — if the question matches a
 * lesson, offer to open it). Pulled out here so HomeworkSolver.tsx can reuse
 * the exact same heuristic for "learn this concept" buttons on homework
 * problems, instead of re-implementing word-matching a second time.
 */
import { ConceptCard } from "./api";

const STOP = new Set([
  "what", "is", "a", "an", "the", "how", "do", "i", "we", "of", "to", "in", "and",
  "for", "why", "does", "it", "my", "me", "can", "you", "explain", "tell", "about",
  "with", "are", "this", "that", "which", "bigger", "smaller", "mean", "means",
  "find", "solve", "calculate", "many", "much", "there", "if", "then", "will",
]);

export function matchLesson(q: string, concepts: ConceptCard[]): { id: string; name: string } | null {
  const words = q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  if (!words.length) return null;
  let best: { id: string; name: string } | null = null;
  let bestScore = 0;
  for (const c of concepts) {
    const name = c.name.toLowerCase();
    let s = 0;
    for (const w of words) if (name.includes(w)) s += 1;
    if (s > bestScore) { bestScore = s; best = { id: c.id, name: c.name }; }
  }
  return bestScore >= 1 ? best : null;
}
