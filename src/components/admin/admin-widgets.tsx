"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProductButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        setBusy(true);
        await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
        router.refresh();
      }}
      className="rounded-full border border-blush px-3 py-1 text-xs font-bold text-blush uppercase hover:bg-blush hover:text-white disabled:opacity-50"
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}

export function OrderActions({
  id,
  status,
  trackingNumber,
}: {
  id: number;
  status: string;
  trackingNumber: string;
}) {
  const router = useRouter();
  const [tracking, setTracking] = useState(trackingNumber);
  const [busy, setBusy] = useState(false);

  async function update(body: Record<string, string>) {
    setBusy(true);
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        disabled={busy}
        value={status}
        onChange={(e) => update({ status: e.target.value })}
        className="rounded-full border border-silvermist bg-ivory px-3 py-1.5 text-xs font-bold uppercase"
      >
        {["pending", "paid", "shipped", "delivered", "cancelled"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <div className="flex gap-1">
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Tracking no."
          className="w-32 rounded-full border border-silvermist bg-ivory px-3 py-1.5 text-xs"
        />
        <button
          disabled={busy}
          onClick={() => update({ trackingNumber: tracking })}
          className="rounded-full border border-silvermist px-3 py-1.5 text-xs font-bold uppercase hover:bg-ink hover:text-ivory"
        >
          Save
        </button>
      </div>
    </div>
  );
}

interface CatalogItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export function CatalogManager({
  title,
  endpoint,
  items,
  withImage = false,
}: {
  title: string;
  endpoint: string;
  items: CatalogItem[];
  withImage?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, image: image || undefined }),
    });
    if (res.ok) {
      setName("");
      setDescription("");
      setImage("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add");
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-xl">{title}</h2>
      <form onSubmit={add} className="mt-4 space-y-3">
        <input required className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        {withImage && (
          <input className="input" placeholder="Image URL (optional)" value={image} onChange={(e) => setImage(e.target.value)} />
        )}
        {error && <p className="text-xs text-blush">{error}</p>}
        <button className="btn-primary !px-5 !py-2 text-xs">+ Add</button>
      </form>
      <ul className="mt-5 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-xl bg-cream px-4 py-2.5 text-sm">
            <span>
              <span className="font-semibold">{item.name}</span>{" "}
              <span className="text-xs text-inksoft">/{item.slug}</span>
            </span>
            <button
              onClick={async () => {
                if (!confirm(`Delete "${item.name}"?`)) return;
                await fetch(endpoint, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: item.id }),
                });
                router.refresh();
              }}
              className="text-xs font-bold text-blush uppercase hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-inksoft">None yet.</li>}
      </ul>
    </div>
  );
}

export function DiscountForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    code: "",
    type: "percent",
    value: "",
    minSubtotal: "",
    usageLimit: "",
    expiresAt: "",
  });
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        type: form.type,
        value:
          form.type === "percent"
            ? Number(form.value)
            : Math.round(parseFloat(form.value || "0") * 100),
        minSubtotal: Math.round(parseFloat(form.minSubtotal || "0") * 100),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        expiresAt: form.expiresAt || null,
      }),
    });
    if (res.ok) {
      setForm({ code: "", type: "percent", value: "", minSubtotal: "", usageLimit: "", expiresAt: "" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create code");
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-6">
      <h2 className="font-display text-xl">Create discount code</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Code *</label>
          <input required className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off (£)</option>
          </select>
        </div>
        <div>
          <label className="label">{form.type === "percent" ? "Percent off *" : "Amount off (£) *"}</label>
          <input required type="number" step="0.01" min="0" className="input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        </div>
        <div>
          <label className="label">Min. spend (£)</label>
          <input type="number" step="0.01" min="0" className="input" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} />
        </div>
        <div>
          <label className="label">Usage limit</label>
          <input type="number" min="1" className="input" placeholder="Unlimited" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
        </div>
        <div>
          <label className="label">Expires</label>
          <input type="date" className="input" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </div>
      </div>
      {error && <p className="text-xs text-blush">{error}</p>}
      <button className="btn-gold !px-5 !py-2 text-xs">+ Create code</button>
    </form>
  );
}

export function DiscountRowActions({ id, active }: { id: number; active: boolean }) {
  const router = useRouter();
  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={async () => {
          await fetch("/api/admin/discounts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, active: !active }),
          });
          router.refresh();
        }}
        className="rounded-full border border-silvermist px-3 py-1 text-xs font-bold uppercase hover:bg-ink hover:text-ivory"
      >
        {active ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={async () => {
          if (!confirm("Delete this code?")) return;
          await fetch("/api/admin/discounts", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          router.refresh();
        }}
        className="rounded-full border border-blush px-3 py-1 text-xs font-bold text-blush uppercase hover:bg-blush hover:text-white"
      >
        Delete
      </button>
    </div>
  );
}
