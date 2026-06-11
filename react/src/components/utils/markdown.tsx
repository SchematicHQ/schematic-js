import { Fragment } from "react";

// Matches the three opt-in markdown constructs we support, in precedence order:
// a link `[text](url)`, bold `**text**`, then italic `*text*`. Anything else is
// treated as plain text. We intentionally do NOT support headings/lists/code, per
// the product spec for the custom opt-in.
const TOKEN = /(\[[^\]]+\]\([^)\s]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

const isSafeUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Renders a restricted subset of markdown (bold, italic, links) as React elements.
 *
 * Security: output is composed entirely of React elements, so text content is escaped
 * by React (never `dangerouslySetInnerHTML`). Links are emitted only for http(s) URLs
 * and always open in a new tab with `rel="noopener noreferrer"`; an unsafe URL renders
 * its link text as plain text instead.
 */
export const renderOptInMarkdown = (text?: string | null): React.ReactNode => {
  if (!text) {
    return null;
  }

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>,
      );
    }

    const [token, link, bold, italic] = match;
    if (link) {
      const parts = LINK.exec(link);
      if (parts && isSafeUrl(parts[2])) {
        nodes.push(
          <a
            key={key++}
            href={parts[2]}
            target="_blank"
            rel="noopener noreferrer"
          >
            {parts[1]}
          </a>,
        );
      } else {
        nodes.push(<Fragment key={key++}>{parts ? parts[1] : token}</Fragment>);
      }
    } else if (bold) {
      nodes.push(<strong key={key++}>{bold.slice(2, -2)}</strong>);
    } else if (italic) {
      nodes.push(<em key={key++}>{italic.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes;
};
