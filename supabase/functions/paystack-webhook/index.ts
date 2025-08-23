import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    // Verify Paystack signature
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    
    const expectedSignature = await crypto.subtle.digest(
      'SHA-512',
      new TextEncoder().encode(paystackSecretKey + body)
    );
    
    const hashArray = Array.from(new Uint8Array(expectedSignature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (signature !== hashHex) {
      console.log('Invalid signature');
      return new Response('Unauthorized', { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('Webhook event:', event);

    if (event.event === 'charge.success') {
      const { reference, amount, customer, metadata } = event.data;
      const { productId, planId, referralCode } = metadata;

      // Convert amount from kobo to naira
      const amountInNaira = amount / 100;

      if (productId) {
        // Handle product purchase
        await handleProductPurchase({
          supabaseClient,
          reference,
          amount: amountInNaira,
          customerEmail: customer.email,
          productId,
          referralCode
        });
      } else if (planId) {
        // Handle subscription purchase
        await handleSubscriptionPurchase({
          supabaseClient,
          reference,
          amount: amountInNaira,
          customerEmail: customer.email,
          planId,
          referralCode
        });
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Error', { status: 500 });
  }
});

async function handleProductPurchase({ 
  supabaseClient, 
  reference, 
  amount, 
  customerEmail, 
  productId, 
  referralCode 
}: any) {
  try {
    // Get product details
    const { data: product } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product) {
      throw new Error('Product not found');
    }

    // Find buyer by email
    let buyerProfile = null;
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('email', customerEmail);

    if (profiles && profiles.length > 0) {
      buyerProfile = profiles[0];
    }

    // Get buyer's subscription plan for commission calculation
    let commissionRate = 0.20; // Default 20% for free plan
    if (buyerProfile) {
      const { data: subscription } = await supabaseClient
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', buyerProfile.user_id)
        .eq('status', 'active')
        .single();

      if (subscription) {
        commissionRate = subscription.subscription_plans.commission_rate;
      }
    }

    const commissionAmount = amount * commissionRate;
    const adminAmount = amount - commissionAmount;

    // Record sale
    const saleData = {
      product_id: productId,
      seller_id: buyerProfile?.user_id || null,
      buyer_email: customerEmail,
      sale_amount: amount,
      commission_amount: commissionAmount,
      admin_amount: adminAmount,
      transaction_id: reference,
      status: 'completed'
    };

    const { data: sale } = await supabaseClient
      .from('sales')
      .insert(saleData)
      .select()
      .single();

    // Update product download count
    await supabaseClient
      .from('products')
      .update({ download_count: product.download_count + 1 })
      .eq('id', productId);

    // Create download record
    await supabaseClient
      .from('downloads')
      .insert({
        user_id: buyerProfile?.user_id || null,
        product_id: productId,
        buyer_email: customerEmail,
        sale_id: sale.id,
        download_count: 0
      });

    // Update seller wallet if authenticated user
    if (buyerProfile) {
      await supabaseClient.rpc('update_wallet_balance', {
        p_user_id: buyerProfile.user_id,
        p_amount: commissionAmount
      });
    }

    // Handle referral commissions if referral code provided
    if (referralCode && buyerProfile) {
      const { data: referrer } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('referral_code', referralCode)
        .single();

      if (referrer) {
        const referralCommission = amount * 0.15; // 15% referral commission
        
        await supabaseClient
          .from('referral_commissions')
          .insert({
            referrer_id: referrer.user_id,
            referred_user_id: buyerProfile.user_id,
            product_id: productId,
            sale_id: sale.id,
            commission_amount: referralCommission,
            commission_rate: 0.15,
            status: 'completed'
          });

        // Add to referrer's wallet
        await supabaseClient.rpc('update_wallet_balance', {
          p_user_id: referrer.user_id,
          p_amount: referralCommission
        });
      }
    }

    console.log('Product purchase processed successfully');
  } catch (error) {
    console.error('Error processing product purchase:', error);
    throw error;
  }
}

async function handleSubscriptionPurchase({ 
  supabaseClient, 
  reference, 
  amount, 
  customerEmail, 
  planId, 
  referralCode 
}: any) {
  try {
    // Get subscription plan details
    const { data: plan } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // Find user by email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('email', customerEmail)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Calculate subscription end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan.duration_months);

    // Create or update subscription
    await supabaseClient
      .from('user_subscriptions')
      .upsert({
        user_id: profile.user_id,
        plan_id: planId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active'
      });

    // Handle referral commission for subscription
    if (referralCode) {
      const { data: referrer } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('referral_code', referralCode)
        .single();

      if (referrer) {
        const referralCommission = amount * 0.25; // 25% referral commission on subscriptions
        
        await supabaseClient.rpc('update_wallet_balance', {
          p_user_id: referrer.user_id,
          p_amount: referralCommission
        });
      }
    }

    console.log('Subscription purchase processed successfully');
  } catch (error) {
    console.error('Error processing subscription purchase:', error);
    throw error;
  }
}