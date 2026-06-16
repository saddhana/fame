import Link from 'next/link';
import { ChevronRight, UserPlus } from 'lucide-react';
import { MemberForm } from '@/components/members/MemberForm';

export default function AddMemberPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <nav className="flex items-center gap-1.5 text-sm text-amber-600/70 mb-6">
        <Link href="/members" className="hover:text-amber-700 transition-colors">Anggota</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-amber-950 font-medium">Tambah Anggota Baru</span>
      </nav>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100/50 shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-amber-950 flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          Tambah Anggota Baru
        </h1>

        <MemberForm mode="create" />
      </div>
    </div>
  );
}
