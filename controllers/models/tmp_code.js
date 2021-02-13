/* AL 12.02.21

module.exports.messageManager = function messageManager(message) {
    return new Promise(function (messageManager_res) {
        return model.getInfos(message.from.id).then(function (inc_res) {
            if (inc_res == false) {
                return messageManager_res({
                    toSend: simpleMessage("*Spiacente...*\n\nAl momento non riesco a gestire nuove richieste...", message.from.id)
                });
            } else {
                let splitted_text = message.text.toLowerCase().split(/(?:\n| )+/);
                if (splitted_text.length == 1) {
                    return messageManager_res(mainMenu(inc_res, message.from.id));
                } else {
                    if (inc_res.user_infos.length == 0) { // da registrare
                        return messageManager_res(set_aliasManager(message.from.id, splitted_text));
                    } else { // registrati
                        let user = new model.User(inc_res.user_infos, inc_res.personals);
                        console.log("> Messaggio da " + user.alias);

                        let comands = [];
                        let text_array = [];
                        let paragraph_array = message.text.substr(message.entities[0].offset + message.entities[0].length).trim().split("\n");


                        for (let i = 0; i< paragraph_array.length; i++){
                            let tmp_line =  paragraph_array[i].split(" ");
                            for (let j= 0; j < tmp_line.length; j++){
                                text_array.push(tmp_line[j]);
                            }
                            text_array.push("\n");
                        }

                        for (let i = 1; i < message.entities.length; i++){
                            if (message.entities[i].type == 'hashtag') {
                                let curr_tag = message.text.substr(message.entities[i].offset, message.entities[i].length);
                                comands.push(curr_tag.toLowerCase().substring(1));
                                text_array.splice(text_array.indexOf(curr_tag), 1);
                            }
                        }
                    
                        let pure_text = text_array.join(" ");

                        // ***********
                        

                        let to_return = { toDelete: { chat_id: message.chat.id, mess_id: message.message_id } };

                        let paragraph_triggers = ["strada", "scelta", "s"];
                        let variation_triggers = [
                            "🤤", "intossicato", "😴", "stanco", "🥴", "confuso",
                            "😨", "spaventato", "😤", "concentrato"
                        ];
                        let visualizzazione_triggers = ["vn", "vd", "vc", "visuale notturna", "visuale diurna", "visuale completa"];

                        let target_text;

                        if (message.text.indexOf(" ") > message.text.indexOf("\n")) {
                            target_text = message.text.split(" ").splice(2).join(" ");
                        } else {
                            target_text = message.text.split("\n").splice(1).join("\n");
                        }

                        if (splitted_text[1] == "ns") {
                            parahrap_bool = true;
                            splitted_text[1] = "nuova";
                            splitted_text.splice(2, 0, "strada");
                            target_text = "nuova strada " + target_text.split(" ").splice(1).join(" ");
                        } else if (splitted_text[1] == "na" || splitted_text[1] == "alternativa") {
                            parahrap_bool = true;
                            target_text = "alternativa " + target_text.split(" ").splice(1).join(" ");
                        } else if (splitted_text[1] == "nuova") {
                            parahrap_bool = splitted_text.length >= 2 && paragraph_triggers.indexOf(splitted_text[2].trim()) >= 0;
                        } else if (visualizzazione_triggers.indexOf(splitted_text.slice(1).join(" ")) >= 0) {
                            return aggiornaVisualizzazione(splitted_text, user).then( function(res) {
                                to_return.toSend = res;
                                return messageManager_res(to_return);
                            });
                        } else if (splitted_text[1].indexOf("nott") == 0) {
                            parahrap_bool = true;
                        } else {
                            parahrap_bool = "paragrafo".match(splitted_text[1].trim()) || paragraph_triggers.indexOf(splitted_text[1].trim()) >= 0;
                        }

                        if (splitted_text[1] == "intro") {
                            to_return.toSend = incarichi_AuthorInfos_message(user, 0).toSend;
                        } else if (splitted_text[1] == "tipo") {
                            to_return.toSend = set_adventureType_message(user);
                        } else if (splitted_text[1] == "bozza") { // return
                            return model.getUserDaft(user.id).then(function (inc_struct) {
                                if (inc_struct.esit == false) {
                                    let message_text = "📜 *Avventure dei Bardi di Lootia*\n\nNon mi risulta tu abbia una bozza aperta...\nVuoi crearne una nuova?\n";
                                    return messageManager_res(({ toSend: simpleMessage(message_text, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]]) }));
                                } else {
                                    return messageManager_res(daft_message(user, inc_struct));
                                }
                            });
                        } else if (variation_triggers.indexOf(splitted_text[1]) >= 0) { // return
                            return model.getUserDaft(user.id).then(function (inc_struct) {
                                if (inc_struct.esit == false) {
                                    let message_text = "📜 *Avventure dei Bardi di Lootia*\n\nNon mi risulta tu abbia una bozza aperta...\nVuoi crearne una nuova?\n";
                                    return messageManager_res(({ toSend: simpleMessage(message_text, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]]) }));
                                } else {
                                    return paragraph_AddVariation(user, inc_struct, splitted_text[1], target_text).then(function (to_send) {
                                        return messageManager_res({ toSend: to_send });
                                    });
                                }
                            });

                        } else if (parahrap_bool) { // return 
                            if (message.text.indexOf(" ") > message.text.indexOf("\n")) {
                                target_text = message.text.split(" ").splice(1).join(" ");
                            } else {
                                target_text = message.text.split("\n").splice(1).join("\n");
                            }
                            if (message.reply_to_message) {
                                target_text += " " + message.reply_to_message.text;
                            }
                            return paragraphMainManager(user, target_text, to_return, splitted_text.splice(1)).then(function (to_send) {
                                return messageManager_res(to_send);
                            });
                        } else {
                            target_text = message.text.split(" ").splice(2).join(" ");
                            console.log(target_text);
                            if (splitted_text[1] == "titolo") {
                                to_return.toSend = set_adventureTitle_message(user, target_text);
                            } else if (splitted_text[1] == "info") {
                                to_return.toSend = adventures_DevInfos_message(user).toSend;
                            } else if (splitted_text[1] == "attesa") {
                                to_return.toSend = set_adventureDelay_message(user, target_text);
                            } else if (splitted_text[1].indexOf("desc") == 0) {
                                to_return.toSend = set_adventureDesc_message(user, target_text, splitted_text[1]);
                            } else if (user.has_pending != "-1") {
                                to_return.toSend = incarichi_Cmds_message(user.id).toSend;
                            } else {
                                to_return = mainMenu(inc_res, message.from.id);
                            }
                        }

                        return messageManager_res(to_return);
                    }
                }
            }
        })
    });
}


*/