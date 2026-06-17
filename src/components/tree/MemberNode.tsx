'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User } from 'lucide-react';
import type { FamilyMember } from '@/types';

function MemberNodeComponent({ data }: NodeProps) {
  const router = useRouter();
  const member = data.member as FamilyMember;

  const isMale = member.gender === 'L';
  const isDeceased = member.is_deceased || !!member.death_date;

  const accentColor = isDeceased ? '#a8a29e' : isMale ? '#3b82f6' : '#f43f5e';
  const avatarBg = isDeceased ? 'bg-stone-100' : isMale ? 'bg-blue-50' : 'bg-rose-50';
  const avatarIcon = isDeceased ? 'text-stone-300' : isMale ? 'text-blue-300' : 'text-rose-300';

  return (
    <>
      <Handle type="target" position={Position.Top} id="top" className="w-1! h-1! bg-transparent! border-0! opacity-0!" />
      <Handle type="source" position={Position.Right} id="right" className="w-1! h-1! bg-transparent! border-0! opacity-0!" />
      <Handle type="target" position={Position.Left} id="left" className="w-1! h-1! bg-transparent! border-0! opacity-0!" />

      <div
        onClick={() => router.push(`/members/${member.id}`)}
        style={{ borderTopColor: accentColor }}
        className="group cursor-pointer rounded-xl border border-stone-200 border-t-[3px] bg-white shadow-sm hover:shadow-md transition-all duration-150 min-w-52.5"
      >
        <div className="flex items-center gap-3 p-3.5">
          {/* Avatar */}
          <div className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 ${avatarBg}`}>
            {member.profile_photo_url ? (
              <Image
                src={member.profile_photo_url}
                alt={member.full_name}
                width={44}
                height={44}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center`}>
                <User className={`w-5 h-5 ${avatarIcon}`} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <p className="text-sm font-bold text-stone-900 truncate max-w-35 group-hover:text-emerald-700 transition-colors">
              {isDeceased && <span className="text-stone-400 mr-1 text-xs font-medium">{isMale ? 'Alm.' : 'Almh.'}</span>}
              {member.full_name}
            </p>
            {member.nickname && (
              <p className="text-xs text-stone-500 truncate max-w-35">
                &ldquo;{member.nickname}&rdquo;
              </p>
            )}
            <p className="text-xs font-medium text-stone-500 mt-0.5">
              Gen {member.generation}
              {member.birth_date && ` · ${new Date(member.birth_date).getFullYear()}`}
            </p>
          </div>
        </div>

        {/* Inline add actions — smooth height expand on hover */}
        <div
          className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-hidden">
            <div className="border-t border-stone-100 px-1.5 py-1 flex items-center justify-center gap-0.5">
              {[
                { label: '+ Ortu', param: 'parent' },
                { label: '+ Pasangan', param: 'spouse' },
                { label: '+ Anak', param: 'child' },
              ].map(({ label, param }) => (
                <button
                  key={param}
                  onClick={() => router.push(`/members/${member.id}?addRel=${param}`)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-stone-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" className="w-1! h-1! bg-transparent! border-0! opacity-0!" />
    </>
  );
}

export const MemberNode = memo(MemberNodeComponent);
