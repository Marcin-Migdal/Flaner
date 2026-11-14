import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import i18n from "./i18n";

describe("core i18n configuration", () => {
  it("initializes i18n with fallbackLng en and defaultNS common", () => {
    expect(i18n).toBeDefined();
    expect(i18n.options.fallbackLng).toContain("en");
    expect(i18n.options.defaultNS).toBe("common");
    expect(i18n.options.ns).toEqual(expect.arrayContaining(["common", "auth", "ui"]));
  });

  it("resolves loadPath correctly for core and MFE namespaces", () => {
    type BackendOptions = {
      loadPath?: (lngs: string[], namespaces: string[]) => string;
    };
    const backendOptions = i18n.options.backend as BackendOptions | undefined;
    expect(backendOptions?.loadPath).toBeDefined();

    if (backendOptions?.loadPath) {
      // Core namespace fallback
      const corePath = backendOptions.loadPath(["en"], ["common"]);
      expect(corePath).toBe("/locales/en/common.json");

      // MFE namespace
      const planningPath = backendOptions.loadPath(["pl"], ["planning"]);
      expect(planningPath).toMatch(/https?:\/\/.*\/locales\/pl\/planning\.json/);

      const communityPath = backendOptions.loadPath(["en"], ["community"]);
      expect(communityPath).toMatch(/https?:\/\/.*\/locales\/en\/community\.json/);
    }
  });

  it("uses \"a\", not \"an\", before a consonant in the English texts (#106)", () => {
    const dir = resolve(__dirname, "../../public/locales/en");
    const texts = readdirSync(dir).map((file) => readFileSync(resolve(dir, file), "utf8"));

    expect(texts.join("\n").match(/\ban [bcdfgjklmnpqrstvwxyz]\w*/gi)).toBeNull();
  });
});
