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
                        let user = new model.user(inc_res.user_infos, inc_res.personals);
                        let to_return = { toDelete: { chat_id: message.chat.id, mess_id: message.message_id } };
                        let target_text = "";
                        if (message.reply_to_message) {
                            target_text = message.reply_to_message.text;
                        } else {
                            target_text = message.text.split(" ").splice(2).join(" ")
                        }

                        if (splitted_text.length >= 3 && splitted_text[1] == "nuova" && splitted_text[2] == "strada") {
                            let message_txt = "*Woops*\n\nPer usare questo comando devi specificare l'id del paragrafo.\n";
                            message_txt += "\nAd esempio:\n· `/bardo p `\\[id\\_paragrafo] `" + splitted_text.slice(1).join(" ") + "`\n";
                            to_return.toSend = simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
                        } else if (splitted_text[1] == "intro") {
                            to_return.toSend = incarichi_AuthorInfos_message(user).toSend;
                        } else if (splitted_text[1] == "tipo") {
                            to_return.toSend = set_adventureType_message(user);
                        } else if (splitted_text[1] == "p" || "paragrafo".match(splitted_text[1])) { // return 
                            return paragraphMainManager(user, target_text, to_return).then(function (to_send) {
                                console.log(to_send);
                                return messageManager_res(to_send);
                            });
                        } else {
                            if (splitted_text[1] == "titolo") {
                                to_return.toSend = set_adventureTitle_message(user, target_text);
                            } else if (splitted_text[1] == "attesa") {
                                to_return.toSend = set_adventureDelay_message(user, target_text);
                            } else if ("descrizione".match(splitted_text[1])) {
                                to_return.toSend = set_adventureDesc_message(user, target_text);
                            } else if (user.has_pending == 1) {
                                to_return.toSend = incarichi_Cmds_message(user.id).toSend;
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
                let user = new model.user(inc_res.user_infos);
                return model.getUserTmpStruct(user.id).then(function (inc_struct) {
                    return set_adventureOption_confirm(user.id, question[2], query.message.text, inc_struct).then(function (to_return) {
                        let res = { query: { id: query.id, options: { text: to_return.query_text, show_alert: true, cache_time: 4 } }, toEdit: {} };
                        if (question[2] != "PARAGRAPH_DESC") {
                            res.toEdit = adventure_editingMenu_message(user, inc_struct).toSend;
                        } else {
                            res.toEdit = paragraph_message(user.id, inc_struct, to_return.paragraph_infos);
                        }
                        res.toEdit.mess_id = query.message.message_id;

                        return queryManager_res(res);
                    });
                });
            } else if (question[1] == "CURR_EDIT") {
                //let to_return = incarichi_newUser(query.from.id).toSend;
                //to_return.mess_id = query.message.message_id;
                return queryManager_res({
                    query: { id: query.id, options: { text: "Prossimamente...", cache_time: 4 } },
                    //toEdit: to_return
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
        let user = new model.user(by_user.user_infos, by_user.personals);
        let option = options_array[2];
        let to_return = { query_text: "" };
        if (option == "PARAGRAPH") {
            if (options_array.length <= 3) {
                return newParagraph(user, options_array.splice(3)).then(function (add_res) {
                    return manageNew_res(add_res);
                });
            } else {
                if (options_array[3] == "CMDS") {
                    to_return.toEdit = incarichi_AuthorCommands_message(user.id, options_array[4]).toSend;
                    to_return.toEdit.options.reply_markup.inline_keyboard[0].unshift({ text: "Indietro ↩", callback_data: "INCARICHI:NEW:PARAGRAPH:SELECT:" + options_array[4] });
                    to_return.query_text = "Comandi per l'editing";
                    return manageNew_res(to_return);
                } else if (options_array[3] == "SELECT") {
                    if (options_array.length >= 5) {
                        return model.getUserTmpStruct(user.id).then(function (inc_struct) {
                            return model.loadParagraph(user.id, options_array[4]).then(function (paragraph_infos) {
                                to_return.toEdit = paragraph_message(user.id, inc_struct, paragraph_infos);
                                to_return.query_text = "Paragrafo " + options_array[4];
                                return manageNew_res(to_return);
                            });
                        });
                    } else {
                        return manageNew_res({ query_text: "Prossimamente..." });
                    }
                } else { // paragraph_setParagraphTexConfirm
                    return manageNew_res({ query_text: "Prossimamente..." });
                }
            }
        } else if (option == "SELECT") {
            return selectParagraph(user).then(function (res_mess) {
                console.log(res_mess);
                to_return.toSend = res_mess.toSend;
                to_return.query_text = "Seleziona Paragrafo...";
                return manageNew_res(to_return);
            });
        } else if (option == "EDIT") { // ATTESA, TEXT, TITLE, TYPE
            if (options_array[3] == "CMD") {
                to_return.toEdit = incarichi_Cmds_message(user.id).toSend;
                to_return.query_text = "Comandi per l'editing";
                return manageNew_res(to_return);
            } else {
                return model.getUserTmpStruct(user.id).then(function (inc_infos) {
                    to_return.toEdit = adventure_editingMenu_message(user, inc_infos).toSend;
                    to_return.query_text = "Modifica Bozza";
                    return manageNew_res(to_return);
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
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];
    if (paragraph_id) {
        p_id = paragraph_id;
        buttons_array[0].push({ text: "Indietro ↩", callback_data: "INCARICHI:NEW:PARAGRAPH:SELECT:" + p_id })
    }
    let message_txt = "*Comandi per la modifica dei paragrafi*\n";

    message_txt += "\n• Per il testo del paragrafo:";
    message_txt += "\n· `/bardo p " + p_id + " `...\n";
    message_txt += "\n• Per il testo notturno:";
    message_txt += "\n· `/bardo p " + p_id + " notturno `...\n";
    message_txt += "\n• Per inserire una strada, agiungi:";
    message_txt += "\n· /…/` nuova strada `...\n";
    message_txt += "\n• Per il testo di una strada: ";
    message_txt += "\n· /…/` strada `\\[n\\_strada] ...\n";
    message_txt += "\n• Per cambiarene il tipo, aggiungi: ";
    message_txt += "\n· /…/ `tipo `...\n";
    message_txt += "\n• Per cambiarene l'attesa, aggiungi:";
    message_txt += "\n· /…/ `attesa `...\n";

    message_txt += "\n\nAd esempio:";
    message_txt += "\n• Per cambiare il testo del paragrafo AA01:\n· `/bardo p AA01 Una nuova avventura...`\n";
    message_txt += "\n• Per impostare a 5 minuti l'attesa della prima scelta del paragrafo AA00:\n· `/bardo p AA00 strada 1 attesa 5 `\n";

    let to_return = simpleMessage(message_txt, target_userID, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);

    return ({ toSend: to_return });
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

    let to_return = simpleMessage(message_txt, target_userID, [[{ text: "Indietro ↩", callback_data: 'INCARICHI:NEW_USER' }]]);

    return ({ toSend: to_return });
}

function incarichi_Cmds_message(target_userID) {
    let text = "*Comandi per l'editing*\n\n";
    text += "• Usali preceduti da `/bardo `\n";
    text += "• Anche in risposta\n";
    text += "• A vuoto per info\n";
    text += "\n· `intro`";
    text += "\n· `titolo`";
    text += "\n· `descrizione`";
    text += "\n· `tipo`";
    text += "\n· `attesa`";
    text += "\n· `paragrafo`";

    text += "\n\nAd esempio:\n· `/bardo titolo La mia prima avventura!`";


    let buttons_array = [[{ text: "Torna alla Bozza", callback_data: "INCARICHI:NEW:EDIT" }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]; // FORGET
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
                message_txt += "• _" + tmp_alias + "_, aspirante " + simpleGenderFormatter(gender, "Strillon", "e", "a") + "\n";
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
            return model.newUserTmpStruct(user_info).then(function (template_res) {
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
        return model.getUserTmpStruct(user_id).then(function (inc_struct) {
            if (inc_struct === false) {
                let message_txt = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                return (tmpDelete_res({ query_text: "Woops!", toEdit: simpleMessage(message_txt, user_id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) }));
            } else if (option == "CONFIRM") {
                return model.deleteUserTmp(user_id).then(function (del_res) {
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
                let buttons_array = [[{ text: "Indietro ↩", callback_data: 'INCARICHI:NEW:EDIT' }, { text: "Elimina ❌", callback_data: 'INCARICHI:NEW:TMP_DELETE:CONFIRM' }]];
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
                { text: "Annulla", callback_data: 'INCARICHI:NEW:EDIT' },
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
    if (typeof new_title === "string" && new_title.length <= 30 && new_title.length >= 8) {
        let splitted_title = new_title.split(" ");
        for (let i = 0; i < splitted_title.length; i++) {
            splitted_title[i] = splitted_title[i].charAt(0).toUpperCase() + splitted_title[i].slice(1);
        }
        message_txt = "*" + splitted_title.join(" ") + "* \n\n";
        message_txt += "Sarà il nuovo titolo della tua avventura.";
        let buttons_array = [
            [
                { text: "Conferma ✓", callback_data: 'INCARICHI:CONFIRM:TITLE' }
            ],
            [
                { text: "Annulla", callback_data: 'INCARICHI:NEW:EDIT' },
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }
            ]
        ];
        return simpleMessage(message_txt, user.id, buttons_array);
    } else if (user.has_pending == 1) {
        message_txt = "*Imposta un Titolo*\n\nCompleta il comando con il titolo che vuoi impostare per la tua bozza.\nEsempio:\n· `/bardo titolo La mia " + (user.personals.length + 1) + "° avventura`\n";
        if (new_title.length > 30) {
            message_txt += "\n*NB*\nPer rendere piu semplice la formattazione, non puoi usare più di 30 caratteri.";
        } else if (new_title.length < 8) {
            message_txt += "\n*NB*\nUsa almeno 8 caratteri!";
        }
        return simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:NEW:START' }]])
    }
}

function set_adventureDesc_message(user, desc) {
    let message_txt;
    if (typeof desc === "string" && desc.length <= 160) {

        message_txt = "*Descrizione Avventura* \n\n";
        message_txt += "«_" + desc + "_» \n\n";
        message_txt += "Sarà usato come descrizione per la tua avventura.\n";
        if (checkUnaviableChars(message_txt) == false) {
            message_txt += "\n*NB*\nAlcuni caratteri che hai usato sono usati per la formattazione del testo (che è automatica)";
        }
        let buttons_array = [
            [
                { text: "Conferma ✓", callback_data: 'INCARICHI:CONFIRM:DESC' }
            ],
            [
                { text: "Annulla", callback_data: 'INCARICHI:NEW:EDIT' },
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }
            ]
        ];
        return simpleMessage(message_txt, user.id, buttons_array);
    } else if (user.has_pending == 1) {
        message_txt = "*Imposta una descrizione*\n\nCompleta il comando con una breve descrizione che vuoi impostare per la tua bozza.\nEsempio:\n· `/bardo descrizione La mia incredibile " + (user.personals.length + 1) + "° avventura, riuscirai a completarla?`\n";
        if (desc.length > 160) {
            message_txt += "\n*NB*\nPuoi usare al massimo 160 caratteri";
        } else {
            message_txt += "\n*Tip*\nPuoi usare anche \"desc\"";
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
            ],
            [
                { text: "Annulla", callback_data: 'INCARICHI:NEW:EDIT' },
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }
            ]
        ];
        return simpleMessage(message_txt, user.id, buttons_array);
    } else if (user.has_pending == 1) {
        message_txt = "*Attesa per scelta*\n\nÈ il tempo che i giocatori dovranno aspettare tra una scelta e l'altra. Completa il comando specificando i minuti, ad esempio:\n· `/bardo attesa 75`\n";
        if (delay.length < 5) {
            message_txt += "\n*NB*\nIl minimo sono 5 minuti.";
        } else if (parsed_int > 90) {
            message_txt += "\n*NB*\nAl massimo è possibile impostare 90 minuti (un'ora e mezza). Considera che è possibile raddoppiare l'attesa per singole _strade_";
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
        } else {
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
                new_option = query_text.substring(query_text.indexOf("·") + 1, query_text.indexOf(" minuti"));
                q_text = "⌛️\n\nNuovo tempo d'attesa per scelta:\n\n" + new_option + " minuti";
            }
            return model.editUserTmpStruct(user_id, type, new_option).then(function (res) {
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
        message_txt += "\n_«Una breve descrizione comparirà qui, in corsivo e tra virgolette. Probabilmente e come per il titolo, è meglio settarla dopo una prima stesura...»_\n";
    } else {
        message_txt += "\n_«" + tmpInc_imfos.desc + "»_\n\n";
    }

    buttons_array.push([
        { text: "⌘", callback_data: 'INCARICHI:NEW:EDIT:CMD' },
        { text: "↺", callback_data: 'INCARICHI:NEW:EDIT' },
        { text: "⌫", callback_data: 'INCARICHI:NEW:TMP_DELETE' }
    ]);
    if (tmpInc_imfos.paragraphs_ids.length <= 0) {
        buttons_array.push([{ text: "Aggiungi un primo paragrafo", callback_data: 'INCARICHI:NEW:PARAGRAPH' }]);
    } else {
        buttons_array[0].unshift({ text: "▤", callback_data: 'INCARICHI:NEW:SELECT' });
        if (tmpInc_imfos.paragraphs_ids.length >= 2) {
            buttons_array.push([{ text: "Prova!", callback_data: 'INCARICHI:NEW:TEST:START' }]);
        }
    }

    return ({ toSend: simpleMessage(message_txt, user_info.id, buttons_array) });
}

// PARAGRAPHS MANAGERS
function paragraphMainManager(user, message_text, in_to_return) {
    return new Promise(function (mainManager_res) {
        return model.getUserTmpStruct(user.id).then(function (inc_struct) {
            if (inc_struct === false) {
                let message_txt = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                return mainManager_res({ toSend: simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
            } else {
                let to_return = in_to_return;
                let splitted_text = message_text.toLowerCase().split(" ");
                if (splitted_text.length > 0) {
                    if (checkParagraphID(splitted_text[0]) === false) {
                        console.log("Non un id!");
                        return mainManager_res(incarichi_AuthorCommands_message(user.id));
                    } else {
                        let curr_paragraph_id = splitted_text[0].toUpperCase();

                        if (splitted_text[1] == "nuova" && splitted_text[2] == "strada") { // mando al setParagraphText

                        } else if (splitted_text[1] == "strada" && checkParagraphID(splitted_text[2]) == true) { // controllo per "strada" e (tipo, attesa)

                        } else if (splitted_text.length >= 2) { // mando al setParagraphText
                            let curr_desc;
                            let type = 0; // 0 = default, 1 = notturno
                            console.log(splitted_text[1]);
                            if (splitted_text[1] == "notturno") {
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
                    return selectParagraph(user).then(function (to_send) {
                        to_return.toSend = to_send;
                        return mainManager_res(to_return);
                    });
                }
            }
        });
    })
}

function newParagraph(user_info) {
    return new Promise(function (newParagraph_res) {
        if (user_info.has_pending == 0) {
            let message_txt = "*Mumble...*\n\nNon mi risulta tu abbia una bozza aperta...\nVuoi crearne una nuova?\n";
            return Promise.resolve(({ toSend: simpleMessage(message_txt, user_info.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:NEW:START' }]]) }));
        }
        return model.getUserTmpStruct(user_info.id).then(function (inc_struct) {
            return model.createParagraph(user_info.id, inc_struct, 0).then(function (new_paragraph) {
                if (new_paragraph.esit === false) {
                    return newParagraph_res({ query_text: "Woops!", toEdit: simpleMessage(new_paragraph.text, user_id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) });
                } else {
                    let res = paragraph_message(user_info.id, inc_struct, new_paragraph);
                    res.options.reply_markup.inline_keyboard[0].unshift({ text: "Indietro ↩", callback_data: 'INCARICHI:NEW:EDIT' });

                    return newParagraph_res({ query_text: "Paragrafo " + new_paragraph.id, toEdit: res });
                }
            });
        });
    });
}

function selectParagraph(user) {
    return new Promise(function (selectParagraphManager_res) {
        return model.getUserTmpStruct(user.id).then(function (inc_struct) {
            if (inc_struct.paragraphs_ids.length == 1) { // carico l'unico paragrafo...
                return paragraph_MessageManager(user.id, inc_struct, inc_struct.paragraphs_ids[0]).then(function (to_send) {
                    return selectParagraphManager_res(to_send);
                })
            } else { // stampo la lista

            }
        });
    });
}

function paragraph_MessageManager(user_id, inc_struct, paragraph_id) {
    return new Promise(function (paragraphManager_res) {
        if (inc_struct.paragraphs_ids.indexOf(paragraph_id) < 0) {
            let message_txt = "*Woops!*\n\n";
            message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
            return paragraphManager_res({ toSend: simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
        } else {
            return model.loadParagraph(user_id, inc_struct.paragraphs_ids[0]).then(function (paragraph_infos) {
                return paragraphManager_res({ toSend: paragraph_message(user_id, inc_struct, paragraph_infos) });
            });
        }
    });
}

function paragraph_setTex_message(user_id, type, inc_struct, paragraph_id, new_paragraph_text) {
    let message_txt;
    if (inc_struct.paragraphs_ids.indexOf(paragraph_id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_id + " sia l'id di un paragrafo della tua bozza...";
        return ({ toSend: simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
    } else {
        if (new_paragraph_text.split(" ").length <= 5) {
            message_txt = "*Woops!*\n\n";
            message_txt += "_" + new_paragraph_text + "_\n\n";
            message_txt += "È troppo corto come testo!";
            return ({ toSend: simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
        } else {
            let is_first = (inc_struct.paragraphs_ids[0] == paragraph_id);
            if (type == 0) {
                message_txt = "*" + ((inc_struct.text != "") ? "Aggiorna " : "") + "Testo di Default*\n";
            } else {
                message_txt = "*" + ((inc_struct.text != "") ? "Aggiorna " : "") + "Testo Notturno* 🌙\n";
            }
            message_txt += "_paragrafo_ `" + paragraph_id + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";
            message_txt += "_" + new_paragraph_text.charAt(0).toUpperCase() + new_paragraph_text.substring(1) + "_\n\n";

            return ({ toSend: simpleMessage(message_txt, user_id, [[{ text: "Conferma ✓", callback_data: "INCARICHI:CONFIRM:PARAGRAPH_DESC" }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
        }
    }

}

function paragraph_setParagraphTex_confirm(user_id, query_text, inc_struct) {
    return new Promise(function (paragraph_setTexConfirm_res) {
        let splitted_imputText = query_text.split("\n");
        let new_paragraph_id = splitted_imputText[1].split(" ")[1];
        let new_paragraph_text = splitted_imputText.slice(2).join("\n").trim();
        let type = splitted_imputText[0].indexOf("Notturno") ? 1 : 0;
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
                return model.setTextOfParagraph(user_id, new_paragraph_id, loaded_paragraph_infos).then(function (new_data) {
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

function paragraph_AddChoice_message() {

}

function paragraph_message(user_id, inc_struct, paragraph_infos) {
    let buttons_array = [];
    let message_txt = "*" + inc_struct.title + "*\n";
    let is_first = (inc_struct.paragraphs_ids[0] == paragraph_infos.id);
    message_txt += "_paragrafo_ `" + paragraph_infos.id + "`" + (is_first ? " _(inizio)_" : "") + "\n";
    console.log(paragraph_infos.night_text);

    if (paragraph_infos.text == "") {
        message_txt += "\n_Il testo del paragrafo sarà in corsivo, usa il tempo presente per la narrazione_\n";
    } else {
        message_txt += "\n_" + paragraph_infos.text + "_\n"
    }

    if (typeof paragraph_infos.night_text == "undefined") {
        message_txt += "\n• Nessuna variante notturna 🌙\n";
    } else {
        message_txt += "\n*Variante notturna*🌙";
        message_txt += "\n_" + paragraph_infos.night_text + "_\n"
    }
    if (paragraph_infos.type == 0) {
        if (paragraph_infos.choices.length > 0) {
            message_txt += "\n⨓ " + paragraph_infos.choices.length + " strade:\n";
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                message_txt += "• " + paragraph_infos.choices[i].id + " (" + paragraph_infos.choices[i].delay + ")\n";
                buttons_array.push([{ text: paragraph_infos.choices[i].text, callback_data: 'INCARICHI:NEW:PARAGRAPH:SELECT:' + i }, { text: "🌝", callback_data: 'INCARICHI:NEW:PARAGRAPH:END:POSITIVE' }]);
            }
        } else {
            if (is_first === true) {
                if (paragraph_infos.choices.length > 0) {
                    message_txt += "\n• Aggiungi almeno un paio di strade.\n";
                }
            } else {
                message_txt += "\n• Aggiungi almeno un 2 strade o segnala il paragrafo come \"fine\"\n";
            }
        }

        if (is_first === false) {
            buttons_array.unshift([{ text: "🌚", callback_data: 'INCARICHI:NEW:PARAGRAPH:END:NEGATIVE' }, { text: "🌝", callback_data: 'INCARICHI:NEW:PARAGRAPH:END:POSITIVE' }]);
        }

        buttons_array.push([{ text: "⌘", callback_data: ("INCARICHI:NEW:PARAGRAPH:CMDS:" + paragraph_infos.id) }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]);
    } else {
        message_txt += "\nStato: Fine" + (paragraph_infos.type == -1 ? " Negativa" : " Positiva") + "\n";
        buttons_array.unshift([{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }, { text: "Aggiungi strade", callback_data: 'INCARICHI:NEW:PARAGRAPH:OPEN' }]);
    }

    return simpleMessage(message_txt, user_id, buttons_array);
}


// ACCESSORIE

function checkUnaviableChars(message_txt) {
    let splitted = message_txt.split("");
    let unaviable_char = ["_", "*", "`"];
    for (let i = 0; i < message_txt.length; i++) {// si potrebbe usare una semplice indexOf per tutti e tre, ma consumererebbe piu cpu
        if (unaviable_char.indexOf(splitted[i]) >= 0) {
            return false;
        }
    }
    return true;
}

function checkParagraphID(check_id) {
    if (check_id.length != 4) {
        return false;
    }
    let tocheck_id = check_id.toUpperCase();
    console.log("· controllo: " + tocheck_id);
    let numbers = parseInt(tocheck_id.substring(0, 2));
    if (isNaN(numbers)) {
        console.log("Esco per numbers: " + numbers);
        return false;
    }
    let idPossible_chars = "ABCDEFGHIJKLMNOPQRSTQVXYWZ";
    if (idPossible_chars.indexOf(tocheck_id.charAt(2)) < 0 || idPossible_chars.indexOf(tocheck_id.charAt(3)) < 0) {
        console.log("Esco per idPossible_chars: " + tocheck_id);
        return false;
    }
    console.log("Esco con true!");

    return true;
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

function simpleGenderFormatter(gender, prefix, male_suffix, female_suffix) {
    return (gender == "M" ? prefix + male_suffix : (female_suffix ? prefix + female_suffix : prefix + "a"));
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