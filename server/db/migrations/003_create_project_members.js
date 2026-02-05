exports.up = function (knex) {
  return knex.schema.createTable('project_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('role', ['owner', 'editor', 'viewer']).notNullable().defaultTo('viewer');
    t.timestamp('invited_at').defaultTo(knex.fn.now());
    t.timestamp('accepted_at');
    t.unique(['project_id', 'user_id']);
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('project_members');
};
