const argobot = require('./al0bot');
const express_server = require('express');
const bodyParser = require('body-parser');
const config = require('./models/config');
const al0_router= config.router;


const botServer_router = express_server.Router();
botServer_router.use(bodyParser.json());


//le richieste post vengono processate da al0bot.js
botServer_router.post(al0_router+'/post', function (req, res) {
	argobot.processUpdate(req.body);
	res.status(200).send('Tutto bene, gestita la richiesta. Ciao!\n');
});

botServer_router.get('/Al0', function (req, res) {
	res.status(200).sendFile('/home/nrc/bot/statics/index.html');
});

botServer_router.get(al0_router, function (req, res) {
	console.log("mumble....");
	res.status(200).sendFile('/bot/statics/index.html');
});


module.exports = botServer_router;