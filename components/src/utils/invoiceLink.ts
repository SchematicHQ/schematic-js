import type { MouseEvent } from "react";

/**
 * Click handler for a link to a hosted invoice. The stored URL can expire
 * without notice, so a plain left click opens a blank tab and points it at a
 * URL fetched now, falling back to the stored one. The tab opens before the
 * request because Safari and Firefox block a window opened after an await.
 *
 * Modified and middle clicks, and a click whose window the browser blocks,
 * follow the anchor's own `href` as they would without this handler.
 */
export function openInvoiceLink(
  event: MouseEvent<HTMLAnchorElement>,
  storedUrl: string,
  fetchUrl: () => Promise<string | undefined>,
): Promise<void> {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return Promise.resolve();
  }

  const tab = window.open("", "_blank");
  if (tab === null) {
    return Promise.resolve();
  }

  event.preventDefault();
  // What `rel="noreferrer"` implies for the anchor: the invoice page gets no
  // handle on this window.
  tab.opener = null;

  return fetchUrl()
    .then(
      (url) => url || storedUrl,
      () => storedUrl,
    )
    .then((url) => {
      tab.location.href = url;
    });
}
