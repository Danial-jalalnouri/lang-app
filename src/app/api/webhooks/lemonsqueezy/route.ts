import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { updateUserAccountType } from "@/db/repositories";

function getRawSignature(headers: Headers): string | null {
  return headers.get("x-signature");
}

function getUser_Id(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const meta = (p.meta as Record<string, unknown> | undefined) ?? {};
  const cd1 = meta.custom_data as Record<string, unknown> | undefined;
  if (cd1?.user_id) return String(cd1.user_id);
  const data = (p.data as Record<string, unknown> | undefined) ?? {};
  const attrs = (data.attributes as Record<string, unknown> | undefined) ?? {};
  const cd2 = attrs.custom_data as Record<string, unknown> | undefined;
  if (cd2?.user_id) return String(cd2.user_id);
  const checkout = attrs.checkout_data as Record<string, unknown> | undefined;
  const cd3 = checkout?.custom as Record<string, unknown> | undefined;
  if (cd3?.user_id) return String(cd3.user_id);
  return null;
}

function eventName(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;
  const meta = (p.meta as Record<string, unknown> | undefined) ?? {};
  return String(meta.event_name ?? "");
}

function subscriptionStatus(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;
  const data = (p.data as Record<string, unknown> | undefined) ?? {};
  const attrs = (data.attributes as Record<string, unknown> | undefined) ?? {};
  return String(attrs.status ?? "");
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = getRawSignature(req.headers);
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (hash !== signature) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const userId = getUser_Id(payload);
  if (!userId) {
    return NextResponse.json({ ok: true, ignored: "no user" });
  }

  const event = eventName(payload);
  const status = subscriptionStatus(payload);

  const activeStatuses = new Set(["active", "on_trial", "trialling", "past_due"]);
  const expiredEvents = new Set([
    "subscription_expired",
    "subscription_cancelled",
  ]);

  if (activeStatuses.has(status) || event === "subscription_created" || event === "subscription_resumed") {
    await updateUserAccountType(userId, "super");
  } else if (expiredEvents.has(event) || status === "expired") {
    await updateUserAccountType(userId, "standard");
  }

  return NextResponse.json({ ok: true });
}