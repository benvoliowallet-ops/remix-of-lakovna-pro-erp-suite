import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Factory, Loader2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Neplatný email'),
  password: z.string().min(6, 'Heslo musí mať aspoň 6 znakov'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Meno musí mať aspoň 2 znaky'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Heslá sa nezhodujú',
  path: ['confirmPassword'],
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', confirmPassword: '', fullName: '' });

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validated = loginSchema.parse(loginForm);
      const { error } = await signIn(validated.email, validated.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Nesprávny email alebo heslo');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Email nie je potvrdený. Skontrolujte svoju poštu.');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError('Nastala chyba pri prihlasovaní');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const validated = signupSchema.parse(signupForm);
      const { error } = await signUp(validated.email, validated.password, validated.fullName);
      
      if (error) {
        if (error.message.includes('already registered')) {
          setError('Tento email je už registrovaný');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess('Registrácia úspešná! Skontrolujte email pre potvrdenie účtu.');
        setSignupForm({ email: '', password: '', confirmPassword: '', fullName: '' });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError('Nastala chyba pri registrácii');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent shadow-lg">
          <Factory className="h-8 w-8 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lakovňa PRO</h1>
          <p className="text-muted-foreground">ERP Systém pre práškovú lakovňu</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <Tabs defaultValue="login" onValueChange={() => setError(null)}>
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Prihlásenie</TabsTrigger>
              <TabsTrigger value="signup">Registrácia</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <CardDescription>
                  Prihláste sa do systému Lakovňa PRO
                </CardDescription>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="vas@email.sk"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Heslo</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                </div>
              </CardContent>

              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Prihlásiť sa
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                <CardDescription>
                  Vytvorte si nový účet
                </CardDescription>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-success bg-success/10">
                    <AlertDescription className="text-success">{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Meno a priezvisko</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Ján Novák"
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="vas@email.sk"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Heslo</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Potvrdiť heslo</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrovať sa
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Registráciou súhlasíte s{' '}
                  <a href="/privacy-policy" className="underline underline-offset-4 hover:text-foreground" target="_blank" rel="noopener noreferrer">
                    ochranou osobných údajov
                  </a>.
                </p>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Systém pre správu práškového lakovania
      </p>
    </div>
  );
}
