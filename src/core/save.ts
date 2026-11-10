import { compressToBase64, decompressFromBase64 } from "lz-string";

export class SaveError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SaveError";
  }
}

export interface SaveEnvelope {
  readonly version: number;
  readonly checksum: string;
  readonly payload: string;
}

/** Migrationen: Index i migriert Version i+1 → i+2. */
export type Migration = (data: unknown) => unknown;

/** FNV-1a (32 Bit) — erkennt beschädigte oder von Hand veränderte Spielstände. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function encodeSave(data: unknown, version: number): string {
  if (!Number.isSafeInteger(version) || version < 1) throw new RangeError(`Ungültige Version ${version}`);
  const payload = JSON.stringify(data);
  const envelope: SaveEnvelope = { version, checksum: fnv1a(payload), payload };
  return compressToBase64(JSON.stringify(envelope));
}

function parseEnvelope(text: string): SaveEnvelope {
  const json = decompressFromBase64(text.trim());
  if (!json) throw new SaveError("Spielstand ist nicht lesbar (Dekompression fehlgeschlagen).");

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (cause) {
    throw new SaveError("Spielstand ist kein gültiges JSON.", { cause });
  }
  if (typeof raw !== "object" || raw === null) throw new SaveError("Spielstand hat kein gültiges Format.");

  const { version, checksum, payload } = raw as Record<string, unknown>;
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1) {
    throw new SaveError("Spielstand hat keine gültige Version.");
  }
  if (typeof checksum !== "string" || typeof payload !== "string") {
    throw new SaveError("Spielstand ist unvollständig.");
  }
  return { version, checksum, payload };
}

export function decodeSave(text: string, currentVersion: number, migrations: readonly Migration[]): unknown {
  if (migrations.length !== currentVersion - 1) {
    throw new Error(`Für Version ${currentVersion} werden ${currentVersion - 1} Migrationen erwartet, gefunden: ${migrations.length}`);
  }
  const envelope = parseEnvelope(text);
  if (envelope.version > currentVersion) {
    throw new SaveError(`Spielstand stammt aus einer neueren Version (${envelope.version} > ${currentVersion}).`);
  }
  if (fnv1a(envelope.payload) !== envelope.checksum) {
    throw new SaveError("Prüfsumme stimmt nicht – der Spielstand ist beschädigt.");
  }

  let data: unknown;
  try {
    data = JSON.parse(envelope.payload);
  } catch (cause) {
    throw new SaveError("Spielstand-Inhalt ist kein gültiges JSON.", { cause });
  }
  for (let v = envelope.version; v < currentVersion; v += 1) {
    const migrate = migrations[v - 1];
    if (!migrate) throw new Error(`Migration ${v} → ${v + 1} fehlt.`);
    data = migrate(data);
  }
  return data;
}
