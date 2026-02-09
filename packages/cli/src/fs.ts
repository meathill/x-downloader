import { promises as fs } from "node:fs";
import path from "node:path";

export async function ensureOutputDir(outputDir: string): Promise<string> {
  const resolved = path.resolve(outputDir);
  const stat = await safeStat(resolved);

  if (stat && !stat.isDirectory()) {
    throw new Error(`输出目录不是文件夹: ${resolved}`);
  }

  if (!stat) {
    await fs.mkdir(resolved, { recursive: true });
  }

  return resolved;
}

async function safeStat(targetPath: string): Promise<fs.Stats | null> {
  try {
    return await fs.stat(targetPath);
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}
