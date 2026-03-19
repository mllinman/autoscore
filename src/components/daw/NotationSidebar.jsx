import React, { useState } from 'react';
import { 
  Music, 
  Type, 
  RotateCcw, 
  Layout, 
  Hash, 
  Clock, 
  Volume2, 
  Edit3, 
  CheckSquare,
  FileText
} from 'lucide-react';

const CATEGORIES = [
  { id: 'score', label: 'score', icon: FileText },
  { id: 'edit', label: 'edit', icon: Edit3 },
  { id: 'duration', label: 'duration', icon: Clock },
  { id: 'rhythm', label: 'rhythm', icon: Music },
  { id: 'pitch', label: 'pitch', icon: Hash },
  { id: 'tempo', label: 'tempo', icon: Clock },
  { id: 'text', label: 'text', icon: Type },
  { id: 'measure', label: 'measure', icon: Layout },
  { id: 'dynamics', label: 'dynamics', icon: Volume2 },
  { id: 'articulation', label: 'articulation', icon: CheckSquare },
];

export default function NotationSidebar() {
  const [activeCategory, setActiveCategory] = useState('pitch');

  return (
    <div className="notation-sidebar" style={{
      width: '180px',
      height: '100%',
      background: 'var(--bg-primary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-md) 0'
    }}>
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          className={`sidebar-item ${activeCategory === cat.id ? 'active' : ''}`}
          onClick={() => setActiveCategory(cat.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            background: 'transparent',
            border: 'none',
            color: activeCategory === cat.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 'var(--text-sm)',
            fontWeight: activeCategory === cat.id ? 600 : 400,
            transition: 'all 0.1s ease',
            position: 'relative'
          }}
        >
          {activeCategory === cat.id && (
             <div style={{
               position: 'absolute',
               left: 0,
               top: '20%',
               bottom: '20%',
               width: '3px',
               background: 'var(--accent-primary)',
               borderRadius: '0 4px 4px 0'
             }} />
          )}
          <cat.icon size={16} color={activeCategory === cat.id ? 'var(--accent-primary)' : 'currentColor'} />
          <span style={{ textTransform: 'capitalize' }}>{cat.label}</span>
          {activeCategory === cat.id && <span style={{ marginLeft: 'auto', opacity: 0.5 }}>✓</span>}
        </button>
      ))}
      
      <div style={{ marginTop: 'auto', padding: 'var(--space-md)', borderTop: '1px solid var(--border-dim)' }}>
         <button className="btn btn-sm btn-outline btn-block" style={{ gap: '8px' }}>
            <RotateCcw size={14} /> Clear Selection
         </button>
      </div>
    </div>
  );
}
