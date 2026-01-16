import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import type { CliOptions } from "../src/args.ts";
import { buildYtDlpCommand } from "../src/yt-dlp.ts";

const BASE_OPTIONS: CliOptions = {
  url: "https://x.com/user/status/123",
  outputDir: "/tmp/x-downloader",
  filename: undefined,
  format: undefined,
  listFormats: false,
  cookies: undefined,
  proxy: undefined,
  userAgent: undefined,
  quiet: false,
  dryRun: false,
  help: false,
  version: false
};

test("buildYtDlpCommand: 默认模板", () => {
  const command = buildYtDlpCommand(BASE_OPTIONS);
  const outputIndex = command.args.indexOf("-o");
  const outputTemplate = command.args[outputIndex + 1];
  const formatIndex = command.args.indexOf("-f");
  const formatValue = command.args[formatIndex + 1];

  assert.equal(outputTemplate, path.join(BASE_OPTIONS.outputDir, "%(title)s.%(ext)s"));
  assert.equal(formatValue, "best");
  assert.ok(command.args.includes("--no-playlist"));
});

test("buildYtDlpCommand: filename 覆盖", () => {
  const options: CliOptions = { ...BASE_OPTIONS, filename: "demo.mp4" };
  const command = buildYtDlpCommand(options);
  const outputIndex = command.args.indexOf("-o");
  const outputTemplate = command.args[outputIndex + 1];

  assert.equal(outputTemplate, path.join(BASE_OPTIONS.outputDir, "demo.mp4"));
});

test("buildYtDlpCommand: listFormats", () => {
  const options: CliOptions = { ...BASE_OPTIONS, listFormats: true };
  const command = buildYtDlpCommand(options);

  assert.ok(command.args.includes("-F"));
  assert.ok(!command.args.includes("-f"));
});
