const TelegramBot = require('node-telegram-bot-api');
const argo_controller = require('./argonauti_controller');
const cards_controller = require('./figurineManager');
const lega_controller = require('./Lega/LegaController');
const schedule = require('node-schedule');
const config = require('./models/config');

//const tips_controller = require('./Suggerimenti/tips_message_controller');

const token = config.token;

const al0_bot = new TelegramBot(token, { filepath: false });
module.exports = al0_bot;

const creatore = config.creatore_id;
const nikoID = config.niko_id;
const edicolaID = config.edicola_id;




console.log("\n\n\n\n*************\n> Start...");
argo_controller.update().then(function (argo_res) {
	if (argo_res === -1) {
		console.error("> Esco!");
		process.exit(1);
	}
	console.log("> Fatto update del controller Argo. Argonauti: " + argo_res.argonauts + ", Oggetti: " + argo_res.items);


	cards_controller.loadAllCards(false).then(function (card_res) {
		if (typeof card_res.new != "undefined" && card_res.new != false) {
			console.log("> Lista figurine aggiornata, ecco le nuove: ");
			console.log(card_res.new);

		}

		cards_controller.loadEdicolaStuff().then(function (edicola_res) {
			if (!edicola_res) {
				console.error("> Modulo Edicola NON inizializzato!!");
			} else {
				console.log("> Modulo Edicola inizializzato");
			}

			console.log("> Check WebHook Telegram...");

			const options = {
				"max_connections": 5,
				allowed_updates: ["message", "inline_query", "chosen_inline_result", "callback_query"]
			};
			al0_bot.setWebHook('https://www.al0.eu/' + '6031261970:AAG6BM-9XxAl0' + '/post', options).then(function (webHook_res) {
				if (webHook_res) {
					console.log("> Al0 bot è attivo e registrato");
				} else {
					console.log("> Woops! Non son riuscito a registrare il WebHookTelegram!\n> ESCO!");
					process.exit(1);
				}

				// console.log("> Avvio rutine...");
				// init();
				let usedMem = process.memoryUsage();
				console.log("> Memoria alloccata (totale): " + Math.round(usedMem.heapTotal / 1024 / 1024 * 100) / 100) + " MB";
				console.log("> Memoria usata (attuale): " + Math.round(usedMem.heapUsed / 1024 / 1024 * 100) / 100) + " MB";
				console.log("> Memoria usata (altro): " + Math.round(usedMem.external / 1024 / 1024 * 100) / 100) + " MB";
				console.log("> Memoria usata (TOT): " + Math.round(usedMem.rss / 1024 / 1024 * 100) / 100) + " MB";
				console.log("> Fine start\n****************\n\n");
			});
		});
	}).catch(function (err) {
		console.log(err);
		console.log("> Fine start (CON ERRORI)\n****************\n\n");
		process.exit(1);
	});
});


let edicola_blacklist = []

function init() {

	const edicolaID = -1001225957195;

	let sche = schedule.scheduleJob('00 47 12 * * *', function () {
		console.log("*************");
		console.log("> Eseguo runtime Edicola");
		edicola_newDaytext = cards_controller.edicola_dailyMsg().text;

		al0_bot.sendMessage(edicolaID, edicola_newDaytext, {
			parse_mode: "Markdown",
			disable_web_page_preview: true
		}).then(function (send_esit) {
			console.log("> Messaggio inviato, aggiorno e fisso.");

			let updated_edicola_infos = {
				edicolaGroupID: edicolaID,
				pinnedMsgID: send_esit.message_id,
				curr_text: edicola_newDaytext
			};

			cards_controller.updateEdicolaStuff(updated_edicola_infos).then(function (edicola_updated) {
				al0_bot.pinChatMessage(edicolaID, send_esit.message_id);
			})

		});
	});
	console.log("> Scheduler Avviato");
	//console.log(sche);

}


// #EVENTS

al0_bot.on('unhandledRejection', (reason, p) => {
	//console.log('Unhandled Rejection at:', p, 'reason:', reason);
	console.log("Crash!");
	console.log(reason);
});

