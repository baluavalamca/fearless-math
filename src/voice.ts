/**
 * Microphone capture -> 16 kHz mono 16-bit WAV (base64).
 * MediaRecorder produces webm/opus; Sarvam STT wants WAV, so we decode the
 * compressed blob with the Web Audio API and re-encode to PCM WAV in-browser.
 */

export interface Recorder {
  stop(): Promise<{ base64: string; mime: string }>;
  cancel(): void;
}

export const micSupported = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mr = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.start();

  const stopTracks = () => stream.getTracks().forEach((t) => t.stop());

  return {
    cancel() { try { mr.stop(); } catch { /* ignore */ } stopTracks(); },
    stop() {
      return new Promise((resolve, reject) => {
        mr.onstop = async () => {
          stopTracks();
          try {
            const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
            const buf = await blob.arrayBuffer();
            const base64 = await encodeToWav(buf);
            resolve({ base64, mime: "audio/wav" });
          } catch (e) { reject(e); }
        };
        try { mr.stop(); } catch (e) { reject(e); }
      });
    },
  };
}

async function encodeToWav(compressed: ArrayBuffer): Promise<string> {
  const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const audio = await ctx.decodeAudioData(compressed.slice(0));
    const len = audio.length, chs = audio.numberOfChannels;
    // downmix to mono
    const mono = new Float32Array(len);
    for (let c = 0; c < chs; c++) {
      const d = audio.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += d[i] / chs;
    }
    // resample to 16 kHz (nearest-sample — fine for speech)
    const target = 16000;
    const ratio = audio.sampleRate / target;
    const outLen = Math.max(1, Math.floor(len / ratio));
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) out[i] = mono[Math.floor(i * ratio)] || 0;
    return floatToWavBase64(out, target);
  } finally {
    try { await ctx.close(); } catch { /* ignore */ }
  }
}

function floatToWavBase64(samples: Float32Array, rate: number): string {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  const dataLen = samples.length * bytesPerSample;
  writeStr(0, "RIFF"); view.setUint32(4, 36 + dataLen, true); writeStr(8, "WAVE");
  writeStr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true); view.setUint16(34, 16, true);
  writeStr(36, "data"); view.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  // base64 encode
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
