import { Suspense } from 'react';
import Link from 'next/link';
import { Users, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMembers } from '@/actions/members';
import { MemberCard } from '@/components/members/MemberCard';
import { MembersFilter } from '@/components/members/MembersFilter';

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; gen?: string }>;
}) {
  const params = await searchParams;

  let members: Awaited<ReturnType<typeof getMembers>> = [];
  try {
    members = await getMembers();
  } catch {
    // Supabase not configured
  }

  const query = params.q?.toLowerCase() || '';
  const genFilter = params.gen || '';

  let filtered = members;
  if (query) {
    filtered = filtered.filter(
      (m) =>
        m.full_name.toLowerCase().includes(query) ||
        m.nickname?.toLowerCase().includes(query)
    );
  }
  if (genFilter) {
    filtered = filtered.filter((m) => m.generation === parseInt(genFilter));
  }

  const generations = [...new Set(members.map((m) => m.generation))].sort();

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-amber-950 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            Anggota Keluarga
          </h1>
          <p className="text-sm text-amber-600/70 mt-1 ml-13">
            {members.length} anggota terdaftar
          </p>
        </div>

        <Link href="/members/new">
          <Button className="bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md shadow-amber-600/20">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Anggota
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Suspense fallback={null}>
        <MembersFilter generations={generations} />
      </Suspense>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-amber-300/60 mx-auto mb-4" />
          <p className="text-amber-700/70 font-medium">
            {members.length === 0
              ? 'Belum ada anggota keluarga terdaftar'
              : 'Tidak ditemukan anggota yang sesuai'}
          </p>
          <p className="text-sm text-amber-600/50 mt-1">
            {members.length === 0
              ? 'Mulai dengan menambahkan anggota keluarga pertama'
              : 'Coba ubah kata kunci pencarian'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
