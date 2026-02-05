exports.up = function (knex) {
  return knex.schema.createTable('cues', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('track_id').notNullable().references('id').inTable('tracks').onDelete('CASCADE');
    t.string('name', 255).notNullable().defaultTo('Cue');
    t.float('time').notNullable().defaultTo(0);
    t.text('description').defaultTo('');
    t.float('fade').defaultTo(0);
    t.string('marker_color', 9).defaultTo('#ff4444');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('cues');
};
