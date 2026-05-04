// Copyright 2026 Kushan J
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-zinc-500 animate-pulse">Loading...</div>
    </main>
  );
}
