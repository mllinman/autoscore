import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { ChevronDown, ChevronRight, X, GripVertical } from 'lucide-react';

const PANEL_DND_TYPE = 'DOCKABLE_PANEL';

export default function DockablePanel({
  id,
  title,
  icon: Icon,
  children,
  collapsible = true,
  closable = false,
  defaultCollapsed = false,
  onClose,
  className = '',
  headerActions,
  noPadding = false,
  sourceZone
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const [{ isDragging }, dragRef, previewRef] = useDrag({
    type: PANEL_DND_TYPE,
    item: { id, title, sourceZone },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={previewRef}
      className={`dockable-panel ${collapsed ? 'collapsed' : ''} ${isDragging ? 'dragging' : ''} ${className}`}
      data-panel-id={id}
    >
      {/* Panel Header */}
      <div className="dockable-panel-header" ref={dragRef}>
        <div className="dockable-panel-header-left">
          <div className="drag-grip">
            <GripVertical size={10} />
          </div>
          {collapsible && (
            <button
              className="panel-collapse-btn"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          {Icon && <Icon size={13} className="panel-header-icon" />}
          <span className="panel-header-title">{title}</span>
        </div>
        <div className="dockable-panel-header-right">
          {headerActions}
          {closable && onClose && (
            <button className="panel-close-btn" onClick={onClose}>
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Panel Content */}
      {!collapsed && (
        <div className={`dockable-panel-content ${noPadding ? 'no-padding' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export { PANEL_DND_TYPE };
