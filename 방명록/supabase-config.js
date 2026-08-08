// Publishable client config — safe to expose (protected by Supabase Row Level Security)
window.SUPABASE_URL = 'https://lqobhpktyrcfnbabadwa.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_q2wPpbxh394bb1Oysw0MNA_vAMF4pJ8';

// Admin master password, stored as a bcrypt hash (never store the plain password here).
// To set your own admin password:
//   1. Open this page in the browser, open the devtools console.
//   2. Run: dcodeIO.bcrypt.hashSync('원하는 관리자 비밀번호', 10)
//   3. Copy the resulting string and paste it below.
// Leave as null to disable the admin feature.
window.ADMIN_PASSWORD_HASH = null;
