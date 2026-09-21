/**
 * Makes a message body safe to drop into the page with dangerouslySetInnerHTML.
 *
 * Mail clients send whole HTML documents, not fragments. An Outlook reply
 * arrives wrapped in <html><head>…<body>, carrying <style> blocks full of
 * unscoped selectors — `a:link { color: blue }`, `p.MsoNormal { font-family:
 * "Times New Roman" }`. Injected inline, those rules apply to the entire admin
 * UI, not just the message, and the surrounding chrome visibly restyles itself
 * when such a thread is opened.
 *
 * Parsing rather than regexing: DOMParser builds an inert document that neither
 * executes script nor fetches subresources, so the tree can be pruned safely
 * and serialized back out.
 *
 * Inline styles on individual elements are kept — they're scoped to their own
 * element and are what makes the message look like the sender meant it to.
 */

/** Elements that either escape the message box or have no business in one. */
const DROP_ELEMENTS = [
  // The actual bug: document-level CSS bleeding into the app.
  "style",
  "link",
  "base",
  // Never meaningful in a rendered body, and script-adjacent.
  "script",
  "meta",
  "title",
  "iframe",
  "object",
  "embed",
  "applet",
  // Inbound mail must not be able to put controls in an admin's page.
  "form",
  "input",
  "button",
  "textarea",
  "select",
].join(",");

/** Attribute values that navigate somewhere, so worth checking the scheme of. */
const URL_ATTRIBUTES = new Set(["href", "src", "xlink:href", "action", "formaction"]);

/** Schemes an email is allowed to point at. `cid:` survives sync rewriting as
 *  a dead link when its part failed to store, which is harmless. */
const SAFE_SCHEME = /^(https?:|mailto:|tel:|cid:|data:image\/|\/|#|\.)/i;

export function sanitizeEmailHtml(html: string): string {
  // Server-side render or an environment without DOMParser: emit nothing
  // rather than the unsanitized string.
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return "";

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return "";
  }

  doc.querySelectorAll(DROP_ELEMENTS).forEach((el) => el.remove());

  for (const el of Array.from(doc.body.querySelectorAll<HTMLElement>("*"))) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();

      // Inline handlers fire even though innerHTML won't run <script>.
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (URL_ATTRIBUTES.has(name) && !SAFE_SCHEME.test(attr.value.trim())) {
        el.removeAttribute(attr.name);
      }
    }
  }

  // <body> unwraps the document, and its own bgcolor/style go with it.
  return doc.body.innerHTML;
}
