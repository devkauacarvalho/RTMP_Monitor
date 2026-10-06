/**
 * Migration: 005_create_viewer_permissions_table
 *
 * Tabela de vínculo N:M entre Usuários Visualizadores e Câmeras.
 * Um Usuário Visualizador pode ter acesso a múltiplas câmeras.
 * Uma câmera pode ser acessada por múltiplos Usuários Visualizadores.
 *
 * Apenas o técnico pode criar/remover esses vínculos.
 * O webhook do servidor de mídia consulta esta tabela (via stream_token) para
 * validar se a câmera está cadastrada e ativa antes de aceitar o stream.
 */

exports.up = function (knex) {
  return knex.schema.createTable('viewer_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    // O Usuário Visualizador que receberá acesso
    table.uuid('viewer_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    // A câmera específica que será liberada
    table.uuid('camera_id').notNullable().references('id').inTable('cameras').onDelete('CASCADE');
    // Técnico que concedeu a permissão (auditoria)
    table.uuid('granted_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('granted_at').notNullable().defaultTo(knex.fn.now());

    // Garante que a combinação viewer+câmera é única (sem duplicatas de permissão)
    table.unique(['viewer_user_id', 'camera_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('viewer_permissions');
};
