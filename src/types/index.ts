export type Role = "admin" | "ministrant";
export type Kategorie = "starsi" | "mladsi" | "vedouci";

export interface Ministrant {
    id: string;
    jmeno: string;
    email: string;
    telefon?: string | null;
    role: Role;
    kategorie: Kategorie;
    avatar_url?: string | null;
    uroven?: number;
    vyhrane_mesice?: string[];
}

export interface SlotMinistrant {
    id: string;
    jmeno: string;
    kategorie?: Kategorie;
    avatar_url?: string | null;
    uroven?: number;
    rozpis_id: string;
}

export interface MsePolozka {
    id: string;
    datum: Date;
    nazev: string;
    starsi: SlotMinistrant | null;
    mladsi: SlotMinistrant | null;
    dalsi: SlotMinistrant[];
}

export interface StatistikaOsoba {
    id: string;
    jmeno: string;
    kategorie: Kategorie;
    avatar_url?: string | null;
    uroven?: number;
    pocet: number;
    poradi: number;
}

export interface PravidloGenerovani {
    dny: number[];
    cas: string;
    nazev: string;
}

export interface StavOdznaku {
    id: string;
    nazev: string;
    popis: string;
    obrazek: string;
    aktualni: number;
    cil: number;
    odemceno: boolean;
}

export interface GamifikaceSouhrn {
    celkemMsi: number;
    za60Dni: number;
    hatTricky: number;
    xp: number;
    uroven: number;
    nazevHodnosti: string;
    dalsiHodnostNazev: string | null;
    xpDoDalsi: number;
    procentoHodnosti: number;
    aktualniSerie: number;
    nejdelsiSerie: number;
    hlavniPocet: number;
    dalsiPocet: number;
    rozlozeniDnu: {
        utery: number;
        streda: number;
        ctvrtek: number;
        uteryProcenta: number;
        stredaProcenta: number;
        ctvrtekProcenta: number;
    };
    posledniMseIso: string | null;
    dnyOdPosledni: number | null;
    prumernyPredstihHodiny: number | null;
    odznaky: StavOdznaku[];
}
