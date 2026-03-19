import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLayout } from '../../context/LayoutContext';
import { Music, Guitar, Piano, BarChart3, Type } from 'lucide-react';

import SheetMusicViewer from '../SheetMusicViewer';
import TablatureViewer from '../TablatureViewer';
import PianoRollEditor from '../PianoRollEditor';
import SpectrogramViewer from '../SpectrogramViewer';
import LyricsViewer from '../LyricsViewer';

const NOTATION_ICONS = {
  sheet: Music,
  tab: Guitar,
  piano: Piano,
  spectrogram: BarChart3,
  lyrics: Type,
};

const VIEW_RENDERERS = {
  sheet: () => <SheetMusicViewer />,
  tab: () => <TablatureViewer />,
  piano: () => <PianoRollEditor />,
  spectrogram: () => <SpectrogramViewer />,
  lyrics: () => <LyricsViewer />,
};

export default function NotationTabs() {
  const { state, dispatch } = useApp();
  const { layout, layoutDispatch } = useLayout();

  const renderContent = () => {
    const activeTab = layout.activeSortedTab || 'sheet';
    const Renderer = VIEW_RENDERERS[activeTab];
    
    // Keep app viewMode in sync
    if (activeTab !== state.viewMode) {
      dispatch({ type: 'SET_VIEW_MODE', payload: activeTab });
    }

    return Renderer ? <Renderer /> : <div className="panel-empty">Select a view</div>;
  };

  return (
    <div className="notation-tabs-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="tab-strip" style={{ background: 'var(--daw-bg-mid)' }}>
        {layout.sortedTabs.map(tab => {
          const Icon = NOTATION_ICONS[tab.id] || Music;
          const isActive = layout.activeSortedTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`strip-tab ${isActive ? 'active' : ''}`}
              onClick={() => layoutDispatch({ type: 'SET_ACTIVE_SORTED_TAB', payload: tab.id })}
              title={`Switch to ${tab.label}`}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="tab-content-area notation-area-bg" style={{ flex: 1, overflow: 'auto', background: 'var(--daw-bg-darkest)' }}>
        {renderContent()}
      </div>
    </div>
  );
}
