import { spawn } from "node:child_process";
import path from "node:path";
import type { CliOptions } from "./args.ts";

export type YtDlpCommand = {
  bin: string;
  args: string[];
  display: string;
  outputTemplate: string;
};

const DEFAULT_TEMPLATE = "%(title)s.%(ext)s";
const DEFAULT_FORMAT = "bestvideo*+bestaudio/best";
const BIN_NAME = "yt-dlp";

export function buildYtDlpCommand(options: CliOptions): YtDlpCommand {
  if (!options.url) {
    throw new Error("缺少视频链接。");
  }

  const outputTemplate = buildOutputTemplate(options.outputDir, options.filename);
  const args: string[] = ["--no-playlist"];

  if (options.listFormats) {
    args.push("-F");
  }

  if (options.format) {
    args.push("-f", options.format);
  } else if (!options.listFormats) {
    args.push("-f", DEFAULT_FORMAT);
  }

  if (options.cookies) {
    args.push("--cookies", options.cookies);
  }

  if (options.proxy) {
    args.push("--proxy", options.proxy);
  }

  if (options.userAgent) {
    args.push("--user-agent", options.userAgent);
  }

  if (options.quiet) {
    args.push("-q", "--no-warnings");
  }

  args.push("-o", outputTemplate, "--", options.url);

  return {
    bin: BIN_NAME,
    args,
    display: formatCommandForDisplay(BIN_NAME, args),
    outputTemplate
  };
}

export async function runYtDlp(command: YtDlpCommand): Promise<number> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command.bin, command.args, { stdio: "inherit" });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

function buildOutputTemplate(outputDir: string, filename?: string): string {
  if (filename) {
    if (path.isAbsolute(filename)) {
      return filename;
    }
    return path.join(outputDir, filename);
  }

  return path.join(outputDir, DEFAULT_TEMPLATE);
}

function formatCommandForDisplay(bin: string, args: string[]): string {
  return [bin, ...args].map(quoteForShell).join(" ");
}

function quoteForShell(value: string): string {
  const safePattern = /^[A-Za-z0-9_./:-]+$/;
  if (safePattern.test(value)) {
    return value;
  }

  const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `"${escaped}"`;
}
