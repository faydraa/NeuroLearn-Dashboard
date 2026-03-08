import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const GAIN = 1; // try 1, then 2 or 5 if needed

export type RawEEGSample = {
  timestamp: number;
  tp9: number;
  af7: number;
  af8: number;
  tp10: number;
};

type WaveformPoint = {
  index: number;
  tp9: number;
  af7: number;
  af8: number;
  tp10: number;
};

type EEGWaveformProps = {
  waveformData: RawEEGSample[];
};

export function EEGWaveform({ waveformData }: EEGWaveformProps) {
  const WINDOW_SIZE = 256; // ~1 second at 256Hz

  const [windowData, setWindowData] = useState<WaveformPoint[]>([]);
  const [lastProcessedTs, setLastProcessedTs] = useState<number>(0);

  useEffect(() => {
    if (!waveformData || waveformData.length === 0) return;

    const newSamples = waveformData.filter((s) => s.timestamp > lastProcessedTs);
    if (newSamples.length === 0) return;

    setWindowData((prev) => {
      let updated = [...prev];
      let idx = updated.length > 0 ? updated[updated.length - 1].index : 0;

      for (const s of newSamples) {
        idx += 1;

        const newPoint: WaveformPoint = {
          index: idx,
          tp9: clamp(s.tp9 * GAIN, -500, 500),
          af7: clamp(s.af7 * GAIN, -500, 500),
          af8: clamp(s.af8 * GAIN, -500, 500),
          tp10: clamp(s.tp10 * GAIN, -500, 500),
        };

        updated.push(newPoint);

        if (updated.length > WINDOW_SIZE) {
          updated = updated.slice(updated.length - WINDOW_SIZE);
        }
      }

      return updated;
    });

    setLastProcessedTs(newSamples[newSamples.length - 1].timestamp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveformData, lastProcessedTs]);

  // ✅ Order: TP9 + TP10 (row 1), AF7 + AF8 (row 2)
  const channels = useMemo(
    () => [
      { name: 'TP9', dataKey: 'tp9' as const, color: '#3b82f6', label: 'Left Ear' },
      { name: 'TP10', dataKey: 'tp10' as const, color: '#ef4444', label: 'Right Ear' },
      { name: 'AF7', dataKey: 'af7' as const, color: '#10b981', label: 'Left Forehead' },
      { name: 'AF8', dataKey: 'af8' as const, color: '#f59e0b', label: 'Right Forehead' },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Live EEG Signals</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-600">Streaming</span>
        </div>
      </div>

      {/* ✅ 2x2 grid on desktop, 1 column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((channel) => (
          <div key={channel.dataKey} className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: channel.color }} />
                <h4 className="text-sm font-bold" style={{ color: channel.color }}>
                  {channel.name} - {channel.label}
                </h4>
              </div>
              <span className="text-xs font-mono text-gray-600">
                {windowData.length > 0 ? `${windowData[windowData.length - 1][channel.dataKey].toFixed(1)}` : '--'}
              </span>
            </div>

            {/* ✅ shorter height reduces scrolling */}
            <div className="bg-black rounded-md p-2" style={{ height: '100px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={windowData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal vertical={false} />
                  <XAxis dataKey="index" hide />
                  <YAxis domain={[-500, 500]} tick={{ fill: '#666', fontSize: 10 }} stroke="#666" width={40} />
                  <Line
                    type="monotone"
                    dataKey={channel.dataKey}
                    stroke={channel.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Reading EEG waveforms:</strong> Each graph shows the raw electrical activity from one electrode.
        </p>
      </div>
    </div>
  );
}