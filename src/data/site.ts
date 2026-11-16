// Business facts carried over from the current WordPress site
// (worklushspaces.com, crawled 16 Nov 2026). Edit here, not in components.

export const site = {
  name: "Worklush Spaces",
  tagline: "Coworking in Nagarbhavi, Bengaluru",
  description:
    "Worklush Spaces is a coworking space on 80 Feet Ring Road, Nagarbhavi. Book one of 22 open desks, a boss or team cabin, the conference room or the podcast studio, and pick your exact seat on a live floor plan.",
  url: "https://worklushspaces.com",
  phone: "+91 98057 05057",
  phoneHref: "tel:+919805705057",
  whatsappHref: "https://wa.me/919805705057",
  email: "contact@worklushspaces.com",
  address: {
    line1: "#220, 3rd Floor, 6th Block, 80 Feet Ring Road",
    line2: "BDA Layout, Nagarbhavi 2nd Stage",
    city: "Bengaluru, Karnataka 560072",
  },
  mapEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.9140403002534!2d77.5100812!3d12.977349599999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae3d5d7371ae73%3A0x41468a319e208fe0!2sWorklush%20Spaces%20-%20A%20Co-Working%20Space%20like%20no%20other!5e0!3m2!1sen!2sin!4v1753698769082!5m2!1sen!2sin",
  mapLink: "https://maps.google.com/?q=Worklush+Spaces+Nagarbhavi+Bengaluru",
  social: {
    instagram: "https://www.instagram.com/worklush.spaces/",
    facebook: "https://www.facebook.com/worklushspaces",
  },
  legal: {
    terms: "https://worklushspaces.com/terms-and-conditions/",
    privacy: "https://worklushspaces.com/privacy-policy/",
    refunds: "https://worklushspaces.com/cancellation-refund-policy/",
  },
  hours: "Front desk 9 am – 9 pm · Members 24/7",
} as const;

export const amenities = [
  { icon: "wifi", title: "High-speed internet", body: "Fibre with backup, on every desk and in every room." },
  { icon: "zap", title: "Power & A/C included", body: "No meter running. Electricity and cooling are in the price." },
  { icon: "coffee", title: "Unlimited coffee & tea", body: "The café pours all day. Bring your own mug or use ours." },
  { icon: "printer", title: "Printing & stationery", body: "Print, scan and grab supplies at the front desk." },
  { icon: "scan-face", title: "RFID & Face ID entry", body: "Members walk in whenever they need to, day or night." },
  { icon: "shield-check", title: "24/7 security & CCTV", body: "Monitored entry, cameras and a staffed front desk." },
  { icon: "library", title: "Library & lockers", body: "Quiet shelves to read in and storage for your kit." },
  { icon: "sparkles", title: "Daily housekeeping", body: "Desks, rooms and washrooms cleaned every day." },
  { icon: "gamepad-2", title: "Foosball & board games", body: "A lounge with chess and foosball for the breaks." },
  { icon: "bike", title: "Two-wheeler parking", body: "Covered parking right at the building." },
  { icon: "arrow-up-down", title: "Elevator access", body: "Third floor, lift from the lobby." },
  { icon: "lock-open", title: "No lock-in", body: "Day passes, hourly rooms and month-to-month cabins." },
] as const;

export const gallery = [
  { src: "/images/rooms-11.jpg", alt: "Reception desk in front of the moss wall with the Worklush W", caption: "Reception" },
  { src: "/images/day-room.jpg", alt: "Open floor with bookshelves and a living green wall", caption: "The open floor" },
  { src: "/images/rooms-3.jpg", alt: "Window bar stools along the glass, overlooking Nagarbhavi", caption: "Window bar" },
  { src: "/images/conference.jpg", alt: "Conference room with a moss wall, long table and screen", caption: "Conference room" },
  { src: "/images/podcast.jpg", alt: "Podcast studio with the On Air neon sign, two chairs and a camera", caption: "Podcast studio" },
  { src: "/images/open-booking.jpg", alt: "Open desks with black mesh chairs", caption: "Open desks" },
  { src: "/images/living-room.jpg", alt: "Lounge with a sofa, chess table and blue poufs", caption: "Lounge" },
  { src: "/images/cafeteria.jpg", alt: "Café counter with the maybe coffee neon sign", caption: "Café" },
  { src: "/images/cabin.jpg", alt: "Team cabin with teal panel walls and desks", caption: "Team cabin" },
  { src: "/images/building.jpg", alt: "The Worklush building on 80 Feet Ring Road", caption: "The building" },
] as const;
