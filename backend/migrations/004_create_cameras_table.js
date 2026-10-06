/**
 * Migration: 004_create_cameras_table
 *
 * Representa um canal/câmera individual dentro de um DVR.
 * Cada câmera possui um token UUID único que compõe a URL RTMP de push:
 *   rtmp://<servidor>:<porta>/live/<stream_token>
 * E a URL LL-HLS de consumo:
 *   http://<servidor>:<porta_web>/live/<stream_token>/index.m3u8
 *
 * O stream_token é gerado automaticamente e é IMUTÁVEL após criação.
 */

exports.up = function (knex) {
  return knex.schema.createTable('cameras', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    // DVR ao qual esta câmera pertence
    table.uuid('dvr_device_id').notNullable().references('id').inTable('dvr_devices').onDelete('CASCADE');
    table.integer('channel_number').notNullable();    // Número do canal no DVR (1 a N)
    table.string('name', 150).notNullable();          // Nome identificador. Ex: "Câmera Portão"
    // Token único e imutável que autentica o stream RTMP e compõe a URL
    table.uuid('stream_token').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
    table.enu('status', ['active', 'inactive', 'streaming']).notNullable().defaultTo('inactive');
    // Timestamps de controle de streaming
    table.timestamp('last_seen_at').nullable();       // Última vez que o DVR enviou stream
    table.timestamps(true, true);

    // Garante que não pode haver dois canais com mesmo número no mesmo DVR
    table.unique(['dvr_device_id', 'channel_number']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('cameras');
};
