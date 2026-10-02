import { MessageResponse, Message } from "@/components/ai-elements/message";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Inbox, Leaf, MessageCircle, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MessageRow = Tables<"messages">;
type OrderRow = Tables<"orders">;
type ProductRow = Tables<"products">;

type InboxProps = {
  role: "buyer" | "farmer";
  userId: string;
  orders: OrderRow[];
  products: ProductRow[];
};

type ConversationContext = {
  key: string;
  buyerId: string;
  farmerId: string;
  productId: string | null;
  orderId: string | null;
  label: string;
};

export function DashboardInbox({ role, userId, orders, products }: InboxProps) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>();
  const [productId, setProductId] = useState("");
  const [notice, setNotice] = useState("");

  async function loadMessages() {
    const query = supabase.from("messages").select("*").order("created_at", { ascending: true });
    const { data } = role === "farmer" ? await query.eq("farmer_id", userId) : await query.eq("buyer_id", userId);
    setMessages(data ?? []);
  }

  useEffect(() => {
    loadMessages();
  }, [role, userId]);

  const contexts = useMemo<ConversationContext[]>(() => {
    const result: ConversationContext[] = [];
    const seen = new Set<string>();
    const addContext = (context: ConversationContext) => {
      if (!seen.has(context.key)) {
        seen.add(context.key);
        result.push(context);
      }
    };

    for (const item of messages) {
      const otherId = role === "farmer" ? item.buyer_id : item.farmer_id;
      const key = `${otherId}:${item.product_id ?? "product"}:${item.order_id ?? "inquiry"}`;
      addContext({
        key,
        buyerId: item.buyer_id,
        farmerId: item.farmer_id,
        productId: item.product_id,
        orderId: item.order_id,
        label: item.order_id ? `Order ${item.order_id.slice(0, 8)}` : `Product inquiry · ${otherId.slice(0, 8)}`,
      });
    }

    for (const order of orders) {
      const otherId = role === "farmer" ? order.buyer_id : order.farmer_id;
      const key = `${otherId}:order:${order.id}`;
      addContext({
        key,
        buyerId: order.buyer_id,
        farmerId: order.farmer_id,
        productId: order.product_id,
        orderId: order.id,
        label: `Order ${order.id.slice(0, 8)}`,
      });
    }

    return result;
  }, [messages, orders, role]);

  const productContexts = useMemo(() => {
    if (role !== "buyer") return [];
    return products.map((product) => ({
      key: `${product.farmer_id}:${product.id}:inquiry`,
      buyerId: userId,
      farmerId: product.farmer_id,
      productId: product.id,
      orderId: null,
      label: `${product.name} · Ask farmer`,
    }));
  }, [products, role, userId]);

  const allContexts = [...contexts, ...productContexts];
  const activeContext = allContexts.find((item) => item.key === selectedKey) ?? allContexts[0];
  const activeMessages = activeContext
    ? messages.filter(
        (item) =>
          item.buyer_id === activeContext.buyerId &&
          item.farmer_id === activeContext.farmerId &&
          item.product_id === activeContext.productId &&
          item.order_id === activeContext.orderId,
      )
    : [];

  async function sendMessage(text: string) {
    const body = text.trim();
    if (!body || !activeContext) return;
    setNotice("");
    const { data, error } = await supabase
      .from("messages")
      .insert({
        body,
        buyer_id: activeContext.buyerId,
        farmer_id: activeContext.farmerId,
        sender_id: userId,
        product_id: activeContext.productId,
        order_id: activeContext.orderId,
      })
      .select()
      .single();
    if (error) {
      setNotice(error.message);
      return;
    }
    if (data) setMessages((current) => [...current, data]);
  }

  return (
    <section className="border border-border bg-card p-6" aria-label="Messaging inbox">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <Inbox className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Direct line</p>
            <h2 className="font-display text-xl font-bold">Your inbox</h2>
            <p className="mt-1 text-sm text-muted-foreground">Talk about a delivery, a product, or the next harvest.</p>
          </div>
        </div>
        {role === "buyer" && (
          <div className="flex min-w-[220px] items-center gap-2">
            <Label htmlFor="inquiry-product" className="sr-only">Ask about a product</Label>
            <select
              id="inquiry-product"
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value);
                const next = productContexts.find((item) => item.productId === event.target.value);
                if (next) setSelectedKey(next.key);
              }}
              className="h-9 min-w-0 flex-1 border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Ask about a product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="mt-6 grid overflow-hidden border border-border lg:grid-cols-[220px_1fr]">
        <div className="border-b border-border bg-muted/40 p-2 lg:border-b-0 lg:border-r">
          {allContexts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <MessageCircle className="mx-auto mb-2 size-5" />
              Your conversations will appear here.
            </div>
          ) : allContexts.map((item) => (
            <Button
              key={item.key}
              type="button"
              variant={activeContext?.key === item.key ? "secondary" : "ghost"}
              className="mb-1 h-auto w-full justify-start whitespace-normal px-3 py-3 text-left text-sm"
              onClick={() => setSelectedKey(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="flex min-h-[360px] flex-col">
          {activeContext ? (
            <>
              <Conversation className="h-[260px]">
                <ConversationContent>
                  {activeMessages.length === 0 ? (
                    <ConversationEmptyState icon={<Leaf className="size-6" />} title="Start the conversation" description="Ask a question and the other side can reply from their dashboard." />
                  ) : activeMessages.map((item) => (
                    <Message key={item.id} from={item.sender_id === userId ? "user" : "assistant"}>
                      <div className="text-xs text-muted-foreground">{item.sender_id === userId ? "You" : "Marketplace contact"}</div>
                      <MessageResponse>{item.body}</MessageResponse>
                    </Message>
                  ))}
                </ConversationContent>
              </Conversation>
              <div className="border-t border-border p-3">
                <PromptInput onSubmit={({ text }) => sendMessage(text)}>
                  <PromptInputBody>
                    <PromptInputTextarea placeholder="Write a message..." />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools><span className="text-xs text-muted-foreground">Press Enter to send</span></PromptInputTools>
                    <PromptInputSubmit aria-label="Send message"><Send className="size-4" /></PromptInputSubmit>
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted-foreground">Choose an order or product to begin.</div>
          )}
        </div>
      </div>
      {notice && <p role="alert" className="mt-3 text-sm text-destructive">{notice}</p>}
    </section>
  );
}