import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Využíváme SERVICE_ROLE_KEY pro plný přístup do databáze vč. tabulky auth.users
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function DELETE(request: Request) {
    try {
        const { userId, adminId } = await request.json();

        if (!userId || !adminId) {
            return NextResponse.json(
                { error: "Chybí parametry" },
                { status: 400 },
            );
        }

        // 1. Ověření, že požadavek skutečně posílá administrátor
        const { data: adminData } = await supabaseAdmin
            .from("ministranti")
            .select("role")
            .eq("id", adminId)
            .single();

        if (adminData?.role !== "admin") {
            return NextResponse.json(
                { error: "K této akci nemáte oprávnění." },
                { status: 403 },
            );
        }

        // 2. Odstranění závislostí z veřejných tabulek
        await supabaseAdmin
            .from("rozpis_sluzeb")
            .delete()
            .eq("ministrant_id", userId);
        await supabaseAdmin
            .from("push_odbery")
            .delete()
            .eq("ministrant_id", userId);
        await supabaseAdmin.from("ministranti").delete().eq("id", userId);

        // 3. Smazání samotného účtu z autentizačního systému
        const { error: authError } =
            await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) throw authError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
