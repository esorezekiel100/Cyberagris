import { createFileRoute, Link } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, ArrowRight, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import harvestHero from "@/assets/bayelsa-harvest-hero.jpg";
import farmerTable from "@/assets/farmer-table.jpg";
import yam from "@/assets/yam.jpg";
import catfish from "@/assets/catfish.jpg";
import cassavaPeppers from "@/assets/cassava-peppers.jpg";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberAgris | Fresh food from Bayelsa farmers" },
      { name: "description", content: "Shop fresh food from Bayelsa farmers, or join CyberAgris and sell your harvest directly to customers." },
      { property: "og:title", content: "CyberAgris | Fresh food from Bayelsa farmers" },
      { property: "og:description", content: "Shop local produce and fish, delivered fresh across Bayelsa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  const [bagCount, setBagCount] = useState(0);
  const categories = ["Fresh Produce", "Fish & Seafood", "Pantry Staples", "Bundled Baskets", "Meat & Poultry", "Grains & Oils"];
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="bg-primary px-4 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-primary-foreground">Free delivery in Bayelsa on orders over ₦20,000 · Fresh from the river every dawn</div>
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-extrabold"><span className="grid size-8 place-items-center rounded-full bg-secondary text-primary-foreground">C</span>Cyber<span className="text-secondary">Agris</span></Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex"><Link to="/market">Shop market</Link><a href="#how">How it works</a><a href="#farmers">Sell with us</a></nav>
          <div className="flex items-center gap-2"><label className="hidden h-10 items-center gap-2 rounded-md border border-border px-3 md:flex"><Search className="size-4" /><input aria-label="Search market" className="w-36 bg-transparent text-sm outline-none" placeholder="Search the market" /></label><Button asChild variant="ghost" size="compact" className="hidden sm:inline-flex"><Link to="/auth">Sign in</Link></Button><Button asChild size="compact"><Link to="/join-market">Join market</Link></Button><Button asChild size="icon" aria-label="Open shopping market"><Link to="/market"><ShoppingBag className="size-4" />{bagCount > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-[10px] text-accent-foreground">{bagCount}</span>}</Link></Button><Button size="icon" variant="outline" className="lg:hidden" aria-label="Open menu"><Menu className="size-5" /></Button></div>
        </div>
      </header>
       <nav id="market" aria-label="Product categories" className="border-b border-border"><div className="mx-auto flex max-w-[1200px] gap-2 overflow-x-auto px-5 py-4">{categories.map((category, index) => <Link key={category} to="/market" search={{ category }} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${index === 0 ? "bg-primary text-primary-foreground" : "border border-border"}`}>{category}</Link>)}</div></nav>

      <main id="top">
        <section className="mx-auto grid max-w-[1200px] gap-10 px-5 py-10 lg:grid-cols-12 lg:py-14">
           <div className="rise flex flex-col justify-center lg:col-span-7"><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-secondary"><span className="size-2 rounded-full bg-accent" />CyberAgris · Bayelsa marketplace</p><h1 className="mt-4 max-w-[15ch] font-display text-4xl font-extrabold leading-[1.02] sm:text-5xl lg:text-6xl">Fresh from the Delta, delivered to your door.</h1><p className="mt-5 max-w-[46ch] text-base leading-relaxed text-foreground/70 sm:text-lg">Hand-picked produce, river fish and pantry staples from local farmers — ordered before dawn, at your gate by noon.</p><div className="mt-7 flex flex-wrap gap-3"><Button asChild variant="harvest"><Link to="/market">Shop this week's harvest <ArrowRight className="size-4" /></Link></Button><Button asChild variant="outline"><a href="#how">How ordering works</a></Button></div><div className="mt-9 grid grid-cols-3 gap-3 border-t border-border pt-5"><div><strong className="font-display text-xl sm:text-2xl">12k+</strong><p className="text-xs text-foreground/60">orders delivered</p></div><div><strong className="font-display text-xl sm:text-2xl">480</strong><p className="text-xs text-foreground/60">local farmers</p></div><div><strong className="font-display text-xl sm:text-2xl">4.9★</strong><p className="text-xs text-foreground/60">customer rating</p></div></div></div>
          <div className="rise relative lg:col-span-5"><img src={harvestHero} width={1024} height={1280} alt="Fresh yam, cassava, peppers, citrus and catfish in a woven basket" className="aspect-[4/5] w-full rounded-2xl object-cover" /><div className="absolute -bottom-4 left-3 right-3 rounded-xl bg-card p-4 shadow-xl sm:-left-4 sm:right-auto sm:w-64"><div className="flex justify-between gap-3"><strong className="font-display text-sm">Assorted peppers</strong><strong className="text-secondary">₦2,400</strong></div><p className="mt-1 text-xs text-muted-foreground">Picked this morning · Ogbia</p><Button size="compact" className="mt-3 w-full" onClick={() => setBagCount((count) => count + 1)}>Add to bag</Button></div></div>
        </section>

        <div className="overflow-hidden border-y border-primary/10 bg-primary py-3 text-primary-foreground"><div className="marquee whitespace-nowrap text-sm">{[0,1].map((copy) => <span key={copy}>{["Fresh catfish in","Yams from Ogbia","Cassava available","Free delivery over ₦20,000","Order by 9am for same-day"].map((item) => <span key={`${copy}-${item}`} className="mx-6">{item} <span className="ml-6 text-accent">•</span></span>)}</span>)}</div></div>

        <section id="harvest" className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-16 lg:grid-cols-12"><img src={farmerTable} width={1280} height={1024} loading="lazy" alt="Fresh produce and fish on a Bayelsa market table" className="aspect-[5/4] w-full rounded-2xl object-cover lg:col-span-7" /><div className="lg:col-span-5"><p className="text-[11px] font-bold uppercase tracking-widest text-secondary">The farm</p><h2 className="mt-3 font-display text-3xl font-extrabold leading-tight">Every crate traced to a named farmer in the Delta.</h2><p className="mt-4 leading-relaxed text-foreground/70">We work hand-in-hand with growers across Bayelsa, so the harvest stays local, the pay stays fair, and the quality you taste is the quality they're proud of.</p><a href="#farmers" className="mt-6 inline-flex items-center gap-2 font-bold text-secondary">Meet this week's growers <ArrowRight className="size-4" /></a></div></section>

        <section id="how" className="border-y border-border bg-primary/[0.03]"><div className="mx-auto max-w-[1200px] px-5 py-16"><p className="text-[11px] font-bold uppercase tracking-widest text-secondary">How it works</p><h2 className="mt-3 font-display text-3xl font-extrabold">Three steps to a full basket.</h2><div className="mt-9 grid gap-8 md:grid-cols-3">{[["01","Browse the harvest","Choose local produce, fish, pantry staples and new farmer listings."],["02","Build your basket","Add what you need and review your order before checkout."],["03","Get it delivered","Farmers prepare your order and our delivery team brings it to your door."]].map(([number,title,body]) => <article key={number} className="border-l-2 border-accent pl-5"><span className="font-display text-5xl font-extrabold text-secondary/25">{number}</span><h3 className="mt-3 font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-foreground/65">{body}</p></article>)}</div></div></section>

           <div className="lg:col-span-7"><p className="text-[11px] font-bold uppercase tracking-widest text-accent">For farmers</p><h2 className="mt-3 max-w-[18ch] font-display text-4xl font-extrabold leading-tight">Grow it once. Sell it to the whole Delta.</h2><p className="mt-4 max-w-[48ch] leading-relaxed text-primary-foreground/70">Join Bayelsa farmers and fishermen selling directly to homes, restaurants and businesses — no middlemen, no waiting.</p><div className="mt-7 flex gap-8"><div><strong className="font-display text-3xl text-accent">₦48m+</strong><p className="text-xs text-primary-foreground/60">paid to farmers</p></div><div><strong className="font-display text-3xl text-accent">840</strong><p className="text-xs text-primary-foreground/60">verified farmers</p></div></div><Button asChild variant="harvest" className="mt-8"><Link to="/join-market">Start selling today <ArrowRight className="size-4" /></Link></Button></div><div className="grid grid-cols-3 gap-3 lg:col-span-5">{[[yam,"Fresh white yam"],[catfish,"Fresh river fish"],[cassavaPeppers,"Cassava and peppers"]].map(([src,alt]) => <img key={alt} src={src} width={512} height={640} loading="lazy" alt={alt} className="aspect-[3/4] w-full rounded-xl object-cover" />)}</div></div></section>
      </main>

       <footer className="border-t border-primary-foreground/10 bg-primary text-primary-foreground"><div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-10 md:grid-cols-3"><div><div className="font-display text-lg font-extrabold">CyberAgris</div><p className="mt-3 max-w-sm text-sm text-primary-foreground/60">Better food. Stronger communities. Delivered fresh across Bayelsa.</p></div><div><h3 className="font-display text-sm font-bold">Shop</h3><p className="mt-3 text-sm leading-7 text-primary-foreground/60"><Link to="/market">Fresh Produce · Fish & Seafood</Link><br />Pantry Staples · Bundled Baskets</p></div><div><h3 className="font-display text-sm font-bold">Delivery area</h3><p className="mt-3 flex items-center gap-2 text-sm text-primary-foreground/60"><MapPin className="size-4" />Yenagoa & riverine communities</p></div></div><div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 border-t border-primary-foreground/10 px-5 py-5 text-xs text-primary-foreground/50"><span>© 2026 CyberAgris</span><span>Serving the Delta, one basket at a time.</span></div></footer>
    </div>
  );
}
