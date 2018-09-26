process.env.NODE_ENV = 'test';
const expect = require('chai').expect;
const sinon = require('sinon');
const moment = require('moment');
const ReservationModel = require('../../app/models/Reservations');

describe('Reservation Model', () => {
    let reservation;
    let stub;

    beforeEach(() => {
        reservation = new ReservationModel();
    });

    afterEach(() => {
        reservation = null;
        stub = sinon.reset();
    });

    after(() => {
        stub = sinon.restore();
    });

    describe('method validateId', () => {
        it('should return true if passed parameter integer and >= 1', () => {
            expect(reservation.validateId(1)).to.be.true;
            expect(reservation.validateId('1')).to.be.true;
        });

        it('should return false if passed parameter not integer or < 1', () => {
            expect(reservation.validateId(0)).to.be.false;
            expect(reservation.validateId(-1)).to.be.false;
            expect(reservation.validateId('0')).to.be.false;
            expect(reservation.validateId('-1')).to.be.false;
            expect(reservation.validateId(true)).to.be.false;
            expect(reservation.validateId(false)).to.be.false;
            expect(reservation.validateId(null)).to.be.false;
            expect(reservation.validateId()).to.be.false;
            expect(reservation.validateId('')).to.be.false;
            expect(reservation.validateId({})).to.be.false;
            expect(reservation.validateId([])).to.be.false;
            expect(reservation.validateId(NaN)).to.be.false;
        });

        it('should set id property if passed parameter integer and >= 1', () => {
            reservation.validateId(1);
            expect(reservation.id).to.be.equal(1);
        });
    });

    describe('method validate', () => {
        it('should return false if given object do not have all required and valid properties', () => {
            expect(reservation.validate()).to.be.false;
            expect(reservation.validate(1)).to.be.false;
            expect(reservation.validate('1')).to.be.false;
            expect(reservation.validate(0)).to.be.false;
            expect(reservation.validate(-1)).to.be.false;
            expect(reservation.validate('0')).to.be.false;
            expect(reservation.validate('-1')).to.be.false;
            expect(reservation.validate(true)).to.be.false;
            expect(reservation.validate(false)).to.be.false;
            expect(reservation.validate(null)).to.be.false;
            expect(reservation.validate(undefined)).to.be.false;
            expect(reservation.validate('')).to.be.false;
            expect(reservation.validate({})).to.be.false;
            expect(reservation.validate([])).to.be.false;
            expect(reservation.validate(NaN)).to.be.false;
            let requestBody = {
                reservation: {}
            };
            expect(reservation.validate(requestBody)).to.be.false;
            requestBody.reservation.guests = '';
            expect(reservation.validate(requestBody)).to.be.false;
            requestBody.reservation.time = '';
            expect(reservation.validate(requestBody)).to.be.false;
            requestBody.reservation.duration = '';
            expect(reservation.validate(requestBody)).to.be.false;

            requestBody.reservation.guests = 0;
            expect(reservation.validate(requestBody)).to.be.false;
            requestBody.reservation.time = 0;
            expect(reservation.validate(requestBody)).to.be.false;
            requestBody.reservation.duration = 0;
            expect(reservation.validate(requestBody)).to.be.false;


            requestBody.reservation.guests = 12;
            expect(reservation.validate(requestBody)).to.be.false;
            requestBody.reservation.time = '1970-01-01';
            expect(reservation.validate(requestBody)).to.be.false;
            requestBody.reservation.duration = 0.4;
            expect(reservation.validate(requestBody)).to.be.false;
        });

        it('should return true if given object have all required and valid properties', () => {
            let requestBody = {
                reservation: {
                    guests: 1,
                    time: moment().utc().add(1, 'h').format('YYYY-MM-DDTHH:mm:ssZ'),
                    duration: 0.5
                }
            };

            expect(reservation.validate(requestBody)).to.be.true;
        });

        it('should set properties if given object have all required and valid properties', () => {
            let requestBody = {
                reservation: {
                    guests: 1,
                    time: moment().utc().add(1, 'h').format('YYYY-MM-DDTHH:mm:ssZ'),
                    duration: 0.5
                }
            };
            let reservationEnd = moment(requestBody.reservation.time, 'YYYY-MM-DDTHH:mm:ssZ').utc()
                .add(30, 'm').format('YYYY-MM-DDTHH:mm:ssZ');
            expect(reservation.validate(requestBody)).to.be.true;
            expect(reservation.guests).to.be.equal(requestBody.reservation.guests);
            expect(reservation.time).to.be.equal(requestBody.reservation.time);
            expect(reservation.duration).to.be.equal(requestBody.reservation.duration);
            expect(reservation.reservationEnd).to.be.equal(reservationEnd);
        });
    });

    describe('method isConflict', () => {
        it('should search for available tables return false if exists', async () => {
            reservation.id = 1;
            stub = sinon.stub(reservation, 'getFreeTables').resolves([1, 2]);
            let result = await reservation.isConflict();
            expect(result).to.be.false;
        });

        it('should search for available tables return true if not exists', async () => {
            reservation.id = 1;
            stub = sinon.stub(reservation, 'getFreeTables').resolves([]);
            let result = await reservation.isConflict();
            expect(result).to.be.true;
        });

        it('should search for available tables return instance of Error on error', async () => {
            reservation.id = 1;
            stub = sinon.stub(reservation, 'getFreeTables').resolves(new Error('Test'));
            let result = await reservation.isConflict();
            expect(result).to.be.instanceOf(Error);
        });
    });

    describe('method getFreeTables', () => {
        it('should should return instance of Error on reject', async () => {
            reservation.id = 1;
            stub = sinon.stub(reservation, 'getFreeTables').resolves(new Error('Test'));
            let result = await reservation.getFreeTables(1);
            expect(result).to.be.instanceOf(Error);
        });
    });

    describe('method update', () => {
        it('should should return false if no freeTables left', async () => {
            reservation.freeTables = [];
            let result = await reservation.update();
            expect(result).to.be.false;
        });

        it('should should return instance of Error on reject', async () => {
            reservation.freeTables = [1];
            stub = sinon.stub(reservation, 'update').resolves(new Error('Test'));
            let result = await reservation.update();
            expect(result).to.be.instanceOf(Error);
        });
    });

    describe('method save', () => {
        it('should should return false if no freeTables left', async () => {
            reservation.freeTables = [];
            let result = await reservation.save();
            expect(result).to.be.false;
        });

        it('should should return instance of Error on reject', async () => {
            reservation.freeTables = [1];
            stub = sinon.stub(reservation, 'save').resolves(new Error('Test'));
            let result = await reservation.save();
            expect(result).to.be.instanceOf(Error);
        });
    });

    describe('method save', () => {
        it('should should return instance of Error on reject', async () => {
            reservation.freeTables = [1];
            stub = sinon.stub(reservation, 'findOne').resolves(new Error('Test'));
            let result = await reservation.findOne();
            expect(result).to.be.instanceOf(Error);
        });
    });

    describe('method deleteOne', () => {
        it('should should return instance of Error on reject', async () => {
            reservation.freeTables = [1];
            stub = sinon.stub(reservation, 'deleteOne').resolves(new Error('Test'));
            let result = await reservation.deleteOne();
            expect(result).to.be.instanceOf(Error);
        });
    });
});