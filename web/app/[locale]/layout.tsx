import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import "../globals.css";
import { UserProfileProvider } from "@/lib/context";
import { AuthProvider } from "@/lib/AuthContext";
import { UserStatusProvider } from "@/lib/UserStatusContext";
import Footer from "@/components/Footer";

// Metadata needs to be static or generated with generateMetadata
// Since layout is async, we can keep static for now or move to dedicated metadata file
export const metadata: Metadata = {
    title: "命理 - 八字排盘",
    description: "现代简约中式风格的八字排盘应用，支持真太阳时校正、格局分析、十神推演",
    keywords: ["八字", "排盘", "命理", "四柱", "算命"],
    authors: [{ name: "Xiangyu" }],
    creator: "Xiangyu",
};

export default async function LocaleLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const messages = await getMessages();

    return (
        <html lang={locale}>
            <body className="antialiased">
                <NextIntlClientProvider messages={messages}>
                    <AuthProvider>
                        <UserStatusProvider>
                            <UserProfileProvider>
                                {children}
                                <Footer />
                            </UserProfileProvider>
                        </UserStatusProvider>
                    </AuthProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
