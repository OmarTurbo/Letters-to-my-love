export function splitParagraphs(content) {
  return String(content ?? "")
    .split(/\n\s*\n/)
    .map((part) => part.trimEnd())
    .filter((part) => part.trim());
}

const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}
