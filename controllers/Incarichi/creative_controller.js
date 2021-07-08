/* IL C.C gestisce la parte creativa degli Incarichi.
    
*/

const main_model = require("./incarichiModel");
const model = require("./creative_model");



// ***********  DISPATCH  ******************

// Arrivano qui tutti i messaggi di testo per utenti registrati che hanno has_panding != -1 e words_array.length >= 2 (cioè /bardo [qualsiasi_cosa])
module.exports.dispatch_message = async function dispatch_message(user, message, words_array) {
    // words_array è un array, trimmato, di tutte le parole nel messaggio in minuscolo (comando /bardo compreso). È usato SOLAMENTE per il controllo sui comandi

    /* restituisce:
        • to_return.al_main == true -> chiede invio del main_message
        • to_return == [{toSend?, toDelete?, toEdit?}]
    */


    let comands = []; // la lista dei comandi parsati
    let text_array = []; // array con tutto quello che non è un comando

    let paragraph_bool = false; // se il comando si riferisce -> chiede il caricamento delle info paragrafo

    let complete_text = message.text; // questo, una volta pulito dai comandi, sarà il testo-argomento in forma naturale

    // se il messaggio è in risposta, concateno al complete_text
    if (typeof message.reply_to_message != "undefined" && message.reply_to_message.from.is_bot == false) {
        complete_text += message.reply_to_message.text;
    }

    if (complete_text.indexOf("#") < 0) { // se non ci sono comandi, controlla se la prima parola è ESATTAMENTE un comando
        let main_cmds = [
            "t", "testo",
            "integra",
            "v", "variante",
            "n", "notturno",
            "s", "strada", "scelta",
            "a", "attesa",
            "na", "alternativa",
            "i", "intermedio",
            "p", "paragrafo"
        ];

        let to_check = words_array[1].trim();
        if (main_cmds.indexOf(to_check) >= 0) { // inserisco il tag e pulisco complete_text rimuovendo il comando-trigger () 
            complete_text = "#" + to_check + complete_text.substring((words_array[0].length + 1 + words_array[1].length + 1)).trim();
        }
    } else { // altrimente pulisce complete_text rimuovendo il comando-trigger ()
        complete_text = complete_text.substring((words_array[0].length + 1)).trim();
    }

    // se effettivamente c'è un comando nel testo
    if (complete_text.indexOf("#") >= 0) { // Parser #comandi
        // Ciclo parser: cerca i comandi in ogni linea del testo, 
        // riempie: comands e text_array
        // setta: paragraph_bool

        let paragraph_array = complete_text.split("\n"); // array delle righe

        for (let i = 0; i < paragraph_array.length; i++) {
            let tmp_line = paragraph_array[i].trim().split(" "); // array delle parole

            for (let j = 0; j < tmp_line.length; j++) {
                tmp_line[j] = tmp_line[j].trim(); // trim() fondamentale

                if (tmp_line[j].charAt(0) == "#") { // è un comando
                    let tmp_cmd = tmp_line[j].toLowerCase().trim().substring(1); // tolgo il tag...
                    if (tmp_cmd.length > 0) {
                        if (tmp_cmd.length <= 2) { // Abbreviazioni
                            if (tmp_cmd == "t") { paragraph_bool = true; comands.push("TESTO"); }
                            else if (tmp_cmd == "nt") { paragraph_bool = true; comands.push("TESTO", "NOTTURNO"); }
                            else if (tmp_cmd == "v") { paragraph_bool = true; comands.push("VARIANTE"); }
                            else if (tmp_cmd == "n" || tmp_cmd == "s") { paragraph_bool = true; comands.push("STRADA"); }
                            else if (tmp_cmd == "na") { paragraph_bool = true; comands.push("ALTERNATIVA"); }
                            else if (tmp_cmd == "a") {
                                comands.push("ATTESA");
                                paragraph_bool = true;

                                let parsed_index = parseInt(tmp_line[j + 1]);
                                if (!isNaN(parsed_index)) {
                                    comands.push(Math.abs(parsed_index));
                                    j++;
                                }
                            }
                        } else {

                        }
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
                } else if (tmp_line[j] != " " && tmp_line[j].length > 0) { //...un po paranoico(!)
                    text_array.push(tmp_line[j]);
                }
            }

            if ((i < (paragraph_array.length - 1))) {
                text_array.push("\n");
            }
        }
    }



}

module.exports.dispatch_query = async function dispatch_query(by_user, question, query) {

    let now_date = Date.now() / 1000;
    let user = new main_model.User(by_user.user_infos, by_user.personals);

    if (question.length <= 2) {
        let draft_struct = await model.getDraft(user.id);
        if (draft_struct.esit == false) {
            return ({
                query_text: "Woops!",
                toSend: simpleMessage(draft_struct.text, user.id)
            });
        } else {
            return ({
                query_text: draft_struct.inc_title,
                toEdit: daft_message(user, draft_struct).toSend
            });
        }
    }

    let option = question[2];
    let to_return = { query_text: "" };
    let possible_id = query.message.text.split("\n")[1];
    possible_id = (possible_id ? possible_id.split(" ") : undefined);
    possible_id = (possible_id ? possible_id[possible_id.length - 1] : undefined);

    if (model.checkParagraphID(possible_id) == true) {
        user.has_pending = possible_id;
    }

    if ((user.last_interaction + 120) >= now_date) {
        to_return.query_text = "Quanta fretta!";
        return (to_return);
    } else if (option == ("TMP_NEW")) {
        if (question[3] == "INFO" || (user.personals.length < 1 && !(question[3] == "CONFIRM") )) {
            let option_n = 0;
            if (!isNaN(question[4])) {
                option_n = question[4];
            }
            let mess_manager = incarichi_AuthorInfos_message(user, option_n);
            to_return.toEdit = mess_manager.toSend;
            to_return.query_text = mess_manager.query_text;
            return (to_return);
        } else {
            return new_userAdventure(user, question[3]).then(function (res) {
                to_return.toEdit = res.toSend;
                to_return.query_text = "Si comincia!";
                return (to_return);
            });
        }
    } else if (option == "TMP_DELETE") { // null, CONFIRM 
        let delete_res = await delete_userAdventure(user.id, question[3]);
        return (delete_res);
    } else if (option == "PRGPH") {
        if (question.length <= 3) {
            return (await firstParagraph_manager(user, question.splice(3)));
        } else {
            if (question[3] == "CMDS") {
                to_return.toEdit = incarichi_AuthorCommands_message(user, question[4]).toSend;
                to_return.query_text = "Comandi per l'editing";
                return (to_return);
            } else if (question[3] == "OPTIONS") {
                return model.getDraft(user.id).then(function (inc_struct) {
                    return loadParagraph(user.id, question[4]).then(function (paragraph_infos) {
                        to_return.toEdit = paragraph_setOptions_message(user.id, inc_struct, paragraph_infos).toSend;
                        to_return.query_text = "Opzioni paragrafo " + paragraph_infos.par_id;

                        return (to_return);
                    });
                });

            } else if (question[3] == "SELECT") {
                return model.getDraft(user.id).then(async function (inc_struct) {

                    if (inc_struct.esit == false) {
                        return queryManager_res({
                            query_text: "Woops!",
                            toSend: simpleMessage(inc_struct.text, user.id)
                        });
                    } else if (inc_struct.inc_ids.length == 0) { //  
                        to_return.toEdit = simpleMessage("*Woops!*\n\nNon hai ancora aggiunto alcun paragrafo alla tua bozza!", user.id);
                        to_return.query_text = "Woops!";
                        return (to_return);
                    } else if (question.length == 4 && inc_struct.inc_ids.length > 1) { // && inc_struct.inc_ids[0] != user.has_pending) { // inc_struct.inc_ids.length == 0 
                        to_return.toEdit = selectParagraph(user, inc_struct, 0).toSend;
                        to_return.query_text = "Indice";
                        return (to_return);
                    } else {
                        let p_id = inc_struct.inc_ids[0];
                        to_return.query_text = "Indice";

                        if (question.length > 4 && !isNaN(question[4])) {
                            to_return.toEdit = selectParagraph(user, inc_struct, question[4]).toSend;
                            to_return.query_text = "Indice, p." + (parseInt(question[4]) + 1);
                            return (to_return);
                        } else if (question.length >= 5 && checkParagraphID(question[4]) == true) {
                            p_id = question[4];
                            to_return.query_text = "Paragrafo " + (question[4]);
                        }

                        paragraph_infos = await loadParagraph(user.id, p_id);
                        if (paragraph_infos.esit == false) {
                            to_return.query_text = "Woops";
                            to_return.toEdit = simpleMessage("*Woops!*\nNon mi risulta che `" + p_id + "` indichi uno dei tuoi paragrafi...", user.id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]);
                        }

                        if (question[5] != "TO_SEND") {
                            db_update = await updateUserParagraph(user.id, p_id, (user.has_pending == p_id));
                            if (db_update.esit === false) {
                                return newParagraph_res({ query_text: "Woops!", toSend: simpleMessage(db_update.text, user.id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) });
                            } else {
                                to_return.toEdit = paragraph_message(user, inc_struct, paragraph_infos);
                                if (inc_struct.inc_ids[0] == p_id) {
                                    to_return.query_text = "Inizio Avventura 🌱";
                                } else {
                                    to_return.query_text = "Paragrafo " + p_id;
                                }
                            }
                        } else {

                            to_return.toSend = paragraph_message(user, inc_struct, paragraph_infos, true);
                        }



                        return (to_return);
                    };
                });
            } else if (question[3] == "DELETE") {
                return model.getDraft(user.id).then(function (inc_struct) {
                    return loadParagraph(user.id, question[4]).then(function (paragraph_infos) {
                        to_return.toEdit = paragraph_removeChoice_message(user.id, inc_struct, paragraph_infos).toSend;
                        to_return.query_text = "Elimina scelta " + question[4];
                        return (to_return);
                    });
                });
            } else if (question[3] == "CH_ESIT") {
                return model.getDraft(user.id).then(function (inc_struct) {
                    return loadParagraph(user.id, question[4]).then(function (paragraph_infos) {
                        to_return.toEdit = paragraph_setChoiceEsit_message(user.id, inc_struct, paragraph_infos).toSend;
                        to_return.query_text = "Esito Scelta" + question[4];
                        return (to_return);
                    });
                });
            } else if (question[3] == "CH_TITLE") {
                //cacca;
                return model.getDraft(user.id).then(async function (inc_struct) {
                    to_return.toDelete = { chat_id: query.message.chat.id, mess_id: query.message.message_id };

                    const paragraph_infos = await loadParagraph(user.id, question[4]);

                    if (paragraph_infos.esit == false) {
                        to_return.query_text = "Messaggio obsoleto!";
                    } else {
                        let pure_text = query.message.text.split("• Nuovo: ")[1].split("\n")[0];
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

                        await setUserTmpDaft(user.id, inc_struct);
                        await updateParagraph(user.id, paragraph_infos.par_id, paragraph_infos);

                        to_return.query = { id: query.id, options: { text: "Titolo del paragrafo\n\nAggiornato\n✅", show_alert: true, cache_time: 4 } }

                    }
                    return (to_return);
                });
            } else if (question[3] == "CH_TEXT") {
                return loadParagraph(user.id, user.has_pending).then(async function (paragraph_infos) {
                    if (paragraph_infos.esit == false) {
                        to_return.toSend = simpleMessage(paragraph_infos.text, user_id);
                        to_return.query_text = "Woops";

                    } else if (question[4] == "INT") {
                        let inc_struct = await model.getDraft(user.id);

                        if (inc_struct.esit == false) {
                            to_return.query_text = "Woops!";
                            to_return.toSend = simpleMessage(inc_struct.text, user.id);
                        } else {
                            let integrazione = query.message.text.substring(query.message.text.indexOf("«") + 1, query.message.text.indexOf("»"));

                            let ch_manager = paragraph_setTex_message(user.id, inc_struct, paragraph_infos, integrazione, 2, parseInt(question[5]));
                            to_return.query_text = ch_manager.query_text;
                            to_return.toEdit = ch_manager.toSend;
                            console.log(to_return.toEdit);
                        }
                    } else {
                        let pure_text = query.message.text.split("• Nuovo: ")[1].split("\n")[0];
                        let ch_manager = paragraph_setChoiceText_message(user.id, paragraph_infos, pure_text, question[4]);
                        to_return.toEdit = ch_manager.toSend;
                        to_return.query_text = ch_manager.query_text;

                        console.log(to_return);
                    }

                    return (to_return);
                });

            } else if (question[3] == "CH_DELAY") {
                return model.getDraft(user.id).then(function (inc_struct) {
                    return loadParagraph(user.id, user.has_pending).then(function (paragraph_infos) {
                        let ch_manager = paragraph_setDelay_message(user.id, inc_struct, paragraph_infos, question[5], question[4]);
                        to_return.toEdit = ch_manager.toSend;
                        to_return.query_text = ch_manager.query_text;

                        console.log(to_return);

                        return (to_return);
                    });
                });

            } else if (question[3] == "CH_STATUS") { // PRGPH:CH_STATUS
                return model.getDraft(user.id).then(function (inc_struct) {
                    return loadParagraph(user.id, question[4]).then(function (paragraph_infos) {
                        let is_alternative = false;
                        if (question[6] == "ALT") {
                            is_alternative = question[7];
                        }
                        to_return.toEdit = paragraph_setChoiceStatus_message(user.id, inc_struct, paragraph_infos, question[5], is_alternative).toSend;
                        to_return.query_text = "Stato giocatore, paragrafo " + question[4];
                        return (to_return);
                    });
                });
            } else if (question[3] == "ITEM") {
                if (true) {
                    to_return.query_text = "Prossimamente...";
                    return (to_return);
                }
            } else if (question[3] == "AVAILABILITY") { // DA FINIRE
                return paragraph_setChoiceAvailability_manager(user, query, question).then(function (setChoiceAv_return) {
                    return (setChoiceAv_return);
                });
            } else if (question[3] == "SHOW") {
                return model.getDraft(user.id).then(async function (inc_struct) {
                    inc_struct.def_vista = question[4];
                    let update_res = await setUserTmpDaft(user.id, inc_struct);

                    let paragraph_infos = await loadParagraph(user.id, user.has_pending);
                    return ({
                        query_text: "Visuale " + (question[4] == "NIGHT" ? "Notturna 🌙" : (question[4] == "ALL" ? "Completa ⭐" : "Diurna ☀️️")),
                        toEdit: paragraph_message(user, inc_struct, paragraph_infos)
                    });
                });
                // 
            } else {
                return ({ query_text: "Prossimamente..." });
            }
        }
    } else if (option == "ALTERNATIVE") { // ALTERNATIVE:SELECT:' + paragraph_infos.par_id + ":DEST:" + paragraph_infos.choices[i].id
        return model.getDraft(user.id).then(function (inc_struct) {
            if (question[3] == "CH") {

                return paragraph_editAlternative_manager(user, inc_struct, user.has_pending, question.splice(4), query).then(function (to_return) {
                    if (to_return.esit == false) {
                        return ({
                            query_text: "Woops!",
                            toSend: simpleMessage(to_return.text, user.id)
                        });
                    }
                    return (to_return);
                });
            } else if (question[3] == "NEW") {
                console.log("comandi: " + question.join(":"));
                console.log("Mando: " + question.slice(4));

                let message_text = query.message.text.split("\n")[3].substring(2);

                let alt_manager = paragraph_manageAlternative_message(user, inc_struct, message_text, question.slice(4));

                return ({
                    query_text: alt_manager.query_text,
                    toEdit: alt_manager.toSend
                });

            } else if (question[3] == "SELECT") {
                if (isNaN(parseInt(question[4]))) {
                    return ({
                        query_text: "Woops!",
                        toSend: simpleMessage("*Woops*\n\n• Errore ASEL-IN, se puoi contatta @nrc382", user.id)
                    });
                }
                return loadParagraph(user.id, user.has_pending).then(function (paragraph_infos) {
                    if (paragraph_infos.esit == false) {
                        return ({
                            query_text: "Woops!",
                            toSend: simpleMessage(paragraph_infos.text, user.id)
                        });
                    } else if (!paragraph_infos.choices || paragraph_infos.choices.length <= 0) {
                        return ({
                            query_text: "Woops!",
                            toSend: simpleMessage("*Woops*\n\n• Errore ASEL, se puoi contatta @nrc382", user.id)
                        });
                    }

                    for (let i = 0; i < paragraph_infos.choices.length; i++) {
                        console.log(paragraph_infos.choices[i]);
                        if (paragraph_infos.choices[i].is_alternative) {
                            if (paragraph_infos.choices[i].alternative_id == parseInt(question[4])) {
                                return loadAlternative(user.id, paragraph_infos.par_id, paragraph_infos.choices[i].dest_id).then(function (dest_infos) {
                                    to_return.query_text = "Alternativa verso " + paragraph_infos.choices[i].title_text;

                                    if (question[5] == "TO_SEND") {
                                        to_return.toSend = alternative_message(user.id, inc_struct, paragraph_infos, dest_infos, paragraph_infos.choices[i].alternative_id, true);

                                    } else {
                                        to_return.toEdit = alternative_message(user.id, inc_struct, paragraph_infos, dest_infos, paragraph_infos.choices[i].alternative_id);
                                    }

                                    return (to_return);
                                });
                            }
                        }
                    }
                    return ({
                        query_text: "Woops!",
                        toSend: simpleMessage("*Woops*\n\n• Errore ASEL2, se puoi contatta @nrc382", user.id)
                    });


                });
            } else if (question[3] == "TARGET" || question[3] == "DELETE" || question[3] == "INTERMEDIO") {
                return loadParagraph(user.id, user.has_pending).then(function (paragraph_infos) {
                    if (paragraph_infos.esit == false) {
                        to_return.query_text = "Woops!";
                    } else {
                        console.log("Mando: " + question.slice(3).join(":"));
                        let pure_text = "";
                        if (question[3] == "INTERMEDIO") {
                            pure_text = query.message.text.substring(query.message.text.indexOf("«") + 1, query.message.text.indexOf("»"));
                        }
                        let alt_manager = paragraph_manageAlternative_message(user, inc_struct, pure_text, question.slice(3), paragraph_infos);

                        to_return.toEdit = alt_manager.toSend;
                        to_return.query_text = alt_manager.query_text;
                    }
                    return (to_return);
                });

            } else if (inc_struct.inc_ids.indexOf(question[4]) < 0 || inc_struct.inc_ids.indexOf(question[6]) < 0) {
                return ({
                    query: { id: query.id, options: { text: "Woops!\nQualche cosa è andato storto...", show_alert: true, cache_time: 4 } }
                });
            } else { //SELECT
            }
        });
    } else if (option == "VARIATION") {
        return model.getDraft(user.id).then(async function (inc_struct) {
            if (inc_struct.esit == false || inc_struct.inc_ids.indexOf(user.has_pending) < 0) {
                return ({ query_text: "Woops" });
            }
            let variation_options = question.splice(3);
            let paragraph_infos;
            let new_variation_text;

            if (variation_options[0] == "NEW") {
                variation_options = variation_options.splice(1);
                new_variation_text = query.message.text.substring(in_query.message.text.indexOf("«") + 1, in_query.message.text.indexOf("»"));
            } else {
                paragraph_infos = await loadParagraph(user.id, user.has_pending);
                if (paragraph_infos.esit == false) {
                    return ({ query_text: "Woops!" });
                }

                if (variation_options[0] == "INSERT") {
                    new_variation_text = in_query.message.text.substring(in_query.message.text.indexOf("«") + 1, in_query.message.text.indexOf("»"));

                    return paragraph_Variation_confirm(user, inc_struct, paragraph_infos, variation_options[1], variation_options[2], variation_options[3], new_variation_text).then(function (to_return) {
                        if (to_return.esit === false) {
                            return ({ query_text: "Woops!", toSend: simpleMessage(res.text, user_id, [[{ text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) });
                        } else {
                            return (to_return);
                        }
                    });
                } else if (variation_options[0] == "MANAGE") {
                    let variation_message = paragraph_Variation_manager(user, inc_struct, paragraph_infos, variation_options[1], variation_options[2]);
                    to_return.toEdit = variation_message.toEdit;
                    to_return.query_text = "Variante " + variation_options[1];
                    return (to_return);

                }
            }
            console.log(variation_options);

            let variation_message = paragraph_Variation_message(user, inc_struct, paragraph_infos, new_variation_text, variation_options);
            to_return.toEdit = variation_message.toSend;
            to_return.query_text = variation_message.query_text;

            console.log(to_return);
            return (to_return);
        });
    } else if (option == "EDIT") { // DELAY, TEXT, TITLE, TYPE
        return (await draft_edit_controller(user, question, query)); 
    } else if (option == "LIST_UPDATE") {
        return model.getDraft(user.id).then(async function (inc_struct) {
            if (inc_struct.esit == false) {
                return ({
                    query_text: "Woops",
                    toSend: simpleMessage(inc_struct.text, user.id)
                });
            } else {
                let all_names = await get_AllParagraph_names(user.id, inc_struct);
                inc_struct.avv_pcache = all_names;
                await setUserTmpDaft(user.id, inc_struct);

                return ({
                    query_text: "Aggiornato!",
                    toEdit: selectParagraph(user, inc_struct, 0).toSend
                });
            }
        });
    } else if (option == "OPTIONS") {
        return model.getDraft(user.id).then(function (inc_struct) {
            if (inc_struct.esit == false) {
                return ({
                    query_text: "Woops",
                    toSend: simpleMessage(inc_struct.text, user.id)
                });
            } else {
                return ({
                    query_text: "Impostazioni Bozza",
                    toEdit: adventure_options_message(user, inc_struct)
                });
            }
        });
    } else if (option == "OPTION_CONFIRM") {
        return model.getDraft(user.id).then(function (inc_struct) {
            if (inc_struct.esit == false) {
                return ({
                    query_text: "Woops",
                    toSend: simpleMessage(inc_struct.text, user.id)
                });
            } else {
                return set_adventureOption_confirm(user, question, in_query.message.text, inc_struct).then(function (to_return) {
                    let res = { query: { id: in_query.id, options: { text: to_return.query_text, show_alert: true, cache_time: 4 } } };
                    let specials_questions = ["TITLE", "DESC", "DELAY"]; // "SOLO", "MULTI"
                    let options_questions = ["SOLO", "MULTI", "ALL", "DAY", "NIGHT"]; // "SOLO", "MULTI"

                    if (options_questions.indexOf(question[3]) >= 0) {
                        res.toEdit = adventure_options_message(user, to_return.paragraph_infos);
                        res.toEdit.mess_id = in_query.message.message_id;
                    } else if (specials_questions.indexOf(question[3]) < 0) {
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
                    return (res);
                });
            }
        });
    } else if (option == "PUBLISH") {
        return ({ query_text: "Prossimamente..." });
    } else if (option == ("TEST")) {
        return model.getDraft(user.id).then(function (inc_struct) {
            if (inc_struct.esit == false) {
                return queryManager_res({
                    query_text: "Woops!",
                    toSend: simpleMessage(inc_struct.text, user.id)
                });
            } else if (question[3] == "START") {
                return check_adventureStruct_loopController(user, inc_struct).then(function (loop_res) {
                    loop_res.query = { id: in_query.id, options: { text: loop_res.query_text, show_alert: true, cache_time: 4 } };
                    delete loop_res.query_text;

                    return (loop_res);
                });
            } else {
                to_return.query_text = "Test sull'Avventura...";
                to_return.toEdit = check_adventureStruct_message(user, inc_struct);
                return (to_return);
            }
        });
    } else {
        to_return.query_text = "Pardon? Nuovo...";
        return (to_return);
    }

}



// ***********  CONTROLLERS  ******************
// #Adventure_struct (struct.json) 
async function new_userAdventure(user_info, type) {
    if (user_info.has_pending != "-1") {
        let message_text = "*Mumble...*\n\nStai già scrivendo un'avventura.\nDovrai pubblicarla o eliminarla prima di poter iniziare a lavorare ad una nuova.\n\n";
        return ({ toSend: simpleMessage(message_text, user_info.id, [[{ text: "Elimina ⌫", callback_data: 'B:TMP:TMP_DELETE' }]]) });
    } else {
        template_res = await model.newDraft(user_info);
        if (template_res.esit == false) {
            return ({ toSend: simpleMessage(template_res.text, user_info.id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) });
        } else {
            return (daft_message(user_info, template_res.struct));
        }
    }
}

async function delete_userAdventure(user_id, option) {
    let draft_struct = await model.getDraft(user_id);

    if (draft_struct === false) {
        let message_text = "*Mumble...*\n\nNon mi risulta tu stia scrivendo un'avventura...";
        return (({ query_text: "Woops!", toEdit: simpleMessage(message_text, user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) }));
    } else if (option == "CONFIRM") {
        let del_res = await model.deleteDraft(user_id);

        if (del_res.esit === false) {
            return (({ query_text: "Woops!", toEdit: simpleMessage(del_res.text, user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) }));
        } else {
            return (({ query_text: "Eliminata!", toEdit: simpleMessage("🗑" + " *Bozza eliminata!*\n\n", user_id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }, { text: "Chiudi ⨷", callback_data: "B:FORGET" }]]) }));
        }

    } else {
        let message_text = "🗑" + " *Scarta la Bozza*\n\nProcedendo non sarà possibile recuperare alcun informazione su:\n\"" + draft_struct.inc_title + "\"\n\n";
        message_text += "• Paragrafi: " + draft_struct.inc_ids.length + "\n";
        let enlapsed = ((Date.now() / 1000) - draft_struct.inc_mdta.creazione) / (60 * 60 * 24);
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
        return (({ query_text: "Elimina Bozza", toEdit: simpleMessage(message_text, user_id, buttons_array) }));
    }


}

async function draft_edit_controller(user, question, in_query){
    if (question[3] == "TITLE") {
        //cacca;
        let draft_struct = await model.getDraft(user.id);
        let paragraph_infos = await loadParagraph(user.id, question[4]);

        let pure_text = in_query.message.text.split("• Nuovo: ")[1].split("\n")[0];
        let title_manager = set_adventureTitle_message(draft_struct, paragraph_infos, user, pure_text, question[5]).toSend;

        return ({
            toEdit: title_manager.toSend,
            query_text: title_manager.query_text
        });

    } else if (question[3] == "CMD") {
        to_return.toEdit = incarichi_Cmds_message(user).toSend;
        to_return.query_text = "Comandi per l'editing";
        return (to_return);
    }
}




// ***********  VIEW (MESSAGGI)  ******************

// VIEW-MENU-BOZZA
function daft_message(user_info, draft_struct) {
    if (!draft_struct) {
        return ({ toSend: simpleMessage("*Woops!*\n\nNon mi risulta tu stia scrivendo un'avventura...", user_info.id, [[{ text: "Torna al Menu", callback_data: 'B:MAIN_MENU' }]]) });
    }
    let message_text = "";
    let buttons_array = [];


    message_text += "📜 *" + draft_struct.inc_title + "*\n";

    if (draft_struct.inc_options.type == "SOLO") {
        message_text += "_...un'avventura personale, ";
    } else {
        message_text += "_...un'avventura per squadre, ";
    }
    message_text += "di " + user_info.alias + "_\n\n";
    message_text += "· ";


    if (draft_struct.inc_ids.length == 1) {
        message_text += "· Un Paragrafo\n";
    } else if (draft_struct.inc_ids.length > 1) {
        message_text += draft_struct.inc_ids.length + " Paragrafi\n";
    }

    message_text += "· Attesa di default: ";
    if (draft_struct.inc_options.default_delay < 60) {
        message_text += draft_struct.inc_options.default_delay + " minuti\n";
    } else if (draft_struct.inc_options.default_delay == 60) {
        message_text += "1h\n";
    } else {
        message_text += "1h e " + (draft_struct.inc_options.default_delay - 60) + "m \n";
    }

    if (draft_struct.inc_intro == "") {
        message_text += "\n_«Aggiungi una breve descrizione. Sarà automaticamente formattata in corsivo e tra virgolette.»_\n";
    } else {
        message_text += "\n_«" + draft_struct.inc_intro + "»_\n\n";
    }

    if (draft_struct.inc_title == "Il mio 1° racconto" || draft_struct.inc_intro == "") {
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
    if (draft_struct.inc_ids.length <= 0) {
        buttons_array.push([{ text: "Aggiungi un primo paragrafo", callback_data: 'B:TMP:PRGPH' }]);
    } else {
        buttons_array[0].unshift({ text: "▤", callback_data: 'B:TMP:PRGPH:SELECT' });
        if (draft_struct.inc_ids.length >= 2) {
            buttons_array.push([{ text: "Controlla la Struttura", callback_data: 'B:TMP:TEST' }]);
        }
    }

    return ({ toSend: simpleMessage(message_text, user_info.id, buttons_array) });
}

// VIEW-INFORAMTIVI-AUTORE
function incarichi_AuthorInfos_message(user_info, page_n) {
    let res_querytext = "Introduzione alle avventure";
    let message_text = "📜 *Le Avventure dei Bardi di Lootia* \n_...un'introduzione alla stesura_\n";
    let buttons_array = [[{ text: "⨷", callback_data: "B:FORGET" }]];

    if (page_n == 0) { // ↦
        message_text += "\n• Le avventure narrate sono storie interattive, dove ogni _paragrafo_ (⨓) può portare a due o più scelte (➽)\n";// possono essere per _squadre_ o per _avventurieri solitari_. ";
        message_text += "\n• Potrai sempre modificare ed aggiornare una tua narrazione, anche dopo che sarà stata pubblicata.\n";
        message_text += "\n• L'avventura potrà essere votata da chi la segue ed il punteggio influirà sulla tua `reputazione` che, aumentando, ti permetterà di sbloccare funzionalità aggiuntive per le tue storie.\n"

    } else if (page_n == 1) {
        res_querytext = "Introduzione ai Paragrafi";
        message_text += "\n⨓  *Paragrafi*\n_Sono i testi mostrati scelta una strada._\n";
        message_text += "\n• Prevedono un _testo di default_ ed eventualmente una _variante notturna_.\n";
        message_text += "\n• È poi possibile specificare varianti in base allo stato del giocatore, alle sue caratteristiche, ai suoi oggetti in possesso ed alle sue scelte passate.\n";
        message_text += "\n• Possono portare alla _fine della narrazione_ o verso due o più _paragrafi_.\n";
        //message_text += "\n• Il giocatore avrà 12 ore per selezionare una delle scelte che prevede il paragrafo, scadute le quali ";
        //message_text += "se il paragrafo destinazione non prevede un testo appropriato (diurno o notturno) si arriverà a _fine narrazione_\n";
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:TMP_NEW:INFO:2' });
    } else if (page_n == 2) {
        res_querytext = "Introduzione alle Scelte";
        message_text += "\n➽  *Strade*\n_Sono le scelte che un giocatore può fare in un paragrafo, mostrate in un bottone._\n";
        message_text += "\n• Possono avere un tempo d'_attesa_ o essere istantanee.\n";
        message_text += "\n• Possono richiedere, consumare o portare al drop di oggetti.\n";

        message_text += "\n• Possono modificare lo _stato_ del giocatore ed essere esclusivi o nascosti ad alcuni stati.\n";
        message_text += "\n• Possono essere nascoste in base ad orario, stato, inventario o caratteristiche del giocatore.\n";
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:TMP_NEW:INFO:5' });
    } else if (page_n == 3) {
        // res_querytext = "Introduzione alle Alternative";

        // message_text += "\n🔀  *Alternative*\n_Come le strade, ma portano ad un paragrafo già esistente._\n";
        // message_text += "\n• Possono avere un _testo intermedio_, che verrà mostrato prima del paragrafo destinazione (↧) .\n";
        // buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:TMP_NEW:INFO:5' });

    } else if (page_n == 4) {
        //message_text += "\n\n*Nelle avventure per squadre*";
        //message_text += "\n• Di default i membri seguiranno la _strada_ con più voti, ed una casuale in caso di _ambiguità_.";
        //message_text += "\n• Puoi scegliere, nel caso di parità tra più strade, un strada forzata: non sarà necessariamente tra quelle più votate.\n";
        //message_text += "\n• Puoi scegliere, per ogni paragrafo che prevede almeno un'opzione di fine, se terminare l'avventura solo per quella parte di squadra che eventualmente ha scelto l'opzione.\n";
        //message_text += "\n• Puoi scegliere, per ogni strada, un numero minimo di giocatori che devono sceglierla perche questa...\n";
    } else if (page_n == 5) {
        res_querytext = "Introduzione agli Oggetti";

        message_text += "\n📦  *Drop, togli e richiedi*\n";
        message_text += "_Sono stati definiti " + main_model.all_items.base.length + " oggetti base e " + main_model.all_items.creabili.length + " creabili_\n";
        message_text += "\n• L'inventario di un giocatore è mantenuto tra le varie avventure e limitato al tipo di zaino.\n";
        message_text += "\n• In base all'inventatio e per ogni paragrafo, puoi specificare una o più varianti\n";
        message_text += "\n• Per ogni strada ed in base alla tua reputazione, puoi chedere o donare un oggetto al giocatore\n";
        message_text += "\n• Puoi nascondere o rendere disponibile una strada ai soli giocatori che possiedono determinati oggetti.\n";
        message_text += "\n• Alcuni oggetti possono essere equipaggiati dalla figurina del giocatore per aumentarne la forza in battaglia.\n";

        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:TMP_NEW:INFO:6' });
    } else if (page_n == 6) {
        res_querytext = "Introduzione ai Mob";

        message_text += "\n🐗  *Mob*\n";
        message_text += "_In base alla tua reputazione, potrai decidere spawn-rate ed abilità di npc che il giocatore dovrà affrontare per poter proseguire nell'avventura._\n"
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:TMP_NEW:INFO:7' });

    } else if (page_n == 7) {
        res_querytext = "Introduzione allo Stato Giocatore";

        message_text += "\n❤️  *Stato Giocatore*\n";
        message_text += "_Sono definiti 5 'stati' per gli avventurieri che seguono le storie dei bardi. Puoi usarli per rendere piu complesse e dinamiche le tue narrazioni_\n"
        message_text += "\n• Lo stato è una caratteristica del giocatore, che può permanere tra un'avventura ed un'altra.\n";
        message_text += "\n• Per ogni paragrafo puoi specificare una o più varianti, che sostituiranno il testo a seconda dello stato dell'avventuriero.\n";
        message_text += "\n• Per ogni strada puoi modificare lo stato del giocatore che la percorre.\n";
        message_text += "\n• Puoi nascondere o rendere disponibile una strada ai soli giocatori che si trovano in determinati stati.\n";
        message_text += "\n• Ogni stato ha un impatto diverso nelle battaglie contro i mob.\n";
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:TMP_NEW:INFO:8' });

    } else if (page_n == 8) {
        res_querytext = "Figurina del Giocatore";

        message_text += "\n🎴  *Caratteristiche delle Figurine*\n";
        message_text += "_Ogni giocatore segue le avventure con una figurina_\n"
        message_text += "\n• Può equipaggiare oggetti\n";
        message_text += "\n• Può uccidere mob o essere uccisa provandoci\n";
        message_text += "\n• Ha 4 caratreristiche fondamentali, che possono essere usate per varianti sul testo dei paragrafi o influire sulle scelte disponibili.\n";
        message_text += "\n• Tempi di scelta, copertura dell'avventura, cambiamenti di stato, battaglie ed inventario sono usati dinamicamente per aggiornare i valori di ogni caratteristica.\n";
        buttons_array[0].unshift({ text: "↦", callback_data: 'B:TMP:TMP_NEW:INFO:1' });
    }

    //message_text += "\n💡 Per i termini in corsivo di questo messaggio, ed altri, è disponibile:\n· `/bardo ? `...\n";

    if (page_n == 0) {
        buttons_array.unshift([
            { text: "⨓", callback_data: 'B:TMP:TMP_NEW:INFO:1' },
            { text: "➽ ", callback_data: 'B:TMP:TMP_NEW:INFO:2' },
            { text: "❤️", callback_data: 'B:TMP:TMP_NEW:INFO:7' },
            { text: "📦", callback_data: 'B:TMP:TMP_NEW:INFO:5' },
            { text: "🐗", callback_data: 'B:TMP:TMP_NEW:INFO:6' },
            { text: "🎴", callback_data: 'B:TMP:TMP_NEW:INFO:8' }
        ]);

        if (user_info.has_pending == "-1") {
            buttons_array[1].unshift({ text: "Inizia 📜", callback_data: 'B:TMP:TMP_NEW:CONFIRM' });
        } else {
            buttons_array[1].unshift({ text: "📜", callback_data: 'B:TMP:EDIT' });
        }

    } else {
        buttons_array[0].unshift({ text: "ⓘ", callback_data: 'B:TMP:TMP_NEW:INFO:0' });
        if (user_info.has_pending == "-1") {
            buttons_array.push([{ text: "Inizia 📜", callback_data: 'B:TMP:TMP_NEW:CONFIRM' }]);
        } else {
            buttons_array[0].unshift({ text: "📜", callback_data: 'B:TMP:EDIT' });
        }
    }




    let to_return = simpleMessage(message_text, user_info.id, buttons_array);

    return ({ toSend: to_return, query_text: res_querytext });
}



// ***********  ACCESSORIE  ******************
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



// ***********  RETROCOMPATIBILITà (TENTATIVO)  ******************

async function loadAndUpdateParagraph(p_id, user_id) {
    let old_struct = await _loadParagraph(user_id, p_id);
    if ("father_id" in old_struct) {
        let new_struct = update_paragraph_struct(old_struct);
        return (await _updateParagraph(user_id, p_id, new_struct));
    }

    return ":O";
}

module.exports.updateOldStruct = async function updateOldStruct(user_id, option, query) {

    if (option != "CONFIRM") {
        let to_return = simpleMessage("🤖 *Aggiorna per continuare*\n\nLa struttura del modulo è cambiata di molto! ", user_id, [[{ text: "Aggiorna 🔄", callback_data: "B:TMP:CONFIRM" }]]);
        to_return.mess_id = query.message.message_id;
        return ({
            toEdit: to_return,
            query: { id: query.id, options: { text: "Aggiorna per continuare", cache_time: 2 } },
        });
    } else {
        let old_draft = await model.getDraft(user_id);

        if (old_draft.esit) {
            return ({
                query: { id: query.id, options: { text: "Woops", cache_time: 2 } },
                toSend: simpleMessage(old_draft.text, user_id)
            });
        } else {
            let query_text = "Fatto!";
            let msg_text = "*Struttura Aggiornata!*\n\nBon, speriamo bene...\nSe riscontri errori, contatta @nrc382 (non tutto è perduto)";

            let promise_array = [];

            if (("paragraphs_ids" in old_draft)) {
                let updated_draft = update_user_draft(old_draft);
                let update_draft = await updateUserDraft(user_id, updated_draft);

                for (let i = 0; i < old_draft.paragraphs_ids.length; i++) {
                    console.log(old_draft.paragraphs_ids[i]);
                    promise_array.push(loadAndUpdateParagraph(old_draft.paragraphs_ids[i], user_id));
                }

                if (update_draft.esit == false) {
                    query_text = "Woops!";
                    msg_text = "*Struttura non Aggiornata!*\n\nSe puoi, contatta @nrc382 (non tutto è perduto)";
                } else {
                    let update_userlastinteraction = await setUserLI(user_id); // aggiorno l'ultima interazione dell'utente sul database
                }
            } else {
                for (let i = 0; i < old_draft.inc_ids.length; i++) {
                    promise_array.push(loadAndUpdateParagraph(old_draft.inc_ids[i], user_id));
                }
            }


            console.log("Inizio a modificare i paragrafi...")

            let resolve_all = await Promise.all(promise_array);
            console.log("Le risposte:")
            console.log(resolve_all);




            return ({
                query: { id: query.id, options: { text: query_text, cache_time: 2 } },
                toSend: simpleMessage(msg_text, user_id)
            });


        }
    }



}