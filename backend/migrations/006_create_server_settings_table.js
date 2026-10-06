/**
 * Migration: 006_create_server_settings_table
 *
 * Tabela de configurações globais do servidor MediaMTX.
 * Projetada para ter apenas UMA linha (registro singleton).
 * O Usuário Técnico pode visualizar e alterar esses parâmetros pelo dashboard.
 */

exports.up = function (knex) {
  return knex.schema
    .createTable('server_settings', (table) => {
      table.integer('id').primary().defaultTo(1); // Sempre ID=1 (singleton)
      table.string('mediamtx_host', 255).notNullable();
      table.integer('rtmp_port').notNullable().defaultTo(1935);
      table.integer('hls_port').notNullable().defaultTo(8554);
      table.string('rtmp_app_path', 100).notNullable().defaultTo('/live/');
      // Indica se o webhook de validação de stream está habilitado
      table.boolean('webhook_enabled').notNullable().defaultTo(true);
      table.string('webhook_secret', 255).nullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    })
    .then(() => {
      // Insere o registro singleton inicial com valores padrão
      return knex('server_settings').insert({
        id: 1,
        mediamtx_host: 'localhost',
        rtmp_port: 1935,
        hls_port: 8554,
        rtmp_app_path: '/live/',
        webhook_enabled: true,
      });
    });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('server_settings');
};
