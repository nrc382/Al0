const { callBack } = require("../Argonauti/argonauti_controller");
/*
Crea ed avvia incarichi (avventure del bardo)
Il modulo è richiamato con /bardo (creazione, gestione, avvio) e callback che iniziano per "B:"
*/

const model = require("./incarichiModel");
let all_items = {};
model.loadItems().then(function (items) {
    all_items = {
        base: items.base,
        creabili: items.creabili,
        // dropable: concat(items.base, items.creati.filter(function (el) { return el.dropable == true })),
        // flushable: concat(items.base, items.creati.filter(function (el) { return el.flushable == true })),
        // distinct: concat(items.base, Array.from(new Set(items.creati)))
    }
});

// MESSAGE MANAGERS
module.exports.messageManager = function messageManager(message) {
    console.log("> Avventura!");
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

                        let to_return = { toDelete: { chat_id: message.chat.id, mess_id: message.message_id } };
                        let target_text = message.text.split(" ").splice(1).join(" ");
                        if (message.reply_to_message) {
                            target_text += " " + message.reply_to_message.text;
                        }
                        let paragraph_triggers = ["strada", "scelta", "s"];
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
                                    let message_txt = "📜 *Avventure dei Bardi di Lootia*\n\nNon mi risulta tu abbia una bozza aperta...\nVuoi crearne una nuova?\n";
                                    return messageManager_res(({ toSend: simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]]) }));
                                } else {
                                    return messageManager_res(daft_message(user, inc_struct));
                                }
                            });
                        } else if (parahrap_bool) { // return 
                            return paragraphMainManager(user, target_text, to_return, splitted_text.splice(1)).then(function (to_send) {
                                return messageManager_res(to_send);
                            });
                        } else {
                            target_text = target_text.split(" ").splice(1).join(" ");
                            if (splitted_text[1] == "titolo") {
                                to_return.toSend = set_adventureTitle_message(user, target_text);
                            } else if (splitted_text[1] == "info") {
                                to_return.toSend = adventures_DevInfos_message(user).toSend;
                            } else if (splitted_text[1] == "attesa") {
                                to_return.toSend = set_adventureDelay_message(user, target_text);
                            } else if (splitted_text[1].indexOf("desc") == 0) {
                                to_return.toSend = set_adventureDesc_message(user, target_text, splitted_text[1]);
                            } else if (user.has_pending != "-1") {
                                to_return = { toSend: incarichi_Cmds_message(user.id).toSend };
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

// QUERY MANAGER
module.exports.queryManager = function queryManager(query) {
    return new Promise(function (queryManager_res) {
        return model.getInfos(query.from.id).then(function (inc_res) {
            let question = query.data.split(":");
            if (question[1] == "FORGET") {
                return queryManager_res({
                    query: { id: query.id, options: { text: "OK...", cache_time: 4 } },
                    toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id }
                });
            } else if (inc_res.user_infos.length == 0 && (question[1] != "PRE_INFOS" && question[1] != "REG")) {
                question = ["", "NEW_USER"];
            }

            if (question[1] == "PRE_INFOS") {
                let to_return = incarichi_detailsInfos_message(query.from.id).toSend;
                to_return.mess_id = query.message.message_id;
                return queryManager_res({
                    query: { id: query.id, options: { text: "Introduzione", cache_time: 4 } },
                    toEdit: to_return
                });
            } else if (question[1] == "NEW_USER") {
                let to_return = newUserMessage(query.from.id).toSend;
                to_return.mess_id = query.message.message_id;
                return queryManager_res({
                    query: { id: query.id, options: { text: "Avventure dei Bardi", cache_time: 4 } },
                    toEdit: to_return
                });
            } else if (question[1] == "USER") {
                let options = "";
                if (question.length == 3) {
                    options = question[2];
                }
                return mainUserMenu(inc_res, options).then(function (to_return) {
                    let query_text = "";
                    if (to_return.esit == false) {
                        query_text = "Woops!\n";
                    } else {
                        query_text = to_return.user_infos.alias + ", " + to_return.user_infos.role_string;
                    }
                    to_return.toSend.mess_id = query.message.message_id;
                    return queryManager_res({
                        query: { id: query.id, options: { text: query_text, cache_time: 4 } }, // 
                        toEdit: to_return.toSend
                    });
                });
            } else if (question[1] == "REG") {
                if (inc_res.user_infos.length != 0) {
                    return queryManager_res({
                        query: { id: query.id, options: { text: "Sei già registrato!\n\nNon è così che puoi cambiare soprannome...", show_alert: true, cache_time: 4 } },
                        toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
                    });
                } else if (question.length == 2) {
                    let splitted_text = query.message.text.split("\n");
                    let usr_alias;
                    let gender;

                    for (let i = 0; i < splitted_text.length; i++) {
                        if (splitted_text[i].charAt(0) == "•") {
                            let tmp_alias = splitted_text[i].split(" ")[1];
                            usr_alias = tmp_alias.substring(0, tmp_alias.length - 1);
                            gender = splitted_text[i].charAt(splitted_text[i].length - 1) == "e" ? "M" : "F";
                            break;
                        }
                    }
                    return registerUser(query.from.id, usr_alias, gender).then(function (insert_res) {
                        let query_text = "OK...";
                        if (insert_res.toEdit) {
                            query_text = "Registrato!";
                            insert_res.toEdit.mess_id = query.message.message_id;
                        }
                        insert_res.query = { id: query.id, options: { text: query_text, cache_time: 2 } };

                        return queryManager_res(insert_res);
                    });
                } else {
                    let usr_alias = query.message.text.split("\n")[0];
                    return set_UserGender(query.from.id, question[2], usr_alias).then(function (insert_res) {
                        let query_text = "OK...";
                        if (insert_res.toEdit) {
                            query_text = "Genere impostato";
                            insert_res.toEdit.mess_id = query.message.message_id;
                        }
                        insert_res.query = { id: query.id, options: { text: query_text, cache_time: 2 } };
                        return queryManager_res(insert_res);
                    });
                }
            } else if (question[1] == "MAIN_MENU") {
                let main_res = { toEdit: mainMenu(inc_res, query.from.id).toSend }
                main_res.toEdit.mess_id = query.message.message_id;
                main_res.query = { id: query.id, options: { text: "Avventure dei Bardi", cache_time: 4 } };
                return queryManager_res(main_res);
            } else if (question[1] == "START_MENU") {
                let to_return = newUserMessage(query.from.id).toSend;
                to_return.mess_id = query.message.message_id;
                return queryManager_res({
                    query: { id: query.id, options: { text: "Avventure dei Bardi", cache_time: 4 } },
                    toEdit: to_return
                });
            } else if (question[1] == "TMP") { // CREATIVA
                return manageTmp(inc_res, question, query).then(function (to_return) {
                    let res = {};
                    if (to_return.query_text) {
                        res.query = { id: query.id, options: { text: to_return.query_text, cache_time: 1 } };
                    } else if (to_return.query) {
                        res.query = to_return.query;
                    }
                    if (to_return.toEdit) {
                        res.toEdit = to_return.toEdit;
                        res.toEdit.mess_id = query.message.message_id;
                    }
                    if (to_return.toSend) {
                        res.toSend = to_return.toSend;
                    }
                    if (to_return.toDelete) {
                        res.toDelete = to_return.toDelete;
                    }
                    if (to_return.editMarkup) {
                        res.editMarkup = to_return.editMarkup;
                    }
                    return queryManager_res(res);
                });
            } else if (question[1] == "PERSONALS") {
                //let to_return = incarichi_newUser(query.from.id).toSend;
                //to_return.mess_id = query.message.message_id;
                return queryManager_res({
                    query: { id: query.id, options: { text: "Le tue Avventure...", cache_time: 4 } },
                    //toEdit: to_return
                });
            } else { // ??
                return queryManager_res({ query: { id: query.id, options: { text: "Pardon?", cache_time: 2 } } });
            }
        });
    });
}

// MAIN MANAGERS
function mainMenu(curr_infos, from_id) { //
    //let message_txt = "";
    if (curr_infos.user_infos.length == 0) {
        return (newUserMessage(from_id));
    } else { // UTENTE REGISTRATO
        let message_txt = "📜 *Avventure dei Bardi di Lootia*\n\n";
        let buttons_array = [];
        if (curr_infos.incarichi.length <= 0) {
            message_txt += "Non c'è ancora alcun'avventura da seguire. Sii tu a proporre la prima!\n";
        } else if (curr_infos.incarichi.length == 1) {
            message_txt += "C'è una sola avventura da seguire, " + curr_infos.incarichi[0].TITLE + "(" + curr_infos.incarichi[0].DIFFICULTY + ")\n";
            buttons_array.push([{ text: curr_infos.incarichi[0].TITLE, callback_data: 'B:START_ADVENTURE:' + curr_infos.incarichi[0].ID }]);
        } else {
            message_txt += "Ci sono ";
            if (curr_infos.incarichi.length <= 5) {
                message_txt += "appena ";
            }
            message_txt += curr_infos.incarichi.length + " avventure da seguire, le trovi nella bacheca.\n";
            buttons_array.push([{ text: "Bacheca Incarichi", callback_data: 'B:START_MENU:' }]);
        }
        let personal_line = [];
        let user = new model.User(curr_infos.user_infos);

        buttons_array.push([{ text: user.alias + (user.gender == "M" ? " 🧙‍♂️" : " 🧙‍♀️"), callback_data: 'B:USER:' }]);

        if (user.has_pending != -1) {
            personal_line.push({ text: "Bozza 📜", callback_data: 'B:TMP:EDIT' });
        }
        if (curr_infos.personals.length >= 1) {
            personal_line.push({ text: "Le tue avventure", callback_data: 'B:PERSONALS:' });
        }
        if (personal_line.length > 0) {
            buttons_array.push(personal_line);
        }
        if (user.has_pending == -1) {
            buttons_array.push([{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]);
        }
        let to_return = simpleMessage(message_txt, from_id, buttons_array);

        return ({ toSend: to_return });
    }
}



function mainUserMenu(curr_infos, options) {
    return new Promise(function (mainUserMenu) {
        // restituisce il messaggio per user_menu e l'oggetto user (con il campo integrativo: role_string)
        let user = new model.User(curr_infos.user_infos);
        return model.getUserInfos(user).then(function (main_infos) {
            if (main_infos.esit == false) {
                return mainUserMenu({ esit: false, toSend: simpleMessage(main_infos.text, user.id), user_infos: user });
            }

            let message_text = "*" + user.alias + ",";
            if (user.b_point <= 5) {
                user.role_string = "Aspirante Strillone";
                message_text = "♙ " + message_text + "*\n_" + user.role_string;
            } else if (user.b_point <= 10) {
                user.role_string = "Strillone di Lootia";
                message_text = "♟" + message_text + "*\n_" + user.role_string;
            } else if (user.b_point <= 15) {
                user.role_string = "Vate di Lootia";
                message_text = "♝" + message_text + "*\n_" + user.role_string;
            } else if (user.b_point <= 25) {
                user.role_string = "Cantastorie di Lootia";
                message_text = "♞" + message_text + "*\n_" + user.role_string;
            } else if (user.b_point <= 50) {
                user.role_string = "Lirico di Lootia";
                message_text = "♛" + message_text + "*\n_" + user.role_string;
            } else {
                user.role_string = "Bardo di Lootia";
                message_text = "♚" + message_text + "*\n_" + user.role_string;
            }
            message_text += "_\n\n";

            if (main_infos.storage == -1) {
                return user_StartBonusManager(user, message_text, main_infos, options).then(function (to_return) {
                    return mainUserMenu(to_return);
                });
            } else {
                message_text += "_Prossimamente_";
                console.log(main_infos);
                return mainUserMenu({ esit: true, toSend: simpleMessage(message_text, user.id), user_infos: user });
            }
        });
    });
}

function user_StartBonusManager(user, message_text, main_infos, option) {
    return new Promise(function (startBonus_res) {
        if (option == "") {
            message_text += "«Apri per la prima volta, cautamente e con una certa diffidenza, la polverosa celletta del tuo rifugio. Non ci sono finestre.\n";
            message_text += "Il tuo occhio cade sull'unico elemento d'arredo: una branda malconcia ai cui piedi è buttata una sacca di pelle lurida ed indurita dal tempo...»\n";
            //message_text += foundItem_message(items);
            let buttons_array = [
                [{ text: "Rovista la stanza", callback_data: 'B:USER:CELL' }],
                [{ text: "Controlla la sacca", callback_data: 'B:USER:BAG' }]
            ];

            return startBonus_res({ esit: true, toSend: simpleMessage(message_text, user.id, buttons_array), user_infos: user });
        } else {
            let items_id = [intIn(1, 6)]; // un bb
            items_id.push(12) // Chiave mistica
            if (intIn(0, 2) == 1) {
                items_id.push(7) // Acqua
            } else {
                items_id.push(6) // carne secca
            }
            items_id.push(intIn(8, 9) + (intIn(0, 5) == 1 ? 1 : 0) + (intIn(0, 6) == 1 ? 1 : 0)); // Sabbia, resina, erba, argilla
            items_id.push(intIn(1, 3) == 1 ? 55 : 57); // Bisaccia || Torcia
            if (option == "CELL") {
                items_id.push(intIn(1, 6) == 1 ? 60 : 58); // Pietra volteggiante || coltello di pietra
            }

            let items = [];
            let tmp_quantity = 1;

            for (let i = 0; i < all_items.base.length; i++) {
                if (items_id.indexOf(all_items.base[i].id) >= 0) {
                    if (all_items.base[i].type == "B2") {
                        tmp_quantity = intIn(1, 5) * (intIn(1, 5) == 5 ? 50 : 25);
                    } else if (all_items.base[i].type == "B4") {
                        tmp_quantity = intIn(1, 3) * (intIn(1, 8) == 5 ? 2 : 1);
                    }
                    items.push({ id: all_items.base[i].id, quantity: tmp_quantity, name: all_items.base[i].name, type: all_items.base[i].type })
                    tmp_quantity = 1;
                }
            }

            let crafted = [items_id[4]];

            if (option == "CELL") {
                crafted.push(items_id[5]);
            }
            crafted = getItem(crafted, 1);

            for (let i = 0; i < crafted.length; i++) {
                items.push({ id: crafted[i].id, quantity: 1, name: crafted[i].name, type: crafted[i].type });
            }


            main_infos.storage = 10;
            return model.updateUserInfos(user.id, main_infos).then(function (update_res) {
                return model.updateUserStorage(user.id, items).then(function (storage_res) {
                    if (storage_res.esit == false) {
                        return startBonus_res({ esit: false, toSend: simpleMessage(storage_res.text, user.id), user_infos: user });
                    } else if (update_res.esit == false) {
                        return startBonus_res({ esit: false, toSend: simpleMessage(update_res.text, user.id), user_infos: user });
                    } else {
                        if (option == "CELL") {
                            message_text += "«Svuoti lo zaino, controlli sotto alla branda ed ispezioni mura e pavimento...»\n";
                        } else {
                            message_text += "«Bramoso, ti fiondi sullo zaino e lo rivolti sulla branda...»\n";
                        }
                        message_text += foundItem_message(items);
                        let buttons_array = [
                            [{ text: "OK...", callback_data: 'B:USER' }]
                        ];
                        return startBonus_res({ esit: true, toSend: simpleMessage(message_text, user.id, buttons_array), user_infos: user });

                    }
                });

            });
        }



        //        return ({ids_array: items_id, bonus_items: items});
    });

}

function rifugio_message(user, message_text, main_infos) {
    switch (main_infos.state) {
        case "🤤": {
            message_text += "_Sei intorpidito, disorientato... qualche cosa deve averti intossicato!_\n";
            break;
        } case "😴": {
            message_text += "_Ti senti pochissime energie in corpo. Sei esausto, stanco!_\n";
            break;
        } case "🥴": { //😤
            message_text += "_Ti guardi attorno, il tuo sguardo vaga spaesato... il mondo è così confuso...\nO sei tu ad esserlo?_\n";
            break;
        } case "😨": {
            message_text += "_Teso come una corda di lira con il cuore che sembra voler esplodere. È semplice, sei spaventato!_\n";
            break;
        } case "😤": {
            message_text += "_Vigile ed attento, sei più concentrato e reattivo del normale..._\n";
            break;
        } default: {
            message_text += "_Sei nel pieno possesso delle tue facolta!_\n";
            break;
        }
    }

    let bag_line = "a tua";
    switch (main_infos.bag_type) {
        case 3: {
            bag_line += " sarcina";
            break;
        } case 2: {
            bag_line += " borsa di cuoio";
            break;
        } default: {
            bag_line += " sacca di pelle";
            break;
        }
    }

    if (main_infos.bag.length <= 0) {
        bag_line = "• Non hai nulla nell" + bag_line;
    } else {
        bag_line = "• L" + bag_line;
        let diff = (5 * main_infos.bag_type) - main_infos.bag.length;
        if (diff <= 0) {
            bag_line += " è piena";
        } else if (diff <= 1) {
            bag_line += " potrebbe ancora comntenere qualche cosa";
        } else if (diff >= (5 * main_infos.bag_type) / 2) {
            bag_line += " inizia a riempirsi";
        } else {
            bag_line += " è mezza vuota";
        }
    }
    message_text += bag_line + "_\n";

    if (main_infos.equip.length > 0) {
        for (let i = 0; i < main_infos.equip.length; i++) {

        }
    }

}

function manageTmp(by_user, options_array, in_query) { // NUOVO UTENTE, by_user: {incarichi, user_infos, personals}
    return new Promise(function (manageNew_res) {
        let user = new model.User(by_user.user_infos, by_user.personals);
        let option = options_array[2];
        let to_return = { query_text: "" };
        if (option == "PRGPH") {
            if (options_array.length <= 3) {
                return firstParagraph_manager(user, options_array.splice(3)).then(function (add_res) {
                    return manageNew_res(add_res);
                });
            } else {
                if (options_array[3] == "CMDS") {
                    if (options_array.length == 5) {
                        to_return.toEdit = incarichi_AuthorCommands_message(user, options_array[4]).toSend;
                    } else {
                        to_return.toEdit = incarichi_AuthorCommandsEx_message(user.id, options_array[5]).toSend;
                    }
                    to_return.query_text = "Comandi per l'editing";
                    return manageNew_res(to_return);
                } else if (options_array[3] == "OPTIONS") {
                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        return model.loadParagraph(user.id, options_array[4]).then(function (paragraph_infos) {
                            to_return.toEdit = paragraph_setOptions_message(user.id, inc_struct, paragraph_infos).toSend;
                            to_return.query_text = "Opzioni paragrafo " + paragraph_infos.id;

                            return manageNew_res(to_return);
                        });
                    });

                } else if (options_array[3] == "SELECT") {
                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        if (inc_struct.esit == false) {
                            return queryManager_res({
                                query_text: "Woops!",
                                toSend: simpleMessage(inc_struct.text, user.id)
                            });
                        } else if (inc_struct.paragraphs_ids.length == 0) { //  
                            to_return.toEdit = simpleMessage("*Woops!*\n\nNon hai ancora aggiunto alcun paragrafo alla tua bozza!", user.id);
                            to_return.query_text = "Woops!";
                            return manageNew_res(to_return);
                        } else if (options_array.length == 4 && inc_struct.paragraphs_ids.length > 1 && inc_struct.paragraphs_ids[0] != user.has_pending) { // inc_struct.paragraphs_ids.length == 0 
                            to_return.toEdit = selectParagraph(user, inc_struct).toSend;
                            to_return.query_text = "Lista Paragrafi...";
                            return manageNew_res(to_return);
                        } else {
                            let p_id = inc_struct.paragraphs_ids[0];
                            if (options_array.length >= 5 && options_array[4] != 0) {
                                p_id = options_array[4];
                            }

                            return model.loadParagraph(user.id, p_id).then(function (paragraph_infos) {
                                return model.updateUserParagraph(user.id, p_id, (user.has_pending == p_id)).then(function (db_update) {
                                    if (db_update.esit == false) {
                                        to_return.query_text = "Woops";
                                        to_return.toSend = simpleMessage(db_update.text, user.id);
                                    } else if (paragraph_infos.esit == false) {
                                        to_return.query_text = "Woops";
                                        to_return.toSend = simpleMessage("*Spiacente!*\nNon mi risulta che `" + p_id + "` indichi uno dei tuoi paragrafi...", user.id);
                                    } else {
                                        to_return.toEdit = paragraph_message(user, inc_struct, paragraph_infos);
                                        if (inc_struct.paragraphs_ids[0] == p_id) {
                                            to_return.query_text = "Inizio Avventura";
                                        } else {
                                            to_return.query_text = "Paragrafo " + p_id;
                                        }
                                    }

                                    return manageNew_res(to_return);
                                });

                            });
                        }
                    });
                } else if (options_array[3] == "DELETE") {
                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        return model.loadParagraph(user.id, options_array[4]).then(function (paragraph_infos) {
                            to_return.toEdit = paragraph_removeChoice_message(user.id, inc_struct, paragraph_infos).toSend;
                            to_return.query_text = "Elimina scelta " + options_array[4];
                            return manageNew_res(to_return);
                        });
                    });
                } else if (options_array[3] == "CHOICE_ESIT") {
                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        return model.loadParagraph(user.id, options_array[4]).then(function (paragraph_infos) {
                            to_return.toEdit = paragraph_setChoiceEsit_message(user.id, inc_struct, paragraph_infos).toSend;
                            to_return.query_text = "Esito Scelta" + options_array[4];
                            return manageNew_res(to_return);
                        });
                    });
                } else if (options_array[3] == "CH_STATUS") {
                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        return model.loadParagraph(user.id, options_array[4]).then(function (paragraph_infos) {
                            let is_alternative = false;
                            if (options_array[6] == "ALT") {
                                is_alternative = options_array[7];
                            }
                            to_return.toEdit = paragraph_setChoiceStatus_message(user.id, inc_struct, paragraph_infos, options_array[5], is_alternative).toSend;
                            to_return.query_text = "Stato giocatore, paragrafo " + options_array[4];
                            return manageNew_res(to_return);
                        });
                    });
                } else if (options_array[3] == "ITEM") {
                    let paragraph_id = "";
                    if (options_array[4] == "DROP") {
                        paragraph_id = in_query.message.text.split("\n")[1].split(" ")[1];
                    } else {
                        paragraph_id = options_array[4];
                    }

                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        return model.loadParagraph(user.id, paragraph_id).then(function (paragraph_infos) {

                            if (options_array[4] == "DROP") {
                                to_return.query_text = "Prossimamente...";
                            } else { // si, è (molto) contorto...
                                let is_alternative = false;
                                let has_select = false;
                                if (options_array[6] == "ALT") {
                                    is_alternative = options_array[7];
                                    has_select = options_array[9]
                                } else {
                                    has_select = options_array[8];
                                }
                                if (typeof has_select == "undefined") {
                                    has_select = false;
                                }
                                to_return.toEdit = paragraph_setChoiceDrop_message(user.id, inc_struct, paragraph_infos, options_array[5], is_alternative, has_select).toSend;
                                to_return.query_text = "Gestisci Drop, paragrafo " + options_array[4];
                            }

                            return manageNew_res(to_return);
                        });
                    });
                } else if (options_array[3] == "AVAILABILITY") { // DA FINIRE
                    return paragraph_setChoiceAvailability_manager(user, in_query, options_array).then(function (setChoiceAv_return) {
                        return manageNew_res(setChoiceAv_return);
                    })
                } else if (options_array[3] == "KEYBOARD") {

                    let new_buttons = [
                        [{ text: "⎇", callback_data: "B:TMP:PRGPH:SELECT:"+user.has_pending }],
                        // ⎇
                        [{ text: "Paragrafo ⨓", callback_data: "bla" }, { text: "Scelte ➽", callback_data: "hgt" }],
                        [{ text: "Variante Notturna 🌙", callback_data: "ba" }, { text: "...di Stato ❤️", callback_data: "car" }],
                    ];
                    let new_murkup = newMarkup(in_query, new_buttons);

                    

                    return manageNew_res({
                        query: { id: in_query.id, options: { text: "Tastiera..." } },
                        editMarkup: new_murkup
                    });
                } else {
                    return manageNew_res({ query_text: "Prossimamente..." });
                }
            }
        } else if (option == "ALTERNATIVE") { // ALTERNATIVE:SELECT:' + paragraph_infos.id + ":DEST:" + paragraph_infos.choices[i].id
            return model.getUserDaft(user.id).then(function (inc_struct) {
                if (options_array[3] == "CMDS") {
                    to_return.toEdit = incarichi_AuthorAlternativeCmds_message(user, options_array[4], in_query.message.text).toSend;
                    to_return.query_text = "Comandi per le alternative";

                    return manageNew_res(to_return);
                } else if (options_array[3] == "SET_AVAILABILITY") {
                    let curr_id = in_query.message.text.split("\n")[1].split(" ")[2];
                    return paragraph_setAlternativeAvailability_manager(user, inc_struct, curr_id, options_array.splice(4), in_query).then(function (to_return) {
                        if (to_return.esit == false) {
                            return manageNew_res({
                                query_text: "Woops!",
                                toSend: simpleMessage(to_return.text, user.id)
                            });
                        }
                        return manageNew_res(to_return);
                    });
                } else if (options_array[3] == "DELETE") { // paragraph_removelternative_message()
                    let splitted_imputText = in_query.message.text.split("\n")[1].split(" ");
                    let curr_id = splitted_imputText[0] == "alternativa" ? splitted_imputText[2] : splitted_imputText[3];
                    return model.loadParagraph(user.id, curr_id).then(function (paragraph_infos) {
                        if (paragraph_infos.esit == false) {
                            return manageNew_res({
                                query_text: "Woops!",
                                toSend: simpleMessage(paragraph_infos.text, user.id)
                            });
                        }
                        return manageNew_res({
                            query_text: "Elimina alternativa...",
                            toEdit: paragraph_removeAlternative_message(user.id, inc_struct, paragraph_infos, options_array[4]).toSend
                        });
                    });
                } else if (inc_struct.paragraphs_ids.indexOf(options_array[4]) < 0 || inc_struct.paragraphs_ids.indexOf(options_array[6]) < 0) {
                    return manageNew_res({
                        query: { id: in_query.id, options: { text: "Woops!\nQualche cosa è andato storto...", show_alert: true, cache_time: 4 } }
                    });
                } else { //SELECT
                    return model.loadParagraph(user.id, options_array[4]).then(function (paragraph_infos) {
                        return model.loadAlternative(user.id, paragraph_infos, options_array[6]).then(function (dest_infos) {
                            return manageNew_res({
                                query_text: "Alternativa verso il " + options_array[6],
                                toEdit: alternative_message(user.id, inc_struct, paragraph_infos, dest_infos)
                            });
                        });
                    });
                }
            });
        } else if (option == "EDIT") { // DELAY, TEXT, TITLE, TYPE
            if (options_array[3] == "CMD") {
                to_return.toEdit = incarichi_Cmds_message(user.id).toSend;
                to_return.query_text = "Comandi per l'editing";
                return manageNew_res(to_return);
            } else {
                return model.getUserDaft(user.id).then(function (inc_struct) {
                    if (inc_struct.esit == false) {
                        return manageNew_res({
                            query_text: "Woops!",
                            toSend: simpleMessage(inc_struct.text, user.id)
                        });
                    } else {
                        to_return.toEdit = daft_message(user, inc_struct).toSend;
                        to_return.query_text = inc_struct.title;
                        return manageNew_res(to_return);
                    }
                });
            }
        } else if (option == "TMP_DELETE") { // null, CONFIRM 
            return delete_userAdventure(user.id, options_array[3]).then(function (res) {
                return manageNew_res(res);
            });
        } else if (option == "OPTIONS") {
            return model.getUserDaft(user.id).then(function (inc_struct) {
                if (inc_struct.esit == false) {
                    return manageNew_res({
                        query_text: "Woops",
                        toSend: simpleMessage(inc_struct.text, user.id)
                    });
                } else {
                    return manageNew_res({
                        query_text: "Impostazioni Bozza",
                        toEdit: adventure_options_message(user, inc_struct)
                    });
                }
            });
        } else if (option == "OPTION_CONFIRM") {
            return model.getUserDaft(user.id).then(function (inc_struct) {
                if (inc_struct.esit == false) {
                    return manageNew_res({
                        query_text: "Woops",
                        toSend: simpleMessage(inc_struct.text, user.id)
                    });
                } else {
                    return set_adventureOption_confirm(user.id, options_array, in_query.message.text, inc_struct).then(function (to_return) {
                        let res = { query: { id: in_query.id, options: { text: to_return.query_text, show_alert: true, cache_time: 4 } } };
                        let specials_questions = ["TITLE", "DESC", "DELAY"]; // "SOLO", "MULTI"
                        let options_questions = ["SOLO", "MULTI", "ALL", "DAY", "NIGHT"]; // "SOLO", "MULTI"

                        if (options_array[3] == "INTEGRATIVE_TEXT") {
                            res.toEdit = to_return.toEdit;
                            res.toEdit.mess_id = in_query.message.message_id;
                        } else if (options_questions.indexOf(options_array[3]) >= 0) {
                            res.toEdit = adventure_options_message(user, to_return.paragraph_infos);
                            res.toEdit.mess_id = in_query.message.message_id;
                        } else if (specials_questions.indexOf(options_array[3]) < 0) {
                            if (to_return.toSend) {
                                res.toSend = to_return.toSend;
                            } else {
                                res.toEdit = paragraph_message(user, inc_struct, to_return.paragraph_infos);
                                res.toEdit.mess_id = in_query.message.message_id;
                            }

                            if (to_return.delete == true) {
                                res.toDelete = { chat_id: in_query.message.message_id, mess_id: in_query.message.message_id };
                            }
                        } else {
                            res.toDelete = { chat_id: in_query.message.chat.id, mess_id: in_query.message.message_id };
                            //res.toEdit = adventure_editingMenu_message(user, inc_struct).toSend;
                        }
                        return manageNew_res(res);
                    });
                }
            });
        } else if (option == "PUBLISH") {
            return manageNew_res({ query_text: "Prossimamente..." });
        } else if (option == ("START")) {
            if (options_array[3] == "INFO" || (user.personals.length < 1 && options_array.length <= 3)) {
                let option_n = 0;
                if (!isNaN(options_array[4])) {
                    option_n = options_array[4];
                }
                to_return.toEdit = incarichi_AuthorInfos_message(user, option_n).toSend;
                to_return.query_text = "Introduzione alle avventure";
                return manageNew_res(to_return);
            } else {
                return new_userAdventure(user, options_array[3]).then(function (res) {
                    to_return.toEdit = res.toSend;
                    to_return.query_text = "Si comincia!";
                    return manageNew_res(to_return);
                });
            }
        } else if (option == ("TEST")) {
            return model.getUserDaft(user.id).then(function (inc_struct) {
                if (inc_struct.esit == false) {
                    return queryManager_res({
                        query_text: "Woops!",
                        toSend: simpleMessage(inc_struct.text, user.id)
                    });
                } else if (options_array[3] == "START") {
                    return check_adventureStruct_loopController(user, inc_struct).then(function (loop_res) {
                        loop_res.query = { id: in_query.id, options: { text: loop_res.query_text, show_alert: true, cache_time: 4 } };
                        delete loop_res.query_text;

                        return manageNew_res(loop_res);
                    });
                } else {
                    to_return.query_text = "Test sull'Avventura...";
                    to_return.toEdit = check_adventureStruct_message(user, inc_struct);
                    return manageNew_res(to_return);
                }
            });
        } else {
            to_return.query_text = "Pardon? Nuovo...";
            return manageNew_res(to_return);
        }
    });
}

