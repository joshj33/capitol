import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Capitol — Fantasy Politics",
  description:
    "Draft Congress. Score the news. A politically neutral fantasy game built on measurable, sourced events.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SiteNav />
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-4 py-10 text-xs text-gov-400">
          Capitol is a politically neutral game. Points come from measurable,
          third-party-sourced events — never ideological positions. See the{" "}
          <a className="underline hover:text-gov-100" href="/methodology">
            scoring methodology
          </a>
          .
        </footer>
      </body>
    </html>
  );
}
