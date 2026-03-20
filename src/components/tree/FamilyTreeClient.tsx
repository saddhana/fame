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
import { JunctionNode } from './JunctionNode';
import type { FamilyMember, Relationship } from '@/types';

const nodeTypes: NodeTypes = {
  member: MemberNode,
  junction: JunctionNode,
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const COUPLE_GAP = 60;

function getLayoutedElements(
  members: FamilyMember[],
  relationships: Relationship[]
): { nodes: Node[]; edges: Edge[] } {
  const spouseRels = relationships.filter((r) => r.type === 'spouse');
  const parentChildRels = relationships.filter((r) => r.type === 'parent_child');

  // Build couple groups
  const assigned = new Set<string>();
  const couples: { ids: string[]; rel?: Relationship }[] = [];
  const memberCoupleIndex = new Map<string, number>();

  for (const rel of spouseRels) {
    if (assigned.has(rel.person1_id) || assigned.has(rel.person2_id)) continue;
    const idx = couples.length;
    couples.push({ ids: [rel.person1_id, rel.person2_id], rel });
    memberCoupleIndex.set(rel.person1_id, idx);
    memberCoupleIndex.set(rel.person2_id, idx);
    assigned.add(rel.person1_id);
    assigned.add(rel.person2_id);
  }
  for (const m of members) {
    if (!assigned.has(m.id)) {
      const idx = couples.length;
      couples.push({ ids: [m.id] });
      memberCoupleIndex.set(m.id, idx);
    }
  }

  // Dagre layout using couple-level nodes
  const coupleNodeId = (idx: number) => `couple-${idx}`;
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 140, edgesep: 30 });

  couples.forEach((couple, idx) => {
    const w = couple.ids.length === 2 ? NODE_WIDTH * 2 + COUPLE_GAP : NODE_WIDTH;
    g.setNode(coupleNodeId(idx), { width: w, height: NODE_HEIGHT });
  });

  const coupleEdgeSet = new Set<string>();
  for (const rel of parentChildRels) {
    const pIdx = memberCoupleIndex.get(rel.person1_id);
    const cIdx = memberCoupleIndex.get(rel.person2_id);
    if (pIdx === undefined || cIdx === undefined) continue;
    const key = `${pIdx}->${cIdx}`;
    if (!coupleEdgeSet.has(key)) {
      coupleEdgeSet.add(key);
      g.setEdge(coupleNodeId(pIdx), coupleNodeId(cIdx));
    }
  }

  dagre.layout(g);

  const memberById = new Map(members.map(m => [m.id, m]));
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Which couples have children?
  const coupleHasChildren = new Set<number>();
  for (const rel of parentChildRels) {
    const pIdx = memberCoupleIndex.get(rel.person1_id);
    if (pIdx !== undefined) coupleHasChildren.add(pIdx);
  }

  // Place member nodes & junction nodes
  couples.forEach((couple, idx) => {
    const coupleNode = g.node(coupleNodeId(idx));
    const cx = coupleNode.x;
    const cy = coupleNode.y;

    if (couple.ids.length === 2) {
      const halfSpan = (NODE_WIDTH + COUPLE_GAP) / 2;

      const m0 = memberById.get(couple.ids[0]);
      const m1 = memberById.get(couple.ids[1]);
      if (m0) {
        nodes.push({
          id: m0.id, type: 'member',
          position: { x: cx - halfSpan - NODE_WIDTH / 2, y: cy - NODE_HEIGHT / 2 },
          data: { member: m0 },
        });
      }
      if (m1) {
        nodes.push({
          id: m1.id, type: 'member',
          position: { x: cx + halfSpan - NODE_WIDTH / 2, y: cy - NODE_HEIGHT / 2 },
          data: { member: m1 },
        });
      }

      // Spouse edge: side-to-side using right/left handles
      if (couple.rel) {
        edges.push({
          id: `sp-${couple.rel.id}`,
          source: couple.ids[0],
          sourceHandle: 'right',
          target: couple.ids[1],
          targetHandle: 'left',
          type: 'straight',
          style: {
            stroke: couple.rel.is_active ? '#dc2626' : '#9ca3af',
            strokeWidth: 2,
            strokeDasharray: couple.rel.is_active ? undefined : '6 3',
          },
          label: couple.rel.is_active ? '♥' : '✕',
          labelStyle: { fontSize: 14 },
        });
      }

      // Junction node at center-bottom of couple (for child edges)
      if (coupleHasChildren.has(idx)) {
        const jId = `junction-${idx}`;
        nodes.push({
          id: jId, type: 'junction',
          position: { x: cx - 1, y: cy + NODE_HEIGHT / 2 + 10 },
          data: {},
          width: 2,
          height: 2,
          draggable: false,
          selectable: false,
        });

        // Connect both spouses to junction (short vertical lines from each spouse bottom to junction top)
        edges.push({
          id: `j-link-0-${idx}`,
          source: couple.ids[0],
          sourceHandle: 'bottom',
          target: jId,
          targetHandle: 'top',
          type: 'straight',
          style: { stroke: '#b45309', strokeWidth: 2 },
        });
        edges.push({
          id: `j-link-1-${idx}`,
          source: couple.ids[1],
          sourceHandle: 'bottom',
          target: jId,
          targetHandle: 'top',
          type: 'straight',
          style: { stroke: '#b45309', strokeWidth: 2 },
        });
      }
    } else {
      const m = memberById.get(couple.ids[0]);
      if (m) {
        nodes.push({
          id: m.id, type: 'member',
          position: { x: cx - NODE_WIDTH / 2, y: cy - NODE_HEIGHT / 2 },
          data: { member: m },
        });
      }
    }
  });

  // Parent-child edges: from junction (couple) or parent (single) → child
  const childrenByCouple = new Map<number, Set<string>>();
  for (const rel of parentChildRels) {
    const pIdx = memberCoupleIndex.get(rel.person1_id);
    if (pIdx === undefined) continue;
    if (!childrenByCouple.has(pIdx)) childrenByCouple.set(pIdx, new Set());
    childrenByCouple.get(pIdx)!.add(rel.person2_id);
  }

  for (const [coupleIdx, childIds] of childrenByCouple) {
    const couple = couples[coupleIdx];
    const sourceId = couple.ids.length === 2 ? `junction-${coupleIdx}` : couple.ids[0];
    const sourceHandle = couple.ids.length === 2 ? 'bottom' : undefined;

    for (const childId of childIds) {
      edges.push({
        id: `pc-${coupleIdx}-${childId}`,
        source: sourceId,
        sourceHandle,
        target: childId,
        targetHandle: 'top',
        type: 'smoothstep',
        style: { stroke: '#b45309', strokeWidth: 2 },
      });
    }
  }

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
