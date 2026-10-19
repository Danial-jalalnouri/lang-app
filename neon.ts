import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: false,
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Production branch: protected so it can never be deleted or reset by
      // accident. Preview branches are cloned from it, which still works.
      return { protected: true };
    }
    if (!branch.exists) {
      // New non-default branches (preview/*, created by
      // .github/workflows/neon-preview.yml): throwaway copies of production.
      // Auto-expire so preview databases do not pile up.
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