// B (GLOBALS) MANAGERS
function adventures_DevInfos_message(user_info) {
    let message_txt = "📜 *Le Avventure dei Bardi di Lootia* \n_...un modulo di @nrc382_\n\n";
    message_txt += "\n• È stato sviluppato, gratuitamente ed autonomamente, per permettere a giocatori di @LootGameBot di seguire e soprattutto creare _avventure testuali_\n";
    message_txt += "\n• Scritto in node.js, è su github il [codice sorgente](https://github.com/nrc382/Al0/tree/master/controllers/Incarichi)\n (pessimo e non commentato!).\n";
    message_txt += "\n• Se per il tempo che dedico allo sviluppo ti va di offrirmi una birra, non ti freno da fare una donazione. Miei indirizzi sono:\n";
    message_txt += "· [PayPal.me](https://paypal.me/EnricoGuglielmi)\n";
    message_txt += "· Bitcoin (prossimamente)\n";

    let buttons_array = [[{ text: "📜 Torna al modulo", callback_data: 'B:MAIN_MENU' }], [{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

    let to_return = simpleMessage(message_txt, user_info.id, buttons_array);

    return ({ toSend: to_return });
}

function incarichi_AuthorInfos_message(user_info, page_n) {
    let message_txt = "📜 *Le Avventure dei Bardi di Lootia* \n_...un'introduzione alla stesura_\n";
    if (page_n == 0) {
        message_txt += "\n• Le avventure narrate sono storie interattive, dove ogni Paragrafo ⨓ prevede almeno due Scelte ➽ .\n ";// possono essere per _squadre_ o per _avventurieri solitari_. ";
        message_txt += "\n• Potrai sempre modificare ed aggiornare una tua narrazione, anche dopo che sarà stata pubblicata.\n";
        message_txt += "\n• L'avventura potrà essere votata da chi la segue ed il punteggio influirà sulla tua `reputazione` che, aumentando, ti permetterà di sbloccare funzionalità aggiuntive per le tue storie.\n"
    } else if (page_n == 1) {
        message_txt += "\n⨓ *Paragrafi:*\n_Sono i testi mostrati scelta una strada._\n";
        message_txt += "\n• Prevedono un _testo di default_ ed eventualmente una _variante notturna_.\n";
        message_txt += "\n• Possono richiedere, consumare o portare al drop di oggetti.\n";
        message_txt += "\n• Possono modificare lo _stato_ del giocatore ed essere esclusivi o nascosti ad alcuni stati.\n";
        message_txt += "\n• Devono avere almeno due _strade_.\n";
    } else if (page_n == 2) {
        message_txt += "\n➽ *Strade:*\n_Sono le scelte che un giocatore può fare, mostrate nei bottoni sotto un paragrafo._\n";
        message_txt += "\n• Possono avere diversi tempi d'_attesa_.\n";
        message_txt += "\n• Possono portare alla _fine della narrazione_ o verso un nuovo _paragrafo_.\n";

    } else if (page_n == 3) {
        message_txt += "\n🔀 *Alternative:*\n_Come le strade, ma portano sempre ad un paragrafo già esistente._";
    } else if (page_n == 4) {
        //message_txt += "\n\n*Nelle avventure per squadre:*";
        //message_txt += "\n• Di default i membri seguiranno la _strada_ con più voti, ed una casuale in caso di _ambiguità_.";
        //message_txt += "\n• Puoi scegliere, nel caso di parità tra più strade, un strada forzata: non sarà necessariamente tra quelle più votate.\n";
        //message_txt += "\n• Puoi scegliere, per ogni paragrafo che prevede almeno un'opzione di fine, se terminare l'avventura solo per quella parte di squadra che eventualmente ha scelto l'opzione.\n";
        //message_txt += "\n• Puoi scegliere, per ogni strada, un numero minimo di giocatori che devono sceglierla perche questa...\n";
    } else if (page_n == 5) {
        message_txt += "\n📦 *Drop, prendi e richiedi:*\n";
        message_txt += "_In base alla tua reputazione potrai concedere o richiedere oggetti di rarità diversa._\n";
        message_txt += "\n• All'aspirante bardo è possibile concedere solo oggetti base.\n";
        message_txt += "\n• L'inventario di un giocatore è mantenuto tra le varie avventure.\n";

    } else if (page_n == 6) {
        message_txt += "\n🐗 *Mob:*\n";
        message_txt += "_In base alla tua reputazione potrai creare avversari che il giocatore dovrà affrontare per poter proseguire nell'avventura._\n"
    } else if (page_n == 7) {
        message_txt += "\n❤️ *Stato Giocatore:*\n";
        message_txt += "_Sono definiti 5 'stati' per gli avventurieri che seguono le storie dei bardi. Puoi usarli per rendere piu complesse e dinamiche le tue narrazioni_\n"
        message_txt += "\n• Lo stato è una caratteristica del giocatore, che può permanere tra un'avventura ed un'altra.\n";
        message_txt += "\n• Per ogni strada puoi modificare lo stato del giocatore che la percorre.\n";
        message_txt += "\n• Puoi nascondere o rendere disponibile una strada ai soli giocatori che si trovano in determinati stati.\n";
        message_txt += "\n• Ogni stato ha un impatto diverso nelle battaglie contro i mob.\n";

    }

    //message_txt += "\n💡 Per i termini in corsivo di questo messaggio, ed altri, è disponibile:\n· `/bardo ? `...\n";

    let buttons_array = [];
    if (page_n == 0) {
        buttons_array.push([
            { text: "⨓", callback_data: 'B:TMP:START:INFO:1' },
            { text: "➽ ", callback_data: 'B:TMP:START:INFO:2' },
            { text: "🔀", callback_data: 'B:TMP:START:INFO:3' },
            { text: "❤️", callback_data: 'B:TMP:START:INFO:7' },
            { text: "📦", callback_data: 'B:TMP:START:INFO:5' },
            { text: "🐗", callback_data: 'B:TMP:START:INFO:6' },

        ]);
    } else {
        buttons_array.push([
            { text: "ⓘ Indietro", callback_data: 'B:TMP:START:INFO:0' },
        ]);
    }
    if (user_info.has_pending == "-1") {
        buttons_array.unshift([{ text: "Inizia 📜", callback_data: 'B:TMP:START:CONFIRM' }]);
    } else {
        buttons_array.unshift([{ text: "📜", callback_data: 'B:TMP:EDIT' }]);
    }
    buttons_array[0].push({ text: "⨷", callback_data: "B:FORGET" });


    let to_return = simpleMessage(message_txt, user_info.id, buttons_array);

    return ({ toSend: to_return });
}

function incarichi_AuthorCommands_message(user, paragraph_id) {
    let p_id = "[id_paragrafo]";
    let buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }], [{ text: "Altri esempi...", callback_data: "B:TMP:PRGPH:CMDS:EX:" }]];
    if (paragraph_id) {
        p_id = paragraph_id;
        buttons_array[1][0].callback_data += paragraph_id;
        buttons_array[0].unshift({ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_id });
    } else {
        buttons_array[0].unshift({ text: "📜", callback_data: "B:TMP:PRGPH:SELECT:" });
    }
    let message_txt = "*Gestione dei paragrafi*\n_comando /bardo …_\n";

    message_txt += "\n• Richiama paragrafo:";
    message_txt += "\n· /…/` p " + p_id + " `\n";
    message_txt += "\n• Variante notturna:";
    message_txt += "\n· /…/` notturno `...\n";
    message_txt += "\n• Nuova strada:";
    message_txt += "\n· /…/` nuova strada `...\n";
    message_txt += "\n• Per modificarne il testo: ";
    message_txt += "\n· /…/` strada `\\[n\\_strada] ...\n";
    message_txt += "\n• Per cambiarene l'attesa:";
    message_txt += "\n· /…/ `strada` \\[n\\_strada]` attesa `...\n";
    message_txt += "\n• Per una nuova alternativa:";
    message_txt += "\n· /…/` alternativa `\\[id\\_paragrafo] ...\n";

    if (p_id.length != 4 && user.has_pending != -1) {
        message_txt += "\n*NB*\n• l'id paragrafo è opzionale:\nNel caso di omissione varrà quello _attuale_ (" + user.has_pending + ")\n";
    }


    message_txt += "\n*Ad esempio*\n• Per modificare il testo di " + paragraph_id + ":";
    message_txt += "\n· `/bardo " + (p_id != "[id_paragrafo]" ? "" : "p " + p_id) + "\nPer la strada che conduce a Roccabruna...`\n";

    return ({ toSend: simpleMessage(message_txt, user.id, buttons_array) });
}

function incarichi_AuthorCommandsEx_message(target_userID, p_id) {
    let buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]];
    let message_txt = "*Comandi per la modifica dei paragrafi*\n";

    if (p_id) {
        message_txt += "_qualche esempio sul paragrafo " + p_id + "_\n";
        buttons_array[0].unshift({ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + p_id });
        buttons_array.push([{ text: "⌘", callback_data: ("B:TMP:PRGPH:CMDS:" + p_id) }]);
        p_id = "";
    } else {
        buttons_array[0].unshift({ text: "📜", callback_data: "B:TMP:PRGPH:SELECT:" });
        p_id = "p AA01";
    }

    message_txt += "\n• Per cambiare il testo della variante notturna:\n· `/bardo" + p_id + " notturno \nEra una notte buia e tempestosa...`\n";
    message_txt += "\n• Per cambiare il testo della prima scelta:\n· `/bardo" + p_id + " strada 1 \nCorri lontano`\n";
    message_txt += "\n• Per impostarne a 5 minuti l'attesa:\n· `/bardo" + p_id + " strada 1 attesa 5 `\n";
    message_txt += "\n• Per aggiungere un'alternativa verso il paragrafo AA00:\n· `/bardo" + p_id + " alternativa per AA00 \nCorri!`\n";


    message_txt += "\n\n• Puoi anche specificare il codice di un paragrafo.\nAd esempio:\n• Per aggiungere una strada al paragrafo AA00\n· `/bardo p AA00 nuova strada`\n";


    return ({ toSend: simpleMessage(message_txt, target_userID, buttons_array) });
}

