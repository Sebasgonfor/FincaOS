'use client';

import Image from 'next/image';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function AppHeader() {
  const { perfil } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border safe-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <Image
          src="/image.png"
          alt="FincaOS"
          width={110}
          height={40}
          className="object-contain"
          priority
        />
        <div className="flex items-center gap-2">
          {perfil?.comunidad && (
            <span className="text-xs text-muted-foreground bg-finca-peach/50 px-2 py-1 rounded-full max-w-[140px] truncate">
              {(perfil.comunidad as any).nombre}
            </span>
          )}
          <Button variant="ghost" size="icon" className="relative w-9 h-9">
            <Bell className="w-5 h-5 text-finca-dark" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-finca-coral rounded-full" />
          </Button>
        </div>
      </div>
    </header>
  );
}
