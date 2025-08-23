import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaystackBank {
  name: string;
  code: string;
  longcode: string;
  gateway: string;
  pay_with_bank: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  id: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
  const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  console.log('Secret Key check:', paystackSecretKey ? 'Available' : 'Missing');
  if (!paystackSecretKey) {
    console.error('PAYSTACK_SECRET_KEY environment variable is not set');
    throw new Error('Paystack secret key not configured');
  }

    // Get the list of Nigerian banks from Paystack
    const banksResponse = await fetch('https://api.paystack.co/bank?country=nigeria', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const banksData = await banksResponse.json();
    
    if (!banksData.status) {
      throw new Error(banksData.message || 'Failed to fetch banks list');
    }

    // Filter and sort banks for better UX - Include all active banks including fintech
    const activeBanks = banksData.data
      .filter((bank: PaystackBank) => bank.active && (bank.type === 'nuban' || bank.type === 'mobile_money'))
      .sort((a: PaystackBank, b: PaystackBank) => a.name.localeCompare(b.name))
      .map((bank: PaystackBank) => ({
        name: bank.name,
        code: bank.code,
        id: bank.id
      }));

    console.log('Fetched banks:', activeBanks.length);

    return new Response(
      JSON.stringify({
        success: true,
        data: activeBanks
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Banks fetch error:', error);
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