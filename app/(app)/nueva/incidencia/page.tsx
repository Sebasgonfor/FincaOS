'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CircleCheck as CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CategoriaIncidencia } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const prioridades = [
  { value: 'baja', label: 'Baja', color: 'border-green-300 bg-green-50 text-green-700' },
  { value: 'normal', label: 'Normal', color: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'alta', label: 'Alta', color: 'border-orange-300 bg-orange-50 text-orange-700' },
  { value: 'urgente', label: 'Urgente', color: 'border-red-300 bg-red-50 text-red-700' },
];

const ubicaciones = ['Mi vivienda', 'Zona común', 'Garaje', 'Jardín', 'Otro'];

export default function NuevaIncidenciaPage() {
  const router = useRouter();
  const { perfil } = useAuth();
  const [categorias, setCategorias] = useState<CategoriaIncidencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [estimacion, setEstimacion] = useState<{ min: number; max: number } | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [prioridad, setPrioridad] = useState('normal');
  const [ubicacion, setUbicacion] = useState('Zona común');

  useEffect(() => {
    supabase.from('categorias_incidencia').select('*').then(({ data }) => setCategorias(data || []));
  }, []);

  function calcularEstimacion(catId: number | null) {
    const cat = categorias.find((c) => c.id === catId);
    const nombre = cat?.nombre?.toLowerCase() || '';
    if (nombre.includes('font')) return { min: 80, max: 400 };
    if (nombre.includes('elec')) return { min: 60, max: 350 };
    if (nombre.includes('asc')) return { min: 500, max: 3000 };
    if (nombre.includes('jard')) return { min: 150, max: 800 };
    if (nombre.includes('fach')) return { min: 800, max: 5000 };
    return { min: 100, max: 600 };
  }

  function handleCategoriaChange(id: number) {
    setCategoriaId(id);
    setEstimacion(calcularEstimacion(id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { toast.error('Añade un título a la incidencia'); return; }
    if (!perfil?.comunidad_id) { toast.error('No perteneces a ninguna comunidad'); return; }

    setLoading(true);
    const est = estimacion || { min: 100, max: 600 };

    const { error } = await supabase.from('incidencias').insert({
      comunidad_id: perfil.comunidad_id,
      autor_id: perfil.id,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      categoria_id: categoriaId,
      prioridad,
      ubicacion,
      estimacion_min: est.min,
      estimacion_max: est.max,
    });

    setLoading(false);
    if (error) { toast.error('Error al crear la incidencia'); }
    else { setEnviado(true); }
  }

  if (enviado) {
    return (
      <div className="px-4 py-12 flex flex-col items-center text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-finca-dark">Incidencia reportada</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Tu administrador ha sido notificado. Recibirás actualizaciones del progreso.
        </p>
        {estimacion && (
          <Card className="w-full max-w-xs bg-finca-peach/20 border-finca-peach/50">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-finca-coral font-semibold uppercase tracking-wide mb-1">Estimación IA</p>
              <p className="text-2xl font-bold text-finca-dark">{estimacion.min}€ – {estimacion.max}€</p>
              <p className="text-xs text-muted-foreground">Rango estimado de coste</p>
            </CardContent>
          </Card>
        )}
        <div className="flex gap-3 pt-2 w-full max-w-xs">
          <Button variant="outline" className="flex-1" onClick={() => router.push('/incidencias')}>Ver incidencias</Button>
          <Button className="flex-1 bg-finca-coral hover:bg-finca-coral/90 text-white" onClick={() => router.push('/nueva')}>Volver</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="w-8 h-8 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-finca-dark">Reportar incidencia</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="titulo">¿Qué ha pasado? <span className="text-finca-coral">*</span></Label>
          <Input id="titulo" placeholder="Ej: Tubería rota en baño comunal" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción detallada</Label>
          <Textarea id="descripcion" placeholder="Describe el problema con más detalle..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className="resize-none" />
        </div>

        <div className="space-y-2">
          <Label>Categoría</Label>
          <div className="grid grid-cols-3 gap-2">
            {categorias.map((cat) => (
              <button key={cat.id} type="button" onClick={() => handleCategoriaChange(cat.id)}
                className={cn('p-2.5 rounded-xl border text-center text-xs font-medium transition-all',
                  categoriaId === cat.id ? 'border-finca-coral bg-finca-peach/30 text-finca-coral' : 'border-border bg-white text-muted-foreground hover:border-finca-salmon'
                )}>
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        {estimacion && (
          <Card className="bg-finca-peach/20 border-finca-peach/50">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-finca-coral font-semibold uppercase tracking-wide">Estimación IA</p>
                <p className="text-sm text-muted-foreground">Coste estimado de reparación</p>
              </div>
              <p className="text-lg font-bold text-finca-dark">{estimacion.min}€ – {estimacion.max}€</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <Label>¿Dónde?</Label>
          <div className="grid grid-cols-2 gap-2">
            {ubicaciones.map((u) => (
              <button key={u} type="button" onClick={() => setUbicacion(u)}
                className={cn('p-2.5 rounded-xl border text-sm font-medium transition-all',
                  ubicacion === u ? 'border-finca-coral bg-finca-peach/30 text-finca-coral' : 'border-border bg-white text-muted-foreground hover:border-finca-salmon'
                )}>
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Urgencia</Label>
          <div className="grid grid-cols-4 gap-2">
            {prioridades.map((p) => (
              <button key={p.value} type="button" onClick={() => setPrioridad(p.value)}
                className={cn('p-2 rounded-xl border text-xs font-medium transition-all',
                  prioridad === p.value ? p.color + ' border-current' : 'border-border bg-white text-muted-foreground hover:border-finca-salmon'
                )}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full bg-finca-coral hover:bg-finca-coral/90 text-white h-12 text-base font-medium" disabled={loading || !titulo.trim()}>
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reportar incidencia'}
        </Button>
      </form>
    </div>
  );
}
