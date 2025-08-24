import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function App() {
  const [prompt, setPrompt] = useState('')

  const handleCreateMusic = () => {
    console.log('Creating music with prompt:', prompt)
    // TODO: Implement music creation logic
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
              disabled={!prompt.trim()}
            >
              Create Music
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
