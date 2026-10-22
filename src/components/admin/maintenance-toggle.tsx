"use client";

import { useRouter } from "next/navigation";

export function MaintenanceToggle({
  enabled,
}: {
  enabled: boolean;
}) {
  const router = useRouter();

  async function update(value: boolean) {
    await fetch("/api/admin/maintenance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        enabled: value,
      }),
    });

    router.refresh();
  }

  return (
    <div className="mt-4 flex gap-2">
      <button
        onClick={() => update(true)}
        className="btn-primary !px-4 !py-2 text-xs"
      >
        Turn ON
      </button>

      <button
        onClick={() => update(false)}
        className="btn-outline !px-4 !py-2 text-xs"
      >
        Turn OFF
      </button>
    </div>
  );
}