"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: userInsertError } = await supabase
        .from("users")
        .insert({
          id: data.user.id,
          name,
        });

      if (userInsertError) {
        setMessage(userInsertError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-md rounded-xl border p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold">Create FaceIt Account</h1>

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <button
          disabled={loading}
          className="w-full rounded-lg bg-black text-white p-3 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>

        {message && <p className="text-sm text-red-600">{message}</p>}
      </form>
    </main>
  );
}