import { FloorTeaser } from "@/components/home/floor-teaser";
import { Gallery } from "@/components/home/gallery";
import { Hero } from "@/components/home/hero";
import { Amenities, FinalCta, HowItWorks, Spaces, Visit } from "@/components/home/sections";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { site } from "@/data/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CoworkingSpace",
  name: site.name,
  url: site.url,
  telephone: site.phone,
  email: site.email,
  image: `${site.url}/images/rooms-11.jpg`,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${site.address.line1}, ${site.address.line2}`,
    addressLocality: "Bengaluru",
    addressRegion: "Karnataka",
    postalCode: "560072",
    addressCountry: "IN",
  },
  geo: { "@type": "GeoCoordinates", latitude: 12.9773496, longitude: 77.5100812 },
  priceRange: "₹500 – ₹34,999",
};

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* The hero runs its own entrance; everything after it reveals on scroll. */}
        <Hero />
        <div className="reveal-landing">
          <div aria-hidden className="hidden" />
          <Spaces />
          <FloorTeaser />
          <HowItWorks />
          <Amenities />
          <Gallery />
          <Visit />
          <FinalCta />
        </div>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
