import React from 'react';
import { useApp } from '../../context/AppContext';
import WaveformViewer from '../WaveformViewer';
import NoteEditor from '../NoteEditor';
import MeasureEditingMode from '../MeasureEditingMode';

export default function TimelinePanel() {
  const { state } = useApp();

  const renderRightPanel = () => {
    if (state.editMode === 'measure') {
      return <MeasureEditingMode />;
    }
    return <NoteEditor />;
  };

  return (
    <div className="timeline-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <WaveformViewer />
      <div className="timeline-content-area" style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {renderRightPanel()}
      </div>
    </div>
  );
}
