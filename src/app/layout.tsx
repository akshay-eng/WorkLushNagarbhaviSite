import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { site } from "@/data/site";
import "./globals.css";

// One typeface across the site. DM Sans carries an optical-size axis, so the
// weight shifts in the Fluid Functionalism components hold their width.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Worklush Spaces · Coworking in Nagarbhavi, Bengaluru",
    template: "%s · Worklush Spaces",
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "Worklush Spaces · Pick your seat, then get to work",
    description: site.description,
    images: [{ url: "/images/hero-og.jpg", width: 1920, height: 1080, alt: "Worklush Spaces coworking floor" }],
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#023c40",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
