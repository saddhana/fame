'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User, MapPin, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { FamilyMember } from '@/types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export function MemberCard({ member }: { member: FamilyMember }) {
  return (
    <Link
      href={`/members/${member.id}`}
      className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100/50 shadow-sm hover:shadow-md hover:border-amber-200/50 transition-all duration-300 overflow-hidden"
    >
      {/* Photo */}
      <div className="aspect-square relative bg-linear-to-br from-amber-100 to-orange-50 overflow-hidden">
        {member.profile_photo_url ? (
          <Image
            src={member.profile_photo_url}
            alt={member.full_name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-16 h-16 text-amber-300/60" />
          </div>
        )}

        {/* Generation badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-white/90 text-amber-700 border-0 shadow-sm text-sm font-medium">
            Gen {member.generation}
          </Badge>
        </div>

        {/* Deceased indicator */}
        {member.death_date && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-stone-800/70 text-white border-0 text-sm">
              Almarhum{member.gender === 'P' ? 'ah' : ''}
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 lg:p-4">
        <h3 className="font-semibold text-base lg:text-lg text-amber-950 truncate group-hover:text-amber-700 transition-colors">
          {member.full_name}
        </h3>

        {member.nickname && (
          <p className="text-sm lg:text-base text-amber-600/70 truncate">&ldquo;{member.nickname}&rdquo;</p>
        )}

        <div className="mt-2 space-y-1">
          {member.birth_date && (
            <p className="text-sm text-amber-600/50 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(member.birth_date), 'd MMM yyyy', { locale: idLocale })}
            </p>
          )}
          {member.birth_place && (
            <p className="text-sm text-amber-600/50 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{member.birth_place}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
