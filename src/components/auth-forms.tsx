"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(data.role === "admin" && next === "/account" ? "/admin" : next);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Invalid email or password");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-8">
      <div>
        <label className="label">Email</label>
        <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">Password</label>
        <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="rounded-xl bg-blush-light p-3 text-sm text-blush">{error}</p>}
      <button disabled={loading} className="btn-gold w-full">
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-inksoft">
        New here?{" "}
        <Link href="/register" className="font-semibold text-lavender-deep underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.ok) {
      router.push("/account");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create account");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-8">
      <div>
        <label className="label">Full name</label>
        <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">Password (min 8 characters)</label>
        <input type="password" required minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="rounded-xl bg-blush-light p-3 text-sm text-blush">{error}</p>}
      <button disabled={loading} className="btn-gold w-full">
        {loading ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-inksoft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-lavender-deep underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="btn-outline !px-5 !py-2 text-xs"
    >
      Sign out
    </button>
  );
}
