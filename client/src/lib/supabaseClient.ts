// Lightweight wrapper to bypass strict generated types until DB types are synced
import { supabase as baseClient } from '../../../src/integrations/supabase/client';

export const supabase: any = baseClient as any;
export default supabase;
