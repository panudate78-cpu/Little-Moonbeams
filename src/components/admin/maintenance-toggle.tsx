"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  enabled: boolean;
};

export function MaintenanceToggle({ enabled }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const working = busy || isPending;

  async function update(value: boolean) {
    if (
      value &&
      !window.confirm(
        "Turn maintenance mode ON?\n\nVisitors will be redirected to /maintenance. Admins keep full access.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: value }),
        cache: "no-store",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? `Request failed (${response.status})`);
      }

      // Re-render the dashboard so the badge picks up the new value.
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => update(true)}
          disabled={working || enabled}
          className="btn-primary !px-5 !py-2 text-xs disabled:opacity-40"
        >
          {working && !enabled ? "Turning on…" : "Turn ON"}
        </button>

        <button
          type="button"
          onClick={() => update(false)}
          disabled={working || !enabled}
          className="btn-outline !px-5 !py-2 text-xs disabled:opacity-40"
        >
          {working && enabled ? "Turning off…" : "Turn OFF"}
        </button>

        <span className="text-xs text-inksoft">
          {enabled ? "Storefront is closed to visitors." : "Storefront is live."}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
