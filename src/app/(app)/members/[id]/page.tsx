import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  User, Calendar, MapPin, Phone, Mail, Home as HomeIcon,
  Edit, ArrowLeft, Heart, Users, HeartHandshake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getMemberById } from '@/actions/members';
import { getSpouses, getParents, getChildren, getSiblings } from '@/actions/relationships';
import { getPhotosByMember } from '@/actions/photos';
import { RelationshipManager } from '@/components/members/RelationshipManager';

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) notFound();

  const [spouses, parents, children, siblings, photos] = await Promise.all([
    getSpouses(id),
    getParents(id),
    getChildren(id),
    getSiblings(id),
    getPhotosByMember(id),
  ]);

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), 'd MMMM yyyy', { locale: idLocale });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/members" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Link>
        <Link href={`/members/${id}/edit`}>
          <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Profile Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100/50 shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-amber-100/80 to-orange-50 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
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
                <h1 className="text-2xl font-bold text-amber-950">{member.full_name}</h1>
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
                <p className="text-amber-600/70">&ldquo;{member.nickname}&rdquo;</p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-amber-700/70">
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
                <p className="text-sm text-stone-500 mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Calendar className="w-3.5 h-3.5" />
                  Meninggal: {formatDate(member.death_date)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Bio */}
          {member.bio && (
            <div>
              <h2 className="text-sm font-semibold text-amber-800 mb-2">Biografi</h2>
              <p className="text-amber-800/70 leading-relaxed whitespace-pre-wrap">{member.bio}</p>
            </div>
          )}

          {/* Contact */}
          {(member.phone || member.email || member.address) && (
            <>
              <Separator className="bg-amber-100" />
              <div>
                <h2 className="text-sm font-semibold text-amber-800 mb-3">Kontak</h2>
                <div className="space-y-2">
                  {member.phone && (
                    <p className="text-sm text-amber-700/70 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-amber-400" />
                      {member.phone}
                    </p>
                  )}
                  {member.email && (
                    <p className="text-sm text-amber-700/70 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-amber-400" />
                      {member.email}
                    </p>
                  )}
                  {member.address && (
                    <p className="text-sm text-amber-700/70 flex items-center gap-2">
                      <HomeIcon className="w-4 h-4 text-amber-400" />
                      {member.address}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Relationships */}
          <Separator className="bg-amber-100" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-amber-800">Hubungan Keluarga</h2>
              <RelationshipManager memberId={id} memberName={member.full_name} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Parents */}
              <RelationSection
                icon={<Users className="w-4 h-4" />}
                title="Orang Tua"
                members={parents}
              />

              {/* Spouses */}
              <RelationSection
                icon={<HeartHandshake className="w-4 h-4" />}
                title="Pasangan"
                members={spouses.map(s => ({
                  ...s,
                  _badge: !s.relationship.is_active ? 'Bercerai' : s.relationship.marriage_order && s.relationship.marriage_order > 1 ? `Pernikahan ke-${s.relationship.marriage_order}` : undefined,
                }))}
              />

              {/* Children */}
              <RelationSection
                icon={<Heart className="w-4 h-4" />}
                title="Anak"
                members={children}
              />

              {/* Siblings */}
              <RelationSection
                icon={<Users className="w-4 h-4" />}
                title="Saudara"
                members={siblings}
              />
            </div>
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <>
              <Separator className="bg-amber-100" />
              <div>
                <h2 className="text-sm font-semibold text-amber-800 mb-3">Foto ({photos.length})</h2>
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
}: {
  icon: React.ReactNode;
  title: string;
  members: (import('@/types').FamilyMember & { _badge?: string })[];
}) {
  return (
    <div className="bg-amber-50/50 rounded-xl p-4">
      <h3 className="text-xs font-medium text-amber-600/70 flex items-center gap-1.5 mb-2">
        {icon}
        {title}
      </h3>
      {members.length === 0 ? (
        <p className="text-xs text-amber-400">Belum ada data</p>
      ) : (
        <div className="space-y-1.5">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/members/${m.id}`}
              className="flex items-center gap-2 text-sm text-amber-800 hover:text-amber-600 transition-colors"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-amber-200/50 shrink-0">
                {m.profile_photo_url ? (
                  <Image src={m.profile_photo_url} alt="" width={24} height={24} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-3 h-3 text-amber-400" />
                  </div>
                )}
              </div>
              <span className="truncate">{m.full_name}</span>
              {'_badge' in m && m._badge && (
                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-500 shrink-0">
                  {m._badge}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
