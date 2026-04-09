'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, EyeOff, UserPlus, Building2 } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [piso, setPiso] = useState('');

  const [codigoComunidad, setCodigoComunidad] = useState('');
  const [nombreComunidad, setNombreComunidad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [numViviendas, setNumViviendas] = useState('');

  async function handleRegistroUnirse(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre || !email || !password || !codigoComunidad) {
      toast.error('Completa todos los campos');
      return;
    }
    setLoading(true);

    const q = query(collection(db, 'comunidades'), where('codigo', '==', codigoComunidad.toUpperCase()));
    const snap = await getDocs(q);

    if (snap.empty) {
      toast.error('Código de comunidad no encontrado');
      setLoading(false);
      return;
    }

    const comunidadDoc = snap.docs[0];

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: nombre });

      await setDoc(doc(db, 'perfiles', cred.user.uid), {
        comunidad_id: comunidadDoc.id,
        nombre_completo: nombre,
        numero_piso: piso || null,
        rol: 'vecino',
        avatar_url: null,
        telefono: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      router.replace('/inicio');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la cuenta');
    }
    setLoading(false);
  }

  async function handleRegistroCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre || !email || !password || !nombreComunidad || !direccion) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    setLoading(true);

    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const comunidadRef = await addDoc(collection(db, 'comunidades'), {
        nombre: nombreComunidad,
        direccion,
        codigo,
        num_viviendas: parseInt(numViviendas) || 0,
        created_at: new Date().toISOString(),
      });

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: nombre });

      await setDoc(doc(db, 'perfiles', cred.user.uid), {
        comunidad_id: comunidadRef.id,
        nombre_completo: nombre,
        numero_piso: piso || null,
        rol: 'presidente',
        avatar_url: null,
        telefono: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast.success(`Comunidad creada. Código de acceso: ${codigo}`);
      router.replace('/inicio');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la cuenta');
    }
    setLoading(false);
  }

  const commonFields = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input id="nombre" placeholder="María García López" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Contraseña</Label>
        <div className="relative">
          <Input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="piso">Número de piso / puerta <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Input id="piso" placeholder="Ej: 2B, Bajo Izq" value={piso} onChange={(e) => setPiso(e.target.value)} />
      </div>
    </div>
  );

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-semibold text-finca-dark">Crear cuenta</CardTitle>
        <CardDescription>Únete a tu comunidad de vecinos</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="unirse">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="unirse" className="flex-1">Unirme a comunidad</TabsTrigger>
            <TabsTrigger value="crear" className="flex-1">Crear comunidad</TabsTrigger>
          </TabsList>

          <TabsContent value="unirse">
            <form onSubmit={handleRegistroUnirse} className="space-y-4">
              {commonFields}
              <div className="space-y-1.5">
                <Label htmlFor="codigo">Código de comunidad</Label>
                <Input id="codigo" placeholder="Ej: ABC123" value={codigoComunidad} onChange={(e) => setCodigoComunidad(e.target.value)} className="uppercase" required />
                <p className="text-xs text-muted-foreground">Pídele el código a un vecino o al administrador</p>
              </div>
              <Button type="submit" className="w-full bg-finca-coral hover:bg-finca-coral/90 text-white h-11" disabled={loading}>
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" />Unirme</>}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="crear">
            <form onSubmit={handleRegistroCrear} className="space-y-4">
              {commonFields}
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium text-finca-dark flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-finca-coral" />
                  Datos de la comunidad
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="nombre-comunidad">Nombre del edificio</Label>
                  <Input id="nombre-comunidad" placeholder="Ej: Residencial Las Flores" value={nombreComunidad} onChange={(e) => setNombreComunidad(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input id="direccion" placeholder="Calle Mayor 15, Madrid" value={direccion} onChange={(e) => setDireccion(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="num-viviendas">Número de viviendas <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Input id="num-viviendas" type="number" placeholder="Ej: 24" value={numViviendas} onChange={(e) => setNumViviendas(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full bg-finca-coral hover:bg-finca-coral/90 text-white h-11" disabled={loading}>
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Building2 className="w-4 h-4 mr-2" />Crear comunidad</>}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="pt-0">
        <p className="text-sm text-center w-full text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-finca-coral font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
