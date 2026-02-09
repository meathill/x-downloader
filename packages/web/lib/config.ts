import os from "node:os";
import path from "node:path";

export function getOutputDir(): string {
  const override = process.env.X_DOWNLOADER_OUTPUT_DIR;
  if (override) {
    return path.resolve(override);
  }

  return path.join(os.homedir(), "Downloads");
}
