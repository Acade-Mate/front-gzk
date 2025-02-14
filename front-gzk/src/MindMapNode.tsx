import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const getNodeStyle = (data: any) => {
  const style: React.CSSProperties = {
    padding: '12px 20px',
    borderRadius: '8px',
    background: data.style?.backgroundColor || '#fff',
    color: data.style?.textColor || '#333',
    fontSize: data.style?.fontSize ? `${data.style.fontSize}px` : '14px',
    transition: 'all 250ms ease',
    boxShadow: '0 2px 5px -1px rgba(0,0,0,0.1)',
    width: data.width || 150,
    height: data.height || 'auto',
    textAlign: 'center',
    position: 'relative',
    border: '1px solid #e5e7eb',
  };

  if (data.isCollapsed) {
    style.background = '#f5f5f5';
  }

  return style;
};

const handleStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  background: 'transparent',
  border: 'none',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 1,
};

export default memo(({ data, id }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);

  const onDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const onBlur = useCallback(() => {
    setIsEditing(false);
    data.label = label;
  }, [label, data]);

  const onChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(evt.target.value);
  }, []);

  return (
    <div style={getNodeStyle(data)} onDoubleClick={onDoubleClick}>
      <Handle 
        type="target" 
        position={Position.Left}
        style={handleStyle}
      />
      {isEditing ? (
        <input
          value={label}
          onChange={onChange}
          onBlur={onBlur}
          className="mindmap-node-input"
          autoFocus
        />
      ) : (
        <>
          <span>{label}</span>
          {data.isCollapsed && <span className="collapse-indicator">...</span>}
        </>
      )}
      <Handle 
        type="source" 
        position={Position.Right}
        style={handleStyle}
      />
    </div>
  );
}); 