import Link from 'next/link';
import { TreePine, Users, Camera, GitBranch, ArrowRight, Heart } from 'lucide-react';
import { getMembers } from '@/actions/members';
import { getPhotoCount } from '@/actions/photos';
import { WhatsAppJoinButton } from '@/components/WhatsAppJoinButton';

export default async function HomePage() {
  let memberCount = 0;
  let generationCount = 0;
  let photoCount = 0;

  try {
    const members = await getMembers();
    memberCount = members.length;
    const generations = new Set(members.map(m => m.generation));
    generationCount = generations.size;
    photoCount = await getPhotoCount();
  } catch {
    // Supabase not configured yet
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-5 pt-16 pb-10 lg:pt-24 lg:pb-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 shadow-xl shadow-emerald-500/30 mb-6">
          <TreePine className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl lg:text-6xl font-bold text-stone-900 tracking-tight mb-3">
          FAME
        </h1>
        <p className="text-lg text-stone-500 flex items-center justify-center gap-2 mb-4">
          <Heart className="w-4 h-4 text-emerald-500" />
          Silsilah Keluarga Kita
        </p>
        <p className="text-base text-stone-400 max-w-md mx-auto leading-relaxed">
          Tempat kita menyimpan cerita, menghubungkan generasi, dan merayakan ikatan keluarga yang tak ternilai.
        </p>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-5 pb-10">
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          {[
            { label: 'Anggota', value: memberCount, icon: Users, bg: 'bg-violet-500' },
            { label: 'Generasi', value: generationCount, icon: GitBranch, bg: 'bg-emerald-500' },
            { label: 'Foto', value: photoCount, icon: Camera, bg: 'bg-rose-500' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm border border-stone-100 text-center"
            >
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl ${stat.bg} shadow-sm mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl lg:text-4xl font-bold text-stone-900 leading-none mb-1">{stat.value}</p>
              <p className="text-sm text-stone-400 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WhatsApp Group */}
      <section className="max-w-5xl mx-auto px-5 pb-6">
        <WhatsAppJoinButton />
      </section>

      {/* Quick Actions */}
      <section className="max-w-5xl mx-auto px-5 pb-12">
        <h2 className="text-xl font-bold text-stone-800 mb-4">Jelajahi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              href: '/family-tree',
              icon: GitBranch,
              title: 'Lihat Silsilah Keluarga',
              desc: 'Jelajahi pohon keluarga interaktif dengan visualisasi yang indah',
              accent: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100',
              iconBg: 'bg-emerald-500',
            },
            {
              href: '/members',
              icon: Users,
              title: 'Daftar Anggota Keluarga',
              desc: 'Lihat profil, biodata, dan hubungan setiap anggota keluarga',
              accent: 'bg-violet-50 hover:bg-violet-100 border-violet-100',
              iconBg: 'bg-violet-500',
            },
            {
              href: '/gallery',
              icon: Camera,
              title: 'Galeri Foto Keluarga',
              desc: 'Koleksi foto-foto berharga momen keluarga kita',
              accent: 'bg-rose-50 hover:bg-rose-100 border-rose-100',
              iconBg: 'bg-rose-500',
            },
            {
              href: '/members/new',
              icon: Users,
              title: 'Tambah Anggota Baru',
              desc: 'Daftarkan anggota keluarga baru ke dalam silsilah',
              accent: 'bg-blue-50 hover:bg-blue-100 border-blue-100',
              iconBg: 'bg-blue-500',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.accent} rounded-2xl p-5 border transition-all duration-150 group active:scale-[0.98]`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center shadow-sm shrink-0`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-stone-900 flex items-center gap-1.5 mb-1">
                    {item.title}
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-sm text-stone-500 leading-snug">{item.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
