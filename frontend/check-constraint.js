require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await s.rpc('execute_sql', { sql: "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'caregiver_patient_links_status_check';" });
  console.log(data, error);
}
main();
