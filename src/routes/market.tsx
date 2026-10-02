import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Heart, Search, ShoppingBag, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import yam from "@/assets/yam.jpg";
import catfish from "@/assets/catfish.jpg";
import cassavaPeppers from "@/assets/cassava-peppers.jpg";

const searchSchema = z.object({ category: z.string().optional().default("All") });
const categories = ["All", "Fresh Produce", "Fish & Seafood", "Pantry Staples", "Bundled Baskets", "Meat & Poultry", "Grains & Oils"];
const fallbackImages = [yam, catfish, cassavaPeppers];

export const Route = createFileRoute("/market")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Shop the market | CyberAgris" }, { name: "description", content: "Shop fresh produce, fish, pantry staples and deals from Bayelsa farmers on CyberAgris." }, { property: "og:title", content: "Shop the market | CyberAgris" }, { property: "og:description", content: "Fresh local food from Bayelsa farmers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: MarketPage,
});

function MarketPage() {
  const { category } = Route.useSearch();
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [query, setQuery] = useState("");
  const [bagCount, setBagCount] = useState(0);
  const [bagProducts, setBagProducts] = useState<Tables<"products">[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => { supabase.from("products").select("*").eq("status", "active").order("created_at", { ascending: false }).then(({ data }) => { setProducts(data ?? []); setLoading(false); }); }, []);
  const visibleProducts = useMemo(() => products.filter((product) => (category === "All" || product.category === category) && `${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase())), [category, products, query]);

  async function checkout() {
    if (!deliveryAddress.trim()) { setCheckoutMessage("Add a delivery address to continue."); return; }
    setCheckoutMessage("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { await navigate({ to: "/auth" }); return; }
    const rows = bagProducts.map((product) => ({
      buyer_id: auth.user.id,
      farmer_id: product.farmer_id,
      product_id: product.id,
      quantity: 1,
      total: Number((product.price * (1 - product.discount_percent / 100)).toFixed(2)),
      delivery_address: deliveryAddress.trim(),
    }));
    const { error } = await supabase.from("orders").insert(rows);
    if (error) { setCheckoutMessage(error.message); return; }
    setCheckoutMessage("Order placed. Visit your dashboard to pay securely.");
    setBagProducts([]); setBagCount(0); setDeliveryAddress("");
  }

  return <main className="min-h-screen bg-background"><header className="border-b border-border"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5"><Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-extrabold"><span className="grid size-8 place-items-center rounded-full bg-secondary text-primary-foreground">C</span>Cyber<span className="text-secondary">Agris</span></Link><div className="hidden max-w-md flex-1 md:block"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search yams, fish, peppers..." className="pl-10" /></div></div><div className="flex items-center gap-2"><Button asChild variant="ghost" size="compact"><Link to="/join-market">Join market</Link></Button><Button type="button" size="icon" aria-label="Open shopping bag" className="relative" onClick={() => setCheckoutOpen(true)}><ShoppingBag className="size-4" />{bagCount > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-[10px] text-accent-foreground">{bagCount}</span>}</Button></div></div></header><div className="mx-auto max-w-6xl px-5 py-10"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-secondary"><ArrowLeft className="size-4" />Back home</Link><p className="text-sm font-bold uppercase tracking-widest text-secondary">The CyberAgris market</p><h1 className="mt-3 font-display text-4xl font-extrabold">Good food, close to home.</h1><p className="mt-3 max-w-xl text-muted-foreground">Browse active products from farmers and fishers across Bayelsa.</p></div><div className="w-full md:hidden"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="pl-10" /></div></div></div><div className="mb-8 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <Link key={item} to="/market" search={{ category: item }} className={`shrink-0 border px-4 py-2 text-sm font-bold ${category === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{item}</Link>)}</div><div className="mb-10 grid gap-4 md:grid-cols-3"><div className="bg-primary p-5 text-primary-foreground md:col-span-2"><p className="text-xs font-bold uppercase tracking-widest text-accent">Fresh this week</p><h2 className="mt-2 max-w-md font-display text-2xl font-extrabold">Stock your kitchen from the source.</h2><p className="mt-2 max-w-md text-sm text-primary-foreground/70">Every listing comes from a local seller. Look for the deal badge for this week’s best value.</p></div><div className="border border-border bg-card p-5"><Tag className="size-5 text-secondary" /><h2 className="mt-4 font-display text-xl font-bold">Deals</h2><p className="mt-2 text-sm text-muted-foreground">{products.filter((product) => product.is_deal).length || "New"} special offers from local sellers.</p></div></div>{checkoutOpen && <section className="mb-10 border border-primary bg-card p-6" aria-label="Checkout"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Checkout</p><h2 className="mt-2 font-display text-2xl font-bold">Ready for your basket?</h2></div><Button type="button" variant="ghost" size="icon" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)}><X className="size-4" /></Button></div>{bagProducts.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Your bag is empty. Add a product to begin.</p> : <><div className="mt-5 space-y-3">{bagProducts.map((product) => <div key={product.id} className="flex items-center justify-between border-b border-border pb-3"><span className="font-bold">{product.name}</span><span className="text-secondary">₦{(product.price * (1 - product.discount_percent / 100)).toLocaleString()}</span></div>)}</div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Input aria-label="Delivery address" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Delivery address" /><Button type="button" onClick={checkout}>Place order <Check className="size-4" /></Button></div></>}{checkoutMessage && <p role="status" className="mt-4 text-sm text-secondary">{checkoutMessage}</p>}</section>}{loading ? <p className="py-20 text-center text-muted-foreground">Loading today’s harvest...</p> : visibleProducts.length === 0 ? <div className="border border-dashed border-border px-5 py-20 text-center"><h2 className="font-display text-xl font-bold">No products in this category yet.</h2><p className="mt-2 text-sm text-muted-foreground">Try another category or check back after farmers add new stock.</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleProducts.map((product, index) => <article key={product.id} className="group overflow-hidden border border-border bg-card"><div className="relative"><img src={product.image_url || fallbackImages[index % fallbackImages.length]} alt={product.name} className="aspect-[4/3] w-full object-cover" />{product.is_deal && <span className="absolute left-3 top-3 bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">{product.discount_percent}% off</span>}<Button type="button" variant="ghost" size="icon" aria-label={`Save ${product.name}`} className="absolute right-3 top-3 bg-card/90"><Heart className="size-4" /></Button></div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-secondary">{product.category}</p><h2 className="mt-2 font-display text-lg font-bold">{product.name}</h2></div><strong className="shrink-0 text-secondary">₦{product.price.toLocaleString()}</strong></div><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.description || `Fresh ${product.name.toLowerCase()} from a CyberAgris farmer.`}</p><div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{product.location || "Bayelsa"} · per {product.unit}</span><Button size="compact" onClick={() => { setBagProducts((current) => current.some((item) => item.id === product.id) ? current : [...current, product]); setBagCount((count) => count + 1); setCheckoutOpen(true); }}>Add to bag</Button></div></div></article>)}</div>}</div></main>;
}