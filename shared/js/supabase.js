import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://qnqdmnaqrkyubermqulo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_aoK1co6bO7M1T5FV6MMTgw_9AoCb0ct'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)