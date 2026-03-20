import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { MemberForm } from '@/components/members/MemberForm';

export default function AddMemberPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link href="/members" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke daftar
      </Link>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100/50 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-amber-950 flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          Tambah Anggota Baru
        </h1>

        <MemberForm mode="create" />
      </div>
    </div>
  );
}
