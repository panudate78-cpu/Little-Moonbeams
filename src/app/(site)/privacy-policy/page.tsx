import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Little Moonbeam's collects, uses and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <p className="eyebrow">Your data, treated kindly</p>
        <h1 className="section-title mt-2">Privacy Policy</h1>
        <p className="mt-2 text-xs text-inksoft">Last updated: January 2026</p>
      </div>
      <div className="card prose-sm mt-10 space-y-6 p-8 text-sm leading-relaxed text-inksoft">
        <section>
          <h2 className="font-display text-xl text-ink">1. Who we are</h2>
          <p className="mt-2">
            Little Moonbeam&apos;s (&quot;we&quot;, &quot;us&quot;) is a UK-based handmade
            jewellery boutique. This policy explains how we handle your personal information when
            you visit our website or place an order.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">2. What we collect</h2>
          <p className="mt-2">
            We collect the details you provide at checkout (name, email, delivery address, phone
            number), account information if you register, messages you send us, newsletter
            sign-ups, and standard technical data such as IP address and browser type.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">3. How we use it</h2>
          <p className="mt-2">
            We use your data to fulfil orders, send order confirmations and shipping updates,
            respond to enquiries, send our newsletter (only if you opt in), prevent fraud, and
            improve our shop. We never sell your personal data.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">4. Payments</h2>
          <p className="mt-2">
            Card payments are processed securely by Stripe and PayPal. We never see or store your
            full card details — payment data is handled entirely by our PCI-DSS compliant payment
            providers.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">5. Cookies</h2>
          <p className="mt-2">
            We use essential cookies to keep your bag and sign-in working, and anonymous analytics
            cookies to understand how visitors use the site. You can disable cookies in your
            browser settings.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">6. Your rights</h2>
          <p className="mt-2">
            Under UK GDPR you may request access to, correction of, or deletion of your personal
            data at any time. Email hello@littlemoonbeams.co.uk and we&apos;ll respond within 30
            days.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">7. Contact</h2>
          <p className="mt-2">
            Questions about this policy? Contact us at hello@littlemoonbeams.co.uk.
          </p>
        </section>
      </div>
    </div>
  );
}
