'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function JunctionNodeComponent() {
  return (
    <div style={{ width: 2, height: 2 }} className="relative">
      <Handle type="target" position={Position.Top} id="top" className="opacity-0! w-1! h-1! min-w-0! min-h-0!" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="opacity-0! w-1! h-1! min-w-0! min-h-0!" />
    </div>
  );
}

export const JunctionNode = memo(JunctionNodeComponent);
