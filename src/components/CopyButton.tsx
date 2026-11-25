"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
    text: string;
    label: string;
    kompaktni?: boolean;
}

export default function CopyButton({
    text,
    label,
    kompaktni = false,
}: CopyButtonProps) {
    const [zkopirovano, setZkopirovano] = useState(false);

    const zkopirovat = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setZkopirovano(true);
            setTimeout(() => setZkopirovano(false), 2000);
        } catch {
            alert("Nepodařilo se zkopírovat do schránky.");
        }
    };

    return (
        <button
            type="button"
            onClick={zkopirovat}
            title={`Zkopírovat ${label}`}
            aria-label={`Zkopírovat ${label}`}
            className={`inline-flex items-center gap-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                kompaktni
                    ? "px-1.5 py-0.5 text-[10px]"
                    : "px-2 py-1 text-[11px]"
            } ${
                zkopirovano
                    ? "bg-emerald-50 text-emerald-600 font-bold"
                    : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
        >
            {zkopirovano ? (
                <>
                    <Check size={kompaktni ? 12 : 13} strokeWidth={2.5} />
                    <span>Zkopírováno</span>
                </>
            ) : (
                <Copy size={kompaktni ? 12 : 13} />
            )}
        </button>
    );
}
