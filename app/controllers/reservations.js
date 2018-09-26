const ReservationsModel = require('../models/Reservations');

class Reservations {
    static async createReservation(req, res) {
        const model = new ReservationsModel();
        if (model.validate(req.body)) {
            let conflict = await model.isConflict();

            if (conflict instanceof Error) {
                return res.status(500).send();
            }


            if (conflict) {
                return res.status(409).send();
            }

            let result = await model.save();

            if (result instanceof Error) {
                return res.status(500).send();
            }

            if (result) {
                return res.set('Location', `api/reservations/${model.id}`).status(201).send();
            }
        }
        return res.status(400).send();
    }

    static async getReservationInfo(req, res) {
        const model = new ReservationsModel();
        if (!req.params.reservation_id || !model.validateId(req.params.reservation_id)) {
            return res.status(400).send();
        }

        const result = await model.findOne();

        if (result instanceof Error) {
            return res.status(500).send();
        }

        if (result) {
            return res.status(200).send(result);
        }

        return res.status(404).send();
    }

    static async updateReservation(req, res) {
        const model = new ReservationsModel();
        if (!model.validateId(req.params.reservation_id)) {
            return res.status(400).send();
        }

        if (model.validate(req.body)) {
            const result = await model.findOne();

            if (result instanceof Error) {
                return res.status(500).send();
            }

            if (!result) {
                return res.status(404).send();
            }

            let conflict = await model.isConflict();

            if (conflict instanceof Error) {
                return res.status(500).send();
            }

            if (conflict) {
                return res.status(409).send();
            }

            let updateResult = await model.update();

            if (updateResult instanceof Error) {
                return res.status(500).send();
            }

            if (updateResult) {
                return res.set('Location', `api/reservations/${model.id}`).status(200).send();
            }
        }

        return res.status(400).send();
    }

    static async deleteReservation(req, res) {
        const model = new ReservationsModel();
        if (!model.validateId(req.params.reservation_id)) {
            return res.status(400).send();
        }
        const result = await model.deleteOne();

        if (result instanceof Error) {
            return res.status(500).send();
        }

        if (result) {
            return res.status(204).send();
        }

        return res.status(404).send();
    }

    static async createOrder(req, res) {
        const model = new ReservationsModel();
        if (!req.params.reservation_id || !model.validateId(req.params.reservation_id)) {
            return res.status(400).send();
        }

        const result = await model.findOne();
        if (result instanceof Error) {
            return res.status(500).send();
        }

        if (!result) {
            return res.status(404).send();
        }

        if (result) {
            let result = await model.saveOrder(req.body);

            if (result) {
                return res.status(201).send();
            }
        }

        return res.status(400).send();
    }

    static async getOrdersInfo(req, res) {
        const model = new ReservationsModel();
        if (!req.params.reservation_id || !model.validateId(req.params.reservation_id)) {
            return res.status(400).send();
        }

        const result = await model.findOne();

        if (result instanceof Error) {
            return res.status(500).send();
        }

        if (result) {
            let result = await model.findOrder();
            if (result) {
                return res.status(200).send(result);
            }
        }

        return res.status(404).send();
    }
}

module.exports = Reservations;