"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Cross, Eye, EyeOff, LogIn, Loader,
  Package2, Receipt, Truck, Users,
  Stethoscope, BarChart3,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const features = [
  {
    icon: Package2,
    title: "Smart Inventory",
    desc: "Batch tracking, expiry alerts & real-time stock levels",
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
  {
    icon: Receipt,
    title: "GST Billing",
    desc: "Compliant invoices with CGST/SGST in seconds",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    icon: Truck,
    title: "Purchase Register",
    desc: "Supplier bills, purchases & payment tracking",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: Users,
    title: "Customer Ledger",
    desc: "Outstanding dues, credit control & profiles",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: Stethoscope,
    title: "Doctor Referrals",
    desc: "Reference fees, targets & referral tracking",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "Sales, purchase & outstanding insights",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
];

const BG = "linear-gradient(135deg, oklch(0.14 0.025 250) 0%, oklch(0.18 0.025 220) 50%, oklch(0.20 0.10 196) 100%)";

export function LoginForm() {
  const [showPw, setShowPw] = useState(false);
  const [authError, setAuthError] = useState("");
  const { login } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for error messages from middleware
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'wrong-tenant') {
      setAuthError("You don't have access to that pharmacy account. Please login with the correct credentials.");
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginValues) {
    setAuthError("");
    return login(values.email, values.password).then((ok) => {
      if (!ok) {
        setAuthError("Invalid email or password.");
        return;
      }
      const stored = JSON.parse(localStorage.getItem("medixor-auth") ?? "{}");
      const tenantId: string = stored?.state?.user?.tenantId ?? "demo";
      
      // Clear React Query cache on successful login to avoid data leakage
      return import("@/components/providers").then(({ queryClient }) => {
        queryClient.clear();
        
        // Redirect to original page if available, otherwise dashboard
        const redirect = searchParams.get('redirect');
        if (redirect && redirect.startsWith(`/${tenantId}/`)) {
          router.replace(redirect);
        } else {
          router.replace(`/${tenantId}/dashboard`);
        }
      });
    });
  }

  return (
    <div className="min-h-screen flex" style={{ background: BG }}>

      {/* ─── Left panel (desktop only) ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 xl:p-16 relative overflow-hidden">

        {/* Decorative background blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="login-blob" style={{ width: 480, height: 480, top: -120, left: -100, background: "radial-gradient(circle, oklch(0.52 0.15 196 / 0.18) 0%, transparent 68%)" }} />
          <div className="login-blob" style={{ width: 320, height: 320, bottom: 40, right: -30, background: "radial-gradient(circle, oklch(0.52 0.15 196 / 0.14) 0%, transparent 70%)", animationDelay: "-3.5s" }} />
          <div className="login-blob" style={{ width: 220, height: 220, bottom: "42%", left: "38%", background: "radial-gradient(circle, oklch(0.60 0.14 180 / 0.10) 0%, transparent 70%)", animationDelay: "-6s" }} />
          {/* Floating pill shapes */}
          <div className="login-pill" style={{ top: "17%",  left: "8%",   animationDelay: "0s" }} />
          <div className="login-pill" style={{ top: "38%",  right: "12%", animationDelay: "-2.2s", opacity: 0.45 }} />
          <div className="login-pill" style={{ bottom: "26%", left: "20%", animationDelay: "-4.5s", opacity: 0.35 }} />
          <div className="login-pill" style={{ bottom: "14%", right: "28%", animationDelay: "-1.5s", opacity: 0.30 }} />
          {/* Floating diamond shapes */}
          <div className="login-diamond" style={{ top: "54%",  right: "7%",  animationDelay: "-1s" }} />
          <div className="login-diamond" style={{ top: "11%",  right: "28%", animationDelay: "-5s", opacity: 0.30 }} />
          <div className="login-diamond" style={{ top: "70%",  left: "44%",  animationDelay: "-3s", opacity: 0.25 }} />
        </div>

        {/* Logo + headline */}
        <div className="login-fade-up relative z-10" style={{ animationDelay: "0ms" }}>
          <div className="flex items-center gap-3 mb-7">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg login-glow"
              style={{ background: "oklch(0.52 0.15 196)" }}
            >
              <Cross className="h-5 w-5 text-white" />
            </div>
            <span
              className="text-3xl font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              Medixor
            </span>
          </div>
          <h2
            className="text-4xl xl:text-5xl font-bold leading-tight"
            style={{
              fontFamily: "var(--font-jakarta), sans-serif",
              background: "linear-gradient(140deg, #fff 35%, oklch(0.78 0.12 196) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Your complete<br />pharmacy platform
          </h2>
          <p className="mt-3 text-base" style={{ color: "oklch(0.65 0.05 220)" }}>
            Inventory · Billing · Suppliers · Analytics — all in one place
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="login-fade-up flex items-start gap-3 rounded-xl p-3.5"
              style={{
                animationDelay: `${150 + i * 75}ms`,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(6px)",
              }}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.bg}`}>
                <f.icon className={`h-4 w-4 ${f.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">{f.title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "oklch(0.58 0.04 220)" }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div
          className="login-fade-up flex items-center gap-2 text-xs relative z-10"
          style={{ animationDelay: "680ms", color: "oklch(0.48 0.04 220)" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Built for Indian pharma &mdash; GST-compliant, multi-tenant, always in sync
        </div>
      </div>

      {/* ─── Right panel (form) ────────────────────────────────────── */}
      <div className="w-full lg:max-w-[420px] xl:max-w-[460px] flex flex-col items-center justify-center p-6 lg:p-10 relative">

        {/* Mobile-only branding */}
        <div className="lg:hidden flex flex-col items-center mb-8 login-fade-up">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg login-glow"
            style={{ background: "oklch(0.52 0.15 196)" }}
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

        {/* Login card */}
        <div className="login-slide-in w-full bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-5">
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign in
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Demo credentials */}
        <div
          className="login-fade-up w-full mt-4 rounded-xl p-4 text-xs space-y-1.5"
          style={{
            animationDelay: "320ms",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
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
