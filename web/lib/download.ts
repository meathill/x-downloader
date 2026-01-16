import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getOutputDir } from "./config";

export type DownloadRequest = {
  url: string;
  filename?: string;
  format?: string;
};

export type DownloadResult = {
  ok: boolean;
  message: string;
  logs: string[];
  outputPath?: string;
};

export type NormalizedDownloadRequest = {
  url: string;
  filename?: string;
  format?: string;
};

const DEFAULT_FORMAT = "bestvideo*+bestaudio/best";
const DEFAULT_TEMPLATE = "%(title)s.%(ext)s";
const ALLOWED_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
  "m.twitter.com",
  "t.co"
]);

export async function downloadVideo(request: DownloadRequest): Promise<DownloadResult> {
  const normalized = normalizeDownloadRequest(request);
  if (!normalized.ok) {
    return { ok: false, message: normalized.message, logs: [] };
  }

  const { url, filename, format } = normalized.value;
  const outputDir = await ensureOutputDir(getOutputDir());
  const outputTemplate = buildOutputTemplate(outputDir, filename);

  if (!format) {
    const ffmpegReady = await isCommandAvailable("ffmpeg", ["-version"]);
    if (!ffmpegReady) {
      return {
        ok: false,
        message: "默认最高质量需要 ffmpeg，请先安装（例如 `brew install ffmpeg`），或改用 -f best。",
        logs: []
      };
    }
  }

  const args: string[] = ["--no-playlist", "--print", "after_move:filepath"];
  if (format) {
    args.push("-f", format);
  } else {
    args.push("-f", DEFAULT_FORMAT);
  }

  args.push("-o", outputTemplate, "--", url);

  const result = await runCommand("yt-dlp", args);

  if (result.errorCode === "ENOENT") {
    return {
      ok: false,
      message: "未找到 yt-dlp，请先安装并确保命令可用。",
      logs: result.logs
    };
  }

  if (result.code !== 0) {
    return {
      ok: false,
      message: "下载失败，请查看日志。",
      logs: result.logs
    };
  }

  const outputPath = await extractOutputPath(result.stdout, outputDir);

  return {
    ok: true,
    message: outputPath ? `下载完成：${outputPath}` : `下载完成，文件位于 ${outputDir}`,
    logs: result.logs,
    outputPath: outputPath ?? undefined
  };
}

type ValidationResult =
  | { ok: true; value: NormalizedDownloadRequest }
  | { ok: false; message: string };

type CommandResult = {
  code: number | null;
  logs: string[];
  stdout: string;
  errorCode?: string;
};

export function normalizeDownloadRequest(request: DownloadRequest): ValidationResult {
  const url = request.url.trim();
  if (url.length === 0) {
    return { ok: false, message: "请输入视频链接。" };
  }

  const parsedUrl = parseUrl(url);
  if (!parsedUrl) {
    return { ok: false, message: "链接格式不正确，请使用 http(s) 开头的链接。" };
  }

  if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
    return { ok: false, message: "仅支持 x.com 或 twitter.com 的链接。" };
  }

  if (request.filename) {
    const filename = request.filename.trim();
    if (filename.length === 0) {
      return { ok: false, message: "文件名不能为空。" };
    }

    if (path.basename(filename) !== filename) {
      return { ok: false, message: "文件名不能包含路径。" };
    }
  }

  if (request.format !== undefined && request.format.trim().length === 0) {
    return { ok: false, message: "格式不能为空。" };
  }

  return {
    ok: true,
    value: {
      url,
      filename: request.filename ? request.filename.trim() : undefined,
      format: request.format ? request.format.trim() : undefined
    }
  };
}

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

async function ensureOutputDir(outputDir: string): Promise<string> {
  const resolved = path.resolve(outputDir);
  await fs.mkdir(resolved, { recursive: true });
  return resolved;
}

function buildOutputTemplate(outputDir: string, filename?: string): string {
  if (filename) {
    return path.join(outputDir, filename);
  }
  return path.join(outputDir, DEFAULT_TEMPLATE);
}

async function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return await new Promise((resolve) => {
    const logs: string[] = [];
    const stdoutChunks: string[] = [];
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      logs.push(text);
      stdoutChunks.push(text);
    });

    child.stderr.on("data", (chunk) => {
      logs.push(chunk.toString());
    });

    child.on("error", (error) => {
      if (isErrnoException(error) && error.code) {
        resolve({ code: null, logs, stdout: stdoutChunks.join(""), errorCode: error.code });
        return;
      }
      resolve({ code: null, logs, stdout: stdoutChunks.join("") });
    });

    child.on("close", (code) => {
      resolve({ code, logs, stdout: stdoutChunks.join("") });
    });
  });
}

async function isCommandAvailable(command: string, args: string[]): Promise<boolean> {
  return await new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore" });

    child.on("error", () => {
      resolve(false);
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}

async function extractOutputPath(stdout: string, outputDir: string): Promise<string | null> {
  if (!stdout) {
    return null;
  }

  const outputBase = path.resolve(outputDir);
  const outputBasePrefix = outputBase.endsWith(path.sep) ? outputBase : `${outputBase}${path.sep}`;
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = normalizeOutputLine(lines[index]);
    if (!candidate) {
      continue;
    }

    const resolved = path.isAbsolute(candidate) ? candidate : path.join(outputBase, candidate);
    if (!resolved.startsWith(outputBasePrefix)) {
      continue;
    }

    if (await fileExists(resolved)) {
      return resolved;
    }
  }

  return null;
}

function normalizeOutputLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const patterns = [
    /Destination:\s*(.+)$/i,
    /Merging formats into\s*\"?(.+?)\"?$/i
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return stripQuotes(match[1].trim());
    }
  }

  return stripQuotes(trimmed);
}

function stripQuotes(value: string): string {
  return value.replace(/^\"|\"$/g, "").replace(/^'|'$/g, "");
}

async function fileExists(target: string): Promise<boolean> {
  try {
    const stat = await fs.stat(target);
    return stat.isFile();
  } catch {
    return false;
  }
}
