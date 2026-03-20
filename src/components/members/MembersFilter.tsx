'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function MembersFilter({ generations }: { generations: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get('q') || '';
  const currentGen = searchParams.get('gen') || '';

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Search */}
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
        <Input
          placeholder="Cari nama..."
          defaultValue={currentQuery}
          onChange={(e) => updateParams('q', e.target.value)}
          className="pl-10 h-12 text-lg sm:text-base sm:h-10 border-amber-200 focus:border-amber-400 focus:ring-amber-400/20 bg-white/80"
        />
      </div>

      {/* Generation filter */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-colors text-base px-4 py-2',
            !currentGen
              ? 'bg-amber-600 text-white border-amber-600'
              : 'border-amber-200 text-amber-700 hover:bg-amber-50'
          )}
          onClick={() => updateParams('gen', '')}
        >
          Semua
        </Badge>
        {generations.map((gen) => (
          <Badge
            key={gen}
            variant="outline"
            className={cn(
              'cursor-pointer transition-colors text-base px-4 py-2',
              currentGen === String(gen)
                ? 'bg-amber-600 text-white border-amber-600'
                : 'border-amber-200 text-amber-700 hover:bg-amber-50'
            )}
            onClick={() => updateParams('gen', String(gen))}
          >
            Gen {gen}
          </Badge>
        ))}
      </div>
    </div>
  );
}
