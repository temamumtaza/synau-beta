import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">synau</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI Learning OS</p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
