"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface Option {
  id: number;
  name: string;
}

interface FormImage {
  url: string;
  alt: string;
}

export interface ProductFormData {
  id?: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  materials: string;
  stoneInfo: string;
  careInstructions: string;
  price: number; // pence
  salePrice: number | null;
  stock: number;
  lowStockThreshold: number;
  status: string;
  featured: boolean;
  isNew: boolean;
  isBestseller: boolean;
  categoryId: number | null;
  collectionId: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  images: FormImage[];
}

const EMPTY: ProductFormData = {
  name: "",
  slug: "",
  sku: "",
  description: "",
  materials: "",
  stoneInfo: "",
  careInstructions: "",
  price: 0,
  salePrice: null,
  stock: 0,
  lowStockThreshold: 3,
  status: "active",
  featured: false,
  isNew: false,
  isBestseller: false,
  categoryId: null,
  collectionId: null,
  metaTitle: "",
  metaDescription: "",
  images: [],
};

export function ProductForm({
  initial,
  categories,
  collections,
}: {
  initial?: ProductFormData;
  categories: Option[];
  collections: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormData>(initial ?? EMPTY);
  const [priceStr, setPriceStr] = useState(initial ? (initial.price / 100).toFixed(2) : "");
  const [saleStr, setSaleStr] = useState(
    initial?.salePrice != null ? (initial.salePrice / 100).toFixed(2) : ""
  );
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          setForm((f) => ({ ...f, images: [...f.images, { url: data.url, alt: f.name }] }));
        } else {
          setError(data.error ?? "Upload failed");
        }
      } catch {
        setError("Upload failed");
      }
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  function moveImage(from: number, to: number) {
    setForm((f) => {
      const imgs = [...f.images];
      const [moved] = imgs.splice(from, 1);
      imgs.splice(to, 0, moved);
      return { ...f, images: imgs };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      price: Math.round(parseFloat(priceStr || "0") * 100),
      salePrice: saleStr ? Math.round(parseFloat(saleStr) * 100) : null,
    };
    try {
      const res = await fetch(
        form.id ? `/api/admin/products/${form.id}` : "/api/admin/products",
        {
          method: form.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        setSaving(false);
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Save failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="card space-y-4 p-6">
          <h2 className="font-display text-xl">Product details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Name *</label>
              <input required className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className="label">Slug (URL)</label>
              <input
                className="input"
                placeholder="auto-generated from name"
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
              />
            </div>
            <div>
              <label className="label">SKU</label>
              <input className="input" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input min-h-28" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Materials used</label>
              <textarea className="input min-h-20" value={form.materials} onChange={(e) => set("materials", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Stone information</label>
              <textarea className="input min-h-20" value={form.stoneInfo} onChange={(e) => set("stoneInfo", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Care instructions</label>
              <textarea className="input min-h-20" value={form.careInstructions} onChange={(e) => set("careInstructions", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="font-display text-xl">Image gallery</h2>
          <p className="text-xs text-inksoft">
            Upload multiple images, add by URL, and drag tiles to reorder. The first image is the
            main product photo.
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="btn-outline !px-5 !py-2 text-xs cursor-pointer">
              {uploading ? "Uploading…" : "⬆ Upload images"}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => uploadFiles(e.target.files)}
              />
            </label>
            <div className="flex flex-1 gap-2">
              <input
                className="input !py-2"
                placeholder="…or paste an image URL"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary !px-4 !py-2 text-xs"
                onClick={() => {
                  if (urlInput.trim()) {
                    set("images", [...form.images, { url: urlInput.trim(), alt: form.name }]);
                    setUrlInput("");
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
          {form.images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {form.images.map((img, i) => (
                <div
                  key={`${img.url}-${i}`}
                  draggable
                  onDragStart={() => (dragIndex.current = i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex.current !== null && dragIndex.current !== i) {
                      moveImage(dragIndex.current, i);
                    }
                    dragIndex.current = null;
                  }}
                  className="group relative aspect-square cursor-grab overflow-hidden rounded-xl border border-silvermist bg-dustyblue-light active:cursor-grabbing"
                >
                  <Image src={img.url} alt={img.alt} fill sizes="120px" className="object-cover" unoptimized />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 rounded-full bg-gold px-2 py-0.5 text-[0.55rem] font-bold text-white uppercase">
                      Main
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => set("images", form.images.filter((_, x) => x !== i))}
                    className="absolute top-1 right-1 hidden h-6 w-6 items-center justify-center rounded-full bg-night/80 text-xs text-white group-hover:flex"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="font-display text-xl">SEO</h2>
          <div>
            <label className="label">Meta title</label>
            <input
              className="input"
              value={form.metaTitle ?? ""}
              onChange={(e) => set("metaTitle", e.target.value)}
              placeholder={form.name || "Page title"}
            />
          </div>
          <div>
            <label className="label">Meta description</label>
            <textarea
              className="input min-h-20"
              value={form.metaDescription ?? ""}
              onChange={(e) => set("metaDescription", e.target.value)}
            />
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="card space-y-4 p-6">
          <h2 className="font-display text-xl">Pricing & stock</h2>
          <div>
            <label className="label">Price (£) *</label>
            <input required type="number" step="0.01" min="0" className="input" value={priceStr} onChange={(e) => setPriceStr(e.target.value)} />
          </div>
          <div>
            <label className="label">Sale price (£)</label>
            <input type="number" step="0.01" min="0" className="input" value={saleStr} onChange={(e) => setSaleStr(e.target.value)} placeholder="Leave blank for no sale" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Stock</label>
              <input type="number" min="0" className="input" value={form.stock} onChange={(e) => set("stock", Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Low stock alert at</label>
              <input type="number" min="0" className="input" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="font-display text-xl">Organisation</h2>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Active (visible)</option>
              <option value="draft">Draft (hidden)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.categoryId ?? ""}
              onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Collection</label>
            <select
              className="input"
              value={form.collectionId ?? ""}
              onChange={(e) => set("collectionId", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— None —</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 pt-2">
            {(
              [
                ["featured", "⭐ Featured on homepage"],
                ["isNew", "✦ Mark as new arrival"],
                ["isBestseller", "🔥 Mark as bestseller"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="accent-lavender"
                  checked={Boolean(form[key])}
                  onChange={(e) => set(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        {error && <p className="rounded-xl bg-blush-light p-3 text-sm text-blush">{error}</p>}
        <button disabled={saving} className="btn-gold w-full">
          {saving ? "Saving…" : form.id ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
