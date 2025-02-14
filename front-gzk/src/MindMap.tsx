import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Panel,
  useReactFlow,
  NodeTypes,
  Position,
  MarkerType,
  Background,
  BackgroundVariant,
  Controls,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import MindMapNode from './MindMapNode';
import axios from 'axios';  // 需要安装 axios

// 更新节点类型定义
interface CustomNodeData {
  label: string;
  isCollapsed?: boolean;
  style?: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
  };
}

type CustomNode = Node<CustomNodeData>;

// 定义思维导图节点的默认样式
const nodeDefaults = {
  style: {
    background: '#fff',
    color: '#333',
    fontSize: '14px',
  },
};

// 修改初始节点数据，给根节点一个固定的初始位置
const initialNodes: Node<CustomNodeData>[] = [
  {
    id: 'root',
    data: { 
      label: '中心主题',
      isCollapsed: false 
    },
    position: { x: 250, y: 200 },  // 给一个固定的初始位置
    type: 'mindmap',
    ...nodeDefaults,
  },
];

const initialEdges: Edge[] = [];

// Dagre 图布局配置
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node<CustomNodeData>[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 120,
    ranksep: 300,
    edgesep: 80,
    align: 'DL',
  });

  // 保存根节点的位置
  const rootNode = nodes.find(n => n.id === 'root');
  const rootPosition = rootNode?.position;

  // 构建父子关系图
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  edges.forEach(edge => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
    parentMap.set(edge.target, edge.source);
  });

  const nodePositions = new Map<string, { x: number, y: number }>();
  const LEVEL_SPACING = 400;
  const NODE_SPACING = 150;

  // 获取节点的所有子节点
  const getChildren = (nodeId: string): string[] => {
    return edges
      .filter(edge => edge.source === nodeId)
      .map(edge => edge.target);
  };

  // 计算节点及其子节点需要的总高度
  const getNodeGroupHeight = (nodeId: string): number => {
    const children = getChildren(nodeId);
    return Math.max(1, children.length) * NODE_SPACING;
  };

  // 检查位置是否有冲突
  const hasOverlap = (y1: number, height1: number, y2: number, height2: number): boolean => {
    const min1 = y1 - height1 / 2;
    const max1 = y1 + height1 / 2;
    const min2 = y2 - height2 / 2;
    const max2 = y2 + height2 / 2;
    return !(max1 + NODE_SPACING < min2 || min1 > max2 + NODE_SPACING);
  };

  // 获取指定 x 坐标上的所有节点组
  const getNodeGroupsAtX = (x: number): Array<{ nodeId: string, y: number, height: number }> => {
    return Array.from(nodePositions.entries())
      .filter(([_, pos]) => Math.abs(pos.x - x) < 10)
      .map(([nodeId, pos]) => ({
        nodeId,
        y: pos.y,
        height: getNodeGroupHeight(nodeId),
      }))
      .sort((a, b) => a.y - b.y);
  };

  // 找到安全的放置位置
  const findSafePosition = (x: number, preferredY: number, height: number): number => {
    const groups = getNodeGroupsAtX(x);
    if (groups.length === 0) return preferredY;

    // 检查首选位置是否可用
    let canUsePreferred = true;
    for (const group of groups) {
      if (hasOverlap(preferredY, height, group.y, group.height)) {
        canUsePreferred = false;
        break;
      }
    }
    if (canUsePreferred) return preferredY;

    // 找到最近的安全位置
    let bestY = preferredY;
    let minDistance = Infinity;

    // 尝试放在最上面
    let topY = Math.min(...groups.map(g => g.y - g.height/2)) - height/2 - NODE_SPACING;
    if (Math.abs(topY - preferredY) < minDistance) {
      bestY = topY;
      minDistance = Math.abs(topY - preferredY);
    }

    // 尝试放在最下面
    let bottomY = Math.max(...groups.map(g => g.y + g.height/2)) + height/2 + NODE_SPACING;
    if (Math.abs(bottomY - preferredY) < minDistance) {
      bestY = bottomY;
    }

    return bestY;
  };

  // 递归计算节点位置
  const calculatePositions = (nodeId: string, parentX: number, parentY: number) => {
    const children = getChildren(nodeId);
    if (children.length === 0) return;

    const x = parentX + LEVEL_SPACING;
    const groupHeight = getNodeGroupHeight(nodeId);
    const safeY = findSafePosition(x, parentY, groupHeight);

    // 更新父节点位置以适应子节点
    if (nodeId !== 'root' && Math.abs(safeY - parentY) > NODE_SPACING) {
      nodePositions.set(nodeId, { x: parentX, y: safeY });
    }

    // 计算子节点位置
    const startY = safeY - (children.length - 1) * NODE_SPACING / 2;
    children.forEach((childId, index) => {
      const y = startY + index * NODE_SPACING;
      nodePositions.set(childId, { x, y });
      calculatePositions(childId, x, y);
    });
  };

  // 从根节点开始计算位置
  const rootX = rootPosition?.x ?? 250;
  const rootY = rootPosition?.y ?? 200;
  calculatePositions('root', rootX, rootY);

  return {
    nodes: nodes.map((node) => {
      if (node.id === 'root') {
        return {
          ...node,
          position: rootPosition || { x: 250, y: 200 },
          targetPosition: isHorizontal ? Position.Left : Position.Top,
          sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        } as Node<CustomNodeData>;
      }

      const position = nodePositions.get(node.id)!;

      return {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position,
      } as Node<CustomNodeData>;
    }),
    edges,
  };
};

