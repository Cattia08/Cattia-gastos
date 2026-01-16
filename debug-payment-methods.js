// Debug script to test payment method creation error
// Run this in browser console when the error happens

console.log('Testing payment method error handling...');

// Check what payment methods exist
fetch('https://cycdmrgybbtqevrckkbm.supabase.co/rest/v1/payment_methods?select=*', {
  headers: {
    'apikey': 'YOUR_SUPABASE_ANON_KEY',
    'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Existing payment methods:', data);
  console.log('Names:', data.map(pm => pm.name));
});

// The error you're seeing means there's a UNIQUE constraint on the 'name' column
// Check for duplicates (case-insensitive check might be needed)
