import type { Express } from "express";
import { createServer, type Server } from "http";
import { db, schema } from "./storage";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Products API
  app.get("/api/products", async (req, res) => {
    try {
      const products = await db.select().from(schema.products).where(eq(schema.products.is_active, true));
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await db.select().from(schema.products)
        .where(and(eq(schema.products.id, req.params.id), eq(schema.products.is_active, true)))
        .limit(1);
      
      if (product.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product[0]);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Paystack initialization
  app.post("/api/paystack/initialize", async (req, res) => {
    try {
      const { email, amount, productId, planId, referralCode } = req.body;
      
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecretKey) {
        throw new Error('Paystack secret key not configured');
      }

      const amountNaira = Number(amount);
      if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
        throw new Error('Invalid Amount Sent');
      }
      const amountKobo = Math.round(amountNaira * 100);

      const origin = req.headers.origin || req.headers.referer || '';
      const paymentType = planId ? 'subscription' : 'product';
      const callbackUrl = `${origin}/payment-success?type=${paymentType}`;

      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          callback_url: callbackUrl,
          metadata: {
            productId,
            planId,
            referralCode,
            paymentType,
          }
        }),
      });

      const paystackData = await paystackResponse.json();
      
      if (!paystackData.status) {
        throw new Error(paystackData.message || 'Failed to initialize payment');
      }

      res.json({
        success: true,
        data: paystackData.data
      });
    } catch (error) {
      console.error('Payment initialization error:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Paystack webhook
  app.post("/api/paystack/webhook", async (req, res) => {
    try {
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecretKey) {
        throw new Error('Paystack secret key not configured');
      }

      // Verify Paystack signature
      const signature = req.headers['x-paystack-signature'];
      const body = JSON.stringify(req.body);
      
      const expectedSignature = crypto
        .createHmac('sha512', paystackSecretKey)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.log('Invalid signature');
        return res.status(401).send('Unauthorized');
      }

      const event = req.body;
      console.log('Webhook event:', event);

      if (event.event === 'charge.success') {
        const { reference, amount, customer, metadata } = event.data;
        const { productId, planId, referralCode } = metadata;

        const amountInNaira = amount / 100;

        if (productId) {
          await handleProductPurchase({
            reference,
            amount: amountInNaira,
            customerEmail: customer.email,
            productId,
            referralCode
          });
        } else if (planId) {
          await handleSubscriptionPurchase({
            reference,
            amount: amountInNaira,
            customerEmail: customer.email,
            planId,
            referralCode
          });
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).send('Error');
    }
  });

  // Bank verification
  app.post("/api/verify-bank-details", async (req, res) => {
    try {
      const { account_number, bank_code } = req.body;
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      
      if (!paystackSecretKey) {
        throw new Error('Paystack secret key not configured');
      }

      if (!account_number || !bank_code) {
        throw new Error('Account number and bank code are required');
      }

      // Get banks list first
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

      const bank = banksData.data.find((b: any) => b.code === bank_code);
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

      res.json({
        success: true,
        data: {
          account_number: verifyData.data.account_number,
          account_name: verifyData.data.account_name,
          bank_name: bank.name,
          bank_code: bank.code
        }
      });
    } catch (error) {
      console.error('Bank verification error:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Get Paystack banks
  app.get("/api/paystack/banks", async (req, res) => {
    try {
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecretKey) {
        throw new Error('Paystack secret key not configured');
      }

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

      const activeBanks = banksData.data
        .filter((bank: any) => bank.active && (bank.type === 'nuban' || bank.type === 'mobile_money'))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((bank: any) => ({
          name: bank.name,
          code: bank.code,
          id: bank.id
        }));

      res.json({
        success: true,
        data: activeBanks
      });
    } catch (error) {
      console.error('Banks fetch error:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Get subscription plans
  app.get('/api/subscription-plans', async (req, res) => {
    try {
      const plans = await db.select().from(schema.subscription_plans).orderBy(schema.subscription_plans.price);
      res.json(plans);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
  });

  // Get user subscription
  app.get('/api/user-subscriptions/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const subscription = await db.select()
        .from(schema.user_subscriptions)
        .where(and(
          eq(schema.user_subscriptions.user_id, userId),
          eq(schema.user_subscriptions.status, 'active')
        ))
        .limit(1);
        
      res.json(subscription.length > 0 ? subscription[0] : null);
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      res.status(500).json({ error: 'Failed to fetch user subscription' });
    }
  });

  // Create free subscription
  app.post('/api/create-free-subscription', async (req, res) => {
    try {
      const { planId, userId } = req.body;
      
      if (!planId || !userId) {
        return res.status(400).json({ error: 'Plan ID and User ID are required' });
      }

      // Get subscription plan details
      const plan = await db.select().from(schema.subscription_plans).where(eq(schema.subscription_plans.id, planId)).limit(1);
      
      if (plan.length === 0) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      // Check if it's actually a free plan
      if (plan[0].price > 0) {
        return res.status(400).json({ error: 'This is not a free plan' });
      }

      // Calculate subscription end date
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + plan[0].duration_months);

      // Create subscription
      await db.insert(schema.user_subscriptions).values({
        user_id: userId,
        plan_id: planId,
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error creating free subscription:', error);
      res.status(500).json({ error: 'Failed to create free subscription' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function handleProductPurchase({ reference, amount, customerEmail, productId, referralCode }: any) {
  try {
    // Get product details
    const product = await db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1);
    
    if (product.length === 0) {
      throw new Error('Product not found');
    }

    // Find buyer by email
    const profiles = await db.select().from(schema.profiles).where(eq(schema.profiles.email, customerEmail));
    const buyerProfile = profiles.length > 0 ? profiles[0] : null;

    // Get buyer's subscription plan for commission calculation
    let commissionRate = 0.20; // Default 20% for free plan
    if (buyerProfile) {
      const subscription = await db.select({
        commissionRate: schema.subscription_plans.commission_rate
      })
      .from(schema.user_subscriptions)
      .innerJoin(schema.subscription_plans, eq(schema.user_subscriptions.plan_id, schema.subscription_plans.id))
      .where(and(
        eq(schema.user_subscriptions.user_id, buyerProfile.user_id),
        eq(schema.user_subscriptions.status, 'active')
      ))
      .limit(1);

      if (subscription.length > 0) {
        commissionRate = Number(subscription[0].commissionRate);
      }
    }

    const commissionAmount = amount * commissionRate;
    const adminAmount = amount - commissionAmount;

    // Record sale
    const saleData = {
      product_id: productId,
      seller_id: buyerProfile?.user_id || '',
      buyer_email: customerEmail,
      sale_amount: amount.toString(),
      commission_amount: commissionAmount.toString(),
      admin_amount: adminAmount.toString(),
      transaction_id: reference,
      status: 'completed'
    };

    const sale = await db.insert(schema.sales).values(saleData).returning();

    // Update product download count
    await db.update(schema.products)
      .set({ download_count: sql`${schema.products.download_count} + 1` })
      .where(eq(schema.products.id, productId));

    // Create download record
    await db.insert(schema.downloads).values({
      user_id: buyerProfile?.user_id || null,
      product_id: productId,
      buyer_email: customerEmail,
      sale_id: sale[0].id,
      download_count: 0
    });

    // Update seller wallet if authenticated user
    if (buyerProfile) {
      const existingWallet = await db.select().from(schema.wallets).where(eq(schema.wallets.user_id, buyerProfile.user_id)).limit(1);
      
      if (existingWallet.length > 0) {
        await db.update(schema.wallets)
          .set({
            balance: sql`${schema.wallets.balance} + ${commissionAmount}`,
            total_earned: sql`${schema.wallets.total_earned} + ${commissionAmount}`
          })
          .where(eq(schema.wallets.user_id, buyerProfile.user_id));
      } else {
        await db.insert(schema.wallets).values({
          user_id: buyerProfile.user_id,
          balance: commissionAmount.toString(),
          total_earned: commissionAmount.toString(),
          total_withdrawn: "0"
        });
      }
    }

    console.log('Product purchase processed successfully');
  } catch (error) {
    console.error('Error processing product purchase:', error);
    throw error;
  }
}

async function handleSubscriptionPurchase({ reference, amount, customerEmail, planId, referralCode }: any) {
  try {
    // Get subscription plan details
    const plan = await db.select().from(schema.subscription_plans).where(eq(schema.subscription_plans.id, planId)).limit(1);
    
    if (plan.length === 0) {
      throw new Error('Subscription plan not found');
    }

    // Find user by email
    const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.email, customerEmail)).limit(1);
    
    if (profile.length === 0) {
      throw new Error('User profile not found');
    }

    // Calculate subscription end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan[0].duration_months);

    // Create or update subscription
    await db.insert(schema.user_subscriptions).values({
      user_id: profile[0].user_id,
      plan_id: planId,
      start_date: startDate,
      end_date: endDate,
      status: 'active'
    });

    console.log('Subscription purchase processed successfully');
  } catch (error) {
    console.error('Error processing subscription purchase:', error);
    throw error;
  }
}
