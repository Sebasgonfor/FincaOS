'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, EyeOff, UserPlus, Building2 } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

const googleProvider = new GoogleAuthProvider();

export default function RegistroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  useEffect(() => {
    const code = searchParams.get('codigo');
    if (code) setCodigoComunidad(code.toUpperCase());
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        const user = result.user;

        const savedCodigo = sessionStorage.getItem('google_registro_codigo') || '';
        sessionStorage.removeItem('google_registro_codigo');

        let comunidadId: string | null = null;
        if (savedCodigo) {
          const q = query(
            collection(db, 'comunidades'),
            where('codigo', '==', savedCodigo.toUpperCase())
          );
          const snap = await getDocs(q);
          if (!snap.empty) comunidadId = snap.docs[0].id;
        }

        const perfilSnap = await getDoc(doc(db, 'perfiles', user.uid));
        if (!perfilSnap.exists()) {
          await setDoc(doc(db, 'perfiles', user.uid), {
            comunidad_id: comunidadId,
            nombre_completo: user.displayName || 'Sin nombre',
            numero_piso: null,
            rol: 'vecino',
            avatar_url: user.photoURL || null,
            telefono: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          router.replace(comunidadId ? '/inicio' : '/onboarding');
        } else {
          const data = perfilSnap.data();
          if (!data?.comunidad_id && comunidadId) {
            await updateDoc(doc(db, 'perfiles', user.uid), {
              comunidad_id: comunidadId,
              updated_at: new Date().toISOString(),
            });
            router.replace('/inicio');
          } else {
            router.replace(data?.comunidad_id ? '/inicio' : '/onboarding');
          }
        }
      })
      .catch((err: any) => {
        if (err.code) {
          toast.error(`Error con Google: ${err.code}`);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleGoogleRegistro() {
    if (codigoComunidad) {
      sessionStorage.setItem('google_registro_codigo', codigoComunidad);
    }
    setLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      toast.error(`Error con Google: ${err.code || err.message}`);
      setLoading(false);
    }
  }

  async function handleRegistroUnirse(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre || !email || !password || !codigoComunidad) {
      toast.error('Completa todos los campos');
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'comunidades'),
      where('codigo', '==', codigoComunidad.toUpperCase())
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      toast.error('Código no válido');
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
      toast.error(err.message);
    }

    setLoading(false);
  }

  async function handleRegistroCrear(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre || !email || !password || !nombreComunidad || !direccion) {
      toast.error('Completa los campos');
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

      toast.success(`Código: ${codigo}`);
      router.replace('/inicio');
    } catch (err: any) {
      toast.error(err.message);
    }

    setLoading(false);
  }

  const commonFields = (
    <div className="space-y-4">
      <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro</CardTitle>
        <CardDescription>Crear cuenta</CardDescription>
      </CardHeader>

      <CardContent>
        <Button onClick={handleGoogleRegistro}>Google</Button>

        <Tabs defaultValue="unirse">
          <TabsList>
            <TabsTrigger value="unirse">Unirse</TabsTrigger>
            <TabsTrigger value="crear">Crear</TabsTrigger>
          </TabsList>

          <TabsContent value="unirse">
            <form onSubmit={handleRegistroUnirse}>
              {commonFields}
              <Input
                placeholder="Código"
                value={codigoComunidad}
                onChange={(e) => setCodigoComunidad(e.target.value)}
              />
              <Button type="submit">Unirse</Button>
            </form>
          </TabsContent>

          <TabsContent value="crear">
            <form onSubmit={handleRegistroCrear}>
              {commonFields}
              <Input placeholder="Nombre comunidad" value={nombreComunidad} onChange={(e) => setNombreComunidad(e.target.value)} />
              <Input placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
              <Input placeholder="Viviendas" value={numViviendas} onChange={(e) => setNumViviendas(e.target.value)} />
              <Button type="submit">Crear</Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter>
        <Link href="/login">Login</Link>
      </CardFooter>
    </Card>
  );
}