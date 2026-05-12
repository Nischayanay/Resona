import { task } from "@trigger.dev/sdk/v3";
import { processConversationSession } from "@/lib/processing/process-session";
import type { ProcessingPayload } from "@/lib/types";

export const processConversationSessionTask = task({
  id: "process-conversation-session",
  run: async (payload: ProcessingPayload) => {
    await processConversationSession(payload);
  }
});
