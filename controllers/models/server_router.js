const argobot = require('../al0bot');
const express_server = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const al0_router= config.router;


const botServer_router = express_server.Router();
botServer_router.use(bodyParser.json());


//le richieste post vengono processate da al0bot.js
botServer_router.post(al0_router+'/post', function (req, res) {
	argobot.processUpdate(req.body);
	res.status(200).send('Tutto bene, gestita la richiesta. Ciao!\n');
});


module.exports = botServer_router;