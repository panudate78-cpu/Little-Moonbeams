import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="mb-8 text-center">
        <p className="text-4xl">☾</p>
        <h1 className="section-title mt-3">Welcome back</h1>
        <p className="mt-2 text-sm text-inksoft">Sign in to view your orders and sparkle on.</p>
      </div>
      <LoginForm />
    </div>
  );
}
