import { buildHealthReport } from '../../../lib/health';
import { jsonNoStore } from '../../../lib/http';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const report = await buildHealthReport();
  return jsonNoStore(report, { status: report.ok ? 200 : 503 });
}
