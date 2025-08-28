import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Use Supabase database URL if available, otherwise fall back to local DATABASE_URL
// Note: The environment variables are swapped - SUPABASE_URL contains the anon key and SUPABASE_ANON_KEY contains the URL
const supabaseUrl = process.env.SUPABASE_ANON_KEY; // This actually contains the URL
const supabasePassword = process.env.SUPABASE_DB_PASSWORD;

let databaseUrl = process.env.DATABASE_URL;

if (supabaseUrl && supabasePassword && supabaseUrl.includes('supabase.co')) {
  // Extract project reference from URL like https://rzpgtiqrbijrebktbebf.supabase.co
  const projectRef = supabaseUrl.split('//')[1].split('.')[0];
  databaseUrl = `postgresql://postgres:${encodeURIComponent(supabasePassword)}@db.${projectRef}.supabase.co:5432/postgres`;
}

if (!databaseUrl) {
  throw new Error("SUPABASE_URL and SUPABASE_DB_PASSWORD or DATABASE_URL must be set");
}

console.log('Connecting to database:', databaseUrl.replace(/:([^:@]+)@/, ':***@'));

const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });

export { schema };