al0_bot.on('chosen_inline_result', function (in_query) {
	console.log("Tap su risultato query");
	console.log("> " + in_query.from.first_name + ", il risultato: " + in_query.result_id);
	let parse_query = in_query.result_id.split(":");
	console.log("parse_query: " + parse_query.join("-"));
	if (parse_query.length >= 2) {
		if (parse_query[1] == "CRFT") {
			let tmp_now = Date.now().toString().slice(-10);
			console.log("> Confronto: " + tmp_now);
			console.log("> Con:       " + parse_query[0]);
			console.log("Difference: " + (parseInt(tmp_now) - parseInt(parse_query[0])));
			let user = argo_controller.check(in_query.from.username, in_query.query);

			if (parse_query[2] == "FINITO") {
				return argo_controller.deleteCraftList(user.info.id).then(function (del_res) {
					console.log("FINE GIUSTA della risposta\n--------------");
				});
			}
			//  else if (parse_query[2] != "OPT") {
			// 	parse_query.shift();
			// 	return argo_controller.craftLine_InstantUpdate(user.info, parse_query).then(function (update_craft_res) {
			// 		console.log("FINE GIUSTA della risposta\n--------------");
			// 	});

			// }


		} else if ((parse_query[1] == "DNG")) {
			return argo_controller.quickFillerConfirm(parse_query[2], parse_query[3], parse_query[4], parse_query[5]).then(function (dng_update_res) {

			});
		} else if (parse_query[0] == "🎒") {
			console.log("Trigger per aggiorna zaino di " + in_query.from.id);
			return argo_controller.endCraft_ZainoUpdate(in_query.from.id).then(function (zaino_updateText) {
				console.log("Is Over? " + zaino_updateText);
				if (typeof zaino_updateText == "string") {
					//return argo_controller.deleteCraftList(in_query.from.id).then(function (delete_res) {
					let button = [];
					button.push([{
						text: "Chiudi ⌫",
						callback_data: 'ARGO:FORGET'
					}]);
					if (parse_query[2] == "SMUGGLER_UPDATE") {
						button.unshift([{
							text: "Venduto!",
							callback_data: "ARGO:SMUGL:SELL:"
						}]);
					} else if (parse_query[2] == "ASSALTO_UPDATE") {
						button.unshift([{
							text: "Aggiorna lo Zaino 🎒",
							callback_data: "ARGO:CRAFT:ASSALTO_UPDATE:"
						}]);
					} else {
						button.unshift([{
							text: "Elimina Linea ⌫",
							callback_data: "ARGO:CRAFT:LIST_DEL:"
						}]);
					}
					let message = {
						toSend: {
							chat_id: in_query.from.id,
							message_txt: zaino_updateText,
							options: {
								parse_mode: "Markdown",
								disable_web_page_preview: true,
								reply_markup: {
									inline_keyboard: button
								}
							}
						}
					};

					return bigSend(message);

					//});

				} else {
					return al0_bot.sendMessage(
						parse_query[2],
						"Non mi risulta tu stia seguendo una linea craft...",
						{
							parse_mode: "Markdown",
							disable_web_page_preview: true
						}
					);
				}
			});
		}
	}
});

// • INLINE
al0_bot.on('inline_query', function (in_query) {

	let user = argo_controller.check(in_query.from.username, in_query.query);
	let options = {
		is_personal: true,
		next_offset: "",
		cache_time: 0,
	};
	let first_word = in_query.query.split(" ")[0].toLowerCase();
	if (first_word.length >= 4 && "figurine".match(first_word)) {
		let options2 = {
			is_personal: false,
			next_offset: " ",
			cache_time: 20,
		};
		return cards_controller.manageInline(in_query, user).then(function (inline_res) {

			if (inline_res.length > 0) {
				al0_bot.answerInlineQuery(
					in_query.id,
					inline_res,
					options2
				).catch(function (err) {
					console.log("errore inviando la query: " + in_query.id);
					//console.log(inline_res);
					console.log(err);
				});
			} else {
				console.log("> Nel brutto else!");
				al0_bot.answerInlineQuery(
					in_query.id,
					null,
					options
				);
			}
		});
	} else if (user.isArgonaut) {
		return argo_controller.manageInline(in_query, user).then(function (inline_res) {
			if (inline_res.length > 0) {
				al0_bot.answerInlineQuery(
					in_query.id,
					inline_res,
					options
				).catch(function (err) {
					console.log("errore inviando la query: " + in_query.id);
					//console.log(inline_res);
					console.log(err);
				});
			}
		});
	} else {
		let date_str = Date.now().toString();
		let inline_res = {
			type: "article",
			id: date_str.substring(1, 4) + date_str.substring(date_str.length - 10, date_str.length) + Math.random() * 333,
			title: "🙃\n",
			description: "Non sei un Argonauta!",
			input_message_content: {
				message_text: "Ciao, " + in_query.from.username.split("_").join("\_") + "!\n\nPurtroppo la maggior parte delle funzioni inline sono riservate ad Argonauti ed _Amici_, al momento.\n\nSe credi, puoi richiedere l'inserimento del tuo team a @nrc382",
				disable_web_page_preview: true,
				parse_mode: "Markdown"
			},
			thumb_url: "https://www.shareicon.net/data/128x128/2016/02/10/716839_sailing_512x512.png"
		};
		console.log(first_word);
		al0_bot.answerInlineQuery(
			in_query.id,
			[inline_res],
			options
		).catch(function (err) {
			console.log("errore inviando la query: " + in_query.id);
			//console.log(inline_res);
			console.log(err);
		});

	}

});

