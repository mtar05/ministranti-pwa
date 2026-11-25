"use client";

import { useState, useEffect } from "react";
import { appConfig } from "@/config/appConfig";

interface AvatarProps {
    jmeno: string;
    avatarUrl?: string | null;
    uroven?: number;
    size?: "sm" | "md" | "lg";
    barvaPozadi?: "indigo" | "emerald" | "amber" | "slate";
}

export default function Avatar({
    jmeno,
    avatarUrl,
    uroven = 1,
    size = "sm",
    barvaPozadi = "indigo",
}: AvatarProps) {
    const [chybaObrazku, setChybaObrazku] = useState(false);
    const [chybaRamecku, setChybaRamecku] = useState(false);

    useEffect(() => {
        setChybaObrazku(false);
    }, [avatarUrl]);

    useEffect(() => {
        setChybaRamecku(false);
    }, [uroven]);

    const hodnost =
        appConfig.ranks.find((r) => r.uroven === uroven) || appConfig.ranks[0];
    const ramecekUrl = hodnost?.ramecek;
    const jeVelmistr = uroven >= 7;

    const velikosti = {
        sm: "w-8 h-8 text-xs",
        md: "w-12 h-12 text-base",
        lg: "w-24 h-24 text-3xl",
    };

    const odsazeni = {
        sm: "m-1.5",
        md: "m-2.5",
        lg: "m-5",
    };

    const presahRamecku = {
        sm: "-inset-[28%] w-[156%] h-[156%]",
        md: "-inset-[27%] w-[154%] h-[154%]",
        lg: "-inset-[27%] w-[154%] h-[154%]",
    };

    const auraBlur = {
        sm: "blur-[3px]",
        md: "blur-[5px]",
        lg: "blur-md",
    };

    const pozadiTridy = {
        indigo: "bg-indigo-100 text-indigo-600",
        emerald: "bg-emerald-100 text-emerald-600",
        amber: "bg-amber-100 text-amber-700",
        slate: "bg-slate-200 text-slate-700",
    };

    const zobrazitFoto = Boolean(avatarUrl && !chybaObrazku);
    const zobrazitRamecek = Boolean(ramecekUrl && !chybaRamecku);

    return (
        <div
            className={`relative inline-flex items-center justify-center shrink-0 ${odsazeni[size]}`}
        >
            {jeVelmistr && (
                <div
                    aria-hidden="true"
                    className={`absolute -inset-[24%] rounded-full pointer-events-none z-0 animate-avatar-legend-aura ${auraBlur[size]}`}
                    style={{
                        background:
                            "radial-gradient(circle, rgba(250,204,21,0.75) 35%, rgba(245,158,11,0.4) 65%, transparent 80%)",
                    }}
                />
            )}

            <div
                className={`${velikosti[size]} ${pozadiTridy[barvaPozadi]} rounded-full overflow-hidden flex items-center justify-center font-black select-none relative z-10 ${
                    !zobrazitRamecek ? "ring-2 ring-slate-200" : ""
                }`}
            >
                {zobrazitFoto ? (
                    <img
                        src={avatarUrl!}
                        alt={jmeno}
                        onError={() => setChybaObrazku(true)}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span>{jmeno?.charAt(0)?.toUpperCase() || "?"}</span>
                )}
            </div>

            {zobrazitRamecek && (
                <div
                    aria-hidden="true"
                    className={`absolute ${presahRamecku[size]} pointer-events-none select-none z-20`}
                >
                    <img
                        src={ramecekUrl}
                        alt=""
                        onError={() => setChybaRamecku(true)}
                        className={`w-full h-full object-contain ${
                            jeVelmistr
                                ? "drop-shadow-[0_2px_8px_rgba(217,119,6,0.55)]"
                                : "drop-shadow-xs"
                        }`}
                    />

                    {jeVelmistr && (
                        <div
                            className="absolute inset-0 overflow-hidden"
                            style={{
                                WebkitMaskImage: `url(${ramecekUrl})`,
                                maskImage: `url(${ramecekUrl})`,
                                WebkitMaskSize: "contain",
                                maskSize: "contain",
                                WebkitMaskRepeat: "no-repeat",
                                maskRepeat: "no-repeat",
                                WebkitMaskPosition: "center",
                                maskPosition: "center",
                            }}
                        >
                            <div
                                className="w-[55%] h-[160%] -top-[30%] absolute animate-avatar-shimmer"
                                style={{
                                    background:
                                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)",
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
