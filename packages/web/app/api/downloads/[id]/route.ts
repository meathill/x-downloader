import { promises as fs } from "node:fs";
import path from "node:path";
import { getOutputDir } from "../../../../lib/config";
import { getDatabase } from "../../../../lib/db";

export const runtime = "nodejs";

export async function DELETE(
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
    .get(id) as { id: number; status: string; output_path: string | null } | undefined;

  if (!task) {
    return Response.json({ ok: false, message: "任务不存在。" }, { status: 404 });
  }

  if (task.status === "running") {
    return Response.json({ ok: false, message: "任务正在下载中，无法删除。" }, { status: 409 });
  }

  const outputDir = path.resolve(getOutputDir());
  const outputPrefix = outputDir.endsWith(path.sep) ? outputDir : `${outputDir}${path.sep}`;
  const removal = await removeOutputFile(task.output_path, outputPrefix);

  if (!removal.ok) {
    return Response.json({ ok: false, message: removal.message }, { status: 500 });
  }

  db.prepare("DELETE FROM downloads WHERE id = ?").run(id);

  return Response.json(
    {
      ok: true,
      message: removal.deleted ? "记录与文件已删除。" : "记录已删除（文件不存在）。",
      fileDeleted: removal.deleted
    },
    { status: 200 }
  );
}

type RemovalResult = { ok: true; deleted: boolean } | { ok: false; message: string };

async function removeOutputFile(
  outputPath: string | null,
  outputPrefix: string
): Promise<RemovalResult> {
  if (!outputPath) {
    return { ok: true, deleted: false };
  }

  const resolved = path.resolve(outputPath);
  if (!resolved.startsWith(outputPrefix)) {
    return { ok: false, message: "文件路径不在允许的目录内。" };
  }

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) {
      return { ok: true, deleted: false };
    }
    await fs.unlink(resolved);
    return { ok: true, deleted: true };
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return { ok: true, deleted: false };
    }
    return { ok: false, message: "删除文件失败，请检查权限。" };
  }
}

function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}
