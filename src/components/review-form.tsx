"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, name, rating, title, comment }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-xl bg-lavender-light p-4 text-sm font-semibold text-lavender-deep">
        ✦ Thank you for your review!
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <h3 className="font-display text-xl">Write a review</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Your name</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Rating</label>
          <div className="flex gap-1 pt-1.5 text-2xl">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                type="button"
                key={i}
                onClick={() => setRating(i)}
                className={i <= rating ? "text-gold" : "text-silvermist"}
                aria-label={`${i} stars`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Review</label>
        <textarea
          className="input min-h-24"
          required
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <button disabled={status === "loading"} className="btn-primary">
        {status === "loading" ? "Submitting…" : "Submit review"}
      </button>
      {status === "error" && <p className="text-sm text-blush">Something went wrong, please try again.</p>}
    </form>
  );
}
