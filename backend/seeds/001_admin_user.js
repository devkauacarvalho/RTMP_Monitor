/**
 * seeds/001_admin_user.js
 *
 * Cria o usuário técnico administrador inicial.
 * IMPORTANTE: Altere a senha antes de subir para produção!
 */
const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // Limpa apenas se não existir (idempotente)
  const existing = await knex('users').where({ username: 'admin' }).first();
  if (existing) {
    console.log('[SEED] Usuário admin já existe. Pulando seed.');
    return;
  }

  const password_hash = await bcrypt.hash('admin123', 12);

  await knex('users').insert({
    username: 'admin',
    password_hash,
    full_name: 'Administrador',
    role: 'tech',
    is_active: true,
  });

  console.log('[SEED] Usuário técnico admin criado com sucesso.');
  console.log('[SEED] ⚠️  Altere a senha padrão (admin123) antes de ir para produção!');
};
