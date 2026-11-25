"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Church } from "lucide-react";
import { appConfig } from "@/config/appConfig";
import { Kategorie } from "@/types";

type RezimPrihlaseni =
    | "prihlaseni"
    | "registrace"
    | "zapomenute_heslo"
    | "nove_heslo";

export default function Login() {
    const [email, setEmail] = useState("");
    const [heslo, setHeslo] = useState("");
    const [noveHeslo, setNoveHeslo] = useState("");
    const [potvrzeniHesla, setPotvrzeniHesla] = useState("");
    const [jmeno, setJmeno] = useState("");
    const [telefon, setTelefon] = useState("");
    const [kategorie, setKategorie] = useState<Kategorie>("mladsi");
    const [farniKod, setFarniKod] = useState("");
    const [rezim, setRezim] = useState<RezimPrihlaseni>("prihlaseni");
    const [chyba, setChyba] = useState("");
    const [uspech, setUspech] = useState("");
    const [odesilaSe, setOdesilaSe] = useState(false);

    const router = useRouter();

    useEffect(() => {
        const zkontrolujObnovu = async () => {
            if (typeof window === "undefined") return;

            const search = window.location.search;
            const hash = window.location.hash;
            const jeObnovaVUrl =
                search.includes("obnova=1") ||
                search.includes("type=recovery") ||
                search.includes("code=") ||
                hash.includes("type=recovery");

            if (jeObnovaVUrl) {
                setRezim("nove_heslo");
                setChyba("");
                setUspech("");
                return;
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (session) {
                setRezim("nove_heslo");
                setChyba("");
                setUspech("");
            }
        };

        zkontrolujObnovu();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setRezim("nove_heslo");
                setChyba("");
                setUspech("");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const prepniRezim = (novyRezim: RezimPrihlaseni) => {
        setRezim(novyRezim);
        setChyba("");
        setUspech("");
        setFarniKod("");
    };

    const odeslat = async (e: React.FormEvent) => {
        e.preventDefault();
        setChyba("");
        setUspech("");
        setOdesilaSe(true);

        try {
            if (rezim === "registrace") {
                if (farniKod.trim() !== appConfig.parishCode) {
                    setChyba("Nesprávné farní heslo. Přístup odepřen.");
                    return;
                }

                const { error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: heslo,
                    options: {
                        data: {
                            jmeno: jmeno.trim(),
                            telefon: telefon.trim() || null,
                            kategorie,
                        },
                    },
                });

                if (error) {
                    setChyba(error.message);
                } else {
                    setUspech(
                        "Registrace byla úspěšná. Nyní se můžeš přihlásit.",
                    );
                    setRezim("prihlaseni");
                    setFarniKod("");
                }
            } else if (rezim === "zapomenute_heslo") {
                const { error } = await supabase.auth.resetPasswordForEmail(
                    email.trim(),
                    {
                        redirectTo: `${window.location.origin}/login?obnova=1`,
                    },
                );

                if (error) {
                    setChyba(error.message);
                } else {
                    setUspech(
                        "Odkaz pro obnovení hesla jsme odeslali na tvůj e-mail. Zkontroluj i složku Spam.",
                    );
                }
            } else if (rezim === "nove_heslo") {
                if (noveHeslo.length < 6) {
                    setChyba("Nové heslo musí mít alespoň 6 znaků.");
                    return;
                }
                if (noveHeslo !== potvrzeniHesla) {
                    setChyba("Hesla se neshodují.");
                    return;
                }

                const { error } = await supabase.auth.updateUser({
                    password: noveHeslo,
                });

                if (error) {
                    if (
                        error.message.includes(
                            "different from the old password",
                        )
                    ) {
                        setChyba(
                            "Nové heslo se musí lišit od původního hesla.",
                        );
                    } else if (
                        error.message.toLowerCase().includes("session")
                    ) {
                        setChyba(
                            "Platnost odkazu vypršela. Požádej o nový odkaz pro obnovení hesla.",
                        );
                    } else {
                        setChyba(error.message);
                    }
                } else {
                    window.location.replace("/");
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: heslo,
                });

                if (error) {
                    setChyba("Špatný e-mail nebo heslo.");
                } else {
                    router.push("/");
                    router.refresh();
                }
            }
        } finally {
            setOdesilaSe(false);
        }
    };

    const nadpis = () => {
        if (rezim === "registrace") return "Nová registrace";
        if (rezim === "zapomenute_heslo") return "Obnova hesla";
        if (rezim === "nove_heslo") return "Nastavení nového hesla";
        return "Přihlášení";
    };

    const textTlacitka = () => {
        if (odesilaSe) return "Zpracovávám...";
        if (rezim === "registrace") return "Vytvořit účet";
        if (rezim === "zapomenute_heslo") return "Odeslat ověřovací e-mail";
        if (rezim === "nove_heslo") return "Uložit nové heslo";
        return "Přihlásit se";
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 w-full max-w-sm">
                <div className="flex justify-center mb-3 text-indigo-600">
                    <Church size={48} strokeWidth={2} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-center text-slate-400 mb-1">
                    {appConfig.parishName}
                </p>
                <h2 className="text-2xl font-bold text-center text-slate-900 mb-6 tracking-tight">
                    {nadpis()}
                </h2>

                {chyba && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 border border-red-100 font-medium">
                        {chyba}
                    </div>
                )}

                {uspech && (
                    <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm mb-4 border border-emerald-100 font-medium">
                        {uspech}
                    </div>
                )}

                <form onSubmit={odeslat} className="space-y-4">
                    {rezim === "registrace" && (
                        <>
                            <input
                                type="text"
                                placeholder="Celé jméno"
                                value={jmeno}
                                onChange={(e) => setJmeno(e.target.value)}
                                required
                                autoComplete="name"
                                className="w-full p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all text-sm font-medium"
                            />
                            <input
                                type="tel"
                                placeholder="Telefon (nepovinné)"
                                value={telefon}
                                onChange={(e) => setTelefon(e.target.value)}
                                autoComplete="tel"
                                className="w-full p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all text-sm font-medium"
                            />
                            <select
                                value={kategorie}
                                onChange={(e) =>
                                    setKategorie(e.target.value as Kategorie)
                                }
                                className="w-full p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all text-sm font-medium"
                            >
                                <option value="mladsi">
                                    Mladší ministrant
                                </option>
                                <option value="starsi">
                                    Starší ministrant
                                </option>
                                <option value="vedouci">
                                    Vedoucí (pouze přehled)
                                </option>
                            </select>
                            <input
                                type="text"
                                placeholder="Tajné farní heslo"
                                value={farniKod}
                                onChange={(e) => setFarniKod(e.target.value)}
                                required
                                className="w-full p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all text-sm font-medium"
                            />
                        </>
                    )}

                    {rezim !== "nove_heslo" && (
                        <input
                            type="email"
                            placeholder="E-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all text-sm font-medium"
                        />
                    )}

                    {(rezim === "prihlaseni" || rezim === "registrace") && (
                        <input
                            type="password"
                            placeholder="Heslo (min. 6 znaků)"
                            value={heslo}
                            onChange={(e) => setHeslo(e.target.value)}
                            required
                            autoComplete={
                                rezim === "registrace"
                                    ? "new-password"
                                    : "current-password"
                            }
                            className="w-full p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all text-sm font-medium"
                        />
                    )}

                    {rezim === "nove_heslo" && (
                        <>
                            <input
                                type="password"
                                placeholder="Nové heslo (min. 6 znaků)"
                                value={noveHeslo}
                                onChange={(e) => setNoveHeslo(e.target.value)}
                                required
                                autoComplete="new-password"
                                className="w-full p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all text-sm font-medium"
                            />
                            <input
                                type="password"
                                placeholder="Potvrzení nového hesla"
                                value={potvrzeniHesla}
                                onChange={(e) =>
                                    setPotvrzeniHesla(e.target.value)
                                }
                                required
                                autoComplete="new-password"
                                className="w-full p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all text-sm font-medium"
                            />
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={odesilaSe}
                        className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm shadow-indigo-200"
                    >
                        {textTlacitka()}
                    </button>
                </form>

                {rezim === "prihlaseni" && (
                    <button
                        type="button"
                        onClick={() => prepniRezim("zapomenute_heslo")}
                        className="w-full mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                        Zapomněl jsem heslo
                    </button>
                )}

                {rezim === "nove_heslo" ? (
                    <button
                        type="button"
                        onClick={() => prepniRezim("prihlaseni")}
                        className="w-full mt-4 text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                        Zpět na přihlášení
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() =>
                            prepniRezim(
                                rezim === "prihlaseni"
                                    ? "registrace"
                                    : "prihlaseni",
                            )
                        }
                        className="w-full mt-4 text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                        {rezim === "prihlaseni"
                            ? "Nemám účet, chci se registrovat"
                            : "Zpět na přihlášení"}
                    </button>
                )}
            </div>
        </div>
    );
}
