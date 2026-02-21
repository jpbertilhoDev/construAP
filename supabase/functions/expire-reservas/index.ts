import Deno from 'https://deno.land/std@0.224.0/io/mod.ts'
// @ts-nocheck
// supabase/functions/expire-reservas/index.ts
// Scheduled daily: Supabase Dashboard → Edge Functions → expire-reservas → Schedule

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (_req: Request) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const today = new Date().toISOString().substring(0, 10)

    // Fetch all active reservas that have expired
    const { data: reservas, error: fetchErr } = await supabase
        .from('reservas')
        .select('id, fracao_id, tenant_id')
        .eq('estado', 'Ativa')
        .lt('data_expiracao', today)

    if (fetchErr) {
        console.error('Error fetching expired reservas:', fetchErr.message)
        return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 })
    }

    if (!reservas || reservas.length === 0) {
        console.log('No expired reservas found.')
        return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
    }

    let processed = 0
    const errors: string[] = []

    for (const r of reservas) {
        try {
            // Mark reserva as Expirada
            const { error: updErr } = await supabase
                .from('reservas')
                .update({ estado: 'Expirada' })
                .eq('id', r.id)
            if (updErr) throw new Error(updErr.message)

            // Return fracao to Disponível
            const { error: fracErr } = await supabase
                .from('fracoes')
                .update({ estado_comercial: 'Disponível', motivo_bloqueio: null })
                .eq('id', r.fracao_id)
            if (fracErr) throw new Error(fracErr.message)

            // Write audit log
            await supabase.from('audit_log').insert({
                tenant_id: r.tenant_id,
                table_name: 'reservas',
                record_id: r.id,
                action: 'UPDATE',
                old_value: { estado: 'Ativa' },
                new_value: { estado: 'Expirada' },
                changed_by: null,
                changed_at: new Date().toISOString(),
            })

            processed++
        } catch (e: any) {
            errors.push(`reserva ${r.id}: ${e.message}`)
            console.error(`Error processing reserva ${r.id}:`, e.message)
        }
    }

    console.log(`Processed ${processed} expired reservas. Errors: ${errors.length}`)
    return new Response(JSON.stringify({ processed, errors }), { status: 200 })
})
