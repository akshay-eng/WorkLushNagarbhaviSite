# Worklush Spaces

The new worklushspaces.com: a marketing site and a seat-level booking app for the
Worklush coworking floor in Nagarbhavi, Bengaluru. It replaces the WordPress
(Kadence + WPBookit) site.

- **Home** (`/`): spaces and prices, a live floor plan, amenities, gallery, map.
- **Book** (`/book`): pick an exact desk, cabin or room on the real floor plan, see
  its photos, step inside it in 3D, then register → sign in → check out with a
  government ID and Razorpay.
- **My bookings** (`/account`).

## Run it

```bash
npm install
cp .env.example .env.local   # optional in development
npm run dev                  # http://localhost:3000
```

With no Razorpay keys the checkout runs in **demo mode**: the payment sheet says
so, and no money moves. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to take
real payments; nothing else changes.

```bash
npm run build && npm start   # production; needs SESSION_SECRET
```

## Where things live

| What | File |
|---|---|
| Address, phone, amenities, gallery | `src/data/site.ts` |
| Floor geometry, desks, rooms, prices, 3D viewpoints | `src/data/floor.ts` |
| Pricing and GST | `src/lib/booking/pricing.ts` |
| Availability rules and opening hours | `src/lib/booking/availability.ts`, `src/lib/booking/dates.ts` |
| Government ID rules (Aadhaar checksum, masking) | `src/lib/booking/id-proof.ts` |
| 2D floor plan (SVG) | `src/components/booking/floor-plan-2d.tsx` |
| 3D walkthrough (three.js / R3F) | `src/components/booking/floor-3d/` |
| Booking page, space dialog, checkout | `src/components/booking/booking-app.tsx`, `space-dialog.tsx`, `checkout-view.tsx` |
| API: auth, availability, bookings, payment confirm | `src/app/api/` |
| Storage (JSON file + private uploads) | `src/lib/server/store.ts` |

The floor is traced from the fire evacuation diagram on site: 22 open desks in
clusters of 6, 8 and 8, two boss cabins, team cabins for 4, 5, 6, 6 and 7, the
conference room (10) and the podcast studio, plus the lobby, lounge, café,
window bar, reception and washrooms. The 2D plan, the 3D model and the walk
paths all render from `floor.ts`: walls, doors, every table and chair. Move a
chair there and it moves everywhere. Each space lists its real photos.

Cabins book by the hour (as meeting rooms, at the current site's rates) or by
the month. Monthly prices exist for the 3- and 6-seaters (from the offer cards);
the 4-, 5- and 7-seaters say "on request" and link to WhatsApp.

Typography is one family (DM Sans) on one scale: the `type-*` utilities at the
end of `src/app/globals.css`. Use those rather than one-off sizes.

## Before going live

1. **Confirm the prices.** They come from what the current booking page charges,
   which disagrees with the service pages in places (conference ₹1,500 vs ₹1,234,
   three-seater ₹450 vs ₹350, open desk day pass vs "per hour"). Full day =
   9 × hourly, the rule their conference and three-seater packages already follow.
   The current site's podcast 4-hour and full-day packages are both priced at the
   2-hour rate. Here they're ₹7,600 and ₹17,100. Cabin prices come from the cabin
   offer cards.
2. **Remove the base load.** Until real bookings flow, `baseHolds()` in
   `availability.ts` books a deterministic share of seats per day and lets
   Cabin 7 to a "member team", so the floor looks lived-in and the server
   enforces the same seats. Make it return `[]`.
3. **Move storage to a database.** `store.ts` is a single-process JSON file. For
   more than one server, put Postgres behind the same functions.
4. **ID data.** The full Aadhaar number is validated and never stored; only the
   masked form (`XXXX XXXX 1234`) and a salted hash are kept. Uploaded ID images
   sit in `DATA_DIR/uploads/<booking>/` with owner-only permissions. Under the
   Aadhaar Act and the DPDP Act, keep a retention policy and a deletion path; for
   stronger verification, DigiLocker or offline Aadhaar e-KYC can replace uploads.
5. **Set** `SESSION_SECRET` and the Razorpay keys, and point the Razorpay webhook
   at a confirm handler if you want payment capture without the browser.

## Stack

Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Motion,
three.js with React Three Fiber and drei, Fluid Functionalism components
(springs, fluid hover, reveal, calendar, field), zod. Photos and logos come from
the current site's media library.