function incarichi_AuthorAlternativeCmds_message(user, dest_id, query_text) {
    let splitted_line = query_text.split("\n")[1].split(" ");
    let p_id = splitted_line[0] == "alternativa" ? splitted_line[2] : splitted_line[3];

    let buttons_array = [
        [
            { text: "↩", callback_data: "B:TMP:ALTERNATIVE:SELECT:" + p_id + ":DEST:" + dest_id }, // ALTERNATIVE:SELECT:' + paragraph_infos.id + ":DEST:" + paragraph_infos.choices[i].id
            { text: "⨓", callback_data: "B:TMP:PRGPH:SELECT:" + p_id }, // ALTERNATIVE:SELECT:' + paragraph_infos.id + ":DEST:" + paragraph_infos.choices[i].id
            { text: "⌖", callback_data: "B:TMP:PRGPH:SELECT:" + dest_id }
        ],
        [{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]
    ];

    let message_txt = "*Comandi per la modifica delle alternative*\n_comando /bardo …_\n";

    message_txt += "\n• Per modificarne/aggiungere il testo intermedio: ";
    message_txt += "\n· /…/ `paragrafo strada `\\[n\\_strada]` intermedio `…\n";

    return ({ toSend: simpleMessage(message_txt, user.id, buttons_array) });
}

function incarichi_detailsInfos_message(target_userID) {
    let message_txt = "📜 *Avventure dei Bardi di Lootia* \n_...una \"rapida\" introduzione_\n\n";
    message_txt += "Simili agli [incarichi](https://telegra.ph/Una-guida-alla-scrittura-di-Incarichi-per-LootBot-05-05), le _avventure_ sono brevi storie interattive scritte direttamente dagli utenti di @LootGameBot.\n";
    message_txt += "\nA differenza degli incarichi:\n";
    message_txt += "• La loro struttura non è lineare\n";
    message_txt += "• Possono esserci condizioni ed alterazioni tra 7 stati giocatore\n";
    message_txt += "• È previsto il drop e l'utilizzo di oggetti\n";
    message_txt += "• È possibile incontrare avversari (mob) da dover sconfiggere per proseguire\n";


    message_txt += "\nSono divise in paragrafi che portano ad almeno due possibili strade:";
    message_txt += "\n• Ogni strada può avere diversi tempi d'attesa.";
    message_txt += "\n• Ogni strada può essere nascosta (ora del giorno, stato giocatore, oggetto)";
    message_txt += "\n• Ogni strada scelta può portare alla fine dell'avventura (con esito positivo o negativo) o farla invece continuare verso un nuovo paragrafo.";
    message_txt += "\n• Ogni avventura ha almeno 2 esiti positivi e 3 negativi.\n";
    //message_txt += "• Alla fine dell'avventura, se con esito positivo, ogni giocatore guadagnerà almeno un (1) glifo ၜ.\n";
    //message_txt += "\n💡 Il numero di glifi guadagnati per ogni possibile esito positivo è determinato indipendentemente dall'autore, che comunque ha controllo sul tipo di avventura (se per singoli o per gruppi) e, nel caso di una squadra: \n";
    //message_txt += "• Sul numero minimo di giocatori necessario \"per scegliere una strada\"\n";
    //message_txt += "• Sull'eventuale fine immediata per i membri discordi (una sola strada possibile)\n";
    message_txt += "\nIl modulo si offre di facilitare la scrittura di queste avventure, oltre a permetterne lo svolgimento.\n";
    message_txt += "\n🌱 Per iniziare, imposta un soprannome. Usa:\n";
    message_txt += "· `/bardo sono`...";

    let to_return = simpleMessage(message_txt, target_userID, [[{ text: "Indietro ↩", callback_data: 'B:NEW_USER' }]]);

    return ({ toSend: to_return });
}

function incarichi_Cmds_message(target_userID) {
    let text = "*Comandi per l'editing*\n";
    text += "• Usali preceduti da `/bardo `\n";
    text += "• Anche in risposta\n";
    text += "• A vuoto per info\n";
    text += "\n· `intro`";
    text += "\n· `bozza`";
    text += "\n· `paragrafo`";
    text += "\n";
    text += "\n· `titolo`";
    text += "\n· `descrizione`";
    //text += "\n· `tipo`";
    text += "\n· `attesa`";


    text += "\n\nAd esempio:\n· `/bardo titolo La mia prima avventura!`";

    let buttons_array = [[{ text: "📜", callback_data: "B:TMP:EDIT" }, { text: "⨷", callback_data: "B:FORGET" }]]; // FORGET
    return ({ toSend: simpleMessage(text, target_userID, buttons_array) });
}

// USER MANAGERS
function newUserMessage(target_userID) {
    let message_txt = "📜 *Salve* \n\n";
    message_txt += "Con questo modulo è possibile partecipare ad _avventure_ scritte dalla comunità di @LootGameBot, e crearne di proprie!\n";
    message_txt += "\nÈ da considerarsi come _in versione di test_ finchè non passerà, eventualmente, sul plus:";
    message_txt += "\nCiò vuol dire che funzioni e progressi potrebbero subire modifiche e che le ricompense, l'inventario e le statistiche saranno interne al modulo.\n"
    //message_txt += "\n*NB:*\nPer garantire una futura compatibilità, ogni comando o messaggio indirizzato a questo modulo dovrà iniziare con:\n· /bardo (i/e)\n\n(Od uno tra gli alias: /incarico (/i), /b, /i)\n";

    let to_return = simpleMessage(message_txt, target_userID, [[{ text: "Maggiori Informazioni ⓘ", callback_data: 'B:PRE_INFOS' }]]);

    return ({ toSend: to_return });
}

function set_aliasManager(user_id, splitted_text) {
    let message_txt = "*Imposta un Alias*\n_o ...pseudonimo_\n\n";
    if (splitted_text[1].indexOf("sono") == 0) {
        if (splitted_text.length <= 2) {
            message_txt += "Completa il comando con il soprannome che preferiresti. Sono accettate le emoji!\n\n";
            message_txt += "Esempio:\n· `/bardo sono " + generateSimpleAlias() + "`";
        } else if (splitted_text.length != 3) {
            message_txt += "Poteva essere una buona idea, ma questo soprannome non può essere composto da più di una parola.\n\nMi spiace, ma `" + splitted_text.splice(2).join(" ") + "` non va bene...\n";
            message_txt += "Che ne diresti di `" + generateSimpleAlias() + "`?";
        } else if (splitted_text[2].length >= 12) {
            let new_name = generateSimpleAlias().substring(0, 4) + splitted_text[2].substring(10, Math.min(13, splitted_text[2].length));
            message_txt += "`" + splitted_text[2].trim() + "`?\n\n• È troppo lungo... che ne dici di:\n· `/bardo sono " + new_name + "`?";
        } else if (["dio", "allah", "gesu", "gesù"].indexOf(splitted_text[2].toLowerCase()) >= 0) {
            message_txt = "_Amen_";
        } else { // return!
            return alias_validImputManager(user_id, splitted_text).then(function (res_msg) {
                return (res_msg);
            });
        }
    } else {
        message_txt += "Prima di iniziare ad usare questo modulo, imposta un soprannome con cui firmarti. Usa la sintassi:\n· /bardo sono...";
    }
    return ({ toSend: simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
}

function alias_validImputManager(user_id, splitted_text) {
    return new Promise(function (validImputManager_res) {
        let message_txt = "*Imposta un Alias!*\n\n";
        let tmp_alias;

        if (splitted_text[2].length == 1 && splitted_text[2] != ".") {
            tmp_alias = splitted_text[2].split("")[0].toUpperCase() + ".";
        } else {
            tmp_alias = splitted_text[2].split("")[0].toUpperCase() + splitted_text[2].substring(1);
        }
        let unaviable_char = ["_", "*", "`", "@", "/", ":", ",", ";", "<", ">", "!", "?", "(", ")"];
        let splitted_word = tmp_alias.split("");
        for (let i = 0; i < splitted_word.length; i++) {
            if (unaviable_char.indexOf(splitted_word[i]) >= 0) {
                message_txt += "Mi spiace, ma \"" + tmp_alias + "\" include uno dei pochissimi caratteri non consentiti.";
                return validImputManager_res({ toSend: simpleMessage(message_txt, user_id) });
            }
        }

        return model.checkAlias(tmp_alias).then(function (check_res) {
            let to_return;
            if (check_res == true) {
                message_txt = "*" + tmp_alias + "*\n\n";
                if (tmp_alias.length <= 2) {
                    message_txt += "Essenziale, ottimo! :)\n";
                } else {
                    message_txt += "Può andare bene... (:";
                    message_txt += " \n\nTi ricordo che comunque sarà controllato da un moderatore, e che nel caso risultasse non idoneo potresti essere bandito dal modulo.";
                    message_txt += "\n(si, anche se l'alias è stato suggerito da me!)\n"
                }

                message_txt += "\nVuoi aspirare al titolo di _Strillon_*a* o di _Strillon_*e*?\n(l'unico scopo è adattare alcuni testi)";
                to_return = simpleMessage(message_txt, user_id, [[{ text: "🧙‍♀️", callback_data: 'B:REG:F' }, { text: "🧙‍♂️", callback_data: 'B:REG:M' }]]);

            } else {
                message_txt = "*Sigh*\n\n";
                if (tmp_alias.length <= 2) {
                    message_txt += "Qualcuno l'ha gia preso!\n";
                    message_txt += "Che ne diresti di `" + generateSimpleAlias() + "`?";
                } else {
                    tmp_alias = splitted_text[2].split("").reverse().join("");
                    tmp_alias = tmp_alias.split("")[0].toUpperCase() + tmp_alias.substring(1);
                    if (tmp_alias.charAt(tmp_alias.length - 1) != "u") {
                        tmp_alias += "us";
                    } else {
                        tmp_alias += "th";
                    }
                    message_txt = "C'è già qualcun'altro che ha scelto questo sopranome. E se provassi `" + tmp_alias + "`?";
                }
                to_return = simpleMessage(message_txt, user_id);
            }

            return validImputManager_res({ toSend: to_return });
        });
    });
}

function set_UserGender(user_id, gender, tmp_alias) {
    return new Promise(function (setUserGender_res) {
        return model.setUserGender(user_id, gender).then(function (gender_set) {
            if (gender_set.esit === false) {
                return (setUserGender_res({ query_text: "Woops!", toSend: simpleMessage(gender_set.text, user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) }));
            } else {
                let message_txt = "🔰 *Iscrizione ai Bardi di Lootia*\n\n";
                message_txt += "Ti registrerai come:\n";
                message_txt += "• _" + tmp_alias + "_, aspirante " + simpleGenderFormatter((gender == "M"), "Strillon", "e", "a") + "\n";
                message_txt += "\nPer modificare, usa:\n· `/bardo sono ...`\n\n💡Dopo la conferma non ti sarà più possibile cambiare questi dati.\n";
                return setUserGender_res({ toEdit: simpleMessage(message_txt, user_id, [[{ text: "Inizia 🌱", callback_data: 'B:REG' }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
            }
        });
    });
}

function registerUser(t_id, alias, gender) {
    return new Promise(function (registerUser_res) {
        return model.checkAlias(alias).then(function (check_res) {
            let message_txt;
            if (check_res == true) {
                return model.insertUser([t_id, alias, (Date.now() / 1000), gender]).then(function (insert_res) {
                    if (insert_res == false) {
                        message_txt = "*Woops!*\n\n";
                        message_txt += "Qualche cosa non è andato bene e non sono riuscito a registrarti... Dovrai riprovare.";
                    } else {
                        message_txt = "⭐ *" + simpleGenderFormatter(gender == "M", "Benvenut", "o") + "*\n\n";
                        message_txt += "Segui un'avventura già pubblicata per cominciare il tuo percorso da avventuriero, creane una per iniziare a guadagnarti il rango di Bardo di Lootia!";
                    }
                    let to_return = { toEdit: simpleMessage(message_txt, t_id) };
                    if (insert_res != false) {
                        to_return.toEdit.options.reply_markup = { inline_keyboard: [[{ text: "Vai al Menu", callback_data: 'B:MAIN_MENU' }]] };
                    }
                    return registerUser_res(to_return);
                });
            } else {
                message_txt = "*Sigh*\n\n";
                if (tmp_alias.length <= 2) {
                    message_txt += "Qualcuno l'ha preso pochi istanti fa!\n";
                    message_txt += "Puoi ripiegare su `" + generateSimpleAlias() + "`?";
                } else {
                    tmp_alias = splitted_text[2].split("").reverse().join("");
                    tmp_alias = tmp_alias.split("")[0].toUpperCase() + tmp_alias.substring(1);
                    message_txt = "C'è già qualcun'altro che ha scelto questo sopranome giusto un attimo fa! E se provassi `" + tmp_alias + "`?";
                }
                return registerUser_res({ toSend: simpleMessage(message_txt, user_id) });
            }
        })
    });
}

// TMP_SRTUCT (ADVENTURE) MANAGERS
function new_userAdventure(user_info, type) {
    if (user_info.has_pending != "-1") {
        let message_txt = "*Mumble...*\n\nStai già scrivendo un'avventura.\nDovrai pubblicarla o eliminarla prima di poter iniziare a lavorare ad una nuova.\n\n*NB*\nIl bottone qui sotto non prevede conferme!";
        return Promise.resolve(({ toSend: simpleMessage(message_txt, user_info.id, [[{ text: "Elimina ⌫", callback_data: 'B:TMP:TMP_DELETE' }]]) }));
    } else {
        return new Promise(function (new_userAdventure_res) {
            return model.newUserDaft(user_info).then(function (template_res) {
                if (template_res.esit == false) {
                    return new_userAdventure_res({ toSend: simpleMessage(template_res.text, user_info.id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) });
                } else {
                    return new_userAdventure_res(daft_message(user_info, template_res.struct));
                }
            });
        });
    }
}

function delete_userAdventure(user_id, option) {
    return new Promise(function (tmpDelete_res) {
        return model.getUserDaft(user_id).then(function (inc_struct) {
            if (inc_struct === false) {
                let message_txt = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                return (tmpDelete_res({ query_text: "Woops!", toEdit: simpleMessage(message_txt, user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) }));
            } else if (option == "CONFIRM") {
                return model.deleteUserDaft(user_id).then(function (del_res) {
                    if (del_res.esit === false) {
                        return (tmpDelete_res({ query_text: "Woops!", toEdit: simpleMessage(del_res.text, user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) }));
                    } else {
                        return (tmpDelete_res({ query_text: "Eliminata!", toEdit: simpleMessage("*Bozza eliminata!*\n\n", user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) }));
                    }
                });
            } else {
                let message_txt = "*Scarta la Bozza*\n\nProcedendo non sarà possibile recuperare alcun informazione su:\n\"" + inc_struct.title + "\"\n\n";
                message_txt += "• Paragrafi: " + inc_struct.paragraphs_ids.length + "\n";
                let enlapsed = ((Date.now() / 1000) - inc_struct.created) / (60 * 60 * 24);
                if ((Math.floor(enlapsed * 24) * 24) < 2) {
                    message_txt += "• Appena creata\n";
                } else if (enlapsed <= 2) {
                    message_txt += "• Creata circa " + Math.floor(enlapsed * 24) + " ore fa\n";
                } else {
                    message_txt += "• Creata circa " + Math.floor(enlapsed) + " giorni fa\n";
                }
                let buttons_array = [[{ text: "Annulla 📜", callback_data: 'B:TMP:EDIT' }, { text: "Elimina ❌", callback_data: 'B:TMP:TMP_DELETE:CONFIRM' }]];
                return (tmpDelete_res({ query_text: "Elimina Bozza", toEdit: simpleMessage(message_txt, user_id, buttons_array) }));
            }
        });
    });
}

function adventure_options_message(user, inc_struct) {
    let message_txt;
    let buttons_array = [];
    message_txt = "📜 *" + inc_struct.title + "*\n_Impostazioni avventura_\n\n";
    message_txt += "Puoi modificare il tipo di avventura, se solitaria o per squadre, ed il tipo di visualizzazione della bozza (notturno, completo o diurno)\n";
    message_txt += "\nStato attuale:\n";
    message_txt += "• Genere: " + (inc_struct.play_type == "SOLO" ? "solitaria" : "per squadre") + "\n";
    message_txt += "• Visualizzazione: " + (inc_struct.view_type == "ALL" ? "completa" : (inc_struct.view_type == "DAY" ? "diurna" : "notturna")) + "\n";

    buttons_array.push(
        [
            { text: "👤 ", callback_data: 'B:TMP:OPTION_CONFIRM:SOLO' },
            { text: "👥", callback_data: 'B:TMP:OPTION_CONFIRM:MULTI' },
            { text: "🌙", callback_data: 'B:TMP:OPTION_CONFIRM:NIGHT' },
            { text: "⭐", callback_data: 'B:TMP:OPTION_CONFIRM:ALL' },
            { text: "☀️", callback_data: 'B:TMP:OPTION_CONFIRM:DAY' }
        ],
        [
            { text: "📜", callback_data: "B:TMP:EDIT" },
            { text: "⨷", callback_data: "B:FORGET" }
        ]
    );

    return simpleMessage(message_txt, user.id, buttons_array);
}

function set_adventureType_message(user) {
    let message_txt;
    let buttons_array = [];
    if (user.has_pending != "-1") {
        message_txt = "📜 *Le Avventure dei Bardi di Lootia* \n\n";
        message_txt += "Modifica il tipo dell'avventura, solitaria o per squadre?";

        buttons_array.push(
            [
                { text: "👤 ", callback_data: 'B:TMP:OPTION_CONFIRM:SOLO' },
                { text: "👥", callback_data: 'B:TMP:OPTION_CONFIRM:MULTI' }
            ],
            [
                { text: "Chiudi ⨷", callback_data: "B:FORGET" }
            ]
        );

    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        buttons_array.push([{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]);
    }

    return simpleMessage(message_txt, user.id, buttons_array);
}

function check_adventureStruct_message(user, inc_struct) {
    let message_txt;
    let buttons_array = [];

    message_txt = "📜 *" + inc_struct.title + "* \n_test della struttura_\n\n";
    message_txt += "💡 Prima di procedere, assicurati che:\n";
    message_txt += "\n• Ogni paragrafo abbia un testo valido.\n";
    message_txt += "\n• Ogni paragrafo abbia almeno 2 scelte valide. (3 per il primo)\n";
    message_txt += "\n• L'avventura comprenda almeno 2 diversi esiti positivi e 3 negativi.\n";

    buttons_array.push(
        [
            { text: "Controlla ✓", callback_data: 'B:TMP:TEST:START' },
        ]
        , [
            { text: "📜", callback_data: 'B:TMP:EDIT' },
            { text: "⨷", callback_data: "B:FORGET" }
        ]
    );


    return simpleMessage(message_txt, user.id, buttons_array);
}

function check_adventureStruct_loopController(user, inc_struct) {
    return new Promise(function (check_message) {
        //let to_check_ids = inc_struct.paragraphs_ids;
        let errors_array = [];
        let endings_array = [];
        let promise_array = [];
        for (let i = 0; i < inc_struct.paragraphs_ids.length; i++) {
            promise_array.push(check_adventureStruct(user.id, inc_struct.paragraphs_ids[i], errors_array, endings_array));
        }

        return Promise.all(promise_array).then(function () {
            let q_text = "";
            let message_text = "";
            let buttons_array = [];

            if (errors_array.length > 0) {
                q_text += "Woops!\n\nLa bozza non è completa";
                message_text += "*Impossibile testare!*\n_ricontrolla la bozza_\n\n";
                if (errors_array.length == 1) {
                    message_text += "Un paragrafo non è pronto:\n";
                    message_text += "· Testo: " + ((errors_array[0].text == true || errors_array[0].night_text == true) ? "⨯" : "✓") + "\n";
                    message_text += "· Scelte: " + (errors_array[0].no_choice == true ? "⨯" : "✓") + "\n";
                    if ('night_choices' in errors_array[0]) {
                        message_text += "· Per notturno: ✗\n";
                    }
                    if ('other_choices' in errors_array[0]) {
                        message_text += "· Numero minimo: ✗\n";
                    }
                    buttons_array.push([{ text: errors_array[0].title, callback_data: "B:TMP:PRGPH:SELECT:" + errors_array[0].id }])
                } else {
                    errors_array.sort(function (a, b) {
                        if (a.title.toLowerCase() != b.title.toLowerCase()) {
                            if (a.availability == "ALL") {
                                return -1;
                            } else if (a.availability == "NIGHT") {
                                return 1;
                            } else if (b.availability == "ALL" || b.availability == "DAY") {
                                return 1;
                            } else {
                                return -1;
                            }
                        } else {
                            return 0;
                        }
                    });
                    let min_errors = Math.min(5, errors_array.length);

                    if (errors_array.length < inc_struct.paragraphs_ids.length) {
                        message_text += "Su " + inc_struct.paragraphs_ids.length + " paragrafi, " + errors_array.length + " non sono pronti";
                        message_text += (min_errors == errors_array.length ? ":\n" : ", tra cui:\n");
                    } else {
                        message_text += "⚠️ Nessun paragrafo è pronto!\n";
                    }

                    for (let i = 0; i < min_errors; i++) {
                        message_text += "\n• \"" + errors_array[i].title + "\"\n";
                        message_text += "· Testo: " + (errors_array[i].text == true || errors_array[i].night_text == true ? "✗" : "✓") + "\n";
                        if ('no_choice' in errors_array[i]) {
                            message_text += "· Minimo scelte: ✗\n";
                        } else {
                            if ('night_choices' in errors_array[i]) {
                                message_text += "· Scelte (notturno): ✗\n";
                            }
                            if ('other_choices' in errors_array[i]) {
                                message_text += "· Minimo scelte: ✗\n";
                            }
                        }
                        let button_text = (errors_array[i].availability == "NIGHT" ? "🌙 " : (errors_array[i].availability == "DAY" ? "☀️️ " : ""));
                        button_text += errors_array[i].title + (errors_array[i].esit != 0 ? " ☠" : "");
                        buttons_array.push([{
                            text: button_text,
                            callback_data: "B:TMP:PRGPH:SELECT:" + errors_array[i].id
                        }
                        ])
                    }
                }
            } else {
                q_text += "Prossimamente...";
                message_text = "*Prossimamente* 🤞\n\nLa pubblicazione sarà presto disponibile";
                console.log("• Ritorno!");
                console.log(loop_ends);
                console.log("errors_array:");
                console.log(errors_array);
                console.log("endings_array:");
                console.log(endings_array);
            }

            buttons_array.push([{ text: "📜", callback_data: 'B:TMP:EDIT' }, { text: "⨷", callback_data: "B:FORGET" }]);
            let to_return = simpleMessage(message_text, user.id, buttons_array);

            return check_message({ query_text: q_text, toEdit: to_return });
        });
    });
}

function check_adventureStruct(user_id, paragraph_id, error_array, endings_array) {
    return new Promise(function (checkLoop_res) {
        return model.loadParagraph(user_id, paragraph_id).then(function (tmp_paragraph) {
            let tmp_error = {};
            if (tmp_paragraph.availability == "NIGHT") {
                if (tmp_paragraph.night_text.length <= 10) {
                    tmp_error.night_text = true;
                }
            } else if (tmp_paragraph.text.length <= 10) {
                tmp_error.text = true;
            }
            if (tmp_paragraph.esit_type != 0) {
                endings_array.push({ id: tmp_paragraph.id, esit: tmp_paragraph.esit_type });
            } else {
                if (tmp_paragraph.choices.length == 0) {
                    tmp_error.no_choice = true;
                } else {
                    let night_choices_count = 0;
                    let dayonly_choices_count = 0;
                    let other_choices_count = 0;

                    let minimum = tmp_paragraph.father_id != 0 ? 2 : 3;

                    for (let i = 0; i < tmp_paragraph.choices.length; i++) {
                        if (tmp_paragraph.choices[i].availability == "NIGHT") {
                            night_choices_count++;
                        } else if (tmp_paragraph.choices[i].availability == "DAY") {
                            dayonly_choices_count++;
                        } else {
                            other_choices_count++;
                        }
                    }
                    if (tmp_paragraph.availability == "NIGHT") {
                        if ((night_choices_count + other_choices_count) < minimum) {
                            tmp_error.night_choices = true;
                        }
                    } else if ((other_choices_count + dayonly_choices_count) < minimum) {
                        tmp_error.other_choices = true;
                    }
                }
            }

            if (Object.keys(tmp_error).length > 0) {
                tmp_error.id = tmp_paragraph.id;
                tmp_error.title = ('choice_title' in tmp_paragraph ? tmp_paragraph.choice_title : "Inizio");
                tmp_error.availability = tmp_paragraph.availability;
                tmp_error.esit = tmp_paragraph.esit_type;

                error_array.push(tmp_error);
            }
            return checkLoop_res();
        });

    });
}

function set_adventureTitle_message(user, new_title) {
    let message_txt;
    if (typeof new_title === "string" && new_title.length <= 30 && new_title.length >= 5) {
        let splitted_title = new_title.split(" ");
        for (let i = 0; i < splitted_title.length; i++) {
            splitted_title[i] = splitted_title[i].charAt(0).toUpperCase() + splitted_title[i].slice(1);
        }
        message_txt = "*" + splitted_title.join(" ") + "* \n\n";
        message_txt += "Sarà il nuovo titolo della tua avventura.";
        let buttons_array = [
            [
                { text: "Conferma ✓", callback_data: 'B:TMP:OPTION_CONFIRM:TITLE' },
                { text: "Chiudi ⨷", callback_data: "B:FORGET" }

            ]
        ];
        return simpleMessage(message_txt, user.id, buttons_array);
    } else if (user.has_pending != "-1") {
        message_txt = "*Imposta un Titolo*\n\nCompleta il comando con il titolo della tua avventura.\n\nEsempio:\n· `/bardo titolo \nLa mia " + (user.personals.length + 1) + "° avventura`\n";
        if (new_title.length > 30) {
            message_txt += "\n*NB*\nPer rendere più semplice la formattazione, non puoi usare più di 30 caratteri.";
        } else if (new_title.length < 5) {
            message_txt += "\n*NB*\nUsa almeno 5 caratteri!";
        }
        return simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]])
    }
}

function set_adventureDesc_message(user, desc, cmd_imput) {
    let message_txt;
    if (typeof desc === "string" && desc.length <= 160 && desc.length > 1) {
        message_txt = "*Descrizione Avventura* \n\n";
        message_txt += "«`" + desc.charAt(0).toUpperCase() + desc.substring(1) + "`» \n\n";
        message_txt += "Sarà usato come descrizione per la tua avventura.\n";
        if (checkUnaviableChars(message_txt) == false) {
            message_txt += "\n*NB*\nAlcuni caratteri che hai usato sono usati per la formattazione del testo (che è automatica)";
        }
        let buttons_array = [
            [
                { text: "Conferma ✓", callback_data: 'B:TMP:OPTION_CONFIRM:DESC' },
                { text: "Chiudi ⨷", callback_data: "B:FORGET" }

            ]
        ];
        return simpleMessage(message_txt, user.id, buttons_array);
    } else if (user.has_pending != "-1") {
        message_txt = "*Imposta una descrizione*\n\nCompleta il comando con la breve descrizione che vuoi impostare per la tua avventura.\n";
        message_txt += "\nEsempio:\n· `/bardo descrizione \nLa mia, incredibile, " + (user.personals.length + 1) + "° avventura.\nRiuscirai a completarla?`\n";
        if (desc.length > 160) {
            message_txt += "\n*NB*\nPuoi usare al massimo 160 caratteri, prova ad accorciare:\n`" + desc + "`\n• Caratteri extra: " + (desc.length - 160);
        } else if (cmd_imput != "desc") {
            message_txt += "\n*Tip*\nPuoi usare anche `desc`";
        }
        return simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]])
    }
}

function set_adventureDelay_message(user, delay) {
    let message_txt;
    let parsed_int = parseInt(delay);
    if (!isNaN(parsed_int) && parsed_int >= 2 && parsed_int <= 90) {
        message_txt = "*Attesa per Scelta* \n\n";
        message_txt += "· " + delay + " minuti ";

        if (parsed_int > 60) {
            message_txt += "(1h e " + (parsed_int - 60) + " min)\n";
        }
        let buttons_array = [
            [
                { text: "Conferma ✓", callback_data: 'B:TMP:OPTION_CONFIRM:DELAY' },
                { text: "Chiudi ⨷", callback_data: "B:FORGET" }

            ]
        ];
        return simpleMessage(message_txt, user.id, buttons_array);
    } else if (user.has_pending != "-1") {
        message_txt = "*Attesa per scelta*\n\nÈ il tempo che i giocatori dovranno aspettare tra un paragrafo ed un altro.\n";
        message_txt += "Puoi impostarne una di default ed eventualmente modificare quella di ogni singola scelta.\n\n";
        message_txt += "Completa il comando specificando i minuti, ad esempio:\n";
        message_txt += "\n· `/bardo attesa 75`\n";
        message_txt += "\n· `/bardo paragrafo AA00 attesa 15`\n";
        if (parsed_int < 5) {
            message_txt += "\n*NB*\nIl minimo sono 2 minuti.";
        } else if (parsed_int > 90) {
            message_txt += "\n*NB*\nAl massimo è possibile impostare 90 minuti (un'ora e mezza).";
        }
        return simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]])
    }
}

