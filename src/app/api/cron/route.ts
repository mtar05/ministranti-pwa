import { NextResponse } from "next/server";
import webpush from "web-push";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import {
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    format,
} from "date-fns";
import { appConfig } from "@/config/appConfig";
import { PravidloGenerovani } from "@/types";

const emailUser = process.env.GMAIL_USER || process.env.EMAIL_USER;
const emailPass = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS;

webpush.setVapidDetails(
    `mailto:${emailUser || "admin@example.com"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: emailUser,
        pass: emailPass,
    },
});

async function zpracujAutomatickeGenerovani() {
    const dnes = new Date();
    if (dnes.getDate() !== 15) return 0;

    const { data: nastaveni } = await supabase
        .from("nastaveni_generovani")
        .select("*")
        .eq("id", 1)
        .single();

    if (
        !nastaveni ||
        !nastaveni.aktivni ||
        !Array.isArray(nastaveni.pravidla) ||
        nastaveni.pravidla.length === 0
    ) {
        return 0;
    }

    const pristiMesic = addMonths(dnes, 1);
    const klicMesice = format(pristiMesic, "yyyy-MM");

    if (nastaveni.posledni_generovani === klicMesice) {
        return 0;
    }

    const start = startOfMonth(pristiMesic);
    const end = endOfMonth(pristiMesic);

    const { data: existujiciMse } = await supabase
        .from("mse")
        .select("cas_zacatku")
        .gte("cas_zacatku", start.toISOString())
        .lte("cas_zacatku", end.toISOString());

    const existujiciCasy = new Set(
        (existujiciMse || []).map((m: any) =>
            new Date(m.cas_zacatku).toISOString(),
        ),
    );

    const naVlozeni: { nazev: string; cas_zacatku: string }[] = [];
    const pravidla = nastaveni.pravidla as PravidloGenerovani[];

    const current = new Date(start);
    while (current <= end) {
        const denVTydnu = current.getDay();
        const datumStr = format(current, "yyyy-MM-dd");

        for (const pravidlo of pravidla) {
            if (pravidlo.dny.includes(denVTydnu)) {
                const isoCas = new Date(
                    `${datumStr}T${pravidlo.cas}:00`,
                ).toISOString();
                if (!existujiciCasy.has(isoCas)) {
                    naVlozeni.push({
                        nazev: pravidlo.nazev || appConfig.defaultMassName,
                        cas_zacatku: isoCas,
                    });
                    existujiciCasy.add(isoCas);
                }
            }
        }
        current.setDate(current.getDate() + 1);
    }

    if (naVlozeni.length > 0) {
        await supabase.from("mse").insert(naVlozeni);
    }

    await supabase
        .from("nastaveni_generovani")
        .update({ posledni_generovani: klicMesice })
        .eq("id", 1);

    return naVlozeni.length;
}

async function vyhodnotMesicniAktivitu() {
    const dnes = new Date();
    if (dnes.getDate() !== 1) return [];

    const minulyMesic = subMonths(dnes, 1);
    const klicMesice = format(minulyMesic, "yyyy-MM");
    const start = startOfMonth(minulyMesic).toISOString();
    const end = endOfMonth(minulyMesic).toISOString();

    const { data: mseData } = await supabase
        .from("mse")
        .select(
            "id, rozpis_sluzeb ( ministrant_id, created_at, ministranti ( id, kategorie, vyhrane_mesice ) )",
        )
        .gte("cas_zacatku", start)
        .lte("cas_zacatku", end);

    if (!mseData || mseData.length === 0) return [];

    const skore: Record<
        string,
        {
            id: string;
            kategorie: string;
            pocet: number;
            soucetCasuZapisu: number;
            vyhraneMesice: string[];
        }
    > = {};

    mseData.forEach((m: any) => {
        m.rozpis_sluzeb?.forEach((r: any) => {
            const min = Array.isArray(r.ministranti)
                ? r.ministranti[0]
                : r.ministranti;
            if (
                !min ||
                (min.kategorie !== "starsi" && min.kategorie !== "mladsi")
            ) {
                return;
            }
            if (!skore[min.id]) {
                skore[min.id] = {
                    id: min.id,
                    kategorie: min.kategorie,
                    pocet: 0,
                    soucetCasuZapisu: 0,
                    vyhraneMesice: Array.isArray(min.vyhrane_mesice)
                        ? min.vyhrane_mesice
                        : [],
                };
            }
            skore[min.id].pocet += 1;
            const ts = r.created_at
                ? new Date(r.created_at).getTime()
                : Date.now();
            skore[min.id].soucetCasuZapisu += ts;
        });
    });

    const vyberViteze = (kategorie: "starsi" | "mladsi") => {
        const kandidati = Object.values(skore)
            .filter((s) => s.kategorie === kategorie && s.pocet > 0)
            .sort((a, b) => {
                if (b.pocet !== a.pocet) return b.pocet - a.pocet;
                return (
                    a.soucetCasuZapisu / a.pocet - b.soucetCasuZapisu / b.pocet
                );
            });
        return kandidati[0] || null;
    };

    const vitezove = [vyberViteze("starsi"), vyberViteze("mladsi")].filter(
        Boolean,
    );
    const ulozeniId: string[] = [];

    for (const vitez of vitezove) {
        if (!vitez) continue;
        if (vitez.vyhraneMesice.includes(klicMesice)) continue;

        const noveMesice = [...vitez.vyhraneMesice, klicMesice];
        await supabase
            .from("ministranti")
            .update({ vyhrane_mesice: noveMesice })
            .eq("id", vitez.id);
        ulozeniId.push(vitez.id);
    }

    return ulozeniId;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && searchParams.get("secret") !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isMorning = searchParams.get("time") === "morning";

    let vygenerovanoMsi = 0;
    let mesicniVitezove: string[] = [];

    if (isMorning) {
        vygenerovanoMsi = await zpracujAutomatickeGenerovani();
        mesicniVitezove = await vyhodnotMesicniAktivitu();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data } = await supabase
        .from("mse")
        .select(
            `
            nazev, cas_zacatku,
            rozpis_sluzeb (
                ministranti ( id, jmeno, email, push_odbery ( id, endpoint, p256dh, auth ) )
            )
        `,
        )
        .gte("cas_zacatku", today.toISOString())
        .lt("cas_zacatku", tomorrow.toISOString());

    const mseList = data as any[];

    if (!mseList || mseList.length === 0) {
        return NextResponse.json({
            success: true,
            vygenerovanoMsi,
            mesicniVitezove,
            msg: "Žádné dnešní mše",
        });
    }

    for (const mse of mseList) {
        for (const rozpis of mse.rozpis_sluzeb) {
            const ministrant: any = Array.isArray(rozpis.ministranti)
                ? rozpis.ministranti[0]
                : rozpis.ministranti;

            if (!ministrant) continue;

            const title = isMorning
                ? appConfig.notifications.morningTitle
                : appConfig.notifications.afternoonTitle;
            const body = isMorning
                ? `Nezapomeň, dnes máš službu: ${mse.nazev}.`
                : `Těšíme se na tebe na blížící se mši: ${mse.nazev}.`;

            let pushUspesny = false;

            if (ministrant.push_odbery && ministrant.push_odbery.length > 0) {
                for (const sub of ministrant.push_odbery) {
                    try {
                        await webpush.sendNotification(
                            {
                                endpoint: sub.endpoint,
                                keys: { p256dh: sub.p256dh, auth: sub.auth },
                            },
                            JSON.stringify({ title, body }),
                            {
                                headers: {
                                    Urgency: "high",
                                },
                                TTL: 43200,
                            },
                        );
                        pushUspesny = true;
                    } catch (err: any) {
                        if (err.statusCode === 404 || err.statusCode === 410) {
                            await supabase
                                .from("push_odbery")
                                .delete()
                                .eq("id", sub.id);
                        }
                    }
                }
            }

            if (!pushUspesny && isMorning && ministrant.email && emailUser) {
                try {
                    await transporter.sendMail({
                        from: `"${appConfig.appName}" <${emailUser}>`,
                        to: ministrant.email,
                        subject: title,
                        text: `Ahoj ${ministrant.jmeno},\n\n${body}\n\nNemohli jsme ti doručit notifikaci na mobil, prosím zkontroluj si v aplikaci v sekci Profil zapnutí upozornění.\n\nPřejeme hezký den.`,
                    });
                } catch (e) {
                    console.error("E-mail se nepodařilo odeslat:", e);
                }
            }
        }
    }

    return NextResponse.json({
        success: true,
        vygenerovanoMsi,
        mesicniVitezove,
    });
}
