import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface SensorSnapshot {
  timestamp: string;
  zone: string;
  temperature_c: number;
  humidity_pct: number;
  co2_ppm: number;
  voc_index: number;
  occupancy: number;
  noise_dba: number;
  productivity_score: number;
  "trend_10min.co2_ppm_delta": number;
  "trend_10min.noise_dba_delta": number;
  "trend_10min.productivity_delta": number;
}

interface MusicBrief {
  mood: string;
  energy: number;
  tension: number;
  bpm: [number, number];
  duration_sec: number;
  loopable: boolean;
  key_suggestion?: string;
  instrument_focus: string[];
  texture_notes: string;
  rationale: string;
}

function App() {
  const [sensorInput, setSensorInput] = useState('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [isCreatingMusic, setIsCreatingMusic] = useState(false)
  const [musicBrief, setMusicBrief] = useState<MusicBrief | null>(null)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGeneratePrompt = async () => {
    if (!sensorInput.trim()) return

    setIsGeneratingPrompt(true)
    setError(null)
    setMusicBrief(null)
    setGeneratedPrompt(null)
    setResult(null)

    try {
      const sensorSnapshot: SensorSnapshot = JSON.parse(sensorInput.trim())

      const response = await fetch('/api/sensor/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sensorSnapshot)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate prompt')
      }

      const data = await response.json()
      setMusicBrief(data.musicBrief)
      setGeneratedPrompt(data.prompt)
      console.log('Prompt generated successfully:', data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error generating prompt:', err)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const handleCreateMusic = async () => {
    if (!generatedPrompt) return

    setIsCreatingMusic(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/music/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: generatedPrompt,
          music_length_ms: 60000,
          model_id: "music_v1"
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create music')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      setResult({ audioUrl, size: audioBlob.size })
      console.log('Music created successfully, size:', audioBlob.size)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error creating music:', err)
    } finally {
      setIsCreatingMusic(false)
    }
  }

  const loadExampleSensor = () => {
    const example = {
      timestamp: "2025-01-28T12:05:00",
      zone: "Cafeteria",
      temperature_c: 25.9,
      humidity_pct: 56,
      co2_ppm: 880,
      voc_index: 150,
      occupancy: 38,
      noise_dba: 66,
      productivity_score: 58,
      "trend_10min.co2_ppm_delta": 90,
      "trend_10min.noise_dba_delta": 6,
      "trend_10min.productivity_delta": -8
    }
    setSensorInput(JSON.stringify(example, null, 2))
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-8">Dynamic Ambient Music</h1>
        <p className="text-center text-gray-600 mb-8">Generate ambient music from building sensor data</p>

        <div className="space-y-6">
          {/* Step 1: Sensor Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">1. Sensor Data Input</h2>
              <Button variant="outline" onClick={loadExampleSensor}>
                Load Example
              </Button>
            </div>
            <Textarea
              placeholder="Paste sensor snapshot JSON here..."
              className="min-h-[200px] resize-none font-mono text-sm"
              value={sensorInput}
              onChange={(e) => setSensorInput(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleGeneratePrompt}
                disabled={!sensorInput.trim() || isGeneratingPrompt}
              >
                {isGeneratingPrompt ? 'Generating Prompt...' : 'Generate Music Prompt'}
              </Button>
            </div>
          </div>

          {/* Step 2: Generated Prompt */}
          {generatedPrompt && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">2. Generated Music Prompt</h2>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 whitespace-pre-wrap">{generatedPrompt}</p>
              </div>
              {musicBrief && (
                <details className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <summary className="cursor-pointer font-medium text-gray-700">View Music Brief Details</summary>
                  <pre className="mt-2 text-sm text-gray-600 overflow-auto">
                    {JSON.stringify(musicBrief, null, 2)}
                  </pre>
                </details>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateMusic}
                  disabled={isCreatingMusic}
                >
                  {isCreatingMusic ? 'Creating Music...' : 'Create Music'}
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {/* Step 3: Generated Music */}
          {result && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">3. Generated Music</h2>
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-600 mb-3">Music created successfully!</p>
                <p className="text-sm text-gray-600 mb-3">Size: {(result.size / 1024).toFixed(1)} KB</p>
                <audio controls className="w-full mb-3">
                  <source src={result.audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <div>
                  <a
                    href={result.audioUrl}
                    download="generated-music.mp3"
                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    Download MP3
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
