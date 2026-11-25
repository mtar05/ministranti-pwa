"use client";

import { useState, useEffect } from "react";
import { Share, PlusSquare, X, Download, MoreHorizontal } from "lucide-react";
import { appConfig } from "@/config/appConfig";

export default function InstallPrompt() {
    const [namontovano, setNamontovano] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
    const [zavreno, setZavreno] = useState(false);
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);

    useEffect(() => {
        setNamontovano(true);

        if (sessionStorage.getItem("install_prompt_dismissed") === "1") {
            setZavreno(true);
            return;
        }

        const standaloneMatch =
            window.matchMedia("(display-mode: standalone)").matches ||
            ("standalone" in window.navigator &&
                (window.navigator as any).standalone === true);

        setIsStandalone(standaloneMatch);
        if (standaloneMatch) return;

        const ua = window.navigator.userAgent.toLowerCase();

        const appleDevice =
            /iphone|ipad|ipod/.test(ua) ||
            (window.navigator.platform === "MacIntel" &&
                window.navigator.maxTouchPoints > 1);
        setIsIOS(appleDevice);

        const inApp = /fbav|fban|instagram|messenger|line|wv/.test(ua);
        setIsInAppBrowser(inApp);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowAndroidPrompt(true);
        };

        window.addEventListener(
            "beforeinstallprompt",
            handleBeforeInstallPrompt,
        );

        return () =>
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt,
            );
    }, []);

    const zavrit = () => {
        sessionStorage.setItem("install_prompt_dismissed", "1");
        setZavreno(true);
    };

    const instalovatAndroid = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setShowAndroidPrompt(false);
        }
        setDeferredPrompt(null);
    };

    if (!namontovano || isStandalone || zavreno) return null;

    if (isInAppBrowser && isIOS) {
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white p-4 rounded-3xl shadow-2xl z-[100] w-[92%] max-w-md animate-in slide-in-from-top-10 duration-500">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-sm">
                            Otevři aplikaci v Safari
                        </h3>
                        <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
                            V tomto okně nelze aplikaci nainstalovat. Klikni v
                            rohu na menu{" "}
                            <MoreHorizontal className="inline w-4 h-4 mx-0.5" />{" "}
                            a zvol <strong>Otevřít v prohlížeči Safari</strong>.
                        </p>
                    </div>
                    <button
                        onClick={zavrit}
                        className="text-indigo-200 hover:text-white p-1"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        );
    }

    if (isIOS) {
        return (
            <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-white border border-slate-200 p-5 rounded-3xl shadow-2xl z-[100] w-[92%] max-w-md animate-in slide-in-from-bottom-10 duration-500">
                <div className="flex justify-between items-start gap-3 mb-2">
                    <h3 className="font-bold text-slate-900 text-base">
                        Instalace aplikace na iPhone
                    </h3>
                    <button
                        onClick={zavrit}
                        className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-full"
                    >
                        <X size={16} />
                    </button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                    Pro rychlý přístup a fungování upozornění si přidej aplikaci
                    na plochu:
                </p>
                <ol className="text-xs text-slate-700 space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <li className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center shrink-0">
                            1
                        </span>
                        <span>
                            Klepni v liště prohlížeče na tlačítko{" "}
                            <strong>Sdílet</strong>{" "}
                            <Share className="inline w-4 h-4 text-indigo-600 mx-0.5" />{" "}
                            (případně nejprve na{" "}
                            <MoreHorizontal className="inline w-4 h-4 text-slate-600 mx-0.5" />{" "}
                            vpravo dole).
                        </span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center shrink-0">
                            2
                        </span>
                        <span>
                            V nabídce sjeď níže a vyber{" "}
                            <strong>Přidat na plochu</strong>{" "}
                            <PlusSquare className="inline w-4 h-4 text-slate-700 mx-0.5" />
                            .
                        </span>
                    </li>
                </ol>
            </div>
        );
    }

    if (showAndroidPrompt) {
        return (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-5 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-4 w-[90%] max-w-sm animate-in slide-in-from-top-10 duration-500">
                <div className="bg-white/20 p-2 rounded-xl">
                    <Download size={24} />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-sm">
                        Nainstalovat {appConfig.appName}
                    </p>
                    <p className="text-xs text-indigo-200 mt-0.5">
                        Pro rychlý přístup a upozornění
                    </p>
                </div>
                <button
                    onClick={instalovatAndroid}
                    className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:scale-105 transition-transform"
                >
                    Přidat
                </button>
                <button
                    onClick={zavrit}
                    className="text-indigo-200 hover:text-white p-1"
                >
                    <X size={18} />
                </button>
            </div>
        );
    }

    return null;
}
