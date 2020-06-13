const bot_router = require('./controllers/server_router');
const express = require('express');
const config = require('./models/config');
const port = config.server_port;


var express_server = new express();
express_server.use(bot_router);


var bot_server = express_server.listen(port, function () {
	var port = bot_server.address().port;
	console.log("> Express server in ascolto sulla porta: " + port);
});


const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});

readline.on(`line`, function (line) {
	if (line.match("memoria")) {
		let usedMem = process.memoryUsage();
		console.log("–––––––––––––––");
		if (line.match(" v")) {
			console.log("> Memoria alloccata (totale): " + Math.round(usedMem.heapTotal / 1024 / 1024 * 100) / 100 + " MB");
			console.log("> Memoria usata (attuale): " + Math.round(usedMem.heapUsed / 1024 / 1024 * 100) / 100 + " MB");
			console.log("> Memoria usata (altro): " + Math.round(usedMem.external / 1024 / 1024 * 100) / 100 + " MB");
			console.log("\n");
		}
		console.log("> Memoria usata (TOT): " + Math.round(usedMem.rss / 1024 / 1024 * 100) / 100 + " MB");
		console.log("–––––––––––––––");

	} else if (line.match("cpu")) {
		let usedCPU = process.cpuUsage();
		if (line.match(" v")) {

			// var startUsage = process.cpuUsage();
			// let medium_usage;
			// let start_time = Date.now() / 1000;
			// let tmp_now = start_time;
			// while ( (start_time - tmp_now) < 60) {
			// 	tmp_now = Date.now() / 1000;
			// 	if (tmp_now % 2 == 0){
			// 		usedCPU = process.cpuUsage();
			// 		medium_usage = process.cpuUsage(startUsage);
			// 		console.log("> UTENTE: " + Math.round(usedCPU.user / 1024 / 1024 * 100) / 100 + " % "+ "("+ Math.round(medium_usage.user / 1024 / 1024 * 100) / 100 +")");
			// 		console.log("> SISTEMA: " + Math.round(usedCPU.system / 1024 / 1024 * 100) / 100 + " % "+ "("+ Math.round(medium_usage.system / 1024 / 1024 * 100) / 100 +")");
			// 	}
			// }

		} else{
			console.log("> CPU usata (UTENTE): " + Math.round(usedCPU.user / 1024 / 1024 * 100) / 100 + " %");
		console.log("> CPU usata (SISTEMA): " + Math.round(usedCPU.system / 1024 / 1024 * 100) / 100 + " %");
		}


	}
});

// function secNSec2ms(secNSec) {
// 	return secNSec[0] * 1000 + secNSec[1] / 1000000
// }