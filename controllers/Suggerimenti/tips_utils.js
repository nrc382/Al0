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


function bigSend(res_mess, istanza_bot) {
	if (typeof (res_mess) != "undefined") {
		let res_array = [];
		if (!(res_mess instanceof Array)) {
			res_array.push(res_mess);
		} else {
			res_array = res_mess.slice(0, res_mess.length);
		}


		for (let i = 0; i < res_array.length; i++) {


			// TO DELETE
			if (typeof (res_array[i].toDelete) != "undefined") {
				istanza_bot.deleteMessage(
					res_array[i].toDelete.chat_id,
					res_array[i].toDelete.mess_id
				).catch(function (err) {
					telegram_stat.errori++;
					console.log("!toDelete -> ");
					console.log(err.response.body);
				});
			}

			// TO SEND
			if (typeof (res_array[i].toSend) != "undefined") {
				let to_check;


				if (typeof res_array[i].toSend.message_text != "undefined") {
					to_check = res_array[i].toSend.message_text;
				} else {
					to_check = res_array[i].toSend.message_txt;
				}

				if (to_check.length >= 3500) {
					console.log("> Ho un testo da dividere!")
					let arr = chunkSubstr(to_check, 100);
					for (let l = 0; l < arr.length; l++) {
						telegram_stat.sent_msg++;
						istanza_bot.sendMessage(
							res_array[i].toSend.chat_id,
							arr[l],
							res_array[i].toSend.options
						).catch(function (err) {
							telegram_stat.errori++;
							istanza_bot.sendMessage(
								res_array[i].toSend.chat_id,
								parseError_parser(err, arr[l])
							).catch(function (err2) {
								telegram_stat.errori++;

								console.log(err2)
							});
						});
					}
				} else {
					telegram_stat.sent_msg++;
					istanza_bot.sendMessage(
						res_array[i].toSend.chat_id,
						to_check,
						res_array[i].toSend.options
					).catch(function (err) {
						telegram_stat.errori++;
						console.log(err)

						istanza_bot.sendMessage(
							res_array[i].toSend.chat_id,
							parseError_parser(err, to_check)
						).catch(function (err2) {
							telegram_stat.errori++;
							console.log(err2)
						});
					});
				}
			}

			// TO EDIT
			if (res_array[i].toEdit) {
				let to_return = {
					new_text: (typeof res_array[i].toEdit.message_text != "undefined" ? res_array[i].toEdit.message_text : res_array[i].toEdit.message_txt),
					options: {
						parse_mode: res_array[i].toEdit.options.parse_mode,
						disable_web_page_preview: true,
						reply_markup: res_array[i].toEdit.options.reply_markup
					}
				};
				if (typeof res_array[i].toEdit.inline_message_id != "undefined") {
					to_return.options.inline_message_id = res_array[i].toEdit.inline_message_id;

				} else {
					to_return.options.chat_id = res_array[i].toEdit.chat_id;
					to_return.options.message_id = res_array[i].toEdit.mess_id;

				}
				telegram_stat.sent_msg++;

				istanza_bot.editMessageText(
					to_return.new_text,
					to_return.options
				).catch(function (err_2) {
					console.error("Errore toEdit: ");
					console.log("Codice " + err_2.code);
					console.log(`chat_id ${to_return.options.chat_id}`);
					console.log(`message_id ${to_return.options.message_id}`);
					console.log(`inline_message_id ${to_return.options.inline_message_id}`);

					console.error(err_2.response.body);
					telegram_stat.errori++;


					// al0_bot.sendMessage(
					// 	res_array[i].toEdit.chat_id,
					// 	parseError_parser(err, res_array[i].toEdit.message_text)
					// );
				});
			}

			// SEND FILE
			if (typeof (res_array[i].sendFile) != "undefined") {
				console.log(res_array[i].sendFile);

				istanza_bot.sendDocument(
					res_array[i].sendFile.chat_id,
					res_array[i].sendFile.file,
					res_array[i].sendFile.message,
					res_array[i].sendFile.options
				).catch(function (err) {
					telegram_stat.errori++;
					console.log("!toDelete -> ");
					console.log(err.response.body);
				});
			}

			// DELETE (DELAYED)
			if (typeof (res_array[i].delayDelete) != "undefined") {
				delayDelete(res_array[i].delayDelete.chat_id, res_array[i].delayDelete.message_id, res_array[i].delayDelete.ms);
			}

		}
	}
}
module.exports.bigSend = bigSend;