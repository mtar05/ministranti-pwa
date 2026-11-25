"use client";

import {
    Camera,
    Award,
    Target,
    Users,
    BarChart3,
    Bell,
    Sparkles,
} from "lucide-react";
import { appConfig } from "@/config/appConfig";

interface WhatsNewModalProps {
    otevreno: boolean;
    onZavrit: () => void;
}

const ikonaNovinky = (klic: string) => {
    switch (klic) {
        case "camera":
            return <Camera size={18} className="text-indigo-600" />;
        case "award":
            return <Award size={18} className="text-amber-500" />;
        case "target":
            return <Target size={18} className="text-emerald-600" />;
        case "users":
            return <Users size={18} className="text-sky-600" />;
        case "barChart":
            return <BarChart3 size={18} className="text-purple-600" />;
        default:
            return <Bell size={18} className="text-rose-500" />;
    }
};

export default function WhatsNewModal({
    otevreno,
    onZavrit,
}: WhatsNewModalProps) {
    if (!otevreno) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Sparkles size={22} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                            Verze {appConfig.appVersion}
                        </span>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">
                            Co je nového v aplikaci?
                        </h3>
                    </div>
                </div>

                <div className="space-y-3 overflow-y-auto pr-1 flex-1 my-2">
                    {appConfig.whatsNew.map((polozka, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100"
                        >
                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                {ikonaNovinky(polozka.icon)}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-slate-900">
                                    {polozka.title}
                                </p>
                                <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                                    {polozka.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onZavrit}
                    className="w-full mt-4 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                >
                    Super, jdeme na to!
                </button>
            </div>
        </div>
    );
}
