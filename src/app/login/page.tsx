import { LoginForm } from "@/components/login-form";

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginForm />;
}
