import React from 'react';
import ReactDOM from 'react-dom/client';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AppProvider } from './context/AppContext';
import { LayoutProvider } from './context/LayoutContext';
import App from './App';
import './index.css';
import './daw.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
      <AppProvider>
        <LayoutProvider>
          <App />
        </LayoutProvider>
      </AppProvider>
    </DndProvider>
  </React.StrictMode>
);
