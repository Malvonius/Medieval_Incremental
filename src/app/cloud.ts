/**
 * Optionaler Cloud-Speicherstand. Aktiv nur, wenn beim Build VITE_CLOUD_SAVE_URL gesetzt ist.
 * Erwarteter Dienst (z. B. Cloudflare Worker oder Supabase-Funktion):
 *   PUT  {URL}/{code}  Body: Export-Text   → 204
 *   GET  {URL}/{code}                      → 200 Export-Text | 404
 * Der Code ist ein zufälliger Sync-Schlüssel; wer ihn kennt, kann den Spielstand laden.
 */
export const CLOUD_URL: string | undefined = import.meta.env.VITE_CLOUD_SAVE_URL || undefined;

const CODE_KEY = "vhal.cloud.code";
const CODE_PATTERN = /^[a-z0-9]{12}$/;

export const isValidSyncCode = (code: string): boolean => CODE_PATTERN.test(code);

export function syncCode(storage: Pick<Storage, "getItem" | "setItem">): string {
  const existing = storage.getItem(CODE_KEY);
  if (existing !== null && isValidSyncCode(existing)) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const code = Array.from(bytes, (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
  storage.setItem(CODE_KEY, code);
  return code;
}

function endpoint(code: string): string {
  if (!CLOUD_URL) throw new Error("Cloud-Speicher ist nicht eingerichtet.");
  if (!isValidSyncCode(code)) throw new Error("Ungültiger Sync-Code.");
  return `${CLOUD_URL.replace(/\/$/, "")}/${code}`;
}

export async function uploadSave(code: string, text: string): Promise<void> {
  const response = await fetch(endpoint(code), { method: "PUT", body: text, headers: { "Content-Type": "text/plain" } });
  if (!response.ok) throw new Error(`Hochladen fehlgeschlagen (HTTP ${response.status}).`);
}

export async function downloadSave(code: string): Promise<string> {
  const response = await fetch(endpoint(code));
  if (response.status === 404) throw new Error("Unter diesem Code liegt kein Spielstand.");
  if (!response.ok) throw new Error(`Laden fehlgeschlagen (HTTP ${response.status}).`);
  return response.text();
}
