/** Embedded YouTube player for the Video tab.
 *  Uses the privacy-enhanced youtube-nocookie.com domain, disables related-video
 *  suggestions (rel=0) and branding, and sandboxes the iframe so the embed can
 *  only play video — it can't navigate the app away or pop new windows on its
 *  own. Callers should always also offer an external "Open on YouTube" link
 *  (via api.openExternalLink) as a fallback/alternative, never rely on the
 *  embed alone. */
import { useMemo } from "react";

export function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s; // bare ID
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch { /* not a URL */ }
  return null;
}

export function YouTubePlayer({ videoId, title }: { videoId: string; title?: string }) {
  const src = useMemo(() => {
    const p = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1", color: "white" });
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${p.toString()}`;
  }, [videoId]);

  return (
    <div className="fm-yt-embed">
      <iframe
        src={src}
        title={title ? `YouTube video: ${title}` : "YouTube video"}
        loading="lazy"
        allow="accelerometer; encrypted-media; picture-in-picture; clipboard-write"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
