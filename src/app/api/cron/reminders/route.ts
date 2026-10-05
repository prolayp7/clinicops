import { timingSafeEqual } from "node:crypto";
import { processDueReminders } from "@/server/services/reminder-service";

function isAuthorized(request: Request, secret: string): boolean {
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "Reminder processing is not configured." }, { status: 503 });
  }
  if (!isAuthorized(request, secret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const processed = await processDueReminders();
    return Response.json({ processed });
  } catch {
    return Response.json({ error: "Reminder processing failed." }, { status: 500 });
  }
}