// • CALLBACK_BUTTONS
al0_bot.on('callback_query', function (query) {
	//var text = query.data;
	var query_crossroad = query.data.split(":")[0];
	console.log("> CallBack da " + query.from.first_name); //+": "+"\n\t> " + func.join(""));
	let main_managers = ['ARGO', 'SUGGESTION', 'LEGA']
	if (main_managers.indexOf(query_crossroad) >= 0) {
		let manager;

		if (query_crossroad == 'ARGO') {
			manager = argo_controller.callBack(query);
		} else if (query_crossroad == 'SUGGESTION') {
			//manager = tips_controller.manageCallBack(query);
		} else if (query_crossroad == 'LEGA') {
			manager = lega_controller.menageQuery(query);
		}

		return manager.then(function (query_res) {
			let res_array = [];
			if (!(query_res instanceof Array)) {
				res_array.push(query_res);
			} else {
				console.log("> query_res è un array!")
				res_array = query_res.slice(0, query_res.length);
				console.log(res_array);
			}

			let query_result = res_array.filter(function (sing) {
				return typeof sing.query != "undefined";
			})[0];

			al0_bot.answerCallbackQuery(
				query_result.query.id,
				query_result.query.options
			).catch(function (err) {
				console.log("Errore Query: ");
				console.log(err.response.body);
			}).then(function (query_sent) {
				//console.log(query_sent);
				for (let i = 0; i < res_array.length; i++) {
					if (res_array[i].toDelete) {
						al0_bot.deleteMessage(
							res_array[i].toDelete.chat_id,
							res_array[i].toDelete.mess_id
						).catch(function (err) {
							console.log("Errore toDelete: ");
							console.log(err.response.body);
						});
					}
					if (res_array[i].toEdit) {
						al0_bot.editMessageText(
							res_array[i].toEdit.message_txt,
							{
								chat_id: res_array[i].toEdit.chat_id,
								message_id: res_array[i].toEdit.mess_id,
								parse_mode: res_array[i].toEdit.options.parse_mode,
								disable_web_page_preview: true,
								reply_markup: res_array[i].toEdit.options.reply_markup
							}
						).catch(function (err) {
							console.log("Errore toEdit: ");
							console.log(err.response.body);
						});
					}
					if (res_array[i].toSend) {
						let charCount = res_array[i].toSend.message_txt.length;
						if (charCount >= 3500) {
							let arr = chunkSubstr(res_array[i].toSend.message_txt, 100);
							for (let l = 0; l < arr.length; l++) {
								al0_bot.sendMessage(
									res_array[i].toSend.chat_id,
									arr[l],
									res_array[i].toSend.options
								).catch(function (err) {
									console.log(err);
									al0_bot.sendMessage(
										res_array[i].toSend.chat_id,
										"🥴 Upps!\n" +
										"Volevo dire qualche cosa ma... \n"
									);
								});
							}
						} else {
							al0_bot.sendMessage(
								res_array[i].toSend.chat_id,
								res_array[i].toSend.message_txt,
								res_array[i].toSend.options
							).catch(function (err) {
								console.log("Errore toSend: ");
								console.log(err.response.body);

							});
						}
					}

				}
			});
		}).catch(function (err) {
			console.log("> C'è stato un errore di sotto...");
			console.log(err);
		});
	} else if (query_crossroad == "EDICOLA") { // EDICOLA:OK
		al0_bot.answerCallbackQuery(
			query.id,
			{ text: "\nPerfetto!", show_alert: false, cache_time: 4 }
		).catch(function (err) {
			console.log("Errore Query: ");
			console.log(err.response.body);
		}).then(function (answer_res) {
			for (var i = 0; i < edicola_blacklist.length; i++) {
				if (edicola_blacklist[i] === query.from.id) {
					edicola_blacklist.splice(i, 1);
				}
			}
			al0_bot.editMessageText(
				query.message.text + "\n\n(:",
				{
					chat_id: query.message.chat.id,
					message_id: query.message.message_id,
					parse_mode: "Markdown",
					disable_web_page_preview: true,
				}).catch(function (err) {
					console.log("Errore toEdit: ");
					console.log(err.response.body);
				});
		});
	} else {
		al0_bot.answerCallbackQuery(
			query.id,
			{ text: "\nCos??", show_alert: true, cache_time: 1 }
		).catch(function (err) {
			console.log("Errore Query: ");
			console.log(err.response.body);
		});
	}
});

