// /api/admin-users.js
// Roda no servidor da Vercel (nunca no navegador), por isso pode usar a
// SUPABASE_SERVICE_ROLE_KEY com segurança — ela fica só nas variáveis de
// ambiente do projeto na Vercel, nunca em nenhum arquivo do site.
//
// Todo pedido precisa vir com o token de login de quem está chamando
// (Authorization: Bearer <access_token>). Confirmamos que esse token é
// válido e que a conta é admin antes de fazer qualquer alteração.

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    res.status(500).json({ error: 'Variáveis de ambiente do Supabase não configuradas na Vercel.' });
    return;
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) { res.status(401).json({ error: 'Faça login novamente.' }); return; }

    // 1) confirma que o token é de uma sessão válida
    const asUser = createClient(SUPABASE_URL, ANON_KEY);
    const { data: userData, error: userErr } = await asUser.auth.getUser(token);
    if (userErr || !userData?.user) { res.status(401).json({ error: 'Sessão inválida.' }); return; }
    const callerId = userData.user.id;

    // 2) cliente com poderes de admin (bypassa RLS)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    // 3) confirma que quem está chamando é realmente admin
    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerId).maybeSingle();
    if (callerProfile?.role !== 'admin') { res.status(403).json({ error: 'Só administradores podem fazer isso.' }); return; }

    const { action, userId, password, role } = req.body || {};

    if (action === 'list') {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (error) { res.status(500).json({ error: error.message }); return; }
      const { data: profiles } = await admin.from('profiles').select('id, role, daily_goal');
      const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      const users = data.users
        .map(u => ({
          id: u.id,
          email: u.email,
          email_confirmed: !!u.email_confirmed_at,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          role: byId[u.id]?.role || 'user'
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      res.status(200).json({ users });
      return;
    }

    if (!userId) { res.status(400).json({ error: 'userId é obrigatório.' }); return; }

    if (action === 'confirmEmail') {
      const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
      if (error) { res.status(500).json({ error: error.message }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'setPassword') {
      if (!password || password.length < 6) { res.status(400).json({ error: 'Senha precisa ter pelo menos 6 caracteres.' }); return; }
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) { res.status(500).json({ error: error.message }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'setRole') {
      if (role !== 'admin' && role !== 'user') { res.status(400).json({ error: 'role inválida.' }); return; }
      const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
      if (error) { res.status(500).json({ error: error.message }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteUser') {
      if (userId === callerId) { res.status(400).json({ error: 'Você não pode excluir sua própria conta por aqui.' }); return; }
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) { res.status(500).json({ error: error.message }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Ação desconhecida.' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro inesperado.' });
  }
};
