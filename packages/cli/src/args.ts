import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

export type CliOptions = {
  url?: string;
  outputDir: string;
  filename?: string;
  format?: string;
  listFormats: boolean;
  cookies?: string;
  proxy?: string;
  userAgent?: string;
  quiet: boolean;
  dryRun: boolean;
  help: boolean;
  version: boolean;
};

export type ParseResult = {
  options: CliOptions;
  errors: string[];
};

type RawValues = {
  output?: string;
  filename?: string;
  format?: string;
  listFormats?: boolean;
  cookies?: string;
  proxy?: string;
  userAgent?: string;
  quiet?: boolean;
  dryRun?: boolean;
  help?: boolean;
  version?: boolean;
};

const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), "Downloads");

export function parseCliArgs(argv: string[]): ParseResult {
  const parsed = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      output: { type: "string", short: "o" },
      filename: { type: "string", short: "n" },
      format: { type: "string", short: "f" },
      listFormats: { type: "boolean", short: "F" },
      cookies: { type: "string" },
      proxy: { type: "string" },
      userAgent: { type: "string" },
      quiet: { type: "boolean", short: "q" },
      dryRun: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" }
    }
  });

  const values = parsed.values as RawValues;
  const errors: string[] = [];

  const outputDir = normalizeStringOption(values.output) ?? DEFAULT_OUTPUT_DIR;
  const filename = normalizeStringOption(values.filename);
  const format = normalizeStringOption(values.format);
  const cookies = normalizeStringOption(values.cookies);
  const proxy = normalizeStringOption(values.proxy);
  const userAgent = normalizeStringOption(values.userAgent);

  if (outputDir.trim().length === 0) {
    errors.push("输出目录不能为空。请使用 -o 或 --output 指定目录。")
  }

  if (filename !== undefined && filename.trim().length === 0) {
    errors.push("文件名不能为空。请使用 -n 或 --filename 指定文件名。")
  }

  if (format !== undefined && format.trim().length === 0) {
    errors.push("格式不能为空。请使用 -f 或 --format 指定格式。")
  }

  const help = values.help ?? false;
  const version = values.version ?? false;

  const positionals = parsed.positionals;
  let url = positionals[0];

  if (!help && !version) {
    if (positionals.length === 0) {
      errors.push("缺少视频链接。请提供一条 X 视频链接。")
    } else if (positionals.length > 1) {
      errors.push("当前仅支持一个链接。请只提供一个 X 视频链接。")
    }

    if (url && !isHttpUrl(url)) {
      errors.push("链接格式不正确，请使用 http(s) 开头的链接。")
    }
  }

  if (positionals.length === 0) {
    url = undefined;
  }

  const options: CliOptions = {
    url,
    outputDir,
    filename,
    format,
    listFormats: values.listFormats ?? false,
    cookies,
    proxy,
    userAgent,
    quiet: values.quiet ?? false,
    dryRun: values.dryRun ?? false,
    help,
    version
  };

  return { options, errors };
}

function normalizeStringOption(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value.trim();
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
