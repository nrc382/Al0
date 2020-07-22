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
                let splitted_text = message.text.toLowerCase().split(/(?:\n| )+/);
                if (splitted_text.length == 1) {
                    return messageManager_res(mainMenu(inc_res, message.from.id));
                } else {
                    if (inc_res.user_infos.length == 0) { // da registrare
                        return messageManager_res(set_aliasManager(message.from.id, splitted_text));
                    } else { // registrati
                        let user = new model.User(inc_res.user_infos, inc_res.personals);
                        console.log("> Messaggio da "+user.alias);

                        let to_return = { toDelete: { chat_id: message.chat.id, mess_id: message.message_id } };
                        let target_text = message.text.split(" ").splice(1).join(" ");
                        if (message.reply_to_message) {
                            target_text += " " + message.reply_to_message.text;
                        }
                        let paragraph_triggers = ["strada", "scelta", "s"];
                        if (splitted_text[1] == "ns" ) {
                            parahrap_bool = true;
                            splitted_text[1] = "nuova";
                            splitted_text.splice(2, 0, "strada");
                            target_text = "nuova strada " + target_text.split(" ").splice(1).join(" ");
                        }else if (splitted_text[1] == "na" || splitted_text[1] == "alternativa" ) {
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
                            to_return.toSend = incarichi_AuthorInfos_message(user).toSend;
                        } else if (splitted_text[1] == "tipo") {
                            to_return.toSend = set_adventureType_message(user);
                        } else if (splitted_text[1] == "bozza") { // return
                            return model.getUserDaft(user.id).then(function (inc_struct) {
                                if (inc_struct.esit == false) {
                                    let message_txt = "📜 *Avventure dei Bardi di Lootia*\n\nNon mi risulta tu abbia una bozza aperta...\nVuoi crearne una nuova?\n";
                                    return messageManager_res(({ toSend: simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:TMP:START' }]]) }));
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
            } else if (question[1] == "TMP") {
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
                    return queryManager_res(res);
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
        let user = new model.User(curr_infos.user_infos);
        if (user.has_pending != -1) {
            personal_line.push({ text: "Bozza 📜", callback_data: 'INCARICHI:TMP:EDIT' });
        }
        if (curr_infos.personals.length >= 1) {
            personal_line.push({ text: "Le tue avventure", callback_data: 'INCARICHI:PERSONALS:' });
        }
        if (personal_line.length > 0) {
            buttons_array.push(personal_line);
        }
        if (user.has_pending == -1) {
            buttons_array.push([{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:TMP:START' }]);
        }
        let to_return = simpleMessage(message_txt, from_id, buttons_array);

        return ({ toSend: to_return });
    }
}

function manageTmp(by_user, options_array, in_query) { // NUOVO UTENTE, by_user: {incarichi, user_infos, personals}
    return new Promise(function (manageNew_res) {
        let user = new model.User(by_user.user_infos, by_user.personals);
        let option = options_array[2];
        let to_return = { query_text: "" };
        if (option == "PARAGRAPH") {
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
                } else if (options_array[3] == "AVAILABILITY") { // DA FINIRE
                    return paragraph_setChoiceAvailability_manager(user, in_query, options_array).then(function (setChoiceAv_return) {
                        return manageNew_res(setChoiceAv_return);
                    })
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
                }
                return model.loadParagraph(user.id, options_array[4]).then(function (paragraph_infos) {
                    return model.loadAlternative(user.id, paragraph_infos, options_array[6]).then(function (dest_infos) {
                        return manageNew_res({
                            query_text: "Alternativa verso il " + options_array[6],
                            toEdit: alternative_message(user.id, inc_struct, paragraph_infos, dest_infos)
                        });
                    });
                });
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

                        if (options_array[3] == "INTEGRATIVE_TEXT"){
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

// INCARICHI (GLOBALS) MANAGERS
function adventures_DevInfos_message(user_info) {
    let message_txt = "📜 *Le Avventure dei Bardi di Lootia* \n_...un modulo di @nrc382_\n\n";
    message_txt += "\n• È stato sviluppato, gratuitamente ed autonomamente, per permettere a giocatori di @LootGameBot di seguire e soprattutto creare _avventure testuali_\n";
    message_txt += "\n• Scritto in node.js, è su github il [codice sorgente](https://github.com/nrc382/Al0/tree/master/controllers/Incarichi)\n (pessimo e non commentato!).\n";
    message_txt += "\n• Se per il tempo che dedico allo sviluppo ti va di offrirmi una birra, non ti freno da fare una donazione. Miei indirizzi sono:\n";
    message_txt += "· [PayPal.me](https://paypal.me/EnricoGuglielmi)\n";
    message_txt += "· Bitcoin (prossimamente)\n";

    let buttons_array = [[{ text: "📜 Torna al modulo", callback_data: 'INCARICHI:MAIN_MENU' }], [{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

    let to_return = simpleMessage(message_txt, user_info.id, buttons_array);

    return ({ toSend: to_return });
}

function incarichi_AuthorInfos_message(user_info) {
    let message_txt = "📜 *Le Avventure dei Bardi di Lootia* \n_...un'introduzione alla stesura, comando_ `/b intro`\n\n";
    message_txt += "\n• Le avventure narrate possono essere per _squadre_ o per _avventurieri solitari_.\n";
    message_txt += "\n• Potrai sempre modificare ed aggiornare una tua narrazione, anche dopo che sarà stata pubblicata.\n";
    message_txt += "\n• Per ogni _paragrafo_ dovrai specificare un _testo di default_ ed eventualmente una _variante notturna_.\n";
    message_txt += "\n• Per ogni _paragrafo_ dovrai specificare almeno due _strade_.\n";
    message_txt += "\n• Per ogni _strada_ potrai specificare diversi tempi d'_attesa_.\n";
    message_txt += "\n• Per ogni _strada_ potrai specificare se porta alla _fine della narrazione_ o se prosegue verso un nuovo _paragrafo_.\n";
    //message_txt += "\n• ";

    message_txt += "\n\n*Nelle avventure per squadre:*\n";
    message_txt += "\n• Di default i membri seguiranno la _strada_ con più voti, ed una casuale in caso di _ambiguità_.\n";
    message_txt += "\n• Potrai scegliere, nel caso di parità tra più strade, un strada di default: non sarà necessariamente tra quelle più votate.\n";
    //message_txt += "\n• Potrai scegliere, per ogni paragrafo che prevede almeno un'opzione di fine, se terminare l'avventura solo per quella parte di squadra che eventualmente ha scelto l'opzione.\n";
    message_txt += "\n💡 Per i termini in corsivo di questo messaggio, ed altri, è disponibile:\n· `/bardo ? `...\n";

    message_txt += "\n\n🌐 Ogni avventura pubblicata potrà essere votata da chi la segue, il punteggio che riceveranno le tue influirà sulla tua `reputazione`.\n";

    let buttons_array = [];
    if (user_info.has_pending == "-1") {
        buttons_array.push([{ text: "Inizia 📜", callback_data: 'INCARICHI:TMP:START:CONFIRM' }]);
    } else {
        buttons_array.push([{ text: "Riprendi 📜", callback_data: 'INCARICHI:TMP:EDIT' }]);
    }
    buttons_array[0].push({ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" });


    let to_return = simpleMessage(message_txt, user_info.id, buttons_array);

    return ({ toSend: to_return });
}

function incarichi_AuthorCommands_message(user, paragraph_id) {
    let p_id = "[id_paragrafo]";
    let buttons_array = [[{ text: "Altri esempi...", callback_data: "INCARICHI:TMP:PARAGRAPH:CMDS:EX:" }], [{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];
    if (paragraph_id) {
        p_id = paragraph_id;
        buttons_array[0][0].callback_data += paragraph_id;
        buttons_array[1].unshift({ text: "Indietro ↩", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_id });
    }
    let message_txt = "*Comandi per la modifica dei paragrafi*\n_comando /bardo …_\n";

    message_txt += "\n• Richiama paragrafo:";
    message_txt += "\n· /…/` p " + p_id + " `\n";
    message_txt += "\n• Per la variante notturna:";
    message_txt += "\n· /…/` notturno `...\n";
    message_txt += "\n• Per una nuova strada:";
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
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];
    let message_txt = "*Comandi per la modifica dei paragrafi*\n";

    if (p_id) {
        message_txt += "_qualche esempio sul paragrafo " + p_id + "_\n";
        buttons_array[0].unshift({ text: "Indietro ↩", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + p_id });
        buttons_array.unshift([{ text: "⌘", callback_data: ("INCARICHI:TMP:PARAGRAPH:CMDS:" + p_id) }]);
        p_id = "";
    } else {
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
            { text: "↩", callback_data: "INCARICHI:TMP:ALTERNATIVE:SELECT:" + p_id + ":DEST:" + dest_id }, // ALTERNATIVE:SELECT:' + paragraph_infos.id + ":DEST:" + paragraph_infos.choices[i].id
            { text: "⨓", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + p_id }, // ALTERNATIVE:SELECT:' + paragraph_infos.id + ":DEST:" + paragraph_infos.choices[i].id
            { text: "⌖", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + dest_id }
        ],
        [{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]
    ];

    let message_txt = "*Comandi per la modifica delle alternative*\n_comando /bardo …_\n";

    message_txt += "\n• Per modificarne/aggiungere il testo intermedio: ";
    message_txt += "\n· /…/ `paragrafo strada `\\[n\\_strada]` intermedio `…\n";

    return ({ toSend: simpleMessage(message_txt, user.id, buttons_array) });
}

function incarichi_detailsInfos_message(target_userID) {
    let message_txt = "📜 *Avventure dei Bardi di Lootia* \n_...una \"rapida\" introduzione_\n\n";
    message_txt += "Simili agli [incarichi](https://telegra.ph/Una-guida-alla-scrittura-di-Incarichi-per-LootBot-05-05), le _avventure_ sono brevi storie interattive scritte direttamente dagli utenti di @LootGameBot.\n";
    message_txt += "\nA differenza degli incarichi: la loro struttura non è lineare, i tempi d'attesa sono variabili e possono essere per singoli o per squadre (da 2 a 5 giocatori)\n";
    message_txt += "\n• Ogni paragrafo di un'avventura porta ad almeno due possibili strade\n";
    message_txt += "\n• Ogni strada scelta può portare alla fine dell'avventura (con esito positivo o negativo) o farla invece continuare verso un nuovo paragrafo.\n";
    message_txt += "\n• Ogni avventura avrà almeno 2 esiti positivi e 3 negativi\n";
    //message_txt += "• Alla fine dell'avventura, se con esito positivo, ogni giocatore guadagnerà almeno un (1) glifo ၜ.\n";
    //message_txt += "\n💡 Il numero di glifi guadagnati per ogni possibile esito positivo è determinato indipendentemente dall'autore, che comunque ha controllo sul tipo di avventura (se per singoli o per gruppi) e, nel caso di una squadra: \n";
    //message_txt += "• Sul numero minimo di giocatori necessario \"per scegliere una strada\"\n";
    //message_txt += "• Sull'eventuale fine immediata per i membri discordi (una sola strada possibile)\n";
    message_txt += "\n• Il modulo si offre di facilitare la scrittura di queste avventure, oltre a permetterne lo svolgimento.\n";
    message_txt += "\n🌱 Per iniziare, imposta un soprannome. Usa:\n";
    message_txt += "· `/bardo sono`...";

    let to_return = simpleMessage(message_txt, target_userID, [[{ text: "Indietro ↩", callback_data: 'INCARICHI:NEW_USER' }]]);

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

    let buttons_array = [[{ text: "📜", callback_data: "INCARICHI:TMP:EDIT" }, { text: "⨷", callback_data: "INCARICHI:FORGET" }]]; // FORGET
    return ({ toSend: simpleMessage(text, target_userID, buttons_array) });
}

// USER MANAGERS
function newUserMessage(target_userID) {
    let message_txt = "📜 *Salve* \n\n";
    message_txt += "Con questo modulo è possibile partecipare ad _avventure_ scritte dalla comunità di @LootGameBot, e crearne di proprie!\n";
    message_txt += "\nÈ da considerarsi come _in versione di test_ finchè non passerà, eventualmente, sul plus:\nCiò vuol dire che funzioni e progressi potrebbero subire modifiche, e tutte le ricompense saranno puramente simboliche.\n"
    //message_txt += "\n*NB:*\nPer garantire una futura compatibilità, ogni comando o messaggio indirizzato a questo modulo dovrà iniziare con:\n· /bardo (i/e)\n\n(Od uno tra gli alias: /incarico (/i), /b, /i)\n";

    let to_return = simpleMessage(message_txt, target_userID, [[{ text: "Maggiori Informazioni ⓘ", callback_data: 'INCARICHI:PRE_INFOS' }]]);

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
    return ({ toSend: simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
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
                return setUserGender_res({ toEdit: simpleMessage(message_txt, user_id, [[{ text: "Inizia 🌱", callback_data: 'INCARICHI:REG' }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
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
    if (user_info.has_pending != "-1") {
        let message_txt = "*Mumble...*\n\nStai già scrivendo un'avventura.\nDovrai pubblicarla o eliminarla prima di poter iniziare a lavorare ad una nuova.\n\n*NB*\nIl bottone qui sotto non prevede conferme!";
        return Promise.resolve(({ toSend: simpleMessage(message_txt, user_info.id, [[{ text: "Elimina ⌫", callback_data: 'INCARICHI:TMP:TMP_DELETE' }]]) }));
    } else {
        return new Promise(function (new_userAdventure_res) {
            return model.newUserDaft(user_info).then(function (template_res) {
                if (template_res.esit == false) {
                    return new_userAdventure_res({ toSend: simpleMessage(template_res.text, user_info.id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) });
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
                if ((Math.floor(enlapsed * 24) * 24) < 2) {
                    message_txt += "• Appena creata\n";
                } else if (enlapsed <= 2) {
                    message_txt += "• Creata circa " + Math.floor(enlapsed * 24) + " ore fa\n";
                } else {
                    message_txt += "• Creata circa " + Math.floor(enlapsed) + " giorni fa\n";
                }
                let buttons_array = [[{ text: "Annulla 📜", callback_data: 'INCARICHI:TMP:EDIT' }, { text: "Elimina ❌", callback_data: 'INCARICHI:TMP:TMP_DELETE:CONFIRM' }]];
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
            { text: "👤 ", callback_data: 'INCARICHI:TMP:OPTION_CONFIRM:SOLO' },
            { text: "👥", callback_data: 'INCARICHI:TMP:OPTION_CONFIRM:MULTI' },
            { text: "🌙", callback_data: 'INCARICHI:TMP:OPTION_CONFIRM:NIGHT' },
            { text: "⭐", callback_data: 'INCARICHI:TMP:OPTION_CONFIRM:ALL' },
            { text: "☀️", callback_data: 'INCARICHI:TMP:OPTION_CONFIRM:DAY' }
        ],
        [
            { text: "📜", callback_data: "INCARICHI:TMP:EDIT" },
            { text: "⨷", callback_data: "INCARICHI:FORGET" }
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
                { text: "👤 ", callback_data: 'INCARICHI:TMP:OPTION_CONFIRM:SOLO' },
                { text: "👥", callback_data: 'INCARICHI:TMP:OPTION_CONFIRM:MULTI' }
            ],
            [
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }
            ]
        );

    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        buttons_array.push([{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:TMP:START' }]);
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
            { text: "Controlla ✓", callback_data: 'INCARICHI:TMP:TEST:START' },
        ]
        , [
            { text: "📜", callback_data: 'INCARICHI:TMP:EDIT' },
            { text: "⨷", callback_data: "INCARICHI:FORGET" }
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
                    buttons_array.push([{ text: errors_array[0].title, callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + errors_array[0].id }])
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
                            callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + errors_array[i].id
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

            buttons_array.push([{ text: "📜", callback_data: 'INCARICHI:TMP:EDIT' }, { text: "⨷", callback_data: "INCARICHI:FORGET" }]);
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
                { text: "Conferma ✓", callback_data: 'INCARICHI:TMP:OPTION_CONFIRM:TITLE' },
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }

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
        return simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:TMP:START' }]])
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
                { text: "Conferma ✓", callback_data: 'INCARICHI:TMP:OPTION_CONFIRM:DESC' },
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }

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
        return simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:TMP:START' }]])
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
                { text: "Conferma ✓", callback_data: 'INCARICHI:TMP:OPTION_CONFIRM:DELAY' },
                { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }

            ]
        ];
        return simpleMessage(message_txt, user.id, buttons_array);
    } else if (user.has_pending != "-1") {
        message_txt = "*Attesa per scelta*\n\nÈ il tempo che i giocatori dovranno aspettare tra un paragrafo ed un altro. Completa il comando specificando i minuti, ad esempio:\n· `/bardo attesa 75`\n";
        if (parsed_int < 5) {
            message_txt += "\n*NB*\nIl minimo sono 2 minuti.";
        } else if (parsed_int > 90) {
            message_txt += "\n*NB*\nAl massimo è possibile impostare 90 minuti (un'ora e mezza).";
        }
        return simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        message_txt = "*Woops!*\n\nNon mi risulta tu abbia una bozza attiva...\n";
        return simpleMessage(message_txt, user.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:TMP:START' }]])
    }
}

function set_adventureOption_confirm(user_id, type_array, query_text, inc_struct) {
    return new Promise(function (setType_confirm) {
        let type = type_array[3];
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
        } else if (type == "NEW_CHOICE") {
            return paragraph_addChoice_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
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
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
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
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
                } else {
                    q_text = "❌\n\n⨓ Strada Eliminata";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "DEL_ALTERNATIVE") {
            return paragraph_removeAlternative_confirm(user_id, query_text, inc_struct, type_array[4]).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
                } else {
                    q_text = "❌\n\n⨓ Alternativa Eliminata";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "INTEGRATIVE_TEXT") { // paragraph_setIntermedieText_confirm
            return paragraph_setIntermedieText_confirm(user_id, inc_struct, type_array[4], query_text).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
                } else {
                    return setType_confirm(to_return);
                }
            });
        } else if (type == "CHOICE_TITLE") {
            return paragraph_setChoiceText_confirm(user_id, query_text, inc_struct).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
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
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
                } else {
                    q_text = "⌛️\n\nTempo d'Attesa per la Strada, aggiornato:\n\n" + to_return.new_delay + " minuti";
                    return setType_confirm({ query_text: q_text, paragraph_infos: to_return.paragraph_infos });
                }
            });
        } else if (type == "CHOICE_IS_OPEN" || type == "CHOICE_IS_POSITIVE" || type == "CHOICE_IS_NEGATIVE") {
            return paragraph_setChoiceEsit_confirm(user_id, query_text, inc_struct, type).then(function (to_return) {
                if (to_return.esit === false) {
                    return setType_confirm({ query_text: "Woops!", toSend: simpleMessage(to_return.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
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
        } else {
            if (type == "TITLE") {
                new_option = query_text.split("\n")[0].trim();
                q_text = "📜\n\nTitolo dell'avventura modificato:\n\n" + new_option;
            } else if (type == "DESC") {
                new_option = query_text.substring(query_text.indexOf("«") + 1, query_text.indexOf("»"));
                q_text = "📃\n\nDescrizione dell'avventura modificata!\n\n";
            } else if (type == "SOLO" || type == "MULTI") {
                new_option = type;
                type = "VIEW_TYPE";
                q_text = "\n\nTipo dell'avventura modificato:\n\n";
                q_text = (new_option == "MULTI" ? "👥" + q_text + "Per Squadre" : "👤" + q_text + "Solitaria");
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
                    return (setType_confirm({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) }));
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
        return ({ toSend: simpleMessage("*Woops!*\n\nNon mi risulta tu stia scrivendo un'avventura...", user_info.id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) });
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
        { text: "⌥", callback_data: 'INCARICHI:TMP:OPTIONS' },
        { text: "⌘", callback_data: 'INCARICHI:TMP:EDIT:CMD' },
        { text: "↺", callback_data: 'INCARICHI:TMP:EDIT' },
        { text: "⨷", callback_data: 'INCARICHI:FORGET' },
        { text: "⌫", callback_data: 'INCARICHI:TMP:TMP_DELETE' }
    ]);
    if (inc_struct.paragraphs_ids.length <= 0) {
        buttons_array.push([{ text: "Aggiungi un primo paragrafo", callback_data: 'INCARICHI:TMP:PARAGRAPH' }]);
    } else {
        buttons_array[0].unshift({ text: "▤", callback_data: 'INCARICHI:TMP:PARAGRAPH:SELECT' });
        if (inc_struct.paragraphs_ids.length >= 2) {
            buttons_array.push([{ text: "Controlla la Struttura", callback_data: 'INCARICHI:TMP:TEST' }]);
        }
    }

    return ({ toSend: simpleMessage(message_txt, user_info.id, buttons_array) });
}

// PARAGRAPHS MANAGERS
function paragraphMainManager(user, message_text, in_to_return, splitted_text) {
    return new Promise(function (mainManager_res) {
        return model.getUserDaft(user.id).then(function (inc_struct) {
            if (inc_struct === false) {
                let message_txt = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
                return mainManager_res({ toSend: simpleMessage(message_txt, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
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
                console.log("message_text: "+message_text);

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
                    } else if (tmp_toParse == "ns"){
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
                                return paragraphManager_res({ toSend: simpleMessage(db_update.text, user.id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
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
            return newParagraph_res({ query_text: "Woops!", toSend: simpleMessage(message_txt, user_info.id, [[{ text: "Scrivi un'Avventura 🖋", callback_data: 'INCARICHI:TMP:START' }], [{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]) });
        } else if (user_info.has_pending != "0") {
            let message_txt = "*Mumble...*\n\nHai già creato il tuo primo paragrafo!\n";
            return newParagraph_res({ query_text: "Woops!", toEdit: simpleMessage(message_txt, user_info.id, [[{ text: "📜", callback_data: 'INCARICHI:TMP:EDIT' }, { text: "⨷", callback_data: "INCARICHI:FORGET" }]]) });
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
                        return newParagraph_res({ query_text: "Woops!", toSend: simpleMessage(new_paragraph.text, user_info.id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) });
                    } else {
                        return model.updateUserParagraph(user_info.id, new_paragraph.id, (user_info.has_pending == new_paragraph.id)).then(function (db_update) {
                            if (db_update.esit === false) {
                                return newParagraph_res({ query_text: "Woops!", toSend: simpleMessage(db_update.text, user_info.id, [[{ text: "Torna al Menu", callback_data: 'INCARICHI:MAIN_MENU' }]]) });
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
        buttons_array.push([{ text: "Nuovo paragrafo", callback_data: 'INCARICHI:TMP:PARAGRAPH' }]);
    } else {
        if (inc_struct.paragraphs_ids.length == 1) {
            message_txt += "_Un solo paragrafo_\n\n";
        } else {
            message_txt += "_" + inc_struct.paragraphs_ids.length + " paragrafi_\n\n";
        }
        buttons_array.push([{ text: "Inizio ✨", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + inc_struct.paragraphs_ids[0] }]);

        if (inc_struct.paragraphs_ids.length < 3) {
            message_txt += "\n• Prevedi almeno 3 strade per il paragrafo iniziale!\n";
        }

        if (inc_struct.paragraphs_ids.length == 2) {
            buttons_array[0].push({ text: "Prima Scelta", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + inc_struct.paragraphs_ids[1] })
        } else {
            message_txt += "• Identificativi:\n";
            for (let i = 0; i < inc_struct.paragraphs_ids.length; i++) {
                message_txt += "· `" + inc_struct.paragraphs_ids[i] + "`" + (inc_struct.paragraphs_ids[i] == user.has_pending ? " ⦾" : "") + "\n";
            }
            message_txt += "\n• Per la selezione rapida, usa:\n· `/b p `\\[id]";
            if (user.has_pending != 0 && user.has_pending != inc_struct.paragraphs_ids[0]) {
                buttons_array[0].push({ text: "Attuale ⦾", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + user.has_pending })
            }
        }
    }

    buttons_array.push([{ text: "📜", callback_data: 'INCARICHI:TMP:EDIT' }, { text: "⨷", callback_data: "INCARICHI:FORGET" }]);
    return ({ toSend: simpleMessage(message_txt, user.id, buttons_array) });
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
                message_txt += "È il primo messaggio che " + (inc_struct.play_type == "SOLO" ? "il giocatore " : "la squadra ") + "leggerà avviando l'avventura.\n";
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
            message_txt += "\"_" + new_paragraph_text + "_\"\n\n";
            message_txt += "• Per rendere più comoda l'avventura ai giocatori, il testo di un paragrafo non può essere più lungo di 500 caratteri.\n(eccesso: " + (new_paragraph_text.length - 500) + ")\n";
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
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Conferma ✓", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:PARAGRAPH_DESC" }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]])
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
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else if (paragraph_index == 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non puoi aggiungere un'alternativa al primo paragrafo dell'avventura, ma puoi creare scelte che riportano qui!";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        let alternative_title = alternative_splittedText.join(" ").split("\n").join("");
        if (father_id === -1) {
            message_txt = "*Nuova Alternativa*\n\n";
            message_txt += "Le _alternative_ sono strade che riportano ad un paragrafo già impostato.\n";
            message_txt += "• Per aggiungerene una al paragrafo " + paragraph_id + ", completa il comando con il codice del paragrafo a cui vuoi collegare la scelta ed il testo che vuoi attribuirle:\n";
            message_txt += "\nEsempio:\n• `/bardo \nparagrafo " + paragraph_id + " \nalternativa verso il " + inc_struct.paragraphs_ids[intIn(0, inc_struct.paragraphs_ids.length - 1)] + " \nCorri!`\n\n\nPs\nNel comando, davanti al codice puoi omettere o specificare fino a 2 articoli/preposizioni/congiunzioni/nomi...\n(ed un abbreviazione è `na`)";

            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else if (alternative_title.length < 3) {
            message_txt = "*Woops!*\n_Testo alternativa troppo corto_\n\n";
            message_txt += "\"_" + alternative_title + "_\"\n\n";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else if (alternative_title.length > 30) {
            message_txt = "*Woops!*\n_Testo alternativa troppo lungo_\n\n";
            message_txt += "\"_" + alternative_title + "_\"\n\n";
            message_txt += "• Per essere leggibile in un bottone, il testo di una alternativa non può essere più lungo di 30 caratteri.\n(extra: +" + (alternative_title.length - 30) + ")";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else {
            let is_first = (inc_struct.paragraphs_ids[0] == paragraph_id);
            message_txt = "⨓ *Nuova Alternativa*\n";
            message_txt += "_paragrafo_ `" + paragraph_id + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";
            message_txt += "> _" + alternative_title.charAt(0).toUpperCase() + alternative_title.substring(1) + "_\n\n";

            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Conferma ✓", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:NEW_ALTERNATIVE:" + father_id }], [{ text: "⨓  " + father_id, callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + father_id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
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
                        let to_return = simpleMessage(message_text, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + loaded_paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
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
                    let to_return = simpleMessage(message_text, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + loaded_paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
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
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

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
        buttons_array = [[{ text: "Annulla ↩", callback_data: "INCARICHI:TMP:ALTERNATIVE:SELECT:" + paragraph_infos.id + ":DEST:" + dest_id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

        message_txt = "⨓ *Rimuovi Alternativa*\n";
        message_txt += "_paragrafo " + paragraph_infos.id + "_\n\n";
        message_txt += "Non sarà possibile recuperare alcun dato dopo la conferma...\n\n• Solo la scelta verrà rimossa, il paragrafo destinazione non subirà modifiche";
        buttons_array.unshift([{ text: "Elimina ❌", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:DEL_ALTERNATIVE:" + dest_id }]);
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
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        if (new_choice_text.length === 0) {
            message_txt = "*Nuova Strada*\n\n";
            message_txt += "• Per aggiungere una scelta al paragrafo " + paragraph_id + ", completa il comando con il testo che vuoi attribuire alla _strada_:\n";
            message_txt += "• È il messaggio mostrato sotto al paragrafo, in un bottone.\n";
            message_txt += "• Nei bottoni è consigliato usare la seconda persona.\n";
            message_txt += "\nEsempio:\n• `/bardo p " + paragraph_id + " nuova strada \nCorri!`";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else if (new_choice_text.length < 3) {
            message_txt = "*Woops!*\n_Testo strada troppo corto_\n\n";
            message_txt += "\"_" + new_choice_text + "_\"\n\n";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else if (new_choice_text.length > 30) {
            message_txt = "*Woops!*\n_Testo strada troppo lungo_\n\n";
            message_txt += "\"_" + new_choice_text + "_\"\n\n";
            message_txt += "• Per essere leggibile in un bottone, il testo di una strada non può essere più lungo di 30 caratteri.\n(extra: +" + (new_choice_text.length - 30) + ")";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else {
            let is_first = (inc_struct.paragraphs_ids[0] == paragraph_id);
            message_txt = "⨓ *Nuova Strada*\n";
            message_txt += "_paragrafo_ `" + paragraph_id + "`" + (is_first ? " _(inizio)_" : "") + "\n\n";
            message_txt += "> _" + new_choice_text.charAt(0).toUpperCase() + new_choice_text.substring(1) + "_\n\n";

            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Conferma ✓", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:NEW_CHOICE" }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
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
                        let to_return = simpleMessage(message_text, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + loaded_paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
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
                    let to_return = simpleMessage(message_text, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + loaded_paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
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
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

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
            buttons_array.unshift([{ text: "⨓ " + paragraph_infos.choices[0].title_text, callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.choices[0].id }]);
        } else {
            message_txt += " i paragrafi:\n"
            for (let i = 0; i < paragraph_infos.choices.length; i++) {
                message_txt += "· `" + paragraph_infos.choices[i].title_text + "`\n";
                buttons_array.unshift([{ text: "⨓ " + paragraph_infos.choices[0].id, callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.choices[i].id }]);
            }
        }
        message_txt += "\n(...ed eventuali sotto-paragrafi)\n";
        buttons_array[buttons_array.length - 1].unshift({ text: "Paragrofo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id });

        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
    } else {
        buttons_array = [[{ text: "Annulla ↩", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

        if (paragraph_infos.father_id == 0) {
            message_txt = "*Woops...*\n\n";
            message_txt += "Piuttosto elimina l'avventura stessa!\nPassa per il comando:\n· `/bardo bozza`";
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else {
            message_txt = "⨓ *Rimuovi Strada*\n";
            message_txt += "_paragrafo " + paragraph_infos.id + "_\n\n";
            message_txt += "Non sarà possibile recuperare alcun dato dopo la conferma...";
            buttons_array.unshift([{ text: "Elimina ❌", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:DEL_CHOICE:" + paragraph_infos.id }]);
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
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Paragrafi ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]])
    } else if (paragraph_infos.choices.length <= 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che tu abbia già settato alcuna scelta per il paragrafo " + paragraph_infos.id + "...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]])
    } else if (new_choice_text.length == 0) {
        if (typeof choice_index == "undefined") {
            choice_index = 1;
        }
        message_txt = "*Modifica Strada*\n\n";
        message_txt += "• Completa il comando per cambiare il testo di una scelta del paragrafo " + paragraph_infos.id + ".\n";
        message_txt += "\nEsempio:\n• `/bardo p " + paragraph_infos.id + " strada " + choice_index + " \nCorri!`";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else if (new_choice_text.length < 3) {
        message_txt = "*Woops!*\n_Testo strada troppo corto_\n\n";
        message_txt += "\"_" + new_choice_text + "_\"\n\n";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else if (new_choice_text.length > 30) {
        message_txt = "*Woops!*\n_Testo strada troppo lungo_\n\n";
        message_txt += "\"_" + new_choice_text + "_\"\n\n";
        message_txt += "• Per essere leggibile in un bottone, il testo di una strada non può essere più lungo di 30 caratteri.\n(extra: +" + (new_choice_text.length - 30) + ")";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        let buttons_array = [[{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];
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
                to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
            } else {
                message_txt = "*Modifica " + (choice_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.id + "_\n\n";
                message_txt += "> `" + new_choice_text.charAt(0).toUpperCase() + new_choice_text.substring(1) + "`\n";
                message_txt += "\n• Codice: `" + curr_choice.id + "`";
                message_txt += "\n• Testo precedente:\n> `" + curr_choice.title_text + "`\n";
                buttons_array.unshift([{ text: "Conferma ✓", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:CHOICE_TITLE:" }])
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
                message_txt = "*Modifica " + (choice_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.id + "_\n\n";
                message_txt += "> `" + new_choice_text.charAt(0).toUpperCase() + new_choice_text.substring(1) + "`\n";
                message_txt += "\n• Codice: `" + curr_choice_infos.id + "`";
                message_txt += "\n• Testo precedente:\n> `" + curr_choice_infos.title_text + "`\n";

                buttons_array.unshift([{ text: "Conferma ✓", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:CHOICE_TITLE:" }])
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
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

    if (paragraph_infos.esit == false || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        buttons_array[0].unshift({ text: "Paragrafi ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" })
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array)
    } else if (paragraph_infos.choices.length <= 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che tu abbia già settato una scelta per il paragrafo " + paragraph_infos.id + "..";
        buttons_array[0].unshift({ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id })

        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array)
    } else {
        if (!new_delay || new_delay.length == 0 || isNaN(parseInt(new_delay))) {
            message_txt = "*Attesa Scelta*\n\n";
            message_txt += "• Completa il comando.\nSpecifica il tempo, in minuti, che i giocatori dovranno attendere per passare al paragrafo successivo.\n";
            message_txt += "\nEsempio:\n• `/bardo p " + paragraph_infos.id + " strada 1 attesa 5`";
            buttons_array[0].unshift({ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id })

            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else {
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
                    message_txt += simpleGenderFormatter((index_limit == 1), " scelt", "a", "e") + " nel paragrafo `" + paragraph_infos.id + "`";
                    to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
                } else if (new_delay < 2 || new_delay > 90) {
                    message_txt = "*Attesa della " + (choice_index + 1) + "° Strada*\n_per il paragrafo " + curr_choice.id + "_\n\n";
                    message_txt += "• Deve essere compresa tra 2 e 90 minuti\n";
                    message_txt += "\nEsempio:\n• `/bardo p " + paragraph_infos.id + " strada " + (choice_index + 1) + " attesa " + (new_delay < 2 ? 2 : 90) + "`";
                    to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
                } else {
                    message_txt = "*Attesa della " + (choice_index + 1) + "° Strada*\n_per il paragrafo " + paragraph_infos.id + "_\n\n";
                    message_txt += "> " + new_delay + " minuti\n";
                    message_txt += "\n• Codice: `" + curr_choice.id + "`";
                    message_txt += "\n• Testo: `" + curr_choice.title_text + "`";

                    buttons_array.unshift([{ text: "Conferma ✓", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:CHOICE_DELAY:" }])
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
                        message_txt += (new_delay < 2 ? 2 : (new_delay > 90 ? 90 : new_delay)) + "`\n";
                    } else {
                        message_txt += "• Le scelte nel paragrafo hanno codice:\n";
                        for (let i = 0; i < paragraph_infos.choices.length; i++) {
                            message_txt += "· `" + paragraph_infos.choices[i].id + "\n";
                        }
                        message_txt += "\n• Usa:\n· `/bardo p " + paragraph_infos.id + " strada \\[codice] attesa " + (new_delay < 2 ? 2 : (new_delay > 90 ? 90 : new_delay)) + "`";
                    }
                    buttons_array[0].unshift({ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id })

                    to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
                } else if (new_delay < 2 || new_delay > 90) {
                    message_txt = "*Attesa della " + (choice_index + 1) + "° Strada*\n_per il paragrafo " + paragraph_infos.choices[choice_index].id + "_\n\n";
                    message_txt += "• Deve essere compresa tra 2 e 90 minuti\n";
                    message_txt += "\nEsempio:\n• `/bardo p " + paragraph_infos.id + " strada " + (choice_index + 1) + " attesa " + (new_delay < 2 ? 2 : 90) + "`";
                    to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
                } else {
                    message_txt = "*Attesa della " + (choice_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.id + "_\n\n";
                    message_txt += "> " + new_delay + " minuti\n";
                    message_txt += "\n• Codice: `" + curr_choice_infos.id + "`";
                    message_txt += "\n• Testo: `" + curr_choice.title_text + "`";


                    buttons_array.unshift([{ text: "Conferma ✓", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:CHOICE_DELAY:" }])
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
        let curr_paragraph_id = splitted_imputText[1].split(" ")[3];
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

function paragraph_setChoiceEsit_message(user_id, inc_struct, paragraph_infos) {
    let message_txt;
    let to_return = {};
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

    if (!inc_struct.paragraphs_ids || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
    } else if (paragraph_infos.esit == false) {
        to_return.toSend = simpleMessage(paragraph_infos.text, user_id);
    } else {
        buttons_array = [[{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

        if (paragraph_infos.father_id == 0) {
            message_txt = "*Woops...*\n\n";
            message_txt += "Non è possibile modificare il _tipo_ dell'inizio avventura.";
            to_return.toSend = simpleMessage(message_txt, user_id, buttons_array);
        } else {
            message_txt = "⨓ *Esito Strada*\n";
            message_txt += "_paragrafo " + paragraph_infos.id + "_\n\n";
            if (paragraph_infos.esit_type == 0) {
                message_txt += "Scegliendo una fine, positiva o negativa, saranno disabilitate le scelte eventualmente aggiunte al paragrafo.";
                message_txt += "\n• Puoi modificare quest'opzione a piacimento";
                if (paragraph_infos.choices.length > 0) {
                    if (paragraph_infos.choices.length == 1) {
                        message_txt += " quella che avevi impostato non verrà persa.";
                    } else {
                        message_txt += " le " + paragraph_infos.choices.length + " che avevi impostato non verranno perse.";
                    }
                }
                buttons_array.unshift([
                    { text: "🌚 ", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:CHOICE_IS_NEGATIVE:" },
                    { text: "🌝", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:CHOICE_IS_POSITIVE:" },
                ]);
            } else {
                message_txt += "Apri il paragrafo per potergli aggiungere nuove scelte";
                buttons_array.unshift([{ text: "🌍", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:CHOICE_IS_OPEN:" }]);
                if (paragraph_infos.choices.length > 0) {
                    message_txt += " e riabilitare";

                    if (paragraph_infos.choices.length == 1) {
                        message_txt += " quella che avevi impostato";
                    } else {
                        message_txt += " le " + paragraph_infos.choices.length + " che avevi impostato";
                    }
                }

            }

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
                                to_return.toEdit = simpleMessage(message_text, user.id, [[{ text: "Scelte ⨓ " + father_paragraph_infos.id, callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + father_paragraph_infos.id }], [{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]])
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
                                to_return.toEdit = paragraph_message(user, inc_struct, paragraph_infos);
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
    if (inter_text.charAt(0) == "\n"){
        inter_text = inter_text.substring(1)
    }
    if (paragraph_infos.esit == false || inc_struct.paragraphs_ids.indexOf(paragraph_infos.id) < 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che " + paragraph_infos.id + " sia l'id di un paragrafo della tua bozza...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Paragrafi ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]])
    } else if (paragraph_infos.choices.length <= 0) {
        message_txt = "*Woops!*\n\n";
        message_txt += "Non mi risulta che tu abbia già settato alcuna scelta per il paragrafo " + paragraph_infos.id + "...";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]])
    } else if (inter_text.length == 0) {
        if (typeof choice_index == "undefined") {
            choice_index = 1;
        }
        message_txt = "*Testo Intermedio*\n\n";
        message_txt += "Sarà legato al testo del paragrafo destinazione.\n"
        message_txt += "\n• Completa il comando per cambiare il testo intermedio dato dalla scelta.\n";
        message_txt += "\nEsempio:\n• `/bardo p " + paragraph_infos.id + " strada " + choice_index + " intermedio \nSei ritornato…`";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else if (inter_text.length < 3) {
        message_txt = "*Woops!*\n_Testo intermedio troppo corto_\n\n";
        message_txt += "\"_" + inter_text + "_\"\n\n";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else if (inter_text.length > 160) {
        message_txt = "*Woops!*\n_Testo intermedio troppo lungo_\n\n";
        message_txt += "\"_" + inter_text + "_\"\n\n";
        message_txt += "• Il testo di un intermedio non può essere più lungo di 160 caratteri.\n(extra: +" + (inter_text.length - 160) + ")";
        to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
    } else {
        let buttons_array = [[{ text: "Paragrafo ⨓ ", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id }, { text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]];

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
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else if (curr_choice.is_alternative != true) {
            message_txt = "*Woops*\n_indice scelta non valido!_\n\n";
            message_txt += "• Non mi risulta che la " + (actual_index + 1) + "° scelta del paragrafo " + paragraph_infos.id + " sia un'alternativa.";
            to_return.toSend = simpleMessage(message_txt, user_id, [[{ text: "Chiudi ⨷", callback_data: "INCARICHI:FORGET" }]]);
        } else {
            message_txt = "*Intermedio alla " + (actual_index + 1) + "° Strada*\n_del paragrafo " + paragraph_infos.id + "_\n";
            message_txt += "\n• Scelta: \"" + curr_choice.title_text + "\"";
            if (curr_choice.integrative_text != "") {
                message_txt += "\n• Testo precedente:\n· `" + curr_choice.integrative_text.split(">").join("") + "`\n";
            }
            message_txt += "\n> Nuovo intermedio:\n· `" + inter_text.charAt(0).toUpperCase() + inter_text.substring(1) + "`\n";

            buttons_array.unshift([{ text: "Conferma ✓", callback_data: "INCARICHI:TMP:OPTION_CONFIRM:INTEGRATIVE_TEXT:" + curr_choice.id }])
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
            let new_integrative = query_message.substring(query_message.indexOf("> Nuovo intermedio:\n·")+22, query_message.length);

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
    let curr_availability = inc_struct.view_type == "ALL" ? paragraph_infos.availability : inc_struct.view_type;

    if (!('level_deep' in paragraph_infos)) {
        message_txt += "\n ⚠️ La struttura delle avventure è cambiata!\n";
        message_txt += "Partendo dalle scelte del primo paragrafo, cambia l'esito di tutte le scelte inserite fin'ora\n(ed una seconda volta per tornare all'impostazione attuale, nessun dato verrà perso)\n\n";
    } else if (!is_first) {
        message_txt += "\n• " + (paragraph_infos.level_deep) + "° scelta";
    } else {
        message_txt += "\n• Inizio avventura";
    }

    // Paragrafo
    if (curr_availability == "ALL") {
        message_txt += "" + (paragraph_infos.night_text != "" ? "\n\nVariante diurna ☀️️" : ", testo unico ⭐\n");
        if (paragraph_infos.text == "") {
            message_txt += "\n_Il testo del paragrafo sarà in corsivo, usa il tempo presente per la narrazione_\n";
        } else {
            message_txt += "\n_" + paragraph_infos.text + "_\n"
        }

        if (paragraph_infos.night_text != "") {
            message_txt += "\nVariante Notturna 🌙";
            message_txt += "\n_" + paragraph_infos.night_text + "_\n"
        }
    } else {
        message_txt += ", solo ";
        if (curr_availability == "DAY") {
            message_txt += "di Giorno ☀️️\n";
            if (paragraph_infos.text == "") {
                message_txt += "\n_La scelta sarà selezionabile solo di giorno, usa il tempo presente per la narrazione_\n";
            } else {
                message_txt += "\n_" + paragraph_infos.text + "_\n"
            }
        } else if (curr_availability == "NIGHT") {
            message_txt += "di Notte 🌙\n";
            if (paragraph_infos.night_text == "") {
                message_txt += "\n_La scelta sarà selezionabile solo di notte, dalle 23:00 alle 05:00. Usa il tempo presente per la narrazione_\n";
            } else {
                message_txt += "\n_" + paragraph_infos.night_text + "_\n";
            }
        }
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
            { text: "📜 ", callback_data: "INCARICHI:TMP:EDIT" },
            { text: "⌘", callback_data: ("INCARICHI:TMP:PARAGRAPH:CMDS:" + paragraph_infos.id) }
        ]);
    } else {
        let firstLine_buttons = [{ text: "↩", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.father_id }];

        if (paragraph_infos.esit_type == 0) {
            message_txt = "🌍 " + message_txt;
            firstLine_buttons.push({ text: "☠", callback_data: 'INCARICHI:TMP:PARAGRAPH:CHOICE_ESIT:' + paragraph_infos.id });
        } else {
            firstLine_buttons.push({ text: "🌍", callback_data: 'INCARICHI:TMP:PARAGRAPH:CHOICE_ESIT:' + paragraph_infos.id });
        }

        if (paragraph_infos.availability == "DAY") {
            firstLine_buttons.push(
                { text: "⭐", callback_data: 'INCARICHI:TMP:PARAGRAPH:AVAILABILITY:ALL:' + paragraph_infos.id },
                { text: "🌙", callback_data: 'INCARICHI:TMP:PARAGRAPH:AVAILABILITY:NIGHT:' + paragraph_infos.id }
            );
        } else if (paragraph_infos.availability == "NIGHT") {
            firstLine_buttons.push(
                { text: "⭐", callback_data: 'INCARICHI:TMP:PARAGRAPH:AVAILABILITY:ALL:' + paragraph_infos.id },
                { text: "☀️️", callback_data: 'INCARICHI:TMP:PARAGRAPH:AVAILABILITY:DAY:' + paragraph_infos.id }
            );
        } else {
            firstLine_buttons.push(
                { text: "☀️️", callback_data: 'INCARICHI:TMP:PARAGRAPH:AVAILABILITY:DAY:' + paragraph_infos.id },
                { text: "🌙", callback_data: 'INCARICHI:TMP:PARAGRAPH:AVAILABILITY:NIGHT:' + paragraph_infos.id }
            );
        }

        firstLine_buttons.push({ text: "⌘", callback_data: ("INCARICHI:TMP:PARAGRAPH:CMDS:" + paragraph_infos.id) });
        firstLine_buttons.push({ text: "⌫", callback_data: 'INCARICHI:TMP:PARAGRAPH:DELETE:' + paragraph_infos.id });

        buttons_array.push(firstLine_buttons);
    }

    // Strade/Scelte
    if (paragraph_infos.esit_type == 0) {
        let counters = { all: 0, day: 0, night: 0 };

        for (let i = 0; i < paragraph_infos.choices.length; i++) {
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
                    this_callback = 'INCARICHI:TMP:ALTERNATIVE:SELECT:' + paragraph_infos.id + ":DEST:" + paragraph_infos.choices[i].id;
                    tmp_text += "🔀 ";
                } else {
                    this_callback = 'INCARICHI:TMP:PARAGRAPH:SELECT:' + paragraph_infos.choices[i].id;
                    if (inc_struct.view_type == "ALL") {
                        tmp_text += paragraph_infos.choices[i].availability == "NIGHT" ? "🌙 " : (paragraph_infos.choices[i].availability == "DAY" ? "☀️️ " : "");
                    } else {
                        tmp_text += (paragraph_infos.choices[i].availability == "ALL" ? "⭐" : "");
                    }
                }
                tmp_text += paragraph_infos.choices[i].title_text + " (" + paragraph_infos.choices[i].delay + "min)";
                tmp_text += (paragraph_infos.choices[i].is_alternative == true ? "" : (paragraph_infos.choices[i].esit_type != 0 ? " ☠" : ""));
                buttons_array.push([{ text: tmp_text, callback_data: this_callback }]);
            }
        }
        let valid_count = 0;
        let minimum = is_first == false ? 2 : 3;

        if ((inc_struct.view_type == "NIGHT")) {
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

    buttons_array.push([{ text: "⨷", callback_data: "INCARICHI:FORGET" }]);


    return simpleMessage(message_txt, user.id, buttons_array);
}

function alternative_message(user_id, inc_struct, paragraph_infos, des_infos) {
    let buttons_array = [];
    let is_same = (des_infos == false);
    if (is_same) {
        des_infos = paragraph_infos;
    }
    let dest_is_first = (des_infos.father_id == 0);

    let curr_choice = null;
    for (let i = 0; i < paragraph_infos.choices.length; i++) {
        if (paragraph_infos.choices[i].id == des_infos.id) {
            curr_choice = paragraph_infos.choices[i];
            break;
        }
    }
    let message_txt = "🔀 *\"" + curr_choice.title_text + "\"*\n";


    if (curr_choice == null) {
        message_txt = "Woops!\n\n";
        message_txt = "Questo messaggio sembra obsoleto...";
    } else if (!is_same) {
        message_txt += "_alternativa di " + paragraph_infos.id + "_\n\n";

        if (curr_choice.integrative_text != "") {
            message_txt += "_" + curr_choice.integrative_text + "_\n";
        } else {
            message_txt += "_Un testo intermedio verrà stampato subito sopra a quello del paragrafo destinazione_";
        }

        if (des_infos.text != "") {
            message_txt += "\n_" + des_infos.text + "_\n\n"
        } else if (curr_choice.integrative_text == ""){
            message_txt += "_, che non hai ancora impostato._\n\n"
        } else{
            message_txt += "\n/.../_ seguirà il testo del paragrafo destinazione_\n\n"
        }


        if (!dest_is_first) {
            message_txt += "• Destinazione: " + paragraph_infos.level_deep + "° scelta, \"" + des_infos.choice_title + "\"\n";
        } else {
            message_txt += "• Destinazione il primo paragrafo\n";
        }
    } else {
        message_txt += "_vicolo cieco di " + paragraph_infos.id + "_\n\n";

        if (curr_choice.integrative_text != "") {
            message_txt += "_" + curr_choice.integrative_text + "_\n";
        } else {
            message_txt += "_Dopo " + curr_choice.delay + " minuti, il giocatore tornerà al paragrafo, che sarà preceduto da un testo intermedio_";
        }
        if (des_infos.text != "") {
            message_txt += "\n_" + des_infos.text + "_\n\n"
        } else {
            message_txt += "_, che non hai ancora impostato._\n\n"
        }

    }


    if (curr_choice != null) { // Buttons First line 
        let firstLine_buttons = [{ text: "↩", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + paragraph_infos.id }];
        if (!is_same) {
            firstLine_buttons.push({ text: "⌖", callback_data: "INCARICHI:TMP:PARAGRAPH:SELECT:" + des_infos.id });
        }

        if (curr_choice.availability == "DAY") {
            firstLine_buttons.push(
                { text: "⭐", callback_data: 'INCARICHI:TMP:ALTERNATIVE:SET_AVAILABILITY:ALL:' + curr_choice.id },
                { text: "🌙", callback_data: 'INCARICHI:TMP:ALTERNATIVE:SET_AVAILABILITY:NIGHT:' + curr_choice.id }
            );
        } else if (curr_choice.availability == "NIGHT") {
            firstLine_buttons.push(
                { text: "⭐", callback_data: 'INCARICHI:TMP:ALTERNATIVE:SET_AVAILABILITY:ALL:' + curr_choice.id },
                { text: "☀️️", callback_data: 'INCARICHI:TMP:ALTERNATIVE:SET_AVAILABILITY:DAY:' + curr_choice.id }
            );
        } else {
            firstLine_buttons.push(
                { text: "☀️️️", callback_data: 'INCARICHI:TMP:ALTERNATIVE:SET_AVAILABILITY:DAY:' + curr_choice.id },
                { text: "🌙", callback_data: 'INCARICHI:TMP:ALTERNATIVE:SET_AVAILABILITY:NIGHT:' + curr_choice.id }
            );
        }

        firstLine_buttons.push({ text: "⌘", callback_data: ("INCARICHI:TMP:ALTERNATIVE:CMDS:" + curr_choice.id) });
        firstLine_buttons.push({ text: "⌫", callback_data: 'INCARICHI:TMP:ALTERNATIVE:DELETE:' + curr_choice.id });

        buttons_array.push(firstLine_buttons);
    }

    buttons_array.push([{ text: "⨷", callback_data: "INCARICHI:FORGET" }]);
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

// :) 