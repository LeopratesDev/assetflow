import { request } from "@playwright/test";

const RENDER_API = "https://it-asset-manager-il7e.onrender.com";

async function warmupRender() {
  console.log("\n[setup] Warming up Render API (may take ~30s on cold start)...");
  const ctx = await request.newContext({ baseURL: RENDER_API });
  const start = Date.now();
  let ready = false;

  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const res = await ctx.get("/api/v1/categories?page=1&page_size=1", { timeout: 10000 });
      if (res.status() < 500) {
        ready = true;
        break;
      }
    } catch {
      // still waking up
    }
    console.log(`[setup] Attempt ${attempt}/8 — waiting for API...`);
    await new Promise((r) => setTimeout(r, 5000));
  }

  await ctx.dispose();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  if (ready) {
    console.log(`[setup] API ready in ${elapsed}s ✓\n`);
  } else {
    console.warn(`[setup] API did not respond after ${elapsed}s — tests may be flaky\n`);
  }
}

export default warmupRender;
