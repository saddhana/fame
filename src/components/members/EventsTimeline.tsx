import Link from 'next/link';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Baby, Heart, Star, Sunset, Calendar } from 'lucide-react';
import type { FamilyMember, Relationship } from '@/types';

type LifeEvent = {
  date: string | null;
  sortKey: number;
  type: 'birth' | 'marriage' | 'child_born' | 'death';
  label: string;
  sublabel?: string;
  href?: string;
};

function fmtDate(d: string) {
  return format(new Date(d), 'd MMMM yyyy', { locale: idLocale });
}

const icons = {
  birth: <Baby className="w-3.5 h-3.5" />,
  marriage: <Heart className="w-3.5 h-3.5" />,
  child_born: <Star className="w-3.5 h-3.5" />,
  death: <Sunset className="w-3.5 h-3.5" />,
};

const colors = {
  birth:      'bg-emerald-100 text-emerald-600 border-emerald-200',
  marriage:   'bg-rose-100   text-rose-600   border-rose-200',
  child_born: 'bg-amber-100  text-amber-600  border-amber-200',
  death:      'bg-stone-100  text-stone-500  border-stone-200',
};

export function EventsTimeline({
  member,
  spouses,
  memberChildren,
}: {
  member: FamilyMember;
  spouses: (FamilyMember & { relationship: Relationship })[];
  memberChildren: FamilyMember[];
}) {
  const events: LifeEvent[] = [];

  if (member.birth_date) {
    events.push({
      date: member.birth_date,
      sortKey: new Date(member.birth_date).getTime(),
      type: 'birth',
      label: 'Lahir',
      sublabel: member.birth_place || undefined,
    });
  }

  for (const s of spouses) {
    if (s.relationship.marriage_date) {
      events.push({
        date: s.relationship.marriage_date,
        sortKey: new Date(s.relationship.marriage_date).getTime(),
        type: 'marriage',
        label: s.relationship.is_active ? `Menikah dengan ${s.full_name}` : `Menikah dengan ${s.full_name} (Bercerai)`,
        href: `/members/${s.id}`,
      });
    }
  }

  for (const c of memberChildren) {
    if (c.birth_date) {
      events.push({
        date: c.birth_date,
        sortKey: new Date(c.birth_date).getTime(),
        type: 'child_born',
        label: `Kelahiran ${c.full_name}`,
        href: `/members/${c.id}`,
      });
    }
  }

  if (member.death_date) {
    events.push({
      date: member.death_date,
      sortKey: new Date(member.death_date).getTime(),
      type: 'death',
      label: 'Meninggal dunia',
    });
  }

  if (events.length === 0) return null;

  events.sort((a, b) => a.sortKey - b.sortKey);

  return (
    <div>
      <h2 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-amber-400" />
        Jejak Hidup
      </h2>
      <ol className="relative border-l-2 border-amber-100 ml-2 space-y-5">
        {events.map((ev, i) => {
          const content = (
            <div className={`ml-5 ${ev.href ? 'hover:opacity-80 transition-opacity' : ''}`}>
              <div className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 flex items-center justify-center ${colors[ev.type]}`}>
                {icons[ev.type]}
              </div>
              <p className="text-sm font-medium text-amber-900">{ev.label}</p>
              {ev.sublabel && <p className="text-xs text-amber-600/60">{ev.sublabel}</p>}
              {ev.date && (
                <p className="text-xs text-amber-500/70 mt-0.5">{fmtDate(ev.date)}</p>
              )}
            </div>
          );

          return (
            <li key={i} className="relative">
              {ev.href ? (
                <Link href={ev.href}>{content}</Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
