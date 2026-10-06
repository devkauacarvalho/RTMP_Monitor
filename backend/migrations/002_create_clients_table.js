/**
 * Migration: 002_create_clients_table
 *
 * Representa o "Cliente" (pessoa física ou empresa) cujos DVRs estão instalados.
 * Um cliente pode ter zero ou mais dispositivos DVR associados.
 */

exports.up = function (knex) {
  return knex.schema.createTable('clients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 150).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    // Técnico responsável pelo cadastro deste cliente
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('clients');
};
