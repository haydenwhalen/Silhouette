"use client";

import { ChatWindow } from "@/components/ChatWindow";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>Silhouette</h1>
      <p style={{ fontSize: "0.875rem", color: "#888", marginBottom: "2rem" }}>
        A guided reset for when you feel stuck.
      </p>
      <ChatWindow />
    </main>
  );
}
