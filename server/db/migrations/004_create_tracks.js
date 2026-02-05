exports.up = function (knex) {
  return knex.schema.createTable('tracks', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.enu('media_type', ['audio', 'video']).defaultTo('audio');
    t.string('media_filename', 500);
    t.string('media_s3_key', 1000);
    t.bigInteger('media_size').defaultTo(0);
    t.float('media_duration').defaultTo(0);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('tracks');
};
