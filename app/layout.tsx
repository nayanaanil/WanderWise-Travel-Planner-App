import type { Metadata } from "next";
import "./globals.css";
import { TripStateGuard } from "@/components/TripStateGuard";
import { ProcessingProvider } from "@/lib/ProcessingContext";

export const metadata: Metadata = {
  title: "Travel Planner - WanderWise",
  description: "Plan your perfect trip with AI-powered itinerary generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ProcessingProvider>
          <TripStateGuard>
            {children}
          </TripStateGuard>
        </ProcessingProvider>
      </body>
    </html>
  );
}

