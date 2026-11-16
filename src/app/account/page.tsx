import type { Metadata } from "next";
import { AccountView } from "@/components/account/account-view";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

export const metadata: Metadata = {
  title: "My bookings",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <>
      <SiteHeader variant="solid" />
      <main className="flex-1 bg-background">
        <AccountView />
      </main>
      <SiteFooter />
    </>
  );
}
