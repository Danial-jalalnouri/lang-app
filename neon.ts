import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: false,
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Production branch: no tuning, uses the project defaults.
      // (Neon's free plan does not allow marking branches as protected, so
      // guard the production branch manually — never run `neon reset` on it.)
      return {};
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
