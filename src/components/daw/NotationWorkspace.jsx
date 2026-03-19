import React from 'react';
import NotationToolbar from './NotationToolbar';
import NotationSidebar from './NotationSidebar';
import { useApp } from '../../context/AppContext';

export default function NotationWorkspace({ children }) {
  const { state } = useApp();

  return (
    <div className="notation-workspace" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-primary)'
    }}>
      {/* Top Professional Toolbar */}
      <NotationToolbar />

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Left Professional Sidebar */}
        <NotationSidebar />

        {/* Center Canvas Area with Scroll */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          padding: 'var(--space-md)',
          background: '#f0f0f5' // Light gray for the 'Noteflight desk' look
        }}>
          {/* This is where SheetMusicViewer or TablatureViewer will render */}
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
