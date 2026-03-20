import Link from 'next/link';
import { TreePine, Users, Camera, GitBranch, ArrowRight, Heart } from 'lucide-react';
import { getMembers } from '@/actions/members';
import { getPhotoCount } from '@/actions/photos';

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
    // Supabase not configured yet — show demo state
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-amber-100/80 via-orange-50 to-yellow-50" />
        <div className="absolute inset-0">
          <div className="absolute top-10 right-20 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-10 w-72 h-72 bg-orange-200/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16 lg:py-24">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-600/25 mb-6">
              <TreePine className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-amber-950 tracking-tight mb-3">
              FAME
            </h1>
            <p className="text-lg text-amber-700/80 flex items-center justify-center gap-2">
              <Heart className="w-4 h-4 text-amber-500" />
              Silsilah Keluarga Kita
            </p>
            <p className="mt-4 text-amber-800/60 max-w-lg mx-auto leading-relaxed">
              Tempat kita menyimpan cerita, menghubungkan generasi, dan merayakan ikatan keluarga yang tak ternilai.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Anggota', value: memberCount, icon: Users, color: 'from-amber-500 to-orange-500' },
            { label: 'Generasi', value: generationCount, icon: GitBranch, color: 'from-emerald-500 to-teal-500' },
            { label: 'Foto', value: photoCount, icon: Camera, color: 'from-rose-400 to-pink-500' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-amber-100/50 text-center"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br ${stat.color} shadow-sm mb-2`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-amber-950">{stat.value}</p>
              <p className="text-xs text-amber-600/70 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-lg font-semibold text-amber-900 mb-6">Jelajahi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              href: '/family-tree',
              icon: GitBranch,
              title: 'Lihat Silsilah Keluarga',
              desc: 'Jelajahi pohon keluarga interaktif dengan visualisasi yang indah',
              color: 'bg-linear-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100',
              iconColor: 'from-amber-500 to-orange-500',
            },
            {
              href: '/members',
              icon: Users,
              title: 'Daftar Anggota Keluarga',
              desc: 'Lihat profil, biodata, dan hubungan setiap anggota keluarga',
              color: 'bg-linear-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100',
              iconColor: 'from-emerald-500 to-teal-500',
            },
            {
              href: '/gallery',
              icon: Camera,
              title: 'Galeri Foto Keluarga',
              desc: 'Koleksi foto-foto berharga momen keluarga kita',
              color: 'bg-linear-to-br from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100',
              iconColor: 'from-rose-400 to-pink-500',
            },
            {
              href: '/members/new',
              icon: Users,
              title: 'Tambah Anggota Baru',
              desc: 'Daftarkan anggota keluarga baru ke dalam silsilah',
              color: 'bg-linear-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100',
              iconColor: 'from-blue-500 to-indigo-500',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.color} rounded-2xl p-5 border border-white/50 shadow-sm transition-all duration-200 group`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${item.iconColor} flex items-center justify-center shadow-sm shrink-0`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-amber-950 flex items-center gap-2">
                    {item.title}
                    <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </h3>
                  <p className="text-sm text-amber-700/60 mt-1">{item.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
