/** Typed mirror of the preload bridge (electron/preload.js). */

export type ConceptStatus = "locked" | "available" | "learning" | "practicing" | "mastered";

export interface Profile { id: number; name: string; role: string; grade: number; age: number | null; avatar: string }
export interface ConceptCard {
  id: string; name: string; grade: number; strand: string;
  prerequisites: string[]; world: string | null; character: string | null;
  status: ConceptStatus;
}

export interface Question {
  id: string; type: "mcq" | "text" | "fraction" | "number";
  q: string; options?: { label: string; mistakeTag?: string }[];
  answer: string; hintLadder: string[]; explain?: string; visual?: unknown;
}

export interface Method { name: string; whenToUse: string; steps: string[]; example: string; visual?: unknown }
export interface Concept {
  id: string; name: string; grade: number; strand: string;
  prerequisites: string[];
  whatIsIt: string; whyNeeded: string; realLifeUses: string[];
  vocabulary: { term: string; meaning: string }[];
  story: { title: string; characters: string[]; text: string; extractedProblem: string; answerInStory: string };
  visual: { component: string; props: Record<string, unknown>; caption: string };
  /** Textbook-style "See it" section: each idea SHOWN with several picture examples. */
  teachingGallery?: { title: string; note?: string; examples: { component: string; props: Record<string, unknown>; caption: string }[] }[];
  standardMethod: { summary: string; steps: string[] };
  mentalMathMethod?: Method;
  abacusMethod?: Method;
  vedicMethod?: Method;
  alternateMethods?: Method[];
  workedExamples: { problem: string; steps: string[]; answer: string; visual?: unknown }[];
  /** The easy method school skips — SHORTCUT drilled with its own guided practice. */
  trickPractice?: { trick: string; intro: string; questions: Question[] };
  commonMistakes: { mistakeTag: string; mistake: string; fix: string }[];
  practice: { easy: Question[]; medium: Question[]; challenge: Question[] };
  masteryCheck: { questions: Question[]; passThreshold: number; requireTeachBack: boolean };
  teachBackPrompt: string;
  revisionCard: { summary: string; reviewAfterDays: number[] };
  gameMission?: { world: string; title: string; brief: string; character?: string };
  realLifeProject?: string;
}

export interface Verdict {
  correct: boolean;
  mistakeTag: string | null;
  explain: string | null;
  mistake: { mistakeTag: string; mistake: string; fix: string } | null;
  hintLadder: string[];
}

export interface MasteryResult {
  status: "mastered" | "needs-practice" | "incomplete";
  score: number | null;
  teachBackPending?: boolean;
}

export interface ClinicItem {
  conceptId: string;
  conceptName: string;
  question: Question;
  tries: number;
  mistake: { mistakeTag: string; mistake: string; fix: string } | null;
}

export interface DashboardConcept {
  id: string; name: string; strand: string; grade: number;
  status: string; masteryScore: number | null;
  attempts: number; correct: number; hints: number;
  nextRevisionAt: string | null;
}

export interface DashboardData {
  profile: { name: string; grade: number };
  concepts: DashboardConcept[];
  badges: { badge_id: string; earned_at: string }[];
  tips: { concept: string; homeTip: string | null; fixes: string[] }[];
}

