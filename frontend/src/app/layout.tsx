import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ResumeProvider } from "@/context/ResumeContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerCopilot AI",
  description: "Your AI-Powered Career Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0A0915] text-[#EDEDED] font-sans">
        <AuthProvider>
          <ResumeProvider>
            {children}
          </ResumeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

