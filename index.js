const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const reservationsRoutes = require('./app/routes/reservations');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(function (req, res, next) {
    res.type('application/json');
    next();
});

app.use('/api', reservationsRoutes);

const server = app.listen(8080, () => {
    console.log('App is running on port 8080');
});

module.exports = server;