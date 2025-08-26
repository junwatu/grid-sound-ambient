import OpenAI from "openai";

// Instantiate once per module/app. Provide OPENAI_API_KEY in env.
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ----------------------------
// Domain Types
// ----------------------------
export interface SensorSnapshot {
    timestamp?: string;
    zone?: string;
    temperature_c?: number;
    humidity_pct?: number;
    co2_ppm?: number;
    voc_index?: number;
    occupancy?: number;
    noise_dba?: number;
    productivity_score?: number;
    // Trend fields (flattened or nested). Keep flexible for real-world payloads
    [key: string]: unknown;
}

export interface MusicBrief {
    mood: string;
    energy: number; // 0–100
    tension: number; // 0–100
    bpm: [number, number]; // [low, high]
    duration_sec: number;
    loopable: boolean;
    key_suggestion?: string;
    instrument_focus: string[];
    texture_notes: string;
    rationale: string;
}

// ----------------------------
// Helpers
// ----------------------------
function extractFirstText(output: any): string | undefined {
    // Defensive extraction against SDK shape changes
    const c0 = output?.output?.[0]?.content?.[0];
    if (c0?.type === "output_text" && typeof c0.text === "string") return c0.text;
    // Some SDKs may expose .output_text directly or aggregate .content into strings
    if (typeof output?.output_text === "string") return output.output_text;
    return undefined;
}

// ----------------------------
// Type Guards / Validation
// ----------------------------
export function isMusicBrief(x: any): x is MusicBrief {
    return (
        x &&
        typeof x.mood === "string" &&
        typeof x.energy === "number" &&
        typeof x.tension === "number" &&
        Array.isArray(x.bpm) && x.bpm.length === 2 &&
        typeof x.bpm[0] === "number" && typeof x.bpm[1] === "number" &&
        typeof x.duration_sec === "number" &&
        typeof x.loopable === "boolean" &&
        Array.isArray(x.instrument_focus) &&
        typeof x.texture_notes === "string" &&
        typeof x.rationale === "string"
    );
}

// ----------------------------
// Reusable Calls
// ----------------------------
export async function generateMusicBrief(
    sensorSnapshot: SensorSnapshot | Record<string, unknown> | string
): Promise<MusicBrief> {
    const systemPrompt = `
You are an assistant that converts building sensor snapshots into a concise “music brief” for an ambient soundtrack generator.
Return ONLY compact JSON with these fields:
{
  "mood": "calm|focused|energizing|soothing|alert|uplifting|neutral",
  "energy": 0-100,
  "tension": 0-100,
  "bpm": [low, high],
  "duration_sec": number,
  "loopable": true|false,
  "key_suggestion": "A minor|D minor|C major|... (optional)",
  "instrument_focus": ["pads","soft piano","light percussion", ...],
  "texture_notes": "short sentence on space/density/brightness",
  "rationale": "1–2 sentences mapping readings→choice"
}

Decision rules:
- High CO2 (>1000 ppm) or high VOC (>200) → lower energy (35–55), soothing/airiness to reduce stress; avoid bright highs.
- High occupancy (>25) with good air (CO2 < 800) → moderate energy (55–70) and gentle momentum; keep distractions low (no sharp transients).
- High noise (>60 dBA) → simpler textures, fewer rhythmic accents; tighten BPM range.
- Productivity_score < 60 → light uplift (energy +10), but stay minimal.
- Temperature 22–24°C & humidity 45–55% is ideal; if outside, reduce tension slightly and favor warm timbres.
Prefer keys: minor for calming/focus, major for uplifting.
Keep outputs steady and minimal; no reactivity to single-sample spikes—assume 10–15 min trend.
`;

    const userPayload =
        typeof sensorSnapshot === "string"
            ? sensorSnapshot
            : JSON.stringify(sensorSnapshot);

    const response = await openai.responses.create({
        model: "gpt-5-mini",
        input: [
            { role: "developer", content: [{ type: "input_text", text: systemPrompt }] },
            { role: "user", content: [{ type: "input_text", text: userPayload }] },
        ],
        text: { format: { type: "text" }, verbosity: "medium" },
        reasoning: { effort: "medium", summary: "auto" },
        store: false,
    } as any);

    const outputText = extractFirstText(response);
    if (!outputText) {
        throw new Error("Model returned no text for music brief.");
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(outputText);
    } catch (err) {
        const snippet = outputText.slice(0, 300);
        throw new Error(`Failed to parse music brief JSON. First 300 chars: 
${snippet}`);
    }

    if (!isMusicBrief(parsed)) {
        const snippet = outputText.slice(0, 300);
        throw new Error(`Model output didn't match MusicBrief shape. First 300 chars: 
${snippet}`);
    }

    return parsed;
}

export async function generateMusicPrompt(brief: MusicBrief): Promise<string> {
    const systemPrompt = `
You convert an internal JSON "music brief" into a concise prompt for a generative music API.

Rules:
- Output 3–5 short lines, max ~450 characters total.
- No meta commentary, no JSON, no emojis.
- Include: mood, energy/tension, BPM range, duration, loopable flag, (optional) key, instruments, texture, goal.
- Avoid sharp/bright transients when asked; keep language precise and production-safe.
- Never invent values not present in the brief; default only when missing.

Example:

"Ambient track for a focused open office. Mood: focused, energy 62/100, tension 35/100.
Tempo: 84–92 BPM, loopable, ~240s. Key: D minor.
Instruments: warm pads, soft piano, light shaker, subtle bass.
Texture: low-density, gentle movement, softened highs; avoid sharp transients and bright cymbals.
Goal: steady momentum that supports concentration without masking speech."
`;

    const response = await openai.responses.create({
        model: "gpt-5-mini",
        input: [
            { role: "developer", content: [{ type: "input_text", text: systemPrompt }] },
            { role: "user", content: [{ type: "input_text", text: JSON.stringify(brief, null, 2) }] },
        ],
        text: { format: { type: "text" }, verbosity: "medium" },
        reasoning: { effort: "medium", summary: "auto" },
        store: false,
    } as any);

    const outputText = extractFirstText(response);
    if (!outputText) throw new Error("No output generated from model.");
    return outputText.trim();
}

