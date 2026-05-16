"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import CameraCapture from "@/components/CameraCaptureTemp";

export default function EnrollPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setEmail(data.session.user.email ?? null);
      setLoading(false);
    }

    checkSession();
  }, [router]);

  async function handleSubmitEnrollment() {
    setMessage("");

    if (frames.length !== 3) {
      setMessage("Please capture exactly 3 frames before submitting.");
      return;
    }

    setSubmitting(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessage("Session expired. Please login again.");
      setSubmitting(false);
      router.push("/login");
      return;
    }

    try {
      const response = await api.post(
        "/enroll",
        {
          frames,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setMessage("Enrollment completed successfully. Your face embedding has been saved.");
      } else {
        setMessage("Enrollment failed. Please try again.");
}
    } catch (error: any) {
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return <main className="p-8">Checking session...</main>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-xl border p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Face Enrollment</h1>
          <p className="text-sm text-gray-600">
            Logged in as: {email}
          </p>
        </div>

        <CameraCapture onFramesCaptured={setFrames} maxFrames={3} />

        {frames.length === 3 && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700">
            3 frames captured successfully.
          </div>
        )}

        <button
          onClick={handleSubmitEnrollment}
          disabled={frames.length !== 3 || submitting}
          className="w-full rounded-lg bg-black text-white p-3 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Enrollment"}
        </button>

        <button
          onClick={handleLogout}
          className="w-full rounded-lg border p-3"
        >
          Logout
        </button>

        {message && (
          <pre className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </pre>
        )}
      </div>
    </main>
  );
}