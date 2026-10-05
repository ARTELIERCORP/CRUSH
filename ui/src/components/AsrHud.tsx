import React, { useState } from 'react';
import { AsrConfig } from '../types';

interface AsrHudProps {
  initialConfig?: AsrConfig;
  onToggleAsr?: (enabled: boolean) => void;
  onToggleCompare?: (splitEnabled: boolean) => void;
  onPip?: () => void;
}

export const AsrHud: React.FC<AsrHudProps> = ({
  initialConfig,
  onToggleAsr,
  onToggleCompare,
  onPip,
}) => {
  const [config, setConfig] = useState<AsrConfig>(initialConfig || {
    enabled: false,
    splitEnabled: false,
    splitX: 0.50,
    sharpness: 0.30,
  });

  const handleToggleAsr = () => {
    const nextEnabled = !config.enabled;
    const nextSplit = nextEnabled ? config.splitEnabled : false;
    setConfig(prev => ({ ...prev, enabled: nextEnabled, splitEnabled: nextSplit }));
    onToggleAsr?.(nextEnabled);
  };

  const handleToggleCompare = () => {
    if (!config.enabled) return;
    const nextSplit = !config.splitEnabled;
    setConfig(prev => ({ ...prev, splitEnabled: nextSplit }));
    onToggleCompare?.(nextSplit);
  };

  return (
    <div className="crush-hud-bar inline-flex items-center gap-1.5 p-1.5 rounded-full bg-slate-950/75 backdrop-blur-2xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.6)] select-none text-white transition-all duration-300">
      {/* Popout (PiP) */}
      <button
        onClick={onPip}
        className="crush-pip-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/10 text-xs font-medium text-white/80 hover:text-white transition-all"
        title="Picture-in-Picture"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z" />
        </svg>
        <span>Popout</span>
      </button>

      {/* ASR Toggle Pill */}
      <button
        onClick={handleToggleAsr}
        className={`crush-asr-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
          config.enabled
            ? 'active bg-white/25 border-white/40 text-white shadow-[0_0_16px_rgba(255,255,255,0.3)]'
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
        }`}
        title="Toggle FSR 2-Pass Luma ASR"
      >
        <span className="text-sm">✦</span>
        <span>ASR {config.enabled ? 'ON' : 'OFF'}</span>
      </button>

      {/* Compare Button (Animated Width Expansion when ASR is ON) */}
      <button
        onClick={handleToggleCompare}
        className={`crush-compare-btn overflow-hidden transition-all duration-300 flex items-center gap-1.5 rounded-full text-xs font-medium ${
          config.enabled
            ? 'visible max-w-32 px-3 py-1.5 opacity-100 border ' + (config.splitEnabled ? 'active bg-white/20 border-white/35 text-white' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white')
            : 'hidden max-w-0 px-0 py-0 opacity-0 border-0 pointer-events-none'
        }`}
        title="Split-screen Before & After comparison"
      >
        <svg className="w-3.5 h-3.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H13V5h6v14zm-8 0H5V5h6v14z" />
        </svg>
        <span className="whitespace-nowrap">Compare</span>
      </button>
    </div>
  );
};
