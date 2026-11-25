"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { appConfig } from "@/config/appConfig";
import WhatsNewModal from "./WhatsNewModal";
import InteractiveGuide from "./InteractiveGuide";

export default function OnboardingManager() {
    const pathname = usePathname();
    const [novinkyOtevreny, setNovinkyOtevreny] = useState(false);
    const [pruvodceOtevren, setPruvodceOtevren] = useState(false);
    const [jeAdmin, setJeAdmin] = useState(false);

    useEffect(() => {
        if (pathname === "/login") return;

        const nactiRoliZCache = () => {
            try {
                const ulozeny = localStorage.getItem("ministrant_profil");
                if (ulozeny) {
                    const parsed = JSON.parse(ulozeny);
                    setJeAdmin(parsed?.role === "admin");
                }
            } catch {
                setJeAdmin(false);
            }
        };

        nactiRoliZCache();

        const seenVersion = localStorage.getItem("seen_version");
        const guideDone = localStorage.getItem("guide_completed");

        if (seenVersion !== appConfig.appVersion) {
            setNovinkyOtevreny(true);
        } else if (guideDone !== "true") {
            setPruvodceOtevren(true);
        }

        const spustitRucne = () => {
            nactiRoliZCache();
            setPruvodceOtevren(true);
        };

        window.addEventListener("spustit-pruvodce", spustitRucne);
        return () =>
            window.removeEventListener("spustit-pruvodce", spustitRucne);
    }, [pathname]);

    const zavritNovinky = () => {
        localStorage.setItem("seen_version", appConfig.appVersion);
        setNovinkyOtevreny(false);
        if (localStorage.getItem("guide_completed") !== "true") {
            setPruvodceOtevren(true);
        }
    };

    const dokoncitPruvodce = () => {
        localStorage.setItem("guide_completed", "true");
        setPruvodceOtevren(false);
    };

    if (pathname === "/login") return null;

    return (
        <>
            <WhatsNewModal
                otevreno={novinkyOtevreny}
                onZavrit={zavritNovinky}
            />
            <InteractiveGuide
                otevreno={pruvodceOtevren}
                jeAdmin={jeAdmin}
                onDokoncit={dokoncitPruvodce}
            />
        </>
    );
}