function set_adventureOption_confirm(user_id, type_array, query_text, inc_struct) {
    return new Promise(function (setType_confirm) {
        let type = type_array[3];
        let q_text;
        let new_option;
        if (type == "PRGPH_DESC") {
            return paragraph_setParagraphTex_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else {
                    q_text = "✅\n\nParagrafo Modificato";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "NEW_CHOICE") {
            return paragraph_addChoice_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else if (to_return.toSend) {
                    to_return.delete = true;
                    return setType_confirm(to_return);
                } else {
                    if (to_return.forced != false) {
                        let tmp_text = "⨓ Strada Aggiunta\n\nPoiché la scelta era ripetuta, questa è stata considerata come variante ";
                        if (to_return.forced == "NIGHT") {
                            q_text = "🌙\n\n" + tmp_text + "notturna";
                        } else {
                            q_text = "☀️️\n\n" + tmp_text + "diurna";
                        }
                    } else {
                        q_text = "✅\n\n⨓ Strada Aggiunta";
                    }
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "NEW_ALTERNATIVE") {
            return paragraph_addAlternative_confirm(user_id, query_text, inc_struct, type_array[4]).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else if (to_return.toSend) {
                    to_return.delete = true;
                    return setType_confirm(to_return);
                } else {
                    q_text = "✅\n\n⨓ Alternativa Aggiunta";

                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "DEL_CHOICE") {
            return paragraph_removeChoice_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else {
                    q_text = "❌\n\n⨓ Strada Eliminata";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "DEL_ALTERNATIVE") {
            return paragraph_removeAlternative_confirm(user_id, query_text, inc_struct, type_array[4]).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else {
                    q_text = "❌\n\n⨓ Alternativa Eliminata";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "INTEGRATIVE_TEXT") { // paragraph_setIntermedieText_confirm
            return paragraph_setIntermedieText_confirm(user_id, inc_struct, type_array[4], query_text).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else {
                    return setType_confirm(to_return);
                }
            });
        } else if (type == "CHOICE_TITLE") {
            return paragraph_setChoiceText_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else if (to_return.toSend) {
                    to_return.delete = true;
                    return setType_confirm(to_return);
                } else {
                    if (to_return.forced != false) {
                        let tmp_text = "⨓ Testo Strada aggiornato\n\nPoiché la scelta era ripetuta, questa è stata considerata come variante ";
                        if (to_return.forced == "NIGHT") {
                            q_text = "🌙\n\n" + tmp_text + "notturna";
                        } else {
                            q_text = "☀️️\n\n" + tmp_text + "diurna";

                        }
                    } else {
                        q_text = "✅\n\n⨓ Testo Strada aggiornato";
                    }
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "CHOICE_DELAY") {
            return paragraph_setChoiceDelay_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else {
                    q_text = "⌛️\n\nTempo d'Attesa per la Strada, aggiornato:\n\n" + to_return.new_delay + " minuti";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "CHOICE_IS_OPEN" || type == "CHOICE_IS_POSITIVE" || type == "CHOICE_IS_NEGATIVE") {
            return paragraph_setChoiceEsit_confirm(user_id, query_text, inc_struct, type).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else {
                    if (to_return.new_esit == 0) {
                        q_text = "🌍\n\nStrada aperta a nuove Scelte";
                    } else if (to_return.new_esit == 0) {
                        q_text = "🌚\n\nStrada Chiusa\nEsito Negativo";
                    } else if (to_return.new_esit == 0) {
                        q_text = "🌝\n\nStrada Chiusa\nEsito Positivo";
                    }

                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "STATUS") {
            let is_alternative = false;

            if (type_array[6] == "ALT") {
                is_alternative = type_array[7];
            }

            return paragraph_setChoiceStatus_confirm(user_id, query_text, inc_struct, type_array[4], type_array[5], is_alternative).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else {
                    let tyme_name = "Strada ";
                    if (is_alternative != false) {
                        tyme_name = "Alternativa ";
                    }
                    if (to_return.new_esit == false) {
                        q_text = "⚠️\n\n" + to_return.query_text;
                    } else if (type_array[4] == "CLEAR") {
                        if (type_array[5] == "BECOME") {
                            q_text = tyme_name + "Aggiornata,\n\nCambio di stato: rimosso";
                        } else {
                            q_text = tyme_name + "Aggiornata,\n\nRestrizione sullo stato: rimossa";
                        }
                    } else {
                        q_text = to_return.new_esit + "\n\n" + tyme_name + " Aggiornata!";
                    }
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else {
            if (type == "TITLE") {
                new_option = query_text.split("\n")[0].trim();
                q_text = "📜\n\nTitolo dell'avventura modificato:\n\n" + new_option;
            } else if (type == "DESC") {
                new_option = query_text.substring(query_text.indexOf("«") + 1, query_text.indexOf("»"));
                q_text = "📃\n\nDescrizione dell'avventura modificata!\n\n";
            } else if (type == "SOLO" || type == "MULTI") {
                if (type == "MULTI") {
                    new_option = "SOLO";
                    q_text = "🙁\n\nLe avventure per squadre non sono state ancora abilitate...\n\n";

                } else {
                    new_option = type;
                    q_text = "\n\nTipo dell'avventura modificato:\n\n";
                    q_text = (new_option == "MULTI" ? "👥" + q_text + "Per Squadre" : "👤" + q_text + "Solitaria");
                }
                type = "VIEW_TYPE";

            } else if (type == "ALL" || type == "DAY" || type == "NIGHT") {
                new_option = type;
                type = "VIEW_TYPE";
                q_text = "\n\nVisualizzazione dell'avventura modificata:\n\n";
                q_text = (new_option == "ALL" ? " ☀️️ 🌙" + q_text + "Completa" : (new_option == "DAY" ? "☀️️" + q_text + "Diurna" : "🌙" + q_text + "Notturna"));
            } else if (type == "DELAY") {
                new_option = parseInt(query_text.substring(query_text.indexOf("·") + 2, query_text.indexOf(" minuti")));
                q_text = "⌛️\n\nNuovo tempo d'attesa di default:\n\n" + new_option + " minuti";
            }

            return model.editUserDaft(user_id, type, new_option).then(function (res) {
                if (res.esit === false) {
                    return (setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) }));
                } else {
                    let to_return = { query_text: q_text };
                    if (type == "VIEW_TYPE") {
                        to_return.paragraph_infos = res.struct;
                    }
                    return setType_confirm(to_return);
                }
            });
        }
    });
}

function daft_message(user_info, inc_struct) {
    if (!inc_struct) {
        return ({ toSend: simpleMessage("*Woops!*\n\nNon mi risulta tu stia scrivendo un'avventura...", user_info.id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) });
    }
    let message_txt = "";
    let buttons_array = [];
    message_txt += "📜 *" + inc_struct.title + "*\n";

    if (inc_struct.play_type == "SOLO") {
        message_txt += "_...un'avventura personale, ";
    } else {
        message_txt += "_...un'avventura per squadre, ";
    }
    message_txt += "di " + user_info.alias + "_\n\n";

    if (inc_struct.paragraphs_ids.length > 0) {
        message_txt += "· Paragrafi: " + inc_struct.paragraphs_ids.length + "\n";
        //message_txt += "· Difficoltà: " + tmpInc_imfos.diff + "\n";
    }
    message_txt += "· Attesa (default): ";
    if (inc_struct.delay < 60) {
        message_txt += inc_struct.delay + " minuti\n";
    } else if (inc_struct.delay == 60) {
        message_txt += "1h\n";
    } else {
        message_txt += "1h e " + (inc_struct.delay - 60) + "m \n";
    }

    if (inc_struct.desc == "") {
        message_txt += "\n_«Una breve descrizione. Sarà automaticamente formattata in corsivo e tra virgolette. Probabilmente e come per il titolo, è meglio settarla dopo una prima stesura...»_\n";
    } else {
        message_txt += "\n_«" + inc_struct.desc + "»_\n\n";
    }

    if (inc_struct.title == "La mia 1° storia" || inc_struct.desc == "") {
        message_txt += "\n\n⚠️ Controlla i comandi (⌘)\n";
    }

    buttons_array.push([
        { text: "⌥", callback_data: 'B:TMP:OPTIONS' },
        { text: "⌘", callback_data: 'B:TMP:EDIT:CMD' },
        { text: "ⓘ", callback_data: 'B:TMP:START:INFO:0' },
        { text: "↺", callback_data: 'B:TMP:EDIT' },
        { text: "⨷", callback_data: 'B:FORGET' },
        { text: "⌫", callback_data: 'B:TMP:TMP_DELETE' }
    ]);
    if (inc_struct.paragraphs_ids.length <= 0) {
        buttons_array.push([{ text: "Aggiungi un primo paragrafo", callback_data: 'B:TMP:PRGPH' }]);
    } else {
        buttons_array[0].unshift({ text: "▤", callback_data: 'B:TMP:PRGPH:SELECT' });
        if (inc_struct.paragraphs_ids.length >= 2) {
            buttons_array.push([{ text: "Controlla la Struttura", callback_data: 'B:TMP:TEST' }]);
        }
    }

    return ({ toSend: simpleMessage(message_txt, user_info.id, buttons_array) });
}

// PRGPHS MANAGERS
function paragraphMainManager(user, message_text, in_to_return, splitted_text) {
    return new Promise(function (mainManager_res) {
        return model.getUserDaft(user.id).then(function (inc_struct) {
            if (inc_struct === false) {
                let message_txt = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                return mainManager_res({ toSend: simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
            } else {
                let to_return = in_to_return;
                let curr_paragraph_id = user.has_pending;
                if (splitted_text[0].charAt(0) != "p") {
                    splitted_text.unshift("p");
                    message_text = "p " + message_text;
                }

                if (splitted_text.length == 1) {
                    splitted_text.splice(1, 0, user.has_pending);
                    message_text = user.has_pending + " " + message_text;
                } else if (checkParagraphID(splitted_text[1].trim()) === true) {
                    curr_paragraph_id = splitted_text[1].trim().toUpperCase();
                } else {
                    splitted_text.splice(1, 0, user.has_pending);
                    let tmp_split = message_text.split(" ");
                    tmp_split.splice(1, 0, user.has_pending);
                    message_text = tmp_split.join(" ");
                }

                console.log("> splitted_text (paragraphMainManager) = " + splitted_text.join(":"))
                console.log("message_text: " + message_text);

                let strada_bool = false;
                let nuova_bool = false;
                let empty_bool = false;

                let attesa_bool = false;
                let intermedio_bool = false;

                let alternatives_bool = false;
                let choice_index = -1;
                let strada_triggers = ["s", "strada", "scelta"]

                if (splitted_text.length <= 2) {
                    empty_bool = true;
                } else {
                    let tmp_toParse = splitted_text[2].trim();
                    if (tmp_toParse.length <= 0) {
                        empty_bool = true;
                    } else if (tmp_toParse == "na" || tmp_toParse == "alternativa") {
                        alternatives_bool = true;
                    } else if (strada_triggers.indexOf(tmp_toParse) >= 0) {
                        strada_bool = true;
                        if (splitted_text.length > 4) {
                            choice_index = splitted_text[3].trim();

                            tmp_toParse = splitted_text[4].trim();
                            if (tmp_toParse == "a" || tmp_toParse == "attesa") {
                                attesa_bool = true;
                            } else if (tmp_toParse == "i" || tmp_toParse.indexOf("intermedi") == 0) {
                                intermedio_bool = true;
                            } else {
                                strada_bool = (!isNaN(parseInt(choice_index)) || checkParagraphID(choice_index) == true);
                            }
                        }
                    } else if (tmp_toParse == "ns") {
                        let tmp_splitted = message_text.split(" ");
                        tmp_splitted[2] = "nuova";
                        tmp_splitted.splice(3, 0, "strada");
                        message_text = tmp_splitted.join(" ");
                        nuova_bool = true;
                    } else if (tmp_toParse == "nuova" && splitted_text.length > 3 && strada_triggers.indexOf(splitted_text[3].trim()) >= 0) {
                        nuova_bool = true;
                    }
                }

                if (empty_bool) {
                    return model.loadParagraph(user.id, curr_paragraph_id).then(function (paragraph_infos) {
                        return model.updateUserParagraph(user.id, curr_paragraph_id, (user.has_pending == curr_paragraph_id)).then(function (db_update) {
                            if (paragraph_infos.esit == false) {
                                to_return.toSend = selectParagraph(user, inc_struct).toSend;
                                return mainManager_res(to_return);
                            } else if (db_update.esit == false) {
                                return paragraphManager_res({ toSend: simpleMessage(db_update.text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                            } else {
                                //user.has_pending = curr_paragraph_id;
                                to_return.toSend = paragraph_message(user, inc_struct, paragraph_infos)
                                return mainManager_res(to_return);
                            }
                        });
                    });
                } else if (intermedio_bool) {
                    return model.loadParagraph(user.id, curr_paragraph_id).then(function (paragraph_infos) {
                        let inter_text = message_text.trim().split(" ").slice(5).join(" ").trim();
                        return mainManager_res(paragraph_setIntermedieText_message(user.id, inc_struct, choice_index, paragraph_infos, inter_text));
                    });
                } else if (alternatives_bool) {
                    let alternative_splittedText = message_text.trim().split(/(?:\n| )+/).slice(3);
                    return mainManager_res(paragraph_addAlternative_message(user.id, inc_struct, curr_paragraph_id, alternative_splittedText));
                } else if (nuova_bool) { // new choice
                    let curr_desc = message_text.trim().split(/(?:\n| )+/).slice(4).join(" ").trim();
                    return mainManager_res(paragraph_addChoice_message(user.id, inc_struct, curr_paragraph_id, curr_desc));
                } else if (strada_bool) { // manager per "strada" 
                    return model.loadParagraph(user.id, curr_paragraph_id).then(function (paragraph_infos) {
                        if (attesa_bool) {
                            return mainManager_res(paragraph_setChoiceDelay_message(user.id, inc_struct, choice_index, paragraph_infos, splitted_text.splice(5).join(" ")));
                        } else {
                            let new_choice_text = message_text.split(/(?:\n| )+/).slice(4).join(" ").trim();
                            return mainManager_res(paragraph_setChoiceText_message(user.id, inc_struct, choice_index, paragraph_infos, new_choice_text));
                        }
                    });

                } else { // mando al setParagraphText
                    let curr_desc;
                    let type = 0; // 0 = default, 1 = notturno
                    if (splitted_text.length >= 3 && splitted_text[2].match("notturn")) {
                        curr_desc = message_text.trim().split(" ").slice(3).join(" ").trim();
                        type = 1;
                    } else {
                        curr_desc = message_text.trim().split(" ").slice(2).join(" ").trim();
                    }
                    return mainManager_res(paragraph_setTex_message(user.id, type, inc_struct, curr_paragraph_id, curr_desc));
                }
            }
        });
    })
}

function firstParagraph_manager(user_info) {
    return new Promise(function (newParagraph_res) {
        if (user_info.has_pending == "-1") {
            let message_txt = "*Mumble...*\n\nNon mi risulta tu abbia una bozza aperta...\nVuoi crearne una nuova?\n";
            return newParagraph_res({ query_text: "Woops!", toSend: simpleMessage(message_txt, user_info.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }], [{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
        } else if (user_info.has_pending != "0") {
            let message_txt = "*Mumble...*\n\nHai già creato il tuo primo paragrafo!\n";
            return newParagraph_res({ query_text: "Woops!", toEdit: simpleMessage(message_txt, user_info.id, [[{ text: "📜", callback_data: 'B:TMP:EDIT' }, { text: "⨷", callback_data: "B:FORGET" }]]) });
        } else {
            return model.getUserDaft(user_info.id).then(function (inc_struct) {
                if (inc_struct.esit == false) {
                    return queryManager_res({
                        query_text: "Woops!",
                        toSend: simpleMessage(inc_struct.text, user_info.id)
                    });
                }
                return model.createFirstParagraph(user_info.id, inc_struct, 0, 0).then(function (new_paragraph) {
                    if (new_paragraph.esit === false) {
                        return newParagraph_res({ query_text: "Woops!", toSend: simpleMessage(new_paragraph.text, user_info.id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) });
                    } else {
                        return model.updateUserParagraph(user_info.id, new_paragraph.id, (user_info.has_pending == new_paragraph.id)).then(function (db_update) {
                            if (db_update.esit === false) {
                                return newParagraph_res({ query_text: "Woops!", toSend: simpleMessage(db_update.text, user_info.id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) });
                            }
                            let res = paragraph_message(user_info, inc_struct, new_paragraph);
                            return newParagraph_res({ query_text: "Paragrafo " + new_paragraph.id, toEdit: res });
                        });
                    }
                });
            });
        }
    });
}

function selectParagraph(user, inc_struct) {
    let message_txt = "📜 *" + inc_struct.title + "*\n";
    let buttons_array = [];

    if (inc_struct.paragraphs_ids.length == 0) {
        message_txt += "_Nessun paragrafo_\n\n";
        message_txt += "Per iniziare a dare forma alla tua bozza, aggiungi un primo paragrafo";
        buttons_array.push([{ text: "Nuovo paragrafo", callback_data: 'B:TMP:PRGPH' }]);
    } else {
        if (inc_struct.paragraphs_ids.length == 1) {
            message_txt += "_Un solo paragrafo_\n\n";
        } else {
            message_txt += "_" + inc_struct.paragraphs_ids.length + " paragrafi_\n\n";
        }
        buttons_array.push([{ text: "Inizio 🌱", callback_data: "B:TMP:PRGPH:SELECT:" + inc_struct.paragraphs_ids[0] }]);

        if (inc_struct.paragraphs_ids.length < 3) {
            message_txt += "\n• Prevedi almeno 3 strade per il paragrafo iniziale!\n";
        }

        if (inc_struct.paragraphs_ids.length == 2) {
            buttons_array[0].push({ text: "Prima Scelta", callback_data: "B:TMP:PRGPH:SELECT:" + inc_struct.paragraphs_ids[1] })
        } else {
            message_txt += "• Identificativi:\n";
            for (let i = 0; i < inc_struct.paragraphs_ids.length; i++) {
                message_txt += "· `" + inc_struct.paragraphs_ids[i] + "`" + (inc_struct.paragraphs_ids[i] == user.has_pending ? " ⦾" : "") + "\n";
            }
            message_txt += "\n• Per la selezione rapida, usa:\n· `/b p `\\[id]";
            if (user.has_pending != 0 && user.has_pending != inc_struct.paragraphs_ids[0]) {
                buttons_array[0].push({ text: "Attuale ⦾", callback_data: "B:TMP:PRGPH:SELECT:" + user.has_pending })
            }
        }
    }

    buttons_array.push([{ text: "📜", callback_data: 'B:TMP:EDIT' }, { text: "⨷", callback_data: "B:FORGET" }]);
    return ({ toSend: simpleMessage(message_txt, user.id, buttons_array) });
}

function paragraph_setTex_message(user_id, type, inc_struct, paragraph_id, new_paragraph_text) {
    let message_txt;
    let to_return = { toSend: {} };
    if (inc_struct.paragraphs_ids.indexOf(paragraph_id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]])
    } else {
        if (new_paragraph_text.length == 0) {
            let is_first = (inc_struct.paragraphs_ids[0] == paragraph_id);
            message_txt = "*Imposta Testo Paragrafo*\n\n";
            message_txt += "• Completa il comando con il testo che vuoi attribuire al _paragrafo_:\n";
            if (is_first) {
                message_txt += "È il primo messaggio che " + (inc_struct.play_type == "SOLO" ? "il giocatore " : "la squadra ") + "leggerà avviando l'avventura.\n";
            } else {
                message_txt += "È il messaggio mostrato alla scelta di una strada, dopo l'attesa specificata...\n";
            }
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (new_paragraph_text.split(" ").length <= 5) {
            message_txt = "*Woops!*\n_Testo paragrafo troppo corto_\n\n";
            message_txt += "\"_" + new_paragraph_text + "_\"\n\n";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (new_paragraph_text.length > 1500) {
            message_txt = "*Woops!*\n_Testo paragrafo troppo lungo_\n\n";
            message_txt += "\"_" + new_paragraph_text + "_\"\n\n";
            message_txt += "• Per rendere più comoda l'avventura ai giocatori, il testo di un paragrafo non può essere più lungo di 1500 caratteri.\n(eccesso: " + (new_paragraph_text.length - 750) + ")\n";
            //            message_txt += "Puoi provare a dividere questo testo in più paragrafi...";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else {
            let is_first = (inc_struct.paragraphs_ids[0] == paragraph_id);
            if (type == 0) {
                message_txt = "*" + ((inc_struct.text != "") ? "Aggiorna " : "") + "Testo di Default*\n";
            } else {
                message_txt = "*" + ((inc_struct.text != "") ? "Aggiorna " : "") + "Testo Notturno* 🌙\n";
            }
            message_txt += "_paragrafo_ `" + paragraph_id + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";
            message_txt += "_" + new_paragraph_text.charAt(0).toUpperCase() + new_paragraph_text.substring(1) + "_\n\n";

            if (new_paragraph_text.length > 750) {
                message_txt += "\n⚠️ Al momento potresti avere problemi di visualizzazioni per testi così lunghi...";
            }
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Conferma ✓", callback_data: "B:TMP:OPTION_CONFIRM:PRGPH_DESC" }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]])
        }
    }
    return (to_return);
}

function paragraph_setParagraphTex_confirm(user_id, query_text, inc_struct) {
    return new Promise(function (paragraph_setTexConfirm_res) {
        let splitted_imputText = query_text.split("\n");
        let new_paragraph_id = splitted_imputText[1].split(" ")[1];
        let new_paragraph_text = splitted_imputText.slice(2).join("\n").trim();
        let type = splitted_imputText[0].indexOf("Notturno") >= 0 ? 1 : 0;
        if (inc_struct.paragraphs_ids.indexOf(new_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return ({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, new_paragraph_id).then(function (loaded_paragraph_infos) {
                if (type == 0 && loaded_paragraph_infos.availability != "NIGTH") {
                    loaded_paragraph_infos.text = new_paragraph_text;
                } else { // notturno
                    loaded_paragraph_infos.night_text = new_paragraph_text;
                }

                return model.updateParagraph(user_id, new_paragraph_id, loaded_paragraph_infos).then(function (new_data) {
                    if (new_data.esit === false) {
                        return paragraph_setTexConfirm_res(new_data);
                    } else {
                        return paragraph_setTexConfirm_res({ paragraph_infos: loaded_paragraph_infos });
                    }
                })
            });
        }
    });
}

function paragraph_addAlternative_message(user_id, inc_struct, paragraph_id, alternative_splittedText) {
    let message_txt;
    let father_id = -1;
    if (alternative_splittedText.length > 0 && checkParagraphID(alternative_splittedText[0]) == true) {
        father_id = alternative_splittedText[0].toUpperCase();
        alternative_splittedText.splice(0, 1);
    } else if (alternative_splittedText.length > 1 && checkParagraphID(alternative_splittedText[1]) == true) {
        father_id = alternative_splittedText[1].toUpperCase();
        alternative_splittedText.splice(0, 2);
    } else if (alternative_splittedText.length > 2 && checkParagraphID(alternative_splittedText[2]) == true) {
        father_id = alternative_splittedText[2].toUpperCase();
        alternative_splittedText.splice(0, 3);
    }
    let to_return = { toSend: {} };
    let paragraph_index = inc_struct.paragraphs_ids.indexOf(paragraph_id);
    if (paragraph_index < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (paragraph_index == 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non puoi aggiungere un'alternativa al primo paragrafo dell'avventura, ma puoi creare scelte che riportano qui!";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let alternative_title = alternative_splittedText.join(" ").split("\n").join("");
        if (father_id === -1) {
            message_txt = "*Nuova Alternativa*\n\n";
            message_txt += "Le _alternative_ sono strade che riportano ad un paragrafo già impostato.\n";
            message_txt += "• Per aggiungerene una al paragrafo " + paragraph_id + ", completa il comando con il codice del paragrafo a cui vuoi collegare la scelta ed il testo che vuoi attribuirle:\n";
            message_txt += "\nEsempio:\n• `/bardo \nparagrafo " + paragraph_id + " \nalternativa verso il " + inc_struct.paragraphs_ids[intIn(0, inc_struct.paragraphs_ids.length - 1)] + " \nCorri!`\n\n";
            message_txt += "\nPs\nIn molti casi puoi semplificare ed omettere parti del comando. In questo, una scorciatoia è:";
            message_txt += "\n• `/bardo na per " + inc_struct.paragraphs_ids[intIn(0, inc_struct.paragraphs_ids.length - 1)] + " Corri!`\n\n";

            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (alternative_title.length < 3) {
            message_txt = "*Woops!*\n_Testo alternativa troppo corto_\n\n";
            message_txt += "\"_" + alternative_title + "_\"\n\n";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (alternative_title.length > 30) {
            message_txt = "*Woops!*\n_Testo alternativa troppo lungo_\n\n";
            message_txt += "\"_" + alternative_title + "_\"\n\n";
            message_txt += "• Per essere leggibile in un bottone, il testo di una alternativa non può essere più lungo di 30 caratteri.\n(extra: +" + (alternative_title.length - 30) + ")";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else {
            let is_first = (inc_struct.paragraphs_ids[0] == paragraph_id);
            message_txt = "⨓ *Nuova Alternativa*\n";
            message_txt += "_paragrafo_ `" + paragraph_id + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";
            message_txt += "> _" + alternative_title.charAt(0).toUpperCase() + alternative_title.substring(1) + "_\n\n";

            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Conferma ✓", callback_data: "B:TMP:OPTION_CONFIRM:NEW_ALTERNATIVE:" + father_id }], [{ text: "⨓  " + father_id, callback_data: "B:TMP:PRGPH:SELECT:" + father_id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        }
    }
    return (to_return);
}

function paragraph_addAlternative_confirm(user_id, query_text, inc_struct, dest_paragraph) {
    return new Promise(function (paragraph_addChoice_confirm_res) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[1];
        let alt_title_text = splitted_imputText[3].substring(2).trim();

        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return paragraph_addChoice_confirm_res({ esit: false, text: message_txt });
        } else if (inc_struct.paragraphs_ids.indexOf(dest_paragraph) < 0) {
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                if (loaded_paragraph_infos.esit == false) {
                    return paragraph_addChoice_confirm_res(loaded_paragraph_infos);
                } else if (isNaN(loaded_paragraph_infos.level_deep)) {
                    message_txt = "*Woops!*\n\n";
                    message_txt += "Prima di aggiungere un alternativa al paragrafo, aggiorna la struttura. (segui l'avviso)";
                    return paragraph_addChoice_confirm_res({ esit: false, text: message_txt });
                }


                if (loaded_paragraph_infos.choices.length >= 5) {
                    let unique_titles = [];
                    let alt_counter = 0;
                    for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                        if (unique_titles.indexOf(loaded_paragraph_infos.choices[i].title_text) < 0) {
                            unique_titles.push(loaded_paragraph_infos.choices[i].title_text);
                        }
                        if (loaded_paragraph_infos.choices[i].is_alternative == true) {
                            alt_counter++;
                        }
                    }
                    if (unique_titles.length >= 5 || alt_counter > 3) {
                        let message_text = "*Impossibile aggiungere ulteriori Scelte*\n_parafrafo saturo_\n\n";
                        message_text += "• Hai già impostato " + unique_titles.length + " _scelte uniche_ per il paragrafo, di più sarebbero solo scomode.";
                        message_text += "\n\n> `" + alt_title_text + "`\n";
                        if (alt_counter > 3) {
                            message_text += "\mNb\nPuoi aggiungere al massimo 3 alternative\n";
                        }
                        let to_return = simpleMessage(message_text, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + loaded_paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
                        return paragraph_addChoice_confirm_res({ query_text: "⚠️\n\nParagrafo Saturo", toSend: to_return });
                    }
                }

                let force_availability = false; // (loaded_paragraph_infos.availability == "ALL" ? false : loaded_paragraph_infos.availability );
                let repeat_counter = 0;
                let repeat_index = -1;
                for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                    if (loaded_paragraph_infos.choices[i].title_text.toLowerCase() == alt_title_text.toLowerCase()) {
                        if (loaded_paragraph_infos.choices[i].availability != "NIGHT") {
                            force_availability = "NIGHT";
                        } else {
                            force_availability = "DAY";
                        }
                        repeat_index = i;
                        repeat_counter++;
                    }
                }

                if (repeat_counter > 1) {
                    let message_text = "*Impossibile aggiungere l'Alternativa*\n_testo ripetuto_\n\n";
                    message_text += "• Esistono già due varianti per la stessa scelta nel paragrafo " + loaded_paragraph_infos.id;
                    message_text += "\n\nTesto in imput:\n> `" + alt_title_text + "`\n";
                    let to_return = simpleMessage(message_text, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + loaded_paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
                    return paragraph_addChoice_confirm_res({ query_text: "⚠️\n\nTesto Ripetuto", toSend: to_return });
                }

                let new_alternative = {
                    id: dest_paragraph,
                    delay: inc_struct.delay,
                    availability: force_availability != false ? force_availability : "ALL",
                    is_alternative: true,
                    esit_type: 0, // 0 = continua, -1 = 
                    integrative_text: "",
                    title_text: alt_title_text
                }

                if (force_availability != false) {
                    if (force_availability == "NIGHT") { repeat_index++ };
                    loaded_paragraph_infos.choices.splice(repeat_index, 0, new_alternative);
                } else {
                    loaded_paragraph_infos.choices.unshift(new_alternative);
                }
                return model.updateParagraph(user_id, curr_paragraph_id, loaded_paragraph_infos).then(function (new_data) {
                    if (new_data.esit === false) {
                        return paragraph_addChoice_confirm_res(new_data);
                    } else {
                        loaded_paragraph_infos.choices.sort(function (a, b) {
                            if (a.title_text.toLowerCase() != b.title_text.toLowerCase()) {
                                if (a.availability == "ALL") {
                                    return -1;
                                } else if (a.availability == "NIGHT") {
                                    return 1;
                                } else if (b.availability == "ALL" || b.availability == "DAY") {
                                    return 1;
                                } else {
                                    return -1;
                                }
                            } else {
                                return 0;
                            }
                        });
                        return paragraph_addChoice_confirm_res({ paragraph_infos: loaded_paragraph_infos, forced: force_availability });
                    }
                });

            });
        }
    });
}

function paragraph_removeAlternative_message(user_id, inc_struct, paragraph_infos, dest_id) {
    let message_txt;
    let to_return = {};
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

    if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id);
    } else if (!inc_struct.paragraphs_ids || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
    } else if (inc_struct.paragraphs_ids.indexOf(dest_id) < 0) {
        message_txt = "*Mumble...*\n\n";
        message_txt += "Non mi risulta che " + dest_id + " sia l'id di una scelta del paragrafo " + paragraph_infos.id + "";
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
    } else {
        buttons_array = [[{ text: "Annulla ↩", callback_data: "B:TMP:ALTERNATIVE:SELECT:" + paragraph_infos.id + ":DEST:" + dest_id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

        message_txt = "⨓ *Rimuovi Alternativa*\n";
        message_txt += "_paragrafo " + paragraph_infos.id + "_\n\n";
        message_txt += "Non sarà possibile recuperare alcun dato dopo la conferma...\n\n• Solo la scelta verrà rimossa, il paragrafo destinazione non subirà modifiche";
        buttons_array.unshift([{ text: "Elimina ❌", callback_data: "B:TMP:OPTION_CONFIRM:DEL_ALTERNATIVE:" + dest_id }]);
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
    }
    return (to_return);
}

function paragraph_removeAlternative_confirm(user_id, query_text, inc_struct, dest_id) {
    return new Promise(function (removeChoice_res) {
        let curr_paragraph_id = query_text.split("\n")[1].split(" ")[1];

        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return ({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                    if (loaded_paragraph_infos.choices[i].id == dest_id) {
                        loaded_paragraph_infos.choices.splice(i, 1);
                        break;
                    }
                }
                return model.updateParagraph(user_id, loaded_paragraph_infos.id, loaded_paragraph_infos).then(function (update_res) {
                    if (update_res.esit === false) {
                        return removeChoice_res(new_data);
                    } else {
                        return removeChoice_res({ paragraph_infos: loaded_paragraph_infos });
                    }
                });
            });
        }
    });
}

function paragraph_setAlternativeAvailability_manager(user, inc_struct, paragraph_id, options_array, in_query) {
    return new Promise(function (alternativeAvailability_res) {
        return model.loadParagraph(user.id, paragraph_id).then(function (paragraph_infos) {
            if (paragraph_infos.esit == false) {
                return alternativeAvailability_res(paragraph_infos)
            }
            let found = false;
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                if (paragraph_infos.choices[i].id == options_array[1]) {
                    paragraph_infos.choices[i].availability = options_array[0];
                    found = true;
                    break;
                }
            }
            if (!found) {
                return alternativeAvailability_res({ esit: false, text: "Woops!\n\nNon mi risulta che il paragrafo " + paragraph_infos.id + " abbia un'alternativa settata verso " + options_array[1] });
            }
            return model.updateParagraph(user.id, paragraph_infos.id, paragraph_infos).then(function (update_res) {
                if (update_res.esit == false) {
                    return alternativeAvailability_res(update_res)
                }
                return model.loadParagraph(user.id, options_array[1]).then(function (dest_infos) {
                    if (dest_infos.esit == false) {
                        return alternativeAvailability_res(dest_infos)
                    }

                    let to_return = {};
                    to_return.toEdit = alternative_message(user.id, inc_struct, paragraph_infos, dest_infos);
                    let query_text;
                    if (options_array[0] == "DAY") {
                        query_text = "☀️️\n\nAlternativa selezionabile solo di giorno";
                    } else if (options_array[0] == "NIGHT") {
                        query_text = "🌙\n\nAlternativa selezionabile solo di notte";
                    } else {
                        query_text = "☀️️ 🌙\n\nAlternativa selezionabile di giorno e di notte";
                    }
                    to_return.query = { id: in_query.id, options: { text: query_text, show_alert: true, cache_time: 4 } }

                    return alternativeAvailability_res(to_return)
                });

            })
        });
    });
}

function paragraph_addChoice_message(user_id, inc_struct, paragraph_id, new_choice_text) {
    let message_txt;
    let to_return = { toSend: {} };

    if (inc_struct.paragraphs_ids.indexOf(paragraph_id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        if (new_choice_text.length === 0) {
            message_txt = "*Nuova Strada*\n\n";
            message_txt += "• Per aggiungere una scelta al paragrafo " + paragraph_id + ", completa il comando con il testo che vuoi attribuire alla _strada_:\n";
            message_txt += "• È il messaggio mostrato sotto al paragrafo, in un bottone.\n";
            message_txt += "• Nei bottoni è consigliato usare la seconda persona.\n";
            message_txt += "\nEsempio:\n• `/bardo p " + paragraph_id + " nuova strada \nCorri!`";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (new_choice_text.length < 3) {
            message_txt = "*Woops!*\n_Testo strada troppo corto_\n\n";
            message_txt += "\"_" + new_choice_text + "_\"\n\n";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (new_choice_text.length > 30) {
            message_txt = "*Woops!*\n_Testo strada troppo lungo_\n\n";
            message_txt += "\"_" + new_choice_text + "_\"\n\n";
            message_txt += "• Per essere leggibile in un bottone, il testo di una strada non può essere più lungo di 30 caratteri.\n(extra: +" + (new_choice_text.length - 30) + ")";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else {
            let is_first = (inc_struct.paragraphs_ids[0] == paragraph_id);
            message_txt = "⨓ *Nuova Strada*\n";
            message_txt += "_paragrafo_ `" + paragraph_id + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";
            message_txt += "> _" + new_choice_text.charAt(0).toUpperCase() + new_choice_text.substring(1) + "_\n\n";

            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Conferma ✓", callback_data: "B:TMP:OPTION_CONFIRM:NEW_CHOICE" }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        }
    }
    return (to_return);
}

function paragraph_addChoice_confirm(user_id, query_text, inc_struct) {
    return new Promise(function (paragraph_addChoice_confirm_res) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[1];
        let newChoice_text = splitted_imputText.slice(2).join("\n").trim().substring(2);

        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return paragraph_addChoice_confirm_res({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                if (loaded_paragraph_infos.choices.length >= 5) {
                    let unique_titles = [];
                    for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                        if (unique_titles.indexOf(loaded_paragraph_infos.choices[i].title_text) < 0) {
                            unique_titles.push(loaded_paragraph_infos.choices[i].title_text);
                        }
                    }
                    if (unique_titles.length >= 5) {
                        let message_text = "*Impossibile aggiungere ulteriori Scelte*\n_parafrafo saturo_\n\n";
                        message_text += "• Hai già impostato " + unique_titles.length + " _scelte uniche_ per il paragrafo, di più sarebbero solo scomode.";
                        message_text += "\n\n> `" + newChoice_text + "`\n";
                        let to_return = simpleMessage(message_text, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + loaded_paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
                        return paragraph_addChoice_confirm_res({ query_text: "⚠️\n\nParagrafo Saturo", toSend: to_return });
                    }
                }

                let force_availability = false; // (loaded_paragraph_infos.availability == "ALL" ? false : loaded_paragraph_infos.availability );
                let repeat_counter = 0;
                let repeat_index = -1;
                for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                    if (loaded_paragraph_infos.choices[i].title_text.toLowerCase() == newChoice_text.toLowerCase()) {
                        if (loaded_paragraph_infos.choices[i].availability != "NIGHT") {
                            force_availability = "NIGHT";
                        } else {
                            force_availability = "DAY";
                        }
                        repeat_index = i;
                        repeat_counter++;
                    }
                }

                if (repeat_counter > 1) {
                    let message_text = "*Impossibile aggiungere la Scelta*\n_testo ripetuto_\n\n";
                    message_text += "• Esistono già due varianti per la stessa scelta nel paragrafo " + loaded_paragraph_infos.id;
                    message_text += "\n\nTesto in imput:\n> `" + newChoice_text + "`\n";
                    let to_return = simpleMessage(message_text, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + loaded_paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
                    return paragraph_addChoice_confirm_res({ query_text: "⚠️\n\nTesto Ripetuto", toSend: to_return });
                }
                return model.createChoice(user_id, newChoice_text, inc_struct, 0, loaded_paragraph_infos.id, (loaded_paragraph_infos.level_deep + 1), force_availability).then(function (new_choice) {
                    if (force_availability != false) {
                        if (force_availability == "NIGHT") { repeat_index++ };
                        loaded_paragraph_infos.choices.splice(repeat_index, 0, new_choice);
                    } else {
                        loaded_paragraph_infos.choices.unshift(new_choice);
                    }
                    return model.updateParagraph(user_id, curr_paragraph_id, loaded_paragraph_infos).then(function (new_data) {
                        if (new_data.esit === false) {
                            return paragraph_addChoice_confirm_res(new_data);
                        } else {
                            loaded_paragraph_infos.choices.sort(function (a, b) {
                                if (a.title_text.toLowerCase() != b.title_text.toLowerCase()) {
                                    if (a.availability == "ALL") {
                                        return -1;
                                    } else if (a.availability == "NIGHT") {
                                        return 1;
                                    } else if (b.availability == "ALL" || b.availability == "DAY") {
                                        return 1;
                                    } else {
                                        return -1;
                                    }
                                } else {
                                    return 0;
                                }
                            });
                            return paragraph_addChoice_confirm_res({ paragraph_infos: loaded_paragraph_infos, forced: force_availability });
                        }
                    })
                });

            });
        }
    });
}

function paragraph_removeChoice_message(user_id, inc_struct, paragraph_infos) {
    let message_txt;
    let to_return = {};
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

    if (!inc_struct.paragraphs_ids || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id);
    } else if (paragraph_infos.choices.length > 0) {
        message_txt = "*Spiacente...*\n\n";
        message_txt += "• Non è possibile eliminare un paragrafo con delle scelte attive.\n• Prima di procedere, dovrai eliminare";
        if (paragraph_infos.choices.length == 1) {
            message_txt += " il paragrafo `" + paragraph_infos.choices[0].id + "`\n";
            buttons_array.unshift([{ text: "⨓ " + paragraph_infos.choices[0].title_text, callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.choices[0].id }]);
        } else {
            message_txt += " i paragrafi:\n"
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                message_txt += "· `" + paragraph_infos.choices[i].title_text + "`\n";
                buttons_array.unshift([{ text: "⨓ " + paragraph_infos.choices[0].id, callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.choices[i].id }]);
            }
        }
        message_txt += "\n(...ed eventuali sotto-paragrafi)\n";
        buttons_array[buttons_array.length - 1].unshift({ text: "Paragrofo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id });

        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
    } else {
        buttons_array = [[{ text: "Annulla ↩", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

        if (paragraph_infos.father_id == 0) {
            message_txt = "*Woops...*\n\n";
            message_txt += "Piuttosto elimina l'avventura stessa!\nPassa per il comando:\n· `/bardo bozza`";
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else {
            message_txt = "⨓ *Rimuovi Strada*\n";
            message_txt += "_paragrafo " + paragraph_infos.id + "_\n\n";
            message_txt += "Non sarà possibile recuperare alcun dato dopo la conferma...";
            buttons_array.unshift([{ text: "Elimina ❌", callback_data: "B:TMP:OPTION_CONFIRM:DEL_CHOICE:" + paragraph_infos.id }]);
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        }
    }
    return (to_return);
}

function paragraph_removeChoice_confirm(user_id, query_text, inc_struct) {
    return new Promise(function (removeChoice_res) {
        let curr_paragraph_id = query_text.split("\n")[1].split(" ")[1];

        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return ({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                return model.deleteChoice(user_id, loaded_paragraph_infos, inc_struct).then(function (del_res) {
                    if (del_res.esit === false) {
                        return removeChoice_res(new_data);
                    } else {
                        return removeChoice_res({ paragraph_infos: del_res });
                    }
                });
            });
        }
    });
}

function paragraph_setChoiceText_message(user_id, inc_struct, choice_index, paragraph_infos, new_choice_text) {
    let message_txt;
    let to_return = {};
    if (paragraph_infos.esit == false || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Paragrafi ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]])
    } else if (paragraph_infos.choices.length <= 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che tu abbia già settato alcuna scelta per il paragrafo " + paragraph_infos.id + "...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]])
    } else if (new_choice_text.length == 0) {
        if (typeof choice_index == "undefined") {
            choice_index = 1;
        }
        message_txt = "*Modifica Strada*\n\n";
        message_txt += "• Completa il comando per cambiare il testo di una scelta del paragrafo " + paragraph_infos.id + ".\n";
        message_txt += "\nEsempio:\n• `/bardo p " + paragraph_infos.id + " strada " + choice_index + " \nCorri!`";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (new_choice_text.length < 3) {
        message_txt = "*Woops!*\n_Testo strada troppo corto_\n\n";
        message_txt += "\"_" + new_choice_text + "_\"\n\n";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (new_choice_text.length > 30) {
        message_txt = "*Woops!*\n_Testo strada troppo lungo_\n\n";
        message_txt += "\"_" + new_choice_text + "_\"\n\n";
        message_txt += "• Per essere leggibile in un bottone, il testo di una strada non può essere più lungo di 30 caratteri.\n(extra: +" + (new_choice_text.length - 30) + ")";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let buttons_array = [[{ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]];
        if (!isNaN(choice_index)) {
            choice_index = Math.abs(parseInt(choice_index));
            if (choice_index != 0) {
                choice_index--;
            }
            let index_limit = 0;
            let curr_choice;

            if (inc_struct.view_type != "ALL") {
                let temp_arr = paragraph_infos.choices.filter(function (el) {
                    if (inc_struct.view_type == "NIGHT") { return el.availability == "NIGHT"; }
                    else { return el.availability != "NIGHT" }
                });

                index_limit = temp_arr.length;
                for (let i = 0; i < paragraph_infos.choices.length; i++) {
                    if (paragraph_infos.choices[i].id == temp_arr[choice_index].id) {
                        curr_choice = paragraph_infos.choices[i];
                        break;
                    }
                }
            } else {
                index_limit = paragraph_infos.choices.length;
                curr_choice = paragraph_infos.choices[choice_index];
            }

            if (choice_index >= index_limit) {
                message_txt = "*Woops!*\n_indice scelta non valido!_\n\n";
                message_txt += "• Mi risulta ci " + (index_limit == 1 ? "sia" : "siano") + " solo " + index_limit;
                message_txt += simpleGenderFormatter((index_limit == 1), "scelt", "a", "e") + " nel paragrafo `" + paragraph_infos.id + "`";
                to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
            } else {
                message_txt = "*Modifica " + (choice_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.id + "_\n\n";
                message_txt += "> `" + new_choice_text.charAt(0).toUpperCase() + new_choice_text.substring(1) + "`\n";
                message_txt += "\n• Codice: `" + curr_choice.id + "`";
                message_txt += "\n• Testo precedente:\n> `" + curr_choice.title_text + "`\n";
                buttons_array.unshift([{ text: "Conferma ✓", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_TITLE:" }])
                to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
            }
        } else {
            let curr_choice_infos = null;
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                if (paragraph_infos.choices[i].id == choice_index.toUpperCase()) {
                    choice_index = i;
                    curr_choice_infos = paragraph_infos.choices[i];
                    break;
                }
            }

            if (curr_choice_infos == null) {
                message_txt = "*Woops!*\n_codice scelta non valido!_\n\n";
                if (paragraph_infos.choices.length == 1) {
                    message_txt += "• Il paragrafo al momento ha solo una strada, con codice: " + paragraph_infos.choices[0].id + "\n\n";
                    message_txt += "• Usa\n· `/bardo p " + paragraph_infos.id + " strada " + paragraph_infos.choices[0].id + " `...\n\n";

                    message_txt += "• O anche:\n· `/bardo p " + paragraph_infos.id + " strada 1 `...";
                } else {
                    message_txt += "• Le scelte nel paragrafo hanno codice:\n";
                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        message_txt += "· `" + paragraph_infos.choices[i].id + "\n";
                    }
                    message_txt += "\n• Usa:\n· `/bardo p " + paragraph_infos.id + " strada \\[codice] " + new_choice_text + "`";
                }
                to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
            } else {
                message_txt = "*Modifica " + (choice_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.id + "_\n\n";
                message_txt += "> `" + new_choice_text.charAt(0).toUpperCase() + new_choice_text.substring(1) + "`\n";
                message_txt += "\n• Codice: `" + curr_choice_infos.id + "`";
                message_txt += "\n• Testo precedente:\n> `" + curr_choice_infos.title_text + "`\n";

                buttons_array.unshift([{ text: "Conferma ✓", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_TITLE:" }])
                to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
            }
        }
    }

    return (to_return);
}

function paragraph_setChoiceText_confirm(user_id, query_text, inc_struct) {
    return new Promise(function (paragraph_setChoiceText_confirm_res) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[2];
        let choice_paragraph_id = splitted_imputText[5].split(" ")[2];
        let new_choice_text = splitted_imputText[3].substring(2);
        let message_txt = "";

        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return paragraph_setChoiceText_confirm_res({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                let curr_choice_index = -1;
                let force_availability = false

                for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                    if (loaded_paragraph_infos.choices[i].id == choice_paragraph_id) {
                        curr_choice_index = i;
                    } else if (loaded_paragraph_infos.choices[i].title_text.toLowerCase() == new_choice_text.toLowerCase()) {
                        if (loaded_paragraph_infos.choices[i].availability != "NIGHT") {
                            force_availability = "NIGHT";
                        } else {
                            force_availability = "DAY";
                        }
                    }
                }
                if (curr_choice_index < 0) {
                    message_txt = "*Woops!*\n_codice scelta non valido!_\n\n";
                    if (loaded_paragraph_infos.choices.length == 1) {
                        message_txt += "• Il paragrafo al momento ha solo una strada, con codice: " + loaded_paragraph_infos.choices[0].id + "\n\n";
                        message_txt += "• Usa\n· `/bardo p " + loaded_paragraph_infos.id + " strada " + loaded_paragraph_infos.choices[0].id + "\n" + new_choice_text + "`\n\n";
                    } else {
                        message_txt += "• Le scelte nel paragrafo hanno codice:\n";
                        for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                            message_txt += "· `" + loaded_paragraph_infos.choices[i].id + "`\n";
                        }
                        message_txt += "\n• Usa:\n· `/bardo p " + loaded_paragraph_infos.id + " strada \\[codice] " + new_choice_text + "`";
                    }
                    return paragraph_setChoiceText_confirm_res({ esit: false, text: message_txt });
                }

                return model.loadParagraph(user_id, choice_paragraph_id).then(function (child_paragraph_infos) {
                    loaded_paragraph_infos.choices[curr_choice_index].title_text = new_choice_text;
                    child_paragraph_infos.choice_title = new_choice_text;
                    if (force_availability != false) {
                        loaded_paragraph_infos.choices[curr_choice_index].availability = force_availability;
                        child_paragraph_infos.availability = force_availability;
                        if (force_availability == "NIGHT") {
                            if (child_paragraph_infos.night_text != "") {
                                child_paragraph_infos.night_text = child_paragraph_infos.text;
                                child_paragraph_infos.text = "";
                            }
                        } else if (child_paragraph_infos.text == "" && child_paragraph_infos.night_text != "") {
                            child_paragraph_infos.text = child_paragraph_infos.night_text;
                        }
                    }
                    return model.updateParagraph(user_id, curr_paragraph_id, loaded_paragraph_infos).then(function (update_res) {
                        return model.updateParagraph(user_id, choice_paragraph_id, child_paragraph_infos).then(function (child_update_res) {
                            if (update_res.esit === false) {
                                return paragraph_setChoiceText_confirm_res(update_res);
                            } else if (child_update_res.esit === false) {
                                return paragraph_setChoiceText_confirm_res(child_update_res);
                            } else {
                                return paragraph_setChoiceText_confirm_res({ paragraph_infos: loaded_paragraph_infos, forced: force_availability }); // info per il padre
                            }
                        });
                    });

                });
            });
        }
    });
}

function paragraph_setChoiceDelay_message(user_id, inc_struct, choice_index, paragraph_infos, new_delay) {
    let message_txt;
    let to_return = {};
    let buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]];

    if (paragraph_infos.esit == false || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        buttons_array[0].unshift({ text: "Paragrafi ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" })
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array)
    } else if (paragraph_infos.choices.length <= 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che tu abbia già settato una scelta per il paragrafo " + paragraph_infos.id + "..";
        buttons_array[0].unshift({ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id })

        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array)
    } else {
        if (!new_delay || new_delay.length == 0 || isNaN(parseInt(new_delay))) {
            message_txt = "*Attesa Scelta*\n\n";
            message_txt += "• Completa il comando.\nSpecifica il tempo, in minuti, che i giocatori dovranno attendere per passare al paragrafo successivo.\n";
            message_txt += "\nEsempio:\n• `/bardo p " + paragraph_infos.id + " strada 1 attesa 5`";
            buttons_array[0].unshift({ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id })

            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else {
            let curr_choice = null;

            if (!isNaN(choice_index)) {
                choice_index = Math.abs(parseInt(choice_index));
                if (choice_index != 0) {
                    choice_index--;
                }
                let index_limit = 0;

                if (inc_struct.view_type != "ALL") {
                    let temp_arr = paragraph_infos.choices.filter(function (el) {
                        if (inc_struct.view_type == "NIGHT") { return el.availability == "NIGHT"; }
                        else { return el.availability != "NIGHT" }
                    });
                    index_limit = temp_arr.length;

                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        if (paragraph_infos.choices[i].id == temp_arr[choice_index].id) {
                            curr_choice = paragraph_infos.choices[i];
                            break;
                        }
                    }

                } else {
                    if (index_limit < paragraph_infos.choices.length) {
                        curr_choice = paragraph_infos.choices[choice_index];
                    }
                    index_limit = paragraph_infos.choices.length;
                }

                if (curr_choice == null) {
                    message_txt = "*Woops!*\n_indice scelta non valido!_\n\n";
                    message_txt += "• Mi risulta ci " + (index_limit == 1 ? "sia" : "siano") + " solo " + index_limit;
                    message_txt += simpleGenderFormatter((index_limit == 1), " scelt", "a", "e") + " nel paragrafo `" + paragraph_infos.id + "`";
                    to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
                }
            } else {
                for (let i = 0; i < paragraph_infos.choices.length; i++) {
                    if (paragraph_infos.choices[i].id == choice_index.toUpperCase()) {
                        choice_index = i;
                        curr_choice = paragraph_infos.choices[choice_index];
                        break;
                    }
                }

                if (curr_choice == null) {
                    message_txt = "*Woops!*\n_codice scelta non valido!_\n\n";
                    if (paragraph_infos.choices.length == 1) {
                        message_txt += "• Il paragrafo al momento ha solo una strada, con codice: " + paragraph_infos.choices[0].id + "\n\n";
                        message_txt += "• Usa\n· `/bardo p " + paragraph_infos.id + " strada " + paragraph_infos.choices[0].id + " `...\n\n";

                        message_txt += "• O anche:\n· `/bardo p " + paragraph_infos.id + " strada 1 attesa "; //"`...";
                        message_txt += (new_delay < 2 ? 2 : (new_delay > 90 ? 90 : new_delay)) + "`\n";
                    } else {
                        message_txt += "• Le scelte nel paragrafo hanno codice:\n";
                        for (let i = 0; i < paragraph_infos.choices.length; i++) {
                            message_txt += "· `" + paragraph_infos.choices[i].id + "\n";
                        }
                        message_txt += "\n• Usa:\n· `/bardo p " + paragraph_infos.id + " strada \\[codice] attesa " + (new_delay < 2 ? 2 : (new_delay > 90 ? 90 : new_delay)) + "`";
                    }
                    buttons_array[0].unshift({ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id })

                    to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
                }
            }
            buttons_array[0].unshift({ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id });
            if (curr_choice != null) {
                buttons_array[0].unshift({ text: "➽", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.choices[choice_index].id });

                if (new_delay < 2 || new_delay > 90) {
                    message_txt = "*Attesa per: \"" + curr_choice.title_text + "\"*\n_al paragrafo " + paragraph_infos.id + "_\n\n";
                    message_txt += "• Deve essere compresa tra 2 e 90 minuti\n";
                    message_txt += "\nEsempio:\n• `/bardo p " + paragraph_infos.id + " strada " + (choice_index + 1) + " attesa " + (new_delay < 2 ? 2 : 90) + "`";
                    to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
                } else {
                    message_txt = "*Attesa per: \"" + curr_choice.title_text + "\"*\n_al paragrafo " + paragraph_infos.id + "_\n\n";
                    message_txt += "> " + new_delay + " minuti\n";
                    message_txt += "\n• Destinazione: `" + curr_choice.id + "`";
                    //message_txt += "\n• Testo: `" + curr_choice.title_text + "`";

                    buttons_array.push([{ text: "Conferma ✓", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_DELAY:" }])
                    to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
                }
            }
        }
    }


    return (to_return);
}

function paragraph_setChoiceDelay_confirm(user_id, query_text, inc_struct) {
    return new Promise(function (paragraph_setChoiceDelay) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[2];
        let new_choice_delay = splitted_imputText[3].split(" ")[1];
        let choice_paragraph_id = splitted_imputText[5].split(" ")[2];

        let message_txt = "";


        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return ({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                let curr_choice_index = -1;
                for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                    if (loaded_paragraph_infos.choices[i].id == choice_paragraph_id) {
                        curr_choice_index = i;
                        break;
                    }
                }

                if (curr_choice_index < 0) {
                    message_txt = "*Woops!*\n_codice scelta non valido!_\n\n";
                    if (loaded_paragraph_infos.choices.length == 1) {
                        message_txt += "• Il paragrafo al momento ha solo una strada, con codice: " + loaded_paragraph_infos.choices[0].id + "\n\n";
                        message_txt += "• Usa\n· `/bardo p " + loaded_paragraph_infos.id + " \nstrada " + loaded_paragraph_infos.choices[0].id + " attesa " + new_choice_delay + "`\n\n";
                    } else {
                        message_txt += "• Le scelte nel paragrafo hanno codice:\n";
                        for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                            message_txt += "· `" + loaded_paragraph_infos.choices[i].id + "\n";
                        }
                        message_txt += "\n• Usa:\n· `/bardo p " + loaded_paragraph_infos.id + " \nstrada \\[codice] attesa" + new_choice_delay + "`";
                    }
                    return paragraph_setChoiceDelay({ esit: false, text: message_txt });
                } else {
                    loaded_paragraph_infos.choices[curr_choice_index].delay = new_choice_delay;
                    return model.updateParagraph(user_id, curr_paragraph_id, loaded_paragraph_infos).then(function (update_res) {
                        if (update_res.esit === false) {
                            return paragraph_setChoiceDelay(update_res);
                        } else {
                            return paragraph_setChoiceDelay({ paragraph_infos: loaded_paragraph_infos, new_delay: new_choice_delay }); // info per il padre
                        }
                    })
                }
            });
        }
    });
}

function paragraph_setOptions_message(user_id, inc_struct, paragraph_infos) {
    let message_txt;
    let to_return = {};
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

    if (!inc_struct.paragraphs_ids || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id);
    } else {
        buttons_array = [[
            { text: " ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id },
            { text: "⨷", callback_data: "B:FORGET" }
        ]];

        if (paragraph_infos.father_id == 0) {
            message_txt = "*Woops...*\n\n";
            message_txt += "Non è possibile modificare alcun opzione dell'inizio avventura.";
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else {
            message_txt = "⌥ *Opzioni per: \"" + paragraph_infos.choice_title + "\"*\n";
            message_txt += "_paragrafo " + paragraph_infos.id + "_\n\n";

            if (paragraph_infos.esit_type == -1) {
                message_txt += "🌑 Fine avventura, esito negativo\n";
            } else if (paragraph_infos.esit_type == 1) {
                message_txt += "🌕 Fine avventura, esito positivo\n";
            } else {
                message_txt += "📜 " + paragraph_infos.level_deep + "° scelta\n";
            }

            let availability_line = " Selezionabile: ";
            if (paragraph_infos.availability == "NIGHT") {
                availability_line = "🌙" + availability_line + "di Notte \n";
            } else if (paragraph_infos.availability == "DAY") {
                availability_line = "☀️" + availability_line + "di Giorno ️\n";
            } else {
                availability_line = "⭐" + availability_line + "Sempre \n";
            }
            message_txt += availability_line;



            message_txt += "\n❤️ Sullo stato giocatore: \n";
            if (typeof paragraph_infos.become != "undefined" && paragraph_infos.become.length > 0) {
                message_txt += "• Imposto: " + paragraph_infos.become + "\n";
            } else {
                message_txt += "• Nessun cambiamento \n";
            }
            if (typeof paragraph_infos.exclusive != "undefined" && paragraph_infos.exclusive.length > 0) {
                if (paragraph_infos.exclusive.length == 1) {
                    message_txt += "• Necessario: " + paragraph_infos.exclusive[0] + "\n";
                } else if (paragraph_infos.exclusive.length > 1) {
                    message_txt += "• Necessari: " + paragraph_infos.exclusive.join(", ") + "\n";
                }
            } else if (typeof paragraph_infos.excluded != "undefined" && paragraph_infos.excluded.length > 0) {
                if (paragraph_infos.excluded.length == 1) {
                    message_txt += "• Escluso: " + paragraph_infos.excluded[0] + "\n";
                } else {
                    message_txt += "• Esclusi: " + paragraph_infos.excluded.join(", ") + "\n";
                }
            } else {
                message_txt += "• Nessuna condizione\n";
            }




            buttons_array.push([
                { text: "☠", callback_data: 'B:TMP:PRGPH:CHOICE_ESIT:' + paragraph_infos.id },
            ]);

            if (paragraph_infos.availability == "DAY") {
                buttons_array[1].unshift(
                    { text: "⭐", callback_data: 'B:TMP:PRGPH:AVAILABILITY:ALL:' + paragraph_infos.id },
                    { text: "🌙", callback_data: 'B:TMP:PRGPH:AVAILABILITY:NIGHT:' + paragraph_infos.id }
                );
            } else if (paragraph_infos.availability == "NIGHT") {
                buttons_array[1].unshift(
                    { text: "⭐", callback_data: 'B:TMP:PRGPH:AVAILABILITY:ALL:' + paragraph_infos.id },
                    { text: "☀️️", callback_data: 'B:TMP:PRGPH:AVAILABILITY:DAY:' + paragraph_infos.id }
                );
            } else {
                buttons_array[1].unshift(
                    { text: "☀️️", callback_data: 'B:TMP:PRGPH:AVAILABILITY:DAY:' + paragraph_infos.id },
                    { text: "🌙", callback_data: 'B:TMP:PRGPH:AVAILABILITY:NIGHT:' + paragraph_infos.id }
                );
            }
            buttons_array.push([
                { text: "❤️", callback_data: 'B:TMP:PRGPH:CH_STATUS:' + paragraph_infos.id + ":0" },
                { text: "📦", callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":0" }
            ]);

            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        }
    } //   

    return (to_return);
}

function paragraph_setChoiceStatus_message(user_id, inc_struct, paragraph_infos, page_n, is_alternative) {
    let message_txt;
    let to_return = {};

    if (!inc_struct.paragraphs_ids || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let buttons_array = [];

        if (paragraph_infos.father_id == 0) {
            message_txt = "*Woops...*\n\n";
            message_txt += "L'inizio avventura non può portare a cambiamenti di stato.\nSfrutta uno dei paragrafi successivi!";
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else {
            if (page_n == 0) {
                message_txt = "❤️ *Stato del giocatore*\n";
                let alternative_text = ":NO";
                let become;
                let excluded;
                let exclusive;

                if (is_alternative == false) {
                    message_txt += "_paragrafo " + paragraph_infos.id + "_\n";
                    message_txt += "_\"" + paragraph_infos.choice_title + "\"_\n";

                    become = paragraph_infos.become;
                    excluded = paragraph_infos.excluded;
                    exclusive = paragraph_infos.exclusive;
                } else {
                    message_txt += "_alternativa in " + paragraph_infos.id + "_\n";
                    alternative_text = ":ALT:" + is_alternative;

                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        if (paragraph_infos.choices[i].id == is_alternative) {
                            become = paragraph_infos.choices[i].become;
                            excluded = paragraph_infos.choices[i].excluded;
                            exclusive = paragraph_infos.choices[i].exclusive;
                            message_txt += "\n• Per il paragrafo " + is_alternative + "\n\"" + paragraph_infos.choices[i].title_text + "\"\n";
                            break;
                        }
                    }
                }

                message_txt += "\n• Ogni scelta può modificare lo stato del giocatore ed/o essere visibile solo a chi si trova in un particolare stato.\n";
                message_txt += "\n• Puoi modificare quest'opzione a piacimento.\n"; // ❤️🤤😴🥴😨🙂😤



                let stato_line = "";
                if (typeof become != "undefined" && become.length > 0) {
                    stato_line += "• Imposto: " + become + "\n";
                    buttons_array.push([{ text: "Annulla cambiamento di stato", callback_data: "B:TMP:OPTION_CONFIRM:STATUS:CLEAR:BECOME" + alternative_text }]);
                } else {
                    stato_line += "• Nessuno cambiamento\n";
                }
                if (typeof exclusive != "undefined" && exclusive.length > 0) {
                    if (exclusive.length == 1) {
                        stato_line += "• Necessario: " + exclusive[0] + "\n";
                    } else if (exclusive.length > 1) {
                        stato_line += "• Necessari: " + exclusive.join(", ") + "\n";
                    }
                    buttons_array.push([{ text: "Togli esclusiva", callback_data: "B:TMP:OPTION_CONFIRM:STATUS:CLEAR:MUSTBE" + alternative_text }]);
                } else if (typeof excluded != "undefined" && excluded.length > 0) {
                    if (excluded.length == 1) {
                        stato_line += "• Escluso: " + excluded[0] + "\n";
                    } else {
                        stato_line += "• Esclusi: " + excluded.join(", ") + "\n";
                    }
                    buttons_array.push([{ text: "Togli restrizione", callback_data: "B:TMP:OPTION_CONFIRM:STATUS:CLEAR:MUSTNOT" + alternative_text }]);

                } else {
                    stato_line += "• Nessuna condizione\n";
                }

                if (stato_line.length <= 0) {
                    message_txt += "\n• Nessuna opzione impostata\n";

                } else {
                    message_txt += "\n*Opzioni attuali:* \n" + stato_line;
                }

                buttons_array.unshift([
                    { text: "🤤", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.id + ":1" + alternative_text },
                    { text: "😴", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.id + ":2" + alternative_text },
                    { text: "🥴", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.id + ":3" + alternative_text },
                    { text: "😨", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.id + ":4" + alternative_text },
                    { text: "😤", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.id + ":5" + alternative_text },
                    { text: "🙂", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.id + ":6" + alternative_text }
                ]); //
                buttons_array.unshift([
                    { text: "⨓", callback_data: ("B:TMP:PRGPH:SELECT:" + paragraph_infos.id) },
                    { text: "⌥", callback_data: ("B:TMP:PRGPH:OPTIONS:" + paragraph_infos.id) },
                    { text: "⨷", callback_data: "B:FORGET" }
                ]);
                if (is_alternative != false) {
                    buttons_array[0][1].callback_data = ("B:TMP:ALTERNATIVE:SELECT:" + paragraph_infos.id + ":DEST:" + is_alternative);
                    buttons_array[0].unshift({ text: "⌖", callback_data: ("B:TMP:PRGPH:SELECT:" + is_alternative) });
                }
            } else {
                let propouse_type = "";
                let propouse_text = "";

                let info_text = "";
                if (page_n == 1) {
                    message_txt = "🤤 *Intossicato*\n";
                    propouse_type = "🤤";
                    propouse_text = "Viene intossicato";
                    info_text = "_«Probabilmente per via dell'assunzione o dell'inalazione di qualche strano composto, il giocatore si sente intorpidito, disorientato...»_";
                } else if (page_n == 2) {
                    message_txt = "😴 *Stanco*\n";
                    propouse_type = "😴";
                    propouse_text = "Si stanca";
                    info_text = "_«Eccessivo sforzo, sonnifero, troppo ragionar? Qualunque sia la causa, il giocatore sembra diventato un bradipo.»_";
                } else if (page_n == 3) {
                    message_txt = "🥴 *Confuso*\n";
                    propouse_type = "🥴";
                    propouse_text = "Si confonde";
                    if (intIn(0, 9) == 1) {
                        info_text = "_«Così confuso da colpir... 🙊»_";
                    } else {
                        info_text = "_«C...cosa??»_";
                    }
                } else if (page_n == 4) {
                    message_txt = "😨 *Spaventato*\n";
                    propouse_type = "😨";
                    propouse_text = "Si spaventa";
                    info_text = "_«Esistono molte ragioni per cui anche il cuore più impavido possa ritrovarsi a vacillare...»_";
                } else if (page_n == 5) {
                    message_txt = "😤 *Concentrato*\n";
                    propouse_text = "Si concentra";
                    propouse_type = "😤";
                    info_text = "_«Meditazione, collera, determinazione? Non importa come ne perchè: il giocatore è al massimo delle sue capacità!»_";
                } else if (page_n == 6) {
                    message_txt = "🙂 *Normale*\n";
                    propouse_type = "🙂";
                    propouse_text = "Torna al suo stato naturale";

                    if (intIn(0, 5) == 1) {
                        info_text = "_«Alle volte fischietta...»_";
                    } else {
                        info_text = "_«Niente offusca la sua naturale indole, il giocatore è lucido (per quel può...)»_";
                    }
                }

                let alternative_text = ":NO";
                if (is_alternative == false) {
                    message_txt += "_paragrafo " + paragraph_infos.id + "_\n";
                    message_txt += "_\"" + paragraph_infos.choice_title + "\"_\n";
                } else {
                    message_txt += "_alternativa in " + paragraph_infos.id + "_\n";
                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        if (paragraph_infos.choices[i].id == is_alternative) {
                            message_txt += "\n• Per il paragrafo " + is_alternative + "\n\"" + paragraph_infos.choices[i].title_text + "\"\n";
                            break;
                        }
                    }
                    alternative_text = ":ALT:" + is_alternative;
                }
                message_txt += "\n" + info_text;




                buttons_array.unshift(
                    [{ text: propouse_text, callback_data: "B:TMP:OPTION_CONFIRM:STATUS:" + propouse_type + ":BECOME" + alternative_text }],
                    [{ text: "Deve esserlo ", callback_data: "B:TMP:OPTION_CONFIRM:STATUS:" + propouse_type + ":MUSTBE" + alternative_text }],
                    [{ text: "Non deve esserlo ", callback_data: "B:TMP:OPTION_CONFIRM:STATUS:" + propouse_type + ":MUSTNOT" + alternative_text }]
                ); // 

                buttons_array.unshift([
                    { text: "⨓", callback_data: ("B:TMP:PRGPH:SELECT:" + paragraph_infos.id) },
                    { text: "❤️", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.id + ":0" + alternative_text },
                    { text: "⨷", callback_data: "B:FORGET" }
                ]);

            }



            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        }
    } //   

    return (to_return);
}

function paragraph_setChoiceStatus_confirm(user_id, query_text, inc_struct, new_status, status_type, is_alternative) { // 0, -1, 1 (CONTINUE, NEGATIVE, POSITIVE)
    return new Promise(function (setChoiceType_res) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[1];
        if (is_alternative) {
            curr_paragraph_id = splitted_imputText[1].split(" ")[2];
        }

        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + curr_paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return setChoiceType_res({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                if (loaded_paragraph_infos.esit == false) {
                    return setChoiceType_res(loaded_paragraph_infos);
                }
                return model.loadParagraph(user_id, loaded_paragraph_infos.father_id).then(function (father_paragraph_infos) {
                    if (father_paragraph_infos.esit == false) {
                        return setChoiceType_res(father_paragraph_infos);
                    }

                    if (status_type == "MUSTNOT") {

                        if (is_alternative == false) {
                            for (let i = 0; i < father_paragraph_infos.choices.length; i++) {
                                if (father_paragraph_infos.choices[i].id == loaded_paragraph_infos.id) {

                                    if (!("excluded" in father_paragraph_infos.choices[i])) {
                                        father_paragraph_infos.choices[i].excluded = [];
                                    }

                                    if (father_paragraph_infos.choices[i].excluded.length > 5) {
                                        return setChoiceType_res({ new_esit: false, query_text: "Non ci sono già troppe condizioni per la scelta " + curr_paragraph_id + "?", paragraph_infos: loaded_paragraph_infos }); // info per il padre
                                    } else if (new_status == "CLEAR") {
                                        father_paragraph_infos.choices[i].excluded = [];
                                    } else if (father_paragraph_infos.choices[i].excluded.indexOf(new_status) < 0) {
                                        father_paragraph_infos.choices[i].excluded.push(new_status);
                                    } else {
                                        return setChoiceType_res({ new_esit: false, query_text: "Lo stato " + new_status + " è già esclusivo per la scelta " + curr_paragraph_id, paragraph_infos: loaded_paragraph_infos }); // info per il padre
                                    }
                                    break;
                                }
                            }

                            if (new_status == "CLEAR") {
                                loaded_paragraph_infos.excluded = [];
                            } else {
                                if (!("excluded" in loaded_paragraph_infos)) {
                                    loaded_paragraph_infos.excluded = [];
                                }
                                loaded_paragraph_infos.excluded.push(new_status);
                            }
                        } else {
                            for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                                if (loaded_paragraph_infos.choices[i].id == is_alternative) {
                                    if (new_status == "CLEAR") {
                                        loaded_paragraph_infos.choices[i].excluded = [];
                                    } else {
                                        if (!("excluded" in loaded_paragraph_infos.choices[i])) {
                                            loaded_paragraph_infos.choices[i].excluded = [];
                                        }
                                        loaded_paragraph_infos.choices[i].excluded.push(new_status);
                                    }
                                    break;
                                }
                            }
                        }


                    } else if (status_type == "MUSTBE") {
                        if (is_alternative == false) {
                            for (let i = 0; i < father_paragraph_infos.choices.length; i++) {
                                if (father_paragraph_infos.choices[i].id == loaded_paragraph_infos.id) {
                                    if (!("exclusive" in father_paragraph_infos.choices[i])) {
                                        father_paragraph_infos.choices[i].exclusive = [];
                                    }

                                    if (father_paragraph_infos.choices[i].exclusive.length > 5) {
                                        return setChoiceType_res({ new_esit: false, query_text: "Non ci sono già troppe condizioni per la scelta " + curr_paragraph_id + "?" }); // info per il padre
                                    } else if (new_status == "CLEAR") {
                                        father_paragraph_infos.choices[i].exclusive = [];
                                    } else if (father_paragraph_infos.choices[i].exclusive.indexOf(new_status) < 0) {
                                        father_paragraph_infos.choices[i].exclusive.push(new_status);
                                    } else {
                                        return setChoiceType_res({ new_esit: false, query_text: "Lo stato " + new_status + " è già esclusivo per la scelta " + curr_paragraph_id }); // info per il padre
                                    }
                                    break;
                                }
                            }


                            if (new_status == "CLEAR") {
                                loaded_paragraph_infos.exclusive = [];
                            } else {
                                if (!"exclusive" in loaded_paragraph_infos) {
                                    loaded_paragraph_infos.exclusive = [];
                                }
                                loaded_paragraph_infos.exclusive.push(new_status);
                            }
                        } else {
                            for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                                if (loaded_paragraph_infos.choices[i].id == is_alternative) {
                                    if (new_status == "CLEAR") {
                                        loaded_paragraph_infos.choices[i].exclusive = [];
                                    } else {
                                        if (!("exclusive" in loaded_paragraph_infos.choices[i])) {
                                            loaded_paragraph_infos.choices[i].exclusive = [];
                                        }
                                        loaded_paragraph_infos.choices[i].exclusive.push(new_status);
                                    }
                                    break;
                                }
                            }
                        }

                    } else if (status_type == "BECOME") {

                        if (is_alternative == false) {
                            for (let i = 0; i < father_paragraph_infos.choices.length; i++) {
                                if (father_paragraph_infos.choices[i].id == loaded_paragraph_infos.id) {
                                    if (new_status == "CLEAR" || !("become" in father_paragraph_infos.choices[i])) {
                                        father_paragraph_infos.choices[i].become = "";
                                    } else {
                                        father_paragraph_infos.choices[i].become = new_status;
                                    }
                                    break;
                                }
                            }

                            if (new_status == "CLEAR") {
                                loaded_paragraph_infos.become = "";
                            } else {
                                loaded_paragraph_infos.become = new_status;
                            }

                        } else {
                            for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                                if (loaded_paragraph_infos.choices[i].id == is_alternative) {
                                    if (new_status == "CLEAR") {
                                        loaded_paragraph_infos.choices[i].become = "";
                                    } else {
                                        loaded_paragraph_infos.choices[i].become = "";
                                    }
                                    break;
                                }
                            }
                        }

                    }


                    return model.updateParagraph(user_id, curr_paragraph_id, loaded_paragraph_infos).then(function (update_res) {
                        return model.updateParagraph(user_id, father_paragraph_infos.id, father_paragraph_infos).then(function (child_update_res) {
                            if (update_res.esit === false) {
                                return setChoiceType_res(update_res);
                            } else if (child_update_res.esit === false) {
                                return setChoiceType_res(child_update_res);
                            } else {
                                return setChoiceType_res({ paragraph_infos: loaded_paragraph_infos, new_esit: new_status }); // info per il padre
                            }
                        });
                    });
                });
            });
        }
    });
}

function paragraph_setChoiceDrop_message(user_id, inc_struct, paragraph_infos, page_n, is_alternative, has_select) {
    let message_txt = "";
    let to_return = {};

    if (!inc_struct.paragraphs_ids || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let buttons_array = [];
        if (has_select != false) {
            console.log("Has select!! " + has_select);
        }

        if (paragraph_infos.father_id == 0) {
            message_txt = "*Woops...*\n\n";
            message_txt += "L'inizio avventura non può portare a drop ne richieste di oggetti.\nSfrutta uno dei paragrafi successivi!";
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else {
            buttons_array.push([
                { text: "⨓", callback_data: ("B:TMP:PRGPH:SELECT:" + paragraph_infos.id) },
                { text: "⌥", callback_data: ("B:TMP:PRGPH:OPTIONS:" + paragraph_infos.id) },
                { text: "⨷", callback_data: "B:FORGET" }
            ]);

            let alt_integrative = ":NO";
            let integrative_text = "";
            if (is_alternative == false) {
                message_txt += "_paragrafo " + paragraph_infos.id + "_\n";
                message_txt += "_\"" + paragraph_infos.choice_title + "\"_\n";
            } else {
                message_txt += "_alternativa in " + paragraph_infos.id + "_\n";
                alt_integrative = ":ALT:" + is_alternative;
                for (let i = 0; i < paragraph_infos.choices.length; i++) {
                    if (paragraph_infos.choices[i].id == is_alternative) {
                        message_txt += "_\"" + paragraph_infos.choices[i].title_text + "\"_\n";
                        break;
                    }
                }
                buttons_array[0][1].callback_data = ("B:TMP:ALTERNATIVE:SELECT:" + paragraph_infos.id + ":DEST:" + is_alternative);
                buttons_array[0].unshift({ text: "⌖", callback_data: ("B:TMP:PRGPH:SELECT:" + is_alternative) });

            }
            if (is_alternative == false) {
                integrative_text += "la strada";
            } else {
                integrative_text += "l'alternativa";
            }

            if (has_select != false) {
                console.log("Has select!! Id oggetto: " + has_select);
            } else if (page_n == 0) {
                message_txt = "📦 *Drop e Richieste*\n" + message_txt;
                message_txt += "\nAl giocatore che seleziona " + integrative_text + ": ";


                message_txt += "\n• Puoi donare un oggetto 🎁";
                message_txt += "\n• Puoi richiedere che esibisca un oggetto ✨";
                message_txt += "\n• Puoi prendere un oggetto 🐾\n";

                message_txt += "\n• Puoi modificare queste opzioni a piacimento"; // ❤️🤤😴🥴😨🙂😤
                buttons_array.push([
                    { text: "🎁", callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":1" + alt_integrative },
                    { text: "✨", callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":2" + alt_integrative },
                    { text: "🐾", callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":3" + alt_integrative }
                ]); // 
            } else {
                buttons_array[0].unshift({ text: "📦", callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":0" + alt_integrative });

                let page_starter;
                let creati;
                let base;
                let speciali;

                if (page_n == 1 || page_n == 4 || page_n == 5 || page_n == 6) {
                    message_txt = "🎁 *Dai...*\n" + message_txt;
                    creati = all_items.creabili.filter(function (el) { return el.dropable == true });
                    base = all_items.base.filter(function (el) { return el.type == "B1" });
                    speciali = all_items.base.filter(function (el) { return (el.type == "B2" || el.type == "B3") });
                    page_starter = 4;
                    message_txt += "\n• Scelta " + integrative_text + ", il giocatore riceverà l'oggetto.";

                } else if (page_n == 2 || page_n == 7 || page_n == 8 || page_n == 9) {
                    message_txt = "✨ *Richiedi...*\n" + message_txt;

                    creati = Array.from(new Set(all_items.creabili));
                    base = all_items.base.filter(function (el) { return el.type == "B1" });
                    speciali = all_items.base.filter(function (el) { return (el.type == "B2" || el.type == "B3") });
                    page_starter = 7;
                    message_txt += "\n• Se il giocatore non possiede l'oggetto, non vedrà " + integrative_text + ".";

                } else if (page_n == 3 || page_n == 10 || page_n == 11 || page_n == 12) {
                    message_txt = "🐾 *Prendi...*\n" + message_txt;

                    creati = all_items.creabili.filter(function (el) { return el.flushable == true });
                    base = all_items.base.filter(function (el) { return el.type == "B1" });
                    speciali = all_items.base.filter(function (el) { return (el.type == "B2" || el.type == "B3") });
                    page_starter = 10;
                    message_txt += "\n• Se il giocatore non possiede l'oggetto, non vedrà " + integrative_text + ".";
                    message_txt += "\n• Scelta " + integrative_text + ", il giocatore perderà l'oggetto.";

                }

                if (page_n <= 3) {
                    message_txt += "\n• Puoi scegliere tra " + (base.length + speciali.length + creati.length) + " oggetti, divisi nelle categorie:";

                    buttons_array.push([
                        { text: "Base", callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":" + page_starter + alt_integrative },
                        { text: "Speciali", callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":" + (page_starter + 1) + alt_integrative },
                        { text: "Creati", callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":" + (page_starter + 2) + alt_integrative }
                    ]);
                } else {

                    let curr_case = [];

                    if (page_n == 4 || page_n == 7 || page_n == 10) {
                        // message_txt += "\n• La quantità è fissata ad \"un pezzo di...\" "; // 4
                        // message_txt += "\n• La quantità sarà generata caso per caso, in range.\n\n"; // 5

                        curr_case = base;
                    } else if (page_n == 5 || page_n == 8 || page_n == 11) {
                        curr_case = speciali;
                    } else if (page_n == 6 || page_n == 9 || page_n == 12) {
                        curr_case = creati;
                    }
                    let tmp_line = [];
                    let unique_names = [];
                    for (let i = 0; i < curr_case.length; i++) {
                        if (unique_names.indexOf(curr_case[i].name) < 0) {
                            unique_names.push(curr_case[i].name);
                            if (curr_case[i].name.length <= 7) {
                                tmp_line.push({ text: curr_case[i].name, callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":1" + alt_integrative + ":D:" + curr_case[i].id });
                            } else if (buttons_array[(buttons_array.length - 1)].length == 1 && (buttons_array[(buttons_array.length - 1)][0].text.length + curr_case[i].name.length) < 20) {
                                buttons_array[(buttons_array.length - 1)].push({ text: curr_case[i].name, callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":1" + alt_integrative + ":D:" + curr_case[i].id });
                            } else if (tmp_line.length == 1 && (tmp_line[0].text.length + curr_case[i].name.length) < 20) {
                                buttons_array.push([tmp_line[0], { text: curr_case[i].name, callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":1" + alt_integrative + ":D:" + curr_case[i].id }]);
                                tmp_line = [];
                            } else {
                                buttons_array.push([{ text: curr_case[i].name, callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":1" + alt_integrative + ":D:" + curr_case[i].id }]);
                            }

                            if (tmp_line.length >= 3 || (i == (curr_case.length - 1) && tmp_line.length > 0)) {
                                buttons_array.push(tmp_line);
                                tmp_line = [];
                            }
                        }

                    }
                    if (page_n <= 6) {
                        page_n = 1;
                    } else if (page_n <= 9) {
                        page_n = 2;
                    } else {
                        page_n = 3;
                    }

                    buttons_array.push([
                        { text: "↩", callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":" + page_n + alt_integrative },
                    ]);
                }

            }

            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        }
    } //   

    return (to_return);
}

function paragraph_setChoiceEsit_message(user_id, inc_struct, paragraph_infos) {
    let message_txt;
    let to_return = {};

    if (!inc_struct.paragraphs_ids || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let buttons_array = [];

        if (paragraph_infos.father_id == 0) {
            message_txt = "*Woops...*\n\n";
            message_txt += "Non è possibile modificare il _tipo_ dell'inizio avventura.";
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else {
            message_txt = "⨓ *Esito Strada*\n";
            message_txt += "_paragrafo " + paragraph_infos.id + "_\n";
            if (paragraph_infos.esit_type == 0) {
                message_txt += "\n• Scegliendo un esito, termini il ramo dell'avventura con questo paragrafo.\n";
                if (paragraph_infos.choices.length > 0) {
                    //message_txt += "\n• Scegliendo una fine, positiva o negativa, " ;
                    if (paragraph_infos.choices.length == 1) {
                        message_txt += "\n• La strada che avevi impostato sarà disabilitata.\n";
                    } else {
                        message_txt += "\n• Le " + paragraph_infos.choices.length + " strade che avevi impostato saranno disabilitate.\n";
                    }
                }
                message_txt += "\n• Puoi modificare l'opzione a piacimento.\n";

                buttons_array.unshift([
                    { text: "🌚", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_IS_NEGATIVE:" },
                    { text: "🌝", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_IS_POSITIVE:" },
                ]);


            } else {
                message_txt += "\n• Il paragrafo porta attualmente ad una fine " + (paragraph_infos.esit_type == -1 ? "negativa." : "positiva.");
                if (paragraph_infos.choices.length > 0) {
                    message_txt += "\n• Aprendolo, riabiliterai ";
                    if (paragraph_infos.choices.length == 1) {
                        message_txt += "la strada che avevi impostato in precedenza.\n";
                    } else {
                        message_txt += "le " + paragraph_infos.choices.length + " strade che avevi impostato in precedenza.\n";
                    }
                }
                buttons_array.unshift([{ text: "🌍", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_IS_OPEN:" }]);
            }
            buttons_array.unshift([
                { text: "⨓", callback_data: ("B:TMP:PRGPH:SELECT:" + paragraph_infos.id) },
                { text: "⌥", callback_data: ("B:TMP:PRGPH:OPTIONS:" + paragraph_infos.id) },
                { text: "⨷", callback_data: "B:FORGET" }
            ]);

            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        }
    } //   

    return (to_return);
}

function paragraph_setChoiceEsit_confirm(user_id, query_text, inc_struct, to_parse_type) { // 0, -1, 1 (CONTINUE, NEGATIVE, POSITIVE)
    return new Promise(function (setChoiceType_res) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[1];
        let type = (to_parse_type == "CHOICE_IS_NEGATIVE" ? -1 : (to_parse_type == "CHOICE_IS_POSITIVE" ? 1 : 0))

        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return setChoiceType_res({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                if (loaded_paragraph_infos.esit == false) {
                    return setChoiceType_res(loaded_paragraph_infos);
                }
                return model.loadParagraph(user_id, loaded_paragraph_infos.father_id).then(function (father_paragraph_infos) {
                    if (father_paragraph_infos.esit == false) {
                        return setChoiceType_res(father_paragraph_infos);
                    }

                    loaded_paragraph_infos.esit_type = type;
                    for (let i = 0; i < father_paragraph_infos.choices.length; i++) {
                        if (father_paragraph_infos.choices[i].id == loaded_paragraph_infos.id) {
                            father_paragraph_infos.choices[i].esit_type = type;
                            break;
                        }
                    }

                    if (!('level_deep' in father_paragraph_infos)) {
                        if (inc_struct.paragraphs_ids[0] == father_paragraph_infos.id) {
                            father_paragraph_infos.level_deep = 0;
                        }
                    }
                    if (!('level_deep' in loaded_paragraph_infos) || loaded_paragraph_infos.level_deep == null) {
                        if (('level_deep' in father_paragraph_infos)) {
                            loaded_paragraph_infos.level_deep = father_paragraph_infos.level_deep + 1;
                        }
                    }

                    return model.updateParagraph(user_id, curr_paragraph_id, loaded_paragraph_infos).then(function (update_res) {
                        return model.updateParagraph(user_id, father_paragraph_infos.id, father_paragraph_infos).then(function (child_update_res) {
                            if (update_res.esit === false) {
                                return setChoiceType_res(update_res);
                            } else if (child_update_res.esit === false) {
                                return setChoiceType_res(child_update_res);
                            } else {
                                return setChoiceType_res({ paragraph_infos: loaded_paragraph_infos, new_esit: type }); // info per il padre
                            }
                        });
                    });
                });
            });
        }
    });
}

function paragraph_setChoiceAvailability_manager(user, in_query, options_array) {
    return new Promise(function (setAv_res) {
        return model.getUserDaft(user.id).then(function (inc_struct) {
            return model.loadParagraph(user.id, options_array[5]).then(function (paragraph_infos) {
                if (paragraph_infos.esit == false) {
                    return setAv_res(paragraph_infos);
                }
                return model.loadParagraph(user.id, paragraph_infos.father_id).then(function (father_paragraph_infos) {
                    if (father_paragraph_infos.esit == false) {
                        return setAv_res(father_paragraph_infos);
                    }

                    let curr_choice_index = -1;

                    for (let i = 0; i < father_paragraph_infos.choices.length; i++) {
                        if (father_paragraph_infos.choices[i].id == options_array[5]) {
                            curr_choice_index = i;
                        } else if (father_paragraph_infos.choices[i].title_text.toLowerCase() == paragraph_infos.choice_title.toLowerCase()) {
                            let cant_proceed = false;
                            if (options_array[4] == "NIGHT" && father_paragraph_infos.choices[i].availability == "NIGHT") {
                                cant_proceed = true;
                            } else if (options_array[4] != "NIGHT" && father_paragraph_infos.choices[i].availability != "NIGHT") {
                                cant_proceed = true;
                            }
                            if (cant_proceed == true) {
                                let message_text = "*Scelta non aggiornarnata*\n_testo ripetuto_\n\n";
                                let tmp_text = options_array[4] == "NIGHT" ? "notturna" : "diurna";
                                message_text += "• Se imposti anche questa scelta come " + tmp_text + ", diventerebbe indistinguibile dalla " + (i + 1) + "° (paragrafo `" + father_paragraph_infos.choices[i].id + "`)";
                                //message_text += "\n\n> `" + new_choice_text + "`\n";
                                let to_return = {};
                                to_return.toEdit = simpleMessage(message_text, user.id, [[{ text: "Scelte ⨓ " + father_paragraph_infos.id, callback_data: "B:TMP:PRGPH:SELECT:" + father_paragraph_infos.id }], [{ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]])
                                to_return.query = { id: in_query.id, options: { text: "⚠️\n\nScelta Ripetuta!", show_alert: true, cache_time: 4 } }
                                return setAv_res(to_return);
                            }
                        }
                    }

                    paragraph_infos.availability = options_array[4];
                    father_paragraph_infos.choices[curr_choice_index].availability = options_array[4];

                    father_paragraph_infos.choices.sort(function (a, b) {
                        if (a.title_text.toLowerCase() != b.title_text.toLowerCase()) {
                            if (a.availability == "ALL") {
                                return -1;
                            } else if (a.availability == "NIGHT") {
                                return 1;
                            } else if (b.availability == "ALL" || b.availability == "DAY") {
                                return 1;
                            } else {
                                return -1;
                            }
                        } else {
                            return 0;
                        }
                    });

                    return model.updateParagraph(user.id, paragraph_infos.id, paragraph_infos).then(function (update_res) {
                        return model.updateParagraph(user.id, father_paragraph_infos.id, father_paragraph_infos).then(function (father_update_res) {
                            if (update_res.esit === false) {
                                return setAv_res(update_res);
                            } else if (father_update_res.esit === false) {
                                return setAv_res(father_update_res);
                            } else {
                                let to_return = {};
                                to_return.toEdit = paragraph_setOptions_message(user.id, inc_struct, paragraph_infos).toSend;
                                let query_text;
                                if (options_array[4] == "DAY") {
                                    query_text = "☀️️\n\nScelta selezionabile solo di giorno";
                                } else if (options_array[4] == "NIGHT") {
                                    query_text = "🌙\n\nScelta selezionabile solo di notte";
                                } else {
                                    query_text = "☀️️ 🌙\n\nScelta selezionabile di giorno e di notte";
                                }
                                to_return.query = { id: in_query.id, options: { text: query_text, show_alert: true, cache_time: 4 } }
                                return setAv_res(to_return);
                            }
                        });
                    });
                });
            });
        });
    })
}

function paragraph_setIntermedieText_message(user_id, inc_struct, choice_index, paragraph_infos, inter_text) {
    let message_txt;
    let to_return = {};
    if (inter_text.charAt(0) == "\n") {
        inter_text = inter_text.substring(1)
    }
    if (paragraph_infos.esit == false || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Paragrafi ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]])
    } else if (paragraph_infos.choices.length <= 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che tu abbia già settato alcuna scelta per il paragrafo " + paragraph_infos.id + "...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]])
    } else if (inter_text.length == 0) {
        if (typeof choice_index == "undefined") {
            choice_index = 1;
        }
        message_txt = "*Testo Intermedio*\n\n";
        message_txt += "Sarà legato al testo del paragrafo destinazione.\n"
        message_txt += "\n• Completa il comando per cambiare il testo intermedio dato dalla scelta.\n";
        message_txt += "\nEsempio:\n• `/bardo p " + paragraph_infos.id + " strada " + choice_index + " intermedio \nSei ritornato…`";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (inter_text.length < 3) {
        message_txt = "*Woops!*\n_Testo intermedio troppo corto_\n\n";
        message_txt += "\"_" + inter_text + "_\"\n\n";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (inter_text.length > 160) {
        message_txt = "*Woops!*\n_Testo intermedio troppo lungo_\n\n";
        message_txt += "\"_" + inter_text + "_\"\n\n";
        message_txt += "• Il testo di un intermedio non può essere più lungo di 160 caratteri.\n(extra: +" + (inter_text.length - 160) + ")";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let buttons_array = [[{ text: "Paragrafo ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

        let actual_index = -1;
        let index_limit = 0;

        if (!isNaN(choice_index)) {
            choice_index = Math.abs(parseInt(choice_index));
            if (choice_index != 0) {
                choice_index--;
            }

            if (inc_struct.view_type != "ALL") {
                let temp_arr = paragraph_infos.choices.filter(function (el) {
                    if (inc_struct.view_type == "NIGHT") { return el.availability == "NIGHT"; }
                    else { return el.availability != "NIGHT" }
                });

                index_limit = temp_arr.length;
                for (let i = 0; i < paragraph_infos.choices.length; i++) {
                    if (paragraph_infos.choices[i].id == temp_arr[choice_index].id) {
                        actual_index = i;
                        break;
                    }
                }
            } else {
                index_limit = paragraph_infos.choices.length;
                actual_index = choice_index;
            }


        } else {
            index_limit = paragraph_infos.choices.length;
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                if (paragraph_infos.choices[i].id == choice_index.toUpperCase()) {
                    actual_index = i;
                    break;
                }
            }

        }

        let curr_choice = paragraph_infos.choices[actual_index];

        if (actual_index == -1 || actual_index >= index_limit) {
            message_txt = "*Woops*\n_indice scelta non valido!_\n\n";
            message_txt += "• Mi risulta ci " + (index_limit == 1 ? "sia" : "siano") + " solo " + index_limit;
            message_txt += simpleGenderFormatter((index_limit == 1), "scelt", "a", "e") + " nel paragrafo `" + paragraph_infos.id + "`";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (curr_choice.is_alternative != true) {
            message_txt = "*Woops*\n_indice scelta non valido!_\n\n";
            message_txt += "• Non mi risulta che la " + (actual_index + 1) + "° scelta del paragrafo " + paragraph_infos.id + " sia un'alternativa.";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else {
            message_txt = "*Intermedio alla " + (actual_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.id + "_\n";
            message_txt += "\n• Scelta: \"" + curr_choice.title_text + "\"";
            if (curr_choice.integrative_text != "") {
                message_txt += "\n• Testo precedente:\n· `" + curr_choice.integrative_text.split(">").join("") + "`\n";
            }
            message_txt += "\n> Nuovo intermedio:\n· `" + inter_text.charAt(0).toUpperCase() + inter_text.substring(1) + "`\n";

            buttons_array.unshift([{ text: "Conferma ✓", callback_data: "B:TMP:OPTION_CONFIRM:INTEGRATIVE_TEXT:" + curr_choice.id }])
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        }
    }

    return (to_return);
}

function paragraph_setIntermedieText_confirm(user_id, inc_struct, dest_id, query_message) {
    return new Promise(function (intermedieText_res) {
        let paragraph_id = query_message.split("\n")[1].split(" ")[2];
        return model.loadParagraph(user_id, paragraph_id).then(function (paragraph_infos) {
            if (paragraph_infos.esit == false) {
                return intermedieText_res(paragraph_infos)
            }
            let found = false;
            let new_integrative = query_message.substring(query_message.indexOf("> Nuovo intermedio:\n·") + 22, query_message.length);

            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                if (paragraph_infos.choices[i].id == dest_id) {
                    paragraph_infos.choices[i].integrative_text = new_integrative;
                    found = true;
                    break;
                }
            }
            if (!found) {
                return intermedieText_res({ esit: false, text: "Woops!\n\nNon mi risulta che il paragrafo " + paragraph_infos.id + " abbia un'alternativa settata verso " + dest_id });
            }
            return model.updateParagraph(user_id, paragraph_infos.id, paragraph_infos).then(function (update_res) {
                if (update_res.esit == false) {
                    return intermedieText_res(update_res)
                }
                return model.loadParagraph(user_id, dest_id).then(function (dest_infos) {
                    if (dest_infos.esit == false) {
                        return intermedieText_res(dest_infos)
                    }

                    let to_return = {};
                    to_return.toEdit = alternative_message(user_id, inc_struct, paragraph_infos, dest_infos);
                    to_return.query_text = "✅\n\nTesto intermedio Aggiornato";

                    //to_return.query = { id: in_query.id, options: { text: query_text, show_alert: true, cache_time: 4 } }

                    return intermedieText_res(to_return)
                });

            })
        });
    });
}


function paragraph_message(user, inc_struct, paragraph_infos) {
    let buttons_array = [];
    let is_first = (paragraph_infos.father_id == 0);
    let message_txt = "*" + inc_struct.title + "*\n";
    if (!is_first) {
        message_txt = "*\"" + paragraph_infos.choice_title + "\"*\n";
    }
    message_txt += "_paragrafo_ `" + paragraph_infos.id + "`\n";

    if (!('level_deep' in paragraph_infos)) {
        message_txt += "\n ⚠️ La struttura delle avventure è cambiata!\n";
        message_txt += "Partendo dalle scelte del primo paragrafo, cambia l'esito di tutte le scelte inserite fin'ora\n(ed una seconda volta per tornare all'impostazione attuale, nessun dato verrà perso)\n\n";
    } else if (!is_first) {
        message_txt += "\n• " + (paragraph_infos.level_deep) + "° scelta";
    } else {
        message_txt += "\n• Inizio avventura";
    }

    let insert_text = "";
    if (typeof paragraph_infos.excluded != "undefined" && paragraph_infos.excluded.length > 0) {
        insert_text += "• Nascosta a: " + paragraph_infos.excluded.join(", ") + "\n";
    } else if (typeof paragraph_infos.exclusive != "undefined" && paragraph_infos.exclusive.length > 0) {
        insert_text += "• Stato richiesto: " + paragraph_infos.exclusive.join(", ") + "\n";
    }

    // Paragrafo
    if (paragraph_infos.availability == "ALL") {
        let has_nigth = paragraph_infos.night_text != "";
        if (inc_struct.view_type != "NIGHT") {
            message_txt += ((has_nigth) ? "\n" + insert_text + "\nVariante Diurna ☀️️" : ", Testo Unico ⭐\n" + insert_text);

            // if (inc_struct.view_type == "ALL") {
            //     message_txt += ((has_nigth) ? "\n" + insert_text + "\nVariante Diurna ☀️️" : ", Testo Unico ⭐\n" + insert_text);
            // } else {
            //     message_txt += ", Variante Diurna ☀️️\n" + insert_text;
            // }

            if (paragraph_infos.text == "") {
                if (has_nigth) {
                    message_txt += "\n_Non hai ancora impostato il testo del paragrafo per la variante diurna..._\n";
                } else {
                    if (!is_first) {
                        message_txt += "\n_Non hai ancora impostato il testo di questo paragrafo. Usa il tempo presente per la narrazione._\n";
                    } else {
                        message_txt += "\n_Non hai ancora impostato il testo del primo paragrafo..._\n";
                    }
                }
            } else {
                message_txt += "\n_" + paragraph_infos.text + "_\n"
            }

            if (has_nigth && inc_struct.view_type == "ALL") {
                message_txt += "\nVariante Notturna 🌙";
                message_txt += "\n_" + paragraph_infos.night_text + "_\n"
            }
        } else {
            message_txt += ", Variante Notturna 🌙\n" + insert_text;
            if (has_nigth) {
                message_txt += "\n_" + paragraph_infos.night_text + "_\n"
            } else {
                message_txt += "\n_Non hai ancora impostato il testo del paragrafo per la variante notturna..._\n";

            }
        }

    } else {
        message_txt += ", solo ";
        if (paragraph_infos.availability == "DAY") {
            message_txt += "di Giorno ☀️️\n";
        } else {
            message_txt += "di Notte 🌙\n";
        }
        message_txt += insert_text;
        if (paragraph_infos.text == "") {
            if (paragraph_infos.availability == "DAY") {
                message_txt += "\n_La scelta che porta a questo paragrafo sarà selezionabile solo di giorno, usa il tempo presente per la narrazione._\n";
            } else {
                message_txt += "\n_La scelta che porta a questo paragrafo sarà selezionabile solo di notte, dalle 23:00 alle 05:00. Usa il tempo presente per la narrazione_\n";
            }
        } else {
            message_txt += "\n_" + paragraph_infos.text + "_\n"
        }
    }

    if (typeof paragraph_infos.become == "string" && paragraph_infos.become.length > 0) {
        message_txt += "\n• La scelta ";
        if (paragraph_infos.become == "🤤") {
            message_txt += "intossica ";
        } else if (paragraph_infos.become == "🥴") {
            message_txt += "confonde ";
        } else if (paragraph_infos.become == "😴") {
            message_txt += "addormenta ";
        } else if (paragraph_infos.become == "😨") {
            message_txt += "spaventa ";
        } else if (paragraph_infos.become == "🙂") {
            message_txt += "fa tornare a condizioni normali ";
        } else if (paragraph_infos.become == "😤") { //
            message_txt += "fomenta ";
        }
        message_txt += "il giocatore\n";
    }


    if (false) {
        if ((inc_struct.view_type == "NIGHT")) {
            if (typeof paragraph_infos.night_text != "string" || paragraph_infos.night_text.length < 10) {
                message_txt += "\n⚠️ Aggiungi un testo notturno con:\n· `/bardo notturno `…\n";
            }
        } else if (paragraph_infos.text.length < 10) {
            message_txt += "\n⚠️ Aggiungi un testo con:\n· `/bardo `…\n";
        }
    }
    // prima linea bottoni
    if (is_first) {
        buttons_array.push([
            { text: "📜 ", callback_data: "B:TMP:EDIT" },
            { text: "⌘", callback_data: ("B:TMP:PRGPH:CMDS:" + paragraph_infos.id) }
        ]);
    } else {
        let firstLine_buttons = [{ text: "↩", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.father_id }];

        // option
        firstLine_buttons.push({ text: "⌥", callback_data: ("B:TMP:PRGPH:OPTIONS:" + paragraph_infos.id) });
        firstLine_buttons.push({ text: "⌘", callback_data: ("B:TMP:PRGPH:CMDS:" + paragraph_infos.id) }); // ⌨
        firstLine_buttons.push({ text: "⌨", callback_data: ("B:TMP:PRGPH:KEYBOARD:" + paragraph_infos.id) }); // 

        firstLine_buttons.push({ text: "⌫", callback_data: 'B:TMP:PRGPH:DELETE:' + paragraph_infos.id });

        buttons_array.push(firstLine_buttons);
    }

    // Strade/Scelte
    if (paragraph_infos.esit_type == 0) {
        let counters = { all: 0, day: 0, night: 0 };

        for (let i = 0; i < paragraph_infos.choices.length; i++) { // Scelte
            if (paragraph_infos.choices[i].is_alternative != true) {
                if (paragraph_infos.choices[i].availability == "NIGHT") {
                    counters.night++;
                } else if (paragraph_infos.choices[i].availability == "DAY") {
                    counters.day++;
                } else {
                    counters.all++;
                }
            }

            if (paragraph_infos.choices[i].availability == "ALL" || (inc_struct.view_type == "ALL") || (paragraph_infos.choices[i].availability == inc_struct.view_type)) {
                let tmp_text = "";
                let this_callback = "";

                if (paragraph_infos.choices[i].is_alternative == true) {
                    this_callback = 'B:TMP:ALTERNATIVE:SELECT:' + paragraph_infos.id + ":DEST:" + paragraph_infos.choices[i].id;
                    tmp_text += "🔀 ";
                } else {
                    this_callback = 'B:TMP:PRGPH:SELECT:' + paragraph_infos.choices[i].id;
                    if (inc_struct.view_type == "ALL") {
                        tmp_text += paragraph_infos.choices[i].availability == "NIGHT" ? "🌙 " : (paragraph_infos.choices[i].availability == "DAY" ? "☀️️ " : "");
                    } else {
                        tmp_text += (paragraph_infos.choices[i].availability == "ALL" ? "⭐ " : "");
                    }
                }

                let special_counter = 0;
                if (typeof paragraph_infos.choices[i].excluded != "undefined") {
                    special_counter += paragraph_infos.choices[i].excluded.length;
                }
                if (typeof paragraph_infos.choices[i].exclusive != "undefined") {
                    special_counter += paragraph_infos.choices[i].exclusive.length;
                }
                if (special_counter > 0) {
                    tmp_text = "👁‍🗨 " + tmp_text;
                }
                tmp_text += paragraph_infos.choices[i].title_text + " (" + paragraph_infos.choices[i].delay + "min)";
                tmp_text += (paragraph_infos.choices[i].is_alternative == true ? "" : (paragraph_infos.choices[i].esit_type != 0 ? " ☠" : ""));
                buttons_array.push([{ text: tmp_text, callback_data: this_callback }]);
            }
        }

        let valid_count = 0;
        let minimum = is_first == false ? 2 : (paragraph_infos.availability == "NIGHT" ? 2 : 3);

        if ((paragraph_infos.availability == "NIGHT")) {
            valid_count = counters.all + counters.night;
        } else {
            valid_count = (counters.all + counters.day);
        }

        if (inc_struct.title != "La mia 1° storia") {
            if ((valid_count) < minimum) {
                //message_txt += "\n⚠️ ⨓  Strade mancanti: " + (3-(valid_count))+"\n";
                if ((valid_count) == 0) {
                    message_txt += "\n⚠️ Aggiungi almeno " + minimum + " strade";
                } else if ((minimum - valid_count) == 1) {
                    message_txt += "\n⚠️ Aggiungi ancora almeno una strada";
                } else {
                    message_txt += "\n⚠️ Aggiungi altre " + (minimum - (valid_count)) + " strade";
                }
                if (!is_first) {
                    message_txt += " o segnala come _fine avventura_.";
                } else {
                    message_txt += ".";
                }
            } else {
                message_txt += "\n☑ Strade sufficenti:\n";
                message_txt += "• Solo notturne: " + counters.night + "\n";
                message_txt += "• Altre: " + (counters.all + counters.day) + "\n";
            }
        }
    } else { // Fine
        message_txt += "\n☠\nFine " + (paragraph_infos.esit_type == -1 ? "negativa" : "positiva") + "\n";
        message_txt = (paragraph_infos.esit_type == -1 ? "🌚 " : "🌝 ") + message_txt;
    }

    buttons_array.push([{ text: "⨷", callback_data: "B:FORGET" }]);

    return simpleMessage(message_txt, user.id, buttons_array);
}

function alternative_message(user_id, inc_struct, paragraph_infos, des_infos) {
    let buttons_array = [];
    let is_same = (des_infos == false);
    if (is_same) {
        des_infos = paragraph_infos;
    }
    let dest_is_first = (des_infos.father_id == 0);

    let curr_alternative = null;
    for (let i = 0; i < paragraph_infos.choices.length; i++) {
        if (paragraph_infos.choices[i].id == des_infos.id) {
            curr_alternative = paragraph_infos.choices[i];
            break;
        }
    }
    let message_txt = "";


    if (curr_alternative == null) {
        message_txt = "Woops!\n\n";
        message_txt = "Questo messaggio sembra obsoleto...";
    } else {
        if (!is_same) {
            message_txt = "🔀 *\"" + curr_alternative.title_text + "\"*\n";
            message_txt += "_alternativa in " + paragraph_infos.id + "_\n\n";

            if (curr_alternative.integrative_text != "") {
                message_txt += "_" + curr_alternative.integrative_text + "_";
            } else {
                message_txt += "_Un testo intermedio verrà stampato subito sopra a quello del paragrafo destinazione_";
            }

            if (des_infos.text != "") {
                message_txt += "\n_" + des_infos.text + "_\n\n"
            } else if (curr_alternative.integrative_text == "") {
                message_txt += "_, che non hai ancora impostato._\n\n"
            } else {
                message_txt += "\n/.../_ seguirà il testo del paragrafo destinazione_\n\n"
            }


            if (!dest_is_first) {
                message_txt += "• Destinazione: \"" + des_infos.choice_title + "\" (" + paragraph_infos.level_deep + "° scelte)\n";
            } else {
                message_txt += "• Riporta al primo paragrafo\n";
            }
        } else {
            message_txt = "🔁 *\"" + curr_alternative.title_text + "\"*\n";
            message_txt += "_vicolo cieco di " + paragraph_infos.id + "_\n\n";

            if (curr_alternative.integrative_text != "") {
                message_txt += "_" + curr_alternative.integrative_text + "_\n";
            } else {
                message_txt += "_Dopo " + curr_alternative.delay + " minuti, il giocatore tornerà al paragrafo, che sarà preceduto da un testo intermedio_";
            }
            if (des_infos.text != "") {
                message_txt += "\n_" + des_infos.text + "_\n\n"
            } else {
                message_txt += "_, che non hai ancora impostato._\n\n"
            }

        }
        if (typeof curr_alternative.become == "string" && curr_alternative.become.length > 0) {
            message_txt += "\n• La scelta ";
            if (curr_alternative.become == "🤤") {
                message_txt += "intossica ";
            } else if (curr_alternative.become == "🥴") {
                message_txt += "confonde ";
            } else if (curr_alternative.become == "😴") {
                message_txt += "addormenta ";
            } else if (curr_alternative.become == "😨") {
                message_txt += "spaventa ";
            } else if (curr_alternative.become == "🙂") {
                message_txt += "fa tornare a condizioni normali ";
            } else if (curr_alternative.become == "😤") { //
                message_txt += "fomenta ";
            }
            message_txt += "il giocatore\n";
        }
        if (typeof curr_alternative.exclusive != "undefined" && curr_alternative.exclusive.length > 0) {
            message_txt += "• Stato richiesto: " + curr_alternative.exclusive.join(", ") + "\n";
        } else if (typeof curr_alternative.excluded != "undefined" && curr_alternative.excluded.length > 0) {
            message_txt += "• Nascosta a: " + curr_alternative.excluded.join(", ") + "\n";
        }


        let firstLine_buttons = [{ text: "↩", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.id }];
        if (!is_same) {
            firstLine_buttons.push({ text: "⌖", callback_data: "B:TMP:PRGPH:SELECT:" + des_infos.id });
        }

        firstLine_buttons.push({ text: "⌘", callback_data: ("B:TMP:ALTERNATIVE:CMDS:" + curr_alternative.id) });
        firstLine_buttons.push({ text: "⌫", callback_data: 'B:TMP:ALTERNATIVE:DELETE:' + curr_alternative.id });

        buttons_array.push(firstLine_buttons);

        if (curr_alternative.availability == "DAY") {
            message_txt += "• Visibile: di Giorno ☀️️\n";
            buttons_array.push([
                { text: "⭐", callback_data: 'B:TMP:ALTERNATIVE:SET_AVAILABILITY:ALL:' + curr_alternative.id },
                { text: "🌙", callback_data: 'B:TMP:ALTERNATIVE:SET_AVAILABILITY:NIGHT:' + curr_alternative.id }
            ]);
        } else if (curr_alternative.availability == "NIGHT") {
            message_txt += "• Visibile: di Notte 🌙\n";

            buttons_array.push([
                { text: "⭐", callback_data: 'B:TMP:ALTERNATIVE:SET_AVAILABILITY:ALL:' + curr_alternative.id },
                { text: "☀️️", callback_data: 'B:TMP:ALTERNATIVE:SET_AVAILABILITY:DAY:' + curr_alternative.id }
            ]);
        } else {
            message_txt += "• Visibile: Sempre ⭐️\n";
            buttons_array.push([
                { text: "☀️️️", callback_data: 'B:TMP:ALTERNATIVE:SET_AVAILABILITY:DAY:' + curr_alternative.id },
                { text: "🌙", callback_data: 'B:TMP:ALTERNATIVE:SET_AVAILABILITY:NIGHT:' + curr_alternative.id }
            ]);
        }
        buttons_array[(buttons_array.length - 1)].push(
            { text: "❤️", callback_data: 'B:TMP:PRGPH:CH_STATUS:' + paragraph_infos.id + ":0:ALT:" + curr_alternative.id },
            { text: "📦", callback_data: 'B:TMP:PRGPH:ITEM:' + paragraph_infos.id + ":0:ALT:" + curr_alternative.id }
        );

    }


    buttons_array.push([{ text: "⨷", callback_data: "B:FORGET" }]);
    return simpleMessage(message_txt, user_id, buttons_array);
}

// ACCESSORIE

function checkUnaviableChars(message_txt) {
    if (typeof message_txt == "undefined") {
        return false;
    }
    let splitted = message_txt.split("");
    let unaviable_char = ["_", "*", "`"];
    for (let i = 0; i < message_txt.length; i++) {// si potrebbe usare una semplice indexOf per tutti e tre, ma consumererebbe più cpu
        if (unaviable_char.indexOf(splitted[i]) >= 0) {
            return true;
        }
    }
    return false;
}

function checkParagraphID(check_id) {
    if (typeof check_id == "undefined") {
        return false;
    }
    if (check_id.length != 4) {
        return false;
    } else {
        let tocheck_id = check_id.toUpperCase();
        if (isNaN(tocheck_id.charAt(0)) || isNaN(tocheck_id.charAt(1))) {
            return false;
        } else {
            let idPossible_chars = "ABCDEFGHIJKLMNOPQRSTQVXYWZ";
            if (idPossible_chars.indexOf(tocheck_id.charAt(2)) < 0 || idPossible_chars.indexOf(tocheck_id.charAt(3)) < 0) {
                return false;
            }
            return true;
        }
    }
}

function intIn(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //max è escluso, min incluso
}

function vocals_start(name) {
    let vocals = ["A", "E", "I", "O", "U"];

    if (vocals.indexOf(name.charAt(0).toUpperCase()) >= 0) {
        return true;
    }
    return false;
}

function generateSimpleAlias() {
    let vocals = ["a", "e", "i", "o", "u"];
    let consonant = ["b", "c", "d", "f", "g", "l", "m", "n", "p", "r", "s", "t", "v"];

    let name = "";
    if (intIn(0, 2) == 1) {
        let ending = ["mith", "nx", "z", "go", "th"];
        name = vocals[intIn(0, 4)].toUpperCase() + consonant[intIn(0, 12)] + vocals[intIn(0, 4)] + ending[intIn(0, 4)];
    } else {
        let ending = ["x", "h", "z", "an", "gin"];
        name = consonant[intIn(0, 12)].toUpperCase() + vocals[intIn(0, 4)] + consonant[intIn(0, 12)] + vocals[intIn(0, 4)] + consonant[intIn(0, 12)] + ending[intIn(0, 4)];
    }
    return name;
}

function getItem(item_ids, type) {
    let to_use = []
    if (type == 0) {
        to_use = all_items.base;
    } else {
        to_use = all_items.creabili;
    }

    let to_return = [];
    for (let i = 0; i < to_use.length; i++) {
        if (item_ids.indexOf(to_use[i].id) >= 0) {
            to_return.push(to_use[i]);
        }
        if (to_return.length == item_ids.length) {
            break;
        }
    }
    return to_return;
}

function foundItem_message(items) {
    let message_text = "\nHai trovato:\n";

    for (let i = 0; i < items.length; i++) {
        if (items[i].type == "B2") {
            message_text += "• Un po' " + (vocals_start(items[i].name) ? "d'" : "di ") + items[i].name + " (" + items[i].quantity + ")\n";
        } else if (items[i].id == 12) {
            message_text += "• Una " + items[i].name + "\n";
        } else if (items[i].type.charAt(0) == "B") {
            message_text += "• Un pezzo " + (vocals_start(items[i].name) ? "d'" : "di ") + items[i].name + "\n";
        } else {
            let partial_name = items[i].name.split(" ")[0]
            let is_male = partial_name.charAt((partial_name.length - 1)) == "o";
            message_text += "• " + (!is_male ? "Una " : (items[i].name.indexOf("Sc") == 0 ? "Uno " : "Un ")) + items[i].name + "\n";
        }

    }
    return message_text;
}

function simpleGenderFormatter(is_male, prefix, male_suffix, female_suffix) {

    return (is_male ? prefix + male_suffix : (female_suffix ? prefix + female_suffix : prefix + "a"));
}

function simpleMessage(text, id, buttons_array) {
    let to_return = {
        chat_id: id,
        message_txt: text,
        options: {
            parse_mode: "Markdown",
            disable_web_page_preview: true
        }
    };

    if ((buttons_array instanceof Array)) {
        to_return.options.reply_markup = { inline_keyboard: buttons_array };
    }
    return to_return;
}

function newMarkup(in_query, buttons_array) {
    return { // simpleMessage(in_query.message.text, in_query.message.chat.id);
        query_id: in_query.inline_message_id,
        message_id: in_query.message.message_id,
        chat_id: in_query.message.chat.id,
        reply_markup: {inline_keyboard: buttons_array }
    }

}

// :) 