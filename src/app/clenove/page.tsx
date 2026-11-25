"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Ministrant, Kategorie, Role } from "@/types";
import Avatar from "@/components/Avatar";
import RoleCategorySelect from "@/components/RoleCategorySelect";
import MemberDetailModal from "@/components/MemberDetailModal";

const formatujEmail = (email: string) => {
    if (!email) return "";
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    return (
        <>
            {parts[0]}@<wbr />
            {parts[1]}
        </>
    );
};

const ROLE_OPTIONS: {
    value: Role;
    label: string;
    dotClass: string;
    badgeClass: string;
}[] = [
    {
        value: "ministrant",
        label: "Ministrant",
        dotClass: "bg-slate-400",
        badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
    },
    {
        value: "admin",
        label: "Admin",
        dotClass: "bg-indigo-500",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
];

const KATEGORIE_OPTIONS: {
    value: Kategorie;
    label: string;
    dotClass: string;
    badgeClass: string;
}[] = [
    {
        value: "mladsi",
        label: "Mladší",
        dotClass: "bg-emerald-500",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
        value: "starsi",
        label: "Starší",
        dotClass: "bg-indigo-500",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    {
        value: "vedouci",
        label: "Vedoucí",
        dotClass: "bg-amber-500",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    },
];

export default function ClenovePage() {
    const router = useRouter();
    const [overeno, setOvereno] = useState(false);
    const [jeAdmin, setJeAdmin] = useState(false);
    const [prihlasenyId, setPrihlasenyId] = useState<string | null>(null);
    const [uzivatele, setUzivatele] = useState<Ministrant[]>([]);
    const [vybranyClen, setVybranyClen] = useState<Ministrant | null>(null);
    const [nahledAvatara, setNahledAvatara] = useState<Ministrant | null>(null);

    const nactiUzivatele = useCallback(async () => {
        const { data } = await supabase
            .from("ministranti")
            .select("*")
            .order("jmeno");
        if (data) setUzivatele(data as Ministrant[]);
    }, []);

    useEffect(() => {
        const overPristup = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }

            setPrihlasenyId(session.user.id);

            const ulozeny = localStorage.getItem("ministrant_profil");
            if (ulozeny) {
                const parsed = JSON.parse(ulozeny);
                setJeAdmin(parsed?.role === "admin");
            }

            const { data } = await supabase
                .from("ministranti")
                .select("role")
                .eq("id", session.user.id)
                .single();

            setJeAdmin(data?.role === "admin");
            setOvereno(true);
            nactiUzivatele();
        };

        overPristup();
    }, [router, nactiUzivatele]);

    const zmenUdajUzivatele = async (
        id: string,
        pole: "role" | "kategorie",
        hodnota: Role | Kategorie,
    ) => {
        const { error } = await supabase
            .from("ministranti")
            .update({ [pole]: hodnota })
            .eq("id", id);

        if (error) {
            alert("Chyba při ukládání změny: " + error.message);
            return;
        }

        setUzivatele((prev) =>
            prev.map((u) => (u.id === id ? { ...u, [pole]: hodnota } : u)),
        );
    };

    const smazatUzivatele = async (u: Ministrant) => {
        if (
            !confirm(
                `Opravdu chceš trvale smazat uživatele ${u.jmeno} včetně jeho zapsaných služeb?`,
            )
        ) {
            return;
        }

        try {
            const res = await fetch("/api/admin/uzivatel", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: u.id, adminId: prihlasenyId }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Neznámá chyba při mazání");
            }

            setUzivatele((prev) => prev.filter((item) => item.id !== u.id));
        } catch (error: any) {
            alert("Chyba při mazání uživatele: " + error.message);
        }
    };

    const aktualizujUrovenClena = useCallback((id: string, uroven: number) => {
        setUzivatele((prev) =>
            prev.map((u) => (u.id === id ? { ...u, uroven } : u)),
        );
    }, []);

    const vypisKategorii = (kat: Kategorie) => {
        if (kat === "starsi") return "Starší";
        if (kat === "mladsi") return "Mladší";
        return "Vedoucí";
    };

    const ziskejBarvyStitku = (typ: "role" | "kategorie", val: string) => {
        if (typ === "role") {
            return val === "admin"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-slate-50 text-slate-700 border-slate-200";
        }
        if (val === "starsi")
            return "bg-indigo-50 text-indigo-700 border-indigo-200";
        if (val === "mladsi")
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (val === "vedouci")
            return "bg-amber-50 text-amber-700 border-amber-200";
        return "bg-slate-50 text-slate-700 border-slate-200";
    };

    if (!overeno) return null;

    return (
        <div className="-mt-4 animate-in fade-in duration-500">
            <section>
                <div className="flex items-center mb-3">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                        <Users className="text-indigo-600" /> Seznam členů (
                        {uzivatele.length})
                    </h2>
                </div>

                <div
                    data-tour="seznam-clenu"
                    className="bg-white rounded-3xl shadow-sm border border-slate-200"
                >
                    <table className="block sm:table w-full text-left text-sm">
                        <thead className="hidden sm:table-header-group bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold sm:whitespace-nowrap rounded-tl-3xl">
                                    Jméno
                                </th>
                                <th className="px-6 py-4 font-semibold">
                                    Kontakt
                                </th>
                                <th
                                    className={`px-6 py-4 font-semibold ${
                                        !jeAdmin ? "rounded-tr-3xl" : ""
                                    }`}
                                >
                                    Role / Kategorie
                                </th>
                                {jeAdmin && (
                                    <th className="px-6 py-4 font-semibold text-right sm:whitespace-nowrap rounded-tr-3xl">
                                        Akce
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="block sm:table-row-group divide-y divide-slate-100">
                            {uzivatele.map((u, idx) => {
                                const roleBarvy = ziskejBarvyStitku(
                                    "role",
                                    u.role,
                                );
                                const katBarvy = ziskejBarvyStitku(
                                    "kategorie",
                                    u.kategorie,
                                );
                                const jeSpodni =
                                    uzivatele.length > 2 &&
                                    idx >= uzivatele.length - 2;
                                const jePosledni = idx === uzivatele.length - 1;
                                const barvaAvatara =
                                    u.kategorie === "mladsi"
                                        ? "emerald"
                                        : u.kategorie === "vedouci"
                                          ? "amber"
                                          : "indigo";

                                return (
                                    <tr
                                        key={u.id}
                                        onClick={() => {
                                            if (jeAdmin) setVybranyClen(u);
                                        }}
                                        className={`relative block sm:table-row hover:bg-slate-50 transition-colors px-3.5 py-2.5 sm:p-0 ${
                                            jeAdmin ? "cursor-pointer" : ""
                                        } ${jePosledni ? "rounded-b-3xl" : ""}`}
                                    >
                                        <td
                                            className={`block sm:table-cell sm:px-6 sm:py-3.5 font-bold sm:font-medium text-slate-900 sm:whitespace-nowrap pr-9 sm:pr-6 ${
                                                jePosledni
                                                    ? "sm:rounded-bl-3xl"
                                                    : ""
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setNahledAvatara(u);
                                                    }}
                                                    title="Zvětšit profilový obrázek"
                                                    className="rounded-full focus:outline-none hover:scale-105 transition-transform cursor-pointer shrink-0"
                                                >
                                                    <Avatar
                                                        jmeno={u.jmeno}
                                                        avatarUrl={u.avatar_url}
                                                        uroven={u.uroven || 1}
                                                        size="sm"
                                                        barvaPozadi={
                                                            barvaAvatara
                                                        }
                                                    />
                                                </button>
                                                <div className="min-w-0 flex-1 leading-tight">
                                                    <div className="truncate">
                                                        {u.jmeno}
                                                    </div>
                                                    <div className="sm:hidden text-[11px] font-normal text-slate-500 truncate mt-0.5">
                                                        {u.email}
                                                        {u.telefon
                                                            ? ` • ${u.telefon}`
                                                            : ""}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="hidden sm:table-cell sm:px-6 sm:py-3.5 text-slate-500">
                                            <div className="break-words">
                                                {formatujEmail(u.email)}
                                            </div>
                                            {u.telefon && (
                                                <div className="text-xs mt-0.5 whitespace-nowrap">
                                                    {u.telefon}
                                                </div>
                                            )}
                                        </td>

                                        <td
                                            className={`block sm:table-cell mt-2 sm:mt-0 sm:px-6 sm:py-3.5 ${
                                                jePosledni && !jeAdmin
                                                    ? "sm:rounded-br-3xl"
                                                    : ""
                                            }`}
                                        >
                                            {jeAdmin ? (
                                                <div className="grid grid-cols-2 sm:flex sm:flex-col gap-1.5 w-full sm:w-[138px]">
                                                    <div className="min-w-0">
                                                        <RoleCategorySelect
                                                            value={u.role}
                                                            options={
                                                                ROLE_OPTIONS
                                                            }
                                                            otevritNahoru={
                                                                jeSpodni
                                                            }
                                                            zarovnani="left"
                                                            onChange={(val) =>
                                                                zmenUdajUzivatele(
                                                                    u.id,
                                                                    "role",
                                                                    val,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <RoleCategorySelect
                                                            value={u.kategorie}
                                                            options={
                                                                KATEGORIE_OPTIONS
                                                            }
                                                            otevritNahoru={
                                                                jeSpodni
                                                            }
                                                            zarovnani="right"
                                                            onChange={(val) =>
                                                                zmenUdajUzivatele(
                                                                    u.id,
                                                                    "kategorie",
                                                                    val,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-row sm:flex-col gap-1.5 items-start">
                                                    <span
                                                        className={`px-2.5 py-0.5 sm:py-1 border rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${roleBarvy}`}
                                                    >
                                                        {u.role}
                                                    </span>
                                                    <span
                                                        className={`px-2.5 py-0.5 sm:py-1 border rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${katBarvy}`}
                                                    >
                                                        {vypisKategorii(
                                                            u.kategorie,
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        {jeAdmin && (
                                            <td
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                                className={`block sm:table-cell absolute top-2 right-2 sm:static sm:px-6 sm:py-3.5 sm:text-right ${
                                                    jePosledni
                                                        ? "sm:rounded-br-3xl"
                                                        : ""
                                                }`}
                                            >
                                                <button
                                                    onClick={() =>
                                                        smazatUzivatele(u)
                                                    }
                                                    title="Smazat uživatele"
                                                    className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {jeAdmin && (
                <MemberDetailModal
                    clen={vybranyClen}
                    onZavrit={() => setVybranyClen(null)}
                    onAktualizaceUrovne={aktualizujUrovenClena}
                />
            )}

            {nahledAvatara && (
                <div
                    onClick={() => setNahledAvatara(null)}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl p-7 w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center text-center relative"
                    >
                        <button
                            type="button"
                            onClick={() => setNahledAvatara(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="my-4 scale-125">
                            <Avatar
                                jmeno={nahledAvatara.jmeno}
                                avatarUrl={nahledAvatara.avatar_url}
                                uroven={nahledAvatara.uroven || 1}
                                size="lg"
                                barvaPozadi={
                                    nahledAvatara.kategorie === "mladsi"
                                        ? "emerald"
                                        : nahledAvatara.kategorie === "vedouci"
                                          ? "amber"
                                          : "indigo"
                                }
                            />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mt-4">
                            {nahledAvatara.jmeno}
                        </h3>
                        <span
                            className={`mt-2 px-3 py-1 border rounded-xl text-xs font-bold uppercase tracking-wider ${ziskejBarvyStitku(
                                "kategorie",
                                nahledAvatara.kategorie,
                            )}`}
                        >
                            {vypisKategorii(nahledAvatara.kategorie)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
