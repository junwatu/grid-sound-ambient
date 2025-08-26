import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function App() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreateMusic = async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/music/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
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
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8">Dynamic Ambient Music</h1>
        <div className="space-y-4">
          <Textarea
            placeholder="Describe the music you want to create..."
            className="min-h-[200px] resize-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleCreateMusic}
              disabled={!prompt.trim() || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Music'}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-600">Music created successfully!</p>
              <p className="text-sm text-gray-600 mb-3">Size: {(result.size / 1024).toFixed(1)} KB</p>
              <audio controls className="w-full">
                <source src={result.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              <div className="mt-2">
                <a 
                  href={result.audioUrl} 
                  download="generated-music.mp3"
                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  Download MP3
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
