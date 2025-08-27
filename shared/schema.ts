import { pgTable, text, serial, integer, boolean, timestamp, uuid, numeric, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull(),
  email: text("email").notNull(),
  full_name: text("full_name"),
  phone: text("phone"),
  referral_code: text("referral_code"),
  referred_by: uuid("referred_by"),
  referred_by_code: text("referred_by_code"),
  is_admin: boolean("is_admin").default(false),
  account_name: text("account_name"),
  account_number: text("account_number"),
  bank_name: text("bank_name"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  price: numeric("price").notNull(),
  thumbnail_url: text("thumbnail_url"),
  file_url: text("file_url"),
  file_size_mb: numeric("file_size_mb"),
  tags: text("tags").array(),
  is_active: boolean("is_active").default(true),
  download_count: integer("download_count").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  product_id: uuid("product_id").notNull(),
  seller_id: uuid("seller_id").notNull(),
  buyer_email: text("buyer_email").notNull(),
  sale_amount: numeric("sale_amount").notNull(),
  commission_amount: numeric("commission_amount").notNull(),
  admin_amount: numeric("admin_amount").notNull(),
  transaction_id: text("transaction_id"),
  referral_link: text("referral_link"),
  status: text("status").default("pending"),
  created_at: timestamp("created_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull(),
  balance: numeric("balance").default("0"),
  total_earned: numeric("total_earned").default("0"),
  total_withdrawn: numeric("total_withdrawn").default("0"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const subscription_plans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: numeric("price").notNull(),
  duration_months: integer("duration_months").notNull(),
  commission_rate: numeric("commission_rate").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const user_subscriptions = pgTable("user_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull(),
  plan_id: uuid("plan_id").notNull(),
  status: text("status").default("active"),
  start_date: timestamp("start_date").defaultNow(),
  end_date: timestamp("end_date").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const downloads = pgTable("downloads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id"),
  product_id: uuid("product_id").notNull(),
  buyer_email: text("buyer_email").notNull(),
  sale_id: uuid("sale_id"),
  download_count: integer("download_count").default(0),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const referral_tracking = pgTable("referral_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  referral_code: text("referral_code").notNull(),
  referrer_id: uuid("referrer_id"),
  referred_user_id: uuid("referred_user_id"),
  created_at: timestamp("created_at").defaultNow(),
});

export const referral_commissions = pgTable("referral_commissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  referrer_id: uuid("referrer_id").notNull(),
  referred_user_id: uuid("referred_user_id").notNull(),
  product_id: uuid("product_id").notNull(),
  sale_id: uuid("sale_id").notNull(),
  commission_amount: numeric("commission_amount").default("0"),
  commission_rate: numeric("commission_rate").default("0"),
  status: text("status").default("pending"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const withdrawal_requests = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").notNull(),
  amount: numeric("amount").notNull(),
  net_amount: numeric("net_amount").notNull(),
  processing_fee: numeric("processing_fee"),
  account_name: text("account_name").notNull(),
  account_number: text("account_number").notNull(),
  bank_name: text("bank_name").notNull(),
  bank_code: text("bank_code"),
  status: text("status").default("pending"),
  admin_notes: text("admin_notes"),
  processed_at: timestamp("processed_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles);
export const insertProductSchema = createInsertSchema(products);
export const insertSaleSchema = createInsertSchema(sales);

export type Profile = typeof profiles.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;
