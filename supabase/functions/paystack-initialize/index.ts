import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaystackRequest {
  email: string;
  amount: number;
  productId?: string;
  planId?: string;
  referralCode?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { email, amount, productId, planId, referralCode }: PaystackRequest = await req.json();

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    console.log('Paystack secret key check:', paystackSecretKey ? 'Available' : 'Missing');
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY environment variable is not set');
      throw new Error('Paystack secret key not configured');
    }

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Convert to kobo
        callback_url: `${req.headers.get('origin')}/payment/success`,
        metadata: {
          productId,
          planId,
          referralCode,
          custom_fields: [
            {
              display_name: "Product ID",
              variable_name: "product_id",
              value: productId || ''
            }
          ]
        }
      }),
    });

    const paystackData = await paystackResponse.json();
    
    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Failed to initialize payment');
    }

    console.log('Payment initialized:', paystackData.data);

    return new Response(
      JSON.stringify({
        success: true,
        data: paystackData.data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Payment initialization error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});