const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Removes emails, phone numbers, and any supplied secret such as a name or project title. */
export function anonymizeText(text: string, secrets: string[] = []): string {
  let next = text.replace(EMAIL, " ").replace(PHONE, " ");
  const unique = [...new Set(secrets.map((secret) => secret.trim()).filter((secret) => secret.length >= 3))];
  unique.sort((a, b) => b.length - a.length);
  for (const secret of unique) {
    next = next.replace(new RegExp(escapeRegExp(secret), "ig"), " ");
  }
  return next.replace(/\s+/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
}

const PERSONAL_KEYS = /"(userId|email|passwordHash|password|projectName|projectTitle|privateNotes|founderProfile)"\s*:/;

export function containsPersonalKeys(value: unknown): boolean {
  return PERSONAL_KEYS.test(JSON.stringify(value));
}

export function leaksSecrets(value: unknown, secrets: string[]): boolean {
  const json = JSON.stringify(value).toLowerCase();
  return secrets.some((secret) => {
    const trimmed = secret.trim().toLowerCase();
    return trimmed.length >= 3 && json.includes(trimmed);
  });
}

export function isPublicSafe(value: unknown, secrets: string[]): boolean {
  return !containsPersonalKeys(value) && !leaksSecrets(value, secrets);
}
