export type DevThread = { id: string; title: string; plan: string; created_at: string; updated_at: string };
export type DevMessage = { id: string; role: "user" | "assistant"; content: string; references_json: unknown[]; created_at: string };

const now = new Date().toISOString();
export const devThreads: DevThread[] = [{ id: "local-dev-thread", title: "New chat", plan: "free", created_at: now, updated_at: now }];
export const devMessages = new Map<string, DevMessage[]>();
