"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    CalendarDays,
    Users,
    History,
    Target,
    User,
    ShieldCheck,
    Settings,
    Award,
    ChevronLeft,
    ChevronRight,
    X,
    Check,
} from "lucide-react";
import { appConfig } from "@/config/appConfig";

interface InteractiveGuideProps {
    otevreno: boolean;
    jeAdmin: boolean;
    onDokoncit: () => void;
}

interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const ikonaKroku = (klic: string) => {
    switch (klic) {
        case "calendar":
            return <CalendarDays size={22} className="text-indigo-600" />;
        case "users":
            return <Users size={22} className="text-sky-600" />;
        case "history":
            return <History size={22} className="text-purple-600" />;
        case "target":
            return <Target size={22} className="text-orange-500" />;
        case "user":
            return <User size={22} className="text-amber-500" />;
        case "award":
            return <Award size={22} className="text-amber-600" />;
        case "shield":
            return <ShieldCheck size={22} className="text-indigo-600" />;
        default:
            return <Settings size={22} className="text-slate-700" />;
    }
};

export default function InteractiveGuide({
    otevreno,
    jeAdmin,
    onDokoncit,
}: InteractiveGuideProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [krokIndex, setKrokIndex] = useState(0);
    const [rect, setRect] = useState<TargetRect | null>(null);
    const [oknoVyska, setOknoVyska] = useState(800);

    const kroky = jeAdmin
        ? [...appConfig.guideSteps.base, ...appConfig.guideSteps.adminExtra]
        : appConfig.guideSteps.base;

    const aktualni = kroky[krokIndex];
    const jePosledni = krokIndex === kroky.length - 1;

    useEffect(() => {
        if (otevreno) {
            setKrokIndex(0);
            setRect(null);
        }
    }, [otevreno]);

    const zmerPrvek = useCallback((selector: string) => {
        const el = document.querySelector(`[data-tour="${selector}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return null;
        return {
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
        };
    }, []);

    useEffect(() => {
        if (!otevreno || !aktualni) return;

        setOknoVyska(window.innerHeight);

        if (aktualni.route && pathname !== aktualni.route) {
            setRect(null);
            router.push(aktualni.route);
            return;
        }

        let zruseno = false;
        let pokusy = 0;
        let doscrollovano = false;

        const aktualizujPozici = () => {
            if (zruseno) return;
            setOknoVyska(window.innerHeight);
            const mereni = zmerPrvek(aktualni.target);
            if (mereni) {
                setRect(mereni);
            }
        };

        const najdiPrvek = () => {
            if (zruseno) return;
            const el = document.querySelector(
                `[data-tour="${aktualni.target}"]`,
            );
            if (el) {
                if (!doscrollovano) {
                    doscrollovano = true;
                    el.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                    setTimeout(aktualizujPozici, 350);
                }
                aktualizujPozici();
                return true;
            }
            return false;
        };

        const nalezenoHned = najdiPrvek();
        let intervalId: ReturnType<typeof setInterval> | null = null;

        if (!nalezenoHned) {
            setRect(null);
            intervalId = setInterval(() => {
                pokusy += 1;
                if (najdiPrvek() || pokusy >= 20) {
                    if (intervalId) clearInterval(intervalId);
                }
            }, 150);
        }

        window.addEventListener("scroll", aktualizujPozici, true);
        window.addEventListener("resize", aktualizujPozici);

        return () => {
            zruseno = true;
            if (intervalId) clearInterval(intervalId);
            window.removeEventListener("scroll", aktualizujPozici, true);
            window.removeEventListener("resize", aktualizujPozici);
        };
    }, [otevreno, aktualni, pathname, router, zmerPrvek]);

    if (!otevreno || !aktualni) return null;

    const jePrvekVeSpodniPolovine =
        rect !== null && rect.top + rect.height / 2 > oknoVyska * 0.52;

    const kartaPoziceTrida = rect
        ? jePrvekVeSpodniPolovine
            ? "fixed top-4 left-1/2 -translate-x-1/2"
            : "fixed bottom-4 left-1/2 -translate-x-1/2"
        : "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";

    return (
        <div className="fixed inset-0 z-[120] pointer-events-auto">
            {rect ? (
                <div
                    aria-hidden="true"
                    style={{
                        top: Math.max(4, rect.top - 6),
                        left: Math.max(4, rect.left - 6),
                        width: rect.width + 12,
                        height: rect.height + 12,
                        boxShadow:
                            "0 0 0 9999px rgba(15, 23, 42, 0.62), 0 0 28px rgba(239, 68, 68, 0.55)",
                    }}
                    className="fixed rounded-3xl border-[3px] border-red-500 pointer-events-none transition-all duration-300 z-[121]"
                />
            ) : (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[121]" />
            )}

            <div
                className={`${kartaPoziceTrida} w-[calc(100%-2rem)] max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 z-[122] animate-in fade-in zoom-in-95 duration-200`}
            >
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                            {ikonaKroku(aktualni.icon)}
                        </div>
                        <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">
                                Krok {krokIndex + 1} / {kroky.length}
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mt-1">
                                {aktualni.title}
                            </h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onDokoncit}
                        title="Přeskočit průvodce"
                        className="text-slate-400 hover:text-slate-800 bg-slate-100 p-2 rounded-full transition-colors shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                    {aktualni.description}
                </p>

                <div className="flex items-center justify-center gap-1.5 my-4">
                    {kroky.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setKrokIndex(i)}
                            className={`h-2 rounded-full transition-all ${
                                i === krokIndex
                                    ? "w-6 bg-red-500"
                                    : "w-2 bg-slate-200 hover:bg-slate-300"
                            }`}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between gap-2.5">
                    {krokIndex > 0 ? (
                        <button
                            type="button"
                            onClick={() => setKrokIndex((i) => i - 1)}
                            className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors flex items-center gap-1"
                        >
                            <ChevronLeft size={17} /> Zpět
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onDokoncit}
                            className="px-3 py-2.5 rounded-2xl text-slate-400 hover:text-slate-600 font-semibold text-sm transition-colors"
                        >
                            Přeskočit
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            jePosledni
                                ? onDokoncit()
                                : setKrokIndex((i) => i + 1)
                        }
                        className="flex-1 py-2.5 px-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center justify-center gap-1.5"
                    >
                        {jePosledni ? (
                            <>
                                <Check size={17} /> Hotovo
                            </>
                        ) : (
                            <>
                                Další <ChevronRight size={17} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
