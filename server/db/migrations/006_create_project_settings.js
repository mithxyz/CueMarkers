exports.up = function (knex) {
  return knex.schema.createTable('project_settings', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('project_id').notNullable().unique().references('id').inTable('projects').onDelete('CASCADE');
    t.jsonb('settings').notNullable().defaultTo('{}');
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('project_settings');
};
