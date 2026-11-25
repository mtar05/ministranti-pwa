CREATE TABLE IF NOT EXISTS public.ministranti (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    jmeno text NOT NULL,
    email text NOT NULL,
    telefon text,
    role text NOT NULL DEFAULT 'ministrant' CHECK (role IN ('admin', 'ministrant')),
    kategorie text NOT NULL DEFAULT 'mladsi' CHECK (kategorie IN ('starsi', 'mladsi', 'vedouci')),
    avatar_url text,
    uroven int NOT NULL DEFAULT 1,
    vyhrane_mesice jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mse (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nazev text NOT NULL,
    cas_zacatku timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rozpis_sluzeb (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mse_id uuid NOT NULL REFERENCES public.mse(id) ON DELETE CASCADE,
    ministrant_id uuid NOT NULL REFERENCES public.ministranti(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (mse_id, ministrant_id)
);

CREATE TABLE IF NOT EXISTS public.push_odbery (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ministrant_id uuid NOT NULL REFERENCES public.ministranti(id) ON DELETE CASCADE,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nastaveni_generovani (
    id int PRIMARY KEY DEFAULT 1,
    aktivni boolean NOT NULL DEFAULT false,
    pravidla jsonb NOT NULL DEFAULT '[]'::jsonb,
    posledni_generovani text,
    CONSTRAINT jeden_radek CHECK (id = 1)
);

INSERT INTO public.nastaveni_generovani (id, aktivni, pravidla)
VALUES (1, false, '[{"dny": [2, 3, 4], "cas": "18:00", "nazev": "Mše svatá"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.je_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.ministranti
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.ministranti (id, jmeno, email, telefon, kategorie)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'jmeno', split_part(NEW.email, '@', 1)),
        NEW.email,
        NULLIF(NEW.raw_user_meta_data->>'telefon', ''),
        COALESCE(NEW.raw_user_meta_data->>'kategorie', 'mladsi')
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.spolecny_cil_statistika(
    do_data timestamptz DEFAULT now()
)
RETURNS TABLE (celkem_probehlych int, plne_obsazenych int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH probehle AS (
        SELECT
            m.id,
            COALESCE(bool_or(min.kategorie = 'starsi'), false) AS ma_starsi,
            COALESCE(bool_or(min.kategorie = 'mladsi'), false) AS ma_mladsi
        FROM public.mse m
        LEFT JOIN public.rozpis_sluzeb r ON r.mse_id = m.id
        LEFT JOIN public.ministranti min ON min.id = r.ministrant_id
        WHERE m.cas_zacatku < do_data
        GROUP BY m.id
    )
    SELECT
        count(*)::int AS celkem_probehlych,
        count(*) FILTER (WHERE ma_starsi AND ma_mladsi)::int AS plne_obsazenych
    FROM probehle;
$$;

ALTER TABLE public.ministranti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rozpis_sluzeb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_odbery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nastaveni_generovani ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prihlaseni vidi cleny" ON public.ministranti
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Uzivatel upravi vlastni profil" ON public.ministranti
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admin spravuje cleny" ON public.ministranti
FOR ALL TO authenticated USING (public.je_admin());

CREATE POLICY "Prihlaseni vidi mse" ON public.mse
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin spravuje mse" ON public.mse
FOR ALL TO authenticated USING (public.je_admin());

CREATE POLICY "Prihlaseni vidi rozpis" ON public.rozpis_sluzeb
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Uzivatel zapise sebe" ON public.rozpis_sluzeb
FOR INSERT TO authenticated WITH CHECK (auth.uid() = ministrant_id OR public.je_admin());

CREATE POLICY "Uzivatel odhlasi sebe" ON public.rozpis_sluzeb
FOR DELETE TO authenticated USING (auth.uid() = ministrant_id OR public.je_admin());

CREATE POLICY "Uzivatel spravuje sve push odbery" ON public.push_odbery
FOR ALL TO authenticated USING (auth.uid() = ministrant_id OR public.je_admin());

CREATE POLICY "Admin spravuje nastaveni generovani" ON public.nastaveni_generovani
FOR ALL TO authenticated USING (public.je_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatary jsou verejne citelne"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Uzivatel nahraje vlastni avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Uzivatel upravi vlastni avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Uzivatel smaze vlastni avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);