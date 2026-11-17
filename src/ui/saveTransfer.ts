/** Spielstand als Datei oder QR-Code zwischen Geräten übertragen – ganz ohne Server. */

export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  // Erst nach dem Klick freigeben, sonst bricht mancher Browser den Download ab.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const readFileText = (file: Blob): Promise<string> => file.text();

/**
 * Späte Spielstände sind ~3,5 kB groß – mehr, als ein gut lesbarer QR-Code fasst. Daher wird
 * der Text in Teile mit Kopf „VHAL<i>/<n>:“ zerlegt; beim Einlesen werden sie wieder zusammengesetzt.
 */
const QR_CHUNK = 1200;
const PART = /^VHAL(\d+)\/(\d+):/;

export function splitForQr(text: string): string[] {
  const n = Math.max(1, Math.ceil(text.length / QR_CHUNK));
  return Array.from({ length: n }, (_, i) => `VHAL${i + 1}/${n}:${text.slice(i * QR_CHUNK, (i + 1) * QR_CHUNK)}`);
}

/** Setzt Teile in beliebiger Reihenfolge zusammen; null, wenn Teile fehlen oder nicht zusammenpassen. */
export function joinQrParts(parts: readonly string[]): string | null {
  const byIndex = new Map<number, string>();
  let total = 0;
  for (const part of parts) {
    const match = PART.exec(part);
    if (!match) return parts.length === 1 ? (parts[0] ?? null) : null;
    const n = Number(match[2]);
    if (total !== 0 && n !== total) return null;
    total = n;
    byIndex.set(Number(match[1]), part.slice(match[0].length));
  }
  if (total === 0 || byIndex.size !== total) return null;
  return Array.from({ length: total }, (_, i) => byIndex.get(i + 1) ?? "").join("");
}

/** QR-Codes als Daten-URLs; die Bibliothek wird erst bei Bedarf geladen. */
export async function qrDataUrls(text: string): Promise<string[]> {
  const { toDataURL } = await import("qrcode");
  return Promise.all(splitForQr(text).map((part) => toDataURL(part, { errorCorrectionLevel: "L", margin: 1, width: 360 })));
}

interface DetectedBarcode {
  readonly rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<readonly DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const detectorCtor = (): BarcodeDetectorCtor | undefined =>
  (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

/** Einlesen nutzt die native BarcodeDetector-API (Chromium, Android); sonst bleibt der Datei-Weg. */
export const scanSupported = (): boolean => detectorCtor() !== undefined;

/** Liest alle QR-Codes aus den Bildern (ein Bild darf mehrere Teile enthalten) und setzt sie zusammen. */
export async function scanQr(images: readonly Blob[]): Promise<string | null> {
  const Ctor = detectorCtor();
  if (!Ctor) return null;
  const detector = new Ctor({ formats: ["qr_code"] });
  const parts: string[] = [];
  for (const image of images) {
    const bitmap = await createImageBitmap(image);
    try {
      for (const code of await detector.detect(bitmap)) parts.push(code.rawValue);
    } finally {
      bitmap.close();
    }
  }
  return joinQrParts([...new Set(parts)]);
}
