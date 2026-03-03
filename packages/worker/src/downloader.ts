import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { DownloadJobMessage } from './job-message';

const DEFAULT_FORMAT = 'bestvideo*+bestaudio/best';
const DEFAULT_TEMPLATE = '%(title)s.%(ext)s';

export type DownloadOutput = {
  outputPath: string;
  logs: string[];
};

export async function downloadFromX(job: DownloadJobMessage, outputDir: string): Promise<DownloadOutput> {
  const resolvedOutputDir = path.resolve(outputDir);
  await fs.mkdir(resolvedOutputDir, { recursive: true });

  const outputTemplate = buildOutputTemplate(resolvedOutputDir, job.filename);
  const args = [
    '--no-playlist',
    '--print',
    'after_move:filepath',
    '-f',
    normalizeFormat(job.format),
    '-o',
    outputTemplate,
    '--',
    job.url,
  ];

  const result = await runCommand('yt-dlp', args);
  if (result.errorCode === 'ENOENT') {
    throw new Error('未找到 yt-dlp，请先安装。\n');
  }

  if (result.code !== 0) {
    throw new Error(`yt-dlp 执行失败，退出码：${result.code ?? 'unknown'}。`);
  }

  const outputPath = await extractOutputPath(result.stdout, resolvedOutputDir);
  if (!outputPath) {
    throw new Error('下载成功但未识别输出文件路径。\n');
  }

  return {
    outputPath,
    logs: result.logs,
  };
}

function normalizeFormat(value: string | undefined): string {
  if (!value) {
    return DEFAULT_FORMAT;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_FORMAT;
}

function buildOutputTemplate(outputDir: string, filename?: string): string {
  if (!filename) {
    return path.join(outputDir, DEFAULT_TEMPLATE);
  }

  const safe = path.basename(filename);
  return path.join(outputDir, safe);
}

type CommandResult = {
  code: number | null;
  logs: string[];
  stdout: string;
  errorCode?: string;
};

async function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return await new Promise((resolve) => {
    const logs: string[] = [];
    const stdoutChunks: string[] = [];
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      logs.push(text);
      stdoutChunks.push(text);
    });

    child.stderr.on('data', (chunk) => {
      logs.push(chunk.toString());
    });

    child.on('error', (error) => {
      if (isErrnoException(error) && error.code) {
        resolve({
          code: null,
          logs,
          stdout: stdoutChunks.join(''),
          errorCode: error.code,
        });
        return;
      }

      resolve({ code: null, logs, stdout: stdoutChunks.join('') });
    });

    child.on('close', (code) => {
      resolve({ code, logs, stdout: stdoutChunks.join('') });
    });
  });
}

function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value;
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

  const patterns = [/Destination:\s*(.+)$/i, /Merging formats into\s*"?(.+?)"?$/i];
  for (const pattern of patterns) {
    const matched = trimmed.match(pattern);
    if (matched?.[1]) {
      return stripQuotes(matched[1].trim());
    }
  }

  return stripQuotes(trimmed);
}

function stripQuotes(value: string): string {
  return value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
}

async function fileExists(target: string): Promise<boolean> {
  try {
    const stat = await fs.stat(target);
    return stat.isFile();
  } catch {
    return false;
  }
}
