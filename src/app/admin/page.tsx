import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader, Card } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listUsers } from "@/db/repositories";
import { setUserAccountType } from "@/app/actions";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-40 rounded-xl bg-zinc-200" />}>
      <AdminView />
    </Suspense>
  );
}

async function AdminView() {
  await connection();
  await requireAdmin();
  const users = await listUsers();

  return (
    <div>
      <PageHeader title="Admin · Users" subtitle={`${users.length} user${users.length === 1 ? "" : "s"} in database`} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Username</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const nextType = u.accountType === "super" ? "standard" : "super";
              const action = setUserAccountType.bind(null, u.id, nextType);
              return (
              <tr key={u.id} className="border-t border-zinc-100">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    {u.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.imageUrl} alt="" className="h-6 w-6 rounded-full" />
                    ) : null}
                    <span>{[u.firstName, u.lastName].filter(Boolean).join(" ") || u.id}</span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-zinc-600">{u.email ?? "—"}</td>
                <td className="py-2 pr-4 text-zinc-600">{u.username ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span className="mr-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {u.accountType}
                  </span>
                  <form action={action} className="inline">
                    <button
                      type="submit"
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {u.accountType === "super" ? "Make standard" : "Make super"}
                    </button>
                  </form>
                </td>
                <td className="py-2 pr-4 text-zinc-500">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                </td>
              </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-zinc-400">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}