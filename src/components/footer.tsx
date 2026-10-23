import Link from "next/link";
import { Logo } from "@/components/logo";
import { NewsletterForm } from "@/components/newsletter-form";

const SHOP_LINKS = [
  { href: "/shop", label: "All Jewellery" },
  { href: "/collections", label: "Collections" },
  { href: "/shop?sale=1", label: "Sale" },
  { href: "/custom-orders", label: "Custom Orders" },
  { href: "/reviews", label: "Customer Reviews" },
];

const HELP_LINKS = [
  { href: "/contact", label: "Contact Us" },
  { href: "/faq", label: "FAQ" },
  { href: "/shipping-returns", label: "Shipping & Returns" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-silvermist/40 bg-night text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 text-sm leading-relaxed text-ivory/70">
            Handcrafted jewellery inspired by nature and moonlight. Every piece is made by hand
            with precious stones, crystals and sterling silver. ☾
          </p>
          <div className="mt-4 flex gap-3 text-ivory/60">
            <span className="twinkle">✦</span>
            <span className="twinkle" style={{ animationDelay: "0.6s" }}>✧</span>
            <span className="twinkle" style={{ animationDelay: "1.2s" }}>✦</span>
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold tracking-[0.2em] text-gold uppercase">Shop</h3>
          <ul className="space-y-2.5">
            {SHOP_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-ivory/70 transition hover:text-ivory">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold tracking-[0.2em] text-gold uppercase">Help</h3>
          <ul className="space-y-2.5">
            {HELP_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-ivory/70 transition hover:text-ivory">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold tracking-[0.2em] text-gold uppercase">
            Join the Moonbeam Club
          </h3>
          <p className="mb-3 text-sm text-ivory/70">
            10% off your first order, plus new collection previews under every full moon.
          </p>
          <NewsletterForm dark />
        </div>
      </div>
      <div className="border-t border-ivory/10 px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-ivory/50 sm:flex-row">
            <p className="text-center sm:text-left">
              © {new Date().getFullYear()} Little Moonbeam&apos;s Creations. All rights reserved.
            </p>
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:justify-end sm:text-right">
              <span>🔒 Secure Checkout</span>
              <span>Visa · Mastercard · PayPal · Apple Pay · Google Pay</span>
            </p>
          </div>
          <p className="mt-3 text-center text-xs leading-relaxed text-ivory/65 sm:mt-2 sm:text-left">
            Website designed and maintained by{" "}
            <a
              href="https://launchpadstudio.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ivory/85 underline decoration-ivory/30 underline-offset-4 transition hover:text-gold hover:decoration-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Launchpad Studio
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
