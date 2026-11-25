"use client";

import { useEffect, useState } from "react";
import {
    X,
    Flame,
    Clock,
    CalendarCheck,
    Award,
    Mail,
    Phone,
} from "lucide-react";
import { Ministrant, GamifikaceSouhrn } from "@/types";
import { nactiGamifikaciUzivatele, formatujPredstih } from "@/lib/gamifikace";
import { supabase } from "@/lib/supabase";
import Avatar from "./Avatar";
import CopyButton from "./CopyButton";
import { appConfig } from "@/config/appConfig";

interface MemberDetailModalProps {
    clen: Ministrant | null;
    onZavrit: () => void;
    onAktualizaceUrovne?: (id: string, uroven: number) => void;
}

function OdznakMiniatura({
    obrazek,
    nazev,
}: {
    obrazek: string;
    nazev: string;
}) {
    const [chyba, setChyba] = useState(false);

    return (
        <div
            title={nazev}
            className={`w-11 h-11 rounded-2xl border bg-gradient-to-b flex items-center justify-center p-1.5 shrink-0 ${appConfig.badgeBackground}`}
        >
            {!chyba ? (
                <img
                    src={obrazek}
                    alt={nazev}
                    onError={() => setChyba(true)}
                    className="w-full h-full object-contain"
                />
            ) : (
                <Award size={20} className="text-amber-500" />
            )}
        </div>
    );
}