// • MESSAGES
al0_bot.on("message", function (message) {
	if (typeof message.text != 'undefined') {
		let message_array = message.text.toLowerCase().split(" ");
		let figu_array = ["⌘", "☆", "🃟", "⏣"];
		if (figu_array.indexOf(message_array[0]) > 0) {
			return cards_controller.cardsManager(message).then(function (res_mess) {
				bigSend(res_mess);
			});
		}
		if (message_array[0] == "/arena") {
			if (message.chat.id != message.from.id) {
				return al0_bot.sendMessage(
					message.chat.id,
					"⧱ *Desolato...*\n\nL'Arena Argonauta è disponibile solo in chat privata.",
					{
						parse_mode: "Markdown",
						disable_web_page_preview: true
					}
				);
			} else {
				console.log("\n\n> INIZIO (msg)\n****************\n");
				return lega_controller.menage(message).then(function (res_mess) {
					console.log("\n> FINE\n*********\n\n");
					return bigSend(res_mess);
				})
			}
		}
		//  else if (message_array[0].split(" ")[0].match("sugg")) {
		// 	return tips_controller.suggestionManager(message).then(function (sugg_res) {
		// 		return bigSend(sugg_res);
		// 	});
		// }

		return askChatMembers(message).then(function (chat_members) {

			if (chat_members <= 5) {
				message.chat.type = "private";
			}
			if (message_array[0] == ("/rune")) { //^
				console.log("> Comando Rune");

				let random_array = [];
				if (message_array.length > 1) {
					random_array = message_array[1].split("");
				} else {
					for (let i = 0; i < 5; i++) {
						random_array.push(getRandomInt(1, 7));
					}
				}


				let ligth_array = [];
				let heavy_array = [];

				let ethereogeneity = 1;
				let suggestion = "";
				console.log("> Imput: " + random_array);

				for (let i = 0; i < random_array.length; i++) {
					if (ligth_array.indexOf(random_array[i]) < 0) {
						ligth_array.push(random_array[i]);
						heavy_array.push({ number: random_array[i], quantity: 1, index: (1 + i) });
					} else {
						ethereogeneity++;
						for (let k = 0; k < heavy_array.length; k++) {
							if (heavy_array[k].number == random_array[i]) {
								heavy_array[k].quantity++;
								break;
							}
						}
					}
				}
				console.log("> Max ethereogeneity: " + ethereogeneity);

				console.log("> Prima del sort: ");
				console.log(heavy_array);

				heavy_array.sort(function (a, b) {
					var n = a.quantity - b.quantity;
					if (n !== 0) {
						return n;
					}
					return a.number - b.number;
				});
				console.log("> Dopo il sort: ");
				console.log(heavy_array);
				message.from.first_name
				let change_array = [];
				if (ethereogeneity == 1) {
					let start = heavy_array[0].number;
					let isContinuos = true;

					for (let k = 1; k < 5; k++) {
						if (heavy_array[k].number != (start + 1)) {
							isContinuos = false;
							break;
						} else {
							start++;
						}
					}
					if (isContinuos) {
						suggestion = "\nMa quella... è una scala!";

					} else {
						suggestion = "\nSe lo chiedi a me... le cambierei tutte!";
					}
				} else {
					let limit = (ethereogeneity / heavy_array.length) <= 1 ? 2 : Math.round(1 + (ethereogeneity / heavy_array.length));
					for (let k = 0; k < heavy_array.length; k++) {
						if (heavy_array[k].quantity < limit) {
							change_array.push(heavy_array[k]);
						}
					}

					if (change_array.length == 0) {
						suggestion += "\nIo non cambierei nulla...";
					} else if (change_array.length == 1) {
						suggestion += "\nIo cambierei solo una runa, ";
						if (change_array[0].number == 1) {
							suggestion += "l'1!";
						} else {
							if ((1 + Math.random() * 7) % 3 == 0) {
								suggestion += "la " + change_array[0].index + "°!";
							} else {
								suggestion += "il " + change_array[0].number + "!";
							}
						}
					} else if (change_array.length == 5) {
						suggestion += "\nIo... le cambierei tutte!";
					} else {
						suggestion = [];

						for (let k = 0; k < change_array.length; k++) {
							if (change_array[k].number == 1) {
								suggestion.push("l'1");
							} else {
								suggestion.push("il " + change_array[k].number);
							}
						}
						suggestion = "\nIo avrei cambiato:" + suggestion.join(", ");
					}

					suggestion += "\nEterogeneità " + ethereogeneity + "!\n";
					// suggestion += "\nGruppi"+heavy_array.length+"\n";


				}

				console.log("> change_array: ");
				console.log(change_array);


				let second_random = [];
				let final_string = "";
				change_array = [];

				for (let i = 0; i < 5; i++) {
					if (Math.floor(Math.random() * 4) % 2 == 0) {
						second_random.push("^");
						change_array.push("" + (1 + i) + "°")
						//string += " "+(1+i)+"°";
					} else {
						second_random.push(" ");
					}
				}


				if (change_array.length == 5) {
					final_string = "🗯\n```\n" + random_array.join(" ") + "\n```\n";//+"\n"+second_random.join(" ")+"```\n";
					final_string += "\nSei sicuro di voler cambiare tutte le rune?";
				} else {
					final_string = "🗯\n```\n" + random_array.join(" ") + "\n``````\n" + second_random.join(" ") + "\n```";

					if (change_array.length > 0) {
						final_string += "\nSei sicuro di voler cambiare";

						for (let i = 0; i < change_array.length; i++) {
							if (i == 0) {
								final_string += " la ";
							} else if (i < (change_array.length - 1)) {
								final_string += ", ";
							} else {
								final_string += " e "
							}
							final_string += change_array[i];
						}


						final_string += " runa?";
					}
				}

				final_string += suggestion;

				al0_bot.sendMessage(
					message.chat.id,
					final_string,
					{
						parse_mode: "Markdown",
						disable_web_page_preview: true
					}
				).catch(function (err) {
					al0_bot.sendMessage(
						message.from.id,
						"🥴 Upps!\n" +
						"Volevo dire qualche cosa ma... \n" + err
					);
				});

			} else if (message_array[0] == ("cerco") || message_array[0] == ("scambio")) {
				console.log("> Gruppo figurine...");
				message.text = "figurine: " + message.text;
				return figurineManager(message);
			} else if (message_array[0] == ("/globale")) {
				return argo_controller.getCurrGlobal(message.chat.id, message.chat.id == message.from.id, message.from.username, message.text.toLowerCase()).
					then(function (res) {
						console.log(res);
						if (typeof (res) != "undefined") {
							al0_bot.sendMessage(
								res.chat_id,
								res.message_txt,
								res.options
							).catch(function (err) {
								al0_bot.sendMessage(
									message.from.id,
									"🥴 Upps!\n" +
									"Volevo dire qualche cosa ma... \n" + err
								);
							});

						}
					})

			} else if (message.text == "/start") {
				al0_bot.sendMessage(
					message.chat.id,
					"🤖` Salve!`\nSono Al, Bot di supporto per il gruppo Argonauti di @LootGameBot",
					{ parse_mode: "Markdown" });

			} else if (message_array.length == 2 && (message_array[1].slice(0, -1) == "dad" || message_array[1].slice(0, -1) == "run")) {
				console.log("> message_array[0]=" + message_array[0]);
				let dice_n = parseInt(message_array[0]);
				if (!isNaN(dice_n)) {
					let res_text = "*" + message.from.first_name.split("_").join("\_") + "*";
					if (dice_n > 0 && dice_n > 6) {
						res_text += ",\nNon puoi lanciare " + dice_n + " dadi!"
					} else {
						let all_dice = [];
						res_text += " lanci ";
						let count = 0;

						if (message_array[1].slice(0, -1) == "dad") {
							all_dice = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

							if (dice_n == 1) {
								res_text += "un dado:\n\n";
							} else {
								res_text += dice_n + " dadi:\n\n";
							}
						} else {
							all_dice = ["▲", "▲", "△", "△", "△"];
							if (dice_n == 1) {
								res_text += "una runa:\n\n";
							} else {
								res_text += dice_n + " rune:\n\n";
							}
						}

						let estratto;
						for (let i = 0; i < dice_n; i++) {
							console.log("> Estraggo tra " + (all_dice.length) + ": " + (Math.ceil(Math.random() * (all_dice.length)) - 1));
							estratto = (Math.ceil(Math.random() * (all_dice.length)) - 1);

							if (message_array[1].slice(0, -1) == "run") {
								if (estratto <= 2) {
									count++;
								}
							} else {
								count += estratto + 1;
							}
							res_text += all_dice[estratto] + " ";
						}

						res_text += " (" + count + ")";


					}
					al0_bot.sendMessage(
						message.chat.id,
						res_text,
						{
							parse_mode: "Markdown",
							disable_web_page_preview: true
						}
					).catch(function (err) {
						al0_bot.sendMessage(
							message.from.id,
							"🥴 Upps!\n" +
							"Volevo dire qualche cosa ma... \n" + err
						);
					});

				}

			} else {
				let curr_date = Date.now() / 1000;
				let isAvvisi = { bool: false, messsage: null };

				if (typeof (message.forward_from_chat) != "undefined") {
					if ((message.forward_from_chat.id) == '-1001057075090') {
						isAvvisi.bool = true;
						isAvvisi.messsage = message;
					} else {
						console.log("Nope, id: " + message.forward_from_chat.id);
					}
				} else if (typeof (message.reply_to_message) != "undefined" && typeof (message.reply_to_message.forward_from_chat) != "undefined") {
					if ((message.reply_to_message.forward_from_chat.id) == '-1001057075090') {
						isAvvisi.bool = true;
						isAvvisi.messsage = message.reply_to_message;
					} else {
						console.log("Nope, id: " + message.reply_to_message.forward_from_chat.id);
					}
				}

				if (message.date < curr_date - 120) {
					console.log("Scarto vecchio: " + message.text);
				} else if (message.text.toLowerCase() == "info" && typeof (message.reply_to_message) != 'undefined') {
					let sender = typeof message.reply_to_message.from != "undefined" ? message.reply_to_message.from.first_name : "null";
					let date = new Date(message.reply_to_message.date * 1000);
					let text = "";


					if (message.reply_to_message.forward_date > 0 && typeof message.reply_to_message.forward_from != "undefined") {
						sender = message.reply_to_message.forward_from.first_name;
						date = new Date(message.reply_to_message.forward_date * 1000);
						text += "🌐\nMessaggio inviato da " + sender + " (inoltro)";

						if (message.from.id == creatore) {
							text += "\n\[ID: " + message.reply_to_message.forward_from.id + "] ";
							if (typeof message.reply_to_message.forward_from_chat != "undefined") {
								text += "\n\[CHAT ID: " + message.reply_to_message.forward_from_chat.id + "\] ";
							} else if (typeof message.forward_from_chat != "undefined") { // message.forward_from_chat
								text += "\n\[CHAT ID: " + message.forward_from_chat.id + "\] ";

							} else {
								console.log(message);
							}

						}

						if (message.reply_to_message.forward_from.is_bot) {
							text += " 🤖";
						}
					} else {
						text += "🌐\nMessaggio inviato da " + sender;
						if (message.reply_to_message.from.is_bot) {
							text += " 🤖";
						}
						if (message.from.id == creatore) {
							text += "\n\[ID: " + message.reply_to_message.from.id + "] ";
							if (typeof message.reply_to_message.forward_from_chat != "undefined") {
								text += "\n\[CHAT ID: " + message.reply_to_message.forward_from_chat.id + "\] ";
							} else if (typeof message.forward_from_chat != "undefined") { // message.forward_from_chat
								text += "\n\[CHAT ID: " + message.forward_from_chat.id + "\] ";

							} else {
								console.log(message);
							}

						}
					}
					text += "\nMSG-ID: `" + message.message_id + "`\n";

					console.log("sender: " + sender + "\nDate: " + date);
					console.log(message.message_id);
					if (date.getUTCDate() == 1 || date.getUTCDate() == 8 || date.getUTCDate() == 11) {
						text += "\nL'";
					} else
						text += "\nIl ";


					text += (date.getDate()) + "." + (date.getMonth() + 1) + " alle " + date.getHours() + ":" + (("0" + date.getMinutes()).slice(-2)) + "\n";

					curr_date = new Date(curr_date * 1000);

					//let enlapsed = curr_date.getUTCDate() - date.getUTCDate();
					let enlapsed = Math.abs(curr_date.getTime() - date.getTime()) / 60000;
					//(1000 * 3600 * 24)
					if (enlapsed < 60 * 24) {
						if (enlapsed <= 59) {
							if (enlapsed <= 1) {
								text += "Meno di un minuto fa\n";
							} else {
								text += "Circa " + enlapsed.toFixed() + " minuti fa\n";
							}
						} else {
							enlapsed = Math.ceil(enlapsed / 60);
							if (enlapsed == 1) {
								text += "Circa un ora fa\n";
							} else {
								text += "Circa " + enlapsed.toFixed() + " ore fa\n";
							}
						}
					} else {
						enlapsed = Math.round(enlapsed / (60 * 24));

						if (enlapsed > 30) {
							if (curr_date.getUTCFullYear() == date.getUTCFullYear())
								enlapsed = 1 + curr_date.getUTCMonth() - date.getUTCMonth();
							else {
								enlapsed = 1 + curr_date.getUTCMonth() + (11 - date.getUTCMonth());
							}
							if (enlapsed == 1) {
								text += "Circa un mese fa\n";
							} else {
								text += "Circa " + enlapsed + " mesi fa\n";
							}
						} else {
							if (enlapsed < 2) {
								text += "Circa un giorno fa\n";
							} else
								text += "Circa " + enlapsed.toFixed() + " giorni fa\n";
						}
					}

					if (typeof message.reply_to_message.sticker != "undefined") {
						text += "ID Stiker: \n`" + message.reply_to_message.sticker.file_id + "`";
					}


					let id = typeof (message.reply_to_message.forward_from_message_id) != "undefined" ? message.reply_to_message.forward_from_message_id : message.reply_to_message.message_id;


					al0_bot.sendMessage(
						message.chat.id,
						text,
						{
							reply_to_message_id: id,
							parse_mode: "Markdown",
							disable_web_page_preview: true
						}
					);
					al0_bot.deleteMessage(
						message.chat.id,
						message.message_id
					).catch(function (err) {
						console.log("!toDelete -> " + err.response.body.description);
					});


				} else if (message_array[0].length >= 4 && message_array[0].toLowerCase().match("figu")) {
					return figurineManager(message);
				} else if (message.from.is_bot == false && message.text.match("range ")) {

					let text = rangeMessage(message);
					console.log("torno con: " + text);

					al0_bot.sendMessage(
						message.chat.id,
						text,
						{
							parse_mode: "Markdown",
							disable_web_page_preview: true
						}).
						catch(function (err) {
							al0_bot.sendMessage(
								message.chat.id,
								"Upps!\n" +
								"Sembra tu stia usando uno dei caratteri markdown non correttamente...\n" +
								"O comunque:\n" + err.response.body.description
							);



						});

				} else if (message.chat.type.match("group") && message_array.indexOf("salvini") >= 0) {
					let possibilites = [
						"#primagliitaliani",
						"*SALVINEE!!1!*",
						"„Nei “Cannabis shop” non si vende droga, nooooooo...... si vendono margherite.“",
						"„E' assurdo affidare una bimba a due gay. Pare davvero ci sia qualcuno che vuole un mondo alla rovescia.“",
						"„Mezzo mondo a impazzire per Pokemon Go... Boh...“",
						"„_i poverini_ non sono quelli di Lampedusa che vengono disinfettati: *i poverini* sono i cittadini di Lampedusa e di Bergamo che poi vengono derubati da chi viene disinfettato.“",
						"„Noi siamo qui non perché siamo contro gli stranieri, contro gli immigrati, ma perché siamo contro i clandestini!“, _Clandestini!1!_"
					];

					al0_bot.sendMessage(
						message.chat.id,
						possibilites[Math.round((Math.random() * possibilites.length) - 1)],
						{
							reply_to_message_id: message.message_id,
							parse_mode: "Markdown",
							disable_web_page_preview: true
						}
					);
				} else { // Argo
					console.log("> chat_type: " + message.chat.type);
					console.log(String(message.chat.id) === edicolaID);
					let argo = argo_controller.check(message.from.username, message.text);
					if (argo.isArgonaut) {
						let controll = message.text.indexOf("/vota") == 0 || message.text.indexOf("/rifiuta") == 0 || message.text.indexOf("/accetta") == 0 || (message.text.indexOf("/chiama") == 0 && message.text.indexOf("/chiamaassalto") < 0) || message.text.indexOf("/oggetti") == 0 || message.text.indexOf("/offri") == 0 || message.text.indexOf("/scambia") == 0;
						if (controll) {
							al0_bot.deleteMessage(
								message.chat.id,
								message.message_id
							).catch(function (err) {
								console.log("!toDelete -> " + err.response.body.description);
							});
						} else {
							//let nowDate = Date.now() / 1000;
							return argo_controller.manage(message, argo, chat_members).then(function (res_mess) {
								return bigSend(res_mess);
							}).catch(function (err) { console.log(err) });
						}
					} else {
						console.log("_________");
						console.log("Check fallito per " + message.from.username);
						console.log("Nel gruppo: " + message.chat.title + ", ID: " + message.chat.id);
						console.log("> Link d'invito: " + message.chat.invite_link);

						console.log("Dice:\n" + message.text);
						console.log("\n_________");

					}
				}


			}

		});
	} else if (typeof message.sticker != "undefined") {
		console.log(message.sticker);
	} else {//ignoro
		//console.log(message); 
	}
});


