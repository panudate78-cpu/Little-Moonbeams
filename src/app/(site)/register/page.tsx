import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="mb-8 text-center">
        <p className="text-4xl">✦</p>
        <h1 className="section-title mt-3">Join Little Moonbeam&apos;s</h1>
        <p className="mt-2 text-sm text-inksoft">
          Create an account to track orders and save your details.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
