import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Request, Response } from 'express';
import { generateMusicBrief, generateMusicPrompt, type SensorSnapshot } from './libs/openai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const WEB_URL = process.env.WEB_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/sensor/generate-prompt', async (req: Request, res: Response) => {
  try {
    const sensorSnapshot: SensorSnapshot = req.body;
    
    // Validate required fields
    if (!sensorSnapshot.timestamp || !sensorSnapshot.zone) {
      return res.status(400).json({ error: 'Timestamp and zone are required' });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Generate music brief from sensor data
    const musicBrief = await generateMusicBrief(sensorSnapshot);
    
    // Convert brief to natural language prompt
    const prompt = await generateMusicPrompt(musicBrief);
    
    res.json({
      sensorSnapshot,
      musicBrief,
      prompt,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Prompt generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate music prompt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/music/compose', async (req: Request, res: Response) => {
  try {
    const { prompt, music_length_ms = 60000, model_id = "music_v1" } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    const response = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        music_length_ms,
        model_id
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    // The response is audio data, not JSON
    const audioBuffer = await response.arrayBuffer();

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength.toString(),
      'Content-Disposition': 'attachment; filename="generated-music.mp3"'
    });

    // Send the audio data
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('Music composition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch-all handler: send back React's index.html file for SPA routing
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on ${WEB_URL}`);
});

export default app;