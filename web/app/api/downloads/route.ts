import { getDatabase } from "../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = normalizeLimit(limitParam);

  const db = getDatabase();
  const rows = db
    .prepare(
      "SELECT id, url, filename, format, output_path, status, created_at, updated_at, started_at, finished_at, error FROM downloads ORDER BY created_at DESC LIMIT ?"
    )
    .all(limit);

  return Response.json({ ok: true, items: rows }, { status: 200 });
}

function normalizeLimit(value: string | null): number {
  if (!value) {
    return 50;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(parsed, 200);
}
