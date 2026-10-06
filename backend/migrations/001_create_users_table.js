/**
 * Migration: 001_create_users_table
 *
 * Cria a tabela de usuários com suporte a dois roles:
 * - 'tech'   → Usuário Técnico (administrador da plataforma)
 * - 'viewer' → Usuário Visualizador (apenas consome câmeras autorizadas)
 */

exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 100).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('full_name', 150).notNullable();
    table.enu('role', ['tech', 'viewer']).notNullable().defaultTo('viewer');
    table.boolean('is_active').notNullable().defaultTo(true);
    // O técnico que criou este usuário (nulo para o super-admin inicial)
    table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true); // created_at, updated_at
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
