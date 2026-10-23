import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "We'll be back shortly",
  description:
    "Little Moonbeam's Creations is being updated. Please check back shortly.",
  robots: {
    // Never let search engines index the maintenance page.
    index: false,
    follow: false,
  },
};

/**
 * Shown to every visitor while `site_settings.maintenance_mode = true`.
 *
 * This route lives OUTSIDE the `(site)` route group and is exempt in
 * `src/proxy.ts`, so it can never redirect to itself (no loop).
 */
export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-6">
      <div className="max-w-lg text-center">
        <p className="text-4xl text-lavender">☾</p>

        <h1 className="mt-4 font-display text-5xl sm:text-6xl">
          Little Moonbeam&apos;s Creations
        </h1>

        <p className="mt-6 text-xl leading-relaxed">
          Our little shop is currently being polished.
          We&apos;re adding new treasures, product photography and a few finishing
          touches.
        </p>

        <p className="mt-3 text-inksoft">Please check back shortly ✦</p>
      </div>
    </div>
  );
}
