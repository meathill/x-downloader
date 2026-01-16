import { enqueueDownload, startQueueProcessing } from "../../../lib/queue";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, message: "x-downloader api" });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);

  if (!isRecord(body)) {
    return Response.json({ ok: false, message: "请求体不正确。" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url : "";
  const filename = typeof body.filename === "string" ? body.filename : undefined;
  const format = typeof body.format === "string" ? body.format : undefined;

  const result = enqueueDownload({ url, filename, format });
  startQueueProcessing();

  const ok = result.httpStatus < 400;

  return Response.json(
    {
      ok,
      accepted: result.accepted,
      message: result.message,
      task: result.taskId ? { id: result.taskId, status: result.status } : undefined,
      logs: []
    },
    { status: result.httpStatus }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
