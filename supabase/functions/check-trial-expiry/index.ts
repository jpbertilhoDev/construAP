// supabase/functions/check-trial-expiry/index.ts
// Scheduled daily: checks for expired trials and suspends tenants without payment.
// Schedule via: Supabase Dashboard > Edge Functions > check-trial-expiry > Schedule (daily)
// Or via pg_cron: SELECT cron.schedule('check-trials', '0 2 * * *', $$SELECT ... $$);

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = new Date().toISOString()

  // Find all trialing subscriptions that have expired
  const { data: expiredTrials, error: fetchErr } = await supabase
    .from('tenant_subscriptions')
    .select('id, tenant_id, plan_id, trial_ends_at, stripe_customer_id')
    .eq('status', 'trialing')
    .lt('trial_ends_at', now)

  if (fetchErr) {
    console.error('Error fetching expired trials:', fetchErr.message)
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 })
  }

  if (!expiredTrials || expiredTrials.length === 0) {
    console.log('No expired trials found.')
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
  }

  let processed = 0
  const errors: string[] = []

  for (const trial of expiredTrials) {
    try {
      // Check if tenant has a payment method (Stripe customer)
      // For now, since billing isn't integrated, all expired trials get suspended
      const hasPayment = trial.stripe_customer_id != null

      if (hasPayment) {
        // Has payment: convert to active subscription
        const { error: subErr } = await supabase
          .from('tenant_subscriptions')
          .update({
            status: 'active',
            current_period_start: now,
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          })
          .eq('id', trial.id)

        if (subErr) throw new Error(subErr.message)
      } else {
        // No payment: suspend the tenant
        // 1. Update subscription status
        const { error: subErr } = await supabase
          .from('tenant_subscriptions')
          .update({ status: 'suspended' })
          .eq('id', trial.id)

        if (subErr) throw new Error(subErr.message)

        // 2. Downgrade to free plan
        const { error: downgradeErr } = await supabase
          .from('tenant_subscriptions')
          .update({ plan_id: 'free' })
          .eq('id', trial.id)

        if (downgradeErr) throw new Error(downgradeErr.message)

        // 3. Update tenant status to suspended
        const { error: tenantErr } = await supabase
          .from('tenants')
          .update({
            status: 'suspended',
            suspended_at: now,
            suspension_reason: 'Trial expirado sem método de pagamento configurado.',
          })
          .eq('id', trial.tenant_id)

        if (tenantErr) throw new Error(tenantErr.message)

        // 4. Write audit log
        await supabase.from('audit_log').insert({
          tenant_id: trial.tenant_id,
          table_name: 'tenant_subscriptions',
          record_id: trial.id,
          action: 'UPDATE',
          old_value: { status: 'trialing', plan_id: trial.plan_id },
          new_value: { status: 'suspended', plan_id: 'free' },
          changed_by: null,
          changed_at: now,
        })
      }

      processed++
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      errors.push(`tenant ${trial.tenant_id}: ${message}`)
      console.error(`Error processing trial for tenant ${trial.tenant_id}:`, message)
    }
  }

  console.log(`Processed ${processed} expired trials. Errors: ${errors.length}`)
  return new Response(
    JSON.stringify({ processed, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
