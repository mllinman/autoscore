import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

const LayoutContext = createContext(null);

const STORAGE_KEY = 'autoscore-layout-v2';

// Default Cakewalk-style panel arrangement
const defaultLayout = {
  zones: {
    top: {
      panels: ['header'],
      collapsed: false,
    },
    left: {
      panels: ['channels', 'properties', 'tools'],
      collapsed: false,
    },
    center: {
      panels: ['timeline', 'notations'],
      collapsed: false,
    },
    right: {
      panels: ['plugins'],
      collapsed: false,
    },
    bottom: {
      panels: [],
      collapsed: true,
    },
  },
  panelVisibility: {
    channels: true,
    properties: true,
    tools: true,
    timeline: true,
    plugins: true,
    sorted: true,
    stems: false,
    autotune: false,
    pianoroll: false,
  },
  // View tabs that appear in the right "Sorted" panel
  sortedTabs: [
    { id: 'sheet', label: 'Sheet Music', icon: 'Music' },
    { id: 'tab', label: 'Tablature', icon: 'Guitar' },
    { id: 'piano', label: 'Piano Roll', icon: 'Piano' },
    { id: 'spectrogram', label: 'Spectrogram', icon: 'BarChart3' },
    { id: 'lyrics', label: 'Lyrics', icon: 'Type' },
  ],
  activeSortedTab: 'sheet',
  // Plugin tabs in the right "Plugins" panel
  pluginTabs: [
    { id: 'stems', label: 'Stem Separator', icon: 'Activity' },
    { id: 'autotune', label: 'AutoTune', icon: 'Mic2' },
  ],
  activePluginTab: 'stems',
  // Dragging state
  dragSource: null,
};

function layoutReducer(state, action) {
  switch (action.type) {
    case 'SET_ZONE_SIZE':
      return {
        ...state,
        zones: {
          ...state.zones,
          [action.payload.zone]: {
            ...state.zones[action.payload.zone],
            size: action.payload.size,
          },
        },
      };

    case 'TOGGLE_ZONE_COLLAPSE':
      return {
        ...state,
        zones: {
          ...state.zones,
          [action.payload]: {
            ...state.zones[action.payload],
            collapsed: !state.zones[action.payload].collapsed,
          },
        },
      };

    case 'SET_ZONE_COLLAPSED':
      return {
        ...state,
        zones: {
          ...state.zones,
          [action.payload.zone]: {
            ...state.zones[action.payload.zone],
            collapsed: action.payload.collapsed,
          },
        },
      };

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        zones: {
          ...state.zones,
          [action.payload.zone]: {
            ...state.zones[action.payload.zone],
            activeTab: action.payload.tab,
          },
        },
      };

    case 'SET_PANEL_VISIBILITY':
      return {
        ...state,
        panelVisibility: {
          ...state.panelVisibility,
          [action.payload.panel]: action.payload.visible,
        },
      };

    case 'TOGGLE_PANEL':
      return {
        ...state,
        panelVisibility: {
          ...state.panelVisibility,
          [action.payload]: !state.panelVisibility[action.payload],
        },
      };

    case 'SET_ACTIVE_SORTED_TAB':
      return { ...state, activeSortedTab: action.payload };

    case 'SET_ACTIVE_PLUGIN_TAB':
      return { ...state, activePluginTab: action.payload };

    case 'REORDER_SORTED_TABS': {
      const tabs = [...state.sortedTabs];
      const { fromIndex, toIndex } = action.payload;
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, moved);
      return { ...state, sortedTabs: tabs };
    }

    case 'OPEN_BOTTOM_PANEL':
      return {
        ...state,
        zones: {
          ...state.zones,
          bottom: {
            ...state.zones.bottom,
            collapsed: false,
            activeTab: action.payload,
          },
        },
      };

    case 'CLOSE_BOTTOM_PANEL':
      return {
        ...state,
        zones: {
          ...state.zones,
          bottom: {
            ...state.zones.bottom,
            collapsed: true,
          },
        },
      };

    case 'SET_DRAG_SOURCE':
      return { ...state, dragSource: action.payload };

    case 'MOVE_PANEL': {
      const { panelId, fromZone, toZone, toIndex } = action.payload;
      const newZones = { ...state.zones };

      // Remove from source zone
      if (fromZone && newZones[fromZone]) {
        newZones[fromZone] = {
          ...newZones[fromZone],
          panels: newZones[fromZone].panels.filter(p => p !== panelId),
        };
      }

      // Add to target zone
      if (toZone && newZones[toZone]) {
        const panels = [...newZones[toZone].panels];
        const idx = toIndex !== undefined ? toIndex : panels.length;
        panels.splice(idx, 0, panelId);
        newZones[toZone] = {
          ...newZones[toZone],
          panels,
          activeTab: panelId,
        };
      }

      return { ...state, zones: newZones, dragSource: null };
    }

    case 'RESET_LAYOUT':
      return { ...defaultLayout };

    case 'LOAD_LAYOUT':
      return { ...defaultLayout, ...action.payload };

    default:
      return state;
  }
}

export function LayoutProvider({ children }) {
  const [layout, layoutDispatch] = useReducer(layoutReducer, defaultLayout, (initial) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure unique panels in zones to prevent duplication issues
        Object.keys(parsed.zones).forEach(z => {
          parsed.zones[z].panels = [...new Set(parsed.zones[z].panels)];
        });
        return { ...initial, ...parsed };
      }
    } catch (e) {
      // Ignore parse errors
    }
    return initial;
  });

  // Persist layout changes
  useEffect(() => {
    try {
      const { dragSource, ...toSave } = layout;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      // Ignore storage errors
    }
  }, [layout]);

  return (
    <LayoutContext.Provider value={{ layout, layoutDispatch }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) throw new Error('useLayout must be used within LayoutProvider');
  return context;
}

export default LayoutContext;