interface FmBridge {
  getProfile(): Promise<{ id: number; name: string; grade: number }>;
  listConcepts(): Promise<ConceptCard[]>;
  getConcept(id: string): Promise<Concept>;
  lessonStarted(id: string): Promise<unknown>;
  submitAnswer(p: { conceptId: string; questionId: string; context: string; answer: string; hintsUsed: number; question?: Question }): Promise<Verdict>;
  listProfiles(): Promise<Profile[]>;
  activeProfile(): Promise<Profile | null>;
  createProfile(p: { name: string; role: string; grade: number; age: number | null; avatar?: string }): Promise<Profile>;
  setActiveProfile(id: number): Promise<Profile>;
  finishMastery(p: { conceptId: string; teachBackDone: boolean }): Promise<MasteryResult>;
  listBadges(): Promise<{ badge_id: string; earned_at: string }[]>;
  clinicList(): Promise<ClinicItem[]>;
  getDashboard(): Promise<DashboardData>;
  aiStatus(): Promise<AiStatus>;
  aiConfigure(cfg: { enabled?: boolean; provider?: string; apiKey?: string; model?: string }): Promise<AiStatus>;
  aiProviders(): Promise<ProviderInfo[]>;
  aiExplain(p: { conceptId: string; style: "simpler" | "story" | "real-life" }): Promise<AiExplain>;
  aiWhyWrong(p: { conceptId: string; questionId: string; answerGiven: string }): Promise<AiWhyWrong>;
  aiCoach(p: { conceptId: string; questionId: string; answerGiven: string; question?: Question }): Promise<AiCoach>;
  mediaStatus(): Promise<MediaStatus>;
  mediaConfigure(cfg: MediaConfig): Promise<MediaStatus>;
  getCachedImage(p: { conceptId: string; style: string }): Promise<ImageResult>;
  generateImage(p: { conceptId: string; style: string; prompt: string; force?: boolean }): Promise<ImageResult>;
  sarvamSpeak(p: { text: string; speaker?: string; style?: string; pace?: number; temperature?: number }): Promise<TtsResult>;
  mediaClearCache(what?: "all" | "images" | "tts"): Promise<{ ok: boolean; removed: number }>;
  sarvamTranscribe(p: { audioBase64: string; mime?: string; language?: string }): Promise<SttResult>;
  createConcept(p: { topic: string; grade?: number; language?: string; ground?: boolean; verify?: boolean }): Promise<CreateConceptResult>;
  listUserConcepts(): Promise<(ConceptCard & { whatIsIt?: string })[]>;
  deleteConcept(id: string): Promise<{ ok: boolean; reason?: string }>;
}

export interface SttResult { ok: boolean; transcript?: string; language?: string | null; error?: string }
export interface CreateConceptResult { ok: boolean; card?: ConceptCard; reason?: string; grounded?: string | null; verifiedFixed?: number }

export interface MediaStatus {
  image: { enabled: boolean; hasKey: boolean; model: string; size: string; quality: string };
  voice: { provider: string; hasKey: boolean; model: string; speaker: string; language: string; pace: number };
  online: boolean;
}
export interface MediaConfig {
  image?: { enabled?: boolean; apiKey?: string; model?: string; size?: string; quality?: string };
  voice?: { provider?: string; apiKey?: string; model?: string; speaker?: string; language?: string; pace?: number };
}
export interface ImageResult { ok: boolean; cached?: boolean; dataUrl?: string; error?: string }
export interface TtsResult { ok: boolean; mime?: string; audioBase64?: string; error?: string }

/** Poster generation is usable only when enabled + key + online. */
export const imageUsable = (s: MediaStatus | null) => !!s && s.image.enabled && s.image.hasKey && s.online;
export const sarvamUsable = (s: MediaStatus | null) => !!s && s.voice.provider === "sarvam" && s.voice.hasKey && s.online;

export interface AiStatus { enabled: boolean; provider: string; model?: string; effectiveModel?: string; hasKey: boolean; online: boolean }
export interface ProviderInfo { id: string; label: string; kind: string; keyHint?: string; defaultModel: string; models: string[] }
export interface AiExplain { ok: boolean; reason?: string; explanation?: string; example?: string }
export interface AiWhyWrong { ok: boolean; reason?: string; explanation?: string; encouragement?: string }
export interface AiCoach { ok: boolean; reason?: string; question?: string; diagnosis?: string; encouragement?: string }

/** AI features are usable only when all three are true. */
export const aiUsable = (s: AiStatus | null) => !!s && s.enabled && s.hasKey && s.online;

declare global { interface Window { fm: FmBridge } }

/* App-wide cache: concept CONTENT is static for the session, so memoise it and
 * never re-fetch over IPC. (Unlock/mastery status comes from listConcepts, which
 * is intentionally NOT cached so progress stays live.) */
const _bridge: FmBridge = window.fm;
const _conceptCache = new Map<string, Promise<Concept>>();

export const api: FmBridge = {
  ..._bridge,
  getConcept(id: string) {
    let p = _conceptCache.get(id);
    if (!p) {
      p = _bridge.getConcept(id).catch((e) => { _conceptCache.delete(id); throw e; });
      _conceptCache.set(id, p);
    }
    return p;
  },
};
