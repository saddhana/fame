'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Search, GitBranch, TreePine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MemberNode } from './MemberNode';
import type { FamilyMember, Relationship } from '@/types';

const nodeTypes: NodeTypes = {
  member: MemberNode,
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;

function getLayoutedElements(
  members: FamilyMember[],
  relationships: Relationship[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120, edgesep: 40 });

  // Add nodes
  members.forEach((member) => {
    g.setNode(member.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Add edges for parent-child relationships
  const parentChildRels = relationships.filter((r) => r.type === 'parent_child');
  parentChildRels.forEach((rel) => {
    g.setEdge(rel.person1_id, rel.person2_id);
  });

  dagre.layout(g);

  const nodes: Node[] = members.map((member) => {
    const nodeData = g.node(member.id);
    return {
      id: member.id,
      type: 'member',
      position: {
        x: nodeData.x - NODE_WIDTH / 2,
        y: nodeData.y - NODE_HEIGHT / 2,
      },
      data: { member },
    };
  });

  const edges: Edge[] = [];

  // Parent-child edges
  parentChildRels.forEach((rel) => {
    edges.push({
      id: `pc-${rel.id}`,
      source: rel.person1_id,
      target: rel.person2_id,
      type: 'smoothstep',
      style: { stroke: '#b45309', strokeWidth: 2 },
      animated: false,
    });
  });

  // Spouse edges
  const spouseRels = relationships.filter((r) => r.type === 'spouse');
  spouseRels.forEach((rel) => {
    edges.push({
      id: `sp-${rel.id}`,
      source: rel.person1_id,
      target: rel.person2_id,
      type: 'straight',
      style: {
        stroke: rel.is_active ? '#dc2626' : '#9ca3af',
        strokeWidth: 2,
        strokeDasharray: rel.is_active ? undefined : '6 3',
      },
      animated: false,
      label: rel.is_active ? '♥' : '✕',
      labelStyle: { fontSize: 14 },
    });
  });

  return { nodes, edges };
}

export function FamilyTreeClient({
  members,
  relationships,
}: {
  members: FamilyMember[];
  relationships: Relationship[];
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getLayoutedElements(members, relationships),
    [members, relationships]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query) {
        setNodes((nds) =>
          nds.map((n) => ({ ...n, style: { ...n.style, opacity: 1 } }))
        );
        return;
      }

      const lowerQuery = query.toLowerCase();
      setNodes((nds) =>
        nds.map((n) => {
          const member = n.data.member as FamilyMember;
          const matches =
            member.full_name.toLowerCase().includes(lowerQuery) ||
            member.nickname?.toLowerCase().includes(lowerQuery);
          return {
            ...n,
            style: { ...n.style, opacity: matches ? 1 : 0.2 },
          };
        })
      );
    },
    [setNodes]
  );

  if (members.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <TreePine className="w-16 h-16 text-amber-300/60 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-amber-800">Silsilah Belum Ada</h2>
          <p className="text-sm text-amber-600/60 mt-1 max-w-xs">
            Tambahkan anggota keluarga terlebih dahulu untuk melihat pohon silsilah
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-linear-to-br from-amber-50/50 via-orange-50/30 to-stone-50"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#d4a574"
          className="opacity-30"
        />
        <Controls
          className="bg-white/90! border-amber-200! shadow-lg! rounded-xl!"
        />
        <MiniMap
          nodeStrokeColor="#b45309"
          nodeColor="#fef3c7"
          maskColor="rgba(255, 251, 235, 0.7)"
          className="bg-white/90! border-amber-200! shadow-lg! rounded-xl!"
        />

        {/* Search panel */}
        <Panel position="top-left" className="ml-4! mt-4!">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                <GitBranch className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-amber-950">Silsilah Keluarga</h1>
                <p className="text-[10px] text-amber-600/60">{members.length} anggota</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
              <Input
                placeholder="Cari nama..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 h-8 text-sm border-amber-200 bg-amber-50/50 focus:border-amber-400 focus:ring-amber-400/20"
              />
            </div>
          </div>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-left" className="ml-4! mb-4!">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-amber-700 rounded" />
              <span className="text-amber-700">Orang tua → Anak</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-red-600 rounded" />
              <span className="text-amber-700">Pasangan (aktif)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-gray-400 rounded" style={{ borderTop: '2px dashed #9ca3af', height: 0 }} />
              <span className="text-amber-700">Pasangan (bercerai)</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
