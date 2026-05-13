const audioMimeAliases: Record<string, string> = {
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/aac": "audio/aac",
  "audio/x-aac": "audio/aac",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-pn-wav": "audio/wav"
};

const supportedAudioMimeTypes = new Set([
  "audio/aac",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "audio/ogg"
]);

const extensionMimeTypes: Record<string, string> = {
  aac: "audio/aac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm"
};

export function normalizeAudioMimeType(mimeType: string | null | undefined, fileName?: string) {
  const cleanedMimeType = mimeType?.split(";")[0]?.trim().toLowerCase();
  const normalizedMimeType = cleanedMimeType ? audioMimeAliases[cleanedMimeType] ?? cleanedMimeType : "";

  if (supportedAudioMimeTypes.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  const extension = fileName?.split(".").pop()?.toLowerCase();
  if (extension && extensionMimeTypes[extension]) {
    return extensionMimeTypes[extension];
  }

  return null;
}

