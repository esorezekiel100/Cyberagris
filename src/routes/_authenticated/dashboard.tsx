import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, CreditCard, LogOut, PackagePlus, ShoppingBag, Sprout, Store, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardInbox } from "@/components/dashboard-inbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Your dashboard | CyberAgris" }, { name: "description", content: "Manage your CyberAgris profile, products and marketplace activity." }, { property: "og:title", content: "Your dashboard | CyberAgris" }, { property: "og:description", content: "Manage your CyberAgris marketplace activity." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<string>();
  const [currentUserId, setCurrentUserId] = useState("");
  const [name, setName] = useState("there");
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [orders, setOrders] = useState<Tables<"orders">[]>([]);
  const [balance, setBalance] = useState<Tables<"farmer_balances"> | null>(null);
  const [payingOrder, setPayingOrder] = useState<string>();
  const [paymentMessage, setPaymentMessage] = useState("");
  const [form, setForm] = useState({ name: "", description: "", category: "Fresh Produce", price: "", unit: "kg", stock: "1", location: "", discount: "0" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setCurrentUserId(auth.user.id);
      const [{ data: profile }, { data: roleRow }] = await Promise.all([supabase.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle(), supabase.from("user_roles").select("role").eq("user_id", auth.user.id).maybeSingle()]);
      setName(profile?.full_name || auth.user.email?.split("@")[0] || "there");
      setRole(roleRow?.role);
      if (roleRow?.role === "farmer") {
        const [{ data: productRows }, { data: orderRows }, { data: balanceRow }] = await Promise.all([
          supabase.from("products").select("*").eq("farmer_id", auth.user.id).order("created_at", { ascending: false }),
          supabase.from("orders").select("*").eq("farmer_id", auth.user.id).order("created_at", { ascending: false }),
          supabase.from("farmer_balances").select("*").eq("farmer_id", auth.user.id).maybeSingle(),
        ]);
        setProducts(productRows ?? []); setOrders(orderRows ?? []); setBalance(balanceRow);
      } else {
        const { data: orderRows } = await supabase.from("orders").select("*").eq("buyer_id", auth.user.id).order("created_at", { ascending: false });
        setOrders(orderRows ?? []);
        const { data: marketProducts } = await supabase.from("products").select("*").eq("status", "active").order("created_at", { ascending: false });
        setProducts(marketProducts ?? []);
      }
    }
    load();
  }, []);

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data, error: insertError } = await supabase.from("products").insert({ farmer_id: auth.user.id, name: form.name, description: form.description, category: form.category, price: Number(form.price), unit: form.unit, stock: Number(form.stock), location: form.location || null, is_deal: Number(form.discount) > 0, discount_percent: Number(form.discount), status: "active" }).select().single();
    if (insertError) setError(insertError.message); else { setProducts((current) => [data, ...current]); setForm({ name: "", description: "", category: "Fresh Produce", price: "", unit: "kg", stock: "1", location: "", discount: "0" }); setMessage("Your product is now live in the CyberAgris market."); }
  }

  async function payForOrder(orderId: string) {
    setPayingOrder(orderId); setPaymentMessage("");
    const { error } = await supabase.rpc("pay_for_order", { _order_id: orderId, _payment_reference: `cyberagris-${orderId}-${Date.now()}` });
    if (error) { setPaymentMessage(error.message); setPayingOrder(undefined); return; }
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: "confirmed" } : order));
    setPaymentMessage("Payment received. The farmer’s balance has been updated.");
    setPayingOrder(undefined);
  }

  async function signOut() { await supabase.auth.signOut(); await navigate({ to: "/" }); }

  return <main className="min-h-screen bg-background"><header className="border-b border-border bg-card"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5"><Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold"><span className="grid size-8 place-items-center rounded-full bg-secondary text-primary-foreground">C</span>Cyber<span className="text-secondary">Agris</span></Link><div className="flex items-center gap-2"><Button asChild variant="outline" size="compact"><Link to="/market"><Store className="size-4" />Shop market</Link></Button><Button variant="ghost" size="compact" onClick={signOut}><LogOut className="size-4" />Sign out</Button></div></div></header><div className="mx-auto max-w-6xl px-5 py-10"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-bold uppercase tracking-widest text-secondary">Personal dashboard</p><h1 className="mt-3 font-display text-4xl font-extrabold">Welcome, {name}.</h1><p className="mt-3 text-muted-foreground">{role === "farmer" ? "Manage your listings, conversations, and earnings across Bayelsa." : "Shop local harvests, pay securely, and keep every order in one place."}</p></div><span className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 text-sm font-bold"><span className="size-2 rounded-full bg-accent" />{role === "farmer" ? "Farmer account" : "Buyer account"}</span></div>{role === "farmer" ? <div className="mt-10 space-y-8"><div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]"><section className="border border-border bg-card p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><PackagePlus className="size-5" /></span><div><h2 className="font-display text-xl font-bold">Add a product</h2><p className="text-sm text-muted-foreground">Your listing will appear in the main market immediately.</p></div></div><form onSubmit={addProduct} className="mt-6 grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="product-name">Product name</Label><Input id="product-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Fresh white yam" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Tell buyers what makes this harvest special" /></div><div className="space-y-2"><Label htmlFor="product-category">Category</Label><select id="product-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-9 w-full border border-input bg-transparent px-3 text-sm"><option>Fresh Produce</option><option>Fish & Seafood</option><option>Pantry Staples</option><option>Bundled Baskets</option><option>Meat & Poultry</option><option>Grains & Oils</option></select></div><div className="space-y-2"><Label htmlFor="product-location">Location</Label><Input id="product-location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Ogbia" /></div><div className="space-y-2"><Label htmlFor="product-price">Price (₦)</Label><Input id="product-price" type="number" required min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="2400" /></div><div className="space-y-2"><Label htmlFor="product-unit">Unit</Label><Input id="product-unit" required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="kg, basket, piece" /></div><div className="space-y-2"><Label htmlFor="product-stock">Stock</Label><Input id="product-stock" type="number" required min="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="product-discount">Deal discount (%)</Label><Input id="product-discount" type="number" min="0" max="90" value={form.discount} onChange={(event) => setForm({ ...form, discount: event.target.value })} /></div>{error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}{message && <p role="status" className="text-sm text-secondary sm:col-span-2">{message}</p>}<Button type="submit" className="sm:col-span-2">Publish product <ArrowRight className="size-4" /></Button></form></section><section className="space-y-6"><div className="grid gap-4 sm:grid-cols-2"><div className="border border-border bg-card p-5"><TrendingUp className="size-5 text-secondary" /><p className="mt-4 text-2xl font-display font-extrabold">{products.length}</p><p className="text-sm text-muted-foreground">products listed</p></div><div className="border border-border bg-primary p-5 text-primary-foreground"><Wallet className="size-5 text-accent" /><p className="mt-4 text-2xl font-display font-extrabold">₦{(balance?.balance ?? 0).toLocaleString()}</p><p className="text-sm text-primary-foreground/70">available balance</p></div></div><div className="border border-border bg-card p-5"><h2 className="font-display text-lg font-bold">Your products</h2>{products.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Your first listing will show here.</p> : <div className="mt-4 space-y-3">{products.slice(0, 5).map((product) => <div key={product.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0"><div><p className="font-bold">{product.name}</p><p className="text-xs text-muted-foreground">{product.category} · {product.stock} {product.unit} available</p></div><strong className="text-secondary">₦{product.price.toLocaleString()}</strong></div>)}</div>}</div></section></div><section className="border border-border bg-card p-6"><div className="flex items-center gap-3"><CreditCard className="size-5 text-secondary" /><div><h2 className="font-display text-xl font-bold">Payments & orders</h2><p className="text-sm text-muted-foreground">Paid orders are added to your balance automatically.</p></div></div>{orders.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Orders from buyers will appear here.</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{orders.map((order) => <div key={order.id} className="flex items-center justify-between gap-4 border border-border p-4"><div><p className="font-bold">Order {order.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">{order.quantity} item · {order.status}</p></div><strong className="text-secondary">₦{order.total.toLocaleString()}</strong></div>)}</div>}</section><DashboardInbox role="farmer" userId={currentUserId} orders={orders} products={products} /></div> : <div className="mt-10 space-y-8"><section className="grid gap-5 md:grid-cols-3"><div className="border border-border bg-card p-6 md:col-span-2"><ShoppingBag className="size-6 text-secondary" /><h2 className="mt-5 font-display text-2xl font-bold">Your next basket starts here.</h2><p className="mt-3 max-w-lg text-muted-foreground">Browse produce, fish and pantry staples uploaded by CyberAgris farmers.</p><Button asChild className="mt-6"><Link to="/market">Browse the market <ArrowRight className="size-4" /></Link></Button></div><div className="border border-border bg-primary p-6 text-primary-foreground"><p className="text-sm font-bold uppercase tracking-widest text-accent">Buyer space</p><h2 className="mt-4 font-display text-xl font-bold">Fresh listings, one place.</h2><p className="mt-3 text-sm text-primary-foreground/70">Your account keeps your marketplace experience personal as CyberAgris grows.</p></div></section><section className="border border-border bg-card p-6"><div className="flex items-center gap-3"><CreditCard className="size-5 text-secondary" /><div><h2 className="font-display text-xl font-bold">Your orders</h2><p className="text-sm text-muted-foreground">Review an order and pay securely when you are ready.</p></div></div>{paymentMessage && <p role="status" className="mt-4 text-sm text-secondary">{paymentMessage}</p>}{orders.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Your paid and pending orders will appear here.</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{orders.map((order) => <div key={order.id} className="flex items-center justify-between gap-4 border border-border p-4"><div><p className="font-bold">Order {order.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">{order.quantity} item · {order.status}</p></div><div className="flex items-center gap-3"><strong className="text-secondary">₦{order.total.toLocaleString()}</strong>{order.status === "pending" ? <Button size="compact" onClick={() => payForOrder(order.id)} disabled={payingOrder === order.id}>{payingOrder === order.id ? "Paying..." : "Pay now"}</Button> : <CheckCircle2 className="size-5 text-secondary" aria-label="Paid" />}</div></div>)}</div>}</section><DashboardInbox role="buyer" userId={currentUserId} orders={orders} products={products} /></div>}</div></main>;
}