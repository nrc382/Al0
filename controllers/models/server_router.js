const argobot = require('../al0bot');
const express_server = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const al0_router= config.router;
let boot_date = Date.now();

const botServer_router = express_server.Router();
botServer_router.use(bodyParser.json());

botServer_router.get(al0_router, function (req, res){
	console.log("Ricevuta get sul bot router!");
	console.log(req.headers.origin);
	console.log(req.headers.cookie);

	let al_infos = argobot.getInfos();
	res.status(200).json({elapsed: al_infos.start_date, msg: 'Tutto bene, sono online. Ciao!\n', bot_stats: al_infos.t_stat});
});

botServer_router.get('/', function (req, res){
	console.log("Ricevuta richiesta... su main");
	res.status(200).json({elapsed: boot_date, msg: 'Tutto bene, sono online. Ciao!\n'});
});


//le richieste post vengono processate da al0bot.js
botServer_router.post(al0_router+'/post', function (req, res) {
	console.log("Ricevuta post sul router del bot");

	argobot.al0_bot.processUpdate(req.body);
	res.status(200).send('Tutto bene, gestita la richiesta. Ciao!\n');
});


module.exports = botServer_router;