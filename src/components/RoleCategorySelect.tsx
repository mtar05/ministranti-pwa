"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface OptionItem<T extends string> {
    value: T;
    label: string;
    dotClass: string;
    badgeClass: string;
}

interface RoleCategorySelectProps<T extends string> {
    value: T;
    options: OptionItem<T>[];
    onChange: (newValue: T) => void;
    otevritNahoru?: boolean;
    zarovnani?: "left" | "right";
}

export default function RoleCategorySelect<T extends string>({
    value,
    options,
    onChange,
    otevritNahoru = false,
    zarovnani = "left",
}: RoleCategorySelectProps<T>) {
    const [otevreno, setOtevreno] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOtevreno(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const aktivni = options.find((o) => o.value === value) || options[0];

    return (
        <div
            ref={ref}
            className="relative"
            onClick={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                onClick={() => setOtevreno((prev) => !prev)}
                className={`w-full flex items-center justify-between gap-1.5 border text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-xl cursor-pointer transition-all hover:brightness-95 ${aktivni.badgeClass}`}
            >
                <span className="flex items-center gap-1.5 truncate">
                    <span
                        className={`w-2 h-2 rounded-full shrink-0 ${aktivni.dotClass}`}
                    />
                    <span className="truncate">{aktivni.label}</span>
                </span>
                <ChevronDown
                    size={13}
                    className={`shrink-0 opacity-60 transition-transform duration-150 ${otevreno ? "rotate-180" : ""}`}
                />
            </button>

            {otevreno && (
                <div
                    className={`absolute w-40 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                        zarovnani === "right" ? "right-0" : "left-0"
                    } ${
                        otevritNahoru ? "bottom-full mb-1.5" : "top-full mt-1.5"
                    }`}
                >
                    {options.map((opt) => {
                        const vybrano = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    setOtevreno(false);
                                    if (opt.value !== value) {
                                        onChange(opt.value);
                                    }
                                }}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                    vybrano
                                        ? "bg-slate-100 text-slate-900"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span
                                        className={`w-2 h-2 rounded-full ${opt.dotClass}`}
                                    />
                                    {opt.label}
                                </span>
                                {vybrano && (
                                    <Check
                                        size={14}
                                        className="text-indigo-600 shrink-0"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
