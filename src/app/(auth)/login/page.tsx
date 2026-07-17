import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">synau</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            AI Learning Operating System
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
