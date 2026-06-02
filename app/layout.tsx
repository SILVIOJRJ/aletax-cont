import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ALETAX CONT",
    template: "%s | ALETAX CONT",
  },
  description: "Sistema de gestão para escritório contábil ALETAX CONT",
  keywords: ["contabilidade", "gestão", "fiscal", "aletax"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1E0A3C",
              color: "#fff",
              borderRadius: "8px",
              fontSize: "14px",
            },
            success: {
              iconTheme: {
                primary: "#8B3FD4",
                secondary: "#fff",
              },
            },
            error: {
              style: {
                background: "#991b1b",
                color: "#fff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
