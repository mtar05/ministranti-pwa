"use client";

import { useState, useEffect, useCallback } from "react";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    subDays,
} from "date-fns";
import { cs } from "date-fns/locale";
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    User,
    UserPlus,
    ShieldCheck,
    Trash2,
    X,
    Users,
    History,
    Flame,
    Trophy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { appConfig } from "@/config/appConfig";
import {
    Ministrant,
    MsePolozka,
    StatistikaOsoba,
    GamifikaceSouhrn,
} from "@/types";
import {
    GAMIFIKACE_CACHE_KEY,
    nactiGamifikaciUzivatele,
} from "@/lib/gamifikace";
import Avatar from "@/components/Avatar";

type ObdobiStatistiky = "60_dni" | "cela_doba";

export default function Dashboard() {
    const router = useRouter();
    const [aktualniMesic, setAktualniMesic] = useState(new Date());
    const [mojeSluzbyOtevreno, setMojeSluzbyOtevreno] = useState(false);
    const [statistikaOtevrena, setStatistikaOtevrena] = useState(false);
    const [obdobiStatistiky, setObdobiStatistiky] =
        useState<ObdobiStatistiky>("60_dni");
    const [probehleRozbaleno, setProbehleRozbaleno] = useState(false);
    const [dalsiMseId, setDalsiMseId] = useState<string | null>(null);
    const [uzivatel, setUzivatel] = useState<Ministrant | null>(null);
    const [gamifikaceCache, setGamifikaceCache] =
        useState<GamifikaceSouhrn | null>(null);
    const [mseData, setMseData] = useState<MsePolozka[]>([]);
    const [nacitaMse, setNacitaMse] = useState(true);
    const [nacitaStatistiku, setNacitaStatistiku] = useState(false);

    const [clenoveZaklad, setClenoveZaklad] = useState<
        {
            id: string;
            jmeno: string;
            kategorie: "starsi" | "mladsi";
            avatar_url?: string | null;
            uroven?: number;
        }[]
    >([]);
    const [statistika60Dni, setStatistika60Dni] = useState<{
        starsi: StatistikaOsoba[];
        mladsi: StatistikaOsoba[];
    }>({ starsi: [], mladsi: [] });
    const [statistikaCelaDoba, setStatistikaCelaDoba] = useState<{
        starsi: StatistikaOsoba[];
        mladsi: StatistikaOsoba[];
    } | null>(null);
    const [spolecnyCil, setSpolecnyCil] = useState({
        celkemProbehlych: 0,
        plneObsazenychMsi: 0,
    });

    const sestavZebricky = useCallback(
        (
            clenove: {
                id: string;
                jmeno: string;
                kategorie: "starsi" | "mladsi";
                avatar_url?: string | null;
                uroven?: number;
            }[],
            mseZaznamy: any[],
        ) => {
            const soucty: Record<
                string,
                {
                    id: string;
                    jmeno: string;
                    kategorie: "starsi" | "mladsi";
                    avatar_url?: string | null;
                    uroven?: number;
                    pocet: number;
                }
            > = {};

            clenove.forEach((c) => {
                soucty[c.id] = {
                    id: c.id,
                    jmeno: c.jmeno,
                    kategorie: c.kategorie,
                    avatar_url: c.avatar_url,
                    uroven: c.uroven,
                    pocet: 0,
                };
            });

            mseZaznamy.forEach((m: any) => {
                m.rozpis_sluzeb?.forEach((r: any) => {
                    if (soucty[r.ministrant_id]) {
                        soucty[r.ministrant_id].pocet += 1;
                    }
                });
            });

            const vytvorPoradi = (
                kategorie: "starsi" | "mladsi",
            ): StatistikaOsoba[] => {
                const serazeno = Object.values(soucty)
                    .filter((osoba) => osoba.kategorie === kategorie)
                    .sort(
                        (a, b) =>
                            b.pocet - a.pocet ||
                            a.jmeno.localeCompare(b.jmeno, "cs"),
                    );

                let aktualniPoradi = 1;
                return serazeno.map((osoba, index) => {
                    if (index > 0 && osoba.pocet < serazeno[index - 1].pocet) {
                        aktualniPoradi += 1;
                    }
                    return { ...osoba, poradi: aktualniPoradi };
                });
            };

            return {
                starsi: vytvorPoradi("starsi"),
                mladsi: vytvorPoradi("mladsi"),
            };
        },
        [],
    );

    const nactiMse = useCallback(async (mesic: Date) => {
        const start = startOfMonth(mesic).toISOString();
        const end = endOfMonth(mesic).toISOString();

        const { data } = await supabase
            .from("mse")
            .select(
                `
                id, nazev, cas_zacatku,
                rozpis_sluzeb ( id, ministrant_id, ministranti ( jmeno, kategorie, avatar_url, uroven ) )
            `,
            )
            .gte("cas_zacatku", start)
            .lte("cas_zacatku", end)
            .order("cas_zacatku", { ascending: true });

        if (data) {
            const formatovana: MsePolozka[] = data.map((m: any) => {
                const starsi = m.rozpis_sluzeb.find(
                    (r: any) => r.ministranti?.kategorie === "starsi",
                );
                const mladsi = m.rozpis_sluzeb.find(
                    (r: any) => r.ministranti?.kategorie === "mladsi",
                );
                const dalsi = m.rozpis_sluzeb
                    .filter((r: any) => r !== starsi && r !== mladsi)
                    .map((r: any) => ({
                        id: r.ministrant_id,
                        jmeno: r.ministranti?.jmeno || "Neznámý",
                        kategorie: r.ministranti?.kategorie,
                        avatar_url: r.ministranti?.avatar_url,
                        uroven: r.ministranti?.uroven,
                        rozpis_id: r.id,
                    }));

                return {
                    id: m.id,
                    datum: new Date(m.cas_zacatku),
                    nazev: m.nazev,
                    starsi: starsi
                        ? {
                              id: starsi.ministrant_id,
                              jmeno: starsi.ministranti.jmeno,
                              avatar_url: starsi.ministranti.avatar_url,
                              uroven: starsi.ministranti.uroven,
                              rozpis_id: starsi.id,
                          }
                        : null,
                    mladsi: mladsi
                        ? {
                              id: mladsi.ministrant_id,
                              jmeno: mladsi.ministranti.jmeno,
                              avatar_url: mladsi.ministranti.avatar_url,
                              uroven: mladsi.ministranti.uroven,
                              rozpis_id: mladsi.id,
                          }
                        : null,
                    dalsi,
                };
            });
            setMseData(formatovana);
        }
        setNacitaMse(false);
    }, []);

    const nactiSpolecnyCil = useCallback(async () => {
        const zacatekDne = new Date();
        zacatekDne.setHours(0, 0, 0, 0);

        const { data } = await supabase.rpc("spolecny_cil_statistika", {
            do_data: zacatekDne.toISOString(),
        });

        const radek = Array.isArray(data) ? data[0] : data;
        if (radek) {
            setSpolecnyCil({
                celkemProbehlych: radek.celkem_probehlych || 0,
                plneObsazenychMsi: radek.plne_obsazenych || 0,
            });
        }
    }, []);

    const nactiStatistiku60Dni = useCallback(
        async (
            existujiciClenove?: {
                id: string;
                jmeno: string;
                kategorie: "starsi" | "mladsi";
                avatar_url?: string | null;
                uroven?: number;
            }[],
        ) => {
            const ted = new Date().toISOString();
            const pred60Dny = subDays(new Date(), 60).toISOString();

            let clenove = existujiciClenove;
            if (!clenove || clenove.length === 0) {
                const { data: uzivateleData } = await supabase
                    .from("ministranti")
                    .select("id, jmeno, kategorie, avatar_url, uroven")
                    .in("kategorie", ["starsi", "mladsi"]);
                clenove = (uzivateleData || []) as {
                    id: string;
                    jmeno: string;
                    kategorie: "starsi" | "mladsi";
                    avatar_url?: string | null;
                    uroven?: number;
                }[];
                setClenoveZaklad(clenove);
            }

            const { data: mseZaznamy } = await supabase
                .from("mse")
                .select("id, rozpis_sluzeb ( ministrant_id )")
                .gte("cas_zacatku", pred60Dny)
                .lte("cas_zacatku", ted);

            setStatistika60Dni(sestavZebricky(clenove, mseZaznamy || []));
            setStatistikaCelaDoba(null);
        },
        [sestavZebricky],
    );

    const nactiStatistikuCelaDoba = useCallback(async () => {
        if (statistikaCelaDoba) return;
        setNacitaStatistiku(true);
        const ted = new Date().toISOString();

        const { data: mseZaznamy } = await supabase
            .from("mse")
            .select("id, rozpis_sluzeb ( ministrant_id )")
            .lte("cas_zacatku", ted);

        setStatistikaCelaDoba(sestavZebricky(clenoveZaklad, mseZaznamy || []));
        setNacitaStatistiku(false);
    }, [clenoveZaklad, sestavZebricky, statistikaCelaDoba]);

    useEffect(() => {
        const ulozeny = localStorage.getItem("ministrant_profil");
        if (ulozeny) {
            setUzivatel(JSON.parse(ulozeny));
        }

        const ulozenaGamifikace = localStorage.getItem(GAMIFIKACE_CACHE_KEY);
        if (ulozenaGamifikace) {
            try {
                setGamifikaceCache(JSON.parse(ulozenaGamifikace));
            } catch {
                localStorage.removeItem(GAMIFIKACE_CACHE_KEY);
            }
        }

        const inicializuj = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) {
                localStorage.removeItem("ministrant_profil");
                router.push("/login");
                return;
            }

            await Promise.all([
                supabase
                    .from("ministranti")
                    .select("*")
                    .eq("id", session.user.id)
                    .single()
                    .then(({ data }) => {
                        if (data) {
                            setUzivatel(data);
                            localStorage.setItem(
                                "ministrant_profil",
                                JSON.stringify(data),
                            );
                        }
                    }),
                nactiMse(aktualniMesic),
                nactiSpolecnyCil(),
                nactiStatistiku60Dni(),
            ]);
        };

        inicializuj();
    }, [router, nactiMse, nactiStatistiku60Dni, nactiSpolecnyCil]);

    const otevritMojeSluzby = async () => {
        setMojeSluzbyOtevreno(true);
        if (!gamifikaceCache && uzivatel && uzivatel.kategorie !== "vedouci") {
            const vysledek = await nactiGamifikaciUzivatele(
                uzivatel.id,
                uzivatel.vyhrane_mesice || [],
            );
            setGamifikaceCache(vysledek);
            localStorage.setItem(
                GAMIFIKACE_CACHE_KEY,
                JSON.stringify(vysledek),
            );
        }
    };

    const zmenMesic = (novyMesic: Date) => {
        setAktualniMesic(novyMesic);
        setProbehleRozbaleno(false);
        setNacitaMse(true);
        nactiMse(novyMesic);
    };

    const prepniObdobiStatistiky = (noveObdobi: ObdobiStatistiky) => {
        setObdobiStatistiky(noveObdobi);
        if (noveObdobi === "cela_doba") {
            nactiStatistikuCelaDoba();
        }
    };

    const zapsatSe = async (mseId: string, jeMinula: boolean) => {
        if (!uzivatel) return;
        if (jeMinula && uzivatel.role !== "admin") {
            alert("Na proběhlé mše se již nelze zapisovat.");
            return;
        }
        await supabase
            .from("rozpis_sluzeb")
            .insert({ ministrant_id: uzivatel.id, mse_id: mseId });
        nactiMse(aktualniMesic);
        if (jeMinula) {
            nactiStatistiku60Dni(clenoveZaklad);
            nactiSpolecnyCil();
        }
    };

    const odhlasitSe = async (rozpisId: string, jeMinula: boolean) => {
        if (!uzivatel) return;
        if (jeMinula && uzivatel.role !== "admin") {
            alert("Z proběhlých mší nelze odhlašovat.");
            return;
        }
        if (!confirm("Opravdu si přeješ zrušit tuto službu?")) {
            return;
        }
        await supabase.from("rozpis_sluzeb").delete().eq("id", rozpisId);
        nactiMse(aktualniMesic);
        if (jeMinula) {
            nactiStatistiku60Dni(clenoveZaklad);
            nactiSpolecnyCil();
        }
    };

    const smazatMsi = async (mseId: string) => {
        if (!confirm("Opravdu chceš smazat celou tuto mši?")) return;
        await supabase.from("rozpis_sluzeb").delete().eq("mse_id", mseId);
        await supabase.from("mse").delete().eq("id", mseId);
        nactiMse(aktualniMesic);
        nactiStatistiku60Dni(clenoveZaklad);
        nactiSpolecnyCil();
    };

    if (!uzivatel) return null;

    const isAdmin = uzivatel.role === "admin";

    const mojeMse = mseData.filter(
        (mse) =>
            mse.starsi?.id === uzivatel.id ||
            mse.mladsi?.id === uzivatel.id ||
            mse.dalsi.some((d) => d.id === uzivatel.id),
    );

    const mujZebricek60 =
        uzivatel.kategorie === "starsi"
            ? statistika60Dni.starsi
            : statistika60Dni.mladsi;
    const mojeUmisteni = mujZebricek60.find((o) => o.id === uzivatel.id);

    const aktivniStatistika =
        obdobiStatistiky === "cela_doba" && statistikaCelaDoba
            ? statistikaCelaDoba
            : statistika60Dni;

    const dnesPocatek = new Date();
    dnesPocatek.setHours(0, 0, 0, 0);

    const probehleMse = mseData.filter((m) => m.datum < dnesPocatek);
    const nadchazejiciMse = mseData.filter((m) => m.datum >= dnesPocatek);

    const celkemProbehlych = spolecnyCil.celkemProbehlych;
    const plneObsazenychMsi = spolecnyCil.plneObsazenychMsi;
    const procentoObsazenosti =
        celkemProbehlych > 0
            ? Math.round((plneObsazenychMsi / celkemProbehlych) * 100)
            : 0;
    const cilSplnen =
        celkemProbehlych > 0 &&
        procentoObsazenosti >= appConfig.communityGoalTarget;

    const aktivniDalsiMse = dalsiMseId
        ? mseData.find((m) => m.id === dalsiMseId)
        : null;

    const vykresliKartuMse = (mse: MsePolozka) => {
        const plneObsazeno = mse.starsi && mse.mladsi;
        const jeMinula = mse.datum < dnesPocatek;

        return (
            <div
                key={mse.id}
                className={`bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 overflow-hidden relative ${jeMinula ? "opacity-75" : ""}`}
            >
                <div
                    className={`absolute top-0 left-0 w-1 h-full ${plneObsazeno ? "bg-emerald-400" : "bg-indigo-500"} ${jeMinula ? "bg-slate-300" : ""}`}
                ></div>

                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h3 className="font-bold text-xl text-slate-900 tracking-tight flex items-center gap-2">
                            {format(mse.datum, "EEEE d. M. yyyy", {
                                locale: cs,
                            })}
                            {jeMinula && (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Proběhlo
                                </span>
                            )}
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-0.5">
                            {format(mse.datum, "HH:mm")} • {mse.nazev}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setDalsiMseId(mse.id)}
                            title="Další ministranti"
                            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-2"
                        >
                            <Users size={20} />
                            {mse.dalsi?.length > 0 && (
                                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                                    {mse.dalsi.length}
                                </span>
                            )}
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => smazatMsi(mse.id)}
                                title="Smazat mši"
                                className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                    <div
                        className={`p-4 rounded-2xl border ${mse.starsi ? "bg-slate-50 border-slate-100" : "bg-white border-dashed border-slate-300"}`}
                    >
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            <ShieldCheck size={16} /> Starší
                        </div>
                        {mse.starsi ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        jmeno={mse.starsi.jmeno}
                                        avatarUrl={mse.starsi.avatar_url}
                                        uroven={mse.starsi.uroven || 1}
                                        size="sm"
                                        barvaPozadi="indigo"
                                    />
                                    <span className="font-medium text-slate-700">
                                        {mse.starsi.jmeno}
                                    </span>
                                </div>
                                {(isAdmin ||
                                    (mse.starsi.id === uzivatel.id &&
                                        !jeMinula)) && (
                                    <button
                                        onClick={() =>
                                            odhlasitSe(
                                                mse.starsi!.rozpis_id,
                                                jeMinula,
                                            )
                                        }
                                        title="Odhlásit ze služby"
                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors p-1"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        ) : !jeMinula && uzivatel.kategorie === "starsi" ? (
                            <button
                                onClick={() => zapsatSe(mse.id, jeMinula)}
                                className="w-full py-2.5 rounded-xl bg-indigo-50 text-indigo-600 font-semibold text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <UserPlus size={18} /> Zapsat se
                            </button>
                        ) : (
                            <div className="text-slate-400 text-sm text-center py-2 italic">
                                Určeno pro starší
                            </div>
                        )}
                    </div>

                    <div
                        className={`p-4 rounded-2xl border ${mse.mladsi ? "bg-slate-50 border-slate-100" : "bg-white border-dashed border-slate-300"}`}
                    >
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            <User size={16} /> Mladší
                        </div>
                        {mse.mladsi ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        jmeno={mse.mladsi.jmeno}
                                        avatarUrl={mse.mladsi.avatar_url}
                                        uroven={mse.mladsi.uroven || 1}
                                        size="sm"
                                        barvaPozadi="emerald"
                                    />
                                    <span className="font-medium text-slate-700">
                                        {mse.mladsi.jmeno}
                                    </span>
                                </div>
                                {(isAdmin ||
                                    (mse.mladsi.id === uzivatel.id &&
                                        !jeMinula)) && (
                                    <button
                                        onClick={() =>
                                            odhlasitSe(
                                                mse.mladsi!.rozpis_id,
                                                jeMinula,
                                            )
                                        }
                                        title="Odhlásit ze služby"
                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors p-1"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        ) : !jeMinula && uzivatel.kategorie === "mladsi" ? (
                            <button
                                onClick={() => zapsatSe(mse.id, jeMinula)}
                                className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-semibold text-sm hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <UserPlus size={18} /> Zapsat se
                            </button>
                        ) : (
                            <div className="text-slate-400 text-sm text-center py-2 italic">
                                Určeno pro mladší
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div data-tour="horni-karty" className="grid grid-cols-2 gap-4">
                <button
                    onClick={otevritMojeSluzby}
                    className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-3xl shadow-lg shadow-indigo-200/50 text-white flex flex-col justify-center text-left hover:scale-[1.02] transition-transform"
                >
                    <span className="text-4xl font-black tracking-tighter">
                        {mojeMse.length}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-indigo-100 mt-1">
                        Moje služby
                    </span>
                </button>
                <button
                    onClick={() => setStatistikaOtevrena(true)}
                    className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-center text-left hover:scale-[1.02] transition-transform"
                >
                    <span className="text-4xl font-black tracking-tighter text-emerald-500">
                        {uzivatel.kategorie === "vedouci"
                            ? "Přehled"
                            : mojeUmisteni
                              ? `${mojeUmisteni.poradi}. místo`
                              : "—"}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-400 mt-1">
                        {uzivatel.kategorie === "vedouci"
                            ? "Statistika (Vedoucí)"
                            : `Aktivita 60 dní (${uzivatel.kategorie === "starsi" ? "Starší" : "Mladší"})`}
                    </span>
                </button>
            </div>

            <div
                data-tour="spolecny-cil"
                className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50/80 to-orange-100/80 p-5 rounded-3xl shadow-sm shadow-orange-100/80 border border-orange-200/90 space-y-3.5"
            >
                <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-orange-300/20 blur-2xl" />

                <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-300/50">
                            {cilSplnen ? (
                                <Trophy size={20} />
                            ) : (
                                <Flame size={20} />
                            )}
                        </div>
                        <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-extrabold text-orange-950">
                                    Společný cíl farnosti
                                </p>
                                {cilSplnen && (
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-orange-600 text-white px-2 py-0.5 rounded-full">
                                        Splněno!
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-orange-900/80 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-snug">
                                <span>
                                    Cíl:{" "}
                                    <strong className="text-orange-950">
                                        {appConfig.communityGoalTarget} % plně
                                        obsazených mší
                                    </strong>{" "}
                                    (starší i mladší)
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="hidden sm:inline text-orange-400"
                                >
                                    •
                                </span>
                                <span className="font-semibold text-orange-700">
                                    Splníme to a čeká nás odměna!
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="text-right shrink-0">
                        <span className="text-2xl font-black tracking-tight text-orange-600 leading-none">
                            {celkemProbehlych > 0
                                ? `${procentoObsazenosti} %`
                                : "—"}
                        </span>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700/70 mt-1">
                            {celkemProbehlych > 0
                                ? `${plneObsazenychMsi} / ${celkemProbehlych} mší`
                                : `cíl ${appConfig.communityGoalTarget} %`}
                        </p>
                    </div>
                </div>

                <div className="relative z-10 pt-1">
                    <div className="relative h-3.5 bg-orange-200/70 rounded-full p-0.5 shadow-inner">
                        <div
                            style={{
                                width: `${Math.min(100, procentoObsazenosti)}%`,
                            }}
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 shadow-xs"
                        />
                        <div
                            style={{
                                left: `${appConfig.communityGoalTarget}%`,
                            }}
                            title={`Cíl ${appConfig.communityGoalTarget} %`}
                            className="absolute -top-1 -bottom-1 w-0.5 bg-orange-950 rounded-full"
                        >
                            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-orange-950 ring-2 ring-orange-100" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                <button
                    onClick={() => zmenMesic(subMonths(aktualniMesic, 1))}
                    className="p-3 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <h2 className="text-base font-bold capitalize text-slate-800 tracking-wide">
                    {format(aktualniMesic, "LLLL yyyy", { locale: cs })}
                </h2>
                <button
                    onClick={() => zmenMesic(addMonths(aktualniMesic, 1))}
                    className="p-3 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            <div data-tour="seznam-msi" className="space-y-5">
                {nacitaMse && mseData.length === 0 ? (
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div
                                key={i}
                                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 animate-pulse h-44"
                            />
                        ))}
                    </div>
                ) : (
                    <>
                        {probehleMse.length > 0 && (
                            <div className="space-y-4">
                                <button
                                    onClick={() =>
                                        setProbehleRozbaleno(!probehleRozbaleno)
                                    }
                                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-slate-600 transition-colors shadow-sm"
                                >
                                    <div className="flex items-center gap-2.5 text-sm font-semibold">
                                        <History
                                            size={18}
                                            className="text-slate-400"
                                        />
                                        <span>
                                            {probehleRozbaleno
                                                ? "Skrýt proběhlé mše v tomto měsíci"
                                                : "Zobrazit proběhlé mše v tomto měsíci"}{" "}
                                            ({probehleMse.length})
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={18}
                                        className={`text-slate-400 transition-transform duration-200 ${probehleRozbaleno ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {probehleRozbaleno && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {probehleMse.map((mse) =>
                                            vykresliKartuMse(mse),
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {nadchazejiciMse.length === 0 &&
                        probehleMse.length === 0 ? (
                            <p className="text-center text-slate-400 py-8 text-sm">
                                V tomto měsíci zatím nejsou vypsané žádné mše.
                            </p>
                        ) : (
                            nadchazejiciMse.map((mse) => vykresliKartuMse(mse))
                        )}
                    </>
                )}
            </div>

            {mojeSluzbyOtevreno && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">
                                Moje služby v tomto měsíci
                            </h3>
                            <button
                                onClick={() => setMojeSluzbyOtevreno(false)}
                                className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {uzivatel.kategorie !== "vedouci" &&
                            gamifikaceCache && (
                                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
                                            <Flame size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-orange-700">
                                                Týdenní série
                                            </p>
                                            <p className="text-lg font-black text-orange-950 leading-tight">
                                                {gamifikaceCache.aktualniSerie}{" "}
                                                {gamifikaceCache.aktualniSerie ===
                                                1
                                                    ? "týden"
                                                    : gamifikaceCache.aktualniSerie >=
                                                            2 &&
                                                        gamifikaceCache.aktualniSerie <=
                                                            4
                                                      ? "týdny"
                                                      : "týdnů"}{" "}
                                                v řadě
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600/80 block">
                                            Rekord
                                        </span>
                                        <span className="text-sm font-extrabold text-orange-800">
                                            {gamifikaceCache.nejdelsiSerie} týd.
                                        </span>
                                    </div>
                                </div>
                            )}

                        {mojeMse.length === 0 ? (
                            <p className="text-slate-500 text-center py-6">
                                Zatím nejsi zapsán na žádnou mši.
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
                                {mojeMse.map((mse) => (
                                    <div
                                        key={mse.id}
                                        className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                {format(
                                                    mse.datum,
                                                    "EEEE d. M.",
                                                    { locale: cs },
                                                )}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {format(mse.datum, "HH:mm")} •{" "}
                                                {mse.nazev}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {statistikaOtevrena && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    Statistika účasti
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Započítány jsou pouze již proběhlé mše
                                </p>
                            </div>
                            <button
                                onClick={() => setStatistikaOtevrena(false)}
                                className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl mb-6">
                            <button
                                onClick={() => prepniObdobiStatistiky("60_dni")}
                                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                                    obdobiStatistiky === "60_dni"
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Posledních 60 dní
                            </button>
                            <button
                                onClick={() =>
                                    prepniObdobiStatistiky("cela_doba")
                                }
                                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                                    obdobiStatistiky === "cela_doba"
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Celá doba
                            </button>
                        </div>

                        {nacitaStatistiku ? (
                            <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
                                Načítám kompletní historii...
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-1.5">
                                        <ShieldCheck size={16} /> Starší
                                        ministranti
                                    </h4>
                                    {aktivniStatistika.starsi.length === 0 ? (
                                        <p className="text-sm text-slate-400 italic">
                                            Žádní starší ministranti.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {aktivniStatistika.starsi.map(
                                                (osoba) => (
                                                    <div
                                                        key={osoba.id}
                                                        className={`flex justify-between items-center p-3 rounded-2xl border ${osoba.id === uzivatel.id ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-100"}`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="font-black text-indigo-600 w-5 text-sm">
                                                                {osoba.poradi}.
                                                            </span>
                                                            <Avatar
                                                                jmeno={
                                                                    osoba.jmeno
                                                                }
                                                                avatarUrl={
                                                                    osoba.avatar_url
                                                                }
                                                                uroven={
                                                                    osoba.uroven ||
                                                                    1
                                                                }
                                                                size="sm"
                                                                barvaPozadi="indigo"
                                                            />
                                                            <span className="font-medium text-slate-800 text-sm">
                                                                {osoba.jmeno}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 shrink-0">
                                                            {osoba.pocet} mší
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-1.5">
                                        <User size={16} /> Mladší ministranti
                                    </h4>
                                    {aktivniStatistika.mladsi.length === 0 ? (
                                        <p className="text-sm text-slate-400 italic">
                                            Žádní mladší ministranti.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {aktivniStatistika.mladsi.map(
                                                (osoba) => (
                                                    <div
                                                        key={osoba.id}
                                                        className={`flex justify-between items-center p-3 rounded-2xl border ${osoba.id === uzivatel.id ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"}`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="font-black text-emerald-600 w-5 text-sm">
                                                                {osoba.poradi}.
                                                            </span>
                                                            <Avatar
                                                                jmeno={
                                                                    osoba.jmeno
                                                                }
                                                                avatarUrl={
                                                                    osoba.avatar_url
                                                                }
                                                                uroven={
                                                                    osoba.uroven ||
                                                                    1
                                                                }
                                                                size="sm"
                                                                barvaPozadi="emerald"
                                                            />
                                                            <span className="font-medium text-slate-800 text-sm">
                                                                {osoba.jmeno}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 shrink-0">
                                                            {osoba.pocet} mší
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {dalsiMseId &&
                aktivniDalsiMse &&
                (() => {
                    const jeMinula = aktivniDalsiMse.datum < dnesPocatek;
                    const jsemZapsanVubec =
                        aktivniDalsiMse.starsi?.id === uzivatel.id ||
                        aktivniDalsiMse.mladsi?.id === uzivatel.id ||
                        aktivniDalsiMse.dalsi.some((d) => d.id === uzivatel.id);

                    return (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            Další ministranti
                                        </h3>
                                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                                            {format(
                                                aktivniDalsiMse.datum,
                                                "EEEE d. M.",
                                                { locale: cs },
                                            )}{" "}
                                            •{" "}
                                            {format(
                                                aktivniDalsiMse.datum,
                                                "HH:mm",
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setDalsiMseId(null)}
                                        className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                                    {aktivniDalsiMse.dalsi.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-6">
                                            Zatím se nepřihlásil žádný další
                                            ministrant.
                                        </p>
                                    ) : (
                                        aktivniDalsiMse.dalsi.map((d) => (
                                            <div
                                                key={d.rozpis_id}
                                                className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-2xl"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar
                                                        jmeno={d.jmeno}
                                                        avatarUrl={d.avatar_url}
                                                        uroven={d.uroven || 1}
                                                        size="sm"
                                                        barvaPozadi={
                                                            d.kategorie ===
                                                            "mladsi"
                                                                ? "emerald"
                                                                : d.kategorie ===
                                                                    "vedouci"
                                                                  ? "amber"
                                                                  : "indigo"
                                                        }
                                                    />
                                                    <div>
                                                        <p className="font-medium text-slate-700">
                                                            {d.jmeno}
                                                        </p>
                                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                            {d.kategorie ===
                                                            "starsi"
                                                                ? "Starší"
                                                                : d.kategorie ===
                                                                    "mladsi"
                                                                  ? "Mladší"
                                                                  : "Vedoucí"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {(isAdmin ||
                                                    (d.id === uzivatel.id &&
                                                        !jeMinula)) && (
                                                    <button
                                                        onClick={() =>
                                                            odhlasitSe(
                                                                d.rozpis_id,
                                                                jeMinula,
                                                            )
                                                        }
                                                        title="Odhlásit ze služby"
                                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {!jeMinula && !jsemZapsanVubec && (
                                    <button
                                        onClick={() =>
                                            zapsatSe(
                                                aktivniDalsiMse.id,
                                                jeMinula,
                                            )
                                        }
                                        className="w-full mt-5 py-3 rounded-xl bg-indigo-50 text-indigo-600 font-semibold text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <UserPlus size={18} /> Zapsat se jako
                                        další
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })()}
        </div>
    );
}
