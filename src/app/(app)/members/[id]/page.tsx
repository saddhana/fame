import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  User, Calendar, MapPin, Phone, Mail, Home as HomeIcon,
  Edit, ArrowLeft, Heart, Users, HeartHandshake, Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getMemberById } from '@/actions/members';
import { getSpouses, getParents, getChildren, getSiblings, getChildrenInLaw, getParentsInLaw } from '@/actions/relationships';
import { getPhotosByMember } from '@/actions/photos';
import { RelationshipManager } from '@/components/members/RelationshipManager';
import { RemoveRelationshipButton } from '@/components/members/RemoveRelationshipButton';

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) notFound();

  const [spouses, parents, children, siblings, childrenInLaw, parentsInLaw, photos] = await Promise.all([
    getSpouses(id),
    getParents(id),
    getChildren(id),
    getSiblings(id),
    getChildrenInLaw(id),
    getParentsInLaw(id),
    getPhotosByMember(id),
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

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/members" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-base font-medium active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
          Kembali
        </Link>
        <Link href={`/members/${id}/edit`}>
          <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50 text-sm py-2 px-3">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Profile Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100/50 shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-amber-100/80 to-orange-50 p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Photo */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-white shadow-lg ring-4 ring-white/80 shrink-0">
              {member.profile_photo_url ? (
                <Image
                  src={member.profile_photo_url}
                  alt={member.full_name}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-amber-100 to-orange-50">
                  <User className="w-12 h-12 text-amber-300/60" />
                </div>
              )}
            </div>

            {/* Name & basic info */}
            <div className="text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-amber-950">{member.full_name}</h1>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                  Gen {member.generation}
                </Badge>
                {member.death_date && (
                  <Badge variant="secondary" className="bg-stone-200 text-stone-600 border-0 text-xs">
                    Almarhum{member.gender === 'P' ? 'ah' : ''}
                  </Badge>
                )}
              </div>

              {member.nickname && (
                <p className="text-lg text-amber-600/70">&ldquo;{member.nickname}&rdquo;</p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-base text-amber-700/70">
                {member.birth_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(member.birth_date)}
                  </span>
                )}
                {member.birth_place && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {member.birth_place}
                  </span>
                )}
              </div>

              {member.death_date && (
                <p className="text-base text-stone-500 mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Calendar className="w-3.5 h-3.5" />
                  Meninggal: {formatDate(member.death_date)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8 space-y-6">
          {/* Bio */}
          {member.bio && (
            <div>
              <h2 className="text-base font-semibold text-amber-800 mb-2">Biografi</h2>
              <p className="text-lg text-amber-800/70 leading-relaxed whitespace-pre-wrap">{member.bio}</p>
            </div>
          )}

          {/* Contact */}
          {(member.phone || member.email || member.address) && (
            <>
              <Separator className="bg-amber-100" />
              <div>
                <h2 className="text-lg font-semibold text-amber-800 mb-3">Kontak</h2>
                <div className="space-y-2.5">
                  {member.phone && (
                    <p className="text-base text-amber-700/70 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-amber-400" />
                      {member.phone}
                    </p>
                  )}
                  {member.email && (
                    <p className="text-base text-amber-700/70 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-amber-400" />
                      {member.email}
                    </p>
                  )}
                  {member.address && (
                    <p className="text-base text-amber-700/70 flex items-center gap-2">
                      <HomeIcon className="w-4 h-4 text-amber-400" />
                      {member.address}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Social Media */}
          {(member.instagram || member.twitter || member.facebook || member.linkedin) && (
            <>
              <Separator className="bg-amber-100" />
              <div>
                <h2 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-amber-400" />
                  Media Sosial
                </h2>
                <div className="flex flex-wrap gap-3">
                  {member.instagram && (
                    <a
                      href={`https://instagram.com/${member.instagram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-linear-to-r from-purple-50 to-pink-50 border border-pink-100 text-pink-600 hover:border-pink-300 transition-colors text-sm font-medium"
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
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 hover:border-stone-400 transition-colors text-sm font-medium"
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
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 hover:border-blue-300 transition-colors text-sm font-medium"
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
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-100 text-sky-700 hover:border-sky-300 transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      {member.linkedin.startsWith('http') ? 'LinkedIn' : member.linkedin}
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Relationships */}
          <Separator className="bg-amber-100" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-amber-800">Hubungan Keluarga</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Parents */}
              <RelationSection
                icon={<Users className="w-4 h-4" />}
                title="Orang Tua"
                members={parents}
                addButton={<RelationshipManager memberId={id} memberName={member.full_name} defaultRelType="parent" />}
              />

              {/* Spouses */}
              <RelationSection
                icon={<HeartHandshake className="w-4 h-4" />}
                title="Pasangan"
                members={spouses.map(s => ({
                  ...s,
                  _relationshipId: s.relationship.id,
                  _badge: !s.relationship.is_active ? 'Bercerai' : s.relationship.marriage_order && s.relationship.marriage_order > 1 ? `Pernikahan ke-${s.relationship.marriage_order}` : undefined,
                }))}
                addButton={<RelationshipManager memberId={id} memberName={member.full_name} defaultRelType="spouse" />}
              />

              {/* Children */}
              <RelationSection
                icon={<Heart className="w-4 h-4" />}
                title="Anak"
                members={children}
                addButton={<RelationshipManager memberId={id} memberName={member.full_name} defaultRelType="child" />}
              />

              {/* Siblings */}
              <RelationSection
                icon={<Users className="w-4 h-4" />}
                title="Saudara"
                members={siblings}
              />

              {/* Parents-in-law */}
              <RelationSection
                icon={<Users className="w-4 h-4" />}
                title="Mertua"
                members={parentsInLaw}
              />

              {/* Children-in-law */}
              <RelationSection
                icon={<Heart className="w-4 h-4" />}
                title="Menantu"
                members={childrenInLaw}
              />
            </div>
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <>
              <Separator className="bg-amber-100" />
              <div>
                <h2 className="text-base font-semibold text-amber-800 mb-3">Foto ({photos.length})</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photos.slice(0, 8).map((photo) => (
                    <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-amber-50">
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
                {photos.length > 8 && (
                  <Link href={`/gallery?member=${id}`} className="text-sm text-amber-600 hover:text-amber-700 font-medium mt-2 inline-block">
                    Lihat semua foto →
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RelationSection({
  icon,
  title,
  members,
  addButton,
}: {
  icon: React.ReactNode;
  title: string;
  members: (import('@/types').FamilyMember & { _badge?: string; _relationshipId?: string })[];
  addButton?: React.ReactNode;
}) {
  return (
    <div className="bg-amber-50/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-amber-600/70 flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {addButton}
      </div>
      {members.length === 0 ? (
        <p className="text-base text-amber-400">Belum ada data</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <Link
                href={`/members/${m.id}`}
                className="flex items-center gap-2.5 text-lg text-amber-800 hover:text-amber-600 transition-colors min-w-0 flex-1 py-1 active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-amber-200/50 shrink-0">
                  {m.profile_photo_url ? (
                    <Image src={m.profile_photo_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  )}
                </div>
                <span className="truncate">{m.full_name}</span>
                {'_badge' in m && m._badge && (
                  <Badge variant="outline" className="text-xs border-amber-200 text-amber-500 shrink-0">
                    {m._badge}
                  </Badge>
                )}
              </Link>
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
