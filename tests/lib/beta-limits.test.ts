import { describe, expect, it } from "vitest";
import {
  BETA_MAX_AUDIO_BYTES,
  BETA_REPROCESSES_PER_SESSION_PER_DAY,
  BETA_UPLOADS_PER_USER_PER_DAY,
  countReprocessAttemptsToday,
  isActiveProcessingStatus,
  isAudioWithinBetaSize,
  startOfTodayInIndia
} from "@/lib/beta-limits";

describe("beta limits", () => {
  it("caps demo uploads at two per user per day", () => {
    expect(BETA_UPLOADS_PER_USER_PER_DAY).toBe(2);
  });

  it("uses Asia/Kolkata day boundaries for daily quotas", () => {
    expect(startOfTodayInIndia(new Date("2026-05-17T10:00:00.000Z"))).toBe("2026-05-16T18:30:00.000Z");
  });

  it("enforces a 15MB audio file cap", () => {
    expect(BETA_MAX_AUDIO_BYTES).toBe(15 * 1024 * 1024);
    expect(isAudioWithinBetaSize(15 * 1024 * 1024)).toBe(true);
    expect(isAudioWithinBetaSize(15 * 1024 * 1024 + 1)).toBe(false);
  });

  it("blocks reprocessing sessions that are already in the pipeline", () => {
    expect(isActiveProcessingStatus("queued")).toBe(true);
    expect(isActiveProcessingStatus("transcribing")).toBe(true);
    expect(isActiveProcessingStatus("completed")).toBe(false);
    expect(isActiveProcessingStatus("failed")).toBe(false);
  });

  it("allows one actual reprocess per session per India day", () => {
    expect(BETA_REPROCESSES_PER_SESSION_PER_DAY).toBe(1);
    expect(
      countReprocessAttemptsToday({
        jobsToday: 1,
        sessionCreatedAt: "2026-05-17T05:00:00.000Z",
        dayStart: "2026-05-16T18:30:00.000Z"
      })
    ).toBe(0);
    expect(
      countReprocessAttemptsToday({
        jobsToday: 2,
        sessionCreatedAt: "2026-05-17T05:00:00.000Z",
        dayStart: "2026-05-16T18:30:00.000Z"
      })
    ).toBe(1);
  });
});
