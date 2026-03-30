"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Cross, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuthStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPw, setShowPw] = useState(false);
  const [authError, setAuthError] = useState("");
  const { login } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginValues) {
    setAuthError("");
    login(values.email, values.password).then((ok) => {
      if (!ok) {
        setAuthError("Invalid email or password.");
        return;
      }
      // Redirect to the user's own tenant dashboard
      const stored = JSON.parse(localStorage.getItem("medixor-auth") ?? "{}");
      const tenantId: string = stored?.state?.user?.tenantId ?? "demo";
      router.replace(`/${tenantId}/dashboard`);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, oklch(0.14 0.025 250) 0%, oklch(0.18 0.025 220) 50%, oklch(0.20 0.10 196) 100%)" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg"
            style={{ background: "var(--primary)" }}
          >
            <Cross className="h-6 w-6 text-white" />
          </div>
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
          >
            Medixor
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.70 0.05 220)" }}>
            Medical Inventory &amp; Billing
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
              Sign in
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@medixor.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {authError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-xs text-red-600 font-medium">{authError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign in
            </Button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div
          className="mt-4 rounded-xl p-4 text-xs space-y-1.5"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <p className="font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
            Demo credentials
          </p>
          <div className="space-y-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            <p>admin@medixor.com &nbsp;·&nbsp; medixor123</p>
            <p>demo@medixor.com &nbsp;·&nbsp; demo123</p>
          </div>
        </div>

      </div>
    </div>
  );
}
