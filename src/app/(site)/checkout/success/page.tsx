import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuccessPage(props: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await props.searchParams;
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="floaty inline-block text-6xl">🌙</p>
      <h1 className="section-title mt-6">Thank you, moonbeam!</h1>
      <p className="mt-4 leading-relaxed text-inksoft">
        Your order has been placed and a confirmation email is on its way. Your handmade treasures
        will be lovingly wrapped and sent with a sprinkle of stardust.
      </p>
      {order && (
        <p className="mt-6 inline-block rounded-full bg-lavender-light px-6 py-3 text-sm font-bold text-lavender-deep">
          Order number: {order}
        </p>
      )}
      <div className="mt-10 flex justify-center gap-3">
        <Link href="/shop" className="btn-outline">
          Continue shopping
        </Link>
        <Link href="/account" className="btn-gold">
          View order history
        </Link>
      </div>
    </div>
  );
}
