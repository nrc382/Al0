/*
Crea ed avvia incarichi (avventure del bardo)
Il modulo è richiamato con /bardo (creazione, gestione, avvio) e callback che iniziano per "B:"
*/
const model = require("./incarichiModel");
let all_items = {};
let manutenzione = true;

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
    return new Promise(async function (messageManager_res) {
        if (manutenzione && message.from.id != 16964514) {
            let presents = ["🍪", "🥠", "🥐", "🍕", "🍌", "🌰", "🍭", "🥦"];
            let message_text = "🤖*Manutenzione Straordinaria*\n\n";
            message_text += "Il modulo è temporaneamente disabilitato...\n";
            message_text += "> Ecco: " + presents[intIn(presents.length - 1)];
            return messageManager_res({ toSend: simpleMessage(message_text, message.from.id) });
        }
        const db_infos = await model.getInfos(message.from.id);
        if (db_infos == false) {
            return messageManager_res({
                toSend: simpleMessage("*Woops*\n\nAl momento non riesco a gestire nuove richieste...", message.from.id)
            });
        } else {
            let words_array = message.text.toLowerCase().split("\n").join(" ").split(" "); // andrà fatto un trim su tutti gli elementi…

            if (db_infos.user_infos.length == 0) { // da registrare
                return messageManager_res(set_aliasManager(message.from.id, words_array));
            } else { // registrati
                let user = new model.User(db_infos.user_infos, db_infos.personals);
                console.log("> Messaggio da " + user.alias);

                let paragraph_array = message.text.substring(words_array[0].length).trim().split("\n");

                let comands = [];
                let text_array = [];

                let paragraph_bool = false;

                // CMDS parser: divide il testo dai comandi partendo da paragraph_array
                // [TESTO, NOTTURNO, VARIANTE (P_ID?, STATE?), STRADA (1?, ATTESA?+1?, INTERMEDIO?), ALTERNATIVA, INTERMEDIO, LISTA (STR?, ALT?), PARAGRAFO]
                for (let i = 0; i < paragraph_array.length; i++) {
                    let tmp_line = paragraph_array[i].trim().split(" ");

                    for (let j = 0; j < tmp_line.length; j++) {
                        tmp_line[j] = tmp_line[j].trim();
                        if (tmp_line[j].charAt(0) == "#") {
                            let tmp_cmd = tmp_line[j].toLowerCase().trim().substring(1);
                            if (tmp_cmd.length > 0) {
                                if (tmp_cmd == "integra") {
                                    comands.push("INTEGRA");
                                    paragraph_bool = true;
                                } else if (tmp_cmd == "t" || tmp_cmd == "testo") {
                                    paragraph_bool = true;
                                    comands.push("TESTO");
                                } else if (tmp_cmd == "nt" || tmp_cmd == "notturno") {
                                    paragraph_bool = true;
                                    comands.push("NOTTURNO");
                                } else if (tmp_cmd == "v" || tmp_cmd == "variante") {
                                    comands.push("VARIANTE");
                                    paragraph_bool = true;
                                } else if (tmp_cmd == "n" || tmp_cmd == "nuovo" || tmp_cmd == "nuova") {
                                    comands.push("NUOVA");
                                    paragraph_bool = true;
                                } else if (tmp_cmd == "s" || tmp_cmd == "strada" || tmp_cmd == "scelta") {
                                    paragraph_bool = true;
                                    comands.push("STRADA");
                                } else if (tmp_cmd == "a" || tmp_cmd == "attesa") {
                                    comands.push("ATTESA");
                                    paragraph_bool = true;

                                    let parsed_index = parseInt(tmp_line[j + 1]);
                                    if (!isNaN(parsed_index)) {
                                        comands.push(Math.abs(parsed_index));
                                        j++;
                                    }
                                } else if (tmp_cmd == "na" || tmp_cmd == "alternativa") {
                                    comands.push("ALTERNATIVA");
                                    paragraph_bool = true;
                                } else if (tmp_cmd == "i" || tmp_cmd == "intermedio") {
                                    comands.push("INTERMEDIO");
                                    paragraph_bool = true;
                                } else if (tmp_cmd == "varianti") {
                                    comands.push("LISTA", "VAR");
                                    paragraph_bool = true;
                                } else if (tmp_cmd == "alternative") {
                                    comands.push("LISTA", "ALT");
                                    paragraph_bool = true;
                                } else if (tmp_cmd == "strade" || tmp_cmd == "scelte") {
                                    comands.push("LISTA", "STR");
                                    paragraph_bool = true;
                                } else if (tmp_cmd.indexOf("parag") == 0) { // TODO
                                    comands.push("LISTA", "PARAGRAFO");
                                    paragraph_bool = true;
                                } else if (tmp_cmd == "l" || tmp_cmd == "lista" || tmp_cmd == "liste" || tmp_cmd == "indice") {
                                    comands.push("LISTA");
                                } else {
                                    comands.push(tmp_cmd);
                                }
                            }
                        } else if (tmp_line[j] != " " && tmp_line[j].length > 0) {
                            text_array.push(tmp_line[j]);
                        }
                    }

                    if ((i < (paragraph_array.length - 1))) {
                        text_array.push("\n");
                    }
                }

                let pure_text = text_array.join(" ").split("\n ").join("\n").trim();
                if (text_array.length <= 1 && typeof message.reply_to_message != "undefined" && message.reply_to_message.from.is_bot == false) {
                    pure_text = message.reply_to_message.text;
                }

                if (comands.length == 0 && pure_text != "") {
                    let tmp_array = pure_text.split(" ");

                    if (tmp_array.length == 1) {
                        let first_word = tmp_array[0].toLowerCase();

                        if ("paragrafo".indexOf(first_word) >= 0) {
                            comands.push("PARAGRAFO");
                            paragraph_bool = true;
                        } else if ("notturno".indexOf(first_word) >= 0) {
                            comands.push("NOTTURNO");
                            paragraph_bool = true;
                        } else if ("integra".indexOf(first_word) >= 0) {
                            comands.push("INTEGRA");
                            paragraph_bool = true;
                        } else if ("strada".indexOf(first_word) >= 0) {
                            comands.push("STRADA");
                            paragraph_bool = true;
                        } else if ("attesa".indexOf(first_word) >= 0) {
                            comands.push("ATTESA");
                            paragraph_bool = true;
                        } else if ("intermedio".indexOf(first_word) >= 0) {
                            comands.push("INTERMEDIO");
                            paragraph_bool = true;
                        } else if ("alternativa".indexOf(first_word) >= 0) {
                            comands.push("ALTERNATIVA");
                            paragraph_bool = true;
                        } else if ("variante".indexOf(first_word) >= 0) {
                            comands.push("VARIANTE");
                            paragraph_bool = true;
                        } else if ("nuov".indexOf(first_word) >= 0) {
                            comands.push("NUOVA");
                            paragraph_bool = true;
                        }


                        if (paragraph_bool == true) {
                            text_array = [];
                        }
                    } else {
                        comands.push("TESTO");
                        paragraph_bool = true;

                    }

                }

                console.log("input: " + words_array.join(" "));
                console.log("Comandi: " + comands.join(":"));
                console.log("text_array: " + text_array.length);
                console.log(text_array);

                // ***********
                let to_return = { toDelete: { chat_id: message.chat.id, mess_id: message.message_id } };

                if (comands.length <= 0) {
                    text_array = pure_text.split(" ");


                    if (pure_text.length <= 0 || text_array.length <= 0) {
                        to_return = mainMenu(db_infos, message.from.id);
                    } else if (checkParagraphID(text_array[0])) {
                        let p_id = text_array[0];

                        return model.getUserDaft(user.id).then(function (inc_struct) {
                            if (inc_struct === false) {
                                let message_text = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                                return messageManager_res({ toSend: simpleMessage(message_text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                            }
                            return model.loadParagraph(user.id, p_id).then(function (paragraph_infos) {
                                if (paragraph_infos.esit == false) {
                                    console.log("Son qui");
                                    to_return.toSend = selectParagraph(user, inc_struct, 0).toSend;
                                } else {
                                    to_return.toSend = paragraph_message(user, inc_struct, paragraph_infos);
                                }
                                return messageManager_res(to_return);
                            });
                        });
                    } else {
                        console.log("'" + text_array[0] + "'");
                        to_return = incarichi_Cmds_message(user);
                    }

                } else {
                    let visualizzazione_bool = false;
                    if (words_array.length > 1) {
                        let visualizzazione_triggers = ["vn", "vd", "vc", "visuale", "notturna", "diurna", "completa"];
                        visualizzazione_bool = (visualizzazione_triggers.indexOf(words_array[1].split("#").join("")) >= 0);
                    }


                    if (visualizzazione_bool == true) {
                        return aggiornaVisualizzazione(words_array, user).then(function (res) {
                            to_return.toSend = res;
                            return messageManager_res(to_return);
                        });
                    } else if (paragraph_bool == true) { // PARAGRAFI (TMP)
                        to_return = await paragraphMainManager(user, pure_text, comands, to_return.toDelete);
                    } else {
                        if (comands[0] == "intro") {
                            to_return.toSend = incarichi_AuthorInfos_message(inc_struct, user, 0).toSend;
                        } else if (comands[0] == "tipo") {
                            to_return.toSend = set_adventureType_message(user);
                        } else if (comands[0] == "bozza") { // return
                            const inc_struct = await model.getUserDaft(user.id);
                            if (inc_struct.esit == false) {
                                let message_text_1 = "📜 *Avventure dei Bardi di Lootia*\n\nNon mi risulta tu abbia una bozza aperta...\nVuoi crearne una nuova?\n";
                                to_return.toSend = simpleMessage(message_text_1, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]]);
                            } else {
                                to_return.toSend = daft_message(user, inc_struct).toSend;
                            }
                        } else if (comands[0] == "titolo") {
                            const inc_struct = await model.getUserDaft(user.id);
                            const paragraph_infos = await model.loadParagraph(user.id, user.has_pending);

                            if (inc_struct === false) {
                                let message_text = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                                to_return.toSend = simpleMessage(message_text, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }], [{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
                            } else {
                                to_return.toSend = set_adventureTitle_message(inc_struct, paragraph_infos, user, pure_text).toSend;
                            }

                        } else if (comands[0] == "info") {
                            to_return.toSend = adventures_DevInfos_message(user).toSend;
                        } else if (comands[0] == "LISTA") {
                            const inc_struct = await model.getUserDaft(user.id);

                            if (inc_struct === false) {
                                let message_text = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                                to_return.toSend = simpleMessage(message_text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
                            } else {
                                to_return.toSend = selectParagraph(user, inc_struct, 0).toSend;
                            }
                        } else if (comands[0].indexOf("desc") == 0) {
                            to_return.toSend = set_adventureDesc_message(user, pure_text);
                        } else if (user.has_pending != "-1") {
                            if (checkParagraphID(comands[0])) {
                                const inc_struct = await model.getUserDaft(user.id);

                                if (inc_struct === false) {
                                    let message_text = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                                    to_return.toSend = simpleMessage(message_text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
                                } else {
                                    const paragraph_infos = await model.loadParagraph(user.id, user.has_pending);
                                    if (paragraph_infos.esit == false) {
                                        to_return.toSend = selectParagraph(user, inc_struct, 0).toSend;
                                    } else {
                                        to_return.toSend = paragraph_message(user, inc_struct, paragraph_infos);
                                    }
                                }
                            } else {
                                to_return.toSend = incarichi_Cmds_message(user).toSend;
                            }
                        } else {
                            to_return = mainMenu(db_infos, message.from.id);
                        }
                    }
                }

                return messageManager_res(to_return);
            }

        }
    });
}

// QUERY MANAGER
module.exports.queryManager = function queryManager(query) {
    return new Promise(function (queryManager_res) {
        if (manutenzione && query.from.id != 16964514) {
            let presents = ["🍪", "🥠", "🥐", "🍕", "🍌", "🌰", "🍭", "🥦"];

            return queryManager_res({
                query: { id: query.id, options: { text: "🤖\nManutenzione Straordinaria\n\nIl modulo è temporaneamente disabilitato\n" + presents[intIn(presents.length - 1)], cache_time: 4, show_alert: true } },
            });
        }
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
            } else if (question.length <= 1) {
                let to_return = mainMenu(inc_res, query.from.id).toSend;
                to_return.mess_id = query.message.message_id;
                return queryManager_res({
                    query: { id: query.id, options: { text: "📜 Avventure dei Bardi di Lootia", cache_time: 4 } }, // 
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

async function aggiornaVisualizzazione(splitted_text, user) {
    let lowercase_text = splitted_text.slice(1).join(" ").split("#").join("");
    let new_tipe = "ALL";
    let icon = "⭐";

    if (lowercase_text == "vn" || lowercase_text == "visuale notturna") {
        new_tipe = "NIGHT";
        icon = "🌙";
    } else if (lowercase_text == "vd" || lowercase_text == "visuale diurna") {
        new_tipe = "DAY";
        icon = "☀️";
    }
    const edit_res = await model.editUserDaft(user.id, "VIEW_TYPE", new_tipe);
    let res_mess = " *Visualizzazione Bozza*\n\n";
    if (edit_res.esit === false) {
        res_mess = "❌" + res_mess + "• Non è stato possibie aggiornare il database :(";
    } else {
        res_mess = icon + res_mess + "• Opzione aggiornata!";
    }
    return simpleMessage(res_mess, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
}

// MAIN MANAGERS
function mainMenu(curr_infos, from_id) { //
    //let message_text = "";
    if (curr_infos.user_infos.length == 0) {
        return (newUserMessage(from_id));
    } else { // UTENTE REGISTRATO
        let message_text = "📜 *Avventure dei Bardi di Lootia*\n\n";
        let buttons_array = [];
        if (curr_infos.incarichi.length <= 0) {
            message_text += "Non c'è ancora alcun'avventura da seguire. Sii tu a proporre la prima!\n";
        } else if (curr_infos.incarichi.length == 1) {
            message_text += "C'è una sola avventura da seguire, " + curr_infos.incarichi[0].TITLE + "(" + curr_infos.incarichi[0].DIFFICULTY + ")\n";
            buttons_array.push([{ text: curr_infos.incarichi[0].TITLE, callback_data: 'B:START_ADVENTURE:' + curr_infos.incarichi[0].ID }]);
        } else {
            message_text += "Ci sono ";
            if (curr_infos.incarichi.length <= 5) {
                message_text += "appena ";
            }
            message_text += curr_infos.incarichi.length + " avventure da seguire, le trovi nella bacheca.\n";
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
        let to_return = simpleMessage(message_text, from_id, buttons_array);

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
                user.role_string = "Aspirante " + (user.gender == "M" ? "Strillone" : "Strillona");
                message_text = "♙ " + message_text + "*\n_" + user.role_string;
            } else if (user.b_point <= 10) {
                user.role_string = (user.gender == "M" ? "Strillone" : "Strillona") + " di Lootia";
                message_text = "♟" + message_text + "*\n_" + user.role_string;
            } else if (user.b_point <= 15) {
                user.role_string = "Vate di Lootia";
                message_text = "♝" + message_text + "*\n_" + user.role_string;
            } else if (user.b_point <= 25) {
                user.role_string = "Cantastorie di Lootia";
                message_text = "♞" + message_text + "*\n_" + user.role_string;
            } else if (user.b_point <= 50) {
                user.role_string = (user.gender == "M" ? "Lirico" : "Lirica") + " di Lootia";
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
            } else if (options == "") {
                let res = rifugio_message(user, main_infos, message_text);
                return mainUserMenu({ esit: true, toSend: res, user_infos: user });
            } else if (options == "MANAGE_CELL") {
                return mainUserMenu({ esit: true, toSend: simpleMessage("Gestione rifugio...", user.id), user_infos: user });
            } else if (options == "MANAGE_BAG") {
                return mainUserMenu({ esit: true, toSend: simpleMessage("Gestione sacca...", user.id), user_infos: user });
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

function rifugio_message(user, main_infos, title_text) {
    let res_text = `${title_text}${main_infos.state}`;
    let buttons_array = [];
    let isMale = user.gender == "M" ? true : false;
    switch (main_infos.state) {
        case "🤤": {
            res_text += "_Sei " + simpleGenderFormatter(isMale, "intorpidit", "o") + ", " + simpleGenderFormatter(isMale, "disorientat", "o") + "... qualche cosa deve averti intossicato!_\n";
            break;
        } case "😴": {
            res_text += "_Ti senti pochissime energie in corpo. Sei " + simpleGenderFormatter(isMale, "esaust", "o") + ", " + simpleGenderFormatter(isMale, "stanc", "o") + "!_\n";
            break;
        } case "🥴": { //😤
            res_text += "_Ti guardi attorno, il tuo sguardo vaga spaesato... il mondo è così confuso...\nO sei tu ad esserlo?_\n";
            break;
        } case "😨": {
            res_text += "_" + simpleGenderFormatter(isMale, "Tes", "o") + " come una corda di lira con il cuore che sembra voler esplodere. È semplice, sei " + simpleGenderFormatter(isMale, "spaventat", "o") + "!_\n";
            break;
        } case "😤": {
            res_text += "_Vigile ed " + simpleGenderFormatter(isMale, "attent", "o") + ", sei più " + simpleGenderFormatter(isMale, "concentrat", "o") + " e " + simpleGenderFormatter(isMale, "reattiv", "o") + " del normale..._\n";
            break;
        } default: {
            res_text += "_Sei nel pieno possesso delle tue facolta!_\n";
            break;
        }
    }
    res_text += "\n";
    let bag_line = "a tua";
    let bag_moji = "👝🎒🧳";
    switch (main_infos.bag_type) {
        case 3: {
            bag_line += " sarcina";
            bag_moji = "🧳";
            break;
        } case 2: {
            bag_line += " borsa di cuoio rosso";
            bag_moji = "🎒";
            break;
        } default: {
            bag_line += " sacca di pelle";
            bag_moji = "👝";
            break;
        }
    }

    if (main_infos.bag.length <= 0) {
        bag_line = `${bag_moji} Non hai nulla nell${bag_line}`;
    } else {
        bag_line = `${bag_moji} L${bag_line}`;
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
        buttons_array.push([{ text: bag_moji, callback_data: "B:USER:MANAGE_CELL" }])

    }
    res_text += bag_line + "\n";

    if (main_infos.equip.length > 0) {
        for (let i = 0; i < main_infos.equip.length; i++) {

        }
    } else {

    }
    res_text += `\n${(user.gender == "M" ? " 🧙‍♂️" : " 🧙‍♀️")} *Bardi di Lootia*\n`;
    res_text += `• Rango: ${user.role_string}\n`;
    if (user.b_point == 0) {
        res_text += "• Pubblica un'avventura per iniziare a guadagnare reputazione\n"
    }
    buttons_array.push([{ text: "🏕", callback_data: "B:USER:MANAGE_CELL" }])
    buttons_array.push([{ text: "Alle Avventure", callback_data: 'B' }]);

    return simpleMessage(res_text, user.id, buttons_array);

}

function manageTmp(by_user, options_array, in_query) { // NUOVO UTENTE, by_user: {incarichi, user_infos, personals}
    return new Promise(function (manageNew_res) {

        let user = new model.User(by_user.user_infos, by_user.personals);

        let option = options_array[2];
        let to_return = { query_text: "" };
        let possible_id = in_query.message.text.split("\n")[1];
        possible_id = (possible_id ? possible_id.split(" ") : undefined);
        possible_id = (possible_id ? possible_id[possible_id.length - 1] : undefined);

        if (checkParagraphID(possible_id) == true) {
            user.has_pending = possible_id;
        }


        if (option == "PRGPH") {
            if (options_array.length <= 3) {
                return firstParagraph_manager(user, options_array.splice(3)).then(function (add_res) {
                    return manageNew_res(add_res);
                });
            } else {
                if (options_array[3] == "CMDS") {
                    to_return.toEdit = incarichi_AuthorCommands_message(user, options_array[4]).toSend;
                    to_return.query_text = "Comandi per l'editing";
                    return manageNew_res(to_return);
                } else if (options_array[3] == "OPTIONS") {
                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        return model.loadParagraph(user.id, options_array[4]).then(function (paragraph_infos) {
                            to_return.toEdit = paragraph_setOptions_message(user.id, inc_struct, paragraph_infos).toSend;
                            to_return.query_text = "Opzioni paragrafo " + paragraph_infos.par_id;

                            return manageNew_res(to_return);
                        });
                    });

                } else if (options_array[3] == "SELECT") {
                    return model.getUserDaft(user.id).then(async function (inc_struct) {

                        if (inc_struct.esit == false) {
                            return queryManager_res({
                                query_text: "Woops!",
                                toSend: simpleMessage(inc_struct.text, user.id)
                            });
                        } else if (inc_struct.avv_ids.length == 0) { //  
                            to_return.toEdit = simpleMessage("*Woops!*\n\nNon hai ancora aggiunto alcun paragrafo alla tua bozza!", user.id);
                            to_return.query_text = "Woops!";
                            return manageNew_res(to_return);
                        } else if (options_array.length == 4 && inc_struct.avv_ids.length > 1) { // && inc_struct.avv_ids[0] != user.has_pending) { // inc_struct.avv_ids.length == 0 
                            to_return.toEdit = selectParagraph(user, inc_struct, 0).toSend;
                            to_return.query_text = "Indice";
                            return manageNew_res(to_return);
                        } else {
                            let p_id = inc_struct.avv_ids[0];
                            to_return.query_text = "Indice";

                            if (options_array.length > 4 && !isNaN(options_array[4])) {
                                to_return.toEdit = selectParagraph(user, inc_struct, options_array[4]).toSend;
                                to_return.query_text = "Indice, p." + (parseInt(options_array[4]) + 1);
                                return manageNew_res(to_return);
                            } else if (options_array.length >= 5 && checkParagraphID(options_array[4]) == true) {
                                p_id = options_array[4];
                                to_return.query_text = "Paragrafo " + (options_array[4]);
                            }

                            paragraph_infos = await model.loadParagraph(user.id, p_id);
                            if (paragraph_infos.esit == false) {
                                to_return.query_text = "Woops";
                                to_return.toEdit = simpleMessage("*Woops!*\nNon mi risulta che `" + p_id + "` indichi uno dei tuoi paragrafi...", user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
                            }

                            if (options_array[5] != "TO_SEND") {
                                db_update = await model.updateUserParagraph(user.id, p_id, (user.has_pending == p_id));
                                if (db_update.esit === false) {
                                    return newParagraph_res({ query_text: "Woops!", toSend: simpleMessage(db_update.text, user.id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) });
                                } else {
                                    to_return.toEdit = paragraph_message(user, inc_struct, paragraph_infos);
                                    if (inc_struct.avv_ids[0] == p_id) {
                                        to_return.query_text = "Inizio Avventura 🌱";
                                    } else {
                                        to_return.query_text = "Paragrafo " + p_id;
                                    }
                                }
                            } else {

                                to_return.toSend = paragraph_message(user, inc_struct, paragraph_infos, true);
                            }



                            return manageNew_res(to_return);
                        };
                    });
                } else if (options_array[3] == "DELETE") {
                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        return model.loadParagraph(user.id, options_array[4]).then(function (paragraph_infos) {
                            to_return.toEdit = paragraph_removeChoice_message(user.id, inc_struct, paragraph_infos).toSend;
                            to_return.query_text = "Elimina scelta " + options_array[4];
                            return manageNew_res(to_return);
                        });
                    });
                } else if (options_array[3] == "CH_ESIT") {
                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        return model.loadParagraph(user.id, options_array[4]).then(function (paragraph_infos) {
                            to_return.toEdit = paragraph_setChoiceEsit_message(user.id, inc_struct, paragraph_infos).toSend;
                            to_return.query_text = "Esito Scelta" + options_array[4];
                            return manageNew_res(to_return);
                        });
                    });
                } else if (options_array[3] == "CH_TITLE") {
                    //cacca;
                    return model.getUserDaft(user.id).then(async function (inc_struct) {
                        to_return.toDelete = { chat_id: in_query.message.chat.id, mess_id: in_query.message.message_id };

                        const paragraph_infos = await model.loadParagraph(user.id, options_array[4]);

                        if (paragraph_infos.esit == false) {
                            to_return.query_text = "Messaggio obsoleto!";
                        } else {
                            let pure_text = in_query.message.text.split("• Nuovo: ")[1].split("\n")[0];
                            paragraph_infos.choice_title = pure_text;
                            if (typeof inc_struct.avv_pcache == "undefined") {
                                let all_names = await get_AllParagraph_names(user.id, inc_struct);
                                inc_struct.avv_pcache = all_names;
                            }
                            for (let i = 0; i < inc_struct.avv_pcache.length; i++) {
                                if (inc_struct.avv_pcache[i].id == paragraph_infos.par_id) {
                                    inc_struct.avv_pcache[i].title = paragraph_infos.choice_title;
                                    break;
                                }
                            }

                            await model.setUserTmpDaft(user.id, inc_struct);
                            await model.updateParagraph(user.id, paragraph_infos.par_id, paragraph_infos);

                            to_return.query = { id: in_query.id, options: { text: "Titolo del paragrafo\n\nAggiornato\n✅", show_alert: true, cache_time: 4 } }

                        }
                        return manageNew_res(to_return);
                    });
                } else if (options_array[3] == "CH_TEXT") {
                    return model.loadParagraph(user.id, user.has_pending).then(async function (paragraph_infos) {
                        if (paragraph_infos.esit == false) {
                            to_return.toSend = simpleMessage(paragraph_infos.text, user_id);
                            to_return.query_text = "Woops";

                        } else if (options_array[4] == "INT") {
                            let inc_struct = await model.getUserDaft(user.id);

                            if (inc_struct.esit == false) {
                                to_return.query_text = "Woops!";
                                to_return.toSend = simpleMessage(inc_struct.text, user.id);
                            } else {
                                let integrazione = in_query.message.text.substring(in_query.message.text.indexOf("«") + 1, in_query.message.text.indexOf("»"));

                                let ch_manager = paragraph_setTex_message(user.id, inc_struct, paragraph_infos, integrazione, 2, parseInt(options_array[5]));
                                to_return.query_text = ch_manager.query_text;
                                to_return.toEdit = ch_manager.toSend;
                                console.log(to_return.toEdit);
                            }
                        } else {
                            let pure_text = in_query.message.text.split("• Nuovo: ")[1].split("\n")[0];
                            let ch_manager = paragraph_setChoiceText_message(user.id, paragraph_infos, pure_text, options_array[4]);
                            to_return.toEdit = ch_manager.toSend;
                            to_return.query_text = ch_manager.query_text;

                            console.log(to_return);
                        }

                        return manageNew_res(to_return);
                    });

                } else if (options_array[3] == "CH_DELAY") {
                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        return model.loadParagraph(user.id, user.has_pending).then(function (paragraph_infos) {
                            let ch_manager = paragraph_setDelay_message(user.id, inc_struct, paragraph_infos, options_array[5], options_array[4]);
                            to_return.toEdit = ch_manager.toSend;
                            to_return.query_text = ch_manager.query_text;

                            console.log(to_return);

                            return manageNew_res(to_return);
                        });
                    });

                } else if (options_array[3] == "CH_STATUS") { // PRGPH:CH_STATUS
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
                    if (true) {
                        to_return.query_text = "Prossimamente...";
                        return manageNew_res(to_return);
                    }
                    let paragraph_id = user.has_pending;
                    return model.getUserDaft(user.id).then(function (inc_struct) {
                        return model.loadParagraph(user.id, paragraph_id).then(function (paragraph_infos) {
                            if (options_array[4] == "DROP") {
                                to_return.query_text = "Prossimamente...";
                            } else { // si, è (molto) contorto...
                                let is_alternative = false;
                                let has_select = false;
                                if (options_array[6] == "ALT") {
                                    is_alternative = options_array[7];
                                    has_select = options_array[9];
                                } else {
                                    has_select = options_array[8];
                                }
                                if (typeof has_select == "undefined") {
                                    has_select = false;
                                }
                                to_return.toEdit = paragraph_setChoiceDrop_message(user, inc_struct, paragraph_infos, options_array[5], is_alternative, has_select).toSend;
                                to_return.query_text = "Gestisci Drop, paragrafo " + options_array[4];
                            }

                            return manageNew_res(to_return);
                        });
                    });
                } else if (options_array[3] == "AVAILABILITY") { // DA FINIRE
                    return paragraph_setChoiceAvailability_manager(user, in_query, options_array).then(function (setChoiceAv_return) {
                        return manageNew_res(setChoiceAv_return);
                    });
                } else if (options_array[3] == "SHOW") {
                    return model.getUserDaft(user.id).then(async function (inc_struct) {
                        inc_struct.def_vista = options_array[4];
                        let update_res = await model.setUserTmpDaft(user.id, inc_struct);

                        let paragraph_infos = await model.loadParagraph(user.id, user.has_pending);
                        return manageNew_res({
                            query_text: "Visuale " + (options_array[4] == "NIGHT" ? "Notturna 🌙" : (options_array[4] == "ALL" ? "Completa ⭐" : "Diurna ☀️️")),
                            toEdit: paragraph_message(user, inc_struct, paragraph_infos)
                        });
                    });
                    // 
                } else {
                    return manageNew_res({ query_text: "Prossimamente..." });
                }
            }
        } else if (option == "ALTERNATIVE") { // ALTERNATIVE:SELECT:' + paragraph_infos.par_id + ":DEST:" + paragraph_infos.choices[i].id
            return model.getUserDaft(user.id).then(function (inc_struct) {
                if (options_array[3] == "CH") {

                    return paragraph_editAlternative_manager(user, inc_struct, user.has_pending, options_array.splice(4), in_query).then(function (to_return) {
                        if (to_return.esit == false) {
                            return manageNew_res({
                                query_text: "Woops!",
                                toSend: simpleMessage(to_return.text, user.id)
                            });
                        }
                        return manageNew_res(to_return);
                    });
                } else if (options_array[3] == "NEW") {
                    console.log("comandi: " + options_array.join(":"));
                    console.log("Mando: " + options_array.slice(4));

                    let message_text = in_query.message.text.split("\n")[3].substring(2);

                    let alt_manager = paragraph_manageAlternative_message(user, inc_struct, message_text, options_array.slice(4));

                    return manageNew_res({
                        query_text: alt_manager.query_text,
                        toEdit: alt_manager.toSend
                    });

                } else if (options_array[3] == "SELECT") {
                    if (isNaN(parseInt(options_array[4]))) {
                        return manageNew_res({
                            query_text: "Woops!",
                            toSend: simpleMessage("*Woops*\n\n• Errore ASEL-IN, se puoi contatta @nrc382", user.id)
                        });
                    }
                    return model.loadParagraph(user.id, user.has_pending).then(function (paragraph_infos) {
                        if (paragraph_infos.esit == false) {
                            return manageNew_res({
                                query_text: "Woops!",
                                toSend: simpleMessage(paragraph_infos.text, user.id)
                            });
                        } else if (!paragraph_infos.choices || paragraph_infos.choices.length <= 0) {
                            return manageNew_res({
                                query_text: "Woops!",
                                toSend: simpleMessage("*Woops*\n\n• Errore ASEL, se puoi contatta @nrc382", user.id)
                            });
                        }

                        for (let i = 0; i < paragraph_infos.choices.length; i++) {
                            console.log(paragraph_infos.choices[i]);
                            if (paragraph_infos.choices[i].is_alternative) {
                                if (paragraph_infos.choices[i].alternative_id == parseInt(options_array[4])) {
                                    return model.loadAlternative(user.id, paragraph_infos.par_id, paragraph_infos.choices[i].dest_id).then(function (dest_infos) {
                                        to_return.query_text = "Alternativa verso " + paragraph_infos.choices[i].title_text;

                                        if (options_array[5] == "TO_SEND") {
                                            to_return.toSend = alternative_message(user.id, inc_struct, paragraph_infos, dest_infos, paragraph_infos.choices[i].alternative_id, true);

                                        } else {
                                            to_return.toEdit = alternative_message(user.id, inc_struct, paragraph_infos, dest_infos, paragraph_infos.choices[i].alternative_id);
                                        }

                                        return manageNew_res(to_return);
                                    });
                                }
                            }
                        }
                        return manageNew_res({
                            query_text: "Woops!",
                            toSend: simpleMessage("*Woops*\n\n• Errore ASEL2, se puoi contatta @nrc382", user.id)
                        });


                    });
                } else if (options_array[3] == "TARGET" || options_array[3] == "DELETE" || options_array[3] == "INTERMEDIO") {
                    return model.loadParagraph(user.id, user.has_pending).then(function (paragraph_infos) {
                        if (paragraph_infos.esit == false) {
                            to_return.query_text = "Woops!";
                        } else {
                            console.log("Mando: " + options_array.slice(3).join(":"));
                            let pure_text = "";
                            if (options_array[3] == "INTERMEDIO") {
                                pure_text = in_query.message.text.substring(in_query.message.text.indexOf("«") + 1, in_query.message.text.indexOf("»"));
                            }
                            let alt_manager = paragraph_manageAlternative_message(user, inc_struct, pure_text, options_array.slice(3), paragraph_infos);

                            to_return.toEdit = alt_manager.toSend;
                            to_return.query_text = alt_manager.query_text;
                        }
                        return manageNew_res(to_return);
                    });

                } else if (inc_struct.avv_ids.indexOf(options_array[4]) < 0 || inc_struct.avv_ids.indexOf(options_array[6]) < 0) {
                    return manageNew_res({
                        query: { id: in_query.id, options: { text: "Woops!\nQualche cosa è andato storto...", show_alert: true, cache_time: 4 } }
                    });
                } else { //SELECT
                }
            });
        } else if (option == "VARIATION") {
            return model.getUserDaft(user.id).then(async function (inc_struct) {
                if (inc_struct.esit == false || inc_struct.avv_ids.indexOf(user.has_pending) < 0) {
                    return manageNew_res({ query_text: "Woops" });
                }
                let variation_options = options_array.splice(3);
                let paragraph_infos;
                let new_variation_text;

                if (variation_options[0] == "NEW") {
                    variation_options = variation_options.splice(1);
                    new_variation_text = in_query.message.text.substring(in_query.message.text.indexOf("«") + 1, in_query.message.text.indexOf("»"));
                } else {
                    paragraph_infos = await model.loadParagraph(user.id, user.has_pending);
                    if (paragraph_infos.esit == false) {
                        return manageNew_res({ query_text: "Woops!" });
                    }

                    if (variation_options[0] == "INSERT") {
                        new_variation_text = in_query.message.text.substring(in_query.message.text.indexOf("«") + 1, in_query.message.text.indexOf("»"));

                        return paragraph_Variation_confirm(user, inc_struct, paragraph_infos, variation_options[1], variation_options[2], variation_options[3], new_variation_text).then(function (to_return) {
                            if (to_return.esit === false) {
                                return manageNew_res({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                            } else {
                                return manageNew_res(to_return);
                            }
                        });
                    } else if (variation_options[0] == "MANAGE") {
                        let variation_message = paragraph_Variation_manager(user, inc_struct, paragraph_infos, variation_options[1], variation_options[2]);
                        to_return.toEdit = variation_message.toEdit;
                        to_return.query_text = "Variante " + variation_options[1];
                        return manageNew_res(to_return);

                    }
                }
                console.log(variation_options);

                let variation_message = paragraph_Variation_message(user, inc_struct, paragraph_infos, new_variation_text, variation_options);
                to_return.toEdit = variation_message.toSend;
                to_return.query_text = variation_message.query_text;

                console.log(to_return);
                return manageNew_res(to_return);
            });
        } else if (option == "EDIT") { // DELAY, TEXT, TITLE, TYPE
            if (options_array[3] == "TITLE") {
                //cacca;
                return model.getUserDaft(user.id).then(async function (inc_struct) {
                    const paragraph_infos = await model.loadParagraph(user.id, options_array[4]);
                    let pure_text = in_query.message.text.split("• Nuovo: ")[1].split("\n")[0];
                    let title_manager = set_adventureTitle_message(inc_struct, paragraph_infos, user, pure_text, options_array[5]);
                    to_return.toEdit = title_manager.toSend;
                    to_return.query_text = title_manager.query_text;
                    return manageNew_res(to_return);
                });
            } else if (options_array[3] == "CMD") {
                to_return.toEdit = incarichi_Cmds_message(user).toSend;
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
                        to_return.query_text = inc_struct.avv_titolo;
                        return manageNew_res(to_return);
                    }
                });
            }
        } else if (option == "TMP_DELETE") { // null, CONFIRM 
            return delete_userAdventure(user.id, options_array[3]).then(function (res) {
                return manageNew_res(res);
            });
        } else if (option == "LIST_UPDATE") {
            return model.getUserDaft(user.id).then(async function (inc_struct) {
                if (inc_struct.esit == false) {
                    return manageNew_res({
                        query_text: "Woops",
                        toSend: simpleMessage(inc_struct.text, user.id)
                    });
                } else {
                    let all_names = await get_AllParagraph_names(user.id, inc_struct);
                    inc_struct.avv_pcache = all_names;
                    await model.setUserTmpDaft(user.id, inc_struct);

                    return manageNew_res({
                        query_text: "Aggiornato!",
                        toEdit: selectParagraph(user, inc_struct, 0).toSend
                    });
                }
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
                    return set_adventureOption_confirm(user, options_array, in_query.message.text, inc_struct).then(function (to_return) {
                        let res = { query: { id: in_query.id, options: { text: to_return.query_text, show_alert: true, cache_time: 4 } } };
                        let specials_questions = ["TITLE", "DESC", "DELAY"]; // "SOLO", "MULTI"
                        let options_questions = ["SOLO", "MULTI", "ALL", "DAY", "NIGHT"]; // "SOLO", "MULTI"

                        if (options_questions.indexOf(options_array[3]) >= 0) {
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
                                res.toDelete = { chat_id: in_query.message.chat.id, mess_id: in_query.message.message_id };
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
                let mess_manager = incarichi_AuthorInfos_message(user, option_n);
                to_return.toEdit = mess_manager.toSend;
                to_return.query_text = mess_manager.query_text;
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
    let message_text = "📜 *Le Avventure dei Bardi di Lootia* \n_...un modulo di @nrc382_\n\n";
    message_text += "\n• È stato sviluppato, gratuitamente ed autonomamente, per permettere a giocatori di @LootGameBot di seguire e soprattutto creare _avventure testuali_\n";
    message_text += "\n• Scritto in node.js, è su github il [codice sorgente](https://github.com/nrc382/Al0/tree/master/controllers/Incarichi)\n (pessimo e non commentato!).\n";
    message_text += "\n• Se per il tempo che dedico allo sviluppo ti va di offrirmi una birra, non ti freno da fare una donazione. Miei indirizzi sono:\n";
    message_text += "· [PayPal.me](https://paypal.me/EnricoGuglielmi)\n";
    message_text += "· Bitcoin (prossimamente)\n";

    let buttons_array = [[{ text: "📜 Torna al modulo", callback_data: 'B:MAIN_MENU' }], [{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

    let to_return = simpleMessage(message_text, user_info.id, buttons_array);

    return ({ toSend: to_return });
}

function incarichi_AuthorInfos_message(user_info, page_n) {
    let res_querytext = "Introduzione alle avventure";
    let message_text = "📜 *Le Avventure dei Bardi di Lootia* \n_...un'introduzione alla stesura_\n";
    let buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]];

    if (page_n == 0) { // ↦
        message_text += "\n• Le avventure narrate sono storie interattive, dove ogni _paragrafo_ (⨓) può portare a delle scelte:\n";// possono essere per _squadre_ o per _avventurieri solitari_. ";
        message_text += "• Strade (➽)\n• Alternative (🔀)\n"; // \n• Fine Avventura (☠)
        message_text += "\n• Potrai sempre modificare ed aggiornare una tua narrazione, anche dopo che sarà stata pubblicata.\n";
        message_text += "\n• L'avventura potrà essere votata da chi la segue ed il punteggio influirà sulla tua `reputazione` che, aumentando, ti permetterà di sbloccare funzionalità aggiuntive per le tue storie.\n"

    } else if (page_n == 1) {
        res_querytext = "Introduzione ai Paragrafi";
        message_text += "\n⨓  *Paragrafi*\n_Sono i testi mostrati scelta una strada._\n";
        message_text += "\n• Prevedono un _testo di default_ ed eventualmente una _variante notturna_.\n";
        message_text += "\n• È possibile specificare ulteriori varianti in base allo stato del giocatore, alle sue caratteristiche e alle sue scelte passate.\n";
        message_text += "\n• Il giocatore avrà 12 ore per selezionare una delle scelte che prevede il paragrafo. ";
        message_text += "Se tarda o il paragrafo destinazione non prevede un testo appropriato (diurno o notturno) questo porterà alla _fine della narrazione_\n";
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:START:INFO:2' });
    } else if (page_n == 2) {
        res_querytext = "Introduzione alle Scelte";
        message_text += "\n➽  *Strade*\n_Sono le scelte che un giocatore può fare in un paragrafo, mostrate in un bottone._\n";
        message_text += "\n• Possono avere un tempo d'_attesa_ o essere istantanee.\n";
        message_text += "\n• Possono portare alla _fine della narrazione_ o verso un nuovo _paragrafo_.\n";

        message_text += "\n• Possono richiedere, consumare o portare al drop di oggetti.\n";

        message_text += "\n• Possono modificare lo _stato_ del giocatore ed essere esclusivi o nascosti ad alcuni stati.\n";
        message_text += "\n• Possono essere nascoste in base ad orario, stato, equip. o caratteristiche del giocatore.\n";
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:START:INFO:3' });
    } else if (page_n == 3) {
        res_querytext = "Introduzione alle Alternative";

        message_text += "\n🔀  *Alternative*\n_Come le strade, ma portano ad un paragrafo già esistente._\n";
        message_text += "\n• Possono avere un _testo intermedio_, che verrà mostrato prima del paragrafo destinazione (↧) .\n";
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:START:INFO:5' });

    } else if (page_n == 4) {
        //message_text += "\n\n*Nelle avventure per squadre*";
        //message_text += "\n• Di default i membri seguiranno la _strada_ con più voti, ed una casuale in caso di _ambiguità_.";
        //message_text += "\n• Puoi scegliere, nel caso di parità tra più strade, un strada forzata: non sarà necessariamente tra quelle più votate.\n";
        //message_text += "\n• Puoi scegliere, per ogni paragrafo che prevede almeno un'opzione di fine, se terminare l'avventura solo per quella parte di squadra che eventualmente ha scelto l'opzione.\n";
        //message_text += "\n• Puoi scegliere, per ogni strada, un numero minimo di giocatori che devono sceglierla perche questa...\n";
    } else if (page_n == 5) {
        res_querytext = "Introduzione ai Drop";

        message_text += "\n📦  *Drop, togli e richiedi*\n";
        message_text += "_In base alla tua reputazione potrai concedere o richiedere oggetti di rarità diversa._\n";
        //message_text += "\n• All'aspirante bardo è possibile concedere solo oggetti base.\n";
        message_text += "\n• L'inventario di un giocatore è mantenuto tra le varie avventure.\n";
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:START:INFO:6' });
    } else if (page_n == 6) {
        res_querytext = "Introduzione ai Mob";

        message_text += "\n🐗  *Mob*\n";
        message_text += "_In base alla tua reputazione potrai creare avversari che il giocatore dovrà affrontare per poter proseguire nell'avventura._\n"
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:START:INFO:7' });

    } else if (page_n == 7) {
        res_querytext = "Introduzione allo Stato Giocatore";

        message_text += "\n❤️  *Stato Giocatore*\n";
        message_text += "_Sono definiti 5 'stati' per gli avventurieri che seguono le storie dei bardi. Puoi usarli per rendere piu complesse e dinamiche le tue narrazioni_\n"
        message_text += "\n• Lo stato è una caratteristica del giocatore, che può permanere tra un'avventura ed un'altra.\n";
        message_text += "\n• Per ogni paragrafo puoi specificare una o più varianti, che sostituiranno il testo a seconda dello stato dell'avventuriero.\n";
        message_text += "\n• Per ogni strada puoi modificare lo stato del giocatore che la percorre.\n";
        message_text += "\n• Puoi nascondere o rendere disponibile una strada ai soli giocatori che si trovano in determinati stati.\n";
        message_text += "\n• Ogni stato ha un impatto diverso nelle battaglie contro i mob.\n";
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:START:INFO:8' });

    } else if (page_n == 8) {
        res_querytext = "Introduzione alle Caratteristiche Giocatore";

        message_text += "\n👤  *Caratteristiche Giocatore*\n";
        message_text += "_Per ogni giocatore sono definite 3 caratteristiche fondamentali:_\n"
        message_text += "\n· Costituzione\n· Empatia Interna\n· Empatia Esterna\n";
        message_text += "\n• Tempi di scelta, copertura dell'avventura, cambiamenti di stato, battaglie ed inventario sono usati dinamicamente per aggiornare i valori di ogni attributo.\n";
        message_text += "\n• Dalla combinazione di due o piu attributi fondamentali ne sono dedotti altri (come destrezza, intelligenza, affinità alle arti magiche et cetera)\n";
        message_text += "\n• Il bardo non ha controllo diretto su questi aspetti, ma può usarli per rendere piu complessa la struttura delle scelte.\n";
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:START:INFO:1' });
    }

    //message_text += "\n💡 Per i termini in corsivo di questo messaggio, ed altri, è disponibile:\n· `/bardo ? `...\n";

    if (page_n == 0) {
        buttons_array.unshift([
            { text: "⨓", callback_data: 'B:TMP:START:INFO:1' },
            { text: "➽ ", callback_data: 'B:TMP:START:INFO:2' },
            { text: "🔀", callback_data: 'B:TMP:START:INFO:3' },
            { text: "❤️", callback_data: 'B:TMP:START:INFO:7' },
            { text: "📦", callback_data: 'B:TMP:START:INFO:5' },
            { text: "🐗", callback_data: 'B:TMP:START:INFO:6' },
            { text: "👤", callback_data: 'B:TMP:START:INFO:8' }
        ]);

        if (user_info.has_pending == "-1") {
            buttons_array.push([{ text: "Inizia 📜", callback_data: 'B:TMP:START:CONFIRM' }]);
        } else {
            buttons_array[1].unshift({ text: "📜", callback_data: 'B:TMP:EDIT' });
        }

    } else {
        buttons_array[0].unshift({ text: "ⓘ", callback_data: 'B:TMP:START:INFO:0' });
        if (user_info.has_pending == "-1") {
            buttons_array.push([{ text: "Inizia 📜", callback_data: 'B:TMP:START:CONFIRM' }]);
        } else {
            buttons_array[0].unshift({ text: "📜", callback_data: 'B:TMP:EDIT' });
        }
    }




    let to_return = simpleMessage(message_text, user_info.id, buttons_array);

    return ({ toSend: to_return, query_text: res_querytext });
}

function incarichi_AuthorCommands_message(user, page_n) {
    let buttons_array = [[{ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + user.has_pending }, { text: "⨷", callback_data: "B:FORGET" }]];

    let message_text = "⌘" + " *Gestione dei paragrafi*\n_  #comandi_\n";
    if (page_n == "0") {
        //    message_text += "\n• Richiama paragrafo:";
        message_text += "\n• `#testo `";
        message_text += "\n• `#notturno `";
        message_text += "\n• `#variante `";
        message_text += "\n• `#integra `";

        message_text += "\n";
        message_text += "\n• `#nuova `";
        message_text += "\n• `#strada `";
        message_text += "\n• `#attesa `";
        message_text += "\n";
        message_text += "\n• `#alternativa `";
        message_text += "\n• `#intermedio `";


        buttons_array.push([{ text: "Qualche esempio…", callback_data: "B:TMP:PRGPH:CMDS:1" }]);

        //if (p_id.length != 4 && user.has_pending != -1) {    message_text += "\n*NB*\n• l'id paragrafo è opzionale:\nNel caso di omissione varrà quello _attuale_ (" + user.has_pending + ")\n";   }


    } else {
        message_text += "\n• Per cambiare il testo della variante notturna:\n· `/bardo #notturno \nEra una notte buia e tempestosa...`\n";
        message_text += "\n• Per cambiare il testo della prima scelta:\n· `/bardo #strada 1 \nCorri lontano`\n";
        message_text += "\n• Per impostarne a 5 minuti l'attesa:\n· `/bardo #strada 1 #attesa 5 `\n";

        buttons_array.push([{ text: "⌘", callback_data: "B:TMP:PRGPH:CMDS:0" }]);
    }



    return ({ toSend: simpleMessage(message_text, user.id, buttons_array) });
}



function incarichi_detailsInfos_message(target_userID) {
    let message_text = "📜 *Avventure dei Bardi di Lootia* \n_...una \"rapida\" introduzione_\n\n";
    message_text += "Simili agli [incarichi](https://telegra.ph/Una-guida-alla-scrittura-di-Incarichi-per-LootBot-05-05), le _avventure_ sono brevi storie interattive scritte direttamente dagli utenti di @LootGameBot.\n";
    message_text += "\nA differenza degli incarichi:\n";
    message_text += "• La loro struttura non è lineare\n";
    message_text += "• Possono esserci condizioni ed alterazioni tra 7 stati giocatore\n";
    message_text += "• È previsto il drop e l'utilizzo di oggetti\n";
    message_text += "• È possibile incontrare avversari (mob) da dover sconfiggere per proseguire\n";


    message_text += "\nSono divise in paragrafi che portano ad almeno due possibili strade:";
    message_text += "\n• Ogni strada può avere diversi tempi d'attesa.";
    message_text += "\n• Ogni strada può essere nascosta (ora del giorno, stato giocatore, oggetto)";
    message_text += "\n• Ogni strada scelta può portare alla fine dell'avventura (con esito positivo o negativo) o farla invece continuare verso un nuovo paragrafo.";
    message_text += "\n• Ogni avventura ha almeno 2 esiti positivi e 3 negativi.\n";
    //message_text += "• Alla fine dell'avventura, se con esito positivo, ogni giocatore guadagnerà almeno un (1) glifo ၜ.\n";
    //message_text += "\n💡 Il numero di glifi guadagnati per ogni possibile esito positivo è determinato indipendentemente dall'autore, che comunque ha controllo sul tipo di avventura (se per singoli o per gruppi) e, nel caso di una squadra: \n";
    //message_text += "• Sul numero minimo di giocatori necessario \"per scegliere una strada\"\n";
    //message_text += "• Sull'eventuale fine immediata per i membri discordi (una sola strada possibile)\n";
    message_text += "\nIl modulo si offre di facilitare la scrittura di queste avventure, oltre a permetterne lo svolgimento.\n";
    message_text += "\n🌱 Per iniziare, imposta un soprannome. Usa:\n";
    message_text += "· `/bardo sono`...";

    let to_return = simpleMessage(message_text, target_userID, [[{ text: "Indietro ↩", callback_data: 'B:NEW_USER' }]]);

    return ({ toSend: to_return });
}

function incarichi_Cmds_message(user) {
    let text = "⌘" + " *Gestione Avventura*\n_  #comandi_\n\n";

    text += "• Usali preceduti da /bardo\n";
    text += "• Anche in risposta\n";
    text += "• Flessibili\n";
    text += "• A vuoto per info\n";

    text += "\n· `#intro`";
    text += "\n· `#bozza`";
    text += "\n· `#titolo`";
    text += "\n· `#descrizione`";
    //text += "\n· `tipo`";
    text += "\n· `#attesa`";
    text += "\n· `#indice`";



    text += "\n\nUn Esempio:\n· `/bardo #titolo\nLa mia prima avventura!`";

    //text += "\n\n• Una lista parziale…\nPerché contestualizzata in vari menu, la trovi sempre sotto il bottone comandi (⌘)\n";
    //text += "\n💡 Flessibili\nScopri da " + (user.gender == "M" ? "solo" : "sola") + " abbreviazioni ed alternative\n";

    let buttons_array = [[{ text: "📜", callback_data: "B:TMP:EDIT" }, { text: "⨷", callback_data: "B:FORGET" }]]; // FORGET
    return ({ toSend: simpleMessage(text, user.id, buttons_array) });
}

// USER MANAGERS
function newUserMessage(target_userID) {
    let message_text = "📜 *Salve* \n\n";
    message_text += "Con questo modulo è possibile partecipare ad _avventure_ scritte dalla comunità di @LootGameBot, e crearne di proprie!\n";
    message_text += "\nÈ da considerarsi come _in versione di test_ finchè non passerà, eventualmente, sul plus:";
    message_text += "\nCiò vuol dire che funzioni e progressi potrebbero subire modifiche e che le ricompense, l'inventario e le statistiche saranno interne al modulo.\n"
    //message_text += "\n*NB:*\nPer garantire una futura compatibilità, ogni comando o messaggio indirizzato a questo modulo dovrà iniziare con:\n· /bardo (i/e)\n\n(Od uno tra gli alias: /incarico (/i), /b, /i)\n";

    let to_return = simpleMessage(message_text, target_userID, [[{ text: "Maggiori Informazioni ⓘ", callback_data: 'B:PRE_INFOS' }]]);

    return ({ toSend: to_return });
}

function set_aliasManager(user_id, splitted_text) {
    let message_text = "*Imposta un Alias*\n_o ...pseudonimo_\n\n";
    if (splitted_text[1].indexOf("sono") == 0) {
        if (splitted_text.length <= 2) {
            message_text += "Completa il comando con il soprannome che preferiresti. Sono accettate le emoji!\n\n";
            message_text += "Esempio:\n· `/bardo sono " + generateSimpleAlias() + "`";
        } else if (splitted_text.length != 3) {
            message_text += "Poteva essere una buona idea, ma questo soprannome non può essere composto da più di una parola.\n\nMi spiace, ma `" + splitted_text.splice(2).join(" ") + "` non va bene...\n";
            message_text += "Che ne diresti di `" + generateSimpleAlias() + "`?";
        } else if (splitted_text[2].length >= 12) {
            let new_name = generateSimpleAlias().substring(0, 4) + splitted_text[2].substring(10, Math.min(13, splitted_text[2].length));
            message_text += "`" + splitted_text[2].trim() + "`?\n\n• È troppo lungo... che ne dici di:\n· `/bardo sono " + new_name + "`?";
        } else if (["dio", "allah", "gesu", "gesù"].indexOf(splitted_text[2].toLowerCase()) >= 0) {
            message_text = "_Amen_";
        } else { // return!
            return alias_validImputManager(user_id, splitted_text).then(function (res_msg) {
                return (res_msg);
            });
        }
    } else {
        message_text += "Prima di iniziare ad usare questo modulo, imposta un soprannome con cui firmarti. Sintassi:\n· /bardo sono...";
    }
    return ({ toSend: simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
}

function alias_validImputManager(user_id, splitted_text) {
    return new Promise(function (validImputManager_res) {
        let message_text = "*Imposta un Alias!*\n\n";
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
                message_text += "Mi spiace, ma \"" + tmp_alias + "\" include uno dei pochissimi caratteri non consentiti.";
                return validImputManager_res({ toSend: simpleMessage(message_text, user_id) });
            }
        }

        return model.checkAlias(tmp_alias).then(function (check_res) {
            let to_return;
            if (check_res == true) {
                message_text = "*" + tmp_alias + "*\n\n";
                if (tmp_alias.length <= 2) {
                    message_text += "Essenziale, ottimo! :)\n";
                } else {
                    message_text += "Può andare bene... (:";
                    message_text += " \n\nTi ricordo che comunque sarà controllato da un moderatore, e che nel caso risultasse non idoneo potresti essere bandito dal modulo.";
                    message_text += "\n(si, anche se l'alias è stato suggerito da me!)\n"
                }

                message_text += "\nVuoi aspirare al titolo di _Strillon_*a* o di _Strillon_*e*?\n(l'unico scopo è adattare alcuni testi)";
                to_return = simpleMessage(message_text, user_id, [[{ text: "🧙‍♀️", callback_data: 'B:REG:F' }, { text: "🧙‍♂️", callback_data: 'B:REG:M' }]]);

            } else {
                message_text = "*Sigh*\n\n";
                if (tmp_alias.length <= 2) {
                    message_text += "Qualcuno l'ha gia preso!\n";
                    message_text += "Che ne diresti di `" + generateSimpleAlias() + "`?";
                } else {
                    tmp_alias = splitted_text[2].split("").reverse().join("");
                    tmp_alias = tmp_alias.split("")[0].toUpperCase() + tmp_alias.substring(1);
                    if (tmp_alias.charAt(tmp_alias.length - 1) != "u") {
                        tmp_alias += "us";
                    } else {
                        tmp_alias += "th";
                    }
                    message_text = "C'è già qualcun'altro che ha scelto questo sopranome. E se provassi `" + tmp_alias + "`?";
                }
                to_return = simpleMessage(message_text, user_id);
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
                let message_text = "🔰 *Iscrizione ai Bardi di Lootia*\n\n";
                message_text += "Ti registrerai come:\n";
                message_text += "• _" + tmp_alias + "_, aspirante " + simpleGenderFormatter((gender == "M"), "Strillon", "e", "a") + "\n";
                message_text += "\nPer modificare, usa:\n· `/bardo sono ...`\n\n💡Dopo la conferma non ti sarà più possibile cambiare questi dati.\n";
                return setUserGender_res({ toEdit: simpleMessage(message_text, user_id, [[{ text: "Inizia 🌱", callback_data: 'B:REG' }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
            }
        });
    });
}

function registerUser(t_id, alias, gender) {
    return new Promise(function (registerUser_res) {
        return model.checkAlias(alias).then(function (check_res) {
            let message_text;
            if (check_res == true) {
                return model.insertUser([t_id, alias, (Date.now() / 1000), gender]).then(function (insert_res) {
                    if (insert_res == false) {
                        message_text = "*Woops!*\n\n";
                        message_text += "Qualche cosa non è andato bene e non sono riuscito a registrarti... Dovrai riprovare.";
                    } else {
                        message_text = "⭐ *" + simpleGenderFormatter(gender == "M", "Benvenut", "o") + "*\n\n";
                        message_text += "Segui un'avventura già pubblicata per cominciare il tuo percorso da avventuriero, creane una per iniziare a guadagnarti il rango di Bardo di Lootia!";
                    }
                    let to_return = { toEdit: simpleMessage(message_text, t_id) };
                    if (insert_res != false) {
                        to_return.toEdit.options.reply_markup = { inline_keyboard: [[{ text: "Vai al Menu", callback_data: 'B:MAIN_MENU' }]] };
                    }
                    return registerUser_res(to_return);
                });
            } else {
                message_text = "*Sigh*\n\n";
                if (tmp_alias.length <= 2) {
                    message_text += "Qualcuno l'ha preso pochi istanti fa!\n";
                    message_text += "Puoi ripiegare su `" + generateSimpleAlias() + "`?";
                } else {
                    tmp_alias = splitted_text[2].split("").reverse().join("");
                    tmp_alias = tmp_alias.split("")[0].toUpperCase() + tmp_alias.substring(1);
                    message_text = "C'è già qualcun'altro che ha scelto questo sopranome giusto un attimo fa! E se provassi `" + tmp_alias + "`?";
                }
                return registerUser_res({ toSend: simpleMessage(message_text, user_id) });
            }
        })
    });
}

// TMP_SRTUCT (ADVENTURE) MANAGERS
function new_userAdventure(user_info, type) {
    if (user_info.has_pending != "-1") {
        let message_text = "*Mumble...*\n\nStai già scrivendo un'avventura.\nDovrai pubblicarla o eliminarla prima di poter iniziare a lavorare ad una nuova.\n\n*NB*\nIl bottone qui sotto non prevede conferme!";
        return Promise.resolve(({ toSend: simpleMessage(message_text, user_info.id, [[{ text: "Elimina ⌫", callback_data: 'B:TMP:TMP_DELETE' }]]) }));
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
                let message_text = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                return (tmpDelete_res({ query_text: "Woops!", toEdit: simpleMessage(message_text, user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) }));
            } else if (option == "CONFIRM") {
                return model.deleteUserDaft(user_id).then(function (del_res) {
                    if (del_res.esit === false) {
                        return (tmpDelete_res({ query_text: "Woops!", toEdit: simpleMessage(del_res.text, user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) }));
                    } else {
                        return (tmpDelete_res({ query_text: "Eliminata!", toEdit: simpleMessage("🗑" + " *Bozza eliminata!*\n\n", user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) }));
                    }
                });
            } else {
                let message_text = "🗑" + " *Scarta la Bozza*\n\nProcedendo non sarà possibile recuperare alcun informazione su:\n\"" + inc_struct.avv_titolo + "\"\n\n";
                message_text += "• Paragrafi: " + inc_struct.avv_ids.length + "\n";
                let enlapsed = ((Date.now() / 1000) - inc_struct.avv_inizio) / (60 * 60 * 24);
                if ((Math.floor(enlapsed * 24) * 24) < 2) {
                    message_text += "• Appena creata\n";
                } else if (enlapsed <= 2) {
                    message_text += "• Creata circa " + Math.floor(enlapsed * 24) + " ore fa\n";
                } else {
                    message_text += "• Creata circa " + Math.floor(enlapsed) + " giorni fa\n";
                }
                let buttons_array = [[
                    { text: "Annulla", callback_data: 'B:TMP:EDIT' },
                    { text: "Elimina ❌", callback_data: 'B:TMP:TMP_DELETE:CONFIRM' }
                ]];
                return (tmpDelete_res({ query_text: "Elimina Bozza", toEdit: simpleMessage(message_text, user_id, buttons_array) }));
            }
        });
    });
}

function adventure_options_message(user, inc_struct) {
    let message_text;
    let buttons_array = [];
    message_text = "⌥ *" + inc_struct.avv_titolo + "*\n_Opzioni avventura_\n\n";
    message_text += "Puoi modificare il tipo di avventura, se solitaria o per squadre, ed il tipo di visualizzazione della bozza (notturno, completo o diurno)\n";
    message_text += "\nStato attuale:\n";
    message_text += "• Genere: " + (inc_struct.avv_tipo == "SOLO" ? "solitaria" : "per squadre") + "\n";
    message_text += "• Visualizzazione: " + (inc_struct.def_vista == "ALL" ? "completa" : (inc_struct.def_vista == "DAY" ? "diurna" : "notturna")) + "\n";

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

    return simpleMessage(message_text, user.id, buttons_array);
}

function set_adventureType_message(user) {
    let message_text;
    let buttons_array = [];
    if (user.has_pending != "-1") {
        message_text = "⌥ *Le Avventure dei Bardi di Lootia* \n\n";
        message_text += "Modifica il tipo dell'avventura, solitaria o per squadre?";

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
        message_text = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        buttons_array.push([{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]);
    }

    return simpleMessage(message_text, user.id, buttons_array);
}

///// *******

function check_adventureStruct_message(user, inc_struct) {
    let message_text;
    let buttons_array = [];

    message_text = "📜 *" + inc_struct.avv_titolo + "* \n_test della struttura_\n\n";
    message_text += "💡 Prima di procedere, assicurati che:\n";
    message_text += "\n• Ogni paragrafo abbia un testo valido.\n";
    message_text += "\n• Ogni paragrafo abbia almeno 2 scelte valide. (3 per il primo)\n";
    message_text += "\n• L'avventura comprenda almeno 2 diversi esiti positivi e 3 negativi.\n";

    buttons_array.push(
        [
            { text: "Controlla ✓", callback_data: 'B:TMP:TEST:START' },
        ]
        , [
            { text: "📜", callback_data: 'B:TMP:EDIT' },
            { text: "⨷", callback_data: "B:FORGET" }
        ]
    );


    return simpleMessage(message_text, user.id, buttons_array);
}

function check_adventureStruct_loopController(user, inc_struct) {
    return new Promise(function (check_message) {
        //let to_check_ids = inc_struct.avv_ids;
        let errors_array = [];
        let endings_array = [];
        let promise_array = [];
        for (let i = 0; i < inc_struct.avv_ids.length; i++) {
            promise_array.push(check_adventureStruct(user.id, inc_struct.avv_ids[i], errors_array, endings_array));
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

                    if (errors_array.length < inc_struct.avv_ids.length) {
                        message_text += "Su " + inc_struct.avv_ids.length + " paragrafi, " + errors_array.length + " non sono pronti";
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
        return model.loadParagraph(user_id, paragraph_id).then(function (paragraph_infos) {
            let tmp_error = {};
            if (paragraph_infos.availability == "NIGHT") {
                if (paragraph_infos.night_text.length <= 10) {
                    tmp_error.night_text = true;
                }
            } else if (paragraph_infos.text.length <= 10) {
                tmp_error.text = true;
            }
            if (paragraph_infos.esit_type != 0) {
                endings_array.push({ id: paragraph_infos.par_id, esit: paragraph_infos.esit_type });
            } else {
                if (paragraph_infos.choices.length == 0) {
                    tmp_error.no_choice = true;
                } else {
                    let night_choices_count = 0;
                    let dayonly_choices_count = 0;
                    let other_choices_count = 0;

                    let minimum = paragraph_infos.father_id != 0 ? 2 : 3;

                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        if (paragraph_infos.choices[i].availability == "NIGHT") {
                            night_choices_count++;
                        } else if (paragraph_infos.choices[i].availability == "DAY") {
                            dayonly_choices_count++;
                        } else {
                            other_choices_count++;
                        }
                    }
                    if (paragraph_infos.availability == "NIGHT") {
                        if ((night_choices_count + other_choices_count) < minimum) {
                            tmp_error.night_choices = true;
                        }
                    } else if ((other_choices_count + dayonly_choices_count) < minimum) {
                        tmp_error.other_choices = true;
                    }
                }
            }

            if (Object.keys(tmp_error).length > 0) {
                tmp_error.id = paragraph_infos.par_id;
                tmp_error.title = ('choice_title' in paragraph_infos ? paragraph_infos.choice_title : "Inizio");
                tmp_error.availability = paragraph_infos.availability;
                tmp_error.esit = paragraph_infos.esit_type;

                error_array.push(tmp_error);
            }
            return checkLoop_res();
        });

    });
}

function get_AllParagraph_names(user_id, inc_struct) {
    return new Promise(async function (resNames) {
        let promise_array = [];
        let res_array = [];

        for (let i = 0; i < inc_struct.avv_ids.length; i++) {
            promise_array.push(model.loadParagraph(user_id, inc_struct.avv_ids[i]));
        }

        let all_res = await Promise.all(promise_array);
        for (let i = 0; i < all_res.length; i++) {
            console.log(all_res[i].id + " " + all_res[i].choice_title);
            res_array.push({
                id: all_res[i].id,
                title: all_res[i].choice_title,
                availability: all_res[i].availability,
                level_deep: all_res[i].level_deep
            });
        }
        return resNames(res_array);
    });
}


async function update_struct_loop_controller(user, inc_struct) {

    // struttura
    let new_struct = {
        avv_titolo: inc_struct.title,
        avv_inizio: inc_struct.created,
        avv_tipo: "SOLO",
        def_vista: inc_struct.view_type,
        def_attesa: inc_struct.delay,
        avv_ids: inc_struct.paragraphs_ids,
        avv_pcache: inc_struct.cached_paragraphs_infos,
        avv_desc: inc_struct.desc
    }


    let promise_array = [];
    for (let i = 0; i < inc_struct.avv_ids.length; i++) {
        promise_array.push(resyncParagraph(user.id, inc_struct.avv_ids[i]));
    }
    let all_res = await Promise.all(promise_array);

}

async function resyncParagraph(user_id, paragraph_id) {
    let tmp_paragraph = await model.loadParagraph(user_id, paragraph_id);
    let new_paragraph = {
        id: new_id,
        father_id: fixed_father_id,
        esit_type: 0, // (loosing (-1), winning (1), continue (0)
        availability: "ALL", // DAY, ALL, NIGHT
        text: "",
        night_text: "",
        choices: [] // [{ id, delay, type, title_text}]
    }
}

///// *******


function set_adventureTitle_message(inc_struct, paragraph_infos, user, new_title, option) {
    let message_text = "*Imposta Titolo*\n";
    let buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]];
    let to_return = { query_text: "Titolo", toSend: {} };

    if (typeof new_title != "string" || new_title.length <= 5 || new_title.length > 80) {
        message_text = "*Imposta un Titolo*\n\n";
        message_text += "• Completa il comando per impostare il titolo dell'avventura";
        if (typeof paragraph_infos.par_id != "undefined") {
            message_text += " o del paragrafo \"" + paragraph_infos.choice_title + "\""
        }

        message_text += "\n\n• Sintassi: `/bardo #titolo `\\[testo]\n";

        if (new_title != "" && new_title.length <= 5) {
            message_text += "• Almeno 5 lettere...\n";
        } else if (new_title.length > 80) {
            message_text += "• Massimo 80 caratteri! (extra: " + (80 - new_title.length) + ")";
        }

    } else if (paragraph_infos.esit == false || option == 1) {
        message_text += "_dell'Avventura_\n\n";
        message_text += "• Nuovo: " + new_title + "\n";
        message_text += "• Precedente: `" + inc_struct.avv_titolo + "`\n";
        buttons_array[0].unshift({ text: "↵", callback_data: 'B:TMP:EDIT:TITLE' }, { text: "✓", callback_data: 'B:TMP:OPTION_CONFIRM:TITLE' });
    } else if (option == 2) {
        message_text += "_del paragrafo " + paragraph_infos.par_id + "_\n\n";
        message_text += "• Nuovo: " + new_title + "\n";
        message_text += "• Precedente: `" + paragraph_infos.choice_title + "`\n";
        buttons_array[0].unshift({ text: "↵", callback_data: 'B:TMP:EDIT:TITLE:' + paragraph_infos.par_id }, { text: "✓", callback_data: 'B:TMP:PRGPH:CH_TITLE:' + paragraph_infos.par_id });

    } else {
        message_text += "_nel paragrafo " + paragraph_infos.par_id + "_\n\n";
        message_text += "• Nuovo: " + new_title + "\n";

        buttons_array.push(
            [{ text: "📜 Avventura", callback_data: 'B:TMP:EDIT:TITLE:' + paragraph_infos.par_id + ":1" }],
            [{ text: "⨓ Paragrafo", callback_data: 'B:TMP:EDIT:TITLE:' + paragraph_infos.par_id + ":2" }]
        );

    }
    to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
    return (to_return);

    //cacca
}

function set_adventureDesc_message(user, desc) {
    let message_text;
    if (typeof desc === "string" && desc.length <= 160 && desc.length > 1) {
        message_text = "*Descrizione Avventura* \n\n";
        message_text += "«`" + desc.charAt(0).toUpperCase() + desc.substring(1) + "`» \n\n";
        message_text += "Sarà usato come descrizione per la tua avventura.\n";
        if (checkUnaviableChars(message_text) == false) {
            message_text += "\n*NB*\nAlcuni caratteri che hai usato sono usati per la formattazione del testo (che è automatica)";
        }
        let buttons_array = [
            [
                { text: "Conferma ✓", callback_data: 'B:TMP:OPTION_CONFIRM:DESC' },
                { text: "Chiudi ⨷", callback_data: "B:FORGET" }

            ]
        ];
        return simpleMessage(message_text, user.id, buttons_array);
    } else if (user.has_pending != "-1") {
        message_text = "*Imposta una descrizione*\n\nCompleta il comando con la breve descrizione che vuoi impostare per la tua avventura.\n";
        message_text += "\nEsempio:\n· `/bardo #descrizione `\n`La mia, incredibile, " + (user.personals.length + 1) + "° avventura.\nRiuscirai a completarla?`\n";
        if (desc.length > 160) {
            message_text += "\n*NB*\nPuoi usare al massimo 160 caratteri, prova ad accorciare:\n`" + desc + "`\n• Caratteri extra: " + (desc.length - 160);
        }
        return simpleMessage(message_text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        message_text = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_text, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }]])
    }
}


function set_adventureOption_confirm(user, type_array, query_text, inc_struct) {
    return new Promise(function (setType_confirm) {
        let user_id = user.id;
        let type = type_array[3];
        let q_text;
        let new_option = "";
        if (type == "PRGPH_DESC") {
            return paragraph_setTex_confirm(user, inc_struct, type_array[4], query_text).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
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
            return paragraph_newAlternative_confirm(user, query_text, inc_struct, type_array[4]).then(function (to_return) {
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
            return paragraph_removeChoice_confirm(user_id, query_text, inc_struct, type_array[4]).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                } else {
                    q_text = "❌\n\n⨓ Strada Eliminata";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "CHOICE_TITLE") {
            return paragraph_setChoiceText_confirm(user, query_text, inc_struct, type_array[4]).then(function (to_return) {
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
            return paragraph_setChoiceDelay_confirm(user, type_array.slice(4), inc_struct).then(function (to_return) {
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
                new_option = query_text.split("• Nuovo: ")[1].split("\n")[0];
                q_text = "📜\n\nTitolo dell'avventura modificato:\n\n" + new_option;
            } else if (type == "DESC") {
                new_option = query_text.substring(query_text.indexOf("«") + 1, query_text.indexOf("»"));
                q_text = "📃\n\nDescrizione dell'avventura modificata!\n\n";
            } else if (type == "SOLO" || type == "MULTI") {
                if (type == "MULTI") {
                    new_option = "SOLO";
                    q_text = "🙁\n\nLe avventure per squadre non sono ancora state abilitate...\n\n";

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
                new_option = Math.abs(parseInt(type_array[4]));
                if (isNaN(new_option) || (new_option != 0 && (new_option < 2 || new_option > 90))) {
                    new_option = 10;
                }
                q_text = "⌛️\n\nNuovo tempo d'attesa di default:\n\n" + new_option + " minuti";
            }

            if (new_option.length <= 0) {
                return (setType_confirm({ query_text: "Prossimamente..." }));

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
    let message_text = "";
    let buttons_array = [];
    message_text += "📜 *" + inc_struct.avv_titolo + "*\n";

    if (inc_struct.avv_tipo == "SOLO") {
        message_text += "_...un'avventura personale, ";
    } else {
        message_text += "_...un'avventura per squadre, ";
    }
    message_text += "di " + user_info.alias + "_\n\n";
    message_text += "· ";
    if (inc_struct.avv_ids.length == 1) {
        message_text += "Un Paragrafo\n";
    } else if (inc_struct.avv_ids.length > 1) {
        message_text += inc_struct.avv_ids.length + " Paragrafi\n";
    }
    message_text += "· Attesa di default: ";
    if (inc_struct.def_attesa < 60) {
        message_text += inc_struct.def_attesa + " minuti\n";
    } else if (inc_struct.def_attesa == 60) {
        message_text += "1h\n";
    } else {
        message_text += "1h e " + (inc_struct.def_attesa - 60) + "m \n";
    }

    if (inc_struct.avv_desc == "") {
        message_text += "\n_«Una breve descrizione. Sarà automaticamente formattata in corsivo e tra virgolette. Probabilmente e come per il titolo, è meglio settarla dopo una prima stesura...»_\n";
    } else {
        message_text += "\n_«" + inc_struct.avv_desc + "»_\n\n";
    }

    if (inc_struct.avv_titolo == "La mia 1° storia" || inc_struct.avv_desc == "") {
        message_text += "\n\n⚠️ Controlla i comandi (⌘)\n";
    }

    buttons_array.push([
        { text: "ⓘ", callback_data: 'B:TMP:START:INFO:0' },
        { text: "⌥", callback_data: 'B:TMP:OPTIONS' },
        { text: "⌘", callback_data: 'B:TMP:EDIT:CMD' },
        //{ text: "↺", callback_data: 'B:TMP:EDIT' },
        { text: "⨷", callback_data: 'B:FORGET' },
        { text: "⌫", callback_data: 'B:TMP:TMP_DELETE' }
    ]);
    if (inc_struct.avv_ids.length <= 0) {
        buttons_array.push([{ text: "Aggiungi un primo paragrafo", callback_data: 'B:TMP:PRGPH' }]);
    } else {
        buttons_array[0].unshift({ text: "▤", callback_data: 'B:TMP:PRGPH:SELECT' });
        if (inc_struct.avv_ids.length >= 2) {
            buttons_array.push([{ text: "Controlla la Struttura", callback_data: 'B:TMP:TEST' }]);
        }
    }

    return ({ toSend: simpleMessage(message_text, user_info.id, buttons_array) });
}

// PRGPHS MANAGERS
function paragraphMainManager(user, pure_text, cmds_array, asking_message) {
    return new Promise(async function (mainManager_res) {
        const inc_struct = await model.getUserDaft(user.id);
        if (inc_struct === false) {
            let message_text = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
            return mainManager_res({ toSend: simpleMessage(message_text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
        } else {

            let to_return = { toDelete: asking_message };

            if (cmds_array.indexOf("NUOVA") >= 0) {
                to_return.toSend = paragraph_addChoice_message(user.id, inc_struct, user.has_pending, pure_text).toSend;
            } else if (cmds_array.indexOf("VARIANTE") >= 0) {
                to_return.toSend = paragraph_AddVariation_message(user, inc_struct, pure_text);
            } else if (cmds_array.indexOf("ALTERNATIVA") >= 0) {
                to_return.toSend = paragraph_manageAlternative_message(user, inc_struct, pure_text.split("\n").join(" "), ["ADD"]).toSend;
            } else {
                let paragraph_infos = await model.loadParagraph(user.id, user.has_pending);

                if (cmds_array.indexOf("ATTESA") >= 0) {
                    let index = (cmds_array.indexOf("ATTESA"));
                    to_return.toSend = paragraph_setDelay_message(user.id, inc_struct, paragraph_infos, parseInt(cmds_array[index + 1])).toSend;
                } else if (paragraph_infos.esit == false) {
                    to_return.toSend = simpleMessage(paragraph_infos.text, user_id);
                } else if (cmds_array.indexOf("PARAGRAFO") >= 0) {
                    to_return.toSend = paragraph_message(user, inc_struct, paragraph_infos);
                } else if (cmds_array.indexOf("INTEGRA") >= 0) {
                    to_return.toSend = paragraph_setTex_message(user.id, inc_struct, paragraph_infos, pure_text, 2).toSend;
                } else if (cmds_array.indexOf("TESTO") >= 0 || cmds_array.indexOf("NOTTURNO") >= 0) {
                    let type = cmds_array.indexOf("NOTTURNO") >= 0 ? 1 : 0;
                    to_return.toSend = paragraph_setTex_message(user.id, inc_struct, paragraph_infos, pure_text, type).toSend;
                } else if (cmds_array.indexOf("STRADA") >= 0) {
                    to_return.toSend = paragraph_setChoiceText_message(user.id, paragraph_infos, pure_text).toSend;
                } else if (cmds_array.indexOf("INTERMEDIO") >= 0) {
                    to_return.toSend = paragraph_manageAlternative_message(user, inc_struct, pure_text, ["INTERMEDIO"], paragraph_infos).toSend;
                } else if (cmds_array.indexOf("LISTA") >= 0) {
                }
            }
            return mainManager_res(to_return);
        }
    })
}

function firstParagraph_manager(user_info) {
    return new Promise(function (newParagraph_res) {
        if (user_info.has_pending == "-1") {
            let message_text = "*Mumble...*\n\nNon mi risulta tu abbia una bozza aperta...\nVuoi crearne una nuova?\n";
            return newParagraph_res({ query_text: "Woops!", toSend: simpleMessage(message_text, user_info.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'B:TMP:START' }], [{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
        } else if (user_info.has_pending != "0") {
            let message_text = "*Mumble...*\n\nHai già creato il tuo primo paragrafo!\n";
            return newParagraph_res({ query_text: "Woops!", toEdit: simpleMessage(message_text, user_info.id, [[{ text: "📜", callback_data: 'B:TMP:EDIT' }, { text: "⨷", callback_data: "B:FORGET" }]]) });
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

function selectParagraph(user, inc_struct, page_n) {
    let message_text = "📜 *" + inc_struct.avv_titolo + "*\n";
    let buttons_array = [[{ text: "📜", callback_data: 'B:TMP:EDIT' }]];
    console.log(user.has_pending);

    if (inc_struct.avv_ids.length == 0) {
        message_text += "_Nessun paragrafo_\n\n";
        message_text += "Per iniziare a dare forma alla tua bozza, aggiungi una prima scelta";
        buttons_array.push([{ text: "Inizio 🌱", callback_data: 'B:TMP:PRGPH' }]);
    } else {
        message_text += "_#indice_\n\n";

        if (inc_struct.avv_ids.length == 1) {
            message_text += "• Un solo paragrafo\n\n";
        } else {
            message_text += "• " + inc_struct.avv_ids.length + " paragrafi\n\n";
        }



        buttons_array[0].push({ text: "🌱", callback_data: "B:TMP:PRGPH:SELECT:" + inc_struct.avv_ids[0] }); //  ↺

        if (inc_struct.avv_ids.length < 2) {
            message_text += "\n• Prevedi almeno 2 strade per il paragrafo iniziale!\n";
        }

        if (inc_struct.avv_ids.length == 2) {
            buttons_array[1].push({ text: "Prima Scelta", callback_data: "B:TMP:PRGPH:SELECT:" + inc_struct.avv_ids[1] })
        } else {
            //buttons_array[0].push({ text: "↺", callback_data: "B:TMP:LIST_UPDATE:" });


            message_text += "🌱 Inizio: " + inc_struct.avv_ids[0] + "\n";

            addParagraphButtons(inc_struct, page_n, buttons_array, user, "B:TMP:PRGPH:SELECT:");

            if (inc_struct.avv_ids[0] != user.has_pending) {
                let pending_name = "" + user.has_pending;
                if (inc_struct.avv_pcache) {
                    for (let i = 0; i < inc_struct.avv_pcache.length; i++) {
                        if (inc_struct.avv_pcache[i].id == user.has_pending) {
                            pending_name = inc_struct.avv_pcache[i].title + " ";
                            pending_name += (inc_struct.avv_pcache[i].availability == "NIGHT" ? "🌙 " : (inc_struct.avv_pcache[i].availability == "DAY" ? "☀️" : "⭐"));
                            break;
                        }
                    }
                }
                message_text += "⦾ Attuale: " + pending_name + "\n";
                buttons_array[0].splice(2, 0, { text: "⦾", callback_data: "B:TMP:PRGPH:SELECT:" + user.has_pending }); //  ↺
            }
            //message_text += "↺ Aggiorna la lista\n";
        }
    }

    buttons_array.push([{ text: "⨷", callback_data: "B:FORGET" }]);
    if (inc_struct.avv_ids.length != inc_struct.avv_pcache.length) {
        message_text += "\n*∿ Fuori sync* " + inc_struct.avv_pcache.length + "/" + inc_struct.avv_ids.length + "\n• Segnala a @nrc382\n";
        buttons_array[0].push({ text: "↺", callback_data: "B:TMP:LIST_UPDATE:" });
    }

    return ({ toSend: simpleMessage(message_text, user.id, buttons_array) });
}

function addParagraphButtons(inc_struct, page_n, buttons_array, user, query_text) {
    let has_cached = "cached_paragraphs_infos" in inc_struct;
    let to_use = has_cached ? inc_struct.avv_pcache : inc_struct.avv_ids;

    let start_index = parseInt(page_n);
    let end_index = start_index + Math.min(5, (to_use.length - start_index - 1));

    let res_list = "";


    if (typeof query_text != "undefined") {
        if (start_index >= 5) {
            buttons_array[0].push({ text: "↤", callback_data: query_text + ((Math.floor(start_index / 5) * 5) - 5) });
        }

        if ((to_use.length - (end_index + 1)) > 0) {
            buttons_array[0].push({ text: "↦", callback_data: query_text + (end_index) });
        }
    }

    let tmp_id;
    let button_text = "";

    for (let i = (start_index + 1); i < (end_index + 1); i++) {
        if (typeof query_text == "undefined") {
            if (!has_cached) {
                tmp_id = to_use[i];
                button_text = "• `" + to_use[i] + " `";
            } else {
                tmp_id = to_use[i].id;
                button_text = `• \`${to_use[i].id} \`${typeof to_use[i].title == "undefined" ? "⚠️" : to_use[i].title} ${(to_use[i].availability == "NIGHT" ? "🌙 " : (to_use[i].availability == "DAY" ? "☀️" : "⭐"))}`;
            }
            res_list += button_text + "\n";
        } else {
            if (!has_cached) {
                tmp_id = to_use[i];
                button_text = to_use[i] + "";
            } else {
                tmp_id = to_use[i].id;
                button_text = `${(to_use[i].availability == "NIGHT" ? "🌙 " : (to_use[i].availability == "DAY" ? "☀️" : "⭐"))} ${typeof to_use[i].title == "undefined" ? "⚠️" : to_use[i].title} `;//  (${to_use[i].id}) `;
            }


            if (tmp_id == user.has_pending) {
                button_text = "⦾ " + button_text;
            } else {
                button_text = "" + button_text;
            }

            buttons_array.push([{ text: button_text, callback_data: query_text + tmp_id }]);
        }
    }

    return res_list;

}

function paragraph_setTex_message(user_id, inc_struct, paragraph_infos, new_paragraph_text, type, int_type) {
    let message_text;
    let to_return = { toSend: {} };
    if (inc_struct.avv_ids.indexOf(paragraph_infos.par_id) < 0) {
        message_text = "*Woops!*\n\n";
        message_text += "Non mi risulta che " + paragraph_infos.par_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]])
    } else {
        if (new_paragraph_text.length == 0) {
            let is_first = (inc_struct.avv_ids[0] == paragraph_infos.par_id);
            message_text = "*Testo ";
            if (type == 2) {
                message_text = "*Integra Testo*"
            } else if (type == 0) {
                message_text += " di Default*\n";
            } else {
                message_text += " Notturno*🌙\n";
            }
            message_text += "_del paragrafo_ `" + paragraph_infos.par_id + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";

            if (type == 2) {
                message_text += "\vCompleta il comando con il testo con cui vuoi integrare il _paragrafo_\n\n";
                if (paragraph_infos.night_text != "") {
                    message_text += "• Attuali:\n\n";
                    message_text += "Diurno\n`" + paragraph_infos.text + "`\n\n";
                    message_text += "Notturno\n`" + paragraph_infos.night_text + "`\n\n";
                } else if (paragraph_infos.text != "") {
                    message_text += "• Attuale:\n`" + paragraph_infos.text + "`\n";
                }
            } else {
                message_text += "Completa il comando con il testo che vuoi attribuire al _paragrafo_\n\n";
                if (is_first) {
                    message_text += "• È il primo messaggio che " + (inc_struct.avv_tipo == "SOLO" ? "il giocatore " : "la squadra ") + "leggerà avviando l'avventura.\n";
                } else {
                    message_text += "• È il messaggio mostrato alla scelta della strada \"" + paragraph_infos.choice_text + "\", dopo l'attesa specificata...\n";
                }
            }
            to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (new_paragraph_text.split(" ").length < 5) {
            message_text = "*Woops!*\n_Questo testo è troppo corto!_\n\n";
            message_text += "\"_" + new_paragraph_text + "_\"\n\n";
            message_text += "• Usa almeno 5 parole...";

            to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (new_paragraph_text.length > 1500) {
            message_text = "*Woops!*\n_testo paragrafo troppo lungo_\n\n";
            message_text += "\"`" + new_paragraph_text + "`\"\n\n";
            message_text += "• Per rendere più comoda l'avventura ai giocatori, il testo di un paragrafo non può essere più lungo di 1500 caratteri.\n(eccesso: " + (new_paragraph_text.length - 750) + ")\n";
            //            message_text += "Puoi provare a dividere questo testo in più paragrafi...";
            to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else {
            new_paragraph_text = new_paragraph_text.split("«").join("\"").split("»").join("\"");
            let precedente = "";
            let buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]];

            if (type == 2) {
                to_return.query_text = "Integra Testo";
                if (paragraph_infos.text == "" && paragraph_infos.night_text == "") { // ☀️
                    message_text = "*Woops!*\n_cosa integrare?_\n\n";
                    message_text += "\"`" + new_paragraph_text + "`\"\n\n";
                    message_text += "Non hai ancora impostato il testo di questo parafrafo...";
                } else {
                    let mess_title;
                    let to_save;
                    let mess_options = "";

                    if (int_type == 0) {
                        mess_title = "*Integra testo di Default* ☀️\n";
                        to_save = "`" + paragraph_infos.text + "`\n«_" + new_paragraph_text + "_»\n\n";

                        if (paragraph_infos.text.length + new_paragraph_text.length <= 1500) {
                            buttons_array[0].unshift({ text: "✓", callback_data: "B:TMP:OPTION_CONFIRM:PRGPH_DESC:3" });
                        } else {
                            mess_options += "• Il testo del paragrafo sarebbe troppo lungo!";
                        }

                    } else if (int_type == 1) {
                        mess_title = "*Integra testo Notturno* 🌙\n";
                        to_save = "`" + paragraph_infos.night_text + "`\n«_" + new_paragraph_text + "_»\n\n";

                        if (paragraph_infos.text.length + new_paragraph_text.length <= 1500) {
                            buttons_array[0].unshift({ text: "✓", callback_data: "B:TMP:OPTION_CONFIRM:PRGPH_DESC:4" });
                        } else {
                            mess_options += "• Il testo del paragrafo sarebbe troppo lungo!";
                        }
                    } else {
                        mess_title = "*Integra Testo*\n";
                        to_save = "«_" + new_paragraph_text + "_»\n\n";
                        mess_options = "• Seleziona la variante da integrare\n";
                    }

                    if (int_type) {
                        buttons_array[0].unshift({ text: "↵", callback_data: "B:TMP:PRGPH:CH_TEXT:INT:" });
                    } else {
                        if (paragraph_infos.text != "") {
                            buttons_array[0].unshift({ text: "☀️", callback_data: "B:TMP:PRGPH:CH_TEXT:INT:0" });

                        }
                        if (paragraph_infos.night_text != "") {
                            buttons_array[0].unshift({ text: "🌙", callback_data: "B:TMP:PRGPH:CH_TEXT:INT:1" });
                        }
                    }



                    message_text = mess_title + "_del paragrafo " + paragraph_infos.par_id + "_\n\n" + to_save + mess_options;
                }
            } else {
                if (type == 0) {
                    if (paragraph_infos.text != "") {
                        message_text = "*Aggiorna testo di Default*\n";
                        precedente = paragraph_infos.text;
                    } else {
                        message_text = "*Inserisci testo di Default*\n";
                    }
                } else {
                    if (paragraph_infos.night_text != "") {
                        message_text = "*Aggiorna testo Notturno* 🌙\n";
                        precedente = paragraph_infos.night_text;
                    } else {
                        message_text = "*Inserisci testo Notturno* 🌙\n";
                    }
                }
                message_text += "_del paragrafo " + paragraph_infos.par_id + "_\n\n";
                message_text += "«_" + new_paragraph_text + "_»\n\n";

                buttons_array[0].unshift({ text: "✓", callback_data: "B:TMP:OPTION_CONFIRM:PRGPH_DESC:" + type });
            }

            if (precedente != "") {
                message_text += "• Precedente:\n`" + precedente + "`\n";
            }

            to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
        }
    }
    return (to_return);
}

function paragraph_setTex_confirm(user, inc_struct, type, query_text) {
    return new Promise(async function (paragraph_setTexConfirm_res) {
        let new_paragraph_text = query_text.substring(query_text.indexOf("«") + 1, query_text.indexOf("»"))
        let to_return;
        let message_text;

        if (inc_struct.avv_ids.indexOf(user.has_pending) < 0) {
            message_text = "*Woops!*\n\n";
            message_text += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            to_return = { esit: false, text: message_text };
        } else {
            let paragraph_infos = await model.loadParagraph(user.id, user.has_pending);

            if (type == 0) {
                paragraph_infos.text = new_paragraph_text;
            } else if (type == 1) { // notturno
                paragraph_infos.night_text = new_paragraph_text;
            } else if (type == 3) { // integra
                paragraph_infos.text += "\n" + new_paragraph_text;
            } else if (type == 4) { // integra notturno
                paragraph_infos.night_text += "\n" + new_paragraph_text;
            }

            let paragraph_update = await model.updateParagraph(user.id, user.has_pending, paragraph_infos);
            if (paragraph_update.esit === false) {
                to_return = paragraph_update;
            } else {
                to_return = { paragraph_infos: paragraph_infos };
            }
        }
        return paragraph_setTexConfirm_res(to_return);

    });
}

function paragraph_addChoice_message(user_id, inc_struct, paragraph_id, new_choice_text) {
    let message_text;
    let to_return = { toSend: {} };

    if (inc_struct.avv_ids.indexOf(paragraph_id) < 0) {
        message_text = "*Woops!*\n\n";
        message_text += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        if (new_choice_text.length === 0) {
            message_text = "➽" + " *Nuova Strada*\n\n";
            message_text += "• Per aggiungere una scelta al paragrafo " + paragraph_id + ", completa il comando con il testo che vuoi attribuire alla _strada_:\n";
            message_text += "• È il messaggio mostrato sotto al paragrafo, in un bottone.\n";
            message_text += "• Per essere leggibili, i testi non devono superare i 30 caratteri\n";
            message_text += "\nEsempio:\n• `/bardo #strada `\n  Corri!";
            to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (new_choice_text.length < 3 && new_choice_text.length == 1) {
            message_text = "*Woops!*\n_Testo strada troppo corto_\n\n";
            message_text += "\"_" + new_choice_text + "_\"\n\n";
            to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else if (new_choice_text.length > 30) {
            message_text = "*Woops!*\n_Testo strada troppo lungo_\n\n";
            message_text += "\"_" + new_choice_text + "_\"\n\n";
            message_text += "• Per essere leggibile in un bottone, il testo di una strada non può essere più lungo di 30 caratteri.\n(extra: +" + (new_choice_text.length - 30) + ")";
            to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        } else {
            let is_first = (inc_struct.avv_ids[0] == paragraph_id);
            message_text = "➽" + "*Nuova Strada*\n";
            message_text += "_paragrafo_ `" + paragraph_id + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";
            message_text += "> _" + new_choice_text.charAt(0).toUpperCase() + new_choice_text.substring(1) + "_\n\n";

            to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Conferma ✓", callback_data: "B:TMP:OPTION_CONFIRM:NEW_CHOICE" }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
        }
    }
    return (to_return);
}

function paragraph_addChoice_confirm(user_id, query_text, inc_struct) {
    return new Promise(async function (paragraph_addChoice_confirm_res) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[1];
        let newChoice_text = splitted_imputText.slice(2).join("\n").trim().substring(2);

        if (inc_struct.avv_ids.indexOf(curr_paragraph_id) < 0) {
            message_text = "*Woops!*\n\n";
            message_text += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return paragraph_addChoice_confirm_res({ esit: false, text: message_text });
        } else {
            let paragraph_infos = await model.loadParagraph(user_id, curr_paragraph_id);

            let force_availability = false; // (loaded_paragraph_infos.availability == "ALL" ? false : loaded_paragraph_infos.availability );

            if (paragraph_infos.choices.length >= 5) {
                let unique_titles = { night: '', day: 0, all: 0 };
                for (let i = 0; i < paragraph_infos.choices.length; i++) {
                    if (paragraph_infos.choices[i].availability == "DAY") {
                        unique_titles.day++;
                    } else if (paragraph_infos.choices[i].availability == "NIGHT") {
                        unique_titles.night++;
                    } else {
                        unique_titles.all++;
                    }
                }
                if ((unique_titles.day + unique_titles.all) >= 5) {
                    force_availability = "NIGTH";
                    if ((unique_titles.night + unique_titles.all) >= 5) {
                        let message_text = "*Impossibile aggiungere ulteriori Scelte*\n_paragrafo saturo_\n\n";
                        message_text += "• Hai già impostato " + unique_titles.length + " _scelte uniche_ per il paragrafo, di più sarebbero solo scomode.";
                        message_text += "\n\n> `" + alt_title_text + "`\n";
                        if (alt_counter > 3) {
                            message_text += "\mNb\nPuoi aggiungere al massimo 3 alternative per paragrafo\n";
                        }
                        let to_return = simpleMessage(message_text, user.id, [[{ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id }, { text: "⨷", callback_data: "B:FORGET" }]]);
                        return paragraph_addChoice_confirm_res({ query_text: "⚠️\n\nParagrafo Saturo", toSend: to_return });
                    }
                }


            }

            let repeat_counter = force_availability == false ? 0 : 1;
            let repeat_index = -1;
            for (let i = 0; i < paragraph_infos.choices.length && repeat_counter < 2; i++) {
                if (paragraph_infos.choices[i].title_text.toLowerCase() == newChoice_text.toLowerCase()) {
                    if (paragraph_infos.choices[i].availability != "NIGHT") {
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
                message_text += "• Esistono già due varianti per la stessa scelta nel paragrafo " + paragraph_infos.par_id;
                message_text += "\n\nTesto in input:\n> `" + newChoice_text + "`\n";
                let to_return = simpleMessage(message_text, user_id, [[{ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id }, { text: "⨷", callback_data: "B:FORGET" }]]);
                return paragraph_addChoice_confirm_res({ query_text: "⚠️\n\nTesto Ripetuto", toSend: to_return });
            }


            let new_choice = await model.createChoice(
                user_id,
                newChoice_text,
                inc_struct,
                0,
                paragraph_infos.par_id,
                (paragraph_infos.level_deep + 1),
                force_availability
            );


            if (force_availability != false) {
                if (force_availability == "NIGHT") { repeat_index++ };
                paragraph_infos.choices.splice(repeat_index, 0, new_choice);
            } else {
                paragraph_infos.choices.unshift(new_choice);
            }

            let paragraph_update = model.updateParagraph(user_id, curr_paragraph_id, paragraph_infos);
            if (paragraph_update.esit === false) {
                return paragraph_addChoice_confirm_res(paragraph_update);
            } else {

                if (!inc_struct.avv_pcache) {
                    let all_names = await get_AllParagraph_names(user_id, inc_struct);
                    inc_struct.avv_pcache = all_names;
                } else {
                    for (let i = 0; i < inc_struct.avv_pcache.length; i++) {
                        if (inc_struct.avv_pcache[i].id == paragraph_infos.par_id) {
                            inc_struct.avv_pcache[i].title = new_choice.title_text;
                            inc_struct.avv_pcache[i].level_deep = (paragraph_infos.level_deep + 1);
                            inc_struct.avv_pcache[i].availability = new_choice.availability;
                            break;
                        }
                    }
                }
                await model.setUserTmpDaft(user_id, inc_struct);


                paragraph_infos.choices.sort(function (a, b) {
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
                return paragraph_addChoice_confirm_res({ paragraph_infos: paragraph_infos, forced: force_availability });
            }





        }
    });
}

function paragraph_removeChoice_message(user_id, inc_struct, paragraph_infos) {
    let message_text;
    let to_return = {};
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

    if (!inc_struct.avv_ids || inc_struct.avv_ids.indexOf(paragraph_infos.par_id) < 0) {
        message_text = "*Woops!*\n\n";
        message_text += "Non mi risulta che " + paragraph_infos.par_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id);
    } else if (paragraph_infos.choices.length > 0) {
        message_text = "*Woops*\n\n";
        message_text += "Non è possibile eliminare un paragrafo con delle scelte attive.\n\n• Prima di procedere, dovrai eliminare";
        if (paragraph_infos.choices.length == 1) {
            message_text += " il paragrafo `" + paragraph_infos.choices[0].id + "`\n";
            buttons_array.push([{ text: paragraph_infos.choices[0].title_text, callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.choices[0].id }]);
        } else {
            message_text += " i paragrafi:\n\n"
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                message_text += "· `" + paragraph_infos.choices[i].title_text + "`\n";
                buttons_array.push([{ text: paragraph_infos.choices[i].title_text, callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.choices[i].id }]);
            }
        }
        message_text += "\n(...ed eventuali sotto-paragrafi)\n";
        buttons_array[0] = [{ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id }, { text: "⨷", callback_data: "B:FORGET" }];

        to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
    } else {
        buttons_array = [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

        if (paragraph_infos.father_id == 0) {
            message_text = "*Woops...*\n\n";
            message_text += "Piuttosto elimina l'avventura stessa!\nPassa per il comando:\n· `/bardo bozza`";
            to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
        } else {
            message_text = "➽" + " *Rimuovi Strada*\n";
            message_text += "\"" + paragraph_infos.choice_title + "\"\n\n";

            message_text += "• Testo Diurno: " + (paragraph_infos.text != "" ? "✓" : "𐄂") + "\n";
            message_text += "• Testo Notturno: " + (paragraph_infos.night_text != "" ? "✓" : "𐄂") + "\n";
            message_text += "• Varianti: " + (paragraph_infos.variations ? paragraph_infos.variations.length : "𐄂") + "\n";

            message_text += "\n• Dopo la conferma non sarà possibile alcun recupero.";
            buttons_array.unshift([
                { text: "Annulla ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id },
                { text: "Elimina ❌", callback_data: "B:TMP:OPTION_CONFIRM:DEL_CHOICE:" + paragraph_infos.par_id }
            ]);
            to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
        }
    }
    return (to_return);
}

function paragraph_removeChoice_confirm(user_id, query_text, inc_struct, to_delete) {
    return new Promise(function (removeChoice_res) {

        if (inc_struct.avv_ids.indexOf(to_delete) < 0) {
            message_text = "*Woops!*\n\n";
            message_text += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return ({ esit: false, text: message_text });
        } else {
            return model.loadParagraph(user_id, to_delete).then(function (paragraph_infos) {
                return model.deleteChoice(user_id, paragraph_infos, inc_struct).then(function (del_res) {
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

function paragraph_setChoiceText_message(user_id, paragraph_infos, new_choice_text, curr_index) {
    let message_text;
    let to_return = { query_text: "Modifica Strada" };

    if (paragraph_infos.choices.length <= 0) {
        message_text = "➽" + " *Modifica Strada*\n";
        message_text += "_woops!_\n\n";
        message_text += "Non mi risulta che tu abbia già settato alcuna scelta per il paragrafo " + paragraph_infos.par_id + "...\n";
        message_text += "• Usa il comando `/bardo #nuova`"
        to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id }, { text: "⨷", callback_data: "B:FORGET" }]])
    } else if (new_choice_text.length == 0) {
        message_text = "➽" + " *Modifica Strada*\n_ …nel paragrafo " + paragraph_infos.par_id + "_\n\n";
        message_text += "• Per cambiare il testo di una scelta del paragrafo, completa il comando.\n";
        message_text += "\nAd Esempio:\n• `/bardo #strada `Corri!";
        to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (new_choice_text.length < 2) {
        message_text = "*Woops!*\n_Testo strada troppo corto_\n\n";
        message_text += "\"_" + new_choice_text + "_\"\n\n";
        to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (new_choice_text.length > 30) {
        message_text = "*Woops!*\n_Testo strada troppo lungo_\n\n";
        message_text += "\"_" + new_choice_text + "_\"\n\n";
        message_text += "• Per essere leggibile in un bottone, il testo di una strada non può essere più lungo di 30 caratteri.\n(extra: +" + (new_choice_text.length - 30) + ")";
        to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let buttons_array = [[{ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id + ":TO_SEND" }, { text: "⨷", callback_data: "B:FORGET" }]];

        if (!curr_index) {
            to_return.query_text = "➽ Modifica Strada";

            message_text = "➽" + " *Modifica Strada*\n_ …nel paragrafo " + paragraph_infos.par_id + "_\n\n";
            message_text += "• Seleziona la strada da modificare\n\n";
            message_text += "• Nuovo: _" + (new_choice_text.charAt(0).toUpperCase() + new_choice_text.substring(1)) + "_\n";
        } else {
            let index = -1;
            let curr_choice;
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                if (paragraph_infos.choices[i].is_alternative) {
                    if (paragraph_infos.choices[i].alternative_id == curr_index) {
                        index = i;
                        curr_choice = paragraph_infos.choices[i];
                        curr_choice.id = paragraph_infos.choices[i].alternative_id;
                        break;
                    }
                } else if (paragraph_infos.choices[i].id == curr_index) {
                    index = i;
                    curr_choice = paragraph_infos.choices[i];
                    break;
                }

            }
            to_return.query_text = (index + 1) + "° Strada";
            message_text = "➽" + " *Modifica della " + (index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.par_id + "_\n\n";
            message_text += "• Nuovo: _" + (new_choice_text.charAt(0).toUpperCase() + new_choice_text.substring(1)) + "_\n";
            message_text += "• Precedente: `" + curr_choice.title_text + "`\n";
            buttons_array[0].splice(1, 0, { text: "✓", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_TITLE:" + curr_choice.id });
        }

        for (let i = 0; i < paragraph_infos.choices.length; i++) {
            let tmp_text = [];
            let tmp_id = paragraph_infos.choices[i].id;
            if (paragraph_infos.choices[i].is_alternative) {
                tmp_text.push("🔀");
                tmp_id = paragraph_infos.choices[i].alternative_id;
            }
            if (paragraph_infos.choices[i].availability == "DAY") {
                tmp_text.push("☀️");
            } else if (paragraph_infos.choices[i].availability == "NIGHT") {
                tmp_text.push("🌙");
            } else if (paragraph_infos.choices[i].availability == "ALL") {
                tmp_text.push("⭐");
            }
            tmp_text.push(paragraph_infos.choices[i].title_text);
            buttons_array.push([{ text: tmp_text.join(" "), callback_data: "B:TMP:PRGPH:CH_TEXT:" + tmp_id }]);
        }
        to_return.toSend = simpleMessage(message_text, user_id, buttons_array);

    }

    return (to_return);
}

function paragraph_setChoiceText_confirm(user, query_text, inc_struct, choice_paragraph_id) {
    return new Promise(async function (paragraph_setChoiceText_confirm_res) {
        let pure_text = query_text.split("• Nuovo: ")[1].split("\n")[0];
        let message_text = "";

        if (inc_struct.avv_ids.indexOf(user.has_pending) < 0) {
            message_text = "*Woops!*\n\n";
            message_text += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return paragraph_setChoiceText_confirm_res({ esit: false, text: message_text });
        } else {
            let paragraph_infos = await model.loadParagraph(user.id, user.has_pending);
            let curr_choice_index = -1;
            let force_availability = false

            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                if (choice_paragraph_id.length == 1 && choice_paragraph_id == paragraph_infos.choices[i].alternative_id) {
                    curr_choice_index = i;
                } else if (paragraph_infos.choices[i].id == choice_paragraph_id) {
                    curr_choice_index = i;
                } else if (paragraph_infos.choices[i].title_text.toLowerCase() == pure_text.toLowerCase()) {
                    if (paragraph_infos.choices[i].availability != "NIGHT") {
                        force_availability = "NIGHT";
                    } else {
                        force_availability = "DAY";
                    }
                }
            }
            if (curr_choice_index < 0) {
                message_text = "*Woops!*\n_codice scelta non valido!_\n\n";
                if (paragraph_infos.choices.length == 1) {
                    message_text += "• Il paragrafo al momento ha solo una strada, con codice: " + paragraph_infos.choices[0].id + "\n\n";
                    message_text += "• Usa:\n· `/bardo #strada 1\n" + pure_text + "`\n\n";
                } else {
                    message_text += "• Le scelte nel paragrafo sono:\n";
                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        message_text += "· `" + (i + 1) + "`° " + paragraph_infos.choices[i].title + "\n";
                    }
                    message_text += "\n• Usa:\n· `/bardo #strada \\[n°] " + pure_text + "`";
                }
                return paragraph_setChoiceText_confirm_res({ esit: false, text: message_text });
            }
            paragraph_infos.choices[curr_choice_index].title_text = pure_text;

            // let child_paragraph_infos = await model.loadParagraph(user.id, choice_paragraph_id);
            // child_paragraph_infos.choice_title = pure_text;

            if (force_availability != false) {
                paragraph_infos.choices[curr_choice_index].availability = force_availability;
                //child_paragraph_infos.availability = force_availability;
                // if (force_availability == "NIGHT") {
                //     if (child_paragraph_infos.night_text != "") {
                //         child_paragraph_infos.night_text = child_paragraph_infos.text;
                //         child_paragraph_infos.text = "";
                //     }
                // } else if (child_paragraph_infos.text == "" && child_paragraph_infos.night_text != "") {
                //     child_paragraph_infos.text = child_paragraph_infos.night_text;
                // }
            }
            let paragraph_update = await model.updateParagraph(user.id, user.has_pending, paragraph_infos);
            //let child_update = await model.updateParagraph(user.id, choice_paragraph_id, child_paragraph_infos);

            if (!inc_struct.avv_pcache) {
                let all_names = await get_AllParagraph_names(user.id, inc_struct);
                inc_struct.avv_pcache = all_names;
            } else {
                for (let i = 0; i < inc_struct.avv_pcache.length; i++) {
                    if (inc_struct.avv_pcache[i].id == child_paragraph_infos.par_id) {
                        inc_struct.avv_pcache[i].title = child_paragraph_infos.choice_title;
                        inc_struct.avv_pcache[i].level_deep = child_paragraph_infos.level_deep;
                        inc_struct.avv_pcache[i].availability = child_paragraph_infos.availability;
                        break;
                    }
                }
            }

            await model.setUserTmpDaft(user.id, inc_struct);

            if (paragraph_update.esit === false) {
                return paragraph_setChoiceText_confirm_res(paragraph_update);
            } else if (child_update.esit === false) {
                return paragraph_setChoiceText_confirm_res(child_update);
            } else {
                return paragraph_setChoiceText_confirm_res({ paragraph_infos: paragraph_infos, forced: force_availability }); // info per il padre
            }



        }
    });
}

function paragraph_setDelay_message(user_id, inc_struct, paragraph_infos, new_delay, choice_index) {
    let message_text;
    let to_return = { query_text: "🕗" };
    let buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]];


    console.log("SET_DELAY, Entro con: ");
    console.log("Indice scelta: " + choice_index);
    console.log("new delay: " + new_delay);
    console.log("Paragrafo: " + paragraph_infos.par_id);

    if (typeof paragraph_infos.par_id == "undefined") {
        choice_index = "DEFAULT"
    };

    if (isNaN(new_delay) || (new_delay != 0 && (new_delay < 2) || new_delay > 90)) {
        if (choice_index == "DEFAULT") {
            message_text = "🕗 *Imposta Attesa*\n";
            message_text += "_di default_\n\n";
            message_text += "• È il tempo minimo che si dovrà attendere per passare al paragrafo successivo.\n";
        } else {
            message_text = "🕗 *Imposta Attesa*\n";
            message_text += "_nel paragrafo " + paragraph_infos.par_id + "_\n\n";
            message_text += "• È il tempo minimo che si dovrà attendere per passare al paragrafo successivo.\n\n";
            message_text += "• Puoi specificarne uno diverso per ogni scelta\n";
            message_text += "• `0` per _nessuna attesa_\n";
        }
        if (isNaN(new_delay)) {
            message_text += "\n• Completa il comando con il tempo in minuti\n\n";
        } else {
            message_text += "• Deve essere compresa tra 2 e 90 minuti\n";
        }
        message_text += "• Sintassi: `/bardo #attesa `\\[minuti]\n";

        to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
    } else {
        let ch_list_index = -1

        if (choice_index == "DEFAULT") { // Per il default
            if (new_delay < 2) {
                new_delay = 2;
            }
            message_text = "🕗 *Attesa di Default*\n\n";
            buttons_array[0].unshift({ text: "✓", callback_data: "B:TMP:OPTION_CONFIRM:DELAY:" + new_delay });

            if (inc_struct.def_attesa) {
                message_text += "> Precedente: ";
                message_text += inc_struct.def_attesa + " minuti ";
                if (inc_struct.def_attesa > 60) {
                    message_text += "(1h";
                    if ((inc_struct.def_attesa - 60) == 1 || (inc_struct.def_attesa - 60) == 8 || (inc_struct.def_attesa - 60) == 1) {
                        message_text += " ed " + (inc_struct.def_attesa - 60) + "m)";
                    } else if ((inc_struct.def_attesa - 60) > 0) {
                        message_text += " e " + (inc_struct.def_attesa - 60) + "m)";
                    }
                }
                message_text += "\n";
            }

        } else if (choice_index) { // Ha premuto un bottone, è una scelta
            if (inc_struct.avv_ids.indexOf(paragraph_infos.par_id) < 0) {
                message_text = "*Woops!*\n\n";
                message_text += "Non mi risulta che " + paragraph_infos.par_id + " sia l'id di un paragrafo della tua bozza...";
                buttons_array[0].unshift({ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" });
                to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
                return (to_return);
            } else if (paragraph_infos.choices.length <= 0) {
                message_text = "*Woops!*\n\n";
                message_text += "Non mi risulta che tu abbia settato alcuna scelta per il paragrafo " + paragraph_infos.par_id + "..";
                buttons_array[0].unshift({ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id });
                to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
                return (to_return);
            }

            let curr_choice;
            let index;
            let dest_id;
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                if (paragraph_infos.choices[i].is_alternative) {
                    if (paragraph_infos.choices[i].alternative_id == choice_index) {
                        curr_choice = paragraph_infos.choices[i];
                        curr_choice.id = paragraph_infos.choices[i].alternative_id;
                        dest_id = curr_choice.dest_id;
                        index = i;
                        break;
                    }
                } else {
                    if (paragraph_infos.choices[i].id == choice_index) {
                        curr_choice = paragraph_infos.choices[i];
                        dest_id = curr_choice.id;
                        index = i;
                        break;
                    }
                }
            }

            if (!curr_choice) {
                message_text = "*Woops!*\n\n";
                message_text += "La struttura del paragrafo è cambiata, questo messaggio è obsoleto.";
                buttons_array[0].unshift({ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" });
                to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
                return (to_return);
            } else {
                ch_list_index = index;

                message_text = "*Attesa della " + (index + 1) + "° Scelta*";
                message_text += "\n_ nel paragrafo " + paragraph_infos.par_id + "_\n\n";

                message_text += "• Destinazione: `" + (dest_id) + "`\n";


                if (typeof curr_choice.become != "undefined" && curr_choice.become != "") {
                    message_text += "• Stato indotto dalla scelta: " + curr_choice.become + "\n";
                }
                if (typeof curr_choice.exclusive != "undefined" && curr_choice.exclusive.length > 0) {
                    if (curr_choice.exclusive.length == 1) {
                        message_text += "• Stato necessario: " + curr_choice.exclusive[0] + "\n";
                    } else if (curr_choice.exclusive.length > 1) {
                        message_text += "• Stati necessari: " + curr_choice.exclusive.join(", ") + "\n";
                    }
                } else if (typeof curr_choice.excluded != "undefined" && curr_choice.excluded.length > 0) {
                    if (curr_choice.excluded.length == 1) {
                        message_text += "• Stato escluso: " + curr_choice.excluded[0] + "\n";
                    } else {
                        message_text += "• Stati esclusi: " + curr_choice.excluded.join(", ") + "\n";
                    }
                }

                message_text += "\n> Precedente: ";
                if (curr_choice.delay == 0) {
                    message_text += "Istantanea ⚡️";
                } else {
                    message_text += curr_choice.delay + " minuti ";
                    if (curr_choice.delay > 60) {
                        message_text += "(1h";
                        if ((curr_choice.delay - 60) == 1 || (new_delay - 60) == 8 || (new_delay - 60) == 1) {
                            message_text += " ed " + (curr_choice.delay - 60) + "m)";
                        } else if ((curr_choice.delay - 60) > 0) {
                            message_text += " e " + (curr_choice.delay - 60) + "m)";
                        }
                    }
                    message_text += "\n";
                }

                buttons_array[0].unshift({ text: "✓", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_DELAY:" + curr_choice.id + ":" + new_delay });

                if (dest_id == curr_choice.id) {
                    buttons_array[0].unshift({ text: "➽", callback_data: "B:TMP:PRGPH:SELECT:" + curr_choice.id + ":TO_SEND" });
                } else {
                    buttons_array[0].unshift({ text: "➽", callback_data: "B:TMP:ALTERNATIVE:SELECT:" + curr_choice.id + ":TO_SEND" });
                }

                buttons_array[0].unshift({ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id + ":TO_SEND" });

            }

        } else { // Non ha ancora scelto...
            message_text = "*Imposta Attesa*\n_ nel paragrafo " + paragraph_infos.par_id + "_\n\n";
            message_text += "• Scegli la scelta per cui modificare il tempo d'attesa\n\n";
        }

        // NUOVO DELAY
        message_text += "> Nuova: ";
        if (new_delay == 0) {
            message_text += "Istantanea ⚡️";
        } else {
            message_text += new_delay + " minuti ";
            if (new_delay > 60) {
                message_text += "(1h";
                if ((new_delay - 60) == 1 || (new_delay - 60) == 8 || (new_delay - 60) == 1) {
                    message_text += " ed " + (new_delay - 60) + "m)";
                } else if ((new_delay - 60) > 0) {
                    message_text += " e " + (new_delay - 60) + "m)";
                }
            }
            message_text += "\n";
        }

        buttons_array[0].unshift({ text: "●", callback_data: "B:TMP:PRGPH:CH_DELAY:DEFAULT:" + new_delay });

        // BOTTONI
        if (paragraph_infos) {
            // LISTA SCELTE 
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                let tmp_text = [];
                if (i == ch_list_index) {
                    tmp_text.push("⦾")
                }
                let tmp_id = paragraph_infos.choices[i].id;
                if (paragraph_infos.choices[i].is_alternative) {
                    tmp_text.push("🔀");
                    tmp_id = paragraph_infos.choices[i].alternative_id;
                }
                if (paragraph_infos.choices[i].availability == "DAY") {
                    tmp_text.push("☀️");
                } else if (paragraph_infos.choices[i].availability == "NIGHT") {
                    tmp_text.push("🌙");
                } else if (paragraph_infos.choices[i].availability == "ALL") {
                    tmp_text.push("⭐");
                }
                tmp_text.push(paragraph_infos.choices[i].title_text);
                buttons_array.push([{ text: tmp_text.join(" "), callback_data: "B:TMP:PRGPH:CH_DELAY:" + tmp_id + ":" + new_delay }]);
            }
        }

        to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
    }

    return (to_return);
}

function paragraph_setChoiceDelay_confirm(user, cmds_array, inc_struct) {
    return new Promise(function (paragraph_setChoiceDelay) {

        console.log("Entro con: " + cmds_array.join(":"))
        let message_text = "";
        cmds_array[1] = Math.abs(parseInt(cmds_array[1]));


        if (isNaN(cmds_array[1]) || (cmds_array[1] != 0 && (cmds_array[1] < 2 || cmds_array[1] > 90))) {
            message_text = "*Ci hai provato!*\n\n";
            message_text = "• Ed hai guadagnato un biscotto 🍪\n";
            message_text = "• Se vuoi, inoltra a @nrc382\n";
            return paragraph_setChoiceDelay({ esit: false, text: message_text });
        } else if (inc_struct.avv_ids.indexOf(user.has_pending) < 0) {
            message_text = "*Woops!*\n\n";
            message_text += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return ({ esit: false, text: message_text });
        } else {
            return model.loadParagraph(user.id, user.has_pending).then(function (paragraph_infos) {
                let curr_choice_index = -1;

                let is_alternative = !checkParagraphID(cmds_array[0]);
                for (let i = 0; i < paragraph_infos.choices.length; i++) {
                    if (is_alternative) {
                        if (paragraph_infos.choices[i].alternative_id == cmds_array[0]) {
                            curr_choice_index = i;
                            break;
                        }
                    } else if (paragraph_infos.choices[i].id == cmds_array[0]) {
                        curr_choice_index = i;
                        break;
                    }
                }

                if (curr_choice_index < 0) {
                    message_text = "*Woops!*\n_codice scelta non valido!_\n\n";
                    if (paragraph_infos.choices.length == 1) {
                        message_text += "• Il paragrafo al momento ha solo una strada\n\n";
                        message_text += "• Usa\n· `/bardo  \nstrada #attesa " + cmds_array[1] + "`\n\n";
                    } else {
                        message_text += "• Le scelte nel paragrafo sono:\n";
                        for (let i = 0; i < paragraph_infos.choices.length; i++) {
                            message_text += "· `" + (i + 1) + "`° " + paragraph_infos.choices[i].title + "\n";
                        }
                        message_text += "\n• Usa:\n· `/bardo #strada #attesa" + cmds_array[1] + "`";
                    }
                    return paragraph_setChoiceDelay({ esit: false, text: message_text });
                } else {
                    paragraph_infos.choices[curr_choice_index].delay = cmds_array[1];
                    return model.updateParagraph(user.id, user.has_pending, paragraph_infos).then(function (update_res) {
                        if (update_res.esit === false) {
                            return paragraph_setChoiceDelay(update_res);
                        } else {
                            return paragraph_setChoiceDelay({ paragraph_infos: paragraph_infos, new_delay: cmds_array[1] }); // info per il padre
                        }
                    })
                }

            });
        }
    });
}

function paragraph_setOptions_message(user_id, inc_struct, paragraph_infos) {
    let message_text;
    let to_return = {};
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]];

    if (!inc_struct.avv_ids || inc_struct.avv_ids.indexOf(paragraph_infos.par_id) < 0) {
        message_text = "*Woops!*\n\n";
        message_text += "Non mi risulta che " + paragraph_infos.par_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id);
    } else {
        buttons_array = [[
            { text: " ⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id },
            { text: "⨷", callback_data: "B:FORGET" }
        ]];

        if (paragraph_infos.father_id == 0) {
            message_text = "*Woops...*\n\n";
            message_text += "Non è possibile modificare alcun opzione dell'inizio avventura.";
            to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
        } else {
            message_text = "⌥" + " *\"" + paragraph_infos.choice_title + "\"*\n";
            message_text += "_#opzioni paragrafo " + paragraph_infos.par_id + "_\n\n";

            if (paragraph_infos.esit_type == -1) {
                message_text += "🌑 Fine avventura, esito negativo\n";
            } else if (paragraph_infos.esit_type == 1) {
                message_text += "🌕 Fine avventura, esito positivo\n";
            } else {
                message_text += "📜 " + paragraph_infos.level_deep + "° scelta\n";
            }

            let availability_line = " Selezionabile: ";
            if (paragraph_infos.availability == "NIGHT") {
                availability_line = "🌙" + availability_line + "di Notte \n";
            } else if (paragraph_infos.availability == "DAY") {
                availability_line = "☀️" + availability_line + "di Giorno ️\n";
            } else {
                availability_line = "⭐" + availability_line + "Sempre \n";
            }
            message_text += availability_line;


            //MOB


            // STATO: ( become, (exclusive || excluded ) )
            message_text += "\n❤️ Sullo stato giocatore: \n";
            if (typeof paragraph_infos.become != "undefined" && paragraph_infos.become.length > 0) {
                message_text += "• Imposto: " + paragraph_infos.become + "\n";
            } else {
                message_text += "• Nessun cambiamento \n";
            }

            if (typeof paragraph_infos.exclusive != "undefined" && paragraph_infos.exclusive.length > 0) {
                if (paragraph_infos.exclusive.length == 1) {
                    message_text += "• Necessario: " + paragraph_infos.exclusive[0] + "\n";
                } else if (paragraph_infos.exclusive.length > 1) {
                    message_text += "• Necessari: " + paragraph_infos.exclusive.join(", ") + "\n";
                }
            } else if (typeof paragraph_infos.excluded != "undefined" && paragraph_infos.excluded.length > 0) {
                if (paragraph_infos.excluded.length == 1) {
                    message_text += "• Escluso: " + paragraph_infos.excluded[0] + "\n";
                } else {
                    message_text += "• Esclusi: " + paragraph_infos.excluded.join(", ") + "\n";
                }
            } else {
                message_text += "• Nessuna condizione\n";
            }

            // DROP ( (show || ask ), take)

            // SCELTE  (has_visit || hasnot_visit )

            // STAT (min_stat, max_stat)




            buttons_array.push([
                { text: "☠", callback_data: 'B:TMP:PRGPH:CH_ESIT:' + paragraph_infos.par_id },
            ]);

            if (paragraph_infos.availability == "DAY") {
                buttons_array[1].push(
                    //{ text: "⭐", callback_data: 'B:TMP:PRGPH:AVAILABILITY:ALL:' + paragraph_infos.par_id },
                    { text: "🌙", callback_data: 'B:TMP:PRGPH:AVAILABILITY:NIGHT:' + paragraph_infos.par_id }
                );
            } else if (paragraph_infos.availability == "NIGHT") {
                buttons_array[1].push(
                    { text: "⭐", callback_data: 'B:TMP:PRGPH:AVAILABILITY:ALL:' + paragraph_infos.par_id },
                    //{ text: "☀️️", callback_data: 'B:TMP:PRGPH:AVAILABILITY:DAY:' + paragraph_infos.par_id }
                );
            } else {
                buttons_array[1].push(
                    { text: "☀️️", callback_data: 'B:TMP:PRGPH:AVAILABILITY:DAY:' + paragraph_infos.par_id },
                    //{ text: "🌙", callback_data: 'B:TMP:PRGPH:AVAILABILITY:NIGHT:' + paragraph_infos.par_id }
                );
            }
            buttons_array[1].push(
                { text: "❤️", callback_data: 'B:TMP:PRGPH:CH_STATUS:' + paragraph_infos.par_id + ":0" },
                { text: "📦", callback_data: 'B:TMP:PRGPH:ITEM:0' },
                { text: "➽", callback_data: 'B:TMP:PRGPH:CH_NEEDED:' + paragraph_infos.par_id + ":0" },
                { text: "🎴", callback_data: 'B:TMP:PRGPH:FIGU:' + paragraph_infos.par_id + ":0" },
                { text: "🐗", callback_data: 'B:TMP:PRGPH:MOB:' + paragraph_infos.par_id + ":0" }
            );

            to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
        }
    } //   

    return (to_return);
}


// exclusive, excluded, become
function paragraph_setChoiceStatus_message(user_id, inc_struct, paragraph_infos, page_n, is_alternative) {
    let message_text;
    let to_return = {};

    if (!inc_struct.avv_ids || inc_struct.avv_ids.indexOf(paragraph_infos.par_id) < 0) {
        message_text = "*Woops!*\n\n";
        message_text += "Non mi risulta che " + paragraph_infos.par_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let buttons_array = [];

        if (paragraph_infos.father_id == 0) {
            message_text = "*Woops...*\n\n";
            message_text += "L'inizio avventura non può portare a cambiamenti di stato.\nSfrutta uno dei paragrafi successivi!";
            to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
        } else {
            if (page_n == 0) {
                message_text = "❤️ *Stato del giocatore*\n";
                let alternative_text = ":NO";
                let become;
                let excluded;
                let exclusive;

                if (is_alternative == false) {
                    message_text += "_paragrafo " + paragraph_infos.par_id + "_\n";
                    message_text += "_\"" + paragraph_infos.choice_title + "\"_\n";

                    become = paragraph_infos.become;
                    excluded = paragraph_infos.excluded;
                    exclusive = paragraph_infos.exclusive;
                } else {
                    message_text += "_alternativa in " + paragraph_infos.par_id + "_\n";
                    alternative_text = ":ALT:" + is_alternative;

                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        if (paragraph_infos.choices[i].alternative_id == is_alternative) {
                            become = paragraph_infos.choices[i].become;
                            excluded = paragraph_infos.choices[i].excluded;
                            exclusive = paragraph_infos.choices[i].exclusive;
                            message_text += "\n• Per il paragrafo " + is_alternative + "\n\"" + paragraph_infos.choices[i].title_text + "\"\n";
                            break;
                        }
                    }
                }

                message_text += "\n• Ogni scelta può modificare lo stato del giocatore ed/o essere visibile solo a chi si trova in un particolare stato.\n";
                message_text += "\n• Puoi modificare quest'opzione a piacimento.\n"; // ❤️🤤😴🥴😨🙂😤



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
                    message_text += "\n• Nessuna opzione impostata\n";

                } else {
                    message_text += "\n*Opzioni attuali:* \n" + stato_line;
                }

                buttons_array.unshift([
                    { text: "🤤", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.par_id + ":1" + alternative_text },
                    { text: "😴", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.par_id + ":2" + alternative_text },
                    { text: "🥴", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.par_id + ":3" + alternative_text },
                    { text: "😨", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.par_id + ":4" + alternative_text },
                    { text: "😤", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.par_id + ":5" + alternative_text },
                    { text: "🙂", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.par_id + ":6" + alternative_text }
                ]); //
                buttons_array.unshift([
                    { text: "⨓", callback_data: ("B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id) },
                    { text: "⌥", callback_data: ("B:TMP:PRGPH:OPTIONS:" + paragraph_infos.par_id) },
                    { text: "⨷", callback_data: "B:FORGET" }
                ]);
                if (is_alternative != false) {
                    buttons_array[0][1].callback_data = ("B:TMP:ALTERNATIVE:SELECT:DEST:" + is_alternative);
                    buttons_array[0].splice(1, 0, { text: "↧", callback_data: ("B:TMP:PRGPH:SELECT:" + is_alternative) });
                }
            } else {
                let propouse_type = "";
                let propouse_text = "";

                let info_text = "";
                if (page_n == 1) {
                    message_text = "🤤 *Intossicato*\n";
                    propouse_type = "🤤";
                    propouse_text = "Viene intossicato";
                    info_text = "_«Probabilmente per via dell'assunzione o dell'inalazione di qualche strano composto, il giocatore si sente intorpidito, disorientato...»_";
                } else if (page_n == 2) {
                    message_text = "😴 *Stanco*\n";
                    propouse_type = "😴";
                    propouse_text = "Si stanca";
                    info_text = "_«Eccessivo sforzo, sonnifero, troppo ragionar? Qualunque sia la causa, il giocatore sembra diventato un bradipo.»_";
                } else if (page_n == 3) {
                    message_text = "🥴 *Confuso*\n";
                    propouse_type = "🥴";
                    propouse_text = "Si confonde";
                    if (intIn(0, 9) == 1) {
                        info_text = "_«Così confuso da colpir... 🙊»_";
                    } else {
                        info_text = "_«C...cosa??»_";
                    }
                } else if (page_n == 4) {
                    message_text = "😨 *Spaventato*\n";
                    propouse_type = "😨";
                    propouse_text = "Si spaventa";
                    info_text = "_«Esistono molte ragioni per cui anche il cuore più impavido possa ritrovarsi a vacillare...»_";
                } else if (page_n == 5) {
                    message_text = "😤 *Concentrato*\n";
                    propouse_text = "Si concentra";
                    propouse_type = "😤";
                    info_text = "_«Meditazione, collera, determinazione? Non importa come ne perchè: il giocatore è al massimo delle sue capacità!»_";
                } else if (page_n == 6) {
                    message_text = "🙂 *Normale*\n";
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
                    message_text += "_paragrafo " + paragraph_infos.par_id + "_\n";
                    message_text += "_\"" + paragraph_infos.choice_title + "\"_\n";
                } else {
                    message_text += "_alternativa in " + paragraph_infos.par_id + "_\n";
                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        if (paragraph_infos.choices[i].id == is_alternative) {
                            message_text += "\n• Per il paragrafo " + is_alternative + "\n\"" + paragraph_infos.choices[i].title_text + "\"\n";
                            break;
                        }
                    }
                    alternative_text = ":ALT:" + is_alternative;
                }
                message_text += "\n" + info_text;




                buttons_array.unshift(
                    [{ text: propouse_text, callback_data: "B:TMP:OPTION_CONFIRM:STATUS:" + propouse_type + ":BECOME" + alternative_text }],
                    [{ text: "Deve esserlo ", callback_data: "B:TMP:OPTION_CONFIRM:STATUS:" + propouse_type + ":MUSTBE" + alternative_text }],
                    [{ text: "Non deve esserlo ", callback_data: "B:TMP:OPTION_CONFIRM:STATUS:" + propouse_type + ":MUSTNOT" + alternative_text }]
                ); // 

                buttons_array.unshift([
                    { text: "⨓", callback_data: ("B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id) },
                    { text: "❤️", callback_data: "B:TMP:PRGPH:CH_STATUS:" + paragraph_infos.par_id + ":0" + alternative_text },
                    { text: "⨷", callback_data: "B:FORGET" }
                ]);

            }



            to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
        }
    } //   

    return (to_return);
}

function paragraph_setChoiceStatus_confirm(user_id, query_text, inc_struct, new_status, status_type, is_alternative) { // 0, -1, 1 (CONTINUE, NEGATIVE, POSITIVE)
    return new Promise(async function (setChoiceType_res) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[1];
        if (is_alternative) {
            curr_paragraph_id = splitted_imputText[1].split(" ")[2];
        }

        if (inc_struct.avv_ids.indexOf(curr_paragraph_id) < 0) {
            message_text = "*Woops!*\n\n";
            message_text += "Non mi risulta che " + curr_paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return setChoiceType_res({ esit: false, text: message_text });
        } else {
            let paragraph_infos = await model.loadParagraph(user_id, curr_paragraph_id);

            if (paragraph_infos.esit == false) {
                return setChoiceType_res(paragraph_infos);
            }


            if (status_type == "MUSTNOT") {
                if (is_alternative == false) {


                    if (new_status == "CLEAR") {
                        delete paragraph_infos.excluded;
                    } else {
                        if (!("excluded" in paragraph_infos)) {
                            paragraph_infos.excluded = [];
                        }
                        paragraph_infos.excluded.push(new_status);
                    }
                } else {
                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        if (paragraph_infos.choices[i].id == is_alternative) {
                            if (new_status == "CLEAR") {
                                delete paragraph_infos.choices[i].excluded;
                            } else {
                                if (!("excluded" in paragraph_infos.choices[i])) {
                                    paragraph_infos.choices[i].excluded = [];
                                }
                                paragraph_infos.choices[i].excluded.push(new_status);
                            }
                            break;
                        }
                    }
                }
            } else if (status_type == "MUSTBE") {
                if (is_alternative == false) {



                    if (new_status == "CLEAR") {
                        delete paragraph_infos.exclusive;
                    } else {
                        if (!("exclusive" in paragraph_infos)) {
                            paragraph_infos.exclusive = [];
                        }
                        console.log("> semplice: " + ("exclusive" in paragraph_infos))
                        console.log("> negata: " + !("exclusive" in paragraph_infos))

                        console.log(paragraph_infos);

                        paragraph_infos.exclusive.push(new_status);
                    }
                } else {
                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        if (paragraph_infos.choices[i].id == is_alternative) {
                            if (new_status == "CLEAR") {
                                delete paragraph_infos.choices[i].exclusive;
                            } else {
                                if (!("exclusive" in paragraph_infos.choices[i])) {
                                    paragraph_infos.choices[i].exclusive = [];
                                }
                                paragraph_infos.choices[i].exclusive.push(new_status);
                            }
                            break;
                        }
                    }
                }

            } else if (status_type == "BECOME") {
                if (is_alternative == false) {


                    if (new_status == "CLEAR") {
                        delete paragraph_infos.become;
                    } else {
                        paragraph_infos.become = new_status;
                    }

                } else {
                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        if (paragraph_infos.choices[i].id == is_alternative) {
                            if (new_status == "CLEAR") {
                                delete paragraph_infos.become;
                            } else {
                                paragraph_infos.choices[i].delete(become);
                            }
                            break;
                        }
                    }
                }

            }

            let update_res = await model.updateParagraph(user_id, curr_paragraph_id, paragraph_infos);

            if (update_res.esit === false) {
                return setChoiceType_res(update_res);
            } else {
                return setChoiceType_res({ paragraph_infos: paragraph_infos, new_esit: new_status }); // info per il padre
            }

        }
    });
}

// give, ask, take
function paragraph_setChoiceDrop_message(user, inc_struct, paragraph_infos, page_n, is_alternative, has_select) {
    let message_text = "";
    let to_return = {};

    if (!inc_struct.avv_ids || inc_struct.avv_ids.indexOf(paragraph_infos.par_id) < 0) {
        message_text = "*Woops!*\n\n";
        message_text += "Non mi risulta che " + paragraph_infos.par_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let buttons_array = [];
        if (has_select != false) {
            console.log("Has select!! " + has_select);
        }

        if (paragraph_infos.father_id == 0) {
            message_text = "*Woops...*\n\n";
            message_text += "L'inizio avventura non può portare a drop ne richieste di oggetti.\nSfrutta uno dei paragrafi successivi!";
            to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
        } else {
            buttons_array.push([
                { text: "⨓", callback_data: ("B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id) },
                { text: "⌥", callback_data: ("B:TMP:PRGPH:OPTIONS:" + paragraph_infos.par_id) },
                { text: "⨷", callback_data: "B:FORGET" }
            ]);

            let alt_integrative = ":NO";
            let integrative_text = "";
            if (is_alternative == false) {
                message_text += "_paragrafo " + paragraph_infos.par_id + "_\n";
                message_text += "_\"" + paragraph_infos.choice_title + "\"_\n";
            } else {
                message_text += "_alternativa in " + paragraph_infos.par_id + "_\n";
                alt_integrative = ":ALT:" + is_alternative;

                for (let i = 0; i < paragraph_infos.choices.length; i++) {
                    if (paragraph_infos.choices.is_alternative == true && paragraph_infos.choices[i].father_id == is_alternative) {
                        message_text += "_\"" + paragraph_infos.choices[i].title_text + "\"_\n";
                        break;
                    }
                }
                buttons_array[0][1].callback_data = ("B:TMP:ALTERNATIVE:SELECT:DEST:" + is_alternative);
                buttons_array[0].splice(1, 0, { text: "↧", callback_data: ("B:TMP:PRGPH:SELECT:" + is_alternative) });

            }
            if (is_alternative == false) {
                integrative_text += "la strada";
            } else {
                integrative_text += "l'alternativa";
            }

            if (has_select != false) {
                console.log("Has select!! Id oggetto: " + has_select);
            } else if (page_n == 0) {
                message_text = "📦 *Drop e Richieste*\n" + message_text;
                message_text += "\nAl giocatore che seleziona " + integrative_text + ": ";


                message_text += "\n✨ Puoi richiedere che esibisca un oggetto";
                message_text += "\n🎁 Puoi donare un oggetto";
                message_text += "\n🐾 Puoi togliere un oggetto\n";

                message_text += "\n• Puoi modificare queste opzioni a piacimento"; // ❤️🤤😴🥴😨🙂😤
                buttons_array.push([
                    { text: "✨", callback_data: 'B:TMP:PRGPH:ITEM:2' + alt_integrative },
                    { text: "🎁", callback_data: 'B:TMP:PRGPH:ITEM:1' + alt_integrative },
                    { text: "🐾", callback_data: 'B:TMP:PRGPH:ITEM:3' + alt_integrative }
                ]); // 
            } else {
                buttons_array[0].unshift({ text: "📦", callback_data: 'B:TMP:PRGPH:ITEM:0' + alt_integrative });

                let page_starter;
                let creati;
                let base;
                let speciali;

                if (page_n == 1 || page_n == 4 || page_n == 5 || page_n == 6) {
                    message_text = "🎁 *Dai...*\n" + message_text;
                    creati = all_items.creabili.filter(function (el) { return el.dropable == true });
                    base = all_items.base.filter(function (el) { return el.type == "B1" });
                    speciali = all_items.base.filter(function (el) { return (el.type == "B2" || el.type == "B3") });
                    page_starter = 4;
                    message_text += "\n• Scelta " + integrative_text + ", il giocatore riceverà l'oggetto.";

                } else if (page_n == 2 || page_n == 7 || page_n == 8 || page_n == 9) {
                    message_text = "✨ *Richiedi...*\n" + message_text;

                    creati = Array.from(new Set(all_items.creabili));
                    base = all_items.base.filter(function (el) { return el.type == "B1" });
                    speciali = all_items.base.filter(function (el) { return (el.type == "B2" || el.type == "B3") });
                    page_starter = 7;
                    message_text += "\n• Se il giocatore non possiede l'oggetto, non vedrà " + integrative_text + ".";

                } else if (page_n == 3 || page_n == 10 || page_n == 11 || page_n == 12) {
                    message_text = "🐾 *Togli...*\n" + message_text;

                    creati = all_items.creabili.filter(function (el) { return el.flushable == true });
                    base = all_items.base.filter(function (el) { return el.type == "B1" });
                    speciali = all_items.base.filter(function (el) { return (el.type == "B2" || el.type == "B3") });
                    page_starter = 10;
                    message_text += "\n• Se il giocatore non possiede l'oggetto, non vedrà " + integrative_text + ".";
                    message_text += "\n• Scelta " + integrative_text + ", il giocatore perderà l'oggetto.";

                }


                if (page_n <= 3) {
                    message_text += "\n• Puoi scegliere tra " + (base.length + speciali.length + creati.length) + " oggetti, divisi nelle categorie:";

                    buttons_array.push([
                        { text: "Base", callback_data: 'B:TMP:PRGPH:ITEM:' + page_starter + alt_integrative },
                        { text: "Speciali", callback_data: 'B:TMP:PRGPH:ITEM:' + (page_starter + 1) + alt_integrative },
                        { text: "Creati", callback_data: 'B:TMP:PRGPH:ITEM:' + (page_starter + 2) + alt_integrative }
                    ]);
                } else {

                    let curr_case = [];

                    if (page_n == 4 || page_n == 7 || page_n == 10) {
                        // message_text += "\n• La quantità è fissata ad \"un pezzo di...\" "; // 4
                        // message_text += "\n• La quantità sarà generata caso per caso, in range.\n\n"; // 5

                        curr_case = base;
                    } else if (page_n == 5 || page_n == 8 || page_n == 11) {
                        curr_case = speciali;
                    } else if (page_n == 6 || page_n == 9 || page_n == 12) {
                        if (user.b_point < 10) {
                            creati = creati.filter(function (el) { return el.type == "C1" });
                        } else if (user.b_point < 20) {
                            creati = creati.filter(function (el) { return (el.type == "C1" || el.type == "C2") });
                        }
                        curr_case = creati;
                    }
                    let tmp_line = [];
                    let unique_names = [];
                    for (let i = 0; i < curr_case.length; i++) {
                        if (unique_names.indexOf(curr_case[i].name) < 0) {
                            unique_names.push(curr_case[i].name);
                            if (curr_case[i].name.length <= 7) {
                                tmp_line.push({ text: curr_case[i].name, callback_data: 'B:TMP:PRGPH:ITEM:1' + alt_integrative + ":D:" + curr_case[i].id });
                            } else if (buttons_array[(buttons_array.length - 1)].length == 1 && (buttons_array[(buttons_array.length - 1)][0].text.length + curr_case[i].name.length) < 20) {
                                buttons_array[(buttons_array.length - 1)].push({ text: curr_case[i].name, callback_data: 'B:TMP:PRGPH:ITEM:1' + alt_integrative + ":D:" + curr_case[i].id });
                            } else if (tmp_line.length == 1 && (tmp_line[0].text.length + curr_case[i].name.length) < 20) {
                                buttons_array.push([tmp_line[0], { text: curr_case[i].name, callback_data: 'B:TMP:PRGPH:ITEM:1' + alt_integrative + ":D:" + curr_case[i].id }]);
                                tmp_line = [];
                            } else {
                                buttons_array.push([{ text: curr_case[i].name, callback_data: 'B:TMP:PRGPH:ITEM:1' + alt_integrative + ":D:" + curr_case[i].id }]);
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
                        { text: "↵", callback_data: 'B:TMP:PRGPH:ITEM:' + page_n + alt_integrative },
                    ]);
                }

            }

            to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
        }
    } //   

    return (to_return);
}


// has_visit, hasnot_visit

// max_stat, min_stat


function paragraph_setChoiceEsit_message(user_id, inc_struct, paragraph_infos) {
    let message_text;
    let to_return = {};

    if (!inc_struct.avv_ids || inc_struct.avv_ids.indexOf(paragraph_infos.par_id) < 0) {
        message_text = "*Woops!*\n\n";
        message_text += "Non mi risulta che " + paragraph_infos.par_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let buttons_array = [];

        if (paragraph_infos.father_id == 0) {
            message_text = "*Woops...*\n\n";
            message_text += "Non è possibile modificare il _tipo_ dell'inizio avventura.";
            to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
        } else {
            message_text = "⨓ *Esito Strada*\n";
            message_text += "_paragrafo " + paragraph_infos.par_id + "_\n";
            if (paragraph_infos.esit_type == 0) {
                message_text += "\n• Scegliendo un esito, termini il ramo dell'avventura con questo paragrafo.\n";
                if (paragraph_infos.choices.length > 0) {
                    //message_text += "\n• Scegliendo una fine, positiva o negativa, " ;
                    if (paragraph_infos.choices.length == 1) {
                        message_text += "\n• La strada che avevi impostato sarà disabilitata.\n";
                    } else {
                        message_text += "\n• Le " + paragraph_infos.choices.length + " strade che avevi impostato saranno disabilitate.\n";
                    }
                }
                message_text += "\n• Puoi modificare l'opzione a piacimento.\n";

                buttons_array.unshift([
                    { text: "🌚", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_IS_NEGATIVE:" },
                    { text: "🌝", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_IS_POSITIVE:" },
                ]);


            } else {
                message_text += "\n• Il paragrafo porta attualmente ad una fine " + (paragraph_infos.esit_type == -1 ? "negativa." : "positiva.");
                if (paragraph_infos.choices.length > 0) {
                    message_text += "\n• Aprendolo, riabiliterai ";
                    if (paragraph_infos.choices.length == 1) {
                        message_text += "la strada che avevi impostato in precedenza.\n";
                    } else {
                        message_text += "le " + paragraph_infos.choices.length + " strade che avevi impostato in precedenza.\n";
                    }
                }
                buttons_array.unshift([{ text: "🌍", callback_data: "B:TMP:OPTION_CONFIRM:CHOICE_IS_OPEN:" }]);
            }
            buttons_array.unshift([
                { text: "⨓", callback_data: ("B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id) },
                { text: "⌥", callback_data: ("B:TMP:PRGPH:OPTIONS:" + paragraph_infos.par_id) },
                { text: "⨷", callback_data: "B:FORGET" }
            ]);

            to_return.toSend = simpleMessage(message_text, user_id, buttons_array);
        }
    } //   

    return (to_return);
}

function paragraph_setChoiceEsit_confirm(user_id, query_text, inc_struct, to_parse_type) { // 0, -1, 1 (CONTINUE, NEGATIVE, POSITIVE)
    return new Promise(function (setChoiceType_res) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[1];
        let type = (to_parse_type == "CHOICE_IS_NEGATIVE" ? -1 : (to_parse_type == "CHOICE_IS_POSITIVE" ? 1 : 0))

        if (inc_struct.avv_ids.indexOf(curr_paragraph_id) < 0) {
            message_text = "*Woops!*\n\n";
            message_text += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return setChoiceType_res({ esit: false, text: message_text });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (paragraph_infos) {
                if (paragraph_infos.esit == false) {
                    return setChoiceType_res(paragraph_infos);
                }
                return model.loadParagraph(user_id, paragraph_infos.father_id).then(function (father_paragraph_infos) {
                    if (father_paragraph_infos.esit == false) {
                        return setChoiceType_res(father_paragraph_infos);
                    }

                    paragraph_infos.esit_type = type;
                    for (let i = 0; i < father_paragraph_infos.choices.length; i++) {
                        if (father_paragraph_infos.choices[i].id == paragraph_infos.par_id) {
                            father_paragraph_infos.choices[i].esit_type = type;
                            break;
                        }
                    }

                    if (!('level_deep' in father_paragraph_infos)) {
                        if (inc_struct.avv_ids[0] == father_paragraph_infos.par_id) {
                            father_paragraph_infos.level_deep = 0;
                        }
                    }
                    if (!('level_deep' in paragraph_infos) || paragraph_infos.level_deep == null) {
                        if (('level_deep' in father_paragraph_infos)) {
                            paragraph_infos.level_deep = father_paragraph_infos.level_deep + 1;
                        }
                    }

                    return model.updateParagraph(user_id, curr_paragraph_id, paragraph_infos).then(function (update_res) {
                        return model.updateParagraph(user_id, father_paragraph_infos.par_id, father_paragraph_infos).then(function (child_update_res) {
                            if (update_res.esit === false) {
                                return setChoiceType_res(update_res);
                            } else if (child_update_res.esit === false) {
                                return setChoiceType_res(child_update_res);
                            } else {
                                return setChoiceType_res({ paragraph_infos: paragraph_infos, new_esit: type }); // info per il padre
                            }
                        });
                    });
                });
            });
        }
    });
}

function paragraph_setChoiceAvailability_manager(user, in_query, options_array) {
    return new Promise(async function (setAv_res) {
        const inc_struct = await model.getUserDaft(user.id);
        const paragraph_infos = await model.loadParagraph(user.id, options_array[5]);
        if (paragraph_infos.esit == false) {
            return setAv_res(paragraph_infos);
        }
        const father_paragraph_infos = await model.loadParagraph(user.id, paragraph_infos.father_id);
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
                    to_return.toEdit = simpleMessage(message_text, user.id, [[
                        //                                        {text: "Scelte ⨓ " + father_paragraph_infos.par_id, callback_data: "B:TMP:PRGPH:SELECT:" + father_paragraph_infos.par_id },
                        { text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id },
                        { text: "⨷", callback_data: "B:FORGET" }
                    ]]);
                    to_return.query = { id: in_query.id, options: { text: "⚠️\n\nScelta Ripetuta!", show_alert: true, cache_time: 4 } };
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
        const update_res = await model.updateParagraph(user.id, paragraph_infos.par_id, paragraph_infos);
        const father_update_res = await model.updateParagraph(user.id, father_paragraph_infos.par_id, father_paragraph_infos);

        if (update_res.esit === false) {
            return setAv_res(update_res);
        } else if (father_update_res.esit === false) {
            return setAv_res(father_update_res);
        } else {
            let to_return_1 = {};
            to_return_1.toEdit = paragraph_setOptions_message(user.id, inc_struct, paragraph_infos).toSend;
            let query_text;
            if (options_array[4] == "DAY") {
                query_text = "☀️️\n\nScelta selezionabile solo di giorno";
            } else if (options_array[4] == "NIGHT") {
                query_text = "🌙\n\nScelta selezionabile solo di notte";
            } else {
                query_text = "☀️️ 🌙\n\nScelta selezionabile di giorno e di notte";
            }
            to_return_1.query = { id: in_query.id, options: { text: query_text, show_alert: true, cache_time: 4 } };
            return setAv_res(to_return_1);
        }
    });
}

// **********
function paragraph_manageAlternative_message(user, inc_struct, alternative_text, page_array, paragraph_infos) {
    let message_text;

    let to_return = { toSend: {}, query_text: "🔀" };


    if (inc_struct.avv_ids.indexOf(user.has_pending) <= 0) {
        message_text = "*Woops!*\n\n";
        message_text += "Non puoi aggiungere un'alternativa al primo paragrafo dell'avventura, ma puoi creare scelte che riportino qui!";
        to_return.toSend = simpleMessage(message_text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
    } else {
        let buttons_array = [];
        if (page_array[0] == "ADD") {
            if (alternative_text.length <= 0) {
                message_text = "🔀" + " *Nuova Alternativa*\n\n";
                message_text += "Le _alternative_ sono strade che riportano ad un paragrafo già impostato.\n\n";
                message_text += "• Per aggiungerene una al paragrafo " + user.has_pending + ", completa il comando con il testo da mostrare nel bottone\n";
                message_text += "\nAd Esempio:\n• `/bardo #alternativa `\n  Corri!\n\n";

                buttons_array = [[{ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + user.has_pending }, { text: "▤", callback_data: "B:TMP:PRGPH:SELECT" }, { text: "⨷", callback_data: "B:FORGET" }]];
                to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
            } else if (alternative_text.length < 3) {
                message_text = "*Woops!*\n_Testo alternativa troppo corto_\n\n";
                message_text += "\"_" + alternative_text + "_\"\n\n";
                to_return.toSend = simpleMessage(message_text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
            } else if (alternative_text.length > 30) {
                message_text = "*Woops!*\n_Testo alternativa troppo lungo_\n\n";
                message_text += "\"_" + alternative_text + "_\"\n\n";
                message_text += "• Per essere leggibile in un bottone, il testo di una alternativa non può essere più lungo di 30 caratteri.\n(extra: +" + (alternative_text.length - 30) + ")";
                to_return.toSend = simpleMessage(message_text, user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
            } else {
                let is_first = (inc_struct.avv_ids[0] == user.has_pending);
                buttons_array = [[{ text: "Annulla ⨷", callback_data: "B:FORGET" }]];

                message_text = "🔀" + " *Nuova Alternativa*\n";
                message_text += "_nel paragrafo_ `" + user.has_pending + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";
                message_text += "> _" + alternative_text + "_\n\n";


                let page_n = 0;

                if (checkParagraphID(page_array[1]) == true) {
                    let p_name = "";
                    for (let i = 0; i < inc_struct.avv_pcache.length; i++) {
                        if (inc_struct.avv_pcache[i].id == page_array[1]) {
                            p_name = typeof inc_struct.avv_pcache[i].title != "undefined" ? inc_struct.avv_pcache[i].title : "Inizio";

                            if (inc_struct.avv_pcache[i].id == user.has_pending) {
                                message_text += "⨓  Vicolo Cieco in:  _" + p_name + "_\n";
                            } else {
                                message_text += "↧  Destinazione:  _" + p_name + "_ (" + page_array[1] + ")\n";
                            }

                            buttons_array = [[
                                { text: "↧", callback_data: "B:TMP:PRGPH:SELECT:" + page_array[1] + ":TO_SEND" },
                                { text: "✓", callback_data: "B:TMP:OPTION_CONFIRM:NEW_ALTERNATIVE:" + page_array[1] },
                                { text: "⨷", callback_data: "B:FORGET" }
                            ]];
                            break;
                        }
                    }
                } else if (!isNaN(parseInt(page_array[1]))) {

                    page_n = parseInt(page_array[1]);
                    if (page_n > 0) {
                        buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]];
                    }
                    message_text += "• Seleziona una Destinazione\n";

                }

                if (inc_struct.avv_ids.length != inc_struct.avv_pcache.length) {
                    message_text += "\n*∿ Fuori sync* " + inc_struct.avv_pcache.length + "/" + inc_struct.avv_ids.length + "\n• Segnala a @nrc382\n";
                    buttons_array[0].push({ text: "↺", callback_data: "B:TMP:LIST_UPDATE:" });  //∿ fuori sync
                }

                addParagraphButtons(inc_struct, page_n, buttons_array, user, "B:TMP:ALTERNATIVE:NEW:ADD:");
                buttons_array[0].splice(1, 0, { text: "🌱", callback_data: "B:TMP:ALTERNATIVE:NEW:ADD:" + inc_struct.avv_ids[0] })

                to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
            }
        } else if (page_array[0] == "TARGET") {
            buttons_array = [[{ text: "↵", callback_data: "B:TMP:ALTERNATIVE:SELECT:" + page_array[1] }]];
            message_text = "🔀" + " *Modifica Destinazione*\n";

            if (!paragraph_infos.choices || paragraph_infos.choices.length <= 0) {
                to_return.query_text = "Woops!";
                buttons_array[0].push({ text: "⨷", callback_data: "B:FORGET" });
                to_return.toSend = simpleMessage("*Woops!*\n\nNon mi risulta che il paragrafo abbia alcuna scelta!", user.id, buttons_array);
            } else {
                let curr_dest = -1;
                for (let i = 0; i < paragraph_infos.choices.length; i++) {
                    if (paragraph_infos.choices[i].alternative_id == page_array[1]) {
                        curr_dest = paragraph_infos.choices[i].dest_id;
                        message_text += "_ per \"" + paragraph_infos.choices[i].title_text + "\"_\n\n";
                        message_text += "• Nel paragrafo: \"" + paragraph_infos.choice_title + "\"\n\n";
                    }
                }

                for (let i = 0; i < inc_struct.avv_pcache.length; i++) {
                    if (inc_struct.avv_pcache[i].id == curr_dest) {
                        tmp_curr = inc_struct.avv_pcache[i].title;
                        message_text += "↧  Attuale:  _" + (tmp_curr ? tmp_curr : "Inizio") + "_ (" + curr_dest + ")\n\n";
                        break;
                    }
                }

                let page_n = 0;

                if (checkParagraphID(page_array[2]) == true) {
                    let tmp_new;

                    for (let i = 0; i < inc_struct.avv_pcache.length; i++) {
                        if (inc_struct.avv_pcache[i].id == page_array[2]) {
                            tmp_new = typeof inc_struct.avv_pcache[i].title != "undefined" ? inc_struct.avv_pcache[i].title : "Inizio";

                            if (inc_struct.avv_pcache[i].id == user.has_pending) {
                                message_text += "•  Vicolo Cieco in:  _" + tmp_new + "_\n";
                            } else {
                                message_text += "↧  Nuova:  _" + tmp_new + "_ (" + page_array[2] + ")\n";
                            }

                            buttons_array = [[
                                { text: "↵", callback_data: "B:TMP:ALTERNATIVE:SELECT:" + page_array[1] },
                                { text: "↧", callback_data: "B:TMP:PRGPH:SELECT:" + page_array[2] + ":TO_SEND" },
                                { text: "🌱", callback_data: "B:TMP:ALTERNATIVE:TARGET:" + page_array[1] + ":" + inc_struct.avv_ids[0] },
                                { text: "✓", callback_data: "B:TMP:ALTERNATIVE:CH:T:" + page_array[1] + ":" + page_array[2] }
                            ]];
                            break;
                        }
                    }

                } else {
                    message_text += "• Seleziona una nuova Destinazione\n";

                    if (!isNaN(parseInt(page_array[2]))) {
                        page_n = parseInt(page_array[2]);
                    }
                    buttons_array[0].splice(1, 0, { text: "🌱", callback_data: "B:TMP:ALTERNATIVE:TARGET:" + page_array[1] + ":" + inc_struct.avv_ids[0] })

                }

                let tmp_pending = user.has_pending;
                user.has_pending = curr_dest;

                addParagraphButtons(inc_struct, page_n, buttons_array, user, "B:TMP:ALTERNATIVE:TARGET:" + page_array[1] + ":");
                buttons_array[0].push({ text: "⨷", callback_data: "B:FORGET" });

                if (inc_struct.avv_ids.length != inc_struct.avv_pcache.length) {
                    message_text += "\n*∿ Fuori sync* " + inc_struct.avv_pcache.length + "/" + inc_struct.avv_ids.length + "\n• Segnala a @nrc382\n";
                    buttons_array[0].push({ text: "↺", callback_data: "B:TMP:LIST_UPDATE:" });
                }

                user.has_pending = tmp_pending;

                to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
            }
        } else if (page_array[0] == "DELETE") {
            buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]]
            let tmp_curr;
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                if (paragraph_infos.choices[i].alternative_id == page_array[1]) {
                    tmp_curr = paragraph_infos.choices[i];
                }
            }

            if (typeof tmp_curr != "undefined") {
                let tmp_dest;

                for (let i = 0; i < inc_struct.avv_pcache.length; i++) {
                    if (inc_struct.avv_pcache[i].id == tmp_curr.dest_id) {
                        tmp_dest = inc_struct.avv_pcache[i].title;
                        break;
                    }
                }

                message_text = "🔀" + " *Rimuovi Alternativa*\n";
                message_text += "_paragrafo " + paragraph_infos.par_id + "_\n\n";
                //message_text += "⨓ " + paragraph_infos.choice_title + "\n\n";
                message_text += "• " + (tmp_curr.title_text ? tmp_curr.title_text : "Inizio") + "\n";
                message_text += "↧ \"" + tmp_dest + "\"\n\n";

                message_text += "• Dopo la conferma non sarà possibile alcun recupero.\n\n";
                message_text += "• Solo la scelta verrà rimossa, il paragrafo destinazione non subirà modifiche.";

                buttons_array.unshift([
                    { text: "Annulla ", callback_data: "B:TMP:ALTERNATIVE:SELECT:" + page_array[1] },
                    { text: "Elimina ❌", callback_data: "B:TMP:ALTERNATIVE:CH:DELETE:" + page_array[1] }
                ]);
                to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
            } else {
                buttons_array.unshift([{ text: "Indietro… ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id }])
                message_text = "*Mumble...*\n\n";
                message_text += "Forse la struttura è cambiata...";
                to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
            }

        } else if (page_array[0] == "INTERMEDIO") {
            console.log("Entro con: " + alternative_text);

            to_return.query_text = "Testo Intermedio";
            let curr_alternatives = [];
            buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]]
            let tmp_curr;

            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                if (paragraph_infos.choices[i].is_alternative) {
                    if (page_array[1] == paragraph_infos.choices[i].alternative_id) {
                        tmp_curr = paragraph_infos.choices[i];
                    } else {
                        curr_alternatives.push(paragraph_infos.choices[i]);
                    }
                }
            }
            if (alternative_text.length <= 3 || (!tmp_curr && curr_alternatives.length <= 0)) {
                message_text = "🔀" + " *Testo Intermedio*\n\n";
                message_text += "Con questo comando puoi aggiungere o aggiornare il testo intermedio di un alternativa.\n\n";
                if (curr_alternatives.length <= 0) {
                    message_text += "• Prima d'usarlo, crea almeno un `#alternativa` nel paragrafo\n";
                } else {
                    message_text += "• Completa il comando con il testo che vuoi inserire."
                }
                to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
            } else if (alternative_text.length >= 160) {
                message_text = "🔀" + " *Testo Intermedio*\n_troppo lungo!_\n";
                message_text += "• Il testo di un intermedio non può essere più lungo di 160 caratteri.\n(extra: +" + (curr_alternatives.length - 160) + ")";

                to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
            } else {
                message_text = "«_" + alternative_text + "_»\n\n";

                if (page_array[1] || tmp_curr) {
                    to_return.query_text = "Conferma o seleziona…";


                    if (!tmp_curr) {
                        to_return.query_text = "Woops!";

                        buttons_array.unshift([{ text: "Indietro… ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id }])
                        message_text = "*Mumble...*\n\n";
                        message_text += "Forse la struttura è cambiata...";
                        to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
                    } else {
                        if (tmp_curr.integrative_text == "") {
                            message_text = "🔀" + " *Aggiungi testo Intermedio*\n\n" + message_text;
                        } else {
                            message_text = "🔀" + " *Aggiorna testo Intermedio*\n\n" + message_text;
                        }

                        message_text += "• Alternativa: " + tmp_curr.title_text + "\n";


                        buttons_array[0].unshift({ text: "✓", callback_data: "B:TMP:ALTERNATIVE:CH:INT:" + tmp_curr.alternative_id });
                    }
                } else {
                    message_text = "🔀" + " *Testo Intermedio*\n\n" + message_text;
                    message_text += "• Seleziona l'alternativa\n";
                }

                for (let i = 0; i < curr_alternatives.length; i++) {
                    if (curr_alternatives[i].is_alternative && curr_alternatives[i].alternative_id != page_array[1]) {
                        buttons_array.unshift([{ text: curr_alternatives[i].title_text, callback_data: "B:TMP:ALTERNATIVE:INTERMEDIO:" + curr_alternatives[i].alternative_id }]);
                    }
                }

                to_return.toSend = simpleMessage(message_text, user.id, buttons_array);


            }

            // buttons_array.unshift([
            //     { text: "Annulla ", callback_data: "B:TMP:ALTERNATIVE:SELECT:" + page_array[1] },
            //     { text: "Elimina ❌", callback_data: "B:TMP:ALTERNATIVE:CH:DELETE:" + page_array[1] }
            // ]);
            // to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
            // else {
            //     buttons_array.unshift([{ text: "Indietro… ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id }])
            //     message_text = "*Mumble...*\n\n";
            //     message_text += "Forse la struttura è cambiata...";
            //     to_return.toSend = simpleMessage(message_text, user.id, buttons_array);
            // }
        }
    }
    return (to_return);
}

function paragraph_newAlternative_confirm(user, query_text, inc_struct, dest_paragraph) {
    return new Promise(function (paragraph_addChoice_confirm_res) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[2];
        let alt_title_text = splitted_imputText[3].substring(2).trim();

        if (inc_struct.avv_ids.indexOf(curr_paragraph_id) < 0) {
            message_text = "*Woops!*\n\n";
            message_text += "• Errore pMAc1\nSe puoi, contatta @nrc382";
            return paragraph_addChoice_confirm_res({ esit: false, text: message_text });
        } else if (inc_struct.avv_ids.indexOf(dest_paragraph) < 0) {
            message_text = "*Woops!*\n_aggiorna la struttura_\n\n";
            message_text += "• Non ho trovato il paragrafo " + dest_paragraph;
            return paragraph_addChoice_confirm_res({ esit: false, text: message_text });
        } else if (alt_title_text.length < 3) {
            message_text = "*Woops!*\n_errore di parsing_\n\n";
            message_text += "•Se puoi, contatta @nrc382\n";
            message_text += "\n2° riga: " + splitted_imputText[2] + "";
            message_text += "\n3° riga: " + splitted_imputText[3] + "";
            message_text += "\n4° riga: " + splitted_imputText[4] + "";


            return paragraph_addChoice_confirm_res({ esit: false, text: message_text });
        } else {
            return model.loadParagraph(user.id, curr_paragraph_id).then(function (paragraph_infos) {
                if (paragraph_infos.esit == false) {
                    return paragraph_addChoice_confirm_res(paragraph_infos);
                } else if (isNaN(paragraph_infos.level_deep)) { // TO DELETE
                    message_text = "*Woops!*\n\n";
                    message_text += "Prima di aggiungere un alternativa al paragrafo, aggiorna la struttura.";
                    return paragraph_addChoice_confirm_res({ esit: false, text: message_text });
                }
                let force_availability = false; // (loaded_paragraph_infos.availability == "ALL" ? false : loaded_paragraph_infos.availability );


                if (paragraph_infos.choices.length >= 5) {
                    let unique_titles = { night: '', day: 0, all: 0 };
                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        if (paragraph_infos.choices[i].availability == "DAY") {
                            unique_titles.day++;
                        } else if (paragraph_infos.choices[i].availability == "NIGHT") {
                            unique_titles.night++;
                        } else {
                            unique_titles.all++;
                        }
                    }
                    if ((unique_titles.day + unique_titles.all) >= 5) {
                        force_availability = "NIGTH";
                        if ((unique_titles.night + unique_titles.all) >= 5) {
                            let message_text = "*Impossibile aggiungere ulteriori Scelte*\n_paragrafo saturo_\n\n";
                            message_text += "• Hai già impostato " + unique_titles.length + " _scelte uniche_ per il paragrafo, di più sarebbero solo scomode.";
                            message_text += "\n\n> `" + alt_title_text + "`\n";
                            if (alt_counter > 3) {
                                message_text += "\mNb\nPuoi aggiungere al massimo 3 alternative per paragrafo\n";
                            }
                            let to_return = simpleMessage(message_text, user.id, [[{ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id }, { text: "⨷", callback_data: "B:FORGET" }]]);
                            return paragraph_addChoice_confirm_res({ query_text: "⚠️\n\nParagrafo Saturo", toSend: to_return });
                        }
                    }


                }

                let repeat_counter = force_availability == false ? 0 : 1;
                let repeat_index = -1;
                let new_alternative_id = 1;
                for (let i = 0; i < paragraph_infos.choices.length && repeat_counter < 2; i++) {
                    if (paragraph_infos.choices[i].is_alternative) {
                        paragraph_infos.choices[i].alternative_id = i;
                        if (paragraph_infos.choices[i].id) { // TO DELETE
                            paragraph_infos.choices[i].dest_id = paragraph_infos.choices[i].id;
                            delete paragraph_infos.choices[i].id;
                        }
                        new_alternative_id = i + 1;
                    }
                    if (paragraph_infos.choices[i].title_text.toLowerCase() == alt_title_text.toLowerCase()) {
                        if (paragraph_infos.choices[i].availability != "NIGHT") {
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
                    message_text += "• Esistono già due varianti per la stessa scelta nel paragrafo " + paragraph_infos.par_id;
                    message_text += "\n\nTesto in imput:\n> `" + alt_title_text + "`\n";
                    let to_return = simpleMessage(message_text, user.id, [[{ text: "⨓ ", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id }, { text: "⨷", callback_data: "B:FORGET" }]]);
                    return paragraph_addChoice_confirm_res({ query_text: "⚠️\n\nTesto Ripetuto", toSend: to_return });
                }



                let new_alternative = {
                    alternative_id: new_alternative_id,
                    dest_id: dest_paragraph,
                    delay: inc_struct.def_attesa,
                    availability: force_availability != false ? force_availability : "ALL",
                    is_alternative: true,
                    esit_type: 0, // 0 = continua, -1 = 
                    integrative_text: "",
                    title_text: alt_title_text
                }

                if (force_availability != false) {
                    if (force_availability == "NIGHT") { repeat_index++ };
                    paragraph_infos.choices.splice(repeat_index, 0, new_alternative);
                } else {
                    paragraph_infos.choices.unshift(new_alternative);
                }


                return model.updateParagraph(user.id, curr_paragraph_id, paragraph_infos).then(function (new_data) {
                    if (new_data.esit === false) {
                        return paragraph_addChoice_confirm_res(new_data);
                    } else {
                        paragraph_infos.choices.sort(function (a, b) {
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
                        return paragraph_addChoice_confirm_res({ paragraph_infos: paragraph_infos, forced: force_availability });
                    }
                });

            });
        }
    });
}

function paragraph_editAlternative_manager(user, inc_struct, paragraph_id, options_array, in_query) {
    return new Promise(function (alternativeAvailability_res) {
        return model.loadParagraph(user.id, paragraph_id).then(async function (paragraph_infos) {
            if (paragraph_infos.esit == false) {
                return alternativeAvailability_res(paragraph_infos)
            }
            let to_return = {};
            let query_text;
            let found = false;
            let dest_id = -1;

            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                if (paragraph_infos.choices[i].is_alternative == true && paragraph_infos.choices[i].alternative_id == options_array[1]) {
                    found = true;

                    if (options_array[0] == "A") {
                        paragraph_infos.choices[i].availability = options_array[2];
                        dest_id = paragraph_infos.choices[i].dest_id;
                    } else if (options_array[0] == "DELETE") {
                        paragraph_infos.choices.splice(i, 1);
                    } else {
                        query_text = "Nuova destinazione:\n\n" + options_array[2];
                        paragraph_infos.choices[i].dest_id = options_array[2];
                        dest_id = paragraph_infos.choices[i].dest_id;
                    }

                    break;
                }
            }
            if (!found) {
                return alternativeAvailability_res({ esit: false, text: "Woops!\n\nNon mi risulta che il paragrafo " + paragraph_infos.par_id + " abbia un'alternativa settata verso " + options_array[2] });
            }

            let update_res = await model.updateParagraph(user.id, paragraph_infos.par_id, paragraph_infos);
            if (update_res.esit == false) {
                return alternativeAvailability_res(update_res)
            }

            if (options_array[0] != "DELETE") {
                let paragraph_infos = await model.loadParagraph(user.id, dest_id);
                if (paragraph_infos.esit == false) {
                    return alternativeAvailability_res(paragraph_infos)
                }
                to_return.toEdit = alternative_message(user.id, inc_struct, paragraph_infos, paragraph_infos, options_array[1]);

            } else {
                to_return.toEdit = paragraph_message(user, inc_struct, paragraph_infos);
            }



            if (options_array[0] == "A") {
                if (options_array[2] == "DAY") {
                    query_text = "☀️️\n\nAlternativa selezionabile solo di giorno";
                } else if (options_array[2] == "NIGHT") {
                    query_text = "🌙\n\nAlternativa selezionabile solo di notte";
                } else {
                    query_text = "☀️️ 🌙\n\nAlternativa selezionabile di giorno e di notte";
                }
            } else if (options_array[0] == "DELETE") {
                query_text = "🗑\n\nAlternativa Eliminata";
            }

            to_return.query = { id: in_query.id, options: { text: query_text, show_alert: true, cache_time: 4 } }
            return alternativeAvailability_res(to_return);
        });
    });
}

function alternative_message(user_id, inc_struct, paragraph_infos, des_infos, alternative_id, is_simple) { //tap su funzione
    let buttons_array = [];
    let is_same = (des_infos == false);
    if (is_same) {
        des_infos = paragraph_infos;
    }
    let dest_is_first = (des_infos.father_id == 0);

    let curr_alternative = null;
    for (let i = 0; i < paragraph_infos.choices.length; i++) {
        if (paragraph_infos.choices[i].alternative_id == alternative_id) {
            curr_alternative = paragraph_infos.choices[i];
            break;
        }
    }
    let message_text = "";


    if (curr_alternative == null) {
        message_text = "Woops!\n\n";
        message_text = "Questo messaggio sembra obsoleto...";
    } else {
        let integrative_text = "";
        let firstLine_buttons = [{ text: "↵", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id }];

        if (typeof curr_alternative.become == "string" && curr_alternative.become.length > 0) {
            integrative_text += "• La scelta ";
            if (curr_alternative.become == "🤤") {
                integrative_text += "intossica ";
            } else if (curr_alternative.become == "🥴") {
                integrative_text += "confonde ";
            } else if (curr_alternative.become == "😴") {
                integrative_text += "addormenta ";
            } else if (curr_alternative.become == "😨") {
                integrative_text += "spaventa ";
            } else if (curr_alternative.become == "🙂") {
                integrative_text += "fa tornare a condizioni normali ";
            } else if (curr_alternative.become == "😤") { //
                integrative_text += "fomenta ";
            }
            integrative_text += "il giocatore\n";
        }
        if (typeof curr_alternative.exclusive != "undefined" && curr_alternative.exclusive.length > 0) {
            integrative_text += "• Stato richiesto: " + curr_alternative.exclusive.join(", ") + "\n";
        } else if (typeof curr_alternative.excluded != "undefined" && curr_alternative.excluded.length > 0) {
            integrative_text += "• Nascosta a: " + curr_alternative.excluded.join(", ") + "\n";
        }

        if (curr_alternative.availability == "DAY") {
            integrative_text += "• Visibile: di Giorno ☀️️\n";
            buttons_array.push([{ text: "🌙", callback_data: 'B:TMP:ALTERNATIVE:CH:A:' + curr_alternative.alternative_id + ':NIGHT:' }]);
        } else if (curr_alternative.availability == "NIGHT") {
            integrative_text += "• Visibile: di Notte 🌙\n";
            buttons_array.push([{ text: "⭐", callback_data: 'B:TMP:ALTERNATIVE:CH:A:' + curr_alternative.alternative_id + ':ALL:' }]);
        } else {
            integrative_text += "• Visibile: Sempre ⭐️\n";
            buttons_array.push([{ text: "☀️️️", callback_data: 'B:TMP:ALTERNATIVE:CH:A:' + curr_alternative.alternative_id + ':DAY:' }]);
        }
        message_text = "🔁 *\"" + curr_alternative.title_text + "\"*\n";

        if (!is_same) {
            message_text += "_alternativa in " + paragraph_infos.par_id + "_\n\n";

            message_text += integrative_text;
            if (!dest_is_first) {
                message_text += "↧ Destinazione: \"" + des_infos.choice_title + "\" (" + paragraph_infos.level_deep + "° lv.)\n\n";
            } else {
                message_text += "↧ Riporta al primo paragrafo\n\n";
            }

            if (curr_alternative.integrative_text != "") {
                message_text += "_" + curr_alternative.integrative_text + "_";
            } else {
                message_text += "_Un testo intermedio verrà stampato subito sopra a quello del paragrafo destinazione_";
            }

            if (des_infos.text != "") {
                message_text += "\n_" + des_infos.text + "_\n\n"
            } else if (curr_alternative.integrative_text == "") {
                message_text += "_, che non hai ancora impostato._\n\n"
            } else {
                message_text += "\n/.../_ seguirà il testo del paragrafo destinazione_\n\n"
            }

            firstLine_buttons.splice(1, 0, { text: "↧", callback_data: "B:TMP:PRGPH:SELECT:" + des_infos.id + ":TO_SEND" });
        } else {
            message_text += "_vicolo cieco di " + paragraph_infos.par_id + "_\n\n";

            message_text += integrative_text + "\n";

            if (curr_alternative.integrative_text != "") {
                message_text += "_" + curr_alternative.integrative_text + "_\n";
            } else {
                message_text += "_Dopo " + curr_alternative.delay + " minuti, il giocatore tornerà al paragrafo, che sarà preceduto da un testo intermedio_";
            }
            if (des_infos.text != "") {
                message_text += "\n_" + des_infos.text + "_\n\n"
            } else {
                message_text += "_, che non hai ancora impostato._\n\n"
            }
        }

        firstLine_buttons.push(
            //{ text: "⇅", callback_data: 'B:TMP:ALTERNATIVE:TARGET:' + curr_alternative.alternative_id },
            //{ text: "❤️", callback_data: 'B:TMP:PRGPH:CH_STATUS:0:ALT:' + curr_alternative.alternative_id },
            //{ text: "📦", callback_data: 'B:TMP:PRGPH:ITEM:0:ALT:' + curr_alternative.alternative_id },
            { text: "⇅", callback_data: 'B:TMP:ALTERNATIVE:TARGET:' + curr_alternative.alternative_id },
            { text: "⨷", callback_data: "B:FORGET" },
            { text: "⌫", callback_data: 'B:TMP:ALTERNATIVE:DELETE:' + curr_alternative.alternative_id }
        );
        buttons_array.unshift(firstLine_buttons);

        buttons_array[1].push(
            { text: "❤️", callback_data: 'B:TMP:ALTERNATIVE:CH_STATUS:0:' + curr_alternative.alternative_id },
            { text: "📦", callback_data: 'B:TMP:ALTERNATIVE:CH_DROP:0:' + curr_alternative.alternative_id },
            { text: "➽", callback_data: 'B:TMP:ALTERNATIVE:CH_STRADA:0:' + curr_alternative.alternative_id },
            { text: "🎴", callback_data: 'B:TMP:ALTERNATIVE:CH_STATS:0:' + curr_alternative.alternative_id },
            { text: "🐗", callback_data: 'B:TMP:ALTERNATIVE:CH_MOB:0:' + curr_alternative.alternative_id }
        );
    }

    if (is_simple == true) {
        buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]]
    }

    return simpleMessage(message_text, user_id, buttons_array);
}

// **********

function paragraph_AddVariation_message(user, inc_struct, variation_text) {
    let message_text = "";
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]];
    let new_variation_array = variation_text.split(" ");
    variation_text = variation_text.split("«").join("\n\"").split("»").join("\"\n").trim();

    if (user.has_pending.length != 4 || inc_struct.avv_ids.indexOf(user.has_pending) < 0) {
        message_text = "*Woops*\n\nAssicurati di raggiungere il paragrafo a cui vuoi aggiungere la variazione prima di usare questo comando.\n";
        message_text += "\nTesto inviato:\n`" + variation_text + "`";
        return (simpleMessage(message_text, user.id, buttons_array));
    } else if (new_variation_array.length <= 2) {
        message_text = "*Variazioni sul Testo*\n_ nel paragrafo_ `" + user.has_pending + "`\n\n";
        message_text += "• Sostituiscono integralmente il teso del paragrafo\n";
        message_text += "• Possono dipendere dallo stato del giocatore, dalle sue statistiche o dalle sue scelte passate.\n";

        if (new_variation_array.length > 1) {
            message_text += "\n• Usa almeno tre parole";
        } else {
            message_text += "\n• Completa il comando con il testo della variante.";
        }
        return (simpleMessage(message_text, user.id, buttons_array));

    } else if (variation_text.length >= 1500) {
        message_text = "*Woops*\n\n";
        message_text += "Il testo per la variante è troppo lungo:\n(caratteri extra: " + (variation_text.length - 1500) + ")\n\n`" + variation_text + "`";
        return (simpleMessage(message_text, user.id, buttons_array));
    } else {
        return (paragraph_Variation_message(user, inc_struct, false, variation_text).toSend);
    }

}

function paragraph_Variation_message(user, inc_struct, paragraph_infos, new_variation_text, variation_options) {
    let message_text = "🅥";
    let buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]];
    let q_text = "🅥";

    if (typeof new_variation_text === "string") {
        new_variation_text = new_variation_text.split("«").join("\"").split("»").join("\“");
        message_text += " *Nuova Variazione*\n"
        message_text += "_…sul paragrafo " + user.has_pending + "_\n\n";

        if (typeof variation_options == "undefined") {
            q_text = "Variazione su " + user.has_pending;

            message_text += "• Seleziona lo stato o le scelte per cui applicare la variante.\n";

            buttons_array.unshift([
                { text: "🌙", callback_data: "B:TMP:VARIATION:NEW:NIGHT" },
                { text: "❤️", callback_data: "B:TMP:VARIATION:NEW:ALL:STATO" },
                { text: "➽", callback_data: "B:TMP:VARIATION:NEW:ALL:STRADA" },
                { text: "🎴", callback_data: "B:TMP:VARIATION:NEW:ALL:STATS" }

            ]);

        } else {
            let time_option = typeof variation_options[0] != "undefined" ? variation_options[0] : "ALL";
            let second_option = variation_options[1];
            console.log("Variante: " + time_option);
            console.log("Opzione: " + second_option);

            if (time_option == "ALL") {
                q_text = " ";

                buttons_array[0].unshift(
                    { text: "🌙", callback_data: "B:TMP:VARIATION:NEW:NIGHT" + (typeof second_option != "undefined" ? ":" + variation_options.slice(1).join(":") : "") } // ❤️ ➽
                );
            } else if (time_option == "NIGHT") {
                message_text += "• Testo Notturno 🌙 \n";
                q_text = " 🌙 ";
                buttons_array[0].unshift(
                    { text: "☀️", callback_data: "B:TMP:VARIATION:NEW:DAY" + (typeof second_option != "undefined" ? ":" + variation_options.slice(1).join(":") : "") } // ❤️ ➽
                );
            } else if (time_option == "DAY") {
                message_text += "• Testo Diurno ☀️\n";
                q_text = " ☀️ ";
                buttons_array[0].unshift(
                    { text: "⭐", callback_data: "B:TMP:VARIATION:NEW:ALL" + (typeof second_option != "undefined" ? ":" + variation_options.slice(1).join(":") : "") } // ❤️ ➽
                );
            }

            if (typeof second_option == "undefined") {
                q_text += "Variazione su " + user.has_pending;

                buttons_array[0].splice(1, 0,
                    { text: "❤️", callback_data: "B:TMP:VARIATION:NEW:" + time_option + ":STATO" },
                    { text: "➽", callback_data: "B:TMP:VARIATION:NEW:" + time_option + ":STRADA" },
                    { text: "🎴", callback_data: "B:TMP:VARIATION:NEW:" + time_option + ":STATS" }
                );

            } else {
                let last_option = variation_options[2];
                console.log("Selezione: " + last_option);

                let is_ready = false;
                buttons_array[0].unshift({ text: "↵", callback_data: "B:TMP:VARIATION:NEW:" + time_option });

                if (second_option == "STATO") {
                    message_text = "❤️ " + message_text;

                    if (typeof last_option != "undefined") {
                        console.log("Ultima: " + last_option);
                        message_text += "• Condizione: " + last_option + "\n";
                        q_text += "❤️ " + last_option;
                        is_ready = true;
                    } else {
                        q_text += "❤️ Variazione di Stato";
                    }
                    let query_text = "B:TMP:VARIATION:NEW:" + time_option + ":STATO";
                    buttons_array.splice(1, 0, [
                        { text: "🙂", callback_data: query_text + ":🙂" },
                        { text: "🤤", callback_data: query_text + ":🤤" },
                        { text: "😴", callback_data: query_text + ":😴" },
                        { text: "😨", callback_data: query_text + ":😨" },
                        { text: "🥴", callback_data: query_text + ":🥴" },
                        { text: "😤", callback_data: query_text + ":😤" }
                    ]);

                } else if (second_option == "STRADA") {
                    let page_n = 0;
                    message_text = "➽ " + message_text;
                    q_text += "➽ ";


                    if (!checkParagraphID(last_option)) {
                        if (typeof last_option != "undefined") {
                            page_n = last_option;
                        }
                    } else {
                        let p_name = "";
                        for (let i = 0; i < inc_struct.avv_pcache.length; i++) {
                            if (inc_struct.avv_pcache[i].id == last_option) {
                                p_name = typeof inc_struct.avv_pcache[i].title != "undefined" ? inc_struct.avv_pcache[i].title : "Inizio";
                                q_text += p_name;
                                break;
                            }
                        }
                        message_text += "• Condizione:  _" + p_name + "_ (" + last_option + ")\n";
                        is_ready = true;
                    }
                    if (inc_struct.avv_ids.length != inc_struct.avv_pcache.length) {
                        message_text += "\n*∿ Fuori sync* " + inc_struct.avv_pcache.length + "/" + inc_struct.avv_ids.length + "\n• Segnala a @nrc382\n";
                        buttons_array[0].push({ text: "↺", callback_data: "B:TMP:LIST_UPDATE:" });
                    }

                    addParagraphButtons(inc_struct, page_n, buttons_array, user, "B:TMP:VARIATION:NEW:" + time_option + ":STRADA:");
                } else {
                    q_text = "🎴 Prossimamente...";
                }

                if (is_ready) {
                    buttons_array[0].splice(buttons_array[0].length - 1, 0,
                        { text: "✓", callback_data: "B:TMP:VARIATION:INSERT:" + time_option + ":" + second_option + ":" + last_option } // ❤️ ➽
                    );
                }

            }
        }

        message_text += "\n«_" + new_variation_text + "_»\n\n";

    } else if (paragraph_infos.esit == false || typeof paragraph_infos == "undefined") {
        message_text = "*Woops*\n\nErrore PVM:1\n\nSe puoi, contatta @nrc382 ";
        q_text = "Woops!";
    } else {
        let has_variations = typeof paragraph_infos.variations != "undefined";
        q_text = "Varianti su " + paragraph_infos.par_id;
        message_text = "🅥" + " *Varianti sul Testo*\nnel paragrafo " + paragraph_infos.par_id + "\n\n";
        message_text += "• Sintassi: `/b #variante `\n";
        message_text += "• Sostituiscono integralmente il testo del paragrafo, possono dipendere:\n";
        message_text += "`♡` dallo stato del giocatore\n`➽` dalle scelte pregresse\n";

        buttons_array = [[
            { text: "⨓", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id },
            { text: "⨷", callback_data: "B:FORGET" }
        ]];

        if (!has_variations || paragraph_infos.variations.length <= 0) {
            message_text += "\n• Ancora nessuna variante in questo paragrafo";;
        } else {
            let counter = {
                state_variations: 0,
                strade_variations: 0
            }
            let toShow_array = [];
            for (let i = 0; i < paragraph_infos.variations.length; i++) {
                if (typeof paragraph_infos.variations[i].moji != "undefined") {
                    counter.state_variations++;
                    if (variation_options[0] != "STRADA") {
                        toShow_array.push({ title: paragraph_infos.variations[i].moji, icon: "Stato:" });
                    }
                } else {
                    counter.strade_variations++;
                    if (variation_options[0] != "STATO") {
                        toShow_array.push({ title: paragraph_infos.variations[i].p_id, icon: "➽" });
                    }
                }
            }

            // if (counter.strade_variations > 0){
            //     buttons_array[0].splice(1, 0,
            //         { text: "➽", callback_data: "B:TMP:VARIATION:STRADA" }
            //     );
            // } else if (counter.state_variations > 0){
            //     buttons_array[0].splice(1, 0,
            //         { text: "❤️", callback_data: "B:TMP:VARIATION:STATO" }
            //     );
            // }


            message_text += "\n• Variazioni attuali: "; // "· ♡ `/bardo #variante `\n\n";
            if (paragraph_infos.variations.length > 1) {
                message_text += paragraph_infos.variations.length + "\n"
            } else {
                message_text += "\n";
            }
            if (counter.state_variations > 0) {
                message_text += "· Per stato: " + counter.state_variations + "\n";
            }
            if (counter.strade_variations > 0) {
                message_text += "· Per scelte: " + counter.strade_variations + "\n";
            }

            for (let i = 0; i < toShow_array.length; i++) {
                buttons_array.push([{ text: toShow_array[i].icon + " " + toShow_array[i].title, callback_data: "B:TMP:VARIATION:MANAGE:" + toShow_array[i].title }])
            }
        }

    }

    return {
        toSend: simpleMessage(message_text, user.id, buttons_array),
        query_text: q_text
    };


}

function paragraph_Variation_confirm(user, inc_struct, paragraph_infos, new_availability, new_variation_type, new_variation_title, new_variation_text) {
    return new Promise(function (paragraph_EditVariation_confirm_res) {
        let is_update = false;

        if (new_availability == "DELETE") {
            for (let i = 0; i < paragraph_infos.variations.length; i++) {
                if (paragraph_infos.variations[i].moji == new_variation_type) {
                    paragraph_infos.variations.splice(i, 1);
                    break;
                } else if (paragraph_infos.variations[i].p_id == new_variation_type) {
                    paragraph_infos.variations.splice(i, 1);
                    break;
                }
            }
        } else {
            let new_variation = {};
            if (new_variation_type == "STATO") {
                new_variation.moji = new_variation_title;
            } else {
                new_variation.p_id = new_variation_title;
            }

            if (new_availability == "NIGHT") {
                new_variation.night_text = new_variation_text;
            } else {
                new_variation.text = new_variation_text;
            }

            if (typeof paragraph_infos.variations != "undefined") {
                for (let i = 0; i < paragraph_infos.variations.length; i++) {
                    if (paragraph_infos.variations[i].moji == new_variation_title) {
                        is_update = true;
                    } else if (paragraph_infos.variations[i].p_id == new_variation_title) {
                        is_update = true;
                    }

                    if (is_update == true) {
                        if (new_availability == "NIGHT") {
                            paragraph_infos.variations[i].night_text = new_variation_text;
                        } else {
                            paragraph_infos.variations[i].text = new_variation_text;
                        }
                        break;
                    }
                }
                if (!is_update) {
                    paragraph_infos.variations.push(new_variation);
                }
            } else {
                paragraph_infos.variations = [new_variation];
            }
        }

        return model.updateParagraph(user.id, user.has_pending, paragraph_infos).then(function (new_data) {
            if (new_data.esit === false) {
                return paragraph_EditVariation_confirm_res(new_data);
            } else {
                let queryt = "❤️\n\nVariante di Stato\n\n";
                if (new_availability == "DELETE") {
                    queryt += "Eliminata";
                } else {
                    queryt += (is_update ? "Aggiornata" : "Aggiunta");
                }
                return paragraph_EditVariation_confirm_res({
                    query_text: queryt,
                    toEdit: paragraph_message(user, inc_struct, paragraph_infos)
                });

            }
        })
    });
}

function paragraph_Variation_manager(user, inc_struct, paragraph_infos, variation, option) {
    let message_text = "🅥";

    let buttons_array = [];
    let to_return = { query_text: "" };


    if (paragraph_infos.esit == false) {
        return (false)
    } else if (typeof paragraph_infos.variations == "undefined") {
        return (false)
    }

    let curr_state = { title: "", text: "", night_text: "" };
    for (let i = 0; i < paragraph_infos.variations.length; i++) {
        if (paragraph_infos.variations[i].moji == variation) {
            curr_state.title = paragraph_infos.variations[i].moji;
            curr_state.text = (paragraph_infos.variations[i].text ? paragraph_infos.variations[i].text : "");
            curr_state.night_text = (paragraph_infos.variations[i].night_text ? paragraph_infos.variations[i].night_text : "");
            break;
        } else if (paragraph_infos.variations[i].p_id == variation) {
            curr_state.title = paragraph_infos.variations[i].p_id;
            curr_state.text = (paragraph_infos.variations[i].text ? paragraph_infos.variations[i].text : "");
            curr_state.night_text = (paragraph_infos.variations[i].night_text ? paragraph_infos.variations[i].night_text : "");
            break;
        }
    }

    if (curr_state.title == "" || typeof curr_state.title == "undefined") {
        message_text = "*Woops*\n\nAssicurati di non aver già modificato il paragrafo " + user.has_pending + ".\n";
        message_text += "Non mi risulta includa una variazione per lo stato: " + variation + "\n";
        return ({ esit: false, text: message_text });
    } else if (option != "DELETE") {
        if (curr_state.title.length == 4) {
            message_text += " *Variante per Scelta*\n_nel paragrafo " + user.has_pending + "_\n\n";
            let p_name = "";

            for (let i = 0; i < inc_struct.avv_pcache.length; i++) {
                if (inc_struct.avv_pcache[i].id == variation) {
                    p_name = typeof inc_struct.avv_pcache[i].title != "undefined" ? inc_struct.avv_pcache[i].title : "Inizio";
                    break;
                }
            }
            message_text += "Condizione ➽\n• _" + p_name + "_ (" + variation + ")\n\n";
            to_return.query_text = "Variante per Scelta";

        } else {
            message_text += " *Variante di Stato*\n_nel paragrafo " + user.has_pending + "_\n\n";
            let state;

            if (curr_state.title == "🤤") {
                state = { moji: "🤤", name: "Intossicato" };
            } else if (curr_state.title == "😴") {
                state = { moji: "😴", name: "Stanco" };
            } else if (curr_state.title == "😨") {
                state = { moji: "😨", name: "Spaventato" };
            } else if (curr_state.title == "🥴") {
                state = { moji: "🥴", name: "Confuso" };
            } else if (curr_state.title == "😤") {
                state = { moji: "😤", name: "Concentrato" };
            } else {
                state = { moji: "🙂", name: "Normale" };
            }
            message_text += "Condizione ❤️\n• " + state.name + " " + state.moji + "\n\n";
            to_return.query_text = "Avventuriero " + state.name;

            let new_choices = [];
            for (let i = 0; i < paragraph_infos.choices.length; i++) {

                if (paragraph_infos.choices[i].excluded && paragraph_infos.choices[i].excluded.length > 0) {
                    if (paragraph_infos.choices[i].excluded.indexOf(variation) < 0) {
                        console.log("Nonostante l'esclusiva")
                        new_choices.push(paragraph_infos.choices[i]);
                    }
                } else if (paragraph_infos.choices[i].exclusive && paragraph_infos.choices[i].exclusive.length > 0) {
                    if (paragraph_infos.choices[i].exclusive.indexOf(variation) >= 0) {
                        console.log("È l'esclusiva! " + variation + " " + paragraph_infos.choices[i].exclusive.join(" "))
                        new_choices.push(paragraph_infos.choices[i]);
                    }
                } else {
                    console.log("Inserisco a prescindere....")
                    new_choices.push(paragraph_infos.choices[i]);
                }
            }
            paragraph_infos.choices = new_choices;

        }

        if (typeof option == "undefined") {
            option = "ALL";
        }

        if (paragraph_infos.par_id != inc_struct.avv_ids[0]) {
            message_text += "• " + (paragraph_infos.level_deep) + "° livello\n";
        } else {
            message_text += "• Inizio Avventura 🌱\n";
        }

        if (typeof paragraph_infos.excluded != "undefined" && paragraph_infos.excluded.length > 0) {
            message_text += "• Nascosta a: " + paragraph_infos.excluded.join(", ") + "\n";
        } else if (typeof paragraph_infos.exclusive != "undefined" && paragraph_infos.exclusive.length > 0) {
            message_text += "• Stato richiesto: " + paragraph_infos.exclusive.join(", ") + "\n";
        }

        if (paragraph_infos.availability == "ALL" && paragraph_infos.par_id != inc_struct.avv_ids[0]) {
            message_text += "• Visibile Sempre ⭐\n";
        } else if (paragraph_infos.availability == "DAY") {
            message_text += "• Visibile di Giorno ☀️\n";
        } else if (paragraph_infos.availability == "NIGHT") {
            message_text += "• Visibile di Notte 🌙\n";
        }

        let variation_text = "Ⓥ";
        if ((paragraph_infos.variations.length) > 0) {
            variation_text = "🅥";
            if (paragraph_infos.variations.length > 1) {
                variation_text = paragraph_infos.variations.length + "🅥";
            }
        }

        buttons_array.push([
            { text: "↵", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.par_id },
            { text: variation_text, callback_data: "B:TMP:VARIATION" },
            { text: "⌫", callback_data: 'B:TMP:VARIATION:MANAGE:' + curr_state.title + ":DELETE:" }
        ]);

        if (option == "ALL") {
            buttons_array[0].splice(1, 0, { text: "☽", callback_data: "B:TMP:VARIATION:MANAGE:" + variation + ":NIGHT" });
            if (curr_state.night_text != "") {
                message_text += "\nTesto Diurno ☀️\n";
                if (curr_state.text == "") {
                    message_text += "_Non hai ancora impostato il testo di questo paragrafo._\n";
                } else {
                    message_text += "«_" + curr_state.text + "_»\n"
                }
                message_text += "\nTesto Notturno 🌙\n";
                message_text += "«_" + curr_state.night_text + "»_\n"
            } else {
                message_text += "\nTesto Unico\n";
                if (curr_state.text == "") {
                    message_text += "_Non hai ancora impostato il testo di questo paragrafo._\n";
                } else {
                    message_text += "«_" + curr_state.text + "_»\n"
                }
            }
        } else if (option == "DAY") {
            buttons_array[0].splice(1, 0, { text: "☼☽", callback_data: "B:TMP:VARIATION:MANAGE:" + variation + ":ALL" });

            message_text += "\nTesto Diurno ☀️\n";
            if (curr_state.text == "") {
                message_text += "_Non hai ancora impostato il testo diurno di questo paragrafo._\n";
            } else {
                message_text += "«_" + curr_state.text + "_»\n"
            }
        } else {
            buttons_array[0].splice(1, 0, { text: "☼", callback_data: "B:TMP:VARIATION:MANAGE:" + variation + ":DAY" });

            message_text += "\nTesto Notturno 🌙\n";
            if (curr_state.night_text == "") {
                message_text += "_Non hai ancora impostato il testo notturno di questo paragrafo._\n";
            } else {
                message_text += "«_" + curr_state.night_text + "_»\n"
            }
        }


        let counters = { all: 0, day: 0, night: 0 };

        let choices = paragraph_buttons_manager(paragraph_infos, counters, inc_struct);

        if (choices.small.length > 0) {
            buttons_array.push(choices.small);
        }

        if (choices.long.length > 0) {
            buttons_array = [...buttons_array, ...choices.long];
        }

    } else {
        to_return.query_text = "Elimina Variante di Stato ";

        message_text += "*Elimina Variante*\n\n• Dopo la conferma non sarà possibile alcun recupero.";

        buttons_array.push([
            { text: "Annulla", callback_data: "B:TMP:VARIATION:MANAGE:" + curr_state.title },
            { text: "Elimina ❌", callback_data: 'B:TMP:VARIATION:INSERT:DELETE:' + curr_state.title }
        ]);
    }


    buttons_array.push([{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]);
    to_return.toEdit = simpleMessage(message_text, user.id, buttons_array);

    return (to_return);
}

// **********

function paragraph_message(user, inc_struct, paragraph_infos, simple) {
    let buttons_array = [];
    let is_first = (paragraph_infos.father_id == 0);
    let message_text = "*" + inc_struct.avv_titolo + "*\n";
    let has_variations = typeof paragraph_infos.variations != "undefined";
    let variation_text = "Ⓥ";
    let variation_callback = "B:TMP:VARIATION";

    if (!is_first) {
        message_text = "*\"" + paragraph_infos.choice_title + "\"*\n";
    }
    message_text += "_paragrafo_ `" + paragraph_infos.par_id + "`\n\n";


    // header
    if (!is_first) {
        message_text += "• " + (paragraph_infos.level_deep) + "° livello\n";
    } else {
        message_text += "• Inizio Avventura 🌱\n";
    }
    if (typeof paragraph_infos.excluded != "undefined" && paragraph_infos.excluded.length > 0) {
        message_text += "• Nascosta a: " + paragraph_infos.excluded.join(", ") + "\n";
    } else if (typeof paragraph_infos.exclusive != "undefined" && paragraph_infos.exclusive.length > 0) {
        message_text += "• Stato richiesto: " + paragraph_infos.exclusive.join(", ") + "\n";
    }
    if (paragraph_infos.availability == "ALL" && !is_first) {
        message_text += "• Visibile Sempre ⭐ \n";
    } else if (paragraph_infos.availability == "DAY") {
        message_text += "• Visibile di Giorno ☀️\n";
    } else if (paragraph_infos.availability == "NIGHT") {
        message_text += "• Visibile di Notte 🌙\n";
    }

    // gestore variazioni
    if (has_variations == true && paragraph_infos.variations.length > 0) {
        if (paragraph_infos.variations.length == 1) {
            variation_callback += ":MANAGE:";
            if (paragraph_infos.variations[0].moji) {
                variation_callback += paragraph_infos.variations[0].moji;
            } else {
                variation_callback += paragraph_infos.variations[0].p_id;
            }
            variation_text = "🅥";
        } else {
            variation_text = paragraph_infos.variations.length + "🅥";
        }
        //message_text += "• Varianti: " + paragraph_infos.variations.length + "\n";
    }

    // Paragrafo
    let has_NIGHT = paragraph_infos.night_text != "";

    if (inc_struct.def_vista == "ALL") {
        if (has_NIGHT) {
            message_text += "\nTesto Diurno ☀️\n";
            if (paragraph_infos.text == "") {
                message_text += "_Non hai ancora impostato il testo di questo paragrafo._\n";
            } else {
                message_text += "«_" + paragraph_infos.text + "_»\n"
            }
            message_text += "\nTesto Notturno 🌙\n";
            message_text += "«_" + paragraph_infos.night_text + "»_\n"
        } else {
            message_text += "\nTesto Unico\n";
            if (paragraph_infos.text == "") {
                message_text += "_Non hai ancora impostato il testo di questo paragrafo._\n";
            } else {
                message_text += "«_" + paragraph_infos.text + "_»\n"
            }
        }
    } else if (inc_struct.def_vista == "DAY") {
        message_text += "\nTesto Diurno ☀️\n";
        if (paragraph_infos.text == "") {
            message_text += "_Non hai ancora impostato il testo diurno di questo paragrafo._\n";
        } else {
            message_text += "«_" + paragraph_infos.text + "_»\n"
        }
    } else {
        message_text += "\nTesto Notturno 🌙\n";
        if (!has_NIGHT) {
            message_text += "_Non hai ancora impostato il testo notturno di questo paragrafo._\n";
        } else {
            message_text += "«_" + paragraph_infos.night_text + "_»\n"
        }
    }

    // Conseguenza
    if (typeof paragraph_infos.become == "string" && paragraph_infos.become.length > 0) {
        message_text += "\n• La scelta ";
        if (paragraph_infos.become == "🤤") {
            message_text += "intossica ";
        } else if (paragraph_infos.become == "🥴") {
            message_text += "confonde ";
        } else if (paragraph_infos.become == "😴") {
            message_text += "stanca ";
        } else if (paragraph_infos.become == "😨") {
            message_text += "spaventa ";
        } else if (paragraph_infos.become == "🙂") {
            message_text += "fa tornare a condizioni normali ";
        } else if (paragraph_infos.become == "😤") { //
            message_text += "fomenta ";
        }
        message_text += "il giocatore\n";
    }


    // prima linea bottoni
    if (is_first) {
        buttons_array.push([
            { text: "📜 ", callback_data: "B:TMP:EDIT" },
            { text: variation_text, callback_data: variation_callback },
            { text: "⌘", callback_data: "B:TMP:PRGPH:CMDS:0" },
            { text: "⌫", callback_data: 'B:TMP:TMP_DELETE' }
        ]);
    } else {
        buttons_array.push([
            { text: "↵", callback_data: "B:TMP:PRGPH:SELECT:" + paragraph_infos.father_id },
            { text: variation_text, callback_data: variation_callback },
            { text: "⌥", callback_data: ("B:TMP:PRGPH:OPTIONS:" + paragraph_infos.par_id) },
            { text: "⌘", callback_data: "B:TMP:PRGPH:CMDS:0" },
            { text: "⌫", callback_data: 'B:TMP:PRGPH:DELETE:' + paragraph_infos.par_id }
        ]);

    }


    // Bottoni visuale
    if (inc_struct.def_vista == "DAY") {
        buttons_array[0].splice(1, 0, { text: "☽", callback_data: "B:TMP:PRGPH:SHOW:NIGHT" });
    } else if (inc_struct.def_vista == "NIGHT") {
        buttons_array[0].splice(1, 0, { text: "☼☽", callback_data: "B:TMP:PRGPH:SHOW:ALL" });
    } else {
        buttons_array[0].splice(1, 0, { text: "☼️", callback_data: "B:TMP:PRGPH:SHOW:DAY" });
    }


    // Strade/Scelte
    if (paragraph_infos.esit_type == 0) {
        let counters = { all: 0, day: 0, night: 0 };
        let choices = paragraph_buttons_manager(paragraph_infos, counters, inc_struct);

        if (choices.small.length > 0) {
            buttons_array.push(choices.small);
        }

        if (choices.long.length > 0) {
            buttons_array = [...buttons_array, ...choices.long];
        }
    } else { // Fine
        message_text += "\n☠\nFine " + (paragraph_infos.esit_type == -1 ? "negativa" : "positiva") + "\n";
        message_text = (paragraph_infos.esit_type == -1 ? "🌚 " : "🌝 ") + message_text;
    }

    // fanculotutto
    if (simple == true) {
        buttons_array = [];
    }

    buttons_array.push([{ text: "⨷", callback_data: "B:FORGET" }]);


    return simpleMessage(message_text, user.id, buttons_array);
}

function paragraph_buttons_manager(paragraph_infos, counters, inc_struct) {
    let small_choices = [];
    let long_choices = [];
    let regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;


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
        let condition = paragraph_infos.choices[i].availability == "ALL" || (inc_struct.def_vista == "ALL") || (paragraph_infos.choices[i].availability == inc_struct.def_vista);
        if (condition) {
            let this_callback = "";
            if (paragraph_infos.choices[i].is_alternative == true) {
                this_callback = 'B:TMP:ALTERNATIVE:SELECT:' + paragraph_infos.choices[i].alternative_id;
            } else {
                this_callback = 'B:TMP:PRGPH:SELECT:' + paragraph_infos.choices[i].id;
            }

            let is_simple = false;
            if (paragraph_infos.choices[i].title_text.length < 6) {

                let simple_moji = paragraph_infos.choices[i].title_text.match(regex);
                if (typeof simple_moji != "undefined" && simple_moji.length <= 2) {
                    let pure = paragraph_infos.choices[i].title_text.replace(regex, "").trim();
                    if (pure.length <= 2) {
                        is_simple = true;
                    }
                }
            }

            if (is_simple) {
                if (small_choices.length > 6) {
                    long_choices.push(small_choices);
                    small_choices = [];
                    //long_choices.push([{ text: tmp_text, callback_data: this_callback }]);
                }

                small_choices.push({ text: paragraph_infos.choices[i].title_text, callback_data: this_callback }); // small_choices.push({ text: tmp_text, callback_data: this_callback });

            } else {
                let tmp_text = "";

                if (paragraph_infos.choices[i].is_alternative == true) {
                    tmp_text = "🔀 " + tmp_text;
                }

                tmp_text += (paragraph_infos.choices[i].availability == "NIGHT" ? "🌙 " : (paragraph_infos.choices[i].availability == "DAY" ? "☀️️ " : ""));

                tmp_text += paragraph_infos.choices[i].title_text + (paragraph_infos.choices[i].delay == 0 ? " ⚡️" : " (" + paragraph_infos.choices[i].delay + ")");

                let special_counter = 0;
                if (typeof paragraph_infos.choices[i].excluded != "undefined") {
                    special_counter += paragraph_infos.choices[i].excluded.length;
                }
                if (typeof paragraph_infos.choices[i].exclusive != "undefined") {
                    special_counter += paragraph_infos.choices[i].exclusive.length;
                }
                if (special_counter > 0) {
                    tmp_text += " 👁‍🗨";
                }




                if (paragraph_infos.choices[i].esit_type == 1) {
                    tmp_text = "✌ " + tmp_text;
                } else if (paragraph_infos.choices[i].esit_type == -1) {
                    tmp_text = "☠ " + tmp_text;
                }



                long_choices.push([{ text: tmp_text, callback_data: this_callback }]);
            }
        }
    }
    return { small: small_choices, long: long_choices };

}


// ACCESSORIE

function checkUnaviableChars(message_text) {
    if (typeof message_text == "undefined") {
        return false;
    }
    let splitted = message_text.split("");
    let unaviable_char = ["_", "*", "`"];
    for (let i = 0; i < message_text.length; i++) {// si potrebbe usare una semplice indexOf per tutti e tre, ma consumererebbe più cpu
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
    if (!max) {
        max = min;
        min = 0;
    }
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
        message_text: text,
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
        reply_markup: { inline_keyboard: buttons_array }
    }

}

// :) 