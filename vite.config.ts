import { svelte } from "@sveltejs/vite-plugin-svelte";
import { Compiler } from "inkjs/full";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/** Kompiliert .ink-Dateien beim Build; im Spiel läuft nur die schlanke Ink-Laufzeit. */
function ink(): Plugin {
  return {
    name: "vhal-ink",
    transform(source, id) {
      if (!id.endsWith(".ink")) return null;
      const compiler = new Compiler(source);
      const story = compiler.Compile();
      if (compiler.errors.length > 0) throw new Error(`Ink-Fehler in ${id}:\n${compiler.errors.join("\n")}`);
      return { code: `export default ${JSON.stringify(story.ToJson())};`, map: null };
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [ink(), svelte()],
  test: {
    include: ["src/**/*.test.ts", "server/**/*.test.ts"],
    environment: "node",
  },
});
