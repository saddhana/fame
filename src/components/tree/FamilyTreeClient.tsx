'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Search, GitBranch, TreePine, Maximize2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MemberNode } from './MemberNode';
import { JunctionNode } from './JunctionNode';
import type { FamilyMember, Relationship } from '@/types';

const nodeTypes: NodeTypes = {
  member: MemberNode,
  junction: JunctionNode,
};

const NODE_WIDTH = 240;
const NODE_HEIGHT = 115;
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
          style: { stroke: '#16a34a', strokeWidth: 2 },
        });
        edges.push({
          id: `j-link-1-${idx}`,
          source: couple.ids[1],
          sourceHandle: 'bottom',
          target: jId,
          targetHandle: 'top',
          type: 'straight',
          style: { stroke: '#16a34a', strokeWidth: 2 },
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
        style: { stroke: '#16a34a', strokeWidth: 2 },
      });
    }
  }

  return { nodes, edges };
}

function FamilyTreeInner({
  members,
  relationships,
}: {
  members: FamilyMember[];
  relationships: Relationship[];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const { fitView } = useReactFlow();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getLayoutedElements(members, relationships),
    [members, relationships]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleReset = useCallback(() => {
    setNodes(initialNodes.map((n) => ({ ...n, style: { ...n.style, opacity: 1 } })));
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
  }, [initialNodes, setNodes, fitView]);

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
          if (n.type === 'junction') {
            return { ...n, style: { ...n.style, opacity: 0.35 } };
          }
          const member = n.data.member as FamilyMember | undefined;
          if (!member) return n;
          const matches =
            member.full_name.toLowerCase().includes(lowerQuery) ||
            member.nickname?.toLowerCase().includes(lowerQuery);
          return {
            ...n,
            style: { ...n.style, opacity: matches ? 1 : 0.35 },
          };
        })
      );
    },
    [setNodes]
  );

  const handleSearchEnter = useCallback(() => {
    if (!searchQuery) return;
    const lowerQuery = searchQuery.toLowerCase();
    const matches = nodes.filter((n) => {
      if (n.type === 'junction') return false;
      const member = n.data.member as FamilyMember | undefined;
      if (!member) return false;
      return (
        member.full_name.toLowerCase().includes(lowerQuery) ||
        member.nickname?.toLowerCase().includes(lowerQuery)
      );
    });
    if (matches.length === 1) {
      fitView({ nodes: [{ id: matches[0].id }], padding: 0.8, duration: 500, maxZoom: 1.5 });
    }
  }, [searchQuery, nodes, fitView]);

  return (
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
      className="bg-white"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="#d1d5db"
        className="opacity-60"
      />
      {/* MiniMap — bottom-left like Google Maps */}
      <MiniMap
        position="bottom-left"
        nodeColor={(node) => {
          if (node.type === 'junction') return '#d1fae5';
          const m = node.data?.member as { gender?: string; death_date?: string } | undefined;
          if (m?.death_date) return '#a8a29e';
          return m?.gender === 'L' ? '#93c5fd' : '#fda4af';
        }}
        nodeStrokeWidth={0}
        maskColor="rgba(241,245,249,0.7)"
        className="bg-white! border-stone-200! shadow-md! rounded-xl!"
        style={{ marginLeft: '1rem', marginBottom: '1rem' }}
      />

      {/* Controls — bottom-right */}
      <Controls
        position="bottom-right"
        className="bg-white! border-stone-200! shadow-md! rounded-xl!"
        style={{ marginRight: '1rem', marginBottom: '1rem' }}
      />

      {/* Search panel */}
      <Panel position="top-left" className="ml-4! mt-4!">
        <div className="bg-white rounded-xl shadow-md border border-stone-200 p-3">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-stone-900">Silsilah Keluarga</h1>
              <p className="text-xs text-stone-400">{members.length} anggota</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              placeholder="Cari nama..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchEnter()}
              className="pl-8 h-9 text-sm border-stone-200 bg-stone-50 focus:border-emerald-400"
            />
          </div>
          {/* Reset / fit view button */}
          <button
            onClick={handleReset}
            className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-200 transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
            Reset tampilan
          </button>
        </div>
      </Panel>

      {/* Legend — bottom-right above controls */}
      <Panel position="bottom-right" className="mr-14! mb-4!">
        <div className="bg-white rounded-xl shadow-md border border-stone-200 px-3 py-2.5 text-xs flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-emerald-600 rounded" />
            <span className="text-stone-600 font-medium">Orang tua → Anak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-red-500 rounded" />
            <span className="text-stone-600 font-medium">Pasangan (aktif)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0" style={{ borderTop: '2px dashed #9ca3af' }} />
            <span className="text-stone-600 font-medium">Pasangan (bercerai)</span>
          </div>
        </div>
      </Panel>
    </ReactFlow>
  );
}

export function FamilyTreeClient({
  members,
  relationships,
}: {
  members: FamilyMember[];
  relationships: Relationship[];
}) {
  if (members.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <TreePine className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-stone-700">Silsilah Belum Ada</h2>
          <p className="text-sm text-stone-400 mt-1 max-w-xs">
            Tambahkan anggota keluarga terlebih dahulu untuk melihat pohon silsilah
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <ReactFlowProvider>
        <FamilyTreeInner members={members} relationships={relationships} />
      </ReactFlowProvider>
    </div>
  );
}
