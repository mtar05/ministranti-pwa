"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cs } from "date-fns/locale";
import {
    Plus,
    X,
    Printer,
    Calendar,
    Bell,
    Send,
    Sparkles,
    Trash2,
    Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { appConfig } from "@/config/appConfig";
import { PravidloGenerovani } from "@/types";

const dnyVTydnu = [
    { label: "Po", val: 1 },
    { label: "Út", val: 2 },
    { label: "St", val: 3 },
    { label: "Čt", val: 4 },
    { label: "Pá", val: 5 },
    { label: "So", val: 6 },
    { label: "Ne", val: 0 },
];

export default function AdminDashboard() {
    const router = useRouter();
    const [overeno, setOvereno] = useState(false);
    const [prihlasenyId, setPrihlasenyId] = useState<string | null>(null);

    const [modalGeneratorOtevren, setModalGeneratorOtevren] = useState(false);
    const [modalNotifikaceOtevren, setModalNotifikaceOtevren] = useState(false);

    const [tiskMse, setTiskMse] = useState<any[]>([]);
    const [vybranyMesic, setVybranyMesic] = useState<Date>(new Date());

    const [odData, setOdData] = useState("");
    const [doData, setDoData] = useState("");
    const [cas, setCas] = useState(appConfig.defaultMassTime);
    const [nazevMse, setNazevMse] = useState(appConfig.defaultMassName);
    const [vybraneDny, setVybraneDny] = useState<number[]>([]);

    const [notifNadpis, setNotifNadpis] = useState("");
    const [notifText, setNotifText] = useState("");
    const [notifKomu, setNotifKomu] = useState<"vsem" | "jednomu">("vsem");
    const [notifUzivatelId, setNotifUzivatelId] = useState("");
    const [seznamClenu, setSeznamClenu] = useState<
        { id: string; jmeno: string }[]
    >([]);
    const [odesilaSeNotif, setOdesilaSeNotif] = useState(false);

    const [autoAktivni, setAutoAktivni] = useState(false);
    const [autoPravidla, setAutoPravidla] = useState<PravidloGenerovani[]>([]);
    const [ukladaSeAuto, setUkladaSeAuto] = useState(false);

    const nactiTiskData = useCallback(async (mesic: Date) => {
        const { data: mse } = await supabase
            .from("mse")
            .select(
                `id, nazev, cas_zacatku, rozpis_sluzeb ( ministranti ( jmeno, kategorie ) )`,
            )
            .gte("cas_zacatku", startOfMonth(mesic).toISOString())
            .lte("cas_zacatku", endOfMonth(mesic).toISOString())
            .order("cas_zacatku", { ascending: true });

        if (mse) {
            const formatovana = mse.map((m: any) => {
                const starsi = m.rozpis_sluzeb.find(
                    (r: any) => r.ministranti?.kategorie === "starsi",
                );
                const mladsi = m.rozpis_sluzeb.find(
                    (r: any) => r.ministranti?.kategorie === "mladsi",
                );
                return {
                    id: m.id,
                    datum: new Date(m.cas_zacatku),
                    nazev: m.nazev,
                    starsi: starsi ? starsi.ministranti.jmeno : "",
                    mladsi: mladsi ? mladsi.ministranti.jmeno : "",
                };
            });
            setTiskMse(formatovana);
        }
    }, []);

    const nactiAutoNastaveni = useCallback(async () => {
        const { data } = await supabase
            .from("nastaveni_generovani")
            .select("*")
            .eq("id", 1)
            .single();

        if (data) {
            setAutoAktivni(data.aktivni);
            setAutoPravidla(Array.isArray(data.pravidla) ? data.pravidla : []);
        }
    }, []);

    useEffect(() => {
        const overAdminPristup = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }

            const { data } = await supabase
                .from("ministranti")
                .select("role")
                .eq("id", session.user.id)
                .single();

            if (data?.role !== "admin") {
                router.push("/");
                return;
            }

            setPrihlasenyId(session.user.id);
            setOvereno(true);
            nactiAutoNastaveni();
            nactiTiskData(vybranyMesic);
        };

        overAdminPristup();
    }, [router, nactiAutoNastaveni, nactiTiskData, vybranyMesic]);

    const otevritNotifikaceModal = async () => {
        setModalNotifikaceOtevren(true);
        if (seznamClenu.length === 0) {
            const { data } = await supabase
                .from("ministranti")
                .select("id, jmeno")
                .order("jmeno");
            if (data) {
                setSeznamClenu(data);
                if (data.length > 0) setNotifUzivatelId(data[0].id);
            }
        }
    };

    const odeslatNotifikaci = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!notifNadpis.trim() || !notifText.trim()) return;

        setOdesilaSeNotif(true);
        try {
            const res = await fetch("/api/admin/notifikace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adminId: prihlasenyId,
                    title: notifNadpis.trim(),
                    body: notifText.trim(),
                    targetUserId:
                        notifKomu === "jednomu" ? notifUzivatelId : null,
                }),
            });

            const vysledek = await res.json();
            if (!res.ok) {
                throw new Error(vysledek.error || "Chyba při odesílání");
            }

            alert(
                `Upozornění bylo úspěšně odesláno (${vysledek.odeslano} z ${vysledek.celkem} aktivních zařízení).`,
            );
            setModalNotifikaceOtevren(false);
            setNotifNadpis("");
            setNotifText("");
        } catch (err: any) {
            alert("Chyba: " + err.message);
        } finally {
            setOdesilaSeNotif(false);
        }
    };

    const ulozitAutoNastaveni = async (
        noveAktivni: boolean,
        novaPravidla: PravidloGenerovani[],
    ) => {
        setUkladaSeAuto(true);
        const { error } = await supabase.from("nastaveni_generovani").upsert({
            id: 1,
            aktivni: noveAktivni,
            pravidla: novaPravidla,
        });

        setUkladaSeAuto(false);
        if (error) {
            alert("Chyba při ukládání nastavení: " + error.message);
        } else {
            setAutoAktivni(noveAktivni);
            setAutoPravidla(novaPravidla);
        }
    };

    const pridatAutoPravidlo = () => {
        setAutoPravidla((prev) => [
            ...prev,
            {
                dny: [0],
                cas: appConfig.defaultMassTime,
                nazev: appConfig.defaultMassName,
            },
        ]);
    };

    const smazatAutoPravidlo = (index: number) => {
        setAutoPravidla((prev) => prev.filter((_, i) => i !== index));
    };

    const prepniDenPravidla = (indexPravidla: number, denVal: number) => {
        setAutoPravidla((prev) =>
            prev.map((p, i) => {
                if (i !== indexPravidla) return p;
                const dny = p.dny.includes(denVal)
                    ? p.dny.filter((d) => d !== denVal)
                    : [...p.dny, denVal];
                return { ...p, dny };
            }),
        );
    };

    const upravPravidlo = (
        indexPravidla: number,
        pole: "cas" | "nazev",
        hodnota: string,
    ) => {
        setAutoPravidla((prev) =>
            prev.map((p, i) =>
                i === indexPravidla ? { ...p, [pole]: hodnota } : p,
            ),
        );
    };

    const prepniDen = (val: number) => {
        setVybraneDny((prev) =>
            prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val],
        );
    };

    const spustitGenerovani = async () => {
        if (!odData || !doData || vybraneDny.length === 0) {
            alert("Vyplňte všechna pole a vyberte alespoň jeden den.");
            return;
        }

        const current = new Date(odData);
        const end = new Date(doData);
        const naVlozeni = [];

        while (current <= end) {
            if (vybraneDny.includes(current.getDay())) {
                const datumCasStr = `${format(current, "yyyy-MM-dd")}T${cas}:00`;
                naVlozeni.push({
                    nazev: nazevMse || appConfig.defaultMassName,
                    cas_zacatku: new Date(datumCasStr).toISOString(),
                });
            }
            current.setDate(current.getDate() + 1);
        }

        if (naVlozeni.length > 0) {
            await supabase.from("mse").insert(naVlozeni);
            setModalGeneratorOtevren(false);
            nactiTiskData(vybranyMesic);
            alert(`Úspěšně vygenerováno ${naVlozeni.length} mší.`);
        }
    };

    if (!overeno) return null;

    return (
        <>
            <div className="space-y-6 print:hidden animate-in fade-in duration-500">
                <section
                    data-tour="admin-nastroje"
                    className="grid sm:grid-cols-2 gap-4"
                >
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between items-start gap-4">
                        <div className="w-full">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Bell size={20} className="text-amber-500" />{" "}
                                Odeslat upozornění
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Rozešle push notifikaci všem nebo vybranému
                                členovi.
                            </p>
                        </div>
                        <button
                            onClick={otevritNotifikaceModal}
                            className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-colors flex items-center gap-2 shadow-sm shadow-amber-100"
                        >
                            <Send size={18} /> Napsat zprávu
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between items-start gap-4">
                        <div className="w-full">
                            <h2 className="text-lg font-bold text-slate-900">
                                Ruční generátor mší
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Hromadné vytvoření mší na zvolené období.
                            </p>
                        </div>
                        <button
                            onClick={() => setModalGeneratorOtevren(true)}
                            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                            <Plus size={18} /> Vygenerovat ručně
                        </button>
                    </div>
                </section>

                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles
                                    size={20}
                                    className="text-indigo-600"
                                />{" "}
                                Automatické generování mší
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Vždy 15. den v měsíci automaticky vypíše mše na
                                celý následující měsíc.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                ulozitAutoNastaveni(!autoAktivni, autoPravidla)
                            }
                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                autoAktivni ? "bg-indigo-600" : "bg-slate-200"
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    autoAktivni
                                        ? "translate-x-5"
                                        : "translate-x-0"
                                }`}
                            />
                        </button>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Šablona pravidelných mší ({autoPravidla.length})
                            </span>
                            <button
                                onClick={pridatAutoPravidlo}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                                <Plus size={14} /> Přidat pravidlo
                            </button>
                        </div>

                        {autoPravidla.length === 0 ? (
                            <p className="text-sm text-slate-400 italic py-2">
                                Zatím nejsou nastavena žádná pravidla.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {autoPravidla.map((pravidlo, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap gap-1.5">
                                                {dnyVTydnu.map((den) => {
                                                    const aktivniDen =
                                                        pravidlo.dny.includes(
                                                            den.val,
                                                        );
                                                    return (
                                                        <button
                                                            key={den.label}
                                                            type="button"
                                                            onClick={() =>
                                                                prepniDenPravidla(
                                                                    idx,
                                                                    den.val,
                                                                )
                                                            }
                                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                                                aktivniDen
                                                                    ? "bg-indigo-600 text-white"
                                                                    : "bg-white text-slate-600 border border-slate-200"
                                                            }`}
                                                        >
                                                            {den.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                onClick={() =>
                                                    smazatAutoPravidlo(idx)
                                                }
                                                className="text-slate-400 hover:text-red-600 p-1.5"
                                                title="Odebrat pravidlo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                                                    Čas začátku
                                                </label>
                                                <input
                                                    type="time"
                                                    value={pravidlo.cas}
                                                    onChange={(e) =>
                                                        upravPravidlo(
                                                            idx,
                                                            "cas",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                                                    Název mše
                                                </label>
                                                <input
                                                    type="text"
                                                    value={pravidlo.nazev}
                                                    onChange={(e) =>
                                                        upravPravidlo(
                                                            idx,
                                                            "nazev",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() =>
                                ulozitAutoNastaveni(autoAktivni, autoPravidla)
                            }
                            disabled={ukladaSeAuto}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-100"
                        >
                            <Save size={16} />{" "}
                            {ukladaSeAuto ? "Ukládám..." : "Uložit šablonu"}
                        </button>
                    </div>
                </section>

                <section className="bg-indigo-50 p-6 rounded-3xl shadow-sm border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="w-full sm:w-auto flex-1">
                        <h2 className="text-lg font-bold text-indigo-900">
                            Tisk rozpisu
                        </h2>
                        <p className="text-sm text-indigo-700 mt-1 mb-3">
                            Vytiskne rozpis na zvolený měsíc.
                        </p>
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-indigo-200 max-w-xs">
                            <Calendar size={18} className="text-indigo-500" />
                            <input
                                type="month"
                                value={format(vybranyMesic, "yyyy-MM")}
                                onChange={(e) =>
                                    setVybranyMesic(new Date(e.target.value))
                                }
                                className="outline-none bg-transparent text-sm font-semibold text-indigo-900 w-full"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200"
                    >
                        <Printer size={18} /> Vytisknout PDF / Papír
                    </button>
                </section>

                {modalNotifikaceOtevren && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">
                                    Odeslat upozornění
                                </h3>
                                <button
                                    onClick={() =>
                                        setModalNotifikaceOtevren(false)
                                    }
                                    className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
                                onSubmit={odeslatNotifikaci}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Komu zaslat
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setNotifKomu("vsem")}
                                            className={`py-2 rounded-lg text-xs font-bold transition-all ${
                                                notifKomu === "vsem"
                                                    ? "bg-white text-indigo-600 shadow-sm"
                                                    : "text-slate-500"
                                            }`}
                                        >
                                            Všem uživatelům
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setNotifKomu("jednomu")
                                            }
                                            className={`py-2 rounded-lg text-xs font-bold transition-all ${
                                                notifKomu === "jednomu"
                                                    ? "bg-white text-indigo-600 shadow-sm"
                                                    : "text-slate-500"
                                            }`}
                                        >
                                            Konkrétnímu členovi
                                        </button>
                                    </div>
                                </div>

                                {notifKomu === "jednomu" && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Vyber člena
                                        </label>
                                        <select
                                            value={notifUzivatelId}
                                            onChange={(e) =>
                                                setNotifUzivatelId(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {seznamClenu.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.jmeno}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Nadpis oznámení
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Např. Mimořádná zkouška ministrantů"
                                        value={notifNadpis}
                                        onChange={(e) =>
                                            setNotifNadpis(e.target.value)
                                        }
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Text zprávy
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Zadej text upozornění..."
                                        value={notifText}
                                        onChange={(e) =>
                                            setNotifText(e.target.value)
                                        }
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={odesilaSeNotif}
                                    className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl mt-2 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center justify-center gap-2"
                                >
                                    <Send size={18} />{" "}
                                    {odesilaSeNotif
                                        ? "Odesílám..."
                                        : "Odeslat notifikaci"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {modalGeneratorOtevren && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">
                                    Nové mše
                                </h3>
                                <button
                                    onClick={() =>
                                        setModalGeneratorOtevren(false)
                                    }
                                    className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Od data
                                        </label>
                                        <input
                                            type="date"
                                            value={odData}
                                            onChange={(e) =>
                                                setOdData(e.target.value)
                                            }
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Do data
                                        </label>
                                        <input
                                            type="date"
                                            value={doData}
                                            onChange={(e) =>
                                                setDoData(e.target.value)
                                            }
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Dny v týdnu
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {dnyVTydnu.map((den) => (
                                            <label
                                                key={den.label}
                                                className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={vybraneDny.includes(
                                                        den.val,
                                                    )}
                                                    onChange={() =>
                                                        prepniDen(den.val)
                                                    }
                                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                />
                                                <span className="text-sm font-bold text-slate-700">
                                                    {den.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Čas
                                        </label>
                                        <input
                                            type="time"
                                            value={cas}
                                            onChange={(e) =>
                                                setCas(e.target.value)
                                            }
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Název mše
                                        </label>
                                        <input
                                            type="text"
                                            value={nazevMse}
                                            onChange={(e) =>
                                                setNazevMse(e.target.value)
                                            }
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={spustitGenerovani}
                                    className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl mt-2 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                                >
                                    Spustit generování
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="hidden print:block text-black print:w-full print:m-0 print:p-0">
                <h1 className="text-2xl font-bold mb-1 text-center">
                    Rozpis služeb ministrantů
                </h1>
                <p className="text-center text-gray-600 mb-8 pb-4 border-b-2 border-black font-medium">
                    {appConfig.parishName} •{" "}
                    {format(vybranyMesic, "LLLL yyyy", { locale: cs })}
                </p>
                <table className="w-full border-collapse border border-black text-left text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-3 w-1/4 font-bold">
                                Datum
                            </th>
                            <th className="border border-black p-3 w-1/4 font-bold">
                                Čas a Název
                            </th>
                            <th className="border border-black p-3 w-1/4 font-bold">
                                Starší ministrant
                            </th>
                            <th className="border border-black p-3 w-1/4 font-bold">
                                Mladší ministrant
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {tiskMse.map((mse) => (
                            <tr key={mse.id}>
                                <td className="border border-black p-3 font-semibold">
                                    {format(mse.datum, "EEEE d. M. yyyy", {
                                        locale: cs,
                                    })}
                                </td>
                                <td className="border border-black p-3">
                                    {format(mse.datum, "HH:mm")} • {mse.nazev}
                                </td>
                                <td className="border border-black p-3">
                                    {mse.starsi || (
                                        <span className="text-gray-400 italic">
                                            Neobsazeno
                                        </span>
                                    )}
                                </td>
                                <td className="border border-black p-3">
                                    {mse.mladsi || (
                                        <span className="text-gray-400 italic">
                                            Neobsazeno
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-xs text-gray-500 mt-6 text-center">
                    Vytištěno dne: {format(new Date(), "d. M. yyyy HH:mm")}
                </p>
            </div>
        </>
    );
}
