// Copyright 2026 Kushan J
// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "GeoStream | Near Real-Time Satellite Video from Multi-Layered WMS Data",
  description: "A geospatial engine that concurrently fetches N WMS layers from NASA GIBS, composites them using OpenCV, and delivers near real-time MJPEG video streams or batch H.264 exports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
