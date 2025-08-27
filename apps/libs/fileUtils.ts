import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create audio directory if it doesn't exist
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');

export function ensureAudioDirectory(): void {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

// Generate unique filename for audio file
export function generateAudioFilename(zone: string, timestamp: string): string {
  const cleanZone = zone.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cleanTimestamp = new Date(timestamp).toISOString().replace(/[:.]/g, '-');
  return `${cleanZone}_${cleanTimestamp}.mp3`;
}

// Save audio buffer to file
export async function saveAudioFile(audioBuffer: ArrayBuffer, filename: string): Promise<string> {
  ensureAudioDirectory();
  
  const filePath = path.join(AUDIO_DIR, filename);
  const buffer = Buffer.from(audioBuffer);
  
  await fs.promises.writeFile(filePath, buffer);
  
  // Return relative path for serving
  return `/audio/${filename}`;
}

// Get full file path for audio file
export function getAudioFilePath(filename: string): string {
  return path.join(AUDIO_DIR, filename);
}

// Check if audio file exists
export function audioFileExists(filename: string): boolean {
  const filePath = path.join(AUDIO_DIR, filename);
  return fs.existsSync(filePath);
}