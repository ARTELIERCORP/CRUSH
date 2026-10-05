// ui/src/types/index.ts
// Strict TypeScript types for Crush Sovereign Browser UI

export interface BrowserTab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
  pinned: boolean;
  muted: boolean;
  audible: boolean;
  discarded: boolean;
}

export interface NetworkAdapter {
  name: string;
  ip: string;
  speedMbps: number;
  active: boolean;
}

export interface UdmTask {
  id: string;
  url: string;
  filename: string;
  totalBytes: number;
  downloadedBytes: number;
  speedBytesPerSec: number;
  status: 'connecting' | 'downloading' | 'paused' | 'completed' | 'error';
  threads: number;
  overlapHashValid: boolean;
}

export interface UdmState {
  bondingActive: boolean;
  totalSpeedMbps: number;
  adapters: NetworkAdapter[];
  tasks: UdmTask[];
}

export interface AsrConfig {
  enabled: boolean;
  splitEnabled: boolean;
  splitX: number;
  sharpness: number;
}
