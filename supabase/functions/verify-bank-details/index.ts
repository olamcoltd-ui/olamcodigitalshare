import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BankVerificationRequest {
  account_number: string;
  bank_code: string;
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

interface AccountVerificationResponse {
  account_number: string;
  account_name: string;
  bank_id: number;
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

    const { account_number, bank_code }: BankVerificationRequest = await req.json();

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    if (!account_number || !bank_code) {
      throw new Error('Account number and bank code are required');
    }

    // First, get the list of banks to find the bank name
    const banksResponse = await fetch('https://api.paystack.co/bank', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const banksData = await banksResponse.json();
    if (!banksData.status) {
      throw new Error('Failed to fetch banks list');
    }

    const bank = banksData.data.find((b: PaystackBank) => b.code === bank_code);
    if (!bank) {
      throw new Error('Invalid bank code');
    }

    // Verify account details
    const verifyResponse = await fetch(`https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const verifyData = await verifyResponse.json();
    
    if (!verifyData.status) {
      throw new Error(verifyData.message || 'Account verification failed');
    }

    console.log('Account verified:', verifyData.data);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          account_number: verifyData.data.account_number,
          account_name: verifyData.data.account_name,
          bank_name: bank.name,
          bank_code: bank.code
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Bank verification error:', error);
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