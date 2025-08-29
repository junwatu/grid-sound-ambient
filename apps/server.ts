import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Request, Response } from 'express';
import { generateMusicBrief, generateMusicPrompt, type SensorSnapshot } from './libs/openai.js';
import { saveMusicGeneration, getMusicGenerations, getMusicGenerationsByZone, type MusicGenerationRecord, initGridDBOnStartup } from './libs/griddb.js';
import { saveAudioFile, generateAudioFilename } from './libs/fileUtils.js';
import { composeMusic } from './libs/elevenlabs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
const PORT = process.env.PORT || (WEB_URL ? new URL(WEB_URL).port || 3000 : 3000);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} not configured`);
  }
  return value;
}

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


// Complete IoT to Music generation flow with database storage
app.post('/api/iot/generate-music', async (req: Request, res: Response) => {
  try {
    const sensorSnapshot: SensorSnapshot = req.body;
    const { music_length_ms = 60000, model_id = "music_v1" } = req.body;

    // Validate required fields
    if (!sensorSnapshot.timestamp || !sensorSnapshot.zone) {
      return res.status(400).json({ error: 'Timestamp and zone are required' });
    }

    // Ensure required services are configured
    requireEnv('OPENAI_API_KEY');

    // Step 1: Generate music brief from sensor data
    console.log('Generating music brief from sensor data...');
    const musicBrief = await generateMusicBrief(sensorSnapshot);

    // Step 2: Convert brief to natural language prompt
    console.log('Converting brief to music prompt...');
    const prompt = await generateMusicPrompt(musicBrief);

    // Step 3: Generate audio using ElevenLabs
    console.log('Generating audio with ElevenLabs...');
    let audioBuffer: ArrayBuffer;
    try {
      audioBuffer = await composeMusic({ prompt, music_length_ms, model_id });
    } catch (e) {
      const status = (e as any)?.status || 500;
      const message = e instanceof Error ? e.message : 'Unknown error';
      return res.status(status).json({ error: message });
    }

    // Step 4: Save audio file
    console.log('Saving audio file...');
    const filename = generateAudioFilename(sensorSnapshot.zone, sensorSnapshot.timestamp);
    const audioPath = await saveAudioFile(audioBuffer, filename);

    // Step 5: Save complete record to GridDB
    console.log('Saving record to GridDB...');
    const musicRecord: MusicGenerationRecord = {
      timestamp: sensorSnapshot.timestamp,
      zone: sensorSnapshot.zone,
      temperature_c: sensorSnapshot.temperature_c || 0,
      humidity_pct: sensorSnapshot.humidity_pct || 0,
      co2_ppm: sensorSnapshot.co2_ppm || 0,
      voc_index: sensorSnapshot.voc_index || 0,
      occupancy: sensorSnapshot.occupancy || 0,
      noise_dba: sensorSnapshot.noise_dba || 0,
      productivity_score: sensorSnapshot.productivity_score || 0,
      trend_10min_co2_ppm_delta: (sensorSnapshot as any)['trend_10min.co2_ppm_delta'] || 0,
      trend_10min_noise_dba_delta: (sensorSnapshot as any)['trend_10min.noise_dba_delta'] || 0,
      trend_10min_productivity_delta: (sensorSnapshot as any)['trend_10min.productivity_delta'] || 0,
      music_brief: JSON.stringify(musicBrief),
      music_prompt: prompt,
      audio_path: audioPath,
      audio_filename: filename,
      music_length_ms,
      model_id,
      generation_timestamp: new Date().toISOString()
    };

    await saveMusicGeneration(musicRecord);

    // Return complete response with metadata
    res.json({
      success: true,
      sensorSnapshot,
      musicBrief,
      prompt,
      audioPath,
      filename,
      music_length_ms,
      model_id,
      generation_timestamp: musicRecord.generation_timestamp,
      message: 'Music generated and saved successfully'
    });

  } catch (error) {
    console.error('Complete music generation flow error:', error);
    res.status(500).json({
      error: 'Failed to complete music generation flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get music generation history
app.get('/api/music/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const zone = req.query.zone as string;

    let records: MusicGenerationRecord[];

    if (zone) {
      records = await getMusicGenerationsByZone(zone, limit);
    } else {
      records = await getMusicGenerations(limit);
    }

    res.json({
      success: true,
      records,
      count: records.length
    });

  } catch (error) {
    console.error('Failed to retrieve music history:', error);
    res.status(500).json({
      error: 'Failed to retrieve music history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Catch-all handler: send back React's index.html file for SPA routing
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialize server with database setup
async function startServer() {
  console.log('🚀 Starting Dynamic Ambient Music Server...');

  // Initialize GridDB on startup
  await initGridDBOnStartup();

  // Start the Express server
  app.listen(PORT, () => {
    console.log(`🌐 Server is running on ${WEB_URL}`);
    console.log('📊 Health check available at: /api/health');
    console.log('🎵 Music generation endpoint: /api/iot/generate-music');
    console.log('📜 History endpoint: /api/music/history');
    console.log('✨ Server startup completed successfully');
  });
}

// Start the server
startServer().catch((error) => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});

export default app;