// 注册自定义节点类型
const nodeTypes: NodeTypes = {
  mindmap: MindMapNode,
};

const defaultEdgeOptions = {
  style: {
    strokeWidth: 1.5,
    stroke: '#d9d9d9',
  },
  type: 'bezier',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 15,
    height: 15,
    color: '#d9d9d9',
  },
  animated: false,
};

export default function MindMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView, setCenter, getNode, zoomIn, zoomOut } = useReactFlow();

  // 添加一个新的函数来处理视图更新
  const updateViewport = useCallback((nodeId?: string) => {
    setTimeout(() => {
      if (nodeId) {
        // 如果指定了节点，将其居中
        const node = getNode(nodeId);
        if (node) {
          setCenter(node.position.x, node.position.y, { duration: 800 });
        }
      } else {
        // 否则适应所有节点
        fitView({ duration: 800, padding: 0.2 });
      }
    }, 50); // 给一点延迟让布局完成
  }, [setCenter, fitView, getNode]);

  // 添加折叠/展开功能
  const toggleNodeCollapse = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const getDescendants = (id: string): string[] => {
        const descendants: string[] = [];
        edges.forEach((edge) => {
          if (edge.source === id) {
            descendants.push(edge.target);
            descendants.push(...getDescendants(edge.target));
          }
        });
        return descendants;
      };

      const descendants = getDescendants(nodeId);
      const isCollapsed = !node.data.isCollapsed;

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                isCollapsed,
              },
            };
          } else if (descendants.includes(n.id)) {
            return {
              ...n,
              hidden: isCollapsed,
            };
          }
          return n;
        })
      );

      // 更新视图，聚焦到被折叠/展开的节点
      updateViewport(nodeId);
    },
    [nodes, edges, setNodes, updateViewport]
  );

  // 修改 addChildNode 函数
  const addChildNode = useCallback(
    (parentId: string) => {
      const parent = nodes.find((n) => n.id === parentId);
      if (!parent || parent.data.isCollapsed) return;

      const newNodeId = `node_${nodes.length + 1}`;
      const newNode: Node<CustomNodeData> = {
        id: newNodeId,
        data: { label: '新主题' },
        position: { x: 0, y: 0 },
        type: 'mindmap',
        ...nodeDefaults,
      };
      
      const newEdge: Edge = {
        id: `edge_${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        type: 'smoothstep',
      };

      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);

      // 重新布局
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        [...nodes, newNode],
        [...edges, newEdge]
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      // 更新视图，聚焦到新节点
      updateViewport(newNodeId);
    },
    [nodes, edges, setNodes, setEdges, updateViewport]
  );

  // 修改 onDeleteNode 函数
  const onDeleteNode = useCallback(
    (nodeId: string) => {
      const getDescendants = (id: string): string[] => {
        const descendants: string[] = [id];
        edges.forEach((edge) => {
          if (edge.source === id) {
            descendants.push(...getDescendants(edge.target));
          }
        });
        return descendants;
      };

      const nodesToDelete = getDescendants(nodeId);
      
      const newEdges = edges.filter(
        (edge) => !nodesToDelete.includes(edge.source) && !nodesToDelete.includes(edge.target)
      );
      
      const newNodes = nodes.filter((node) => !nodesToDelete.includes(node.id));
      
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        newNodes,
        newEdges
      );
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      // 更新视图以适应所有节点
      updateViewport();
    },
    [nodes, edges, setNodes, setEdges, updateViewport]
  );

  // 更新节点样式功能
  const updateNodeStyle = useCallback(
    (nodeId: string, style: Partial<CustomNodeData['style']>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                style: {
                  ...node.data.style,
                  ...style,
                },
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // 在组件内添加导出 JSON 的函数
  const exportToJson = useCallback(() => {
    // 创建要导出的数据对象
    const exportData = {
      nodes: nodes.map(({ id, data, position }) => ({
        id,
        data,
        position,
      })),
      edges: edges
    };

    // 创建并下载 JSON 文件
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'mindmap-data.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges]);

  // 修改导入 JSON 的函数
  const importFromJson = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    
    if (file) {
      fileReader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          
          // 确保导入的节点具有正确的类型和默认样式
          const processedNodes = importedData.nodes.map((node: Node<CustomNodeData>) => ({
            ...node,
            type: 'mindmap',  // 设置正确的节点类型
            ...nodeDefaults,  // 应用默认样式
            data: {
              ...node.data,
              style: {
                ...nodeDefaults.style,
                ...node.data.style,  // 保留导入的自定义样式
              }
            }
          }));

          // 使用处理后的节点重新计算布局
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            processedNodes,
            importedData.edges
          );
          
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          
          setTimeout(() => {
            fitView({ duration: 800, padding: 0.2 });
          }, 50);
        } catch (error) {
          console.error('Error importing JSON:', error);
          alert('导入失败：无效的 JSON 文件');
        }
      };
      fileReader.readAsText(file);
    }
  }, [setNodes, setEdges, fitView]);

  // 添加上传 PDF 的处理函数
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      // 确保使用正确的后端地址和端口
      const response = await axios.post('http://localhost:3001/api/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        console.log('PDF uploaded successfully:', response.data);
        alert('PDF上传成功！');
        
        // 获取上传后的文件URL
        const pdfUrl = `http://localhost:3001${response.data.file.url}`;
        console.log('PDF URL:', pdfUrl);
        
        // TODO: 更新 iframe 显示上传的 PDF
        // document.querySelector('iframe')?.setAttribute('src', pdfUrl);
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      if (axios.isAxiosError(error)) {
        alert(`上传PDF失败：${error.response?.data?.message || '请检查服务器连接'}`);
      } else {
        alert('上传PDF失败，请重试');
      }
    }
  };

  return (
    // 最外层容器，占满整个视口并使用 flex 布局
    <div style={{ width: '100%', height: '100vh', display: 'flex' }}>
      {/* 左侧论文查看器部分 */}
      <div style={{ 
        width: '45%',          // 占据左侧45%宽度
        height: '100vh',       // 占满视口高度
        marginLeft: '0px',    // 左侧留白
        border: 'none', // 添加边框
        position: 'absolute',  // 绝对定位
        left: 0,              // 靠左对齐
        top: '50%',           // 垂直居中
        transform: 'translateY(-50%)' // 精确垂直居中
      }}>
        {/* 添加 PDF 上传按钮 */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => document.getElementById('pdfFileInput')?.click()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            上传论文PDF
          </button>
          <input
            id="pdfFileInput"
            type="file"
            accept=".pdf"
            onChange={handlePdfUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* 嵌入 paper-viewer 的 iframe */}
        <iframe 
          src="/paper-viewer/paper-viewer.html"
          style={{
            width: '100%',     // 填满父容器
            height: '100%',    // 填满父容器
            border: 'none'     // 移除 iframe 边框
          }}
        />
      </div>

      {/* 右侧思维导图部分 */}
      <div style={{ 
        width: '55%',          // 占据右侧52%宽度
        height: '100vh',        // 占据90%视口高度
        marginLeft: 'auto',    // 自动左边距实现靠右
        marginRight: '0px',   // 右侧留白
        border: '1px solid #ddd', // 添加边框
        position: 'absolute',  // 绝对定位
        right: 0,             // 靠右对齐
        top: '50%',           // 垂直居中
        transform: 'translateY(-50%)' // 精确垂直居中
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange} 
          onEdgesChange={onEdgesChange}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineType={ConnectionLineType.Bezier}
          connectionLineStyle={{ 
            stroke: '#d9d9d9', 
            strokeWidth: 1.5 
          }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background 
            variant={BackgroundVariant.Dots}
            gap={12}
            size={1}
          />
            

          
          <Controls />
          <Panel position="top-right">
            <div className="controls">
              <button onClick={() => {
                const selectedNodes = nodes.filter(node => node.selected);
                if (selectedNodes.length > 0 && selectedNodes[0].id !== 'root') {
                  onDeleteNode(selectedNodes[0].id);
                }
              }}>
                删除选中节点
              </button>
              <button onClick={() => {
                const selectedNodes = nodes.filter(node => node.selected);
                if (selectedNodes.length > 0) {
                  toggleNodeCollapse(selectedNodes[0].id);
                }
              }}>
                折叠/展开节点
              </button>
              <button onClick={() => {
                const selectedNodes = nodes.filter(node => node.selected);
                if (selectedNodes.length > 0) {
                  addChildNode(selectedNodes[0].id);
                } else {
                  addChildNode('root');
                }
              }}>
                添加子主题
              </button>
              <div className="style-controls">
                <button
                  onClick={() => {
                    const selectedNodes = nodes.filter((node) => node.selected);
                    if (selectedNodes.length > 0) {
                      const colors = ['#ffeb3b', '#4caf50', '#2196f3', '#f44336', '#9c27b0'];
                      const currentColor = selectedNodes[0].data.style?.backgroundColor;
                      const currentIndex = colors.indexOf(currentColor || '');
                      const nextColor = colors[(currentIndex + 1) % colors.length];
                      updateNodeStyle(selectedNodes[0].id, { backgroundColor: nextColor });
                    }
                  }}
                >
                  更改颜色
                </button>
                <button
                  onClick={() => {
                    const selectedNodes = nodes.filter((node) => node.selected);
                    if (selectedNodes.length > 0) {
                      const currentSize = Number(selectedNodes[0].data.style?.fontSize || 14);
                      updateNodeStyle(selectedNodes[0].id, { fontSize: currentSize + 2 });
                    }
                  }}
                >
                  增大字号
                </button>
                <button onClick={exportToJson}>
                  导出JSON
                </button>
                <button onClick={() => {
                  // 触发隐藏的文件输入框
                  document.getElementById('jsonFileInput')?.click();
                }}>
                  导入JSON
                </button>
                <input
                  id="jsonFileInput"
                  type="file"
                  accept=".json"
                  onChange={importFromJson}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
} 