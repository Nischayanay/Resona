import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "proj_resona_local",
  runtime: "node",
  maxDuration: 600,
  logLevel: "log",
  dirs: ["./src/trigger"]
});
