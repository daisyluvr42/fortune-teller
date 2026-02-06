import fs from "fs";
import path from "path";

export function getAppVersion(): string {
  const candidates = [
    path.resolve(process.cwd(), "VERSION"),
    path.resolve(process.cwd(), "..", "VERSION"),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8").trim();
        if (raw) return raw;
      }
    } catch {
      // ignore and try next
    }
  }
  return "0.0.0";
}
