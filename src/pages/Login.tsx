import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/AuthProvider';

export function Login() {
  const { loading, login, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    username: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && user) {
    const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';
    return <Navigate replace to={redirectTo} />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login(formData.username, formData.password);
      const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (loginError: any) {
      setError(loginError.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-emerald-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">采样员薪酬系统</CardTitle>
            <CardDescription>内部登录后可使用采样员、工时和薪酬管理功能。</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(event) => setFormData((current) => ({ ...current, username: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <Button className="w-full" disabled={submitting} type="submit">
              <LogIn className="mr-2 h-4 w-4" />
              {submitting ? '登录中...' : '登录'}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
