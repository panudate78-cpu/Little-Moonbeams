"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <select
      value={params.get("sort") ?? "newest"}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        next.set("sort", e.target.value);
        router.push(`${pathname}?${next.toString()}`);
      }}
      className="input !w-auto !rounded-full !py-2 text-sm"
      aria-label="Sort products"
    >
      <option value="newest">Newest first</option>
      <option value="price-asc">Price: low to high</option>
      <option value="price-desc">Price: high to low</option>
      <option value="name">Name A–Z</option>
    </select>
  );
}

export function FilterToggle({ param, label }: { param: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get(param) === "1";

  return (
    <button
      onClick={() => {
        const next = new URLSearchParams(params.toString());
        if (active) next.delete(param);
        else next.set(param, "1");
        router.push(`${pathname}?${next.toString()}`);
      }}
      className={`rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide uppercase transition ${
        active
          ? "border-lavender bg-lavender text-white"
          : "border-silvermist bg-ivory text-inksoft hover:border-lavender"
      }`}
    >
      {label}
    </button>
  );
}

export function PriceFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("max") ?? "";

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set("max", e.target.value);
        else next.delete("max");
        router.push(`${pathname}?${next.toString()}`);
      }}
      className="input !w-auto !rounded-full !py-2 text-sm"
      aria-label="Filter by price"
    >
      <option value="">Any price</option>
      <option value="2500">Under £25</option>
      <option value="4000">Under £40</option>
      <option value="6000">Under £60</option>
      <option value="10000">Under £100</option>
    </select>
  );
}
