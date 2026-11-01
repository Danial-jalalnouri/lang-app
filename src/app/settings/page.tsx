import { Suspense } from "react";
import { connection } from "next/server";
import { SettingsPanel } from "./settings-panel";
import { Card, PageHeader } from "@/components/ui";
import { requireUserId } from "@/lib/authz";
import { getUser } from "@/db/repositories";
import { cancelSubscription } from "@/app/actions";

export default function SettingsPage() {
  const branch = process.env.NEON_BRANCH ?? "production";
  return (
    <div className="space-y-6">
      <SettingsPanel dbLabel={`Neon Postgres — branch "${branch}"`} />
      <Suspense fallback={null}>
        <SubscriptionSection />
      </Suspense>
    </div>
  );
}

async function SubscriptionSection() {
  await connection();
  const userId = await requireUserId();
  const user = await getUser(userId);
  if (!user?.lemonSubscriptionId) return null;

  const status = user.subscriptionStatus ?? "unknown";
  const active = status === "active" || status === "on_trial" || status === "trialling" || status === "past_due";

  return (
    <Card>
      <PageHeader title="Subscription" subtitle="Manage your Lemon Squeezy subscription." />
      <dl className="space-y-1 text-sm text-zinc-600">
        <div className="flex justify-between">
          <dt>Status</dt>
          <dd className="font-medium">{status}</dd>
        </div>
        {user.subscriptionEndsAt && (
          <div className="flex justify-between">
            <dt>{status === "cancelled" ? "Access until" : "Renews"}</dt>
            <dd>{new Date(user.subscriptionEndsAt).toLocaleDateString()}</dd>
          </div>
        )}
      </dl>
      {active && (
        <form action={cancelSubscription} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Cancel subscription
          </button>
          <p className="mt-2 text-xs text-zinc-400">
            Cancels at the end of the current billing period; you keep access until then.
          </p>
        </form>
      )}
      {status === "cancelled" && (
        <p className="mt-3 text-sm text-zinc-500">
          Your subscription is cancelled and will end on the date above.
        </p>
      )}
    </Card>
  );
}