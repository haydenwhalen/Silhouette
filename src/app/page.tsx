"use client";

import { ChatWindow } from "@/components/ChatWindow";

// The whole surface lives inside ChatWindow — the wordmark is rendered by
// each state component (Welcome, Thinking, Insight, Clarify) so the head
// of the page changes with the moment, rather than sitting as a static
// header above an otherwise-empty scroll area.
export default function Home() {
  return <ChatWindow />;
}
