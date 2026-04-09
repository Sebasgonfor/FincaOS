'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, MessageSquare, Send, MapPin, Tag, UserPlus, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Incidencia, Comentario } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const estadoConfig: Record<string, { label: string; color: string; step: number }> = {
  pendiente:    { label: 'Reportada',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', step: 1 },
  en_revision:  { label: 'En revisión',  color: 'bg-blue-100 text-blue-700 border-blue-200',       step: 2 },
  presupuestada:{ label: 'Presupuestada', color: 'bg-orange-100 text-orange-700 border-orange-200', step: 3 },
  aprobada:     { label: 'Aprobada',     color: 'bg-teal-100 text-teal-700 border-teal-200',       step: 3 },
  en_ejecucion: { label: 'En ejecución', color: 'bg-blue-100 text-blue-700 border-blue-200',       step: 4 },
  resuelta:     { label: 'Resuelta',     color: 'bg-green-100 text-green-700 border-green-200',    step: 5 },
  cerrada:      { label: 'Cerrada',      color: 'bg-gray-100 text-gray-500 border-gray-200',       step: 5 },
};

const steps = ['Reportada', 'En revisión', 'Presupuestada', 'En ejecución', 'Resuelta'];

export default function IncidenciaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { perfil } = useAuth();
  const [incidencia, setIncidencia] = useState<Incidencia | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [afectados, setAfectados] = useState<{ vecino_id: string }[]>([]);
  const [sumandome, setSumandome] = useState(false);

  useEffect(() => {
    fetchIncidencia();
    fetchAfectados();
  }, [params.id]);

  async function fetchIncidencia() {
    const { data } = await supabase
      .from('incidencias')
      .select('*, autor:perfiles(id, nombre_completo, numero_piso), categoria:categorias_incidencia(nombre, icono)')
      .eq('id', params.id)
      .maybeSingle();
    if (data) setIncidencia(data as Incidencia);
    const { data: comData } = await supabase
      .from('comentarios')
      .select('*, autor:perfiles(id, nombre_completo, numero_piso)')
      .eq('incidencia_id', params.id)
      .order('created_at', { ascending: true });
    setComentarios((comData as Comentario[]) || []);
    setLoading(false);
  }

  async function fetchAfectados() {
    const { data } = await supabase.from('incidencia_afectados').select('vecino_id').eq('incidencia_id', params.id);
    setAfectados(data || []);
  }

  const yaSumado = afectados.some((a) => a.vecino_id === perfil?.id);
  const esAutor = incidencia?.autor_id === perfil?.id;

  async function toggleSumarme() {
    if (!perfil || esAutor) return;
    setSumandome(true);
    if (yaSumado) {
      await supabase.from('incidencia_afectados').delete().eq('incidencia_id', params.id).eq('vecino_id', perfil.id);
      toast.success('Ya no apareces como afectado');
      fetchAfectados();
    } else {
      const { error } = await supabase.from('incidencia_afectados').insert({ incidencia_id: params.id as string, vecino_id: perfil.id });
      if (!error) { toast.success('Te has sumado a la incidencia'); fetchAfectados(); }
    }
    setSumandome(false);
  }

  async function enviarComentario() {
    if (!nuevoComentario.trim() || !perfil) return;
    setEnviando(true);
    const { error } = await supabase.from('comentarios').insert({ incidencia_id: params.id, autor_id: perfil.id, contenido: nuevoComentario.trim() });
    if (error) { toast.error('Error al enviar el comentario'); }
    else { setNuevoComentario(''); fetchIncidencia(); }
    setEnviando(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-4 border-finca-coral border-t-transparent animate-spin" /></div>;
  }

  if (!incidencia) {
    return <div className="px-4 py-8 text-center"><p className="text-muted-foreground">Incidencia no encontrada</p><Button onClick={() => router.back()} variant="ghost" className="mt-4">Volver</Button></div>;
  }

  const estado = estadoConfig[incidencia.estado] || estadoConfig.pendiente;
  const currentStep = estado.step;
  const totalAfectados = afectados.length + 1;

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="w-8 h-8 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-finca-dark truncate flex-1">{incidencia.titulo}</h1>
        <Badge className={cn('text-[10px] border shrink-0', estado.color)}>{estado.label}</Badge>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="space-y-1.5">
          <div className="flex gap-1">
            {steps.map((step, idx) => (
              <div key={step} className={cn('flex-1 h-1.5 rounded-full transition-colors', idx + 1 <= currentStep ? 'bg-finca-coral' : 'bg-muted')} />
            ))}
          </div>
          <div className="flex justify-between">
            {steps.map((step, idx) => (
              <span key={step} className={cn('text-[9px] font-medium', idx + 1 <= currentStep ? 'text-finca-coral' : 'text-muted-foreground')}>{step}</span>
            ))}
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-finca-peach flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-finca-coral">{(incidencia.autor as any)?.nombre_completo?.charAt(0) || '?'}</span>
              </div>
              <div>
                <p className="font-medium text-sm text-finca-dark">{(incidencia.autor as any)?.nombre_completo}</p>
                <p className="text-xs text-muted-foreground">
                  {(incidencia.autor as any)?.numero_piso && `Piso ${(incidencia.autor as any).numero_piso} • `}
                  {format(new Date(incidencia.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                </p>
              </div>
            </div>
            {incidencia.descripcion && <p className="text-sm text-foreground leading-relaxed">{incidencia.descripcion}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              {(incidencia.categoria as any)?.nombre && (
                <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{(incidencia.categoria as any).nombre}</span>
                </div>
              )}
              {incidencia.ubicacion && (
                <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{incidencia.ubicacion}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">{incidencia.prioridad}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-muted rounded-xl px-3 py-2 shrink-0">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-finca-dark">{totalAfectados}</span>
            <span className="text-xs text-muted-foreground">{totalAfectados === 1 ? 'afectado' : 'afectados'}</span>
          </div>
          {!esAutor && (
            <Button
              onClick={toggleSumarme}
              disabled={sumandome}
              variant={yaSumado ? 'outline' : 'default'}
              size="sm"
              className={cn(
                'flex-1 h-10',
                yaSumado ? 'border-finca-coral text-finca-coral hover:bg-finca-peach/20' : 'bg-finca-coral hover:bg-finca-coral/90 text-white'
              )}
            >
              {yaSumado
                ? <><UserMinus className="w-4 h-4 mr-1.5" />Ya no me afecta</>
                : <><UserPlus className="w-4 h-4 mr-1.5" />A mí también me afecta</>
              }
            </Button>
          )}
        </div>

        {(incidencia.estimacion_min || incidencia.estimacion_max) && (
          <Card className="border-0 shadow-sm bg-finca-peach/20 border-l-4 border-l-finca-coral">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-finca-coral uppercase tracking-wide mb-1">Estimación IA</p>
              <p className="text-lg font-bold text-finca-dark">{incidencia.estimacion_min}€ – {incidencia.estimacion_max}€</p>
              <p className="text-xs text-muted-foreground mt-0.5">Rango estimado de coste de reparación</p>
            </CardContent>
          </Card>
        )}

        <section>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-finca-dark text-sm">Comentarios ({comentarios.length})</h2>
          </div>
          {comentarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay comentarios aún. Sé el primero en comentar.</p>
          ) : (
            <div className="space-y-3">
              {comentarios.map((com) => {
                const esPropio = (com.autor as any)?.id === perfil?.id;
                return (
                  <div key={com.id} className={cn('flex gap-2.5', esPropio && 'flex-row-reverse')}>
                    <div className="w-8 h-8 rounded-full bg-finca-peach flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-finca-coral">{(com.autor as any)?.nombre_completo?.charAt(0) || '?'}</span>
                    </div>
                    <div className={cn('max-w-[80%] rounded-2xl px-3 py-2', esPropio ? 'bg-finca-coral text-white rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm')}>
                      <p className={cn('text-[11px] font-medium mb-0.5', esPropio ? 'text-white/80' : 'text-muted-foreground')}>{(com.autor as any)?.nombre_completo?.split(' ')[0]}</p>
                      <p className="text-sm leading-relaxed">{com.contenido}</p>
                      <p className={cn('text-[10px] mt-1', esPropio ? 'text-white/60' : 'text-muted-foreground')}>{format(new Date(com.created_at), 'HH:mm')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Textarea placeholder="Escribe un comentario..." value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)} rows={2} className="resize-none text-sm" />
            <Button onClick={enviarComentario} disabled={!nuevoComentario.trim() || enviando} size="icon" className="bg-finca-coral hover:bg-finca-coral/90 text-white shrink-0 self-end h-10 w-10">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
