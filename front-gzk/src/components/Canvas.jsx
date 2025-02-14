import React from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

const Canvas = () => {
  const [nodes, setNodes] = React.useState([]);
  const [edges, setEdges] = React.useState([]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%'
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={setNodes}
        onEdgesChange={setEdges}
        fitView
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1.5 }}
      >
        <Background 
          variant="dots" 
          gap={12} 
          size={1} 
          color="#f0f0f0"
        />
        <Controls />
        <MiniMap 
          style={{ 
            height: 120,
            backgroundColor: '#f8f9fa'
          }} 
          zoomable 
          pannable 
        />
        <Panel position="top-left">
          <div style={{ padding: '10px' }}>
            React Flow 画布
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default Canvas; 