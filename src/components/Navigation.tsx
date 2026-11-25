"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    CalendarDays,
    Users,
    Church,
    User,
    LogOut,
    Settings,
} from "lucide-react";
import { appConfig } from "@/config/appConfig";

export default function Navigation() {
    const pathname = usePathname();
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [nacitaSe, setNacitaSe] = useState(true);

    const nactiRoli = async (userId: string) => {
        const { data } = await supabase
            .from("ministranti")
            .select("role")
            .eq("id", userId)
            .single();
        setRole(data?.role || null);
        setNacitaSe(false);
    };

    const odhlasitSe = async () => {
        localStorage.removeItem("ministrant_profil");
        await supabase.auth.signOut();
        router.push("/login");
    };

    useEffect(() => {
        const ulozeny = localStorage.getItem("ministrant_profil");
        if (ulozeny) {
            const parsed = JSON.parse(ulozeny);
            setRole(parsed?.role || null);
            setNacitaSe(false);
        }

        const overPristup = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                localStorage.removeItem("ministrant_profil");
                setRole(null);
                if (pathname !== "/login") router.push("/login");
                setNacitaSe(false);
                return;
            }

            await nactiRoli(session.user.id);
        };

        overPristup();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                nactiRoli(session.user.id);
            } else {
                localStorage.removeItem("ministrant_profil");
                setRole(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname, router]);

    if (pathname === "/login" || nacitaSe) return null;

    const aktivniTridaDesktop = (cesta: string) =>
        pathname === cesta
            ? "text-sm font-bold text-indigo-600"
            : "text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors";

    const aktivniTridaMobil = (cesta: string) =>
        pathname === cesta
            ? "flex flex-col items-center justify-center gap-1 text-indigo-600 bg-indigo-50 w-16 h-14 rounded-full transition-all"
            : "flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 w-16 h-14 rounded-full transition-all";

    return (
        <>
            <nav className="print:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600">
                        <Church size={24} strokeWidth={2.5} />
                        <h1 className="text-lg font-bold tracking-tight text-slate-900">
                            {appConfig.parishName}
                        </h1>
                        <button
                            onClick={odhlasitSe}
                            title="Odhlásit se"
                            className="ml-1 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                    <div className="hidden md:flex gap-8">
                        <Link href="/" className={aktivniTridaDesktop("/")}>
                            Rozpis
                        </Link>
                        <Link
                            href="/clenove"
                            className={aktivniTridaDesktop("/clenove")}
                        >
                            Členové
                        </Link>
                        <Link
                            href="/profil"
                            className={aktivniTridaDesktop("/profil")}
                        >
                            Profil
                        </Link>
                        {role === "admin" && (
                            <Link
                                href="/admin"
                                className={aktivniTridaDesktop("/admin")}
                            >
                                Admin
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            <nav className="print:hidden md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full flex gap-1.5 p-2 z-50 shadow-lg shadow-slate-200/50">
                <Link href="/" className={aktivniTridaMobil("/")}>
                    <CalendarDays size={20} />
                    <span className="text-[10px] font-semibold">Rozpis</span>
                </Link>
                <Link href="/clenove" className={aktivniTridaMobil("/clenove")}>
                    <Users size={20} />
                    <span className="text-[10px] font-semibold">Členové</span>
                </Link>
                <Link href="/profil" className={aktivniTridaMobil("/profil")}>
                    <User size={20} />
                    <span className="text-[10px] font-semibold">Profil</span>
                </Link>
                {role === "admin" && (
                    <Link href="/admin" className={aktivniTridaMobil("/admin")}>
                        <Settings size={20} />
                        <span className="text-[10px] font-semibold">Admin</span>
                    </Link>
                )}
            </nav>
        </>
    );
}
