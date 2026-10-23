/**
 * The agreement's text as the dashboard lets it be written: plain words with
 * Markdown links, `[Terms](https://…)`, and nothing else. Only `http` and
 * `https` links become links; any other bracketed text stays as typed.
 */

export type OptInSegment =
  { kind: "text"; text: string } | { kind: "link"; text: string; url: string };

const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function parseOptInText(text: string): OptInSegment[] {
  const segments: OptInSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ kind: "text", text: text.slice(last, index) });
    }
    segments.push({ kind: "link", text: match[1], url: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ kind: "text", text: text.slice(last) });
  }
  return segments;
}
