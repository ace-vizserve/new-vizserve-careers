import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Toaster } from "sileo";
import "./globals.css";

// Load Roboto font
const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://carees.vizserve.com"), // change if different domain

  title: "VizServe | Virtual Assistant & Remote Talent Solutions",
  description:
    "VizServe helps businesses scale with skilled Virtual Assistants and remote professionals. Reliable support for admin, operations, customer service, and more.",

  keywords: [
    "VizServe",
    "virtual assistant services",
    "remote staff outsourcing",
    "business support services",
    "virtual assistants Philippines",
    "outsourcing solutions APAC",
    "remote team support",
    "admin support services",
  ],

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: "/assets/logo.png", // update if needed
    shortcut: "/assets/logo.png",
    apple: "/assets/logo.png",
  },

  openGraph: {
    title: "VizServe | Virtual Assistant & Remote Talent Solutions",
    description:
      "Scale your business with VizServe’s reliable Virtual Assistants and remote professionals. Flexible, efficient, and built for growing teams.",
    url: "/",
    siteName: "VizServe",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/og-image.jpg", // replace with your actual image
        width: 1200,
        height: 630,
        alt: "VizServe Virtual Assistant Services",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "VizServe | Virtual Assistant & Remote Talent Solutions",
    description:
      "Hire skilled Virtual Assistants from VizServe and streamline your business operations today.",
    images: ["/assets/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} antialiased`}
        style={{ fontFamily: "var(--font-roboto)" }}
      >
        <Toaster position="top-right" theme="light" />
        {children}
      </body>
    </html>
  );
}