export function sanitizeString(input) {
  if (input == null) return '';
  const text = String(input);
  return text
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
