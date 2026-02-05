import type { Metadata } from "next";
import "./globals.css";
import { UserProfileProvider } from "@/lib/context";
import { AuthProvider } from "@/lib/AuthContext";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "命理 - 八字排盘",
  description: "现代简约中式风格的八字排盘应用，支持真太阳时校正、格局分析、十神推演",
  keywords: ["八字", "排盘", "命理", "四柱", "算命"],
  authors: [{ name: "Xiangyu" }],
  creator: "Xiangyu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AuthProvider>
          <UserProfileProvider>
            {children}
            <Footer />
          </UserProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