function askChatMembers(message) {
	return new Promise(function (members) {
		if (message.chat.type.match("group")) {


			al0_bot.getChatMembersCount(message.chat.id).then(function (chatMembersCount) {
				return members(chatMembersCount);
			});
		} else {
			return members(1);
		}
	});

}

function bigSend(res_mess) {
	if (typeof (res_mess) != "undefined") {
		let res_array = [];
		if (!(res_mess instanceof Array)) {
			res_array.push(res_mess);
		} else {
			res_array = res_mess.slice(0, res_mess.length);
		}
		for (let i = 0; i < res_array.length; i++) {
			if (typeof (res_array[i].toSend) != "undefined") {
				if (res_array[i].toSend.message_txt.length >= 3500) {
					console.log("> Ho un testo da dividere!")
					let arr = chunkSubstr(res_array[i].toSend.message_txt, 100);
					for (let l = 0; l < arr.length; l++) {
						al0_bot.sendMessage(
							res_array[i].toSend.chat_id,
							arr[l],
							res_array[i].toSend.options
						).catch(function (err) {
							console.log(err);
							al0_bot.sendMessage(
								res_array[i].toSend.chat_id,
								"🥴 Upps!\n" +
								"Volevo dire qualche cosa ma... \n"
							);
						});
					}
				} else {
					al0_bot.sendMessage(
						res_array[i].toSend.chat_id,
						res_array[i].toSend.message_txt,
						res_array[i].toSend.options
					).catch(function (err) {
						console.log(err);
						al0_bot.sendMessage(
							res_array[i].toSend.chat_id,
							"🥴 Upps!\n" +
							"Volevo dire qualche cosa ma... \n"
						);
					});
				}
			}
			if (typeof (res_array[i].toDelete) != "undefined") {
				al0_bot.deleteMessage(
					res_array[i].toDelete.chat_id,
					res_array[i].toDelete.mess_id
				).catch(function (err) {
					console.log("!toDelete -> ");
					console.log(err.response.body);
				});
			}
		}

		// if (message.from.id == creatore || message.text.indexOf("/aggiorna") == 0) {
		// 	nowDate = (Date.now() / 1000) - nowDate;
		// 	al0_bot.sendMessage(
		// 		message.from.id,
		// 		"[Esecuzione in " + nowDate + " secondi...]",
		// 	)
		// }


	}
}


