process.env.NODE_ENV = 'test';
const request = require('supertest');
const expect = require('chai').expect;
const knex = require('../../db');
const moment = require('moment');
const sinon = require('sinon');
const ReservationModel = require('../../app/models/Reservations');

describe('Create reservation', () => {
    let server;
    let reservation;
    let stub;

    const exec = () => {
        return request(server).post('/api/reservations');
    };

    beforeEach(async () => {
        server = require('../../index');
        await knex.migrate.rollback();
        await knex.migrate.latest();
        await knex.seed.run();
        reservation = new ReservationModel();
    });

    afterEach(async () => {
        await knex.migrate.rollback();
        await server.close();
        reservation = null;
        stub = sinon.reset();
    });

    after(() => {
        stub = sinon.restore();
    });

    it('should return 400 if body request empty', async () => {
        let res = await exec().send();
        expect(res.status).to.be.equal(400);
        expect(res.type).to.be.equal('application/json');
    });

    it('should return 400 if body request invalid', async () => {
        let res = await exec().send({"reservation": {"guests": 11, "time": "2018-09-21", "duration": 0.4}});
        expect(res.status).to.be.equal(400);
        expect(res.type).to.be.equal('application/json');
    });

    it('should return 409 if reservation is impossible', async () => {
        let time = moment().utc().add(1, 'h').format('YYYY-MM-DDTHH:mm:ssZ');
        await exec().send({
            "reservation": {
                "guests": 10,
                "time": time,
                "duration": 5
            }
        });
        let res = await exec().send({
            "reservation": {
                "guests": 10,
                "time": time,
                "duration": 0.5
            }
        });
        expect(res.status).to.be.equal(409);
        expect(res.type).to.be.equal('application/json');
    });

    it('should return 500 on internal error', async () => {
        await knex.migrate.rollback();
        let res = await exec().send({
            "reservation": {
                "guests": 10,
                "time": moment().utc().add(1, 'h').format('YYYY-MM-DDTHH:mm:ssZ'),
                "duration": 0.5
            }
        });
        expect(res.status).to.be.equal(500);
        expect(res.type).to.be.equal('application/json');
    });

    it('should return 500 on internal error in model save', async () => {
        await knex.migrate.rollback();
        stub = sinon.stub(reservation, 'isConflict').resolves(false);
        let res = await exec().send({
            "reservation": {
                "guests": 10,
                "time": moment().utc().add(1, 'h').format('YYYY-MM-DDTHH:mm:ssZ'),
                "duration": 0.5
            }
        });
        expect(res.status).to.be.equal(500);
        expect(res.type).to.be.equal('application/json');
    });

    it('should return 201 and Location header if reservation created', async () => {
        let res = await exec().send({
            "reservation": {
                "guests": 10,
                "time": moment().utc().add(1, 'h').format('YYYY-MM-DDTHH:mm:ssZ'),
                "duration": 0.5
            }
        });
        expect(res.status).to.be.equal(201);
        expect(res.type).to.be.equal('application/json');
        expect(res.header['location']).to.be.equal('api/reservations/1');
    });
});