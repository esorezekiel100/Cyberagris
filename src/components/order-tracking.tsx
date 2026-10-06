import { Bike, Check, MapPin, Package, Phone, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type TrackingEvent = Tables<"order_tracking_events">;

const steps = [
  { key: "preparing", label: "Preparing", icon: Package },
  { key: "ready_for_pickup", label: "Ready for pickup", icon: Check },
  { key: "in_transit", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: MapPin },
] as const;

export const deliveryMethods: Record<string, string> = {
  cyberagris_rider: "CyberAgris rider",
  farmer_delivery: "Farmer delivers",
  buyer_pickup: "Buyer pickup",
};

type Props = {
  role: "buyer" | "farmer";
  orders: Order[];
  productNames: Record<string, string>;
  onOrderUpdated: (order: Order) => void;
};

export function OrderTracking({ role, orders, productNames, onOrderUpdated }: Props) {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const paidOrders = orders.filter((order) => order.status === "confirmed");
  const ids = paidOrders.map((order) => order.id).join(",");

  async function loadEvents() {
    if (!ids) { setEvents([]); return; }
    const { data } = await supabase.from("order_tracking_events").select("*").in("order_id", ids.split(",")).order("created_at", { ascending: true });
    setEvents(data ?? []);
  }

  useEffect(() => { loadEvents(); }, [ids]);

  return (
    <section className="border border-border bg-card p-6" aria-label="Delivery tracking">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><Truck className="size-5" /></span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">Logistics</p>
          <h2 className="font-display text-xl font-bold">Delivery tracking</h2>
          <p className="mt-1 text-sm text-muted-foreground">{role === "farmer" ? "Update each paid order as it moves from your farm to the buyer." : "Follow each paid order from preparation to your door."}</p>
        </div>
      </div>
      {paidOrders.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Paid orders will show their delivery progress here.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {paidOrders.map((order) => (
            <TrackingCard key={order.id} role={role} order={order} productName={productNames[order.product_id] ?? "Order"} events={events.filter((event) => event.order_id === order.id)} onUpdated={async (updated) => { onOrderUpdated(updated); await loadEvents(); }} />
          ))}
        </div>
      )}
    </section>
  );
}

function TrackingCard({ role, order, productName, events, onUpdated }: { role: "buyer" | "farmer"; order: Order; productName?: string; events: TrackingEvent[]; onUpdated: (order: Order) => Promise<void> }) {
  const currentIndex = steps.findIndex((step) => step.key === order.fulfillment_status);
  const nextStep = steps[currentIndex + 1];
  const [method, setMethod] = useState(order.delivery_method);
  const [courierName, setCourierName] = useState(order.courier_name ?? "");
  const [courierPhone, setCourierPhone] = useState(order.courier_phone ?? "");
  const [eta, setEta] = useState(order.estimated_delivery ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(status: string) {
    setBusy(true); setError("");
    const rpcArgs: Record<string, string> = {
      _order_id: order.id, _status: status, _delivery_method: method,
    };
    if (note) rpcArgs._note = note;
    if (courierName) rpcArgs._courier_name = courierName;
    if (courierPhone) rpcArgs._courier_phone = courierPhone;
    if (eta) rpcArgs._estimated_delivery = eta;
    const { error: rpcError } = await supabase.rpc("update_order_fulfillment", rpcArgs);
    if (rpcError) { setError(rpcError.message); setBusy(false); return; }
    const { data } = await supabase.from("orders").select("*").eq("id", order.id).single();
    if (data) await onUpdated(data);
    setNote(""); setBusy(false);
  }

  return (
    <article className="border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">{productName ?? "Order"} · <span className="text-muted-foreground">#{order.id.slice(0, 8)}</span></p>
          <p className="mt-1 text-xs text-muted-foreground">To: {order.delivery_address}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p className="font-bold text-foreground">{deliveryMethods[order.delivery_method] ?? order.delivery_method}</p>
          {order.estimated_delivery && <p>Expected {new Date(order.estimated_delivery).toLocaleDateString()}</p>}
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const done = index <= currentIndex;
          const Icon = step.icon;
          return (
            <li key={step.key} className="flex flex-col items-center gap-2 text-center">
              <span className={`grid size-9 place-items-center rounded-full border ${done ? "border-secondary bg-secondary text-secondary-foreground" : "border-border text-muted-foreground"}`}><Icon className="size-4" /></span>
              <span className={`text-xs ${done ? "font-bold text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
              <span className={`h-1 w-full rounded-full ${done ? "bg-secondary" : "bg-muted"}`} />
            </li>
          );
        })}
      </ol>

      {(order.courier_name || order.courier_phone) && (
        <p className="mt-4 flex flex-wrap items-center gap-3 text-sm"><Bike className="size-4 text-secondary" />{order.courier_name}{order.courier_phone && <a href={`tel:${order.courier_phone}`} className="inline-flex items-center gap-1 font-bold text-secondary"><Phone className="size-3" />{order.courier_phone}</a>}</p>
      )}

      {events.length > 0 && (
        <ul className="mt-4 space-y-2 border-l-2 border-border pl-4 text-sm">
          {events.slice().reverse().map((event) => (
            <li key={event.id}>
              <p className="font-bold">{steps.find((step) => step.key === event.status)?.label ?? event.status} <span className="text-xs font-normal text-muted-foreground">· {new Date(event.created_at).toLocaleString()}</span></p>
              {event.note && <p className="text-muted-foreground">{event.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {role === "farmer" && nextStep && (
        <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor={`method-${order.id}`}>Delivery method</Label><select id={`method-${order.id}`} value={method} onChange={(event) => setMethod(event.target.value)} className="h-9 w-full border border-input bg-transparent px-3 text-sm">{Object.entries(deliveryMethods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="space-y-1"><Label htmlFor={`eta-${order.id}`}>Expected delivery</Label><Input id={`eta-${order.id}`} type="date" value={eta} onChange={(event) => setEta(event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor={`courier-${order.id}`}>Rider / driver name</Label><Input id={`courier-${order.id}`} value={courierName} onChange={(event) => setCourierName(event.target.value)} placeholder="Optional" /></div>
          <div className="space-y-1"><Label htmlFor={`phone-${order.id}`}>Rider phone</Label><Input id={`phone-${order.id}`} value={courierPhone} onChange={(event) => setCourierPhone(event.target.value)} placeholder="080..." /></div>
          <div className="space-y-1 sm:col-span-2"><Label htmlFor={`note-${order.id}`}>Note for buyer</Label><Input id={`note-${order.id}`} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Packed and waiting at Ogbia jetty" /></div>
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <Button type="button" className="sm:col-span-2" disabled={busy} onClick={() => update(nextStep.key)}>{busy ? "Updating..." : `Mark as ${nextStep.label.toLowerCase()}`}</Button>
        </div>
      )}
    </article>
  );
}
