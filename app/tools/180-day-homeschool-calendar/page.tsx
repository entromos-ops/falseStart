import type { Metadata } from "next";
import CalendarPlanner from "./CalendarPlanner";

export const metadata: Metadata = {
  title: "Free 180-Day Homeschool Calendar Calculator | Yearkeep",
  description:
    "Choose your school weekdays, add vacation breaks, and instantly calculate the projected finish date for a 180-day homeschool year. Free and print-ready.",
  alternates: {
    canonical: "/tools/180-day-homeschool-calendar"
  },
  openGraph: {
    title: "Free 180-Day Homeschool Calendar Calculator",
    description:
      "Plan 180 learning days around your real week and family breaks, then print the finished calendar.",
    type: "website",
    url: "/tools/180-day-homeschool-calendar",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Yearkeep homeschool record planner" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Free 180-Day Homeschool Calendar Calculator",
    description:
      "Choose your school days and breaks. Get your projected finish date instantly.",
    images: ["/og.png"]
  }
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "180-Day Homeschool Calendar Calculator",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  description:
    "A free browser-based calculator for planning 180 homeschool learning days around selected weekdays and family breaks.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD"
  }
};

export default function HomeschoolCalendarToolPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CalendarPlanner />
    </>
  );
}
