import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseCliArgs } from "../src/args.ts";

const SAMPLE_URL = "https://x.com/user/status/123";

test("parseCliArgs: 默认值与链接", () => {
  const result = parseCliArgs([SAMPLE_URL]);

  assert.equal(result.errors.length, 0);
  assert.equal(result.options.url, SAMPLE_URL);
  assert.equal(result.options.outputDir, path.join(os.homedir(), "Downloads"));
  assert.equal(result.options.listFormats, false);
});

test("parseCliArgs: 缺少链接", () => {
  const result = parseCliArgs([]);

  assert.ok(result.errors.length > 0);
  assert.equal(result.options.url, undefined);
});

test("parseCliArgs: help 跳过校验", () => {
  const result = parseCliArgs(["--help"]);

  assert.equal(result.errors.length, 0);
  assert.equal(result.options.help, true);
});

test("parseCliArgs: 非 http 链接", () => {
  const result = parseCliArgs(["x.com/user/status/123"]);

  assert.ok(result.errors.length > 0);
});
