// PUBLIC configuration only. Never put a service_role key, secret key or OAuth client secret in this file.
// The Supabase URL and the publishable / legacy "anon" key are designed to be public (Row Level Security protects data).
export const CONFIG = {
  supabaseUrl: '',          // e.g. https://abcdefgh.supabase.co
  supabaseAnonKey: '',      // Publishable key (sb_publishable_...) or legacy anon key (eyJ...)
  siteUrl: '',              // Your deployed Netlify URL, e.g. https://your-site.netlify.app (used for auth redirects; leave '' to use the current origin)
  inquiryEndpoint: '',      // e.g. https://formspree.io/f/XXXX (or your own server endpoint)
  contactEmail: 'nasoft.it@gmail.com'
};