export default function MemberDetailModal({
    clen,
    onZavrit,
    onAktualizaceUrovne,
}: MemberDetailModalProps) {
    const [nacita, setNacita] = useState(true);
    const [data, setData] = useState<GamifikaceSouhrn | null>(null);

    useEffect(() => {
        if (!clen) return;
        let aktivni = true;
        setNacita(true);
        setData(null);

        nactiGamifikaciUzivatele(clen.id, clen.vyhrane_mesice || []).then(
            async (vysledek) => {
                if (!aktivni) return;
                setData(vysledek);
                setNacita(false);

                if (vysledek.uroven !== (clen.uroven || 1)) {
                    await supabase
                        .from("ministranti")
                        .update({ uroven: vysledek.uroven })
                        .eq("id", clen.id);
                    onAktualizaceUrovne?.(clen.id, vysledek.uroven);
                }
            },
        );

        return () => {
            aktivni = false;
        };
    }, [clen, onAktualizaceUrovne]);

    if (!clen) return null;

    const odemceneOdznaky = data ? data.odznaky.filter((o) => o.odemceno) : [];
    const barvaAvatara =
        clen.kategorie === "mladsi"
            ? "emerald"
            : clen.kategorie === "vedouci"
              ? "amber"
              : "indigo";

    const textPosledniUcasti = () => {
        if (data?.dnyOdPosledni === null || data?.dnyOdPosledni === undefined) {
            return "Zatím bez účasti";
        }
        if (data.dnyOdPosledni === 0) return "Dnes";
        if (data.dnyOdPosledni === 1) return "Včera";
        return `Před ${data.dnyOdPosledni} dny`;
    };

    return (
        <div
            onClick={onZavrit}
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[88vh] overflow-y-auto space-y-5"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <Avatar
                            jmeno={clen.jmeno}
                            avatarUrl={clen.avatar_url}
                            uroven={data?.uroven || clen.uroven || 1}
                            size="md"
                            barvaPozadi={barvaAvatara}
                        />
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-tight">
                                {clen.jmeno}
                            </h3>
                            <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                                {data
                                    ? data.nazevHodnosti
                                    : "Načítám hodnost..."}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1.5">
                                <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-xl pl-2 pr-1 py-0.5">
                                    <Mail size={12} className="shrink-0" />
                                    <span className="break-all">
                                        {clen.email}
                                    </span>
                                    <CopyButton
                                        text={clen.email}
                                        label="e-mail"
                                        kompaktni
                                    />
                                </span>
                                {clen.telefon && (
                                    <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-xl pl-2 pr-1 py-0.5">
                                        <Phone size={12} className="shrink-0" />
                                        <span className="whitespace-nowrap">
                                            {clen.telefon}
                                        </span>
                                        <CopyButton
                                            text={clen.telefon}
                                            label="telefon"
                                            kompaktni
                                        />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onZavrit}
                        className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {nacita || !data ? (
                    <div className="space-y-3 py-6">
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-20 rounded-2xl bg-slate-100 animate-pulse"
                                />
                            ))}
                        </div>
                        <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-2.5">
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    <CalendarCheck size={13} /> Celkem
                                </div>
                                <p className="text-2xl font-black text-slate-900 mt-1">
                                    {data.celkemMsi}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    {data.za60Dni} za 60 dní
                                </p>
                            </div>

                            <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-3">
                                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-orange-600">
                                    <Flame size={13} /> Série
                                </div>
                                <p className="text-2xl font-black text-orange-600 mt-1">
                                    {data.aktualniSerie}
                                    <span className="text-xs font-bold ml-1">
                                        týd.
                                    </span>
                                </p>
                                <p className="text-[11px] text-orange-700/70">
                                    Rekord: {data.nejdelsiSerie} týd.
                                </p>
                            </div>

                            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3">
                                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                                    <Clock size={13} /> Předstih
                                </div>
                                <p className="text-sm font-extrabold text-indigo-900 mt-2 leading-tight">
                                    {formatujPredstih(
                                        data.prumernyPredstihHodiny,
                                    )}
                                </p>
                                <p className="text-[11px] text-indigo-700/70 mt-0.5">
                                    průměr zápisu
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                <span>Rozložení dnů (Út / St / Čt)</span>
                                <span className="text-slate-400 font-semibold">
                                    Naposledy: {textPosledniUcasti()}
                                </span>
                            </div>

                            <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex">
                                {data.rozlozeniDnu.uteryProcenta > 0 && (
                                    <div
                                        style={{
                                            width: `${data.rozlozeniDnu.uteryProcenta}%`,
                                        }}
                                        className="bg-indigo-500 h-full"
                                    />
                                )}
                                {data.rozlozeniDnu.stredaProcenta > 0 && (
                                    <div
                                        style={{
                                            width: `${data.rozlozeniDnu.stredaProcenta}%`,
                                        }}
                                        className="bg-emerald-500 h-full"
                                    />
                                )}
                                {data.rozlozeniDnu.ctvrtekProcenta > 0 && (
                                    <div
                                        style={{
                                            width: `${data.rozlozeniDnu.ctvrtekProcenta}%`,
                                        }}
                                        className="bg-amber-500 h-full"
                                    />
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                    Út {data.rozlozeniDnu.uteryProcenta} % (
                                    {data.rozlozeniDnu.utery}×)
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    St {data.rozlozeniDnu.stredaProcenta} % (
                                    {data.rozlozeniDnu.streda}×)
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    Čt {data.rozlozeniDnu.ctvrtekProcenta} % (
                                    {data.rozlozeniDnu.ctvrtek}×)
                                </span>
                            </div>

                            <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
                                <span>
                                    Hlavní služba:{" "}
                                    <strong className="text-slate-900">
                                        {data.hlavniPocet}×
                                    </strong>
                                </span>
                                <span>
                                    Doprovod (Další):{" "}
                                    <strong className="text-slate-900">
                                        {data.dalsiPocet}×
                                    </strong>
                                </span>
                                <span>
                                    Celkem XP:{" "}
                                    <strong className="text-indigo-600">
                                        {data.xp}
                                    </strong>
                                </span>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                                Odemčené odznaky ({odemceneOdznaky.length} /{" "}
                                {data.odznaky.length})
                            </p>
                            {odemceneOdznaky.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                    Zatím nemá odemčený žádný odznak.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {odemceneOdznaky.map((odznak) => (
                                        <OdznakMiniatura
                                            key={odznak.id}
                                            obrazek={odznak.obrazek}
                                            nazev={odznak.nazev}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
