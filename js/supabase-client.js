"use strict";

// Creates the shared `sb` client used by every other module.
// If config.js wasn't filled in, we bail out early with a friendly message
// instead of letting every other file throw errors trying to use it.
let sb = null;

if (!window.SUPABASE_URL || window.SUPABASE_URL.includes('SEU-PROJETO')) {
  document.getElementById('app').innerHTML =
    '<div class="banner">Configure o arquivo <b>config.js</b> com a URL e a chave anon do seu projeto Supabase antes de usar o app.</div>';
} else {
  sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}
