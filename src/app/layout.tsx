import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Silhouette",
  description: "A guided micro-reset for when you feel stuck",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f0f0f", color: "#e8e8e8" }}>
        {children}
      </body>
    </html>
  );
}
