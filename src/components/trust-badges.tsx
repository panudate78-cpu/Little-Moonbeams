const BADGES = [
  {
    icon: "🔒",
    title: "Secure Checkout",
    text: "256-bit SSL encrypted payments via Stripe & PayPal",
  },
  {
    icon: "🤍",
    title: "Handmade with Love",
    text: "Every piece individually crafted in our studio",
  },
  {
    icon: "📦",
    title: "Tracked Delivery",
    text: "Free UK shipping over £50, beautifully gift-wrapped",
  },
  {
    icon: "↩️",
    title: "30-Day Returns",
    text: "Easy returns & exchanges, no questions asked",
  },
];

export function TrustBadges() {
  return (
    <section className="border-y border-silvermist/40 bg-ivory">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4">
        {BADGES.map((b) => (
          <div key={b.title} className="flex flex-col items-center text-center">
            <span className="mb-2 text-2xl">{b.icon}</span>
            <h3 className="text-sm font-bold tracking-wide text-ink">{b.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-inksoft">{b.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
