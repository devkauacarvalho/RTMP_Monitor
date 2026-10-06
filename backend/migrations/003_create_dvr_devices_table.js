/**
 * Migration: 003_create_dvr_devices_table
 *
 * Representa o hardware DVR físico instalado no cliente.
 * Um cliente pode ter múltiplos DVRs (ex: matriz de câmeras grande).
 * Armazena metadados de identificação do equipamento.
 */

exports.up = function (knex) {
  return knex.schema.createTable('dvr_devices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    // Vínculo com o cliente dono do equipamento
    table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.string('name', 150).notNullable();          // Ex: "DVR Térreo", "DVR Estacionamento"
    table.string('model', 100).nullable();             // Ex: "Intelbras MHDX 3108"
    table.integer('total_channels').notNullable().defaultTo(8); // Nº total de canais do DVR
    table.text('notes').nullable();                    // Observações técnicas
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('dvr_devices');
};
