import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const contactEmail =
    process.env.GMAIL_USER || process.env.EMAIL_USER || "admin@example.com";

webpush.setVapidDetails(
    `mailto:${contactEmail}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
);

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
    try {
        const { adminId, title, body, targetUserId } = await request.json();

        if (!adminId || !title || !body) {
            return NextResponse.json(
                { error: "Chybí povinné údaje." },
                { status: 400 },
            );
        }

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

        let query = supabaseAdmin
            .from("push_odbery")
            .select("id, endpoint, p256dh, auth");

        if (targetUserId) {
            query = query.eq("ministrant_id", targetUserId);
        }

        const { data: odbery, error } = await query;
        if (error) throw error;

        if (!odbery || odbery.length === 0) {
            return NextResponse.json({
                success: true,
                odeslano: 0,
                celkem: 0,
            });
        }

        let odeslano = 0;

        for (const sub of odbery) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    JSON.stringify({ title, body }),
                    {
                        headers: { Urgency: "high" },
                        TTL: 43200,
                    },
                );
                odeslano += 1;
            } catch (err: any) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await supabaseAdmin
                        .from("push_odbery")
                        .delete()
                        .eq("id", sub.id);
                }
            }
        }

        return NextResponse.json({
            success: true,
            odeslano,
            celkem: odbery.length,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
