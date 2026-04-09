'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Building2, Bell, Shield, ChevronRight, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function PerfilPage() {
  const { perfil, signOut, user } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const rolLabel: Record<string, string> = { vecino: 'Vecino', presidente: 'Presidente', admin: 'Administrador' };
  const rolColor: Record<string, string> = {
    vecino: 'bg-gray-100 text-gray-600 border-gray-200',
    presidente: 'bg-finca-peach/50 text-finca-coral border-finca-peach',
    admin: 'bg-finca-coral text-white border-finca-coral',
  };

  async function handleSignOut() {
    setLoggingOut(true);
    await signOut();
    router.replace('/login');
  }

  async function copiarCodigo() {
    if (!perfil?.comunidad_id) return;
    const { data } = await supabase.from('comunidades').select('codigo').eq('id', perfil.comunidad_id).single();
    if (data?.codigo) {
      navigator.clipboard.writeText(data.codigo);
      toast.success(`Código copiado: ${data.codigo}`);
    }
  }

  const iniciales = perfil?.nombre_completo
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('') || '?';

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-2xl font-semibold text-finca-dark">Mi perfil</h1>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-finca-coral to-finca-salmon" />
        <CardContent className="px-4 pb-4 -mt-10">
          <div className="flex items-end gap-3">
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center">
              <span className="text-2xl font-bold text-finca-coral">{iniciales}</span>
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <p className="font-semibold text-finca-dark truncate">{perfil?.nombre_completo || 'Sin nombre'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Badge className={cn('text-[10px] border mb-1 shrink-0', rolColor[perfil?.rol || 'vecino'])}>
              {rolLabel[perfil?.rol || 'vecino']}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="font-semibold text-finca-dark">{perfil?.numero_piso || '—'}</p>
              <p className="text-xs text-muted-foreground">Piso / Puerta</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="font-semibold text-finca-dark">{(perfil?.comunidad as any)?.nombre ? 'Activo' : 'Sin comunidad'}</p>
              <p className="text-xs text-muted-foreground">Estado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(perfil?.comunidad as any)?.nombre && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-finca-coral" />
              <p className="font-medium text-sm text-finca-dark">Mi comunidad</p>
            </div>
            <p className="text-sm text-muted-foreground">{(perfil?.comunidad as any)?.nombre}</p>
            {(perfil?.comunidad as any)?.direccion && (
              <p className="text-xs text-muted-foreground">{(perfil?.comunidad as any)?.direccion}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-finca-coral text-finca-coral hover:bg-finca-coral hover:text-white w-full"
              onClick={copiarCodigo}
            >
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copiar código de invitación
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {[
            { icon: User, label: 'Editar perfil', sub: 'Nombre, teléfono, piso' },
            { icon: Bell, label: 'Notificaciones', sub: 'Gestionar alertas' },
            { icon: Shield, label: 'Privacidad', sub: 'Datos y permisos' },
          ].map((item, idx) => (
            <div key={item.label}>
              {idx > 0 && <Separator />}
              <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left">
                <div className="w-9 h-9 rounded-xl bg-finca-peach/40 flex items-center justify-center shrink-0">
                  <item.icon className="w-4.5 h-4.5 text-finca-coral" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-finca-dark">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {perfil?.rol === 'admin' && (
        <Button
          variant="outline"
          className="w-full border-finca-coral text-finca-coral hover:bg-finca-coral hover:text-white"
          onClick={() => router.push('/admin')}
        >
          <Shield className="w-4 h-4 mr-2" />
          Panel de administrador
        </Button>
      )}

      <Button
        variant="outline"
        className="w-full border-red-200 text-red-500 hover:bg-red-50"
        onClick={handleSignOut}
        disabled={loggingOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </Button>

      <p className="text-center text-xs text-muted-foreground pb-2">
        FincaOS v2.0 — Technology · Community · Governance
      </p>
    </div>
  );
}
