exports.up = function (knex) {
  return knex.schema.createTable('projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 255).notNullable();
    t.text('description').defaultTo('');
    t.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('export_id').notNullable().defaultTo(101);
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('projects');
};
