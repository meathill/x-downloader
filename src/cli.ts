#!/usr/bin/env node

import process from "node:process";
import { parseCliArgs } from "./args.ts";
import { ensureOutputDir } from "./fs.ts";
import { getHelpText } from "./help.ts";
import { VERSION } from "./version.ts";
import { buildYtDlpCommand, runYtDlp } from "./yt-dlp.ts";

const EXIT_CODE_ERROR = 1;
const EXIT_CODE_MISSING_DEP = 2;

async function main(): Promise<void> {
  const { options, errors } = parseCliArgs(process.argv.slice(2));

  if (options.version) {
    console.log(VERSION);
    return;
  }

  if (options.help) {
    console.log(getHelpText());
    return;
  }

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    console.error("");
    console.error(getHelpText());
    process.exitCode = EXIT_CODE_ERROR;
    return;
  }

  try {
    const outputDir = await ensureOutputDir(options.outputDir);
    const normalizedOptions = { ...options, outputDir };
    const command = buildYtDlpCommand(normalizedOptions);

    if (options.dryRun) {
      console.log(command.display);
      return;
    }

    const code = await runYtDlp(command);
    if (code !== 0) {
      process.exitCode = code;
    }
  } catch (error) {
    handleError(error);
  }
}

function handleError(error: unknown): void {
  if (isErrnoException(error) && error.code === "ENOENT") {
    console.error("未找到 yt-dlp，请先安装并确保命令可用。参考: https://github.com/yt-dlp/yt-dlp");
    process.exitCode = EXIT_CODE_MISSING_DEP;
    return;
  }

  if (error instanceof Error) {
    console.error(error.message);
    process.exitCode = EXIT_CODE_ERROR;
    return;
  }

  console.error("发生未知错误。");
  process.exitCode = EXIT_CODE_ERROR;
}

function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}

void main();
