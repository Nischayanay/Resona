import { afterEach, describe, expect, it, vi } from "vitest";

describe("Gemini model fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("retries the default model when a configured model is not found", async () => {
    vi.stubEnv("GOOGLE_AI_MODEL", "gemini-2.5-flash-lite");
    vi.stubEnv("GOOGLE_AI_API_KEY", "test-key");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("model not found", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"answer":"Ready"}' }] } }]
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    vi.resetModules();
    const { answerWithGemini } = await import("@/lib/ai/gemini");
    const answer = await answerWithGemini("Say ready");

    expect(answer).toBe('{"answer":"Ready"}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("/models/gemini-2.5-flash-lite:");
    expect(fetchMock.mock.calls[1][0]).toContain("/models/gemini-3.5-flash-lite:");
  });
});
