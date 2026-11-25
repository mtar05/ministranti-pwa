import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";
import Navigation from "@/components/Navigation";
import OnboardingManager from "@/components/OnboardingManager";
import { appConfig } from "@/config/appConfig";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
    themeColor: "#ffffff",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export const metadata: Metadata = {
    title: appConfig.appName,
    description: appConfig.appDescription,
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: appConfig.appShortName,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="cs">
            <body
                className={`${inter.className} bg-slate-50 text-slate-900 pb-24 md:pb-8 antialiased`}
            >
                <InstallPrompt />
                <OnboardingManager />
                <Navigation />
                <main className="max-w-3xl mx-auto p-4 sm:p-6 mt-4 print:p-0 print:mt-0 print:max-w-none">
                    {children}
                </main>
            </body>
        </html>
    );
}
