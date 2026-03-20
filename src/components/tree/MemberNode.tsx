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
  const isDeceased = !!member.death_date;

  return (
    <>
      <Handle type="target" position={Position.Top} id="top" className="bg-amber-500! w-2! h-2! border-2! border-amber-300!" />
      <Handle type="source" position={Position.Right} id="right" className="bg-amber-500! w-2! h-2! border-2! border-amber-300!" />
      <Handle type="target" position={Position.Left} id="left" className="bg-amber-500! w-2! h-2! border-2! border-amber-300!" />

      <div
        onClick={() => router.push(`/members/${member.id}`)}
        className={`
          group cursor-pointer rounded-xl border-2 shadow-md hover:shadow-lg transition-all duration-200
          bg-white min-w-45
          ${isDeceased
            ? 'border-stone-300 opacity-80'
            : isMale
              ? 'border-blue-200 hover:border-blue-300'
              : 'border-pink-200 hover:border-pink-300'
          }
        `}
      >
        <div className="flex items-center gap-3 p-3">
          {/* Avatar */}
          <div className={`
            w-10 h-10 rounded-lg overflow-hidden shrink-0 ring-2
            ${isDeceased
              ? 'ring-stone-200'
              : isMale
                ? 'ring-blue-100'
                : 'ring-pink-100'
            }
          `}>
            {member.profile_photo_url ? (
              <Image
                src={member.profile_photo_url}
                alt={member.full_name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                isDeceased ? 'bg-stone-100' : isMale ? 'bg-blue-50' : 'bg-pink-50'
              }`}>
                <User className={`w-5 h-5 ${
                  isDeceased ? 'text-stone-300' : isMale ? 'text-blue-300' : 'text-pink-300'
                }`} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-950 truncate max-w-30 group-hover:text-amber-700 transition-colors">
              {member.full_name}
            </p>
            {member.nickname && (
              <p className="text-[10px] text-amber-600/60 truncate max-w-30">
                &ldquo;{member.nickname}&rdquo;
              </p>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`
                inline-block w-1.5 h-1.5 rounded-full
                ${isDeceased ? 'bg-stone-400' : 'bg-emerald-400'}
              `} />
              <span className="text-[9px] text-amber-500">
                Gen {member.generation}
                {member.birth_date && ` • ${new Date(member.birth_date).getFullYear()}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" className="bg-amber-500! w-2! h-2! border-2! border-amber-300!" />
    </>
  );
}

export const MemberNode = memo(MemberNodeComponent);
