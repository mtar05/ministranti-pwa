import {
    startOfISOWeek,
    subWeeks,
    subDays,
    differenceInCalendarDays,
} from "date-fns";
import { supabase } from "@/lib/supabase";
import { appConfig } from "@/config/appConfig";
import { GamifikaceSouhrn, StavOdznaku } from "@/types";

export const GAMIFIKACE_CACHE_KEY = "ministrant_gamifikace";

export function ziskejHodnostPodleXp(xp: number) {
    const ranks = appConfig.ranks;
    let aktualni = ranks[0];
    for (const r of ranks) {
        if (xp >= r.minXp) {
            aktualni = r;
        }
    }
    const dalsi = ranks.find((r) => r.uroven === aktualni.uroven + 1) || null;
    const xpDoDalsi = dalsi ? Math.max(0, dalsi.minXp - xp) : 0;
    const rozsah = dalsi ? dalsi.minXp - aktualni.minXp : 1;
    const procentoHodnosti = dalsi
        ? Math.min(100, Math.round(((xp - aktualni.minXp) / rozsah) * 100))
        : 100;

    return {
        uroven: aktualni.uroven,
        nazevHodnosti: aktualni.nazev,
        dalsiHodnostNazev: dalsi ? dalsi.nazev : null,
        xpDoDalsi,
        procentoHodnosti,
    };
}

export function formatujPredstih(hodiny: number | null): string {
    if (hodiny === null) return "—";
    if (hodiny < 1) {
        const minuty = Math.max(1, Math.round(hodiny * 60));
        return `${minuty} min. předem`;
    }
    if (hodiny < 24) {
        return `${Math.round(hodiny)} hod. předem`;
    }
    const dny = hodiny / 24;
    return `${dny.toFixed(1).replace(".", ",")} dne předem`;
}

export function vypocitejSerie(datumyMsi: Date[], ted = new Date()) {
    const tydnySet = new Set<number>();

    datumyMsi.forEach((d) => {
        tydnySet.add(startOfISOWeek(d).getTime());
    });

    if (tydnySet.size === 0) {
        return { aktualniSerie: 0, nejdelsiSerie: 0 };
    }

    const serazeneTydny = Array.from(tydnySet).sort((a, b) => a - b);
    let nejdelsiSerie = 1;
    let bezici = 1;

    for (let i = 1; i < serazeneTydny.length; i++) {
        const ocekavanyPredchozi = subWeeks(
            new Date(serazeneTydny[i]),
            1,
        ).getTime();
        if (serazeneTydny[i - 1] === ocekavanyPredchozi) {
            bezici += 1;
            if (bezici > nejdelsiSerie) nejdelsiSerie = bezici;
        } else {
            bezici = 1;
        }
    }

    const aktualniTydenStart = startOfISOWeek(ted);
    let kurzor: Date | null = null;

    if (tydnySet.has(aktualniTydenStart.getTime())) {
        kurzor = aktualniTydenStart;
    } else {
        const minulyTyden = subWeeks(aktualniTydenStart, 1);
        if (tydnySet.has(minulyTyden.getTime())) {
            kurzor = minulyTyden;
        }
    }

    let aktualniSerie = 0;
    while (kurzor && tydnySet.has(kurzor.getTime())) {
        aktualniSerie += 1;
        kurzor = subWeeks(kurzor, 1);
    }

    return { aktualniSerie, nejdelsiSerie };
}

