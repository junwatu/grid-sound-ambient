import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface MusicGenerationRecord {
  timestamp: string;
  zone: string;
  temperature_c: number;
  humidity_pct: number;
  co2_ppm: number;
  voc_index: number;
  occupancy: number;
  noise_dba: number;
  productivity_score: number;
  trend_10min_co2_ppm_delta: number;
  trend_10min_noise_dba_delta: number;
  trend_10min_productivity_delta: number;
  music_brief: string;
  music_prompt: string;
  audio_path: string;
  audio_filename: string;
  music_length_ms: number;
  model_id: string;
  generation_timestamp: string;
}

interface MusicHistoryProps {
  isVisible: boolean;
  onClose: () => void;
}

export function MusicHistory({ isVisible, onClose }: MusicHistoryProps) {
  const [records, setRecords] = useState<MusicGenerationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // @ts-ignore
  const [selectedZone, setSelectedZone] = useState<string>('');

  const fetchHistory = async (zone?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = zone 
        ? `/api/music/history?zone=${encodeURIComponent(zone)}&limit=50`
        : '/api/music/history?limit=50';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch history');
      }
      
      const data = await response.json();
      setRecords(data.records);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchHistory();
    }
  }, [isVisible]);


  // @ts-ignore
  const handleZoneFilter = (zone: string) => {
    setSelectedZone(zone);
    fetchHistory(zone || undefined);
  };

  // @ts-ignore
  const getUniqueZones = () => {
    const zones = records.map(record => record.zone);
    return [...new Set(zones)];
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Music Generation History</h2>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
          
          {/*
          <div className="flex space-x-2 mb-4">
            <Button
              variant={selectedZone === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleZoneFilter('')}
            >
              All Zones
            </Button>
            {getUniqueZones().map(zone => (
              <Button
                key={zone}
                variant={selectedZone === zone ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleZoneFilter(zone)}
              >
                {zone}
              </Button>
            ))}
          </div>
          */}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading && (
            <div className="text-center py-8">
              <p>Loading history...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {!loading && !error && records.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No music generation records found.</p>
            </div>
          )}

          {!loading && records.length > 0 && (
            <div className="space-y-4">
              {records.map((record, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{record.zone}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(record.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Generated: {new Date(record.generation_timestamp).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>Temp: {record.temperature_c}°C</div>
                        <div>Humidity: {record.humidity_pct}%</div>
                        <div>CO2: {record.co2_ppm} ppm</div>
                        <div>Occupancy: {record.occupancy}</div>
                        <div>Noise: {record.noise_dba} dBA</div>
                        <div>Productivity: {record.productivity_score}</div>
                      </div>
                    </div>
                    
                    <div>
                      <audio controls className="w-full mb-2">
                        <source src={record.audio_path} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                      <div className="text-xs text-gray-500">
                        <div>File: {record.audio_filename}</div>
                        <div>Duration: {record.music_length_ms / 1000}s</div>
                        <div>Model: {record.model_id}</div>
                      </div>
                    </div>
                  </div>
                  
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700">
                      View Music Prompt & Brief
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                      <div className="mb-3">
                        <strong>Prompt:</strong>
                        <p className="mt-1 text-gray-700">{record.music_prompt}</p>
                      </div>
                      <div>
                        <strong>Brief:</strong>
                        <pre className="mt-1 text-xs text-gray-600 overflow-auto">
                          {JSON.stringify(JSON.parse(record.music_brief), null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}