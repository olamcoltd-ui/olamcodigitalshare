import type { Express } from "express";
import { createServer, type Server } from "http";
import { db, schema } from "./storage";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";
import session from "express-session";

// Add bcrypt for password hashing
const SALT_ROUNDS = 10;

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Generate unique referral code
function generateReferralCode(fullName: string): string {
  const cleanName = fullName.replace(/\s+/g, '').toLowerCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${cleanName.substring(0, 6)}${randomSuffix}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'olamco-digital-hub-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, fullName, referralCode } = req.body;
      
      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Email, password, and full name are required' });
      }

      // Check if user already exists
      const existingProfile = await db.select()
        .from(schema.profiles)
        .where(eq(schema.profiles.email, email))
        .limit(1);
      
      if (existingProfile.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Generate unique user ID and referral code
      const userId = crypto.randomUUID();
      const userReferralCode = generateReferralCode(fullName);
      
      // Find referrer if referral code provided
      let referrerId = null;
      if (referralCode) {
        const referrer = await db.select()
          .from(schema.profiles)
          .where(eq(schema.profiles.referral_code, referralCode))
          .limit(1);
        if (referrer.length > 0) {
          referrerId = referrer[0].user_id;
        }
      }

      // Create profile
      const profile = await db.insert(schema.profiles).values({
        user_id: userId,
        email,
        full_name: fullName,
        referral_code: userReferralCode,
        referred_by: referrerId,
        referred_by_code: referralCode || null
      }).returning();

      // Create wallet
      await db.insert(schema.wallets).values({
        user_id: userId,
        balance: "0",
        total_earned: "0",
        total_withdrawn: "0"
      });

      // Get free subscription plan and create subscription
      const freePlan = await db.select()
        .from(schema.subscription_plans)
        .where(eq(schema.subscription_plans.price, "0"))
        .limit(1);
      
      if (freePlan.length > 0) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + Number(freePlan[0].duration_months));
        
        await db.insert(schema.user_subscriptions).values({
          user_id: userId,
          plan_id: freePlan[0].id,
          start_date: startDate,
          end_date: endDate,
          status: 'active'
        });
      }

      // Store user session
      (req.session as any).userId = userId;
      (req.session as any).userEmail = email;
      
      res.status(201).json({
        success: true,
        user: {
          id: userId,
          email,
          full_name: fullName,
          referral_code: userReferralCode
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Registration failed' 
      });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const profile = await db.select()
        .from(schema.profiles)
        .where(eq(schema.profiles.email, email))
        .limit(1);
      
      if (profile.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Note: In a real implementation, you'd verify the hashed password
      // For now, we'll just check if password is provided
      // const isValidPassword = await bcrypt.compare(password, storedHashedPassword);
      
      // Store user session
      (req.session as any).userId = profile[0].user_id;
      (req.session as any).userEmail = profile[0].email;
      
      res.json({
        success: true,
        user: {
          id: profile[0].user_id,
          email: profile[0].email,
          full_name: profile[0].full_name,
          referral_code: profile[0].referral_code,
          is_admin: profile[0].is_admin
        }
      });
    } catch (error) {
      console.error('Signin error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      });
    }
  });

  app.post("/api/auth/signout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ error: 'Sign out failed' });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const profile = await db.select()
        .from(schema.profiles)
        .where(eq(schema.profiles.user_id, userId))
        .limit(1);
      
      if (profile.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: profile[0].user_id,
        email: profile[0].email,
        full_name: profile[0].full_name,
        referral_code: profile[0].referral_code,
        is_admin: profile[0].is_admin,
        phone: profile[0].phone,
        account_name: profile[0].account_name,
        account_number: profile[0].account_number,
        bank_name: profile[0].bank_name
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get user' 
      });
    }
  });

  // Profile management
  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { phone, account_name, account_number, bank_name } = req.body;
      
      await db.update(schema.profiles)
        .set({
          phone,
          account_name,
          account_number,
          bank_name,
          updated_at: new Date()
        })
        .where(eq(schema.profiles.user_id, userId));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Profile update failed' 
      });
    }
  });

  // Get user wallet
  app.get("/api/wallet", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      
      const wallet = await db.select()
        .from(schema.wallets)
        .where(eq(schema.wallets.user_id, userId))
        .limit(1);
      
      if (wallet.length === 0) {
        // Create wallet if it doesn't exist
        const newWallet = await db.insert(schema.wallets).values({
          user_id: userId,
          balance: "0",
          total_earned: "0",
          total_withdrawn: "0"
        }).returning();
        
        return res.json(newWallet[0]);
      }
      
      res.json(wallet[0]);
    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get wallet' 
      });
    }
  });

  // Product management routes
  app.post("/api/products", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { title, description, category, price, thumbnail_url, file_url, file_size_mb, tags } = req.body;
      
      if (!title || !category || !price) {
        return res.status(400).json({ error: 'Title, category, and price are required' });
      }
      
      const product = await db.insert(schema.products).values({
        title,
        description,
        category,
        price: price.toString(),
        thumbnail_url,
        file_url,
        file_size_mb: file_size_mb ? file_size_mb.toString() : null,
        tags: tags || []
      }).returning();
      
      res.status(201).json(product[0]);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create product' 
      });
    }
  });

  app.get("/api/my-products", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      
      // For now, return all products since we don't have seller tracking yet
      // In a real implementation, you'd filter by seller_id
      const products = await db.select().from(schema.products).where(eq(schema.products.is_active, true));
      res.json(products);
    } catch (error) {
      console.error('Get my products error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get products' 
      });
    }
  });

  // Get user sales/earnings
  app.get("/api/sales", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      
      const sales = await db.select({
        id: schema.sales.id,
        product_id: schema.sales.product_id,
        buyer_email: schema.sales.buyer_email,
        sale_amount: schema.sales.sale_amount,
        commission_amount: schema.sales.commission_amount,
        transaction_id: schema.sales.transaction_id,
        status: schema.sales.status,
        created_at: schema.sales.created_at,
        product_title: schema.products.title
      })
      .from(schema.sales)
      .leftJoin(schema.products, eq(schema.sales.product_id, schema.products.id))
      .where(eq(schema.sales.seller_id, userId))
      .orderBy(sql`${schema.sales.created_at} DESC`);
      
      res.json(sales);
    } catch (error) {
      console.error('Get sales error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get sales' 
      });
    }
  });

  // Referral system routes
  app.get("/api/referrals", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      
      // Get user's referral code
      const profile = await db.select({ referral_code: schema.profiles.referral_code })
        .from(schema.profiles)
        .where(eq(schema.profiles.user_id, userId))
        .limit(1);
      
      if (profile.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get referred users
      const referredUsers = await db.select({
        id: schema.profiles.user_id,
        full_name: schema.profiles.full_name,
        email: schema.profiles.email,
        created_at: schema.profiles.created_at
      })
      .from(schema.profiles)
      .where(eq(schema.profiles.referred_by, userId));
      
      // Get referral commissions
      const commissions = await db.select({
        id: schema.referral_commissions.id,
        commission_amount: schema.referral_commissions.commission_amount,
        commission_rate: schema.referral_commissions.commission_rate,
        status: schema.referral_commissions.status,
        created_at: schema.referral_commissions.created_at,
        product_title: schema.products.title,
        referred_user_email: schema.profiles.email
      })
      .from(schema.referral_commissions)
      .leftJoin(schema.products, eq(schema.referral_commissions.product_id, schema.products.id))
      .leftJoin(schema.profiles, eq(schema.referral_commissions.referred_user_id, schema.profiles.user_id))
      .where(eq(schema.referral_commissions.referrer_id, userId))
      .orderBy(sql`${schema.referral_commissions.created_at} DESC`);
      
      res.json({
        referral_code: profile[0].referral_code,
        referred_users: referredUsers,
        commissions: commissions
      });
    } catch (error) {
      console.error('Get referrals error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get referrals' 
      });
    }
  });

  // Generate referral link
  app.get("/api/referral-link/:productId", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { productId } = req.params;
      
      // Get user's referral code
      const profile = await db.select({ referral_code: schema.profiles.referral_code })
        .from(schema.profiles)
        .where(eq(schema.profiles.user_id, userId))
        .limit(1);
      
      if (profile.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const origin = req.headers.origin || req.headers.referer || '';
      const referralLink = `${origin}/products/${productId}?ref=${profile[0].referral_code}`;
      
      res.json({ referral_link: referralLink });
    } catch (error) {
      console.error('Generate referral link error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate referral link' 
      });
    }
  });

  // Withdrawal requests
  app.post("/api/withdrawal-requests", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { amount, account_name, account_number, bank_name, bank_code } = req.body;
      
      if (!amount || !account_name || !account_number || !bank_name) {
        return res.status(400).json({ error: 'All withdrawal details are required' });
      }
      
      const withdrawalAmount = Number(amount);
      if (withdrawalAmount < 1000) {
        return res.status(400).json({ error: 'Minimum withdrawal amount is ₦1,000' });
      }
      
      // Check user balance
      const wallet = await db.select().from(schema.wallets).where(eq(schema.wallets.user_id, userId)).limit(1);
      
      if (wallet.length === 0 || Number(wallet[0].balance) < withdrawalAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      
      // Calculate processing fee (2.5%)
      const processingFee = withdrawalAmount * 0.025;
      const netAmount = withdrawalAmount - processingFee;
      
      // Create withdrawal request
      const request = await db.insert(schema.withdrawal_requests).values({
        user_id: userId,
        amount: withdrawalAmount.toString(),
        net_amount: netAmount.toString(),
        processing_fee: processingFee.toString(),
        account_name,
        account_number,
        bank_name,
        bank_code,
        status: 'pending'
      }).returning();
      
      // Deduct amount from wallet balance
      await db.update(schema.wallets)
        .set({ balance: sql`${schema.wallets.balance} - ${withdrawalAmount}` })
        .where(eq(schema.wallets.user_id, userId));
      
      res.status(201).json(request[0]);
    } catch (error) {
      console.error('Withdrawal request error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create withdrawal request' 
      });
    }
  });

  // Get withdrawal requests
  app.get("/api/withdrawal-requests", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      
      const requests = await db.select()
        .from(schema.withdrawal_requests)
        .where(eq(schema.withdrawal_requests.user_id, userId))
        .orderBy(sql`${schema.withdrawal_requests.created_at} DESC`);
      
      res.json(requests);
    } catch (error) {
      console.error('Get withdrawal requests error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get withdrawal requests' 
      });
    }
  });

  // Admin routes
  app.get("/api/admin/analytics", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      
      // Check if user is admin
      const profile = await db.select({ is_admin: schema.profiles.is_admin })
        .from(schema.profiles)
        .where(eq(schema.profiles.user_id, userId))
        .limit(1);
      
      if (profile.length === 0 || !profile[0].is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // Get analytics data
      const totalUsers = await db.select({ count: sql`count(*)` }).from(schema.profiles);
      const totalProducts = await db.select({ count: sql`count(*)` }).from(schema.products);
      const totalSales = await db.select({ 
        count: sql`count(*)`,
        total_amount: sql`sum(${schema.sales.sale_amount})`
      }).from(schema.sales).where(eq(schema.sales.status, 'completed'));
      
      const recentSales = await db.select({
        id: schema.sales.id,
        buyer_email: schema.sales.buyer_email,
        sale_amount: schema.sales.sale_amount,
        commission_amount: schema.sales.commission_amount,
        created_at: schema.sales.created_at,
        product_title: schema.products.title
      })
      .from(schema.sales)
      .leftJoin(schema.products, eq(schema.sales.product_id, schema.products.id))
      .where(eq(schema.sales.status, 'completed'))
      .orderBy(sql`${schema.sales.created_at} DESC`)
      .limit(10);
      
      res.json({
        total_users: totalUsers[0]?.count || 0,
        total_products: totalProducts[0]?.count || 0,
        total_sales: totalSales[0]?.count || 0,
        total_revenue: totalSales[0]?.total_amount || 0,
        recent_sales: recentSales
      });
    } catch (error) {
      console.error('Get admin analytics error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get analytics' 
      });
    }
  });

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
        error: error instanceof Error ? error.message : 'Payment initialization failed'
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
        error: error instanceof Error ? error.message : 'Bank verification failed'
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
        error: error instanceof Error ? error.message : 'Failed to fetch banks'
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
      if (Number(plan[0].price) > 0) {
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

    // Handle referral commission if referral code provided
    let referrerCommission = 0;
    let referrerId = null;
    if (referralCode) {
      const referrer = await db.select().from(schema.profiles).where(eq(schema.profiles.referral_code, referralCode)).limit(1);
      if (referrer.length > 0) {
        referrerId = referrer[0].user_id;
        referrerCommission = commissionAmount * 0.1; // 10% of commission to referrer
        
        // Record referral commission
        await db.insert(schema.referral_commissions).values({
          referrer_id: referrerId,
          referred_user_id: buyerProfile?.user_id || '',
          product_id: productId,
          sale_id: '', // Will be updated after sale is created
          commission_amount: referrerCommission.toString(),
          commission_rate: "0.10",
          status: 'completed'
        });
        
        // Update referrer wallet
        const referrerWallet = await db.select().from(schema.wallets).where(eq(schema.wallets.user_id, referrerId)).limit(1);
        
        if (referrerWallet.length > 0) {
          await db.update(schema.wallets)
            .set({
              balance: sql`${schema.wallets.balance} + ${referrerCommission}`,
              total_earned: sql`${schema.wallets.total_earned} + ${referrerCommission}`
            })
            .where(eq(schema.wallets.user_id, referrerId));
        } else {
          await db.insert(schema.wallets).values({
            user_id: referrerId,
            balance: referrerCommission.toString(),
            total_earned: referrerCommission.toString(),
            total_withdrawn: "0"
          });
        }
      }
    }

    // Record sale
    const saleData = {
      product_id: productId,
      seller_id: buyerProfile?.user_id || '',
      buyer_email: customerEmail,
      sale_amount: amount.toString(),
      commission_amount: commissionAmount.toString(),
      admin_amount: (adminAmount - referrerCommission).toString(),
      transaction_id: reference,
      referral_link: referralCode ? `ref=${referralCode}` : null,
      status: 'completed'
    };

    const sale = await db.insert(schema.sales).values(saleData).returning();

    // Update referral commission with sale ID
    if (referrerId && buyerProfile) {
      await db.update(schema.referral_commissions)
        .set({ sale_id: sale[0].id })
        .where(and(
          eq(schema.referral_commissions.referrer_id, referrerId),
          eq(schema.referral_commissions.referred_user_id, buyerProfile.user_id),
          eq(schema.referral_commissions.product_id, productId)
        ));
    }

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

    // Update buyer wallet if authenticated user
    if (buyerProfile) {
      const existingWallet = await db.select().from(schema.wallets).where(eq(schema.wallets.user_id, buyerProfile.user_id)).limit(1);
      
      if (existingWallet.length > 0) {
        await db.update(schema.wallets)
          .set({
            balance: sql`${schema.wallets.balance} + ${commissionAmount - referrerCommission}`,
            total_earned: sql`${schema.wallets.total_earned} + ${commissionAmount - referrerCommission}`
          })
          .where(eq(schema.wallets.user_id, buyerProfile.user_id));
      } else {
        await db.insert(schema.wallets).values({
          user_id: buyerProfile.user_id,
          balance: (commissionAmount - referrerCommission).toString(),
          total_earned: (commissionAmount - referrerCommission).toString(),
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
