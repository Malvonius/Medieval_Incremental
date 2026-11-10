import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { join } from "node:path";

/**
 * Minimaler Cloud-Speicher für Spielstände – ohne Abhängigkeiten.
 *   PUT /saves/{code}  Body: Export-Text (≤ maxBytes)  → 204
 *   GET /saves/{code}                                   → 200 Text | 404
 * Der Sync-Code (12 Zeichen a–z, 0–9) ist zugleich Schlüssel und Berechtigung.
 */
export interface CloudServerOptions {
  readonly dataDir: string;
  /** Erlaubte Herkunft für CORS, z. B. "https://malvonius.github.io". */
  readonly allowOrigin: string;
  readonly maxBytes?: number;
}

const CODE = /^\/saves\/([a-z0-9]{12})$/;
/** Export-Strings sind Base64 (lz-string); alles andere wird abgelehnt. */
const PAYLOAD = /^[A-Za-z0-9+/=]+$/;

function send(res: ServerResponse, status: number, body = "", headers: Record<string, string> = {}): void {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", ...headers });
  res.end(body);
}

async function readBody(req: IncomingMessage, limit: number): Promise<string | null> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > limit) return null;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createCloudServer({ dataDir, allowOrigin, maxBytes = 256 * 1024 }: CloudServerOptions): Server {
  const cors = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  return createServer((req, res) => {
    void (async () => {
      if (req.method === "OPTIONS") return send(res, 204, "", cors);
      const match = CODE.exec(req.url ?? "");
      if (!match?.[1]) return send(res, 404, "Nicht gefunden", cors);
      const file = join(dataDir, `${match[1]}.txt`);

      if (req.method === "GET") {
        try {
          return send(res, 200, await readFile(file, "utf8"), cors);
        } catch {
          return send(res, 404, "Kein Spielstand", cors);
        }
      }
      if (req.method === "PUT") {
        const body = await readBody(req, maxBytes);
        if (body === null) return send(res, 413, "Spielstand zu groß", cors);
        if (!PAYLOAD.test(body.trim())) return send(res, 400, "Ungültiger Spielstand", cors);
        await mkdir(dataDir, { recursive: true });
        // Atomar schreiben: erst temporäre Datei, dann umbenennen.
        const tmp = `${file}.${process.pid}.tmp`;
        await writeFile(tmp, body.trim(), "utf8");
        await rename(tmp, file);
        return send(res, 204, "", cors);
      }
      return send(res, 405, "Methode nicht erlaubt", { ...cors, Allow: "GET, PUT, OPTIONS" });
    })().catch((error: unknown) => {
      console.error("Cloud-Speicher:", error);
      if (!res.headersSent) send(res, 500, "Serverfehler", cors);
    });
  });
}
