import { Heart, Github, TreePine, Users, Camera, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-600 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-600/20">
          <TreePine className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-amber-950">FAME</h1>
        <p className="text-amber-600/70 mt-1">Family Memory — Kenangan Keluarga</p>
      </div>

      {/* About card */}
      <Card className="border-amber-100/50 shadow-sm bg-white/80 backdrop-blur-sm mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-amber-900 flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-amber-600" />
            Tentang Aplikasi
          </h2>
          <div className="space-y-3 text-sm text-amber-800/80 leading-relaxed">
            <p>
              <strong>FAME</strong> (Family Memory) adalah aplikasi web untuk mencatat dan
              menyimpan silsilah keluarga besar kita. Melalui aplikasi ini, setiap anggota
              keluarga dapat melihat, menambah, dan memperbarui data keluarga dengan mudah.
            </p>
            <p>
              Aplikasi ini dibuat dengan tujuan agar hubungan keluarga tetap terjaga dan
              generasi mendatang dapat mengenal leluhur serta saudara-saudara mereka.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="border-amber-100/50 shadow-sm bg-white/80 backdrop-blur-sm mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">Fitur Utama</h2>
          <div className="grid gap-4">
            {[
              {
                icon: TreePine,
                title: 'Silsilah Keluarga',
                desc: 'Visualisasi pohon keluarga interaktif yang menampilkan hubungan antar anggota.',
              },
              {
                icon: Users,
                title: 'Data Anggota',
                desc: 'Profil lengkap setiap anggota keluarga termasuk biodata, foto, dan kontak.',
              },
              {
                icon: Camera,
                title: 'Galeri Foto',
                desc: 'Kumpulan foto keluarga, pribadi, dan acara keluarga yang tersimpan aman.',
              },
              {
                icon: Heart,
                title: 'Hubungan Keluarga',
                desc: 'Pencatatan hubungan orangtua-anak, pasangan, dan saudara lengkap dengan riwayat.',
              },
            ].map((feature) => (
              <div key={feature.title} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <feature.icon className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-900 text-sm">{feature.title}</p>
                  <p className="text-xs text-amber-700/60 mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tech & Credits */}
      <Card className="border-amber-100/50 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">Teknologi</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Next.js 15', 'React', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Cloudinary', 'Vercel'].map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-100"
              >
                {tech}
              </span>
            ))}
          </div>

          <Separator className="bg-amber-100/50 my-4" />

          <p className="text-xs text-center text-amber-600/50">
            Dibuat dengan <Heart className="w-3 h-3 inline text-rose-400" /> untuk keluarga besar kita
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
