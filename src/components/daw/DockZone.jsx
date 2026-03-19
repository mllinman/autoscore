import React from 'react';
import { useDrop } from 'react-dnd';
import { PANEL_DND_TYPE } from './DockablePanel';
import { useLayout } from '../../context/LayoutContext';

export default function DockZone({ zone, children, className = '' }) {
  const { layoutDispatch } = useLayout();

  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: PANEL_DND_TYPE,
    drop: (item) => {
      layoutDispatch({
        type: 'MOVE_PANEL',
        payload: {
          panelId: item.id,
          fromZone: item.sourceZone,
          toZone: zone,
        },
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={dropRef}
      className={`dock-zone dock-zone-${zone} ${isOver ? 'dock-zone-hover' : ''} ${canDrop ? 'dock-zone-active' : ''} ${className}`}
      data-zone={zone}
    >
      {children}
      {isOver && <div className="dock-zone-indicator" />}
    </div>
  );
}
