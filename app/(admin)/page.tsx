"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace('/dashboard');
  }, [router]);

  return null;
}