import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCloudServer } from "./cloudSave";

let base = "";
let dir = "";

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "vhal-cloud-"));
  const real = createCloudServer({ dataDir: dir, allowOrigin: "https://example.test", maxBytes: 64 });
  await new Promise<void>((resolve) => real.listen(0, resolve));
  base = `http://127.0.0.1:${(real.address() as AddressInfo).port}`;
  afterAll(async () => {
    real.close();
    await rm(dir, { recursive: true, force: true });
  });
});

describe("Cloud-Speicher", () => {
  const code = "abcdefghij12";

  it("speichert und liefert einen Spielstand", async () => {
    expect((await fetch(`${base}/saves/${code}`, { method: "PUT", body: "QUJD+/==" })).status).toBe(204);
    const res = await fetch(`${base}/saves/${code}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("QUJD+/==");
    expect(res.headers.get("access-control-allow-origin")).toBe("https://example.test");
  });

  it("lehnt ungültige Codes, Inhalte und zu große Spielstände ab", async () => {
    expect((await fetch(`${base}/saves/../etc`)).status).toBe(404);
    expect((await fetch(`${base}/saves/${code}`, { method: "PUT", body: "<script>" })).status).toBe(400);
    expect((await fetch(`${base}/saves/${code}`, { method: "PUT", body: "A".repeat(100) })).status).toBe(413);
    expect((await fetch(`${base}/saves/zzzzzzzzzzzz`)).status).toBe(404);
  });
});
