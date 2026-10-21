"use client";

import { useState } from "react";

export function ContactForm({
  type = "contact",
  subjectPlaceholder = "How can we help?",
  messagePlaceholder = "Write your message here…",
}: {
  type?: "contact" | "custom-order";
  subjectPlaceholder?: string;
  messagePlaceholder?: string;
}) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="card p-10 text-center">
        <p className="text-4xl">🌙</p>
        <h3 className="mt-3 font-display text-2xl">Message received!</h3>
        <p className="mt-2 text-sm text-inksoft">
          Thank you — we&apos;ll reply within 1–2 working days, sprinkled with stardust.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Your name *</label>
          <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Email *</label>
          <input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Subject</label>
        <input className="input" placeholder={subjectPlaceholder} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      </div>
      <div>
        <label className="label">Message *</label>
        <textarea required className="input min-h-36" placeholder={messagePlaceholder} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      <button disabled={status === "loading"} className="btn-gold">
        {status === "loading" ? "Sending…" : "Send message ✦"}
      </button>
      {status === "error" && <p className="text-sm text-blush">Something went wrong — please try again.</p>}
    </form>
  );
}
