"use client";

import { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ZoomOut, Move, Check } from "lucide-react";

interface AvatarCropModalProps {
    soubor: File | null;
    ukladaSe: boolean;
    onZrusit: () => void;
    onPotvrdit: (blob: Blob) => void;
}

const VELIKOST_NAHLEDU = 224;
const VELIKOST_VYSTUPU = 256;

export default function AvatarCropModal({
    soubor,
    ukladaSe,
    onZrusit,
    onPotvrdit,
}: AvatarCropModalProps) {
    const [obrazekUrl, setObrazekUrl] = useState<string | null>(null);
    const [rozmery, setRozmery] = useState<{ w: number; h: number } | null>(
        null,
    );
    const [zoom, setZoom] = useState(1);
    const [posun, setPosun] = useState({ x: 0, y: 0 });
    const [tahaSe, setTahaSe] = useState(false);

    const imgRef = useRef<HTMLImageElement | null>(null);
    const startTah = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

    useEffect(() => {
        if (!soubor) {
            setObrazekUrl(null);
            setRozmery(null);
            return;
        }
        const url = URL.createObjectURL(soubor);
        setObrazekUrl(url);
        setZoom(1);
        setPosun({ x: 0, y: 0 });

        return () => URL.revokeObjectURL(url);
    }, [soubor]);

    if (!soubor || !obrazekUrl) return null;

    const zakladniMeritko = rozmery
        ? Math.max(VELIKOST_NAHLEDU / rozmery.w, VELIKOST_NAHLEDU / rozmery.h)
        : 1;
    const dispW = rozmery
        ? rozmery.w * zakladniMeritko * zoom
        : VELIKOST_NAHLEDU;
    const dispH = rozmery
        ? rozmery.h * zakladniMeritko * zoom
        : VELIKOST_NAHLEDU;

    const omezPosun = (x: number, y: number, aktualniZoom: number) => {
        if (!rozmery) return { x: 0, y: 0 };
        const w = rozmery.w * zakladniMeritko * aktualniZoom;
        const h = rozmery.h * zakladniMeritko * aktualniZoom;
        const maxX = Math.max(0, (w - VELIKOST_NAHLEDU) / 2);
        const maxY = Math.max(0, (h - VELIKOST_NAHLEDU) / 2);
        return {
            x: Math.max(-maxX, Math.min(maxX, x)),
            y: Math.max(-maxY, Math.min(maxY, y)),
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setTahaSe(true);
        startTah.current = {
            x: e.clientX,
            y: e.clientY,
            origX: posun.x,
            origY: posun.y,
        };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!tahaSe) return;
        const dx = e.clientX - startTah.current.x;
        const dy = e.clientY - startTah.current.y;
        setPosun(
            omezPosun(
                startTah.current.origX + dx,
                startTah.current.origY + dy,
                zoom,
            ),
        );
    };

    const handlePointerUp = () => {
        setTahaSe(false);
    };

    const zmenZoom = (novyZoom: number) => {
        setZoom(novyZoom);
        setPosun((prev) => omezPosun(prev.x, prev.y, novyZoom));
    };

    const ulozitVyrez = () => {
        const img = imgRef.current;
        if (!img || !rozmery) return;

        const canvas = document.createElement("canvas");
        canvas.width = VELIKOST_VYSTUPU;
        canvas.height = VELIKOST_VYSTUPU;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imgLeft = (VELIKOST_NAHLEDU - dispW) / 2 + posun.x;
        const imgTop = (VELIKOST_NAHLEDU - dispH) / 2 + posun.y;
        const pomer = VELIKOST_VYSTUPU / VELIKOST_NAHLEDU;

        ctx.drawImage(
            img,
            imgLeft * pomer,
            imgTop * pomer,
            dispW * pomer,
            dispH * pomer,
        );

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    onPotvrdit(blob);
                } else {
                    canvas.toBlob(
                        (fallback) => {
                            if (fallback) onPotvrdit(fallback);
                        },
                        "image/jpeg",
                        0.82,
                    );
                }
            },
            "image/webp",
            0.82,
        );
    };

    const imgLeft = (VELIKOST_NAHLEDU - dispW) / 2 + posun.x;
    const imgTop = (VELIKOST_NAHLEDU - dispH) / 2 + posun.y;

    return (
        <div
            onClick={() => !ukladaSe && onZrusit()}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center space-y-5"
            >
                <div className="w-full flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">
                        Upravit výřez fotky
                    </h3>
                    <button
                        type="button"
                        disabled={ukladaSe}
                        onClick={onZrusit}
                        className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Move size={14} className="text-indigo-500" />
                    Posuň fotku prstem nebo myší tak, aby byl obličej uprostřed
                </p>

                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                        width: VELIKOST_NAHLEDU,
                        height: VELIKOST_NAHLEDU,
                    }}
                    className="relative rounded-full overflow-hidden bg-slate-900 ring-4 ring-indigo-500/30 shadow-inner touch-none cursor-grab active:cursor-grabbing select-none"
                >
                    <img
                        ref={imgRef}
                        src={obrazekUrl}
                        alt="Náhled výřezu"
                        draggable={false}
                        onLoad={(e) => {
                            const el = e.currentTarget;
                            setRozmery({
                                w: el.naturalWidth,
                                h: el.naturalHeight,
                            });
                        }}
                        style={{
                            position: "absolute",
                            left: imgLeft,
                            top: imgTop,
                            width: dispW,
                            height: dispH,
                            maxWidth: "none",
                        }}
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-white/80" />
                </div>

                <div className="w-full flex items-center gap-3 px-1">
                    <ZoomOut size={16} className="text-slate-400 shrink-0" />
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => zmenZoom(parseFloat(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <ZoomIn size={16} className="text-slate-400 shrink-0" />
                </div>

                <div className="w-full flex gap-2.5">
                    <button
                        type="button"
                        disabled={ukladaSe}
                        onClick={onZrusit}
                        className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                        Zrušit
                    </button>
                    <button
                        type="button"
                        disabled={ukladaSe || !rozmery}
                        onClick={ulozitVyrez}
                        className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-200"
                    >
                        <Check size={17} />
                        {ukladaSe ? "Ukládám..." : "Uložit fotku"}
                    </button>
                </div>
            </div>
        </div>
    );
}
