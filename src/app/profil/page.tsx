"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
    Mail,
    Phone,
    Bell,
    BatteryCharging,
    ShieldAlert,
    Edit2,
    Check,
    X,
    ExternalLink,
    Camera,
    Trash2,
    Flame,
    Award,
    HelpCircle,
    Lock,
    Sparkles,
} from "lucide-react";
import { appConfig } from "@/config/appConfig";
import { Ministrant, GamifikaceSouhrn, StavOdznaku } from "@/types";
import {
    nactiGamifikaciUzivatele,
    GAMIFIKACE_CACHE_KEY,
} from "@/lib/gamifikace";
import Avatar from "@/components/Avatar";
import AvatarCropModal from "@/components/AvatarCropModal";

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

const nazevKategorie = (kat: string) => {
    if (kat === "starsi") return "Starší";
    if (kat === "mladsi") return "Mladší";
    return "Vedoucí";
};

function KartaOdznaku({
    odznak,
    onVybrat,
}: {
    odznak: StavOdznaku;
    onVybrat: (o: StavOdznaku) => void;
}) {
    const [chybaObrazku, setChybaObrazku] = useState(false);
    const procenta = Math.round((odznak.aktualni / odznak.cil) * 100);

    useEffect(() => {
        setChybaObrazku(false);
    }, [odznak.obrazek]);

    return (
        <button
            type="button"
            onClick={() => onVybrat(odznak)}
            className={`group relative overflow-hidden p-4 rounded-3xl border-2 flex flex-col items-center text-center transition-all duration-200 ${
                odznak.odemceno
                    ? `bg-gradient-to-b ${appConfig.badgeBackground} shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer`
                    : "bg-slate-50/90 border-slate-200/80 hover:border-slate-300 cursor-pointer"
            }`}
        >
            {odznak.odemceno && (
                <div className="pointer-events-none absolute -top-10 inset-x-0 h-24 bg-gradient-to-b from-white/75 to-transparent rounded-full blur-md" />
            )}

            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mb-3 z-10">
                {odznak.obrazek && !chybaObrazku ? (
                    <img
                        src={odznak.obrazek}
                        alt={odznak.odemceno ? odznak.nazev : "Zamčený odznak"}
                        onError={() => setChybaObrazku(true)}
                        className={`w-full h-full object-contain transition-transform duration-300 ${
                            odznak.odemceno
                                ? "drop-shadow-[0_10px_16px_rgba(15,23,42,0.22)] group-hover:scale-105"
                                : "opacity-20 scale-95"
                        }`}
                    />
                ) : (
                    <div
                        className={`w-24 h-24 rounded-full flex items-center justify-center ${
                            odznak.odemceno
                                ? "bg-white/80 shadow-inner"
                                : "bg-slate-200/70 border-2 border-dashed border-slate-300"
                        }`}
                    >
                        {odznak.odemceno ? (
                            <Award size={44} className="text-amber-500" />
                        ) : (
                            <Lock size={34} className="text-slate-400" />
                        )}
                    </div>
                )}
            </div>

            <p
                className={`text-sm font-extrabold leading-tight z-10 ${
                    odznak.odemceno ? "text-slate-900" : "text-slate-500"
                }`}
            >
                {odznak.nazev}
            </p>
            <p
                className={`text-[11px] mt-1 leading-snug z-10 ${
                    odznak.odemceno
                        ? "font-semibold text-slate-700"
                        : "text-slate-500"
                }`}
            >
                {odznak.popis}
            </p>

            {!odznak.odemceno ? (
                <div className="w-full mt-3 space-y-1 z-10">
                    <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                            style={{ width: `${procenta}%` }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400">
                        {odznak.aktualni} / {odznak.cil}
                    </p>
                </div>
            ) : (
                <span className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 shadow-xs z-10">
                    <Sparkles size={10} /> Odemčeno
                </span>
            )}
        </button>
    );
}

export default function Profil() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uzivatel, setUzivatel] = useState<Ministrant | null>(null);
    const [gamifikace, setGamifikace] = useState<GamifikaceSouhrn | null>(null);
    const [upravujeSe, setUpravujeSe] = useState(false);
    const [editEmail, setEditEmail] = useState("");
    const [editTelefon, setEditTelefon] = useState("");
    const [nahravaAvatar, setNahravaAvatar] = useState(false);
    const [avatarModalOtevren, setAvatarModalOtevren] = useState(false);
    const [baterieModalOtevren, setBaterieModalOtevren] = useState(false);
    const [detailOdznaku, setDetailOdznaku] = useState<StavOdznaku | null>(
        null,
    );
    const [vybranySoubor, setVybranySoubor] = useState<File | null>(null);

    useEffect(() => {
        const ulozeny = localStorage.getItem("ministrant_profil");
        if (ulozeny) {
            const parsed = JSON.parse(ulozeny);
            setUzivatel(parsed);
            setEditEmail(parsed?.email || "");
            setEditTelefon(parsed?.telefon || "");
        }

        const ulozenaGamifikace = localStorage.getItem(GAMIFIKACE_CACHE_KEY);
        if (ulozenaGamifikace) {
            try {
                setGamifikace(JSON.parse(ulozenaGamifikace));
            } catch {
                localStorage.removeItem(GAMIFIKACE_CACHE_KEY);
            }
        }

        const nactiUzivatele = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }
            const { data } = await supabase
                .from("ministranti")
                .select("*")
                .eq("id", session.user.id)
                .single();

            if (data) {
                const profil = data as Ministrant;
                setUzivatel(profil);
                setEditEmail(profil.email || "");
                setEditTelefon(profil.telefon || "");
                localStorage.setItem(
                    "ministrant_profil",
                    JSON.stringify(profil),
                );

                const vysledek = await nactiGamifikaciUzivatele(
                    profil.id,
                    profil.vyhrane_mesice || [],
                );
                setGamifikace(vysledek);
                localStorage.setItem(
                    GAMIFIKACE_CACHE_KEY,
                    JSON.stringify(vysledek),
                );

                if (vysledek.uroven !== (profil.uroven || 1)) {
                    await supabase
                        .from("ministranti")
                        .update({ uroven: vysledek.uroven })
                        .eq("id", profil.id);
                    const sUrovni = { ...profil, uroven: vysledek.uroven };
                    setUzivatel(sUrovni);
                    localStorage.setItem(
                        "ministrant_profil",
                        JSON.stringify(sUrovni),
                    );
                }
            }
        };
        nactiUzivatele();
    }, [router]);

    const vybratSouborAvatara = (e: React.ChangeEvent<HTMLInputElement>) => {
        const soubor = e.target.files?.[0];
        if (!soubor) return;
        setAvatarModalOtevren(false);
        setVybranySoubor(soubor);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const ulozitVyriznutyAvatar = async (blob: Blob) => {
        if (!uzivatel) return;

        setNahravaAvatar(true);
        try {
            const pripona = blob.type === "image/webp" ? "webp" : "jpg";
            const cesta = `${uzivatel.id}/avatar.${pripona}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(cesta, blob, {
                    contentType: blob.type,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from("avatars")
                .getPublicUrl(cesta);

            const verejnaUrl = `${urlData.publicUrl}?t=${Date.now()}`;

            const { error: dbError } = await supabase
                .from("ministranti")
                .update({ avatar_url: verejnaUrl })
                .eq("id", uzivatel.id);

            if (dbError) throw dbError;

            const aktualizovany = { ...uzivatel, avatar_url: verejnaUrl };
            setUzivatel(aktualizovany);
            localStorage.setItem(
                "ministrant_profil",
                JSON.stringify(aktualizovany),
            );
            setVybranySoubor(null);
        } catch (err: any) {
            alert("Nepodařilo se nahrát fotku: " + err.message);
        } finally {
            setNahravaAvatar(false);
        }
    };

    const smazatAvatar = async () => {
        if (!uzivatel || !uzivatel.avatar_url) return;
        if (!confirm("Opravdu chceš odstranit profilovou fotku?")) return;

        setNahravaAvatar(true);
        try {
            await supabase.storage
                .from("avatars")
                .remove([
                    `${uzivatel.id}/avatar.webp`,
                    `${uzivatel.id}/avatar.jpg`,
                ]);

            await supabase
                .from("ministranti")
                .update({ avatar_url: null })
                .eq("id", uzivatel.id);

            const aktualizovany = { ...uzivatel, avatar_url: null };
            setUzivatel(aktualizovany);
            localStorage.setItem(
                "ministrant_profil",
                JSON.stringify(aktualizovany),
            );
            setAvatarModalOtevren(false);
        } catch (err: any) {
            alert("Chyba při mazání fotky: " + err.message);
        } finally {
            setNahravaAvatar(false);
        }
    };

    const otevritEditaci = () => {
        if (!uzivatel) return;
        setEditEmail(uzivatel.email || "");
        setEditTelefon(uzivatel.telefon || "");
        setUpravujeSe(true);
    };

    const ulozitZmeny = async () => {
        if (!uzivatel) return;

        const cistyEmail = editEmail.trim();
        const cistyTelefon = editTelefon.trim() || null;

        if (!cistyEmail) {
            alert("E-mail nesmí být prázdný.");
            return;
        }

        if (cistyEmail !== uzivatel.email) {
            const { error: authError } = await supabase.auth.updateUser({
                email: cistyEmail,
            });
            if (authError) {
                alert(
                    "Chyba při změně e-mailu v přihlašovacím systému: " +
                        authError.message,
                );
                return;
            }
        }

        const { error } = await supabase
            .from("ministranti")
            .update({ email: cistyEmail, telefon: cistyTelefon })
            .eq("id", uzivatel.id);

        if (error) {
            alert("Chyba při ukládání dat: " + error.message);
        } else {
            const aktualizovany: Ministrant = {
                ...uzivatel,
                email: cistyEmail,
                telefon: cistyTelefon,
            };
            setUzivatel(aktualizovany);
            setEditEmail(cistyEmail);
            setEditTelefon(cistyTelefon || "");
            localStorage.setItem(
                "ministrant_profil",
                JSON.stringify(aktualizovany),
            );
            setUpravujeSe(false);
        }
    };

    const zapnoutUpozorneni = async () => {
        if (!uzivatel) return;
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            alert("Tvůj prohlížeč nepodporuje push notifikace.");
            return;
        }
        try {
            const registration =
                await navigator.serviceWorker.register("/sw.js");
            const permission = await Notification.requestPermission();

            if (permission !== "granted") {
                alert("Musíš povolit oznámení v nastavení prohlížeče.");
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
                ),
            });

            const subJson = subscription.toJSON();

            await supabase
                .from("push_odbery")
                .delete()
                .eq("endpoint", subJson.endpoint);

            const { error } = await supabase.from("push_odbery").insert({
                ministrant_id: uzivatel.id,
                endpoint: subJson.endpoint,
                p256dh: subJson.keys?.p256dh,
                auth: subJson.keys?.auth,
            });

            if (error) throw error;
            alert("Super! Upozornění na mše jsou aktivní.");
        } catch (error) {
            console.error(error);
            alert("Při aktivaci upozornění nastala chyba.");
        }
    };

    const otevritNastaveniAndroid = () => {
        window.location.href =
            "intent:#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;end";
    };

    const spustitPruvodce = () => {
        window.dispatchEvent(new Event("spustit-pruvodce"));
    };

    if (!uzivatel) return null;

    const aktualniUroven = gamifikace?.uroven || uzivatel.uroven || 1;
    const barvaPozadi =
        uzivatel.kategorie === "mladsi"
            ? "emerald"
            : uzivatel.kategorie === "vedouci"
              ? "amber"
              : "indigo";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={vybratSouborAvatara}
                className="hidden"
            />

            <div
                data-tour="profil-avatar"
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center relative"
            >
                <button
                    type="button"
                    onClick={() => setAvatarModalOtevren(true)}
                    className="relative group mb-5 mt-2 rounded-full focus:outline-none cursor-pointer"
                    title="Upravit profilovou fotku"
                >
                    <Avatar
                        jmeno={uzivatel.jmeno}
                        avatarUrl={uzivatel.avatar_url}
                        uroven={aktualniUroven}
                        size="lg"
                        barvaPozadi={barvaPozadi}
                    />
                    <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-slate-600 group-hover:text-indigo-600 shadow-md border border-slate-200 flex items-center justify-center z-20 transition-colors">
                        <Camera size={15} />
                    </span>
                </button>

                <h2 className="text-2xl font-bold text-slate-900">
                    {uzivatel.jmeno}
                </h2>

                <div className="flex flex-wrap justify-center gap-2 mt-2.5">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">
                        {nazevKategorie(uzivatel.kategorie)}
                    </span>
                    {gamifikace && (
                        <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1">
                            <Award size={13} /> {gamifikace.nazevHodnosti}
                        </span>
                    )}
                    {uzivatel.role === "admin" && (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <ShieldAlert size={14} /> Admin
                        </span>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
                <div className="absolute top-4 right-4 z-10">
                    {!upravujeSe ? (
                        <button
                            onClick={otevritEditaci}
                            className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-full transition-colors"
                        >
                            <Edit2 size={18} />
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={ulozitZmeny}
                                className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors"
                            >
                                <Check size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    setUpravujeSe(false);
                                    setEditEmail(uzivatel.email);
                                    setEditTelefon(uzivatel.telefon || "");
                                }}
                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 flex items-center gap-4 border-b border-slate-100">
                    <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
                        <Mail size={20} />
                    </div>
                    <div className="flex-1 pr-12">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            E-mail
                        </p>
                        {upravujeSe ? (
                            <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="w-full mt-1 border-b-2 border-indigo-500 outline-none text-slate-900 font-medium bg-transparent"
                            />
                        ) : (
                            <p className="font-medium text-slate-900">
                                {uzivatel.email}
                            </p>
                        )}
                    </div>
                </div>
                <div className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
                        <Phone size={20} />
                    </div>
                    <div className="flex-1 pr-12">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Telefon
                        </p>
                        {upravujeSe ? (
                            <input
                                type="tel"
                                value={editTelefon}
                                onChange={(e) => setEditTelefon(e.target.value)}
                                className="w-full mt-1 border-b-2 border-indigo-500 outline-none text-slate-900 font-medium bg-transparent"
                            />
                        ) : (
                            <p className="font-medium text-slate-900">
                                {uzivatel.telefon || (
                                    <span className="text-slate-400 italic">
                                        Nezadáno
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <button
                    onClick={zapnoutUpozorneni}
                    className="w-full bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Bell size={20} />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-slate-900">
                                {appConfig.notifications.scheduleTimesLabel}
                            </p>
                            <p className="text-xs text-slate-500">
                                Dostávej notifikaci v den své služby
                            </p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setBaterieModalOtevren(true)}
                    className="w-full bg-white p-4 rounded-3xl shadow-sm border border-indigo-100 flex items-center justify-between hover:bg-indigo-50/40 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BatteryCharging size={20} />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-slate-900">
                                Spolehlivost upozornění na pozadí
                            </p>
                            <p className="text-xs text-slate-500">
                                Vypni optimalizaci baterie, aby notifikace
                                chodily včas
                            </p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={spustitPruvodce}
                    className="w-full bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <HelpCircle size={20} />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-slate-900">
                                Spustit průvodce aplikací
                            </p>
                            <p className="text-xs text-slate-500">
                                Připomeň si všechny funkce krok za krokem
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {gamifikace && (
                <div
                    data-tour="profil-odznaky"
                    className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6"
                >
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Tvoje hodnost (Úroveň {gamifikace.uroven} / 7)
                            </p>
                            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                                {gamifikace.nazevHodnosti}
                            </h3>
                        </div>
                        <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 border border-orange-200 px-3.5 py-2 rounded-2xl font-extrabold text-sm">
                            <Flame size={18} />
                            {gamifikace.aktualniSerie} týd. série
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-indigo-600">
                                {gamifikace.xp} XP
                            </span>
                            <span className="text-slate-400">
                                {gamifikace.dalsiHodnostNazev
                                    ? `Ještě ${gamifikace.xpDoDalsi} XP na ${gamifikace.dalsiHodnostNazev}`
                                    : "Nejvyšší hodnost odemčena!"}
                            </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                style={{
                                    width: `${gamifikace.procentoHodnosti}%`,
                                }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            />
                        </div>
                        <p className="text-[11px] text-slate-400">
                            +100 XP za každou odslouženou mši • +50 XP bonus za
                            týdenní hat-trick (3 mše v jednom týdnu)
                        </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                            Rámečky hodností
                        </p>
                        <div className="flex gap-5 overflow-x-auto pb-2 pt-3 px-2">
                            {appConfig.ranks.map((r) => {
                                const odemcena = aktualniUroven >= r.uroven;
                                return (
                                    <div
                                        key={r.uroven}
                                        className={`flex flex-col items-center shrink-0 w-24 text-center ${
                                            odemcena ? "" : "opacity-45"
                                        }`}
                                    >
                                        <Avatar
                                            jmeno={uzivatel.jmeno}
                                            avatarUrl={uzivatel.avatar_url}
                                            uroven={r.uroven}
                                            size="md"
                                            barvaPozadi={barvaPozadi}
                                        />
                                        <p className="text-[11px] font-bold text-slate-800 mt-3 leading-tight">
                                            {r.nazev}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {r.minXp} XP
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Sběratelské odznaky vedoucích
                            </p>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                                {
                                    gamifikace.odznaky.filter((o) => o.odemceno)
                                        .length
                                }{" "}
                                / {gamifikace.odznaky.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                            {gamifikace.odznaky.map((odznak) => (
                                <KartaOdznaku
                                    key={odznak.id}
                                    odznak={odznak}
                                    onVybrat={(o) => setDetailOdznaku(o)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {avatarModalOtevren && (
                <div
                    onClick={() => setAvatarModalOtevren(false)}
                    className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center text-center space-y-5"
                    >
                        <div className="w-full flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">
                                Profilová fotka
                            </h3>
                            <button
                                onClick={() => setAvatarModalOtevren(false)}
                                className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="py-2">
                            <Avatar
                                jmeno={uzivatel.jmeno}
                                avatarUrl={uzivatel.avatar_url}
                                uroven={aktualniUroven}
                                size="lg"
                                barvaPozadi={barvaPozadi}
                            />
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed">
                            Nahraj prosím svou fotku, kde ti je dobře vidět do
                            obličeje – ať se v rozpisu i u oltáře navzájem hned
                            poznáme, hlavně noví kluci a vedoucí.
                        </p>

                        <div className="w-full space-y-2.5 pt-1">
                            <button
                                type="button"
                                disabled={nahravaAvatar}
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
                            >
                                <Camera size={18} />
                                {nahravaAvatar
                                    ? "Ukládám fotku..."
                                    : uzivatel.avatar_url
                                      ? "Vybrat novou fotku"
                                      : "Nahrát fotku"}
                            </button>

                            {uzivatel.avatar_url && (
                                <button
                                    type="button"
                                    disabled={nahravaAvatar}
                                    onClick={smazatAvatar}
                                    className="w-full py-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Odstranit současnou
                                    fotku
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {detailOdznaku && (
                <div
                    onClick={() => setDetailOdznaku(null)}
                    className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`rounded-3xl p-7 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center text-center relative border-2 ${
                            detailOdznaku.odemceno
                                ? `bg-gradient-to-b ${appConfig.badgeBackground}`
                                : "bg-white border-slate-200"
                        }`}
                    >
                        <button
                            onClick={() => setDetailOdznaku(null)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 bg-white/80 p-2 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="w-48 h-48 flex items-center justify-center my-2 relative">
                            {detailOdznaku.obrazek ? (
                                <img
                                    src={detailOdznaku.obrazek}
                                    alt={
                                        detailOdznaku.odemceno
                                            ? detailOdznaku.nazev
                                            : "Zamčený odznak"
                                    }
                                    className={`w-full h-full object-contain ${
                                        detailOdznaku.odemceno
                                            ? "drop-shadow-[0_16px_26px_rgba(15,23,42,0.28)]"
                                            : "opacity-20"
                                    }`}
                                />
                            ) : (
                                <div className="w-36 h-36 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                                    <Lock size={44} />
                                </div>
                            )}

                            {!detailOdznaku.odemceno && (
                                <span className="absolute bottom-3 right-5 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400">
                                    <Lock size={17} />
                                </span>
                            )}
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 mt-2">
                            {detailOdznaku.nazev}
                        </h3>
                        <p className="text-sm text-slate-600 mt-2">
                            {detailOdznaku.popis}
                        </p>

                        <div className="mt-4 w-full">
                            {detailOdznaku.odemceno ? (
                                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/90 text-xs font-extrabold uppercase tracking-wider text-amber-700 shadow-xs">
                                    <Sparkles size={14} /> Odznak odemčen
                                </span>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            style={{
                                                width: `${Math.round((detailOdznaku.aktualni / detailOdznaku.cil) * 100)}%`,
                                            }}
                                            className="h-full bg-indigo-500 rounded-full"
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-slate-500">
                                        Průběh: {detailOdznaku.aktualni} /{" "}
                                        {detailOdznaku.cil}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {baterieModalOtevren && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">
                                Nastavení baterie (Android)
                            </h3>
                            <button
                                onClick={() => setBaterieModalOtevren(false)}
                                className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed">
                            Některé telefony uspávají aplikace i prohlížeč{" "}
                            <strong>Chrome</strong>, takže upozornění přijdou až
                            po odemknutí. U této aplikace i u Chromu nastav
                            baterii takto:
                        </p>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Ukázka v nastavení telefonu (Využití baterie)
                            </p>
                            <div className="flex items-center gap-3 p-3 bg-indigo-50 border-2 border-indigo-500 rounded-xl">
                                <div className="w-4 h-4 rounded-full border-4 border-indigo-600 bg-white"></div>
                                <div>
                                    <p className="text-sm font-bold text-indigo-950">
                                        Bez omezení (Neomezovat)
                                    </p>
                                    <p className="text-xs text-indigo-700">
                                        Upozornění dorazí okamžitě i na zamčenou
                                        obrazovku
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2.5 opacity-50">
                                <div className="w-4 h-4 rounded-full border-2 border-slate-400"></div>
                                <span className="text-sm font-medium text-slate-700">
                                    Optimalizováno (Výchozí – zpožďuje zprávy)
                                </span>
                            </div>
                        </div>

                        <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <li>
                                Podrž prst na ikoně{" "}
                                <strong>{appConfig.appName}</strong> (a poté i
                                na ikoně <strong>Chrome</strong>) na ploše a
                                klepni na{" "}
                                <strong>(i) Informace o aplikaci</strong>.
                            </li>
                            <li>
                                Otevři sekci <strong>Baterie</strong> (nebo{" "}
                                <strong>Spořič baterie</strong>).
                            </li>
                            <li>
                                Přepni volbu na <strong>Bez omezení</strong>.
                            </li>
                        </ol>

                        <button
                            onClick={otevritNastaveniAndroid}
                            className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
                        >
                            <ExternalLink size={18} /> Otevřít nastavení
                            optimalizace
                        </button>
                    </div>
                </div>
            )}
            <AvatarCropModal
                soubor={vybranySoubor}
                ukladaSe={nahravaAvatar}
                onZrusit={() => setVybranySoubor(null)}
                onPotvrdit={ulozitVyriznutyAvatar}
            />
        </div>
    );
}
