"use client";

import { useEffect, useRef, useState } from "react";

type CameraCaptureProps = {
  onFramesCaptured: (frames: string[]) => void;
  maxFrames?: number;
};

export default function CameraCapture({
  onFramesCaptured,
  maxFrames = 3,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch {
        setError("Unable to access camera. Please allow camera permission.");
      }
    }

    startCamera();

    return () => {
      mediaStreamCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mediaStreamCleanup() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);

    const updatedFrames = [...frames, imageData];
    setFrames(updatedFrames);

    if (updatedFrames.length === maxFrames) {
      onFramesCaptured(updatedFrames);
    }
  }

  function resetFrames() {
    setFrames([]);
    onFramesCaptured([]);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full"
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={captureFrame}
          disabled={frames.length >= maxFrames}
          className="flex-1 rounded-lg bg-black p-3 text-white disabled:opacity-50"
        >
          Capture {frames.length + 1}/{maxFrames}
        </button>

        <button
          onClick={resetFrames}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-white transition"
          style={{
            background: "rgba(0,0,0,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          Reset
        </button>
      </div> {/* Fixed: Added missing closing div tag */}

      <div className="grid grid-cols-3 gap-3">
        {frames.map((frame, index) => (
          <img
            key={index}
            src={frame}
            alt={`Captured frame ${index + 1}`}
            className="rounded-lg border object-cover"
          />
        ))}
      </div>
    </div>
  );
}