import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ShoppingBasket, Sprout, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const roleSchema = z.object({ role: z.enum(["farmer", "buyer"]).optional() });

export const Route = createFileRoute("/join-market")({
  validateSearch: roleSchema,
  head: () => ({ meta: [{ title: "Join the CyberAgris market" }, { name: "description", content: "Choose your CyberAgris marketplace account and start selling or shopping in Bayelsa." }, { property: "og:title", content: "Join the CyberAgris market" }, { property: "og:description", content: "Choose to sell or shop on CyberAgris." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: JoinMarketPage,
});

function JoinMarketPage() {
  const navigate = useNavigate();
  const { role: initialRole } = Route.useSearch();
  const [role, setRole] = useState<"farmer" | "buyer" | undefined>(initialRole);
  const [userId, setUserId] = useState<string>();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id)); }, []);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role) return;
    if (!userId) { await navigate({ to: "/auth", search: { role } }); return; }
    setBusy(true); setError("");
    const profile = await supabase.from("profiles").upsert({ id: userId, full_name: fullName, phone: phone || null, location: location || null }).select().single();
    if (profile.error) { setError(profile.error.message); setBusy(false); return; }
    const { data: existingRole } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    if (!existingRole) {
      const roleResult = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (roleResult.error) { setError(roleResult.error.message); setBusy(false); return; }
    }
    await navigate({ to: "/dashboard" });
  }

  return <main className="min-h-screen bg-background"><header className="border-b border-border"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5"><Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold"><span className="grid size-8 place-items-center rounded-full bg-secondary text-primary-foreground">C</span>Cyber<span className="text-secondary">Agris</span></Link><Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-secondary"><ArrowLeft className="size-4" />Back home</Link></div></header>
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-20"><section><p className="text-sm font-bold uppercase tracking-widest text-secondary">One local network</p><h1 className="mt-4 max-w-lg font-display text-4xl font-extrabold leading-tight sm:text-5xl">Your harvest has a new home.</h1><p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">Choose how you want to use CyberAgris. Farmers get a selling dashboard. Buyers get a simple way to discover fresh goods from verified local sellers.</p><div className="mt-8 space-y-4"><div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><Check className="size-4" /></span><div><strong className="font-display text-sm">Direct local trade</strong><p className="mt-1 text-sm text-muted-foreground">Farmers set their products and customers shop in one place.</p></div></div><div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><Check className="size-4" /></span><div><strong className="font-display text-sm">Your own dashboard</strong><p className="mt-1 text-sm text-muted-foreground">Manage listings, stock and your marketplace profile.</p></div></div></div></section>
      <section><div className="grid gap-4 sm:grid-cols-2"><button type="button" onClick={() => setRole("farmer")} className={`border p-5 text-left transition ${role === "farmer" ? "border-secondary bg-secondary/10" : "border-border bg-card hover:border-secondary/50"}`}><span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground"><Sprout className="size-5" /></span><h2 className="mt-5 font-display text-xl font-bold">I’m a farmer</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Register to list produce, reach buyers and manage your sales.</p></button><button type="button" onClick={() => setRole("buyer")} className={`border p-5 text-left transition ${role === "buyer" ? "border-secondary bg-secondary/10" : "border-border bg-card hover:border-secondary/50"}`}><span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground"><ShoppingBasket className="size-5" /></span><h2 className="mt-5 font-display text-xl font-bold">I’m a buyer</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Create a personal shopping space for fresh local food.</p></button></div>
      {role && <form onSubmit={register} className="mt-6 border border-border bg-card p-6"><div className="flex items-center gap-3"><UserRound className="size-5 text-secondary" /><div><h2 className="font-display text-lg font-bold">Finish your {role} profile</h2><p className="text-sm text-muted-foreground">{userId ? "Add your details to complete registration." : "You’ll sign in or create an account before saving these details."}</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="full-name">Full name</Label><Input id="full-name" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" /></div><div className="space-y-2"><Label htmlFor="phone">Phone number</Label><Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="080..." /></div><div className="space-y-2"><Label htmlFor="location">Location</Label><Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Yenagoa" /></div></div>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<Button className="mt-6 w-full" type="submit" disabled={busy}>{userId ? "Complete registration" : "Continue to sign in"}</Button></form>}</section></div></main>;
}