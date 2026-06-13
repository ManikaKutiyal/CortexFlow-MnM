import { createClient } from '@supabase/supabase-js';

const s = createClient('https://ojotqbtnumlccngmdura.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qb3RxYnRudW1sY2NuZ21kdXJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc1MzUzNiwiZXhwIjoyMDkxMzI5NTM2fQ.zumE_Y1D2ZLC2P6mu3JpSZMz0cc_C6RRnKFO4uVpsZM');

async function main() {
  const { data: buckets } = await s.storage.listBuckets();
  if (!buckets?.find(b => b.name === 'patient_records')) {
    console.log("Creating patient_records bucket...");
    const { data, error } = await s.storage.createBucket('patient_records', { public: true });
    console.log("Create bucket result:", data, error);
  } else {
    console.log("Bucket already exists.");
  }
}
main();
