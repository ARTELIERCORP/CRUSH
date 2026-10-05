import React, { useState } from 'react';
import { BrowserTab } from '../types';

interface VerticalTabsProps {
  initialTabs?: BrowserTab[];
  onTabSelect?: (id: number) => void;
  onTabClose?: (id: number) => void;
  onNewTab?: () => void;
}

export const VerticalTabs: React.FC<VerticalTabsProps> = ({
  initialTabs = [],
  onTabSelect,
  onTabClose,
  onNewTab,
}) => {
  const [tabs, setTabs] = useState<BrowserTab[]>(initialTabs.length > 0 ? initialTabs : [
    { id: 1, title: 'YouTube - Trending', url: 'https://youtube.com', active: true, pinned: false, muted: false, audible: true, discarded: false },
    { id: 2, title: 'GitHub - Crush Sovereign Browser', url: 'https://github.com', active: false, pinned: false, muted: false, audible: false, discarded: false },
    { id: 3, title: 'DuckDuckGo Privacy Search', url: 'https://duckduckgo.com', active: false, pinned: false, muted: false, audible: false, discarded: true },
  ]);

  const selectTab = (id: number) => {
    setTabs(prev => prev.map(t => ({ ...t, active: t.id === id })));
    onTabSelect?.(id);
  };

  const closeTab = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setTabs(prev => prev.filter(t => t.id !== id));
    onTabClose?.(id);
  };

  const createTab = () => {
    const newId = Date.now();
    const newTab: BrowserTab = {
      id: newId,
      title: 'New Tab',
      url: 'about:blank',
      active: true,
      pinned: false,
      muted: false,
      audible: false,
      discarded: false,
    };
    setTabs(prev => prev.map(t => ({ ...t, active: false })).concat(newTab));
    onNewTab?.();
  };

  return (
    <aside className="w-64 h-screen flex flex-col bg-slate-950/90 backdrop-blur-2xl border-r border-white/10 p-3 select-none">
      {/* Header & New Tab */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-xs font-bold tracking-wider text-white uppercase">Crush Rails</span>
        </div>
        <button
          onClick={createTab}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all duration-150 border border-white/10"
          title="New Tab (Ctrl+T)"
        >
          +
        </button>
      </div>

      {/* Tabs List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 border ${
              tab.active
                ? 'bg-white/15 border-white/25 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                : 'bg-transparent hover:bg-white/5 border-transparent text-white/70 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                tab.active ? 'bg-cyan-400' : tab.discarded ? 'bg-slate-600' : 'bg-slate-400'
              }`} />
              <span className="text-xs font-medium truncate">{tab.title}</span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {tab.audible && (
                <span className="text-[10px] text-cyan-400">🔊</span>
              )}
              <button
                onClick={(e) => closeTab(e, tab.id)}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/20 text-white/60 hover:text-white text-xs leading-none"
                title="Close Tab"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
        <span>{tabs.length} tabs open</span>
        <span className="text-emerald-400 font-mono">0.0% CPU</span>
      </div>
    </aside>
  );
};
