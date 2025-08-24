import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  planId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');
    const token = authHeader.replace('Bearer ', '');

    // Use service role to bypass RLS for secure writes
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get user from token
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData.user) throw new Error('Failed to authenticate user');
    const user = userData.user;

    const { planId }: RequestBody = await req.json();
    if (!planId) throw new Error('planId is required');

    // Load plan to ensure it's free and get duration
    const { data: plan, error: planError } = await supabaseService
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) throw new Error('Subscription plan not found');
    const price = Number(plan.price || 0);
    if (price > 0) throw new Error('Selected plan is not free');

    // Compute dates
    const start = new Date();
    const end = new Date(start);
    const months = Number(plan.duration_months || 1);
    end.setMonth(end.getMonth() + months);

    // Upsert active subscription for user
    const { error: insertError } = await supabaseService
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: 'active',
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('create-free-subscription error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});