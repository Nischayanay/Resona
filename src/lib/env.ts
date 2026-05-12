function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  googleClientId: () => required("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => required("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: () => required("GOOGLE_REDIRECT_URI"),
  googleAiApiKey: () => required("GOOGLE_AI_API_KEY"),
  encryptionKey: () => required("ENCRYPTION_KEY"),
  appUrl: () => process.env.APP_URL ?? "http://localhost:3000"
};
