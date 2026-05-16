"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

export default function AuthTestPage() {
  const [result, setResult] = useState("");

  async function testBackendAuth() {
    setResult("Testing...");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setResult("No active session. Please login first.");
      return;
    }

    try {
      const response = await api.get("/auth-test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setResult(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      setResult(error.response?.data?.detail || error.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border p-6 space-y-4">
        <h1 className="text-2xl font-bold">Backend Auth Test</h1>

        <button
          onClick={testBackendAuth}
          className="w-full rounded-lg bg-black text-white p-3"
        >
          Test Backend Auth
        </button>

        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
          {result}
        </pre>
      </div>
    </main>
  );
}