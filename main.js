const bot_router = require('./controllers/models/server_router');
const express = require('express');
const config = require('./models/config');
const port = config.server_port;


var express_server = new express();
express_server.use(bot_router);


var bot_server = express_server.listen(port, function () {
	console.log("> Express server in ascolto per Al0 ");
});



// function secNSec2ms(secNSec) {
// 	return secNSec[0] * 1000 + secNSec[1] / 1000000
// }