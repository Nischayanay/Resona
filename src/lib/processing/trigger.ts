import { tasks } from "@trigger.dev/sdk";
import { processConversationSessionTask } from "@/trigger/process-conversation";
import type { ProcessingPayload } from "@/lib/types";

export async function triggerConversationProcessing(payload: ProcessingPayload) {
  return tasks.trigger<typeof processConversationSessionTask>("process-conversation-session", payload);
}
