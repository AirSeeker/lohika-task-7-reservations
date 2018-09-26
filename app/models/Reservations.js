const knex = require('../../db');
const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const moment = require('moment');
const axios = require('axios');
const config = require('../../config')[process.env.NODE_ENV];

class ReservationsModel {
    constructor() {
        this.id = null;
        this.guests = null;
        this.time = null;
        this.duration = null;
        this.reservationEnd = null;
        this.freeTables = null;
    }

    /**
     * Validate view, delete, update request id params on success set model id
     * @param {number} id
     * @returns {boolean}
     */
    validateId(id) {
        const schema = Joi.number().integer().min(1).required();
        let {value: result, error} = Joi.validate(id, schema);

        if (error === null) {
            this.id = result;
            return true;
        }

        return false;
    }

    /**
     * Validate create and update request body on success set model guests, time, reservationEnd
     * @param {Object} data
     * @returns {boolean}
     */
    validate(data) {
        const schema = Joi.object().keys({
            reservation: Joi.object().keys({
                guests: Joi.number().integer().min(1).max(10).required(),
                time: Joi.date().format('YYYY-MM-DDTHH:mm:ssZ').iso().min('now').required(),
                duration: Joi.number().precision(1).min(0.5).max(6.0).required()
            }).required()
        }).required();

        let {value: result, error} = Joi.validate(data, schema);

        if (error === null) {
            this.guests = result.reservation.guests;
            this.time = moment(result.reservation.time, 'YYYY-MM-DDTHH:mm:ssZ').utc().format('YYYY-MM-DDTHH:mm:ssZ');
            this.duration = result.reservation.duration;
            let duration = `${this.duration}`.split('.');
            let hours = parseInt(duration[0]);
            let minutes = 0;
            if (duration[1]) {
                minutes = 60 / (1 / parseFloat('0.' + duration[1]));
            }
            this.reservationEnd = moment(this.time, 'YYYY-MM-DDTHH:mm:ssZ').utc().add(hours, 'h');
            if (minutes) {
                this.reservationEnd.add(minutes, 'm')
            }
            this.reservationEnd = this.reservationEnd.format('YYYY-MM-DDTHH:mm:ssZ');
            return true;
        }

        return false;
    }

    /**
     * Search for available tables return true if exists
     * @returns {Promise<*>}
     */
    async isConflict() {
        const freeTables = await this.getFreeTables(this.id);

        if (freeTables instanceof Error) {
            return freeTables;
        }

        return !freeTables.length;
    }

    /**
     * Return free tables
     * @param {number} [excludeReservationId] On update need to exclude current id
     * @returns {Promise<*>}
     */
    async getFreeTables(excludeReservationId) {
        let result;
        try {
            const subQuery = knex('reservations')
                .modify(function (queryBuilder) {
                    if (excludeReservationId) {
                        queryBuilder.andWhere('reservations.id', '!=', excludeReservationId);
                    }
                })
                .andWhereBetween('reservations.start', [this.time, this.reservationEnd])
                .orWhereBetween('reservations.end', [this.time, this.reservationEnd])
                .select('table_id');

            result = await knex('tables')
                .where('capacity', '>=', this.guests)
                .andWhere('id', 'not in', subQuery);
        } catch (e) {
            return new Error(e.message);
        }
        this.freeTables = result;
        return result;
    }

    /**
     * Update single row
     * @returns {Promise<*>}
     */
    async update() {
        if (this.freeTables.length) {
            let reservation;
            try {
                reservation = await knex('reservations')
                    .where('id', this.id)
                    .update({
                        table_id: this.freeTables[0].id,
                        start: this.time,
                        end: this.reservationEnd,
                        guests: this.guests
                    });
            } catch (e) {
                return new Error(e.message);
            }

            if (reservation) {
                return true;
            }
        }

        return false;
    }

    /**
     * Save reservation
     * @returns {Promise<*>}
     */
    async save() {
        if (this.freeTables.length) {
            let reservation;
            try {
                reservation = await knex('reservations')
                    .returning('id')
                    .insert({
                        table_id: this.freeTables[0].id,
                        start: this.time,
                        end: this.reservationEnd,
                        guests: this.guests
                    });
            } catch (e) {
                return new Error(e.message);
            }

            if (reservation.length) {
                this.id = reservation[0];
                return true;
            }
        }

        return false;
    }

    /**
     * Select reservation by id and join with table
     * @returns {Promise<*>}
     */
    async findOne() {
        let result;
        try {
            result = await knex('reservations')
                .select([
                    'reservations.id',
                    'reservations.guests',
                    'reservations.start',
                    'reservations.end',
                    'tables.number',
                    'tables.capacity'
                ])
                .where('reservations.id', this.id)
                .join('tables', 'tables.id', 'reservations.table_id')
                .limit(1);
        } catch (e) {
            return new Error(e.message);
        }

        if (!result.length) {
            return false;
        }

        return {
            reservation: {
                id: result[0].id,
                guests: result[0].guests,
                start: moment(result[0].start, 'YYYY-MM-DDTHH:mm:ssZ').utc().format('YYYY-MM-DDTHH:mm:ssZ'),
                end: moment(result[0].end, 'YYYY-MM-DDTHH:mm:ssZ').utc().format('YYYY-MM-DDTHH:mm:ssZ'),
                table: {
                    number: result[0].number,
                    capacity: result[0].capacity
                }
            }
        }
    }

    /**
     * Delete reservation by id
     * @returns {Promise<*>}
     */
    async deleteOne() {
        let result;
        try {
            result = await knex('reservations').where('id', this.id).del();
        } catch (e) {
            return new Error(e.message);
        }

        return !!result;
    }

    /**
     * Send request to Orders microservice
     * @param body
     * @returns boolean
     */
    async saveOrder(body) {
        let result;
        try {
            result = await axios.post(`${config.ordersEndpoint}/api/orders`, body);
        } catch (e) {
            return false;
        }

        if (result.status === 201 && result.headers.location) {
            try {
                await knex('reservation_has_order')
                    .returning('id')
                    .insert({
                        reservation_id: this.id,
                        order_uri: result.headers.location
                    });
            } catch (e) {
                return new Error(e.message);
            }

            return true;
        }

        return false;
    }

    async findOrder() {
        try {
            let order = await knex('reservation_has_order')
                .select(['order_uri'])
                .where('reservation_id', this.id)
                .limit(1);
            if (order.length) {
                let result = await axios.get(`${config.ordersEndpoint}${order[0].order_uri}`);

                if (result.status === 200) {
                    return result.data.meals.reduce((response, currentMeal) => {
                        response.meals.push(currentMeal.name);
                        return response;
                    }, {meals: []});
                }
            }

            return false;
        } catch (e) {
            return false;
        }
    }
}

module.exports = ReservationsModel;