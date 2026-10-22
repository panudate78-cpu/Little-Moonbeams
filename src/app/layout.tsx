import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Parisienne, Nunito_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
//import { getSiteSettings } from "@/lib/catalog";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const parisienne = Parisienne({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-parisienne",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Little Moonbeam's Creations | Handcrafted Jewellery Inspired by Nature and Moonlight",
    template: "%s | Little Moonbeam's Creations",
  },
  description:
    "Little Moonbeam's Creations creates handmade jewellery from precious stones, crystals, gemstones and sterling silver. Handcrafted jewellery inspired by nature and moonlight.",
  openGraph: {
    siteName: "Little Moonbeam's Creations",
    type: "website",
    title: "Little Moonbeam's Creations | Handcrafted Jewellery",
    description:
      "Handmade jewellery crafted from precious stones, crystals, gemstones and sterling silver.",
  
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  //const settings = await getSiteSettings();

  return (
    <html lang="en" className={`${cormorant.variable} ${parisienne.variable} ${nunito.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
