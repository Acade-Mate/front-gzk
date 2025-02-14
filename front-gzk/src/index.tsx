import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReactFlowProvider } from 'reactflow';
import './styles.css';
import MindMap from './MindMap';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ReactFlowProvider>
        <div style={{ width: '100vw', height: '100vh' }}>
          <MindMap />
        </div>
      </ReactFlowProvider>
    </React.StrictMode>
  );
} 