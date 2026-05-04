// Copyright 2026 Kushan J
// SPDX-License-Identifier: Apache-2.0

"use client";

import { AuthProvider } from "@/lib/auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
