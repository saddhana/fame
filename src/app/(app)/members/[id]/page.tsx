import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format, differenceInYears } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  User, Calendar, MapPin, Phone, Mail, Home as HomeIcon,
  Edit, ChevronRight, Heart, Users, HeartHandshake, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMemberById, getMembers } from '@/actions/members';
import { getSpouses, getParents, getChildren, getSiblings, getChildrenInLaw, getParentsInLaw } from '@/actions/relationships';
import { getPhotosByMember } from '@/actions/photos';
import { RelationshipManager } from '@/components/members/RelationshipManager';
import { EventsTimeline } from '@/components/members/EventsTimeline';
import { RelationshipPathFinder } from '@/components/members/RelationshipPathFinder';
import { RemoveRelationshipButton } from '@/components/members/RemoveRelationshipButton';
import { EndMarriageButton } from '@/components/members/EndMarriageButton';
import { LocationMap } from '@/components/members/LocationMap';

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ addRel?: string }>;
}) {
  const { id } = await params;
  const autoAddRel = (await searchParams)?.addRel;
  const member = await getMemberById(id);
  if (!member) notFound();

  const [spouses, parents, children, siblings, childrenInLaw, parentsInLaw, photos, allMembers] = await Promise.all([
    getSpouses(id),
    getParents(id),
    getChildren(id),
    getSiblings(id),
    getChildrenInLaw(id),
    getParentsInLaw(id),
    getPhotosByMember(id),
    getMembers(),
  ]);

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), 'd MMMM yyyy', { locale: idLocale });
  };

  const dateCmp = (a: string | null, b: string | null) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  };
  const genderFirst = (x: { gender: string }, y: { gender: string }) =>
    (x.gender === 'L' ? 0 : 1) - (y.gender === 'L' ? 0 : 1);

  parents.sort(genderFirst);
  parentsInLaw.sort(genderFirst);
  children.sort((a, b) => dateCmp(a.birth_date, b.birth_date));
  siblings.sort((a, b) => dateCmp(a.birth_date, b.birth_date));
  childrenInLaw.sort((a, b) => dateCmp(a._spouseBirthDate, b._spouseBirthDate));

  const isDeceased = !!member.death_date;
  const isMale = member.gender === 'L';

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
      {/* Breadcrumb + Edit */}
      <div className="flex items-center justify-between mb-5">
        <nav className="flex items-center gap-1.5 text-sm text-stone-400 min-w-0">
          <Link href="/members" className="hover:text-emerald-600 transition-colors shrink-0">Anggota</Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <span className="text-stone-700 font-medium truncate">{member.full_name}</span>
        </nav>
        <Link href={`/members/${id}/edit`} className="shrink-0 ml-3">
          <Button variant="outline" size="sm" className="border-stone-200 text-stone-600 hover:bg-stone-50 text-sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">
        {/* Color accent strip */}
        <div className="rounded-t-2xl overflow-hidden">
          <div className={`h-1.5 ${isDeceased ? 'bg-stone-300' : 'bg-linear-to-r from-emerald-400 via-emerald-500 to-emerald-600'}`} />
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Photo */}
            <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 ring-4 shadow-md ${
              isDeceased ? 'ring-stone-100' : isMale ? 'ring-emerald-100' : 'ring-emerald-100'
            }`}>
              {member.profile_photo_url ? (
                <Image
                  src={member.profile_photo_url}
                  alt={member.full_name}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${isDeceased ? 'bg-stone-100' : 'bg-emerald-50'}`}>
                  <User className={`w-12 h-12 ${isDeceased ? 'text-stone-300' : 'text-emerald-300'}`} />
                </div>
              )}
            </div>

            {/* Name & basic info */}
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
                  {isDeceased && <span className="text-stone-400 mr-1 text-xl">†</span>}
                  {member.full_name}
                </h1>
                <Badge className="bg-amber-100 text-emerald-700 border-0 text-xs font-medium">
                  Gen {member.generation}
                </Badge>
                {isDeceased && (
                  <Badge variant="secondary" className="bg-stone-100 text-stone-500 border-0 text-xs">
                    Almarhum{member.gender === 'P' ? 'ah' : ''}
                  </Badge>
                )}
              </div>

              {member.nickname && (
                <p className="text-base text-stone-400 italic mb-2">&ldquo;{member.nickname}&rdquo;</p>
              )}

              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-stone-500">
                {member.birth_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    {formatDate(member.birth_date)}
                  </span>
                )}
                {member.birth_place && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {member.birth_place}
                  </span>
                )}
                {!isDeceased && member.birth_date && (
                  <span className="text-emerald-600 font-medium text-sm">
                    {differenceInYears(new Date(), new Date(member.birth_date))} tahun
                  </span>
                )}
              </div>

              {isDeceased && member.death_date && (
                <p className="text-sm text-stone-400 mt-1.5 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Calendar className="w-3.5 h-3.5" />
                  Meninggal: {formatDate(member.death_date)}
                  {member.birth_date && (
                    <span className="text-stone-300">· {differenceInYears(new Date(member.death_date), new Date(member.birth_date))} tahun</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="px-6 sm:px-8 pb-8 space-y-8">
          {/* Relationship finder — prominent placement */}
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
            <RelationshipPathFinder
              currentMemberId={id}
              currentMemberName={member.full_name}
              members={allMembers}
            />
          </div>

          {/* Bio */}
          {member.bio && (
            <div>
              <SectionHeader title="Biografi" />
              <p className="text-base text-stone-600 leading-relaxed whitespace-pre-wrap">{member.bio}</p>
            </div>
          )}

          {/* Life events timeline */}
          {(member.birth_date || member.death_date || spouses.some(s => s.relationship.marriage_date) || children.some(c => c.birth_date)) && (
            <div>
              <EventsTimeline member={member} spouses={spouses} memberChildren={children} />
            </div>
          )}

          {/* Contact */}
          {(member.phone || member.email || member.address) && (
            <div>
              <SectionHeader title="Kontak" />
              <div className="space-y-2.5">
                {member.phone && (
                  <p className="text-sm text-stone-600 flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    {member.phone}
                  </p>
                )}
                {member.email && (
                  <p className="text-sm text-stone-600 flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                    {member.email}
                  </p>
                )}
                {member.address && (
                  <p className="text-sm text-stone-600 flex items-center gap-2.5">
                    <HomeIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    {member.address}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Location Map */}
          {member.location_lat && member.location_lng && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader title="Lokasi" noMargin />
                <a
                  href={`https://www.google.com/maps?q=${member.location_lat},${member.location_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 transition-colors font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Google Maps
                </a>
              </div>
              <div className="rounded-xl overflow-hidden shadow-sm border border-stone-100">
                <LocationMap lat={member.location_lat} lng={member.location_lng} />
              </div>
            </div>
          )}

          {/* Social Media */}
          {(member.instagram || member.twitter || member.facebook || member.linkedin) && (
            <div>
              <SectionHeader title="Media Sosial" />
              <div className="flex flex-wrap gap-2.5">
                {member.instagram && (
                  <a
                    href={`https://instagram.com/${member.instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-100 text-pink-600 hover:bg-pink-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    @{member.instagram.replace(/^@/, '')}
                  </a>
                )}
                {member.twitter && (
                  <a
                    href={`https://x.com/${member.twitter.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    @{member.twitter.replace(/^@/, '')}
                  </a>
                )}
                {member.facebook && (
                  <a
                    href={member.facebook.startsWith('http') ? member.facebook : `https://facebook.com/${member.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    {member.facebook.startsWith('http') ? 'Facebook' : member.facebook}
                  </a>
                )}
                {member.linkedin && (
                  <a
                    href={member.linkedin.startsWith('http') ? member.linkedin : `https://linkedin.com/in/${member.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-100 text-sky-700 hover:bg-sky-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    {member.linkedin.startsWith('http') ? 'LinkedIn' : member.linkedin}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Relationships */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Hubungan Keluarga" noMargin />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RelationSection
                icon={<Users className="w-3.5 h-3.5" />}
                title="Orang Tua"
                members={parents}
                addButton={<RelationshipManager memberId={id} memberName={member.full_name} defaultRelType="parent" defaultOpen={autoAddRel === 'parent'} />}
              />
              <RelationSection
                icon={<HeartHandshake className="w-3.5 h-3.5" />}
                title="Pasangan"
                members={spouses.map(s => ({
                  ...s,
                  _relationshipId: s.relationship.id,
                  _isActiveRel: s.relationship.is_active,
                  _badge: !s.relationship.is_active ? 'Bercerai' : s.relationship.marriage_order && s.relationship.marriage_order > 1 ? `Pernikahan ke-${s.relationship.marriage_order}` : undefined,
                }))}
                addButton={<RelationshipManager memberId={id} memberName={member.full_name} defaultRelType="spouse" defaultOpen={autoAddRel === 'spouse'} />}
              />
              <RelationSection
                icon={<Heart className="w-3.5 h-3.5" />}
                title="Anak"
                members={children}
                addButton={<RelationshipManager memberId={id} memberName={member.full_name} defaultRelType="child" defaultOpen={autoAddRel === 'child'} />}
              />
              <RelationSection
                icon={<Users className="w-3.5 h-3.5" />}
                title="Saudara"
                members={siblings}
                hint="Ditentukan otomatis dari orang tua yang sama"
              />
              <RelationSection
                icon={<Users className="w-3.5 h-3.5" />}
                title="Mertua"
                members={parentsInLaw}
                hint="Ditentukan otomatis dari orang tua pasangan"
              />
              <RelationSection
                icon={<Heart className="w-3.5 h-3.5" />}
                title="Menantu"
                members={childrenInLaw}
                hint="Ditentukan otomatis dari pasangan anak"
              />
            </div>

          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader title={`Foto (${photos.length})`} noMargin />
                {photos.length > 8 && (
                  <Link href={`/gallery?member=${id}`} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    Lihat semua →
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.slice(0, 8).map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-stone-100">
                    <Image
                      src={photo.thumbnail_url || photo.url}
                      alt={photo.caption || 'Foto'}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, noMargin }: { title: string; noMargin?: boolean }) {
  return (
    <h2 className={`text-base font-semibold text-stone-800 flex items-center gap-2 ${noMargin ? '' : 'mb-3'}`}>
      <span className="w-0.5 h-4 bg-emerald-500 rounded-full inline-block shrink-0" />
      {title}
    </h2>
  );
}

function RelationSection({
  icon,
  title,
  members,
  addButton,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  members: (import('@/types').FamilyMember & { _badge?: string; _relationshipId?: string; _isActiveRel?: boolean })[];
  addButton?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-stone-100 hover:border-stone-200 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-stone-600 uppercase tracking-widest flex items-center gap-1.5">
          <span className="text-emerald-500">{icon}</span>
          {title}
        </h3>
        {addButton}
      </div>
      {members.length === 0 ? (
        <div>
          <p className="text-sm text-stone-400">Belum ada data</p>
          {hint && <p className="text-xs text-stone-400 mt-0.5">{hint}</p>}
        </div>
      ) : (
        <div className="space-y-1.5">
          {hint && <p className="text-xs text-stone-400 mb-2">{hint}</p>}
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <Link
                href={`/members/${m.id}`}
                className="flex items-center gap-2.5 text-sm text-stone-700 hover:text-emerald-700 transition-colors min-w-0 flex-1 py-0.5 group"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-stone-100 shrink-0 ring-1 ring-stone-200 group-hover:ring-emerald-200 transition-all">
                  {m.profile_photo_url ? (
                    <Image src={m.profile_photo_url} alt="" width={28} height={28} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-3 h-3 text-stone-300" />
                    </div>
                  )}
                </div>
                <span className="truncate font-medium">{m.full_name}</span>
                {'_badge' in m && m._badge && (
                  <Badge variant="outline" className="text-xs border-stone-200 text-stone-400 shrink-0">
                    {m._badge}
                  </Badge>
                )}
              </Link>
              {'_isActiveRel' in m && m._isActiveRel && m._relationshipId && (
                <EndMarriageButton relationshipId={m._relationshipId} spouseName={m.full_name} />
              )}
              {'_relationshipId' in m && m._relationshipId && (
                <RemoveRelationshipButton relationshipId={m._relationshipId} label={m.full_name} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
