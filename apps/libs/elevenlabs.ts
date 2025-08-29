export interface ComposeParams {
  prompt: string;
  music_length_ms?: number;
  model_id?: string;
  apiKey?: string;
}

// Compose music via ElevenLabs Music API and return raw audio buffer
export async function composeMusic({
  prompt,
  music_length_ms = 60000,
  model_id = "music_v1",
  apiKey = process.env.ELEVENLABS_API_KEY,
}: ComposeParams): Promise<ArrayBuffer> {
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const response = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, music_length_ms, model_id }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const err: any = new Error(`ElevenLabs API error: ${errorText}`);
    err.status = response.status;
    throw err;
  }

  return await response.arrayBuffer();
}