export async function nactiGamifikaciUzivatele(
    ministrantId: string,
    vyhraneMesice: string[] = [],
): Promise<GamifikaceSouhrn> {
    const ted = new Date();
    const tedIso = ted.toISOString();
    const pred60Dny = subDays(ted, 60);

    const { data: mojeZapisy } = await supabase
        .from("rozpis_sluzeb")
        .select("id, mse_id, created_at, mse!inner(id, cas_zacatku)")
        .eq("ministrant_id", ministrantId)
        .lte("mse.cas_zacatku", tedIso)
        .order("created_at", { ascending: true });

    const unikatniZaznamyMap = new Map<string, any>();
    ((mojeZapisy || []) as any[]).forEach((z) => {
        if (!unikatniZaznamyMap.has(z.mse_id)) {
            unikatniZaznamyMap.set(z.mse_id, z);
        }
    });

    const zaznamy = Array.from(unikatniZaznamyMap.values());
    const mseIds = Array.from(unikatniZaznamyMap.keys());

    const partnerPocty: Record<string, number> = {};
    const dalsiMseSet = new Set<string>();

    if (mseIds.length > 0) {
        const { data: vsechnyZapisyNaMse } = await supabase
            .from("rozpis_sluzeb")
            .select(
                "id, mse_id, ministrant_id, created_at, ministranti(kategorie)",
            )
            .in("mse_id", mseIds)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true });

        const podleMse: Record<string, any[]> = {};
        (vsechnyZapisyNaMse || []).forEach((r: any) => {
            if (!podleMse[r.mse_id]) podleMse[r.mse_id] = [];
            podleMse[r.mse_id].push(r);
        });

        Object.entries(podleMse).forEach(([mseId, radky]) => {
            const hlavniStarsi = radky.find((r) => {
                const m = Array.isArray(r.ministranti)
                    ? r.ministranti[0]
                    : r.ministranti;
                return m?.kategorie === "starsi";
            });
            const hlavniMladsi = radky.find((r) => {
                const m = Array.isArray(r.ministranti)
                    ? r.ministranti[0]
                    : r.ministranti;
                return m?.kategorie === "mladsi";
            });

            const mujRadek = radky.find(
                (r) => r.ministrant_id === ministrantId,
            );
            if (
                mujRadek &&
                mujRadek !== hlavniStarsi &&
                mujRadek !== hlavniMladsi
            ) {
                dalsiMseSet.add(mseId);
            }

            const unikatniPartneri = new Set<string>();
            radky.forEach((r) => {
                if (r.ministrant_id && r.ministrant_id !== ministrantId) {
                    unikatniPartneri.add(r.ministrant_id);
                }
            });

            unikatniPartneri.forEach((partnerId) => {
                partnerPocty[partnerId] = (partnerPocty[partnerId] || 0) + 1;
            });
        });
    }

    const datumyMsi: Date[] = [];
    const tydnyDny: Record<number, Set<number>> = {};
    let za60Dni = 0;
    let utery = 0;
    let streda = 0;
    let ctvrtek = 0;
    let posledniDatum: Date | null = null;
    let soucetPredstihuHodiny = 0;
    let pocetPredstihu = 0;

    zaznamy.forEach((z) => {
        const mseObj = Array.isArray(z.mse) ? z.mse[0] : z.mse;
        if (!mseObj?.cas_zacatku) return;

        const datum = new Date(mseObj.cas_zacatku);
        datumyMsi.push(datum);

        if (datum >= pred60Dny) za60Dni += 1;
        if (!posledniDatum || datum > posledniDatum) posledniDatum = datum;

        const den = datum.getDay();
        if (den === 2) utery += 1;
        if (den === 3) streda += 1;
        if (den === 4) ctvrtek += 1;

        const tydenKey = startOfISOWeek(datum).getTime();
        if (!tydnyDny[tydenKey]) tydnyDny[tydenKey] = new Set();
        tydnyDny[tydenKey].add(den);

        if (z.created_at) {
            const zapsano = new Date(z.created_at);
            const rozdilMs = datum.getTime() - zapsano.getTime();
            if (rozdilMs >= 0) {
                soucetPredstihuHodiny += rozdilMs / (1000 * 60 * 60);
                pocetPredstihu += 1;
            }
        }
    });

    let hatTricky = 0;
    Object.values(tydnyDny).forEach((dnySet) => {
        if (dnySet.size >= 3) {
            hatTricky += 1;
        }
    });

    const celkemMsi = datumyMsi.length;
    const dalsiPocet = dalsiMseSet.size;
    const hlavniPocet = Math.max(0, celkemMsi - dalsiPocet);
    const maxKamos = Object.values(partnerPocty).reduce(
        (max, val) => (val > max ? val : max),
        0,
    );
    const { aktualniSerie, nejdelsiSerie } = vypocitejSerie(datumyMsi, ted);

    const xp = celkemMsi * 100 + hatTricky * 50;
    const hodnostInfo = ziskejHodnostPodleXp(xp);

    const soucetUtStCt = utery + streda + ctvrtek;
    const uteryProcenta =
        soucetUtStCt > 0 ? Math.round((utery / soucetUtStCt) * 100) : 0;
    const stredaProcenta =
        soucetUtStCt > 0 ? Math.round((streda / soucetUtStCt) * 100) : 0;
    const ctvrtekProcenta =
        soucetUtStCt > 0
            ? Math.max(0, 100 - uteryProcenta - stredaProcenta)
            : 0;

    const vyhranePocet = Array.isArray(vyhraneMesice)
        ? new Set(vyhraneMesice).size
        : 0;

    const hodnotyOdznaku: Record<string, number> = {
        prvni_jiskra: celkemMsi,
        nejlepsi_kamos: maxKamos,
        tymovy_partak: dalsiPocet,
        tydenni_hattrick: hatTricky,
        zelezna_serie: nejdelsiSerie,
        mesicni_aktivita: vyhranePocet,
        legenda_presbytare: celkemMsi,
    };

    const odznaky: StavOdznaku[] = appConfig.leaderBadges.map((b) => {
        const aktualni = hodnotyOdznaku[b.id] || 0;
        const odemceno = aktualni >= b.cil;
        return {
            ...b,
            obrazek: odemceno ? b.obrazek : b.silueta,
            aktualni: Math.min(aktualni, b.cil),
            odemceno,
        };
    });

    return {
        celkemMsi,
        za60Dni,
        hatTricky,
        xp,
        ...hodnostInfo,
        aktualniSerie,
        nejdelsiSerie,
        hlavniPocet,
        dalsiPocet,
        rozlozeniDnu: {
            utery,
            streda,
            ctvrtek,
            uteryProcenta,
            stredaProcenta,
            ctvrtekProcenta,
        },
        posledniMseIso: posledniDatum
            ? (posledniDatum as Date).toISOString()
            : null,
        dnyOdPosledni: posledniDatum
            ? differenceInCalendarDays(ted, posledniDatum as Date)
            : null,
        prumernyPredstihHodiny:
            pocetPredstihu > 0 ? soucetPredstihuHodiny / pocetPredstihu : null,
        odznaky,
    };
}
