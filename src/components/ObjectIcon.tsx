/**
 * ObjectIcon — a reusable library of flat, kid-friendly SVG icons.
 * Crisp and identical on every machine (unlike emoji). Referenced by name
 * from ObjectRow and the practice generators so objects (apple, duck, car…)
 * are always SEEN as a real picture.
 */
import { ReactElement } from "react";

const V = "0 0 100 100";
const ICONS: Record<string, ReactElement> = {
  apple: (<><path d="M50 30c-14-14-40-4-34 18 4 16 18 30 34 30s30-14 34-30c6-22-20-32-34-18z" fill="#e2352f"/><rect x="47" y="16" width="6" height="16" rx="3" fill="#7a4a20"/><path d="M53 22c8-8 18-6 18-6s-2 14-14 14z" fill="#3fae4a"/></>),
  banana: (<path d="M22 40c6 34 42 42 60 22-8 6-30 2-40-16C34 32 26 30 22 40z" fill="#f6c531" stroke="#caa11f" strokeWidth="3"/>),
  mango: (<><path d="M40 22c26-8 44 14 36 40-6 20-34 24-46 8-12-18-6-42 10-48z" fill="#f39a2b"/><path d="M56 24c8-6 16-2 16-2s-6 10-16 8z" fill="#3fae4a"/></>),
  grapes: (<><g fill="#7c3aed">{[[42,44],[58,44],[50,56],[38,58],[62,58],[50,70],[42,68],[58,68]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="9"/>)}</g><path d="M48 34c4-8 12-8 12-8" stroke="#3fae4a" strokeWidth="4" fill="none"/></>),
  duck: (<><ellipse cx="46" cy="60" rx="30" ry="20" fill="#fbd34d"/><circle cx="70" cy="44" r="14" fill="#fbd34d"/><path d="M82 44l14-3-14-5z" fill="#f39a2b"/><circle cx="72" cy="40" r="3" fill="#333"/></>),
  fish: (<><ellipse cx="46" cy="50" rx="30" ry="18" fill="#f39a2b"/><path d="M74 50l22-14v28z" fill="#e07a1c"/><circle cx="34" cy="46" r="4" fill="#fff"/><circle cx="34" cy="46" r="2" fill="#333"/></>),
  cat: (<><path d="M28 30l10 16h24l10-16-4 24H32z" fill="#9aa0a6"/><circle cx="50" cy="58" r="26" fill="#9aa0a6"/><circle cx="40" cy="54" r="4" fill="#222"/><circle cx="60" cy="54" r="4" fill="#222"/><path d="M46 66h8l-4 5z" fill="#e06b8b"/></>),
  bird: (<><circle cx="50" cy="52" r="26" fill="#57b5f0"/><path d="M70 50l16-4-14-8z" fill="#f39a2b"/><circle cx="58" cy="46" r="4" fill="#fff"/><circle cx="59" cy="46" r="2" fill="#222"/></>),
  elephant: (<><ellipse cx="52" cy="52" rx="30" ry="26" fill="#9aa0a6"/><ellipse cx="26" cy="46" rx="14" ry="16" fill="#8a9096"/><path d="M28 60c-6 10-2 22 6 24 6 2 8-6 4-10-4-4-2-10 2-12z" fill="#9aa0a6"/><circle cx="52" cy="46" r="4" fill="#333"/></>),
  butterfly: (<><rect x="47" y="30" width="6" height="42" rx="3" fill="#5b3b1a"/><path d="M50 40C34 20 14 30 20 46s26 10 30 6z" fill="#ef5aa0"/><path d="M50 40C66 20 86 30 80 46s-26 10-30 6z" fill="#57b5f0"/><path d="M50 54C36 50 22 58 26 70s22 6 24-2z" fill="#f6c531"/><path d="M50 54c14-4 28 4 24 16s-22 6-24-2z" fill="#3fae4a"/></>),
  car: (<><path d="M14 62h72v12H14z" fill="#2f7bd6"/><path d="M26 62l8-16h32l10 16z" fill="#57b5f0"/><rect x="34" y="50" width="14" height="12" fill="#cde6ff"/><rect x="52" y="50" width="14" height="12" fill="#cde6ff"/><circle cx="30" cy="76" r="9" fill="#333"/><circle cx="70" cy="76" r="9" fill="#333"/></>),
  bus: (<><rect x="16" y="30" width="68" height="42" rx="6" fill="#f0a132"/><g fill="#cde6ff">{[24,40,56].map((x,i)=><rect key={i} x={x} y="38" width="12" height="12"/>)}</g><rect x="70" y="38" width="8" height="24" fill="#cde6ff"/><circle cx="32" cy="76" r="8" fill="#333"/><circle cx="68" cy="76" r="8" fill="#333"/></>),
  truck: (<><rect x="10" y="38" width="46" height="30" fill="#3fae4a"/><path d="M56 46h18l12 12v10H56z" fill="#57b5f0"/><rect x="62" y="50" width="14" height="10" fill="#cde6ff"/><circle cx="26" cy="74" r="8" fill="#333"/><circle cx="72" cy="74" r="8" fill="#333"/></>),
  tree: (<><rect x="44" y="56" width="12" height="30" fill="#8a5a2b"/><circle cx="50" cy="42" r="24" fill="#3fae4a"/><circle cx="34" cy="50" r="14" fill="#46b955"/><circle cx="66" cy="50" r="14" fill="#46b955"/></>),
  star: (<path d="M50 12l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z" fill="#f6c531" stroke="#e0a91f" strokeWidth="2"/>),
  flower: (<><g fill="#ef5aa0">{[[50,26],[74,50],[50,74],[26,50]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="15"/>)}</g><circle cx="50" cy="50" r="13" fill="#f6c531"/></>),
  sun: (<><g stroke="#f6a01f" strokeWidth="6" strokeLinecap="round">{[0,45,90,135,180,225,270,315].map((a,i)=>{const r=a*Math.PI/180;return <line key={i} x1={50+28*Math.cos(r)} y1={50+28*Math.sin(r)} x2={50+40*Math.cos(r)} y2={50+40*Math.sin(r)}/>;})}</g><circle cx="50" cy="50" r="22" fill="#f6c531"/></>),
  ball: (<><circle cx="50" cy="50" r="34" fill="#e2352f"/><path d="M16 50h68M50 16v68" stroke="#fff" strokeWidth="4"/><circle cx="50" cy="50" r="10" fill="#fff"/></>),
  balloon: (<><ellipse cx="50" cy="42" rx="24" ry="28" fill="#ef5aa0"/><path d="M50 70l-4 8h8z" fill="#ef5aa0"/><path d="M50 78c0 8-8 8-8 14" stroke="#999" strokeWidth="2" fill="none"/></>),
  cup: (<><path d="M28 34h44l-4 40H32z" fill="#57b5f0"/><path d="M72 42h10a8 8 0 010 16h-8" fill="none" stroke="#57b5f0" strokeWidth="6"/><rect x="28" y="30" width="44" height="8" rx="4" fill="#2f7bd6"/></>),
  laddu: (<><circle cx="50" cy="52" r="30" fill="#e8a33d"/><g fill="#c9812a">{[[40,44],[60,44],[50,60],[38,60],[62,60],[50,44]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4"/>)}</g></>),
  mouse: (<><ellipse cx="52" cy="60" rx="24" ry="16" fill="#b8b8c0"/><circle cx="30" cy="46" r="12" fill="#b8b8c0"/><circle cx="24" cy="38" r="8" fill="#cfa9c8"/><circle cx="36" cy="38" r="8" fill="#cfa9c8"/><circle cx="30" cy="48" r="3" fill="#333"/><path d="M74 62c12 2 14-8 8-12" stroke="#b8b8c0" strokeWidth="3" fill="none"/></>),
  ant: (<><g fill="#5a3a22"><circle cx="34" cy="50" r="9"/><circle cx="50" cy="50" r="11"/><circle cx="68" cy="50" r="9"/></g><g stroke="#5a3a22" strokeWidth="3" strokeLinecap="round"><path d="M50 50l-14 14M50 50l0 18M50 50l14 14M50 50l-14-12M50 50l14-12"/><path d="M28 44l-8-10M40 42l-4-12"/></g></>),
  dog: (<><ellipse cx="52" cy="56" rx="28" ry="22" fill="#c88a3a"/><ellipse cx="30" cy="52" rx="14" ry="15" fill="#c88a3a"/><path d="M18 40c-4 12 2 20 6 20l4-14z" fill="#a8702a"/><circle cx="28" cy="50" r="3" fill="#222"/><circle cx="20" cy="56" r="4" fill="#222"/></>),
  cow: (<><ellipse cx="54" cy="56" rx="28" ry="20" fill="#f2f2f2"/><g fill="#7a7a7a"><ellipse cx="44" cy="52" rx="8" ry="6"/><ellipse cx="66" cy="60" rx="7" ry="5"/></g><ellipse cx="28" cy="54" rx="14" ry="13" fill="#f2f2f2"/><path d="M16 44l-6-8M22 40l-2-10" stroke="#7a7a7a" strokeWidth="4" strokeLinecap="round"/><circle cx="24" cy="52" r="3" fill="#222"/><ellipse cx="26" cy="62" rx="9" ry="6" fill="#e79ab0"/></>),
  bike: (<><g fill="none" stroke="#2f7bd6" strokeWidth="4"><circle cx="28" cy="64" r="14"/><circle cx="72" cy="64" r="14"/><path d="M28 64l16-24h20M44 40l14 24M58 40h10"/></g><circle cx="50" cy="38" r="4" fill="#2f7bd6"/></>),
  man: (<><circle cx="50" cy="26" r="12" fill="#d9a06b"/><path d="M30 78c0-16 9-28 20-28s20 12 20 28z" fill="#3f6fb0"/><rect x="44" y="46" width="12" height="10" fill="#d9a06b"/></>),
  woman: (<><circle cx="50" cy="26" r="12" fill="#d9a06b"/><path d="M50 22c-10 0-14 8-14 14 4-2 24-2 28 0 0-6-4-14-14-14z" fill="#3a2a22"/><path d="M28 80l22-30 22 30z" fill="#d1477f"/><rect x="45" y="46" width="10" height="8" fill="#d9a06b"/></>),
  boy: (<><circle cx="50" cy="28" r="11" fill="#e2ac74"/><path d="M40 20c2-6 18-6 20 0z" fill="#4a3320"/><path d="M32 80c0-14 8-24 18-24s18 10 18 24z" fill="#2f9e5c"/></>),
  girl: (<><circle cx="50" cy="28" r="11" fill="#e2ac74"/><path d="M38 30c-2-12 26-12 24 0" fill="#4a3320"/><circle cx="34" cy="34" r="5" fill="#4a3320"/><circle cx="66" cy="34" r="5" fill="#4a3320"/><path d="M34 80l16-26 16 26z" fill="#e46aa0"/></>),
  baby: (<><circle cx="50" cy="40" r="20" fill="#f0c39a"/><path d="M32 34a18 18 0 0136 0z" fill="#bfe3f5"/><circle cx="43" cy="42" r="3" fill="#333"/><circle cx="57" cy="42" r="3" fill="#333"/><path d="M44 50c4 3 8 3 12 0" stroke="#b06a4a" strokeWidth="2" fill="none"/></>),
  monkey: (<><circle cx="50" cy="52" r="26" fill="#8a5a2b"/><circle cx="28" cy="44" r="9" fill="#8a5a2b"/><circle cx="72" cy="44" r="9" fill="#8a5a2b"/><ellipse cx="50" cy="58" rx="17" ry="15" fill="#e6c9a3"/><circle cx="42" cy="50" r="3" fill="#222"/><circle cx="58" cy="50" r="3" fill="#222"/><ellipse cx="50" cy="62" rx="5" ry="3" fill="#b06a4a"/></>),
  hen: (<><ellipse cx="50" cy="60" rx="24" ry="18" fill="#f2f2f2"/><circle cx="70" cy="44" r="12" fill="#f2f2f2"/><path d="M70 32c2-8 10-8 10-8s-2 10-8 10z" fill="#e2352f"/><path d="M82 46l12-3-12-4z" fill="#f39a2b"/><circle cx="74" cy="42" r="2.5" fill="#222"/><path d="M30 60l-10 6 10 4z" fill="#e2a02f"/></>),
  horse: (<><path d="M20 44c8-14 26-16 40-10l16-8-6 16c8 8 8 22 4 30H30c-6-8-14-14-10-28z" fill="#a86b39"/><path d="M74 26l6-14-14 8z" fill="#6b4423"/><circle cx="40" cy="40" r="3" fill="#222"/></>),
  goat: (<><ellipse cx="50" cy="56" rx="24" ry="17" fill="#e8e2d6"/><circle cx="28" cy="50" r="12" fill="#e8e2d6"/><path d="M20 40c-4-8-2-16-2-16s6 6 8 14M28 40c2-8 8-14 8-14s0 8-2 14" stroke="#9a8f7a" strokeWidth="3" fill="none"/><circle cx="24" cy="50" r="2.5" fill="#222"/><path d="M22 60l-6 8" stroke="#e8e2d6" strokeWidth="5"/></>),
  house: (<><path d="M18 50L50 24l32 26z" fill="#e2352f"/><rect x="26" y="50" width="48" height="30" fill="#f0c39a"/><rect x="44" y="60" width="12" height="20" fill="#7a4a20"/><rect x="32" y="56" width="10" height="10" fill="#57b5f0"/></>),
  hut: (<><path d="M16 52c6-18 62-18 68 0z" fill="#8a5a2b"/><rect x="26" y="52" width="48" height="28" fill="#d8b98f"/><path d="M42 80V60h16v20z" fill="#5a3a1a"/></>),
  building: (<><rect x="30" y="16" width="40" height="66" fill="#8aa0b6"/><g fill="#cde6ff">{[22,36,50,64].flatMap((y,r)=>[38,50,62].map((x,c)=><rect key={r+"-"+c} x={x} y={y} width="8" height="10"/>))}</g></>),
  box: (<><path d="M20 40l30-14 30 14-30 12z" fill="#d8a463"/><path d="M20 40v30l30 12V52z" fill="#b9843f"/><path d="M80 40v30L50 82V52z" fill="#c9924d"/></>),
  book: (<><path d="M22 26h44a6 6 0 016 6v44H28a6 6 0 01-6-6z" fill="#e2352f"/><rect x="28" y="26" width="40" height="44" fill="#fff"/><path d="M48 26v44" stroke="#c9c9c9" strokeWidth="2"/></>),
  pencil: (<><rect x="30" y="18" width="16" height="52" transform="rotate(24 38 44)" fill="#f6c531"/><path d="M52 74l-8 4 2-9z" fill="#333"/><rect x="26" y="16" width="16" height="8" transform="rotate(24 34 20)" fill="#e46aa0"/></>),
  kite: (<><path d="M50 14l24 24-24 24-24-24z" fill="#57b5f0"/><path d="M50 14v48M26 38h48" stroke="#fff" strokeWidth="2"/><path d="M50 62c6 8-6 12 0 24" stroke="#999" strokeWidth="2" fill="none"/></>),
  clock: (<><circle cx="50" cy="50" r="34" fill="#fff" stroke="#2f7bd6" strokeWidth="6"/><path d="M50 50V28M50 50l16 8" stroke="#333" strokeWidth="4" strokeLinecap="round"/><circle cx="50" cy="50" r="3" fill="#e2352f"/></>),
  coin: (<><circle cx="50" cy="52" r="30" fill="#e8b800"/><circle cx="50" cy="52" r="24" fill="none" stroke="#b78f00" strokeWidth="3"/><text x="50" y="62" textAnchor="middle" fontSize="26" fill="#7a5f00" fontFamily="sans-serif">₹</text></>),
  note: (<><rect x="14" y="32" width="72" height="40" rx="4" fill="#7cc47c"/><rect x="20" y="38" width="60" height="28" rx="2" fill="none" stroke="#4e9e4e" strokeWidth="2"/><circle cx="50" cy="52" r="10" fill="#4e9e4e"/><text x="50" y="57" textAnchor="middle" fontSize="12" fill="#fff" fontFamily="sans-serif">₹</text></>),
  roti: (<><circle cx="50" cy="50" r="30" fill="#e8c98f"/><g fill="#c99a55">{[[40,42],[60,44],[50,58],[38,58],[62,60]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3"/>)}</g></>),
};

const ALIAS: Record<string, string> = {
  rupee: "coin", money: "coin", rupees: "coin", paisa: "coin", paise: "coin",
  watch: "clock", lorry: "truck", cycle: "bike", bicycle: "bike", auto: "car", van: "car", jeep: "car",
  lady: "woman", aunty: "woman", mother: "woman", mummy: "woman", grandmother: "woman", dadi: "woman",
  uncle: "man", father: "man", papa: "man", grandfather: "man", dada: "man", gentleman: "man",
  kid: "boy", child: "boy", person: "man", people: "man",
  building: "building", hut: "hut", home: "house",
  doggy: "dog", puppy: "dog", kitty: "cat", birdie: "bird", cow: "cow",
  orange: "apple", fruit: "apple", laddoo: "laddu", chapati: "roti", chapatti: "roti", notebook: "book",
};
function resolve(name: string): string {
  const n = (name || "").toLowerCase().trim();
  if (ICONS[n]) return n;
  if (ALIAS[n] && ICONS[ALIAS[n]]) return ALIAS[n];
  return n;
}
const NAMES = Object.keys(ICONS);
export const OBJECT_ICON_NAMES = NAMES;

/* ---- 3D emoji (Microsoft Fluent Emoji 3D, MIT) bundled offline ----
 * Real rendered 3D icons kids recognise instantly. Rendered when a match
 * exists; otherwise we fall back to the crisp flat SVG above. */
const rawUrls = (import.meta as unknown as {
  glob: (p: string, o?: Record<string, unknown>) => Record<string, string>;
}).glob("../assets/emoji3d/*.webp", { eager: true, query: "?url", import: "default" });
const EMOJI3D: Record<string, string> = {};
for (const p in rawUrls) {
  const m = p.match(/([0-9a-f-]+)\.webp$/i);
  if (m) EMOJI3D[m[1].toLowerCase()] = rawUrls[p];
}

/* icon-name → representative emoji so name-based objects also get a 3D image */
const NAME_EMOJI: Record<string, string> = {
  apple: "🍎", banana: "🍌", mango: "🥭", grapes: "🍇", duck: "🦆", fish: "🐟", cat: "🐱", bird: "🐦",
  elephant: "🐘", butterfly: "🦋", car: "🚗", bus: "🚌", truck: "🚚", tree: "🌳", star: "⭐", flower: "🌸",
  sun: "☀️", ball: "⚽", balloon: "🎈", cup: "🥤", mouse: "🐭", ant: "🐜", dog: "🐶", cow: "🐄", bike: "🚲",
  man: "👨", woman: "👩", boy: "👦", girl: "👧", baby: "👶", monkey: "🐵", hen: "🐔", horse: "🐴", goat: "🐐",
  house: "🏠", hut: "🛖", building: "🏢", box: "📦", book: "📚", pencil: "✏️", kite: "🪁", clock: "🕐",
  coin: "🪙", note: "💵", roti: "🫓",
};
const isEmoji = (s: string) => !!s && /\p{Extended_Pictographic}/u.test(s);

/** Return a bundled 3D image URL for a name/emoji, or null to use the SVG. */
export function emoji3dUrl(name: string): string | null {
  const r = resolve(name);
  const emoji = NAME_EMOJI[r] ?? (isEmoji(name) ? name : NAME_EMOJI[(name || "").toLowerCase().trim()] ?? "");
  if (!emoji) return null;
  const hex = emoji.codePointAt(0)!.toString(16);
  return EMOJI3D[hex] ?? null;
}

export function hasObjectIcon(name: string): boolean {
  return !!ICONS[resolve(name)] || !!emoji3dUrl(name);
}

export function ObjectIcon({ name, size = 44 }: { name: string; size?: number }) {
  const url = emoji3dUrl(name);
  if (url) {
    return (
      <img className="fm-obj3d" src={url} width={size} height={size}
        alt={name} draggable={false} loading="lazy" />
    );
  }
  const inner = ICONS[resolve(name)] ?? <circle cx="50" cy="50" r="30" fill="#ff9f43" />;
  return (
    <svg width={size} height={size} viewBox={V} role="img" aria-label={name}>{inner}</svg>
  );
}
