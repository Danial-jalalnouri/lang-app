import { SettingsPanel } from "./settings-panel";

export default function SettingsPage() {
  const branch = process.env.NEON_BRANCH ?? "production";
  return <SettingsPanel dbLabel={`Neon Postgres — branch "${branch}"`} />;
}
