/*
Crea ed avvia incarichi (avventure del bardo)
Il modulo è richiamato con /bardo (creazione, gestione, avvio) 
*/

const model = require("./incarichiModel");

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
                let splitted_text = message.text.toLowerCase().split(" ");
                if (splitted_text.length == 1) {
                    return mainMenu(inc_res, message.from.id).then(function (msg_res) {
                        return messageManager_res(msg_res);
                    });
                } else {
                    if (inc_res.user_infos.length == 0) { // da registrare
                        return messageManager_res(set_aliasManager(message.from.id, splitted_text));
                    } else { // registrati
                        let user = new model.User(inc_res.user_infos, inc_res.personals);
                        let to_return = { toDelete: { chat_id: message.chat.id, mess_id: message.message_id } };
                        let target_text = message.text.split(" ").splice(2).join(" ");
                        if (message.reply_to_message) {
                            target_text += " " + message.reply_to_message.text;
                        }

                        if (splitted_text[1] == "intro") {
                            to_return.toSend = incarichi_AuthorInfos_message(user).toSend;
                        } else if (splitted_text[1] == "tipo") {
                            to_return.toSend = set_adventureType_message(user);
                        } else if (splitted_text.length >= 3 && splitted_text[1] == "nuova" && splitted_text[2] == "strada") {
                            let message_txt = "*Woops!*\n\nPer usare questo comando devi specificare l'id del paragrafo.\n";
                            message_txt += "\nAd esempio:\n· `/bardo p `\\[id\\_paragrafo] `" + splitted_text.slice(1).join(" ") + "`\n";
                            to_return.toSend = simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
                        } else if (splitted_text[1] == "bozza") { // return
                            return model.getUserDaft(user.id).then(function (inc_struct) {
                                if (inc_struct.esit == false) {
                                    let message_txt = "📜 *Avventure dei Bardi di Lootia*\n\nNon mi risulta tu abbia una bozza aperta...\nVuoi crearne una nuova?\n";
                                    return messageManager_res(({ toSend: simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:NEW:START' }]]) }));
                                } else {
                                    return messageManager_res(adventure_editingMenu_message(user, inc_struct));
                                }
                            });
                        } else if (splitted_text[1] == "p" || "paragrafo".match(splitted_text[1])) { // return 
                            return paragraphMainManager(user, target_text, to_return).then(function (to_send) {
                                return messageManager_res(to_send);
                            });
                        } else {
                            if (splitted_text[1] == "titolo") {
                                to_return.toSend = set_adventureTitle_message(user, target_text);
                            } else if (splitted_text[1] == "attesa") {
                                to_return.toSend = set_adventureDelay_message(user, target_text);
                            } else if ("descrizione".match(splitted_text[1])) {
                                to_return.toSend = set_adventureDesc_message(user, target_text, splitted_text[1]);
                            } else if (user.has_pending == 1) {
                                to_return = { toSend: incarichi_Cmds_message(user.id).toSend };
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
                console.log("Cambio: " + query.data);
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
            } else if (question[1] == "REG") {
                if (inc_res.user_infos.length != 0) {
                    return queryManager_res({
                        query: { id: query.id, options: { text: "Sei già registrato!\n\nNon è così che puoi cambiare soprannome...", show_alert: true, cache_time: 4 } },
                        toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
                    });
                } else if (question.length == 2) {
                    let splitted_text = query.message.text.split("\n");
                    let usr_alias;

                    for (let i = 0; i < splitted_text.length; i++) {
                        if (splitted_text[i].charAt(0) == "•") {
                            let tmp_alias = splitted_text[i].split(" ")[1];
                            usr_alias = tmp_alias.substring(0, tmp_alias.length - 1);
                            break;
                        }
                    }
                    return registerUser(query.from.id, usr_alias).then(function (insert_res) {
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
                return mainMenu(inc_res, query.from.id).then(function (main_res) {
                    main_res.toSend.mess_id = query.message.message_id;
                    return queryManager_res({
                        query: { id: query.id, options: { text: "Avventure dei Bardi", cache_time: 4 } },
                        toEdit: main_res.toSend
                    });
                });
            } else if (question[1] == "START_MENU") {
                let to_return = newUserMessage(query.from.id).toSend;
                to_return.mess_id = query.message.message_id;
                return queryManager_res({
                    query: { id: query.id, options: { text: "Avventure dei Bardi", cache_time: 4 } },
                    toEdit: to_return
                });
            } else if (question[1] == "NEW") {
                return manageNew(inc_res, question).then(function (to_return) {
                    let res = {};
                    if (to_return.query_text) {
                        res.query = { id: query.id, options: { text: to_return.query_text, cache_time: 1 } };
                    }
                    if (to_return.toEdit) {
                        res.toEdit = to_return.toEdit;
                        res.toEdit.mess_id = query.message.message_id;
                    }
                    if (to_return.toSend) {
                        res.toSend = to_return.toSend;
                    }
                    return queryManager_res(res);
                });
            } else if (question[1] == "CONFIRM") {
                let user = new model.User(inc_res.user_infos);
                return model.getUserDaft(user.id).then(function (inc_struct) {
                    if (inc_struct.esit == false) {
                        return queryManager_res({
                            query: { id: query.id, options: { text: "Woops", show_alert: true, cache_time: 4 } },
                            toSend: simpleMessage(inc_struct.text, user.id)
                        });
                    } else {
                        return set_adventureOption_confirm(user.id, question[2], query.message.text, inc_struct).then(function (to_return) {
                            let res = { query: { id: query.id, options: { text: to_return.query_text, show_alert: true, cache_time: 4 } }, toEdit: {} };
                            if (question[2] == "PARAGRAPH_DESC" || question[2] == "NEW_CHOICE" || question[2] == "DEL_CHOICE") {
                                res.toEdit = paragraph_message(user.id, inc_struct, to_return.paragraph_infos);
                                res.toEdit.mess_id = query.message.message_id;
                            } else {
                                res.toDelete = { chat_id: query.message.chat.id, mess_id: query.message.message_id };
                                //res.toEdit = adventure_editingMenu_message(user, inc_struct).toSend;
                            }
                            return queryManager_res(res);
                        });
                    }
                });
            } else if (question[1] == "PERSONALS") {
                //let to_return = incarichi_newUser(query.from.id).toSend;
                //to_return.mess_id = query.message.message_id;
                return queryManager_res({
                    query: { id: query.id, options: { text: "Le tue Avventure...", cache_time: 4 } },
                    //toEdit: to_return
                });
            } else {
                return queryManager_res({ query: { id: query.id, options: { text: "Pardon?", cache_time: 2 } } });
            }
        });
    });
}

// MAIN MANAGERS
function mainMenu(curr_infos, from_id) { //
    return new Promise(function (mainMenu_res) {
        //let message_txt = "";
        if (curr_infos.user_infos.length == 0) {
            return mainMenu_res(newUserMessage(from_id));
        } else { // UTENTE REGISTRATO
            let message_txt = "📜 *Avventure dei Bardi di Lootia*\n\n";
            let buttons_array = [];
            if (curr_infos.incarichi.length <= 0) {
                message_txt += "Non c'è ancora alcun'avventura da seguire. Sii tu a proporre la prima!\n";
            } else if (curr_infos.incarichi.length == 1) {
                message_txt += "C'è una sola avventura da seguire, " + curr_infos.incarichi[0].TITLE + "(" + curr_infos.incarichi[0].DIFFICULTY + ")\n";
                buttons_array.push([{ text: curr_infos.incarichi[0].TITLE, callback_data: 'INCARICHI:START_ADVENTURE:' + curr_infos.incarichi[0].ID }]);
            } else {
                message_txt += "Ci sono ";
                if (curr_infos.incarichi.length <= 5) {
                    message_txt += "appena ";
                }
                message_txt += curr_infos.incarichi.length + " avventure da seguire, le trovi nella bacheca.\n";
                buttons_array.push([{ text: "Bacheca Incarichi", callback_data: 'INCARICHI:START_MENU:' }]);
            }
            let personal_line = [];
            if (curr_infos.user_infos.HAS_PENDING == 1) {
                personal_line.push({ text: "Riprendi Bozza", callback_data: 'INCARICHI:NEW:EDIT:' });
            }
            if (curr_infos.personals.length >= 1) {
                personal_line.push({ text: "Le tue avventure", callback_data: 'INCARICHI:PERSONALS:' });
            }
            if (personal_line.length > 0) {
                buttons_array.push(personal_line);
            }
            if (curr_infos.user_infos.HAS_PENDING == 0) {
                buttons_array.push([{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:NEW:START' }]);
            }
            let to_return = simpleMessage(message_txt, from_id, buttons_array);

            return mainMenu_res({ toSend: to_return });
        }
    });
}

function manageNew(by_user, options_array) { // NUOVO UTENTE, by_user: {incarichi, user_infos, personals}
    return new Promise(function (manageNew_res) {
        let user = new model.User(by_user.user_infos, by_user.personals);
        let option = options_array[2];
        let to_return = { query_text: "" };
        if (option == "PARAGRAPH") {
            if (options_array.length <= 3) {
                return newParagraph(user, options_array.splice(3)).then(function (add_res) {
                    return manageNew_res(add_res);
                });
            } else {
                if (options_array[3] == "CMDS") {
                    if (options_array.length == 5) {
                        to_return.toEdit = incarichi_AuthorCommands_message(user.id, options_array[4]).toSend;
                    } else {
                        to_return.toEdit = incarichi_AuthorCommandsEx_message(user.id, options_array[5]).toSend;
                    }
                    to_return.query_text = "Comandi per l'editing";
                    return manageNew_res(to_return);
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
                        } else if (options_array.length == 4 && inc_struct.paragraphs_ids.length > 1) { // inc_struct.paragraphs_ids.length == 0 
                            to_return.toEdit = selectParagraph(user.id, inc_struct).toSend;
                            to_return.query_text = "Lista Paragrafi...";
                            return manageNew_res(to_return);
                        } else {
                            let p_id = inc_struct.paragraphs_ids[0];
                            if (options_array.length >= 5) {
                                p_id = options_array[4];
                            }
                            console.log("Imput: " + options_array.join(":"));
                            console.log("p_id: " + p_id);

                            return model.loadParagraph(user.id, p_id).then(function (paragraph_infos) {
                                if (paragraph_infos.esit == false) {
                                    to_return.query_text = "Woops";
                                    to_return.toSend = simpleMessage("*Spiacente!*\nNon mi risulta che `" + p_id + "` indichi uno dei tuoi paragrafi...", user.id);
                                } else {
                                    to_return.toEdit = paragraph_message(user.id, inc_struct, paragraph_infos);
                                    if (inc_struct.paragraphs_ids[0] == p_id) {
                                        to_return.query_text = "Inizio Avventura";
                                    } else {
                                        to_return.query_text = "Paragrafo " + p_id;
                                    }
                                }

                                return manageNew_res(to_return);
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
                } else { // paragraph_setParagraphTexConfirm
                    return manageNew_res({ query_text: "Prossimamente..." });
                }
            }
        } else if (option == "EDIT") { // ATTESA, TEXT, TITLE, TYPE
            if (options_array[3] == "CMD") {
                to_return.toEdit = incarichi_Cmds_message(user.id).toSend;
                to_return.query_text = "Comandi per l'editing";
                return manageNew_res(to_return);
            } else {
                return model.getUserDaft(user.id).then(function (inc_struct) {
                    if (inc_struct.esit == false) {
                        return queryManager_res({
                            query_text: "Woops!",
                            toSend: simpleMessage(inc_struct.text, user.id)
                        });
                    } else {
                        to_return.toEdit = adventure_editingMenu_message(user, inc_struct).toSend;
                        to_return.query_text = inc_struct.title;
                        return manageNew_res(to_return);
                    }
                });
            }
        } else if (option == "TMP_DELETE") { // null, CONFIRM 
            return delete_userAdventure(user.id, options_array[3]).then(function (res) {
                return manageNew_res(res);
            });
        } else if (option == "PUBLISH") {
            return manageNew_res({ query_text: "Prossimamente..." });
        } else if (option == ("START")) {
            if (options_array[3] == "INFO" || (user.personals.length < 1 && options_array.length <= 3)) {
                to_return.toEdit = incarichi_AuthorInfos_message(user).toSend;
                to_return.query_text = "Una nuova avventura";
                return manageNew_res(to_return);
            } else {
                return new_userAdventure(user, options_array[3]).then(function (res) {
                    to_return.toEdit = res.toSend;
                    to_return.query_text = "Si comincia!";
                    return manageNew_res(to_return);
                });
            }
        } else if (option == ("TEST")) {
            if (options_array[3] == "START") {
                to_return.query_text = "Prossimamente...";
                return manageNew_res(to_return);
            } else {
                to_return.query_text = "Prossimamente...";
                return manageNew_res(to_return);
            }
        } else {
            to_return.query_text = "Pardon? Nuovo...";
            return manageNew_res(to_return);
        }
    });
}

// INCARICHI (GLOBALS) MANAGERS
function incarichi_AuthorInfos_message(user_info) {
    let message_txt = "📜 *Le Avventure dei Bardi di Lootia* \n_...un'introduzione alla stesura, comando_ `/b intro`\n\n";
    message_txt += "• ————— ·\nLe avventure narrate possono essere per _squadre_ o per _avventurieri solitari_.\n";
    message_txt += "• ————— ·\nPotrai sempre modificare ed aggiornare una tua narrazione, anche dopo che sarà stata pubblicata.\n";
    message_txt += "• ————— ·\nPer ogni _paragrafo_ dovrai specificare un _testo di default_ ed eventualmente una _variante notturna_.\n";
    message_txt += "• ————— ·\nPer ogni _paragrafo_ dovrai specificare almeno due _strade_.\n";
    message_txt += "• ————— ·\nPer ogni _strada_ potrai specificare diversi tempi d'_attesa_.\n";
    message_txt += "• ————— ·\nPer ogni _strada_ potrai specificare se porta alla _fine della narrazione_ o se prosegue verso un nuovo _paragrafo_.\n";
    message_txt += "• ————— ·\n";

    message_txt += "\n*Nelle avventure per squadre:*\n\n";
    message_txt += "• ————— ·\nDi default i membri seguiranno la _strada_ con più voti, ed una casuale in caso di _ambiguità_.\n";
    message_txt += "• ————— ·\nPotrai scegliere, nel caso di parità tra più strade, un strada di default: non sarà necessariamente tra quelle più votate.\n";
    //message_txt += "• ————— ·\nPotrai scegliere, per ogni paragrafo che prevede almeno un'opzione di fine, se terminare l'avventura solo per quella parte di squadra che eventualmente ha scelto l'opzione.\n";
    message_txt += "• ————— ·\n";
    message_txt += "\n💡 Per i termini in corsivo di questo messaggio, ed altri, è disponibile:\n· `/bardo ? `...\n";

    message_txt += "\n\n🌐 Ogni avventura pubblicata potrà essere votata da chi la segue, il punteggio che riceveranno le tue influirà sulla tua `reputazione`.\n";

    let buttons_array = [];
    if (user_info.has_pending == 0) {
        buttons_array.push([{ text: "Inizia ✨", callback_data: 'INCARICHI:NEW:START:CONFIRM' }]);
    } else {
        buttons_array.push([{ text: "Riprendi ✨", callback_data: 'INCARICHI:NEW:EDIT' }]);
    }
    buttons_array[0].unshift({ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" });


    let to_return = simpleMessage(message_txt, user_info.id, buttons_array);

    return ({ toSend: to_return });
}

function incarichi_AuthorCommands_message(target_userID, paragraph_id) {
    let p_id = "[id_paragrafo]";
    let buttons_array = [[{ text: "Qualche esempio...", callback_data: "INCARICHI:NEW:PARAGRAPH:CMDS:EX:" }], [{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];
    if (paragraph_id) {
        p_id = paragraph_id;
        buttons_array[0][0].callback_data += paragraph_id;
        buttons_array[1].unshift({ text: "Indietro ⮐", callback_data: "INCARICHI:NEW:PARAGRAPH:SELECT:" + paragraph_id });
    }
    let message_txt = "*Comandi per la modifica dei paragrafi*\n";
    message_txt += "\n• Richiama paragrafo:";
    message_txt += "\n· `/bardo p " + p_id + " `\n";
    message_txt += "\n• Per il testo:";
    message_txt += "\n· `/bardo p " + p_id + " `...\n";
    message_txt += "\n• Per la variante notturna:";
    message_txt += "\n· /…/` notturno `...\n";
    message_txt += "\n• Per una nuova strada:";
    message_txt += "\n· /…/` nuova strada `...\n";
    message_txt += "\n• Per modificarne il testo: ";
    message_txt += "\n· /…/` strada `\\[n\\_strada] ...\n";
    message_txt += "\n• Per cambiarene l'attesa:";
    message_txt += "\n· /…/ `attesa `...\n";

    return ({ toSend: simpleMessage(message_txt, target_userID, buttons_array) });
}

function incarichi_AuthorCommandsEx_message(target_userID, p_id) {
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];
    if (p_id) {
        buttons_array.unshift([{ text: "Indietro ⮐", callback_data: "INCARICHI:NEW:PARAGRAPH:SELECT:" + p_id }, { text: "⌘", callback_data: ("INCARICHI:NEW:PARAGRAPH:CMDS:" + p_id) }]);
    } else {
        p_id = "AA00"
    }

    let message_txt = "*Comandi per la modifica dei paragrafi*\n";
    message_txt += "_qualche esempio sul paragrafo " + p_id + "_\n";
    message_txt += "\n• Per cambiarne il testo:\n· `/bardo p " + p_id + " Una nuova avventura...`\n";
    message_txt += "\n• Per cambiare il testo della prima scelta:\n· `/bardo p " + p_id + " strada 1 Iniziamo!`\n";
    message_txt += "\n• Per impostarne a 5 minuti l'attesa:\n· `/bardo p " + p_id + " strada 1 attesa 5 `\n";

    return ({ toSend: simpleMessage(message_txt, target_userID, buttons_array) });
}

function incarichi_detailsInfos_message(target_userID) {
    let message_txt = "📜 *Avventure dei Bardi di Lootia* \n_...una \"rapida\" introduzione_\n\n";
    message_txt += "Simili agli [incarichi](https://telegra.ph/Una-guida-alla-scrittura-di-Incarichi-per-LootBot-05-05), le _avventure_ sono brevi storie interattive scritte direttamente dagli utenti di @LootGameBot.\n";
    message_txt += "\nA differenza degli incarichi: la loro struttura non è lineare, i tempi d'attesa sono variabili e possono essere per singoli o per squadre (da 2 a 5 giocatori)\n";
    message_txt += "• Ogni paragrafo d'un'avventura porta ad almeno due possibili strade\n";
    message_txt += "• Ogni strada scelta può portare alla fine dell'avventura (con esito positivo o negativo) o farla invece continuare verso un nuovo paragrafo.\n";
    message_txt += "• Ogni avventura avrà almeno 2 esiti positivi e 3 negativi\n";
    message_txt += "• Alla fine dell'avventura, se con esito positivo, ogni giocatore guadagnerà almeno un (1) glifo ၜ.\n";
    message_txt += "\n💡 Il numero di glifi guadagnati per ogni possibile esito positivo è determinato indipendentemente dall'autore, che comunque ha controllo sul tipo di avventura (se per singoli o per gruppi) e, nel caso di una squadra: \n";
    message_txt += "• Sul numero minimo di giocatori necessario \"per scegliere una strada\"\n";
    message_txt += "• Sull'eventuale fine immediata per i membri discordi (una sola strada possibile)\n";


    message_txt += "\n🌱 Il modulo si offre di facilitare la scrittura di queste avventure, oltre a permetterne lo svolgimento.\n";
    message_txt += "\nPer iniziare, imposta un soprannome\n";
    message_txt += "· Usa la sintassi:\n· `/bardo sono`...";

    let to_return = simpleMessage(message_txt, target_userID, [[{ text: "Indietro ⮐", callback_data: 'INCARICHI:NEW_USER' }]]);

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
    text += "\n· `tipo`";
    text += "\n· `attesa`";


    text += "\n\nAd esempio:\n· `/bardo titolo La mia prima avventura!`";

    let buttons_array = [[{ text: "Bozza ⮐", callback_data: "INCARICHI:NEW:EDIT" }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]; // FORGET
    return ({ toSend: simpleMessage(text, target_userID, buttons_array) });
}

// USER MANAGERS
function newUserMessage(target_userID) {
    let message_txt = "📜 *Salve* \n\n";
    message_txt += "Con questo modulo è possibile partecipare ad _avventure_ scritte dalla comunità di @LootGameBot, e crearne di proprie!\n";
    message_txt += "\nÈ da considerarsi come _in versione di test_ finchè non passerà, eventualmente, sul plus:\nCiò vuol dire che funzioni e progressi potrebbero subire modifiche, e tutte le ricompense saranno puramente simboliche.\n"
    message_txt += "\n*NB:*\nPer garantire una futura compatibilità, ogni comando o messaggio indirizzato a questo modulo dovrà iniziare con:\n· /bardo (i/e)\n\n(Od uno tra gli alias: /incarico (/i), /b, /i)\n";

    let to_return = simpleMessage(message_txt, target_userID, [[{ text: "Maggiori Informazioni ⓘ", callback_data: 'INCARICHI:PRE_INFOS' }]]);

    return ({ toSend: to_return });
}

function set_aliasManager(user_id, splitted_text) {
    let message_txt = "*Imposta un Alias!*\n\n";
    if (splitted_text[1].indexOf("sono") == 0) {
        if (splitted_text.length <= 2) {
            message_txt += "Completa il comando con il soprannome che preferiresti. Sono accettate le emoji!\n\n";
            message_txt += "Esempio:\n· `/bardo sono " + generateSimpleAlias() + "`";
        } else if (splitted_text.length != 3) {
            message_txt += "Poteva essere una buona idea, ma questo soprannome non può essere composto da più di una parola.\nMi spiace, ma \"" + splitted_text.splice(2).join(" ") + "\" non va bene...\n";
            message_txt += "Che ne diresti di `" + generateSimpleAlias() + "`?";
        } else if (splitted_text[2].length >= 12) {
            let new_name = generateSimpleAlias().substring(0, 4) + splitted_text[2].substring(10, Math.min(13, splitted_text[2].length));
            message_txt += "\"" + splitted_text[2] + "\" è troppo lungo...\nChe ne dici di " + new_name + "?";
        } else { // return!
            return alias_validImputManager(user_id, splitted_text).then(function (res_msg) {
                return (res_msg);
            });
        }
    } else {
        message_txt += "Prima di iniziare ad usare questo modulo, imposta un soprannome con cui firmarti. Usa la sintassi:\n· /bardo sono...";
    }
    return ({ toSend: simpleMessage(message_txt, user_id) });
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

                message_txt += "\nSeleziona ora il tuo genere:\n(l'unico scopo è adattare alcuni testi)";
                to_return = simpleMessage(message_txt, user_id, [[{ text: "🧙‍♀️", callback_data: 'INCARICHI:REG:F' }, { text: "🧙‍♂️", callback_data: 'INCARICHI:REG:M' }]]);

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
            console.log("> Fine 1");

            return validImputManager_res({ toSend: to_return });
        });
    });
}

function set_UserGender(user_id, gender, tmp_alias) {
    return new Promise(function (setUserGender_res) {
        return model.setUserGender(user_id, gender).then(function (gender_set) {
            if (gender_set.esit === false) {
                return (setUserGender_res({ query_text: "Woops!", toSend: simpleMessage(gender_set.text, user_id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) }));
            } else {
                let message_txt = "🔰 *Iscrizione ai Bardi di Lootia*\n\n";
                message_txt += "Ti registrerai come:\n";
                message_txt += "• _" + tmp_alias + "_, aspirante " + simpleGenderFormatter((gender == "M"), "Strillon", "e", "a") + "\n";
                message_txt += "\nPer modificare, usa:\n· `/bardo sono " + tmp_alias + "`\nDopo la conferma, non ti sarà più possibile cambiare questi dati.\n";
                return setUserGender_res({ toEdit: simpleMessage(message_txt, user_id, [[{ text: "Inizia 🌱", callback_data: 'INCARICHI:REG' }]]) });
            }
        });
    });
}

function registerUser(t_id, alias) {
    return new Promise(function (registerUser_res) {
        return model.checkAlias(alias).then(function (check_res) {
            let message_txt;
            if (check_res == true) {
                return model.insertUser([t_id, alias, (Date.now() / 1000)]).then(function (insert_res) {
                    if (insert_res == false) {
                        message_txt = "*Woops!*\n\n";
                        message_txt += "Qualche cosa non è andato bene e non sono riuscito a registrarti... Dovrai riprovare.";
                    } else {
                        message_txt = "⭐ *Benvenuto*\n\n";
                        message_txt += "Segui un'avventura già pubblicata per cominciare il tuo percorso da avventuriero, creane una per iniziare a guadagnarti il rango di Bardo di Lootia!";
                    }
                    let to_return = { toEdit: simpleMessage(message_txt, t_id) };
                    if (insert_res != false) {
                        to_return.toEdit.options.reply_markup = { inline_keyboard: [[{ text: "Vai al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]] };
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
    if (user_info.has_pending == 1) {
        let message_txt = "*Mumble...*\n\nStai già scrivendo un'avventura.\nDovrai pubblicarla o eliminarla prima di poter iniziare a lavorare ad una nuova.\n\n*NB*\nIl bottone qui sotto non prevede conferme!";
        return Promise.resolve(({ toSend: simpleMessage(message_txt, user_info.id, [[{ text: "Elimina ⌫", callback_data: 'INCARICHI:NEW:TMP_DELETE' }]]) }));
    } else {
        return new Promise(function (new_userAdventure_res) {
            return model.newUserDaft(user_info).then(function (template_res) {
                if (template_res.esit == false) {
                    return new_userAdventure_res({ toSend: simpleMessage(template_res.text, user_info.id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) });
                } else {
                    return new_userAdventure_res(adventure_editingMenu_message(user_info, template_res.struct));
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
                return (tmpDelete_res({ query_text: "Woops!", toEdit: simpleMessage(message_txt, user_id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) }));
            } else if (option == "CONFIRM") {
                return model.deleteUserDaft(user_id).then(function (del_res) {
                    if (del_res.esit === false) {
                        return (tmpDelete_res({ query_text: "Woops!", toEdit: simpleMessage(del_res.text, user_id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) }));
                    } else {
                        return (tmpDelete_res({ query_text: "Eliminata!", toEdit: simpleMessage("*Bozza eliminata!*\n\n", user_id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) }));
                    }
                });
            } else {
                let message_txt = "*Scarta la Bozza*\n\nProcedendo non sarà possibile recuperare alcun informazione su:\n\"" + inc_struct.title + "\"\n\n";
                message_txt += "• Paragrafi: " + inc_struct.paragraphs_ids.length + "\n";
                let enlapsed = ((Date.now() / 1000) - inc_struct.created) / (60 * 60 * 24);
                if (enlapsed <= 1) {
                    message_txt += "• Creata meno di 24 ore fa\n";
                } else {
                    message_txt += "• Creata circa " + Math.floor(enlapsed) + " giorni fa\n";
                }
                let buttons_array = [[{ text: "Annulla ⮐ ", callback_data: 'INCARICHI:NEW:EDIT' }, { text: "Elimina ❌", callback_data: 'INCARICHI:NEW:TMP_DELETE:CONFIRM' }]];
                return (tmpDelete_res({ query_text: "Elimina Bozza", toEdit: simpleMessage(message_txt, user_id, buttons_array) }));
            }
        });
    });
}

function set_adventureType_message(user) {
    let message_txt;
    if (user.has_pending == 1) {
        message_txt = "📜 *Le Avventure dei Bardi di Lootia* \n\n";
        message_txt += "Modifica il tipo dell'avventura, solitaria o per squadre?";

        let buttons_array = [
            [
                { text: "👤 ", callback_data: 'INCARICHI:CONFIRM:SOLO' },
                { text: "👥", callback_data: 'INCARICHI:CONFIRM:MULTI' }
            ],
            [
                //{ text: "Annulla", callback_data: 'INCARICHI:NEW:EDIT' },
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }
            ]
        ];

        return simpleMessage(message_txt, user.id, buttons_array);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:NEW:START' }]]);
    }
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
                { text: "Conferma ✓", callback_data: 'INCARICHI:CONFIRM:TITLE' },
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }

            ]
        ];
        return simpleMessage(message_txt, user.id, buttons_array);
    } else if (user.has_pending == 1) {
        message_txt = "*Imposta un Titolo*\n\nCompleta il comando con il titolo della tua avventura.\n\nEsempio:\n· `/bardo titolo \nLa mia " + (user.personals.length + 1) + "° avventura`\n";
        if (new_title.length > 30) {
            message_txt += "\n*NB*\nPer rendere piu semplice la formattazione, non puoi usare più di 30 caratteri.";
        } else if (new_title.length < 5) {
            message_txt += "\n*NB*\nUsa almeno 5 caratteri!";
        }
        return simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:NEW:START' }]])
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
                { text: "Conferma ✓", callback_data: 'INCARICHI:CONFIRM:DESC' },
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }

            ]
        ];
        return simpleMessage(message_txt, user.id, buttons_array);
    } else if (user.has_pending == 1) {
        message_txt = "*Imposta una descrizione*\n\nCompleta il comando con la breve descrizione che vuoi impostare per la tua avventura.\n";
        message_txt += "\nEsempio:\n· `/bardo descrizione \nLa mia, incredibile, " + (user.personals.length + 1) + "° avventura.\nRiuscirai a completarla?`\n";
        if (desc.length > 160) {
            message_txt += "\n*NB*\nPuoi usare al massimo 160 caratteri";
        } else if (cmd_imput != "desc") {
            message_txt += "\n*Tip*\nPuoi usare anche `desc`";
        }
        return simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:NEW:START' }]])
    }
}

function set_adventureDelay_message(user, delay) {
    let message_txt;
    let parsed_int = parseInt(delay);
    if (!isNaN(parsed_int) && parsed_int >= 5 && parsed_int <= 90) {
        message_txt = "*Attesa per Scelta* \n\n";
        message_txt += "· " + delay + " minuti ";

        if (parsed_int > 60) {
            message_txt += "(1h e " + (parsed_int - 60) + " min)\n";
        }
        let buttons_array = [
            [
                { text: "Conferma ✓", callback_data: 'INCARICHI:CONFIRM:DELAY' },
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }

            ]
        ];
        return simpleMessage(message_txt, user.id, buttons_array);
    } else if (user.has_pending == 1) {
        message_txt = "*Attesa per scelta*\n\nÈ il tempo che i giocatori dovranno aspettare tra un paragrafo ed un altro. Completa il comando specificando i minuti, ad esempio:\n· `/bardo attesa 75`\n";
        if (parsed_int < 5) {
            message_txt += "\n*NB*\nIl minimo sono 5 minuti.";
        } else if (parsed_int > 90) {
            message_txt += "\n*NB*\nAl massimo è possibile impostare 90 minuti (un'ora e mezza).";
        }
        return simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:NEW:START' }]])
    }
}

function set_adventureOption_confirm(user_id, type, query_text, inc_struct) {
    return new Promise(function (setType_confirm) {
        let q_text;
        let new_option;
        if (type == "PARAGRAPH_DESC") {
            return paragraph_setParagraphTex_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
                } else {
                    q_text = "✅\n\nParagrafo Modificato";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "NEW_CHOICE") { // paragraph_removeChoice_confirm
            return paragraph_addChoice_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
                } else {
                    q_text = "✅\n\n⨓ Strada Aggiunta";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "DEL_CHOICE") { // paragraph_setChoiceText_confirm
            return paragraph_removeChoice_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
                } else {
                    q_text = "❌\n\n⨓ Strada Eliminata";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "CHOICE_TITLE") { // paragraph_setChoiceText_confirm
            return paragraph_setChoiceText_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
                } else {
                    q_text = "✅\n\n⨓ Testo Strada Aggiornato";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "CHOICE_DELAY") { // paragraph_setChoiceText_confirm
            return paragraph_setChoiceDelay_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
                } else {
                    q_text = "✅\n\n⨓ Attesa strada aggiornata:\n\n"+to_return.new_delay+" minuti";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        }else {
            if (type == "TITLE") {
                new_option = query_text.split("\n")[0].trim();
                q_text = "📜\n\nTitolo dell'avventura modificato:\n\n" + new_option;
            } else if (type == "DESC") {
                new_option = query_text.substring(query_text.indexOf("«") + 1, query_text.indexOf("»"));
                q_text = "📃\n\nDescrizione dell'avventura modificata!\n\n";
            } else if (type == "diff") {
                new_option = query_text;
            } else if (type == "SOLO" || type == "MULTI") {
                new_option = type;
                q_text = "\n\nTipo dell'avventura modificato:\n\n";
                q_text = (new_option == "MULTI" ? "👥" + q_text + "Per Squadre" : "👤" + q_text + "Solitaria");
            } else if (type == "DELAY") {
                new_option = parseInt(query_text.substring(query_text.indexOf("·") + 2, query_text.indexOf(" minuti")));
                q_text = "⌛️\n\nNuovo tempo d'attesa per scelta:\n\n" + new_option + " minuti";
            }
            return model.editUserDaft(user_id, type, new_option).then(function (res) {
                if (res.esit === false) {
                    return (setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) }));
                } else {
                    return setType_confirm({ query_text: q_text });
                }
            });
        }
    });
}

function adventure_editingMenu_message(user_info, tmpInc_imfos) {
    if (!tmpInc_imfos) {
        return ({ toSend: simpleMessage("*Woops!*\n\nNon mi risulta tu stia scrivendo un'avventura...", user_info.id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) });
    }
    let message_txt = "";
    let buttons_array = [];
    message_txt += "📜 *" + tmpInc_imfos.title + "*\n";

    if (tmpInc_imfos.type == "SOLO") {
        message_txt += "_...un'avventura personale, ";
    } else {
        message_txt += "_...un'avventura per squadre, ";
    }
    message_txt += "di " + user_info.alias + "_\n\n";

    if (tmpInc_imfos.paragraphs_ids.length > 0) {
        message_txt += "· Paragrafi: " + tmpInc_imfos.paragraphs_ids.length + "\n";
        message_txt += "· Difficoltà: " + tmpInc_imfos.diff + "\n";
    }
    message_txt += "· Attesa per scelta: ";
    if (tmpInc_imfos.delay < 60) {
        message_txt += tmpInc_imfos.delay + " minuti\n";
    } else if (tmpInc_imfos.delay == 60) {
        message_txt += "1h\n";
    } else {
        message_txt += "1h e " + (tmpInc_imfos.delay - 60) + "m \n";
    }

    if (tmpInc_imfos.desc == "") {
        message_txt += "\n_«Una breve descrizione. Sarà automaticamente formattata in corsivo e tra virgolette. Probabilmente e come per il titolo, è meglio settarla dopo una prima stesura...»_\n";
    } else {
        message_txt += "\n_«" + tmpInc_imfos.desc + "»_\n\n";
    }

    buttons_array.push([
        { text: "⌘", callback_data: 'INCARICHI:NEW:EDIT:CMD' },
        { text: "↺", callback_data: 'INCARICHI:NEW:EDIT' },
        { text: "⨷", callback_data: 'INCARICHI:FORGET' },
        { text: "⌫", callback_data: 'INCARICHI:NEW:TMP_DELETE' }
    ]);
    if (tmpInc_imfos.paragraphs_ids.length <= 0) {
        buttons_array.push([{ text: "Aggiungi un primo paragrafo", callback_data: 'INCARICHI:NEW:PARAGRAPH' }]);
    } else {
        buttons_array[0].unshift({ text: "▤", callback_data: 'INCARICHI:NEW:PARAGRAPH:SELECT' });
        if (tmpInc_imfos.paragraphs_ids.length >= 2) {
            buttons_array.push([{ text: "Prova!", callback_data: 'INCARICHI:NEW:TEST:START' }]);
        }
    }

    return ({ toSend: simpleMessage(message_txt, user_info.id, buttons_array) });
}

// PARAGRAPHS MANAGERS
function paragraphMainManager(user, message_text, in_to_return) {
    return new Promise(function (mainManager_res) {
        return model.getUserDaft(user.id).then(function (inc_struct) {
            if (inc_struct === false) {
                let message_txt = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                return mainManager_res({ toSend: simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
            } else {
                let to_return = in_to_return;

                if (message_text.length > 0) {
                    let splitted_text = message_text.toLowerCase().trim().split(" ");
                    console.log("splitted_text: " + splitted_text.join(":"))

                    if (checkParagraphID(splitted_text[0].trim()) === false) {
                        return mainManager_res(incarichi_AuthorCommands_message(user.id));
                    } else {
                        let curr_paragraph_id = splitted_text[0].toUpperCase();
                        let strada_bool = false;
                        let nuova_bool = false;
                        let attesa_bool;
                        let choice_index;
                        console.log(splitted_text.join(":"));

                        if (splitted_text.length > 1) {
                            let tmp_toParse = splitted_text[1].trim();
                            if (tmp_toParse == "s" || tmp_toParse == "strada" || tmp_toParse == "scelta") {
                                strada_bool = true;
                                if (splitted_text.length > 3) {
                                    choice_index = splitted_text[2].trim();

                                    tmp_toParse = splitted_text[3].trim();
                                    if (tmp_toParse == "a" || tmp_toParse != "attesa") {
                                        attesa_bool = true;
                                    } else {
                                        strada_bool = (!isNaN(parseInt(choice_index)) || checkParagraphID(choice_index) == true);
                                    }
                                }
                            } else if (tmp_toParse == "nuova" && splitted_text.length > 2 && splitted_text[2].trim() == "strada") {
                                nuova_bool = true;
                            }
                        }


                        if (nuova_bool) { // new choice
                            let curr_desc = message_text.split(" ").slice(3).join(" ").trim();
                            return mainManager_res(paragraph_addChoice_message(user.id, inc_struct, curr_paragraph_id, curr_desc));
                        } else if (strada_bool) { // manager per "strada" 
                            return model.loadParagraph(user.id, curr_paragraph_id).then(function (paragraph_infos) {
                                if (attesa_bool) {
                                    return mainManager_res(paragraph_setChoiceAttesa_message(user.id, inc_struct, choice_index, paragraph_infos, splitted_text.splice(4).join(" ")));
                                } else {
                                    let new_choice_text = message_text.split(" ").slice(3).join(" ").trim();
                                    return mainManager_res(paragraph_setChoiceText_message(user.id, inc_struct, choice_index, paragraph_infos, new_choice_text));
                                }
                            });

                        } else if (splitted_text.length >= 2) { // mando al setParagraphText
                            let curr_desc;
                            let type = 0; // 0 = default, 1 = notturno
                            if (splitted_text[1].trim() == "nott" || splitted_text[1].match("notturn")) {
                                curr_desc = message_text.split(" ").slice(2).join(" ").trim();
                                type = 1;
                                console.log("NOTTURNO!");

                            } else {
                                curr_desc = message_text.split(" ").slice(1).join(" ").trim();
                            }
                            return mainManager_res(paragraph_setTex_message(user.id, type, inc_struct, curr_paragraph_id, curr_desc));
                        } else {
                            return paragraph_MessageManager(user.id, inc_struct, curr_paragraph_id).then(function (to_send) {
                                to_return.toSend = to_send.toSend;
                                return mainManager_res(to_return);
                            });
                        }
                    }
                } else {
                    to_return.toSend = selectParagraph(user.id, inc_struct).toSend;
                    return mainManager_res(to_return);
                }
            }
        });
    })
}

function paragraph_MessageManager(user_id, inc_struct, paragraph_id) {
    return new Promise(function (paragraphManager_res) {
        if (inc_struct.paragraphs_ids.indexOf(paragraph_id) < 0) {
            let message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return paragraphManager_res({ toSend: simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
        } else {
            return model.loadParagraph(user_id, paragraph_id).then(function (paragraph_infos) {
                return paragraphManager_res({ toSend: paragraph_message(user_id, inc_struct, paragraph_infos) });
            });
        }
    });
}

function newParagraph(user_info) {
    return new Promise(function (newParagraph_res) {
        if (user_info.has_pending == 0) {
            let message_txt = "*Mumble...*\n\nNon mi risulta tu abbia una bozza aperta...\nVuoi crearne una nuova?\n";
            return Promise.resolve(({ toSend: simpleMessage(message_txt, user_info.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:NEW:START' }]]) }));
        }
        return model.getUserDaft(user_info.id).then(function (inc_struct) {
            if (inc_struct.esit == false) {
                return queryManager_res({
                    query_text: "Woops!",
                    toSend: simpleMessage(inc_struct.text, user.id)
                });
            }
            return model.createParagraph(user_info.id, inc_struct, 0, 0).then(function (new_paragraph) {
                if (new_paragraph.esit === false) {
                    return newParagraph_res({ query_text: "Woops!", toSend: simpleMessage(new_paragraph.text, user_id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) });
                } else {
                    let res = paragraph_message(user_info.id, inc_struct, new_paragraph);

                    return newParagraph_res({ query_text: "Paragrafo " + new_paragraph.id, toSend: res });
                }
            });
        });
    });
}

function selectParagraph(user_id, inc_struct) {
    let message_txt = "📜 *" + inc_struct.title + "*\n_" + inc_struct.paragraphs_ids.length + " paragrafi_\n\n";
    let buttons_array = [[{ text: "Inizio ✨", callback_data: "INCARICHI:NEW:PARAGRAPH:SELECT:" + inc_struct.paragraphs_ids[0] }]];

    if (inc_struct.paragraphs_ids.length == 2) {
        message_txt += "• Prevedi almeno 3 strade per il paragrafo iniziale";
        buttons_array.push([{ text: "Unica Scelta", callback_data: "INCARICHI:NEW:PARAGRAPH:SELECT:" + inc_struct.paragraphs_ids[1] }])
    } else {
        for (let i = 0; i < inc_struct.paragraphs_ids.length; i++) {
            message_txt += "· `" + inc_struct.paragraphs_ids[i] + "`\n";
        }
        message_txt += "\n• Per la selezione rapida, usa:\n· `/b p \\[codice]`";
        buttons_array.push([{ text: "Ultima inserita", callback_data: "INCARICHI:NEW:PARAGRAPH:SELECT:" + inc_struct.paragraphs_ids[inc_struct.paragraphs_ids.length - 1] }])
    }
    buttons_array.push([{ text: "Bozza ⮐", callback_data: 'INCARICHI:NEW:EDIT' }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]);

    return ({ toSend: simpleMessage(message_txt, user_id, buttons_array) });
}

function paragraph_setTex_message(user_id, type, inc_struct, paragraph_id, new_paragraph_text) {
    let message_txt;
    let to_return = { toSend: {} };
    if (inc_struct.paragraphs_ids.indexOf(paragraph_id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]])
    } else {
        if (new_paragraph_text.length == 0) {
            let is_first = (inc_struct.paragraphs_ids[0] == paragraph_id);
            message_txt = "*Imposta Testo Paragrafo*\n\n";
            message_txt += "• Completa il comando con il testo che vuoi attribuire al _paragrafo_:\n";
            if (is_first) {
                message_txt += "È il primo messaggio che " + (inc_struct.type == "SOLO" ? "il giocatore " : "la squadra ") + "leggerà avviando l'avventura.\n";
            } else {
                message_txt += "È il messaggio mostrato alla scelta di una strada, dopo l'attesa specificata...\n";
            }
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else if (new_paragraph_text.split(" ").length <= 5) {
            message_txt = "*Woops!*\n_Testo paragrafo troppo corto_\n\n";
            message_txt += "\"_" + new_paragraph_text + "_\"\n\n";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else if (new_paragraph_text.length > 500) {
            message_txt = "*Woops!*\n_Testo paragrafo troppo lungo_\n\n";
            message_txt += "\"_" + new_choice_text + "_\"\n\n";
            message_txt += "• Per rendere più comoda l'avventura ai giocatori, il testo di un paragrafo non può essere piu lungo di 500 caratteri.\n";
            //            message_txt += "Puoi provare a dividere questo testo in più paragrafi...";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else {
            let is_first = (inc_struct.paragraphs_ids[0] == paragraph_id);
            if (type == 0) {
                message_txt = "*" + ((inc_struct.text != "") ? "Aggiorna " : "") + "Testo di Default*\n";
            } else {
                message_txt = "*" + ((inc_struct.text != "") ? "Aggiorna " : "") + "Testo Notturno* 🌙\n";
            }
            message_txt += "_paragrafo_ `" + paragraph_id + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";
            message_txt += "_" + new_paragraph_text.charAt(0).toUpperCase() + new_paragraph_text.substring(1) + "_\n\n";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Conferma ✓", callback_data: "INCARICHI:CONFIRM:PARAGRAPH_DESC" }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]])
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
                if (type == 0) {
                    loaded_paragraph_infos.text = new_paragraph_text;
                } else if (type == 1) { // notturno
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

function paragraph_addChoice_message(user_id, inc_struct, paragraph_id, new_choice_text) {
    let message_txt;
    let to_return = { toSend: {} };

    if (inc_struct.paragraphs_ids.indexOf(paragraph_id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        if (new_choice_text.length === 0) {
            message_txt = "*Nuova Strada*\n\n";
            message_txt += "• Per aggiungere una scelta al paragrafo " + paragraph_id + ", completa il comando con il testo che vuoi attribuire alla _strada_:\n";
            message_txt += "• È il messaggio mostrato sotto al paragrafo, in un bottone.\n";
            message_txt += "• Nei bottoni è consigliato usare la terza persona.\n";
            message_txt += "\nEspempio:\n• `/bardo p " + paragraph_id + " nuova strada \nCorri!`";

            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else if (new_choice_text.length < 3) {
            message_txt = "*Woops!*\n_Testo strada troppo corto_\n\n";
            message_txt += "\"_" + new_choice_text + "_\"\n\n";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else if (new_choice_text.length > 30) {
            message_txt = "*Woops!*\n_Testo strada troppo lungo_\n\n";
            message_txt += "\"_" + new_choice_text + "_\"\n\n";
            message_txt += "• Per essere leggibile in un bottone, il testo di una strada non può essere piu lungo di 30 caratteri.\n(extra: +" + (new_choice_text.length - 30) + ")";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else {
            let is_first = (inc_struct.paragraphs_ids[0] == paragraph_id);
            message_txt = "⨓ *Nuova Strada*\n";
            message_txt += "_paragrafo_ `" + paragraph_id + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";
            message_txt += "> _" + new_choice_text.charAt(0).toUpperCase() + new_choice_text.substring(1) + "_\n\n";

            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Conferma ✓", callback_data: "INCARICHI:CONFIRM:NEW_CHOICE" }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        }
    }
    return (to_return);
}

function paragraph_addChoice_confirm(user_id, query_text, inc_struct) {
    return new Promise(function (paragraph_addChoice_confirm_res) {
        let splitted_imputText = query_text.split("\n");
        let curr_paragraph_id = splitted_imputText[1].split(" ")[1];
        let new_paragraph_text = splitted_imputText.slice(2).join("\n").trim().substring(2);

        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return ({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                return model.createChoice(user_id, new_paragraph_text, inc_struct, 0, curr_paragraph_id).then(function (new_choice) {
                    loaded_paragraph_infos.choices.push(new_choice);

                    return model.updateParagraph(user_id, curr_paragraph_id, loaded_paragraph_infos).then(function (new_data) {
                        if (new_data.esit === false) {
                            return paragraph_addChoice_confirm_res(new_data);
                        } else {
                            return paragraph_addChoice_confirm_res({ paragraph_infos: loaded_paragraph_infos });
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
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

    if (!inc_struct.paragraphs_ids || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id);
    } else if (paragraph_infos.choices.length > 0) {
        message_txt = "*Spiacente*\n\n";
        message_txt += "• Non è possibile eliminare un paragrafo con delle scelte attive.\n• Prima di procedere, dovrai eliminare";
        if (paragraph_infos.choices.length == 1) {
            message_txt += " il paragrafo `" + paragraph_infos.choices[0].id + "`\n"
        } else {
            message_txt += " i paragrafi:\n"
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                message_txt += "· `" + paragraph_infos.choices[i].id + "`\n";
            }
        }
        message_txt += "\n(...ed eventuali sotto-paragrafi)\n";
        buttons_array[0].unshift({ text: "Indietro ⮐", callback_data: "INCARICHI:NEW:PARAGRAPH:SELECT:" + paragraph_infos.id });

        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
    } else {
        buttons_array = [[{ text: "Annulla ⮐", callback_data: "INCARICHI:NEW:PARAGRAPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

        if (paragraph_infos.father_id == 0) {
            message_txt = "*Woops...*\n\n";
            message_txt += "Piuttosto elimina l'avventura stessa!\nPassa per il comando:\n· `/bardo bozza`";
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else {
            message_txt = "⨓ *Rimuovi Strada*\n";
            message_txt += "_paragrafo " + paragraph_infos.id + "_\n\n";
            message_txt += "Non sarà possibile recuperare alcun dato dopo la conferma...";
            buttons_array.unshift([{ text: "Elimina ❌", callback_data: "INCARICHI:CONFIRM:DEL_CHOICE:" + paragraph_infos.id }]);
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        }
    }
    return (to_return);
}

function paragraph_setChoiceText_message(user_id, inc_struct, choice_index, paragraph_infos, new_choice_text) {
    let message_txt;
    let to_return = {};
    if (paragraph_infos.esit == false || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]])
    } else if (paragraph_infos.choices.length <= 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che tu abbia già settato una scelta per il paragrafo " + paragraph_infos.id + "..";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]])
    } else if (new_choice_text.length == 0) {
        if (typeof choice_index == "undefined") {
            choice_index = 1;
        }
        message_txt = "*Modifica Strada*\n\n";
        message_txt += "• Completa il comando per cambiare il testo di una scelta del paragrafo " + paragraph_infos.id + ".\n";
        message_txt += "\nEspempio:\n• `/bardo p " + paragraph_infos.id + " strada " + choice_index + " \nCorri!`";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else if (new_choice_text.length < 3) {
        message_txt = "*Woops!*\n_Testo strada troppo corto_\n\n";
        message_txt += "\"_" + new_choice_text + "_\"\n\n";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else if (new_choice_text.length > 30) {
        message_txt = "*Woops!*\n_Testo strada troppo lungo_\n\n";
        message_txt += "\"_" + new_choice_text + "_\"\n\n";
        message_txt += "• Per essere leggibile in un bottone, il testo di una strada non può essere piu lungo di 30 caratteri.\n(extra: +" + (new_choice_text.length - 30) + ")";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        let buttons_array = [[{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:NEW:PARAGRAPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];
        if (!isNaN(choice_index)) {
            choice_index = Math.abs(parseInt(choice_index));
            if (choice_index != 0) {
                choice_index--;
            }

            if (choice_index >= paragraph_infos.choices.length) {
                message_txt = "*Woops!*\n_indice scelta non valido!_\n\n";
                message_txt += "• Mi risulta ci " + (paragraph_infos.choices.length == 1 ? "sia" : "siano") + " solo " + paragraph_infos.choices.length;
                message_txt += simpleGenderFormatter((paragraph_infos.choices.length == 1), "scelt", "a", "e") + " nel paragrafo `" + paragraph_infos.id + "`";
                to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
            } else {
                message_txt = "*Modifica " + (choice_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.choices[choice_index].id + "_\n\n";
                message_txt += "> `" + new_choice_text + "`\n";
                message_txt += "\nIl testo precedente era:\n> `" + paragraph_infos.choices[choice_index].title_text + "`\n";
                buttons_array.unshift([{ text: "Conferma ✓", callback_data: "INCARICHI:CONFIRM:CHOICE_TITLE:" }])
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
                to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
            } else {
                message_txt = "*Modifica " + (choice_index + 1) + "° Strada*\n_del paragrafo " + curr_choice_infos.id + "_\n\n";
                message_txt += "> `" + new_choice_text + "`\n";
                message_txt += "\nIl testo precedente era:\n> `" + curr_choice_infos.title_text + "`\n";

                buttons_array.unshift([{ text: "Conferma ✓", callback_data: "INCARICHI:CONFIRM:CHOICE_TITLE:" }])
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
        let new_choice_text = splitted_imputText[3].substring(2);
        let message_txt = "";

        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return ({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                let curr_choice_index = -1;
                for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                    if (loaded_paragraph_infos.choices[i].id == curr_paragraph_id) {
                        curr_choice_index = i;
                        break;
                    }
                }

                if (curr_choice_index < 0) {
                    message_txt = "*Woops!*\n_codice scelta non valido!_\n\n";
                    if (paragraph_infos.choices.length == 1) {
                        message_txt += "• Il paragrafo al momento ha solo una strada, con codice: " + paragraph_infos.choices[0].id + "\n\n";
                        message_txt += "• Usa\n· `/bardo p " + paragraph_infos.id + " strada " + paragraph_infos.choices[0].id + "\n" + new_choice_text + "`\n\n";
                    } else {
                        message_txt += "• Le scelte nel paragrafo hanno codice:\n";
                        for (let i = 0; i < paragraph_infos.choices.length; i++) {
                            message_txt += "· `" + paragraph_infos.choices[i].id + "\n";
                        }
                        message_txt += "\n• Usa:\n· `/bardo p " + paragraph_infos.id + " strada \\[codice] " + new_choice_text + "`";
                    }
                    return paragraph_setChoiceText_confirm_res({ esit: false, text: message_txt });
                } else {
                    loaded_paragraph_infos.choices[i].title_text = new_choice_text;
                    return model.updateParagraph(user_id, curr_paragraph_id, loaded_paragraph_infos).then(function (update_res) {
                        if (update_res.esit === false) {
                            return paragraph_setChoiceText_confirm_res(update_res);
                        } else {
                            return paragraph_setChoiceText_confirm_res({ paragraph_infos: loaded_paragraph_infos }); // info per il padre
                        }
                    })
                }
            });
        }
    });
}

function paragraph_setChoiceAttesa_message(user_id, inc_struct, choice_index, paragraph_infos, new_delay) {
    console.log("Imput: choice_index: "+choice_index+", new_delay:"+new_delay);
    let message_txt;
    let to_return = {};
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

    if (paragraph_infos.esit == false || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array)
    } else if (paragraph_infos.choices.length <= 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che tu abbia già settato una scelta per il paragrafo " + paragraph_infos.id + "..";
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array)
    } else {
        if (!new_delay || new_delay.length == 0 || isNaN(parseInt(new_delay))) {
            message_txt = "*Attesa Scelta*\n\n";
            message_txt += "• Completa il comando.\nSpecifica il tempo, in minuti, che i giocatori dovranno attendere per passare al paragrafo successivo.\n";
            message_txt += "\nEspempio:\n• `/bardo p " + paragraph_infos.id + " strada 1 attesa 5`";
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else{
            if (!isNaN(choice_index)) {
                choice_index = Math.abs(parseInt(choice_index));
                if (choice_index != 0) {
                    choice_index--;
                }
                if (choice_index >= paragraph_infos.choices.length) {
                    message_txt = "*Woops!*\n_indice scelta non valido!_\n\n";
                    message_txt += "• Mi risulta ci " + (paragraph_infos.choices.length == 1 ? "sia" : "siano") + " solo " + paragraph_infos.choices.length;
                    message_txt += simpleGenderFormatter((paragraph_infos.choices.length == 1), " scelt", "a", "e") + " nel paragrafo `" + paragraph_infos.id + "`";
                    to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
                } else if (new_delay < 5 || new_delay > 90) {
                    message_txt = "*Attesa della " + (choice_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.choices[choice_index].id + "_\n\n";
                    message_txt += "• Deve essere compresa tra 5 e 90 minuti\n";
                    message_txt += "\nEspempio:\n• `/bardo p " + paragraph_infos.id + " strada " + choice_index + " attesa "+(new_delay < 5 ? 5 : 90)+"`";
                    to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
                } else {
                    message_txt = "*Attesa della " + (choice_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.choices[choice_index].id + "_\n\n";
                    message_txt += "> " + new_delay + " minuti\n";
                    buttons_array.unshift([{ text: "Conferma ✓", callback_data: "INCARICHI:CONFIRM:CHOICE_DELAY:" }])
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
    
                        message_txt += "• O anche:\n· `/bardo p " + paragraph_infos.id + " strada 1 attesa "; //"`...";
                        message_txt += (new_delay < 5 ? 5 : (new_delay > 90 ? 90 : new_delay)) + "`\n";
                    } else {
                        message_txt += "• Le scelte nel paragrafo hanno codice:\n";
                        for (let i = 0; i < paragraph_infos.choices.length; i++) {
                            message_txt += "· `" + paragraph_infos.choices[i].id + "\n";
                        }
                        message_txt += "\n• Usa:\n· `/bardo p " + paragraph_infos.id + " strada \\[codice] attesa " + (new_delay < 5 ? 5 : (new_delay > 90 ? 90 : new_delay)) + "`";
                    }

                    to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
                } else if (new_delay < 5 || new_delay > 90) {
                    message_txt = "*Attesa della " + (choice_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.choices[choice_index].id + "_\n\n";
                    message_txt += "• Deve essere compresa tra 5 e 90 minuti\n";
                    message_txt += "\nEspempio:\n• `/bardo p " + paragraph_infos.id + " strada " + choice_index + " attesa "+(new_delay < 5 ? 5 : 90)+"`";
                    to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
                } else {
                    message_txt = "*Attesa della " + (choice_index + 1) + "° Strada*\n_del paragrafo " + curr_choice_infos.id + "_\n\n";
                    message_txt += "> " + new_delay + " minuti\n";
    
                    buttons_array.unshift([{ text: "Conferma ✓", callback_data: "INCARICHI:CONFIRM:CHOICE_DELAY:" }])
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
        let message_txt = "";

        if (inc_struct.paragraphs_ids.indexOf(curr_paragraph_id) < 0) {
            message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return ({ esit: false, text: message_txt });
        } else {
            return model.loadParagraph(user_id, curr_paragraph_id).then(function (loaded_paragraph_infos) {
                let curr_choice_index = -1;
                for (let i = 0; i < loaded_paragraph_infos.choices.length; i++) {
                    if (loaded_paragraph_infos.choices[i].id == curr_paragraph_id) {
                        curr_choice_index = i;
                        break;
                    }
                }

                if (curr_choice_index < 0) {
                    message_txt = "*Woops!*\n_codice scelta non valido!_\n\n";
                    if (paragraph_infos.choices.length == 1) {
                        message_txt += "• Il paragrafo al momento ha solo una strada, con codice: " + paragraph_infos.choices[0].id + "\n\n";
                        message_txt += "• Usa\n· `/bardo p " + paragraph_infos.id + " \nstrada " + paragraph_infos.choices[0].id + " attesa " + new_choice_delay + "`\n\n";
                    } else {
                        message_txt += "• Le scelte nel paragrafo hanno codice:\n";
                        for (let i = 0; i < paragraph_infos.choices.length; i++) {
                            message_txt += "· `" + paragraph_infos.choices[i].id + "\n";
                        }
                        message_txt += "\n• Usa:\n· `/bardo p " + paragraph_infos.id + " \nstrada \\[codice] attesa" + new_choice_delay + "`";
                    }
                    return paragraph_setChoiceDelay({ esit: false, text: message_txt });
                } else {
                    loaded_paragraph_infos.choices[i].delay = new_choice_delay;
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

function paragraph_message(user_id, inc_struct, paragraph_infos) {
    let buttons_array = [];
    let is_first = (paragraph_infos.father_id == 0);
    let message_txt = "*" + inc_struct.title + "*\n";
    message_txt += "_paragrafo_ `" + paragraph_infos.id + "`" + (is_first ? " _(inizio)_" : "") + "\n";

    // Paragrafo
    if (paragraph_infos.availability == "ALL") {
        if (paragraph_infos.night_text == "") {
            message_txt += "\n*Testo Unico* ☀️";
        } else {
            message_txt += "\n*Testo di Default* ☀️";
        }

        if (paragraph_infos.text == "") {
            message_txt += "\n_Il testo del paragrafo sarà in corsivo, usa il tempo presente per la narrazione_\n";
        } else {
            message_txt += "\n_" + paragraph_infos.text + "_\n"
        }

        if (paragraph_infos.night_text != "") {
            message_txt += "\n*Variante notturna* 🌙";
            message_txt += "\n_" + paragraph_infos.night_text + "_\n"
        }
    } else {
        if (paragraph_infos.availability == "DAY") {
            message_txt += "\n• *Evento* ☀️";
            if (paragraph_infos.text == "") {
                message_txt += "\n_Il testo del paragrafo sarà in corsivo, usa il tempo presente per la narrazione_\n";
            } else {
                message_txt += "\n_" + paragraph_infos.text + "_\n"
            }
        } else if (paragraph_infos.availability == "NIGTH") {
            message_txt += "\n• *Evento* 🌙";
            if (paragraph_infos.night_text == "") {
                message_txt += "\n_Il testo del paragrafo sarà in corsivo, usa il tempo presente per la narrazione_\n";
            } else {
                message_txt += "\n_" + paragraph_infos.night_text + "_\n"
            }
        }


    }

    if (paragraph_infos.type == 0) { // Strade
        if (paragraph_infos.choices.length > 0) {
            if (paragraph_infos.choices.length == 1) {
                message_txt += "\n• ⨓ una sola strada";
            } else if (paragraph_infos.choices.length > 1) {
                message_txt += "\n• ⨓ " + paragraph_infos.choices.length + " strade";
            }
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                let tmp_text = paragraph_infos.choices[i].availability == "DAY" ? "☀️" : (paragraph_infos.choices[i].availability == "NIGTH" ? "🌙" : "⭐️");
                tmp_text += " " + paragraph_infos.choices[i].title_text + " (" + paragraph_infos.choices[i].delay + "min) ";
                buttons_array.push([{ text: tmp_text, callback_data: 'INCARICHI:NEW:PARAGRAPH:SELECT:' + paragraph_infos.choices[i].id }]);
            }
        }
        if (is_first === true) {
            if (paragraph_infos.choices.length == 2) {
                message_txt += "\n• Aggiungi almeno un'altra strada.";
            } else if (paragraph_infos.choices.length < 3) {
                message_txt += "\n• Prevedi almeno 3 strade all'inizio dell'avventura.";
            }

        } else {
            if (paragraph_infos.choices.length == 1) {
                message_txt += "\n• Aggiungi almeno un'altra strada.";
            } else if (paragraph_infos.choices.length < 2) {
                message_txt += "\n• Prevedi almeno 2 strade per il paragrafo, o segnala come _fine avventura_";
            }
        }
    } else { // Fine
        message_txt += "• Stato: Fine" + (paragraph_infos.type == -1 ? " negativa" : " positiva") + "\n";
    }

    // linea bottoni
    if (!is_first) {
        let firstLine_buttons = [];
        if (paragraph_infos.type == 0) {
            firstLine_buttons.push(
                { text: "🌚", callback_data: 'INCARICHI:NEW:PARAGRAPH:END:NEGATIVE' },
                { text: "🌝", callback_data: 'INCARICHI:NEW:PARAGRAPH:END:POSITIVE' }
            );
        } else if (paragraph_infos.type == -1) {
            firstLine_buttons.push(
                { text: "🌍", callback_data: 'INCARICHI:NEW:PARAGRAPH:END:OPEN' },
                { text: "🌝", callback_data: 'INCARICHI:NEW:PARAGRAPH:END:POSITIVE' }
            );
        } else if (paragraph_infos.type == 1) {
            firstLine_buttons.push(
                { text: "🌚", callback_data: 'INCARICHI:NEW:PARAGRAPH:END:NEGATIVE' },
                { text: "🌍", callback_data: 'INCARICHI:NEW:PARAGRAPH:END:OPEN' }
            );
        }
        if (paragraph_infos.availability == "DAY") {
            firstLine_buttons.push(
                { text: "⭐", callback_data: 'INCARICHI:NEW:PARAGRAPH:AVAILABILITY:ALL' },
                { text: "🌙", callback_data: 'INCARICHI:NEW:PARAGRAPH:AVAILABILITY:NIGTH' }
            );
        } else if (paragraph_infos.availability == "NIGTH") {
            firstLine_buttons.push(
                { text: "⭐", callback_data: 'INCARICHI:NEW:PARAGRAPH:AVAILABILITY:ALL' },
                { text: "☀️", callback_data: 'INCARICHI:NEW:PARAGRAPH:AVAILABILITY:DAY' }
            );
        } else {
            firstLine_buttons.push(
                { text: "☀️", callback_data: 'INCARICHI:NEW:PARAGRAPH:AVAILABILITY:DAY' },
                { text: "🌙", callback_data: 'INCARICHI:NEW:PARAGRAPH:AVAILABILITY:NIGTH' }
            );
        }
        firstLine_buttons.push({ text: "⌫", callback_data: 'INCARICHI:NEW:PARAGRAPH:DELETE:' + paragraph_infos.id });
        buttons_array.unshift(firstLine_buttons);

        buttons_array.push([{ text: "Indietro ⮐", callback_data: ("INCARICHI:NEW:PARAGRAPH:SELECT:" + paragraph_infos.father_id) }, { text: "⌘", callback_data: ("INCARICHI:NEW:PARAGRAPH:CMDS:" + paragraph_infos.id) }]);
        buttons_array.push([{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]);
    } else {
        buttons_array.push([{ text: "⮐", callback_data: 'INCARICHI:NEW:EDIT' }, { text: "⌘", callback_data: ("INCARICHI:NEW:PARAGRAPH:CMDS:" + inc_struct.paragraphs_ids[0]) }, { text: "⨷", callback_data: "INCARICHI:FORGET" }]);
    }

    return simpleMessage(message_txt, user_id, buttons_array);
}


// ACCESSORIE

function checkUnaviableChars(message_txt) {
    let splitted = message_txt.split("");
    let unaviable_char = ["_", "*", "`"];
    for (let i = 0; i < message_txt.length; i++) {// si potrebbe usare una semplice indexOf per tutti e tre, ma consumererebbe piu cpu
        if (unaviable_char.indexOf(splitted[i]) >= 0) {
            return true;
        }
    }
    return false;
}

function checkParagraphID(check_id) {
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