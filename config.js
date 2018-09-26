module.exports = {
    test: {
        ordersEndpoint: process.env.TEST_ORDER_ENDPOINT || 'http://localhost:8001'
    },
    production: {
        ordersEndpoint: process.env.ORDER_ENDPOINT || 'http://localhost:8001'
    }
};
