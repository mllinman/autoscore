import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLayout } from '../../context/LayoutContext';
import {
  Music, Guitar, Piano, BarChart3, Type, Activity, Mic2,
  Plug, SortAsc, ChevronDown, ChevronRight
} from 'lucide-react';

import SheetMusicViewer from '../SheetMusicViewer';
import TablatureViewer from '../TablatureViewer';
import PianoRollEditor from '../PianoRollEditor';
import SpectrogramViewer from '../SpectrogramViewer';
import LyricsViewer from '../LyricsViewer';
import StemMixer from '../StemMixer';
import VocalTuner from '../VocalTuner';

const SORTED_VIEW_ICONS = {
  sheet: Music,
  tab: Guitar,
  piano: Piano,
  spectrogram: BarChart3,
  lyrics: Type,
};

const PLUGIN_ICONS = {
  stems: Activity,
  autotune: Mic2,
};

const VIEW_RENDERERS = {
  sheet: () => <SheetMusicViewer />,
  tab: () => <TablatureViewer />,
  piano: () => <PianoRollEditor />,
  spectrogram: () => <SpectrogramViewer />,
  lyrics: () => <LyricsViewer />,
};

const PLUGIN_RENDERERS = {
  stems: () => <StemMixer />,
  autotune: () => <VocalTuner />,
};

export default function PluginTabs() {
  const { state, dispatch } = useApp();
  const { layout, layoutDispatch } = useLayout();
  const [activeSection, setActiveSection] = useState('sorted'); // 'sorted' | 'plugins'

  const renderSortedContent = () => {
    const activeTab = layout.activeSortedTab;
    const Renderer = VIEW_RENDERERS[activeTab];
    
    // Also sync viewMode in AppContext
    if (activeTab !== state.viewMode) {
      dispatch({ type: 'SET_VIEW_MODE', payload: activeTab });
    }

    return Renderer ? <Renderer /> : <div className="panel-empty">Select a view</div>;
  };

  const renderPluginContent = () => {
    const activeTab = layout.activePluginTab;
    const Renderer = PLUGIN_RENDERERS[activeTab];
    return Renderer ? <Renderer /> : <div className="panel-empty">Select a plugin</div>;
  };

  return (
    <div className="plugin-tabs-container">
      {/* Section Headers */}
      <div className="plugin-tabs-header">
        <button
          className={`section-tab ${activeSection === 'sorted' ? 'active' : ''}`}
          onClick={() => setActiveSection('sorted')}
        >
          <SortAsc size={13} />
          <span>Views</span>
        </button>
        <button
          className={`section-tab ${activeSection === 'plugins' ? 'active' : ''}`}
          onClick={() => setActiveSection('plugins')}
        >
          <Plug size={13} />
          <span>Plugins</span>
        </button>
      </div>

      {/* Sorted (View) Tabs */}
      {activeSection === 'sorted' && (
        <>
          <div className="tab-strip">
            {layout.sortedTabs.map(tab => {
              const Icon = SORTED_VIEW_ICONS[tab.id] || Music;
              return (
                <button
                  key={tab.id}
                  className={`strip-tab ${layout.activeSortedTab === tab.id ? 'active' : ''}`}
                  onClick={() => layoutDispatch({ type: 'SET_ACTIVE_SORTED_TAB', payload: tab.id })}
                  title={tab.label}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="tab-content-area">
            {renderSortedContent()}
          </div>
        </>
      )}

      {/* Plugin Tabs */}
      {activeSection === 'plugins' && (
        <>
          <div className="tab-strip">
            {layout.pluginTabs.map(tab => {
              const Icon = PLUGIN_ICONS[tab.id] || Plug;
              return (
                <button
                  key={tab.id}
                  className={`strip-tab ${layout.activePluginTab === tab.id ? 'active' : ''}`}
                  onClick={() => layoutDispatch({ type: 'SET_ACTIVE_PLUGIN_TAB', payload: tab.id })}
                  title={tab.label}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="tab-content-area">
            {renderPluginContent()}
          </div>
        </>
      )}
    </div>
  );
}
