import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Footer, Header, SampleBanner } from "@/components/chrome";
import { getCurrentUser, asPlan } from "@/lib/auth";
import { brand } from "@/lib/brand";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} font-sans text-ink`}>
        <SampleBanner />
        <Header email={user?.email} plan={user ? asPlan(user.plan) : null} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
