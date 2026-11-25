const COMMUNITY_GOAL_TARGET = 90;

export const appConfig = {
    parishName: "Farnost ________",
    appName: "Ministranti",
    appShortName: "Ministranti",
    appDescription: "Rozpis služeb ministrantů",
    appVersion: "2.2.0",
    parishCode: process.env.NEXT_PUBLIC_PARISH_CODE || "",
    defaultMassName: "Mše svatá",
    defaultMassTime: "18:00",
    communityGoalTarget: COMMUNITY_GOAL_TARGET,
    notifications: {
        morningTitle: "Dnešní služba u oltáře",
        afternoonTitle: "Večerní připomenutí služby",
        scheduleTimesLabel: "Upozornění v 7:00 a 17:00",
    },
    whatsNew: [
        {
            title: "Tvůj profil, fotka s ořezem a kontakty",
            description:
                "Kliknutím na profilový obrázek v sekci Profil si nastavíš vlastní fotku s přesným výřezem obličeje. Kdykoliv si tam také doplníš nebo upravíš e-mail a telefon.",
            icon: "camera",
        },
        {
            title: "Hodnosti, rámečky a odznaky vedoucích",
            description:
                "Sbírej kreslené odznaky vedoucích, odemykej zdobené rámečky kolem profilovky a postupuj přes hodnosti až na Velmistra sakristie.",
            icon: "award",
        },
        {
            title: `Společný cíl farnosti (${COMMUNITY_GOAL_TARGET} %)`,
            description: `Na hlavní straně vidíš celkovou obsazenost proběhlých mší. Když společně udržíme plnou obsazenost nad ${COMMUNITY_GOAL_TARGET} %, čeká nás odměna!`,
            icon: "target",
        },
        {
            title: "Zápis jako „Další ministrant“",
            description:
                "Jsou hlavní místa Starší a Mladší obsazená? Klikni na ikonu skupinky u dané mše a přidej se jako další ministrant – mše se ti plně počítá do statistik i odznaků.",
            icon: "users",
        },
        {
            title: "Chytřejší seznam členů a statistiky",
            description:
                "V sekci Členové si jedním kliknutím zkopíruješ e-mail či telefon a kliknutím na profilovku ji zvětšíš. Admini po kliknutí na řádek vidí detailní statistiky člena.",
            icon: "barChart",
        },
        {
            title: "Spolehlivější upozornění a obnova hesla",
            description:
                "Notifikace v den služby chodí s vysokou prioritou, admin může posílat mimořádné zprávy a zapomenuté heslo si kdykoliv obnovíš přes e-mail.",
            icon: "bell",
        },
    ],
    guideSteps: {
        base: [
            {
                route: "/",
                target: "horni-karty",
                title: "Moje služby, série a statistiky",
                description:
                    "Vlevo vidíš počet svých služeb – po kliknutí se ukáže tvůj přehled i týdenní série. Vpravo otevřeš žebříček aktivity za posledních 60 dní i za celou dobu.",
                icon: "history",
            },
            {
                route: "/",
                target: "spolecny-cil",
                title: `Společný cíl farnosti (${COMMUNITY_GOAL_TARGET} %)`,
                description: `Tento ukazatel sleduje plně obsazené proběhlé mše za celou dobu (musí být zapsán starší i mladší). Když překonáme ${COMMUNITY_GOAL_TARGET} %, čeká nás odměna.`,
                icon: "target",
            },
            {
                route: "/",
                target: "seznam-msi",
                title: "Zapisování na mše a „Další ministrant“",
                description:
                    "Zapiš se ve svém sloupci. Jsou-li hlavní místa plná, klikni na ikonu skupinky vpravo nahoře u mše a přidej se jako další ministrant. Proběhlé mše najdeš sbalené nahoře.",
                icon: "calendar",
            },
            {
                route: "/clenove",
                target: "seznam-clenu",
                title: "Členové, rychlé kopírování a zvětšení fotky",
                description:
                    "U každého člena najdeš tlačítko pro okamžité zkopírování e-mailu nebo telefonu. Kliknutím přímo na profilový obrázek kohokoliv si fotku s rámečkem zvětšíš.",
                icon: "users",
            },
            {
                route: "/profil",
                target: "profil-avatar",
                title: "Profilová fotka a kontakty",
                description:
                    "Kliknutím na svůj avatar nahraješ fotku obličeje a posuneš si ji do výřezu. Hned níže si přes ikonu tužky upravíš e-mail či telefon a zapneš upozornění na mše.",
                icon: "user",
            },
            {
                route: "/profil",
                target: "profil-odznaky",
                title: "Hodnosti, rámečky a sbírka odznaků",
                description:
                    "Za každou odslouženou mši sbíráš XP, postupuješ v hodnostech, odemykáš zdobené rámečky kolem profilovky a sbíráš kreslené odznaky vedoucích.",
                icon: "award",
            },
        ],
        adminExtra: [
            {
                route: "/clenove",
                target: "seznam-clenu",
                title: "Správa členů a detailní statistiky (Admin)",
                description:
                    "Zde můžeš každému měnit roli a kategorii (Starší, Mladší, Vedoucí). Kliknutím kamkoliv na řádek člena (mimo avatar a tlačítka) otevřeš jeho detailní statistiky a předstih přihlašování.",
                icon: "shield",
            },
            {
                route: "/admin",
                target: "admin-nastroje",
                title: "Admin nástroje, notifikace a automatický rozpis",
                description:
                    "Odsud rozešleš push upozornění všem nebo konkrétnímu členovi, vytiskneš rozpis do sakristie a zapneš automatické generování mší vždy 15. dne v měsíci.",
                icon: "settings",
            },
        ],
    },
    ranks: [
        {
            uroven: 1,
            nazev: "Nováček",
            minXp: 0,
            maxXp: 599,
            ramecek: "/borders/ramecek-1.png",
        },
        {
            uroven: 2,
            nazev: "Světlonoš",
            minXp: 600,
            maxXp: 1199,
            ramecek: "/borders/ramecek-2.png",
        },
        {
            uroven: 3,
            nazev: "Nosič darů",
            minXp: 1200,
            maxXp: 1799,
            ramecek: "/borders/ramecek-3.png",
        },
        {
            uroven: 4,
            nazev: "Misálobijec",
            minXp: 1800,
            maxXp: 2399,
            ramecek: "/borders/ramecek-4.png",
        },
        {
            uroven: 5,
            nazev: "Pan Lektor",
            minXp: 2400,
            maxXp: 2999,
            ramecek: "/borders/ramecek-5.png",
        },
        {
            uroven: 6,
            nazev: "Mistr kadidelnice",
            minXp: 3000,
            maxXp: 3599,
            ramecek: "/borders/ramecek-6.png",
        },
        {
            uroven: 7,
            nazev: "Velmistr sakristie",
            minXp: 3600,
            maxXp: null,
            ramecek: "/borders/ramecek-7.png",
        },
    ],
    badgeBackground:
        "from-amber-50 via-yellow-50/70 to-orange-100/80 border-amber-300/90",
    leaderBadges: [
        {
            id: "prvni_jiskra",
            nazev: "První jiskra",
            popis: "Odsloužena 1. mše",
            cil: 1,
            obrazek: "/badges/odznak-1.png",
            silueta: "/badges/silueta-1.png",
        },
        {
            id: "nejlepsi_kamos",
            nazev: "Nejlepší kámoš",
            popis: "5× mše se stejným parťákem",
            cil: 5,
            obrazek: "/badges/odznak-2.png",
            silueta: "/badges/silueta-2.png",
        },
        {
            id: "tymovy_partak",
            nazev: "Týmový parťák",
            popis: "5× zapsán jako Další ministrant",
            cil: 5,
            obrazek: "/badges/odznak-3.png",
            silueta: "/badges/silueta-3.png",
        },
        {
            id: "tydenni_hattrick",
            nazev: "Týdenní hat-trick",
            popis: "3 odsloužené mše v jednom týdnu",
            cil: 1,
            obrazek: "/badges/odznak-4.png",
            silueta: "/badges/silueta-4.png",
        },
        {
            id: "zelezna_serie",
            nazev: "Železná série",
            popis: "4 týdny v řadě u oltáře",
            cil: 4,
            obrazek: "/badges/odznak-5.png",
            silueta: "/badges/silueta-5.png",
        },
        {
            id: "mesicni_aktivita",
            nazev: "Měsíční aktivita",
            popis: "Nejaktivnější v měsíci",
            cil: 1,
            obrazek: "/badges/odznak-6.png",
            silueta: "/badges/silueta-6.png",
        },
        {
            id: "legenda_presbytare",
            nazev: "Legenda presbytáře",
            popis: "30 odsloužených mší celkem",
            cil: 30,
            obrazek: "/badges/odznak-7.png",
            silueta: "/badges/silueta-7.png",
        },
    ],
};
