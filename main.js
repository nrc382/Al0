const bot_router = require('./controllers/models/server_router');
const express = require('express');
const config = require('./models/config');
const port = config.server_port;


var express_server = new express();
express_server.use(bot_router);
express_server.listen(port, function () {
	console.log("> Express server in ascolto per Al0 ");
});
