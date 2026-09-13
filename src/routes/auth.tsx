import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const authSearchSchema = z.object({ role: z.enum(["farmer", "buyer"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or join | CyberAgris" },
      { name: "description", content: "Sign in to CyberAgris or create an account to shop or sell fresh Bayelsa food." },
      { property: "og:title", content: "Sign in or join | CyberAgris" },
      { property: "og:description", content: "Shop or sell fresh food on CyberAgris." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { role } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });

    if (result.error) {
      setError(result.error.message);
    } else if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm your account, then return here to sign in.");
    } else {
      await navigate({ to: role ? "/join-market" : "/dashboard" });
    }
    setBusy(false);
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setError(result.error instanceof Error ? result.error.message : "Google sign-in was not completed.");
    setBusy(false);
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold"><span className="grid size-9 place-items-center rounded-full bg-accent text-accent-foreground">C</span>CyberAgris</Link>
        <div className="max-w-md"><p className="text-sm font-bold uppercase tracking-widest text-accent">The local food network</p><h1 className="mt-4 font-display text-5xl font-extrabold leading-tight">Good food starts with the people who grow it.</h1><p className="mt-5 text-primary-foreground/70">Shop confidently from local farmers, or bring your harvest to more homes across Bayelsa.</p></div>
        <p className="text-sm text-primary-foreground/50">Fresh produce · Fair trade · Bayelsa first</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-secondary"><ArrowLeft className="size-4" />Back to CyberAgris</Link>
          <div className="mb-8 lg:hidden"><p className="font-display text-xl font-extrabold">Cyber<span className="text-secondary">Agris</span></p></div>
          <p className="text-sm font-bold uppercase tracking-widest text-secondary">{mode === "signin" ? "Welcome back" : "Create your account"}</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold">{mode === "signin" ? "Sign in to your market." : "Join the market."}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{role === "farmer" ? "You’re joining as a farmer. After registering, you can list products from your dashboard." : role === "buyer" ? "You’re joining as a buyer. After registering, you can shop and track your orders." : "One account gives you a personal space to shop or sell."}</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2"><Label htmlFor="email">Email address</Label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10" placeholder="you@example.com" /></div></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><ShieldCheck className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10 pr-10" placeholder="At least 6 characters" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="text-sm text-secondary">{message}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{mode === "signin" ? "Sign in" : "Create account"}</Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle} disabled={busy}>Continue with Google</Button>
          <p className="mt-7 text-center text-sm text-muted-foreground">{mode === "signin" ? "New to CyberAgris?" : "Already have an account?"}{" "}<button type="button" className="font-bold text-secondary underline-offset-4 hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Create one" : "Sign in"}</button></p>
        </div>
      </section>
    </main>
  );
}