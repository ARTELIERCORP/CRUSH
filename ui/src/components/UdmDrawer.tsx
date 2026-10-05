import React, { useState } from 'react';
import { UdmState } from '../types';

interface UdmDrawerProps {
  initialState?: UdmState;
}

export const UdmDrawer: React.FC<UdmDrawerProps> = ({ initialState }) => {
  const [state, setState] = useState<UdmState>(initialState || {
    bondingActive: true,
    totalSpeedMbps: 124.6,
    adapters: [
      { name: 'Wi-Fi 6', ip: '192.168.1.105', speedMbps: 78.2, active: true },
      { name: 'Gigabit LAN', ip: '192.168.1.106', speedMbps: 46.4, active: true },
    ],
    tasks: [
      {
        id: 'task-1',
        filename: 'crush-source-release.tar.zst',
        url: 'https://github.com/crush/browser/releases/v0.2.0',
        totalBytes: 1073741824, // 1 GB
        downloadedBytes: 734003200, // ~700 MB
        speedBytesPerSec: 15728640, // 15 MB/s
        status: 'downloading',
        threads: 16,
        overlapHashValid: true,
      }
    ]
  });

  const toggleTask = (taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        const nextStatus = t.status === 'downloading' ? 'paused' : 'downloading';
        return { ...t, status: nextStatus };
      })
    }));
  };

  return (
    <div className="w-96 flex flex-col gap-3 p-4 bg-slate-950/85 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl text-white select-none">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
          <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">UDM Daemon Connected</span>
        </div>
        <span className="text-sm font-mono font-bold text-white">{state.totalSpeedMbps.toFixed(1)} MB/s</span>
      </div>

      {/* Adapters Section */}
      <div className="flex gap-2">
        {state.adapters.map(a => (
          <div key={a.name} className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px]">
            <span className="text-white/70 font-medium">{a.name}</span>
            <span className="font-mono text-cyan-300">{a.speedMbps.toFixed(1)}M</span>
          </div>
        ))}
      </div>

      {/* Active Tasks */}
      <div className="space-y-2 mt-1">
        {state.tasks.map(task => {
          const progress = Math.round((task.downloadedBytes / task.totalBytes) * 100);
          return (
            <div key={task.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-medium text-white truncate max-w-[220px]">{task.filename}</span>
                <button
                  onClick={() => toggleTask(task.id)}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] uppercase font-semibold text-white/80 transition-colors"
                >
                  {task.status === 'downloading' ? 'Pause' : 'Resume'}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Progress Stats */}
              <div className="flex justify-between text-[10px] font-mono text-white/60">
                <span>{progress}% • {task.threads} threads</span>
                <span>{(task.speedBytesPerSec / 1048576).toFixed(1)} MB/s</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