async function figurineManager(message) {
	console.log("> E un comando figurine!");
	try {
		const cards_res = await cards_controller.manage(message);
		if (typeof (cards_res) != "undefined") {
			if (message.chat.type == "private" && edicola_blacklist.indexOf(message.chat.id) > 0) {
				console.log("Era in blacklist!");
				for (var i = 0; i < edicola_blacklist.length; i++) {
					if (edicola_blacklist[i] === message.chat.id) {
						edicola_blacklist.splice(i, 1);
					}
				}
			}

			console.log("> Ritorno (ad al) con " + cards_res.length + " robe da fare...");
			if (!(cards_res instanceof Array) || cards_res.length == 0) {
				console.log("> Esco.");
				return;
			}
			let res_array = [];
			if (!(cards_res instanceof Array)) {
				res_array.push(cards_res);
			} else {
				console.log("> Era un array! (dim: " + cards_res.length + ")");
				res_array = cards_res.slice(0, cards_res.length);
			}
			if (edicola_blacklist.indexOf(message.from.id) >= 0) {
				console.log("Nope... è un tipo ripetitivo!");

			} else {
				for (let i = 0; i < res_array.length; i++) {
					if (typeof (res_array[i].toSend) != "undefined") {
						console.log("> Una toSend!!");

						let repetitive_user_check = false;
						if (res_array[i].toSend.chat_id == message.from.id) {
							repetitive_user_check = res_array[i].toSend.message_txt.slice(1, 2) == "ⓘ";

							if (repetitive_user_check) {
								edicola_blacklist.push(res_array[i].toSend.chat_id);
								res_array[i].toSend.options.reply_markup = {
									inline_keyboard: [[{
										text: "Recepito!",
										callback_data: 'EDICOLA:OK'
									}]]
								}
							}


						}

						al0_bot.sendMessage(
							res_array[i].toSend.chat_id,
							res_array[i].toSend.message_txt,
							res_array[i].toSend.options
						).catch(function (err) {
							if (err.response.statusMessage == "Forbidden") {
								if (edicola_blacklist.indexOf(res_array[i].toSend.chat_id) < 0) {
									edicola_blacklist.push(res_array[i].toSend.chat_id);
									let error_msg = "*Woops!* 😶\n";
									if (message.from.id == nikoID) {
										error_msg += " Non posso inviare messaggi a quest'utente...";
									} else {
										if (typeof res_array[i].errorHandler != "undefined") {
											error_msg += res_array[i].errorHandler.user + ", devi ";
										} else {
											error_msg += "Devi ";
										}
										error_msg += "avviare una chat privata con me perché possa scriverti senza spammare...";
									}
									al0_bot.sendMessage(edicolaID, error_msg, res_array[i].toSend.options);
								}
							} else {
								console.log("> Woops, un errore mi impedisce...");
								console.log(res_array[i].toSend);
								console.log(err);
							}
						});

					}
					if (typeof (res_array[i].toDelete) != "undefined") {
						al0_bot.deleteMessage(edicolaID, res_array[i].toDelete.mess_id).catch(function (err_1) {
							console.log("!toDelete -> ");
							console.log(err_1.response.body);
						});
					}
					if (typeof (res_array[i].toPin) != "undefined") {
						al0_bot.sendMessage(res_array[i].toPin.chat_id, res_array[i].toPin.message_txt, res_array[i].toPin.options).then(function (res) {
							al0_bot.pinChatMessage(res_array[i].toPin.chat_id, res.message_id);
						}).catch(function (err) {

							console.log(err);
							al0_bot.sendMessage(res_array[i].toSend.chat_id, "🥴 Upps!\n" +
								"Volevo dire qualche cosa ma... \n");
						});
					}
				}
			}

		}
		else {
			console.log("> Sembra sia andata malissimo!");
		}
	}
	catch (err_2) {
		console.log(err_2);
	}
}


