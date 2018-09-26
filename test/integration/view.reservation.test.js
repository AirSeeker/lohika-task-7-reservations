process.env.NODE_ENV = 'test';
const request = require('supertest');
const expect = require('chai').expect;
const knex = require('../../db');
const moment = require('moment');

describe('View reservation', () => {
    let server;

    beforeEach(async () => {
        server = require('../../index');
        await knex.migrate.rollback();
        await knex.migrate.latest();
        await knex.seed.run();
    });

    afterEach(async () => {
        await knex.migrate.rollback();
        await server.close();
    });

    it('should return 400 if request param invalid', async () => {
        let res = await request(server).get('/api/reservations/test').send();
        expect(res.status).to.be.equal(400);
        expect(res.type).to.be.equal('application/json');
    });

    it('should return 404 if reservation not found', async () => {
        let res = await request(server).get('/api/reservations/1').send();
        expect(res.status).to.be.equal(404);
        expect(res.type).to.be.equal('application/json');
    });

    it('should return 500 on internal error', async () => {
        await knex.migrate.rollback();
        let res = await request(server).get('/api/reservations/1').send();
        expect(res.status).to.be.equal(500);
        expect(res.type).to.be.equal('application/json');
    });

    it('should return 200 if reservation exists', async () => {
        let start = moment().utc().add(1, 'h').format('YYYY-MM-DDTHH:mm:ssZ');
        let end = moment(start, 'YYYY-MM-DDTHH:mm:ssZ').utc().add(30, 'm').format('YYYY-MM-DDTHH:mm:ssZ');
        await request(server).post('/api/reservations').send({
            "reservation": {
                "guests": 10,
                "time": start,
                "duration": 0.5
            }
        });
        const res = await request(server).get('/api/reservations/1').send();
        expect(res.status).to.be.equal(200);
        expect(res.type).to.be.equal('application/json');
        expect(res.body).to.be.deep.equal({
            reservation: {
                id: 1,
                guests: 10,
                start: start,
                end: end,
                table: {
                    number: 10,
                    capacity: 10
                }
            }
        });
    });
});