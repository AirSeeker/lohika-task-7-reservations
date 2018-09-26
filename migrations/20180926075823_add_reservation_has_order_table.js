exports.up = function (knex, Promise) {
    return Promise.all([
        knex.schema.createTable('reservation_has_order', function (table) {
            table.increments('id').primary();
            table.integer('reservation_id').notNull();
            table.string('order_uri').notNull();
            table.foreign('reservation_id').references('reservations.id');
        })
    ])
};

exports.down = function (knex, Promise) {
    return Promise.all([
        knex.schema.table('reservation_has_order', function (table) {
            table.dropForeign('reservation_id');
        }),
        knex.schema.dropTable('reservation_has_order')
    ])
};
