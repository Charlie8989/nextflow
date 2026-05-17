import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const themeScript = `
(() => {
  const key = "nextflow.theme";

  const getStoredTheme = () => {
    try {
      const stored = window.localStorage && window.localStorage.getItem(key);
      return stored === "light" || stored === "dark" ? stored : null;
    } catch {
      return null;
    }
  };

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  };

  const initialTheme = getStoredTheme() || "dark";

  applyTheme(initialTheme);

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-theme-toggle]");
    if (!toggle) return;

    const nextTheme =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";

    applyTheme(nextTheme);

    try {
      window.localStorage && window.localStorage.setItem(key, nextTheme);
    } catch {}
  });
})();
`;

export const metadata: Metadata = {
  title: "NextFlow-Krea Nodes Clone",
  description: "Make Easy Workflows",
  icons: "/images/favicon.png",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
