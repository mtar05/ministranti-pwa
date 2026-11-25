# Ministranti – PWA aplikace pro rozpis služeb

Moderní webová PWA aplikace (Next.js App Router, TypeScript, Tailwind CSS, Supabase, Web Push) pro zapisování ministrantů na mše, motivaci formou hodností a odznaků a automatická upozornění. Navrženo pro bezplatný provoz na Vercelu a Supabase.

## Hlavní funkce

- **Rozpis mší:** Zapisování do slotů Starší, Mladší a Další ministrant, automatické sbalení proběhlých mší.
- **Gamifikace:** 7 hodností se zdobenými rámečky avatarů, týdenní série, 7 sběratelských odznaků a společný cíl farnosti.
- **Profil a kontakty:** Profilová fotka s interaktivním kruhovým výřezem, rychlé kopírování e-mailu a telefonu, zvětšení avataru, obnova hesla e-mailem.
- **Administrace:** Automatické generování mší 15. dne v měsíci, odesílání vlastních push zpráv, detailní statistiky členů a tisk rozpisu.

## Jak nasadit pro vlastní farnost

### 1. Nastavení konfigurace a grafiky

1. Upravte `src/config/appConfig.ts` (název farnosti, cílové procento, názvy hodností a jména vedoucích u odznaků).
2. Do `public/badges/` nahrajte vlastní průhledné PNG obrázky (`vedouci-1.png` až `vedouci-7.png`).
3. Do `public/borders/` nahrajte průhledné PNG rámečky (`ramecek-1.png` až `ramecek-7.png`) a do `public/ikona.png` ikonu aplikace (`512x512`).

### 2. Databáze a autentizace v Supabase

1. Vytvořte bezplatný projekt na [Supabase](https://supabase.com).
2. V **SQL Editoru** spusťte celý obsah souboru `supabase/schema.sql`.
3. V **Authentication → URL Configuration → Redirect URLs** přidejte `https://vase-domena.vercel.app/login` (nutné pro obnovu zapomenutého hesla).
4. Po registraci prvního uživatele mu v **Table Editor → ministranti** ručně změňte sloupec `role` na `admin`.

### 3. VAPID klíče a proměnné prostředí

1. Vygenerujte VAPID klíče příkazem: `npx web-push generate-vapid-keys`
2. Podle `.env.example` vytvořte lokálně `.env.local` a všechny proměnné zadejte i do nastavení projektu na Vercelu.

### 4. Nasazení na Vercel a automatický Cron

1. Importujte repozitář na [Vercel](https://vercel.com) a vypněte _Deployment Protection → Vercel Authentication_.
2. Na [cron-job.org](https://cron-job.org) založte dvě denní úlohy (pásmo `Europe/Prague`):
    - **7:00:** `https://vase-domena.vercel.app/api/cron?time=morning&secret=VAS_CRON_SECRET`
    - **17:00:** `https://vase-domena.vercel.app/api/cron?time=afternoon&secret=VAS_CRON_SECRET`
