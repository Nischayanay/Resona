import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "proj_resona_local",
  runtime: "node-22",
  maxDuration: 600,
  logLevel: "log",
  dirs: ["./src/trigger"]
});
