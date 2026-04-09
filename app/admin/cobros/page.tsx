'use client';

import { useEffect, useState } from 'react';
import { Search, Wallet, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Perfil } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CuotaConVecino {
  id: string;
  vecino_id: string;
  mes_anio: string;
  importe: number;
  estado: 'al_dia' | 'pendiente' | 'moroso';
  pagado_at: string | null;
  vecino?: { nombre_completo: string; numero_piso: string | null };
}

const estadoCuota = {
  al_dia:   { label: 'Al día',    color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  pendiente:{ label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  moroso:   { label: 'Moroso',   color: 'bg-red-100 text-red-700',      icon: AlertCircle },
};

const meses = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(new Date().getFullYear(), i, 1);
  return { valor: `${new Date().getFullYear()}-${String(i + 1).padStart(2, '0')}`, label: format(d, 'MMMM yyyy', { locale: es }) };
});

export default function AdminCobrosPage() {
  const { perfil } = useAuth();
  const [cuotas, setCuotas] = useState<CuotaConVecino[]>([]);
  const [vecinos, setVecinos] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [nuevaVecinoId, setNuevaVecinoId] = useState('');
  const [nuevaMes, setNuevaMes] = useState(meses[new Date().getMonth()].valor);
  const [nuevaImporte, setNuevaImporte] = useState('80');
  const [nuevaEstado, setNuevaEstado] = useState('pendiente');

  useEffect(() => {
    if (perfil?.comunidad_id) fetchData();
  }, [perfil?.comunidad_id]);

  async function fetchData() {
    const cid = perfil!.comunidad_id!;
    const [cuotaRes, vecRes] = await Promise.all([
      supabase.from('cuotas_vecinos').select('*, vecino:perfiles(nombre_completo, numero_piso)').eq('comunidad_id', cid).order('mes_anio', { ascending: false }),
      supabase.from('perfiles').select('*').eq('comunidad_id', cid).order('nombre_completo'),
    ]);
    setCuotas((cuotaRes.data as CuotaConVecino[]) || []);
    setVecinos((vecRes.data as Perfil[]) || []);
    setLoading(false);
  }

  async function cambiarEstado(id: string, nuevoEstado: string) {
    const { error } = await supabase.from('cuotas_vecinos').update({
      estado: nuevoEstado,
      ...(nuevoEstado === 'al_dia' ? { pagado_at: new Date().toISOString() } : { pagado_at: null }),
    }).eq('id', id);
    if (error) { toast.error('Error al actualizar'); }
    else { toast.success('Estado actualizado'); fetchData(); }
  }

  async function crearCuota(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaVecinoId || !perfil?.comunidad_id) return;
    setEnviando(true);
    const { error } = await supabase.from('cuotas_vecinos').insert({
      comunidad_id: perfil.comunidad_id,
      vecino_id: nuevaVecinoId,
      mes_anio: nuevaMes,
      importe: parseFloat(nuevaImporte),
      estado: nuevaEstado,
      ...(nuevaEstado === 'al_dia' ? { pagado_at: new Date().toISOString() } : {}),
    });
    if (error?.code === '23505') {
      toast.error('Ya existe una cuota para ese vecino y mes');
    } else if (error) {
      toast.error('Error al crear la cuota');
    } else {
      toast.success('Cuota registrada');
      setDialogOpen(false);
      fetchData();
    }
    setEnviando(false);
  }

  const filtradas = cuotas.filter((c) => {
    const nombre = (c.vecino as any)?.nombre_completo?.toLowerCase() || '';
    const matchBusqueda = nombre.includes(busqueda.toLowerCase()) || c.mes_anio.includes(busqueda);
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const morosos = cuotas.filter((c) => c.estado === 'moroso').length;
  const pendientes = cuotas.filter((c) => c.estado === 'pendiente').length;
  const alDia = cuotas.filter((c) => c.estado === 'al_dia').length;
  const totalMoroso = cuotas.filter((c) => c.estado === 'moroso').reduce((s, c) => s + c.importe, 0);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-finca-dark">Cobros y cuotas</h1>
          <p className="text-sm text-muted-foreground">{cuotas.length} registros de cuotas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-finca-coral hover:bg-finca-coral/90 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Registrar cuota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Nueva cuota</DialogTitle>
            </DialogHeader>
            <form onSubmit={crearCuota} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Vecino</Label>
                <Select value={nuevaVecinoId} onValueChange={setNuevaVecinoId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un vecino" /></SelectTrigger>
                  <SelectContent>
                    {vecinos.map((v) => <SelectItem key={v.id} value={v.id}>{v.nombre_completo}{v.numero_piso ? ` (${v.numero_piso})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mes</Label>
                <Select value={nuevaMes} onValueChange={setNuevaMes}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{meses.map((m) => <SelectItem key={m.valor} value={m.valor}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Importe (€)</Label>
                <Input type="number" step="0.01" min="0" value={nuevaImporte} onChange={(e) => setNuevaImporte(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={nuevaEstado} onValueChange={setNuevaEstado}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="al_dia">Al día</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="moroso">Moroso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-finca-coral hover:bg-finca-coral/90 text-white" disabled={enviando || !nuevaVecinoId}>
                  {enviando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Registrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: CheckCircle2, label: 'Al día', value: alDia, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Clock, label: 'Pendientes', value: pendientes, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { icon: AlertCircle, label: 'Morosos', value: morosos, color: 'text-red-600', bg: 'bg-red-50' },
          { icon: Wallet, label: 'Deuda total', value: `${totalMoroso.toFixed(0)}€`, color: 'text-finca-coral', bg: 'bg-finca-peach/30', isText: true },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', kpi.bg)}>
                <kpi.icon className={cn('w-5 h-5', kpi.color)} />
              </div>
              <p className="text-2xl font-bold text-finca-dark">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar vecino o mes..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="al_dia">Al día</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="moroso">Moroso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtradas.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="font-medium text-finca-dark">Sin registros</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((cuota) => {
            const config = estadoCuota[cuota.estado];
            const Icon = config.icon;
            return (
              <Card key={cuota.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cuota.estado === 'al_dia' ? 'bg-green-50' : cuota.estado === 'moroso' ? 'bg-red-50' : 'bg-yellow-50')}>
                    <Icon className={cn('w-4.5 h-4.5', cuota.estado === 'al_dia' ? 'text-green-600' : cuota.estado === 'moroso' ? 'text-red-500' : 'text-yellow-600')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-finca-dark truncate">{(cuota.vecino as any)?.nombre_completo}</p>
                    <p className="text-xs text-muted-foreground">
                      {cuota.mes_anio}{(cuota.vecino as any)?.numero_piso ? ` · Piso ${(cuota.vecino as any).numero_piso}` : ''}
                      {cuota.pagado_at ? ` · Pagado ${format(new Date(cuota.pagado_at), "d MMM", { locale: es })}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-finca-dark">{cuota.importe.toFixed(2)}€</span>
                    <Select value={cuota.estado} onValueChange={(val) => cambiarEstado(cuota.id, val)}>
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="al_dia">Al día</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="moroso">Moroso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
