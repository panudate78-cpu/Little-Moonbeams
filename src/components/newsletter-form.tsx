"use client";

import { useState } from "react";

export function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className={`text-sm font-semibold ${dark ? "text-gold" : "text-lavender-deep"}`}>
        ✦ Welcome to the Moonbeam Club! Check your inbox soon.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        className={
          dark
            ? "w-full rounded-full border border-ivory/20 bg-ivory/10 px-4 py-2.5 text-sm text-ivory placeholder:text-ivory/40 focus:border-gold focus:outline-none"
            : "input !rounded-full"
        }
      />
      <button disabled={status === "loading"} className="btn-gold !px-5 !py-2.5 whitespace-nowrap">
        {status === "loading" ? "…" : "Join"}
      </button>
      {status === "error" && (
        <span className="self-center text-xs text-blush">Try again</span>
      )}
    </form>
  );
}