// #UTILITIES
function chunkSubstr(str, size) { // il text_msg e una lunghezza *limite*
	let str_array = str.split("\n");
	let my_len = str_array.length;
	const numChunks = Math.ceil(my_len / size); // console.log("> Saranno " + numChunks + " messaggi\n\n");
	const chunks = new Array(numChunks);
	let str_copy = str_array.slice();

	let mile_stone = 0;
	let counter = 0;
	for (let i = 0; i < my_len; i++) {
		mile_stone++;
		if (mile_stone >= size || (mile_stone > size / 2 && (str_copy[i].length == 0 || str_copy[i] == "\n"))) {
			chunks[counter] = str_array.slice(0, mile_stone).join("\n");
			str_array = str_array.slice(mile_stone);
			counter++;
			mile_stone = 0;
		}
	}


	return (chunks); //L'array finale. Ogni elemento contiene il testo_parziale (un messaggio)
}

function rangeMessage(message) {
	let text = message.text.split(" ");
	if (typeof (message.reply_to_message) != "undefined" && text.length < 3) {
		text = message.reply_to_message.text.split(" ");
		console.log(message.from.username + " chiede il trick... su:\n Lunghezza: " + text.length + "\n Testo: " + message.reply_to_message.text);
	} else {
		console.log(message.from.username + " chiede il trick... su:\n Lunghezza: " + text.length + "\n Testo: " + message.text);

	}
	let repetition = Math.floor(text.length / 10);
	let num = 0
	for (i = 0; i <= repetition; i++) {
		num = Math.floor(Math.random() * text.length);
		num = ((num - i) < text.length && (num - i) > 0 ? (num - i) : num);
		let range = 0;

		if (parseInt(text[num]) > 0) {
			text[num] = ((parseInt(text[num]) * Math.random() * text.length * 100) / 3).toPrecision(4);
		} else if (text[num].length > 4 && text[num].length < 12) {
			let tmp = text[num];
			range = Math.floor(Math.random() * text.length);
			text[range] = tmp;


			if (text[num].indexOf("'") >= 0) {
				text[num] = "il range";
			} else if (text[num].indexOf("range") >= 0) {
				text[num] = "*RANGEE*";
			} else if (text[num].endsWith("ndo")) {
				text[num] = "rangendo";
			} else if (text[num].endsWith("are")) {
				text[num] = "rangare";
			} else if (text[num].endsWith("ere")) {
				text[num] = "rangere";
			} else if (text[num].endsWith("ire")) {
				text[num] = "rangire";
			} else if (text[num].endsWith("a")) {
				text[num] = "ranga";
			} else if (text[num].endsWith("o")) {
				text[num] = "rangio";
			} else if (text[num].endsWith("ti")) {
				text[num] = "rangeati";
			} else if (text[num].endsWith("mi")) {
				text[num] = "rangeami";
			} else if (text[num].endsWith("ci")) {
				text[num] = "rangeaci";
			} else
				text[num] = "range";
		} else if (text[num].length > 10) {
			range = Math.floor(Math.random() * text.length);
			if (range > 0 && range < text.length - 1) {

				if (text[range - 1].length >= 3 && text[range + 1].length >= 3)
					text[num] = text[range];
			}
		} else {
			range = Math.floor(Math.random() * text.length);
			if (range > 1 && range < text.length - 1) {

				if (text[range - 1].length >= 3 && text[range + 1].length >= 3) {
					let tmp = text[num];
					text[num] = text[range];
					text[range] = tmp;
				}
			}
		}

		if (range != 0 && range < text.length - 1) {
			if (text[range - 1].indexOf(".") >= 0 || text[range - 1].indexOf("\n") >= 0)
				text[range] = text[range].charAt(0).toUpperCase() + text[range].slice(1);
			else
				text[range] = text[range].toLowerCase();
		}
	}
	text[0] = text[0].charAt(0).toUpperCase() + text[0].slice(1);
	text[text.length - 1] = text[text.length - 1] + "*!!1!*";
	return text.join(" ");


}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; //Il max è escluso e il min è incluso
}


