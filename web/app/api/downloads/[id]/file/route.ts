import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { getOutputDir } from "../../../../../lib/config";
import { getDatabase } from "../../../../../lib/db";

export const runtime = "nodejs";

type TaskRow = {
  id: number;
  status: string;
  output_path: string | null;
};

export async function GET(
  _request: Request,
  context: { params: { id: string } }
): Promise<Response> {
  const id = Number.parseInt(context.params.id, 10);
  if (!Number.isFinite(id)) {
    return Response.json({ ok: false, message: "任务 ID 不正确。" }, { status: 400 });
  }

  const db = getDatabase();
  const task = db
    .prepare("SELECT id, status, output_path FROM downloads WHERE id = ?")
    .get(id) as TaskRow | undefined;

  if (!task) {
    return Response.json({ ok: false, message: "任务不存在。" }, { status: 404 });
  }

  if (task.status !== "done") {
    return Response.json({ ok: false, message: "任务未完成，无法下载。" }, { status: 409 });
  }

  if (!task.output_path) {
    return Response.json({ ok: false, message: "未记录文件路径。" }, { status: 404 });
  }

  const outputDir = path.resolve(getOutputDir());
  const outputPrefix = outputDir.endsWith(path.sep) ? outputDir : `${outputDir}${path.sep}`;
  const resolvedPath = path.resolve(task.output_path);

  if (!resolvedPath.startsWith(outputPrefix)) {
    return Response.json({ ok: false, message: "文件路径不在允许的目录内。" }, { status: 403 });
  }

  const fileInfo = await getFileInfo(resolvedPath);
  if (!fileInfo) {
    return Response.json({ ok: false, message: "文件不存在。" }, { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(resolvedPath)) as ReadableStream;
  const headers = new Headers();
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Content-Length", fileInfo.size.toString());
  headers.set("Content-Disposition", buildContentDisposition(fileInfo.filename));

  return new Response(stream, { status: 200, headers });
}

type FileInfo = {
  filename: string;
  size: number;
};

async function getFileInfo(filePath: string): Promise<FileInfo | null> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return null;
    }
    return { filename: path.basename(filePath), size: stat.size };
  } catch {
    return null;
  }
}

function buildContentDisposition(filename: string): string {
  const safeFilename = filename.replace(/\"/g, "");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename=\"${safeFilename}\"; filename*=UTF-8''${encoded}`;
}
