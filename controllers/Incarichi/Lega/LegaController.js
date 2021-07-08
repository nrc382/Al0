const lega_model = require('./LegaModel');
const lega_names = require('./LegaNames');
const lega_mob = require('./LegaMob');


function menageMessage(t_message) {
    //myLog(t_message);
    return new Promise(async function (mess_res) {
        if (t_message.from.isBot) {
            return mess_res([]);
        } else if (t_message.text.match("genera")) {
            return register_MessageManager(t_message.from, ["", "", "1"]).then(function (res_mess) {
                return mess_res({ toSend: res_mess });
            });
        }
        //myLog("> Prossimo msg_id: " + (t_message.message_id + 1));

        let raw_info = await lega_model.getUser(t_message.from.id);

        if (raw_info.found == -1) { //Errore
            myLog("Problemi contattando il db…");
            res.toSend = simpleMessage(t_message.from.id, "⧱ *Desolato…*\n\nAl momento ho problemi a comunicare con il database. Ogni funzionalità è interrotta.")
            return mess_res(res);
        } else if (raw_info.found == 0) { // Nuovissimo Utente (proprio il primo messaggio)
            raw_info.lastMessage_date = Math.floor(Date.now() / 1000);
            raw_info.lastMessage_id = 0;
            return lega_model.updateUser([raw_info.telegram_id, (t_message.message_id + 1), raw_info.lastMessage_date]).then(function (insert_esit) {
                raw_info.curr_msgId = t_message.message_id;
                return mess_res(newUser_MessageMenager(raw_info, "page1"));
            });
        } else { // Utente Registrato
            console.log(raw_info);
            let insert_esit = await lega_model.updateUser([raw_info.telegram_id, (t_message.message_id + 1), (Date.now() / 1000)]);

            myLog("> Utente Registrato…");
            raw_info.curr_msgId = t_message.message_id;
            if (raw_info.mob_level < 0) { // Non ha un mob
                return mess_res(newUser_MessageMenager(raw_info, "page3"));
            } else if (raw_info.curr_path == "POST_REG") {
                return mess_res(braveMessage(raw_info));
            } else {
                let currentPath_split = [];
                if (raw_info.curr_path.length > 0) {
                    currentPath_split = raw_info.curr_path.split(":");
                }

                if (currentPath_split[0] == "MASTERS") {
                    return mastersMessage(raw_info, [currentPath_split[1], currentPath_split[2]], 1).then(function (masters_message) {

                        return mess_res(masters_message);
                    });
                }
                myLog("> Path corrente: " + currentPath_split.join("-> "));
                return lega_model.loadMob(raw_info.telegram_id).then(function (raw_mobInfo) {
                    let main_menu = private_chat_message(raw_mobInfo, raw_info, 0).message;
                    return mess_res({ toSend: main_menu });
                });

            }

        }

    });
}
module.exports.menage = menageMessage;

function menageQuery(t_query) {
    return new Promise(function (query_res) {
        return lega_model.getUser(t_query.from.id).then(function (raw_info) {
            let question = t_query.data.split(":");

            if (question[1] == "FORGET") {
                return query_res({
                    query: { id: t_query.id, options: { text: "Pulisco…", cache_time: 4 } },
                    toDelete: { chat_id: t_query.message.chat.id, mess_id: t_query.message.message_id },
                });
            } else if (question[1] == "B") { // Battaglie
                //console.log(raw_info);
                return battleActions_manager(t_query, question, raw_info).then(function (to_return) {
                    return query_res(to_return);
                })
            } else if (t_query.message.message_id < raw_info.lastMessage_id) {
                return query_res({
                    query: { id: t_query.id, options: { text: "Obsoleto!\n\nIl messaggio è fuori contesto", cache_time: 2, show_alert: true } },
                    toDelete: { chat_id: t_query.message.chat.id, mess_id: t_query.message.message_id }
                });
            } else if (!checkInvalidQuery(question[1], raw_info)) {
                return query_res({
                    query: { id: t_query.id, options: { text: "Obsoleto!\n\nIl messaggio è fuori contesto", cache_time: 2, show_alert: true } },
                    toDelete: { chat_id: raw_info.telegram_id, mess_id: t_query.message.message_id }
                });
            } else {

                console.log(question);
                raw_info.isQuery = true;
                let user_rawData = [t_query.from.id, t_query.message.message_id, (Date.now() / 1000)];
                return lega_model.updateUser(user_rawData).then(function (insert_esit) {
                    if (question[1] == "START") {
                        let res_msg;
                        if (question[2] == "1") {
                            res_msg = newUser_MessageMenager(raw_info, "page1", question[4]);
                        } else if (question[2] == "2") {
                            res_msg = newUser_MessageMenager(raw_info, "page2", question[4]);
                        }
                        return query_res({
                            query: { id: t_query.id, options: { text: (question[2] == "1" ? "Casualità?" : "Curiosità!"), cache_time: 3 } },
                            toEdit: {
                                message_text: res_msg.message_text,
                                chat_id: t_query.message.chat.id,
                                mess_id: t_query.message.message_id,
                                options: res_msg.options
                            }
                        });


                    } else if (question[1] == "REG") {
                        return register_MessageManager(t_query.from, question, t_query.message.message_id).then(function (reg_esit) {
                            return query_res([
                                {
                                    query: { id: t_query.id, options: { text: "Nascita!", cache_time: 3 } },
                                    toEdit: {
                                        message_text: reg_esit.message_text,
                                        chat_id: t_query.message.chat.id,
                                        mess_id: t_query.message.message_id,
                                        options: reg_esit.options
                                    }
                                }
                            ]);
                        });
                    } else if (question[1] == "TRAINER") {
                        if (question[2] == "NO") { // Al brave
                            let res_msg = braveMessage(raw_info, question[3]);
                            return query_res({
                                query: { id: t_query.id, options: { text: "It's a wild world", cache_time: 3 } },
                                toEdit: {
                                    message_text: res_msg.message_text,
                                    chat_id: t_query.message.chat.id,
                                    mess_id: t_query.message.message_id,
                                    options: res_msg.options
                                }
                            });

                        } else if (question[2] == "WAITING") { // Messaggio di attesa

                        } else if (question[2] == "ENDING") { // Messaggio di attesa finale //NEW_WORLD

                        } else if (question[2] == "INFO") { // Messaggio di attesa
                            let text_message = "🌎 *Un nuovo mondo*\n\n";
                            text_message += "_«Oltre a costituzione, temperamento e affiatamento, esistono altre caratteristiche peculiari per ogni mob.\n_";
                            text_message += "_Tra queste ci sono ad esempio l'agilita, la forza e la resitenza…\n_";
                            text_message += "_Ma anche l'intelligenza creativa e l'attitudine, o fede, nelle arti metafisiche e alchemiche»_\n";

                            text_message += "\nI maesti Argonauti sono abili stimatori capaci, ognuno nel suo campo, di individuare a colpo d'occhio punti di forza e debolezze di ogni _mob_ esistente.\n";
                            text_message += "Dovresti approfittare di quest'occasione: non si ripresenterà!";

                            return query_res({
                                query: { id: t_query.id, options: { text: "Coraggioso nuovo mondo…", cache_time: 3 } },
                                toEdit: {
                                    message_text: text_message,
                                    chat_id: t_query.message.chat.id,
                                    mess_id: t_query.message.message_id,
                                    options: {
                                        parse_mode: "MarkdownV2",
                                        reply_markup: {
                                            inline_keyboard: [
                                                [
                                                    {
                                                        text: "Indietro ↵",
                                                        callback_data: "LEGA:TRAINER:NEW_WORLD"
                                                    }
                                                ]
                                            ]
                                        }
                                    }
                                }
                            });

                        } else if (question[2] == "NEW_WORLD") { // Messaggio di attesa
                            return lega_model.loadMob(raw_info.telegram_id).then(function (raw_mobInfo) {
                                let res_msg = newWorld_message(1, raw_mobInfo.infos, raw_info, true);
                                return query_res({
                                    query: { id: t_query.id, options: { text: "A brave world…", cache_time: 3 } },
                                    toEdit: {
                                        message_text: res_msg.message_text,
                                        chat_id: t_query.message.chat.id,
                                        mess_id: t_query.message.message_id,
                                        options: res_msg.options
                                    }
                                });

                            });
                        } else { // Messaggio verso un Maestro
                            return mastersMessage(raw_info, [question[3], question[4]], question[2]).then(function (master_res) {
                                let query_textArray = ["Il valore si misura sul campo…", "La conoscenza è potere…", "La magia è ovunque…"];
                                return query_res({
                                    query: { id: t_query.id, options: { text: query_textArray[parseInt(question[2]) - 1], cache_time: 3 } },
                                    toEdit: {
                                        message_text: master_res.message_text,
                                        chat_id: t_query.message.chat.id,
                                        mess_id: t_query.message.message_id,
                                        options: master_res.options
                                    }
                                });
                            });
                        }
                    } else if (question[1] == "MAIN") {
                        return lega_model.loadMob(raw_info.telegram_id).then(function (raw_mobInfo) {
                            let m_manager = private_chat_message(raw_mobInfo, raw_info, question[2]);
                            let edit = m_manager.message;
                            edit.mess_id = t_query.message.message_id;
                            edit.chat_id = t_query.message.chat.id;
                            return query_res({
                                query: { id: t_query.id, options: { text: m_manager.query_text, cache_time: 2 } },
                                toEdit: edit
                            });
                        });

                    } else {
                        myLog("Query non riconosciuta!!");
                        myLog(t_query);
                    }
                });


            }
        });
    });
}
module.exports.menageQuery = menageQuery;

function checkInvalidQuery(recived, user_Rawinfo) {
    let user_info = new lega_model.user(user_Rawinfo);
    let user_partialPath = user_info.curr_path.split(" ")[0];
    myLog("> controllo query. Ricevuta: " + recived + ", curr_path: " + user_info.curr_path);
    if (user_info.curr_path == "PRE_REG") {
        if (recived == "START" || recived == "REG") { // pagina start e registrazione
            return true;
        }
        return false;
    } else if (user_partialPath == "MASTERS" || user_info.curr_path == "POST_REG") { // 
        if (recived == "TRAINER") {
            return true;
        }
        return false;
    } else if (user_info.curr_path == "BEGIN") {
        if (recived == "BEGIN") {
            return true;
        }
        return false;
    } else {
        myLog("> QUERY diversa!");
        return true;
    }
}

function newUser_MessageMenager(raw_info, page, repetitions) {
    let user_info = new lega_model.user(raw_info);
    let message_text = "🏟 *Arena Argonauta*\n";
    let proto2;
    if (page == "page1" || page == "page3") {
        let now_date = new Date(Date.now());
        if (Math.floor(Date.now() / 1000) > (user_info.lastMessage_date + (60 * 60 * 12))) {
            message_text += "\nChi si rivede!";
        } else if (now_date.getHours() > 21 || now_date.getHours() < 4) {
            if (page == "page1") {
                message_text += "\nBuonasera!";
            } else {
                message_text += "\nAncora buona sera!";
            }
        } else {
            if (page == "page1") {
                message_text += "\nSalve!";
            } else {
                message_text += "\nDi nuovo salve!";
            }
        }
        message_text += "\nQuesto è un _modulo-companion_ per @LootGamebot.\n\nQui potrai curare quotidianamente, ";
        message_text += "addestrare e far duellare nella *_prestigiosa_ Lega Argonauta* un _Mob da Combattimento_.\n\n";
        message_text += "(Vedi anche le _Avventure dei Bardi di Lootia_)";

    } else if (page == "page2") {
        let proto = lega_model.getRandomMob();
        proto2 = lega_model.getRandomMob();

        message_text += "_Introduzione non-esaustiva_\n\n";
        message_text += "🐗 *Cura del Mob*\n";
        message_text += "_«Il mob non beve ne deglutisce, e molto raramente barigatta. Ma quando chiede il luccio a bisce bisce, o sdilenca un poco o gnagio s’azzittisce…»_\n";
        message_text += "\n🎯 *Addestramento*\n";
        message_text += "_«S'allenano girando e facendo e trovando. O sul campo, che sia contr'un fantoccio o contro " + lega_names.getArticle(proto, true).det + proto.type_name + "»_\n";
        message_text += "\n📖 *Esperienza*\n";
        message_text += "_«Solo giocando, leggendo ed inoltrando messaggi si potranno avere più informazioni ";
        if (proto2.gender == "m") {
            if (proto2.type_name.charAt(0) == "E" || proto2.type_name.substring(0, 2).toLowerCase() == "sc" || proto2.type_name.substring(0, 2).toLowerCase() == "st" || proto2.type_name.substring(0, 2).toLowerCase() == "zo") {
                message_text += "sugli ";
            } else {
                message_text += "sui ";

            }
        } else {
            message_text += "sulle ";
        }
        message_text += proto2.type_name_plural + ". Questo o chiedere ad altri allenatori… ma fidandosi?»_"
    }

    let res = simpleMessage(user_info.telegram_id, message_text);
    myLog("> Repetitions: " + repetitions);
    
    if (page == "page2") {
        let reps = "";
        if (typeof repetitions != "undefined") {
            myLog("> c'è una ripetizione! " + repetitions);
            reps = ":r:" + (parseInt(repetitions) + 1);
        } else {
            reps = ":r:1";
        }
        res.options.reply_markup = {};
        res.options.reply_markup.inline_keyboard = [
            [
                {
                    text: "Registrami ☀",
                    callback_data: "LEGA:REG:1:" + proto2.type_name + ":" + (proto2.gender == "m" ? "m" : "f") + reps
                }], [
                {
                    text: "Indietro ↵",
                    callback_data: "LEGA:START:1" + reps
                }
            ]];

    } else { // if (page == "page1" || page == "page3")
        let influence = "";
        if (typeof repetitions != "undefined") {
            influence = ":r:" + (parseInt(repetitions) + 1);
        }

        res.options.reply_markup = {};
        res.options.reply_markup.inline_keyboard = [
            [
                {
                    text: "Registrami ☀",
                    callback_data: "LEGA:REG:1" + influence
                }

            ], [
                {
                    text: "Introduzione ⓘ",
                    callback_data: "LEGA:START:2" + influence
                }
            ]];
    }

    return (manageDeletion(user_info, res));
}

function register_MessageManager(t_message_from, options) {
    return new Promise(function (registration_esit) {
        let proto_array = [];
        let malus = -3;
        if (options.length >= 5) {
            if (options[3] != "r") {
                proto_array = [options[3], options[4]];
                if (options.length == 7) {
                    let reptitions = parseInt(options[6]);
                    if (reptitions <= 5) {
                        malus = -reptitions;
                    } else {
                        malus = 5 + Math.floor(reptitions / 2);
                        if (Math.floor(Math.random() * 2) == 1) {
                            malus = -1 * malus;
                        }
                    }
                }
            } else {
                let reptitions = parseInt(options[4]);
                if (reptitions <= 1) {
                    malus = reptitions - 2;
                } else if (reptitions <= 5) {
                    malus = 1 - reptitions;
                } else {
                    malus = Math.floor(reptitions / 2) + 8;
                }
            }
        }

        let db_infos = {
            user_id: t_message_from.id,
        };

        return lega_mob.newMob(proto_array, malus, db_infos).then(function (new_mob) {
            if (new_mob == false) {
                let text_message = "⧱ *Desolato…*\n\nNon sono riuscito a completare la registrazione per motivi tecnici.\nSe puoi, segnala a @nrc382";
                return registration_esit(simpleMessage(t_message_from.id, text_message));
            } else {
                return lega_model.update_Path([t_message_from.id, "MAIN"]).then(function (updatePath_res) {
                    return registration_esit(newWorld_message(parseInt(options[2]), new_mob, { telegram_id: t_message_from.id, isQuery: true }, false));
                });
            }
        });
    });
}

function newWorld_message(mob_counter, mob_info, user_info, no_infos) {
    let message_text = "🌎 _Ciao Mondo!_\n\n";
    let mob = new lega_mob.mob(false, mob_info);
    if (mob_counter == 1) {
        message_text += "❂ *Il tuo primo Mob*\n";
        message_text += "«" + mob.describe(0) + "»\n";

        //message_text += "\n" + lega_names.gF(mob.isMale, "Mandal") + " da uno dei tre maestri per una prima valutazione delle sue doti";

    } else {
        // non il primo…
    }

    let res = simpleMessage(user_info.telegram_id, message_text);
    res.options.reply_markup = {};
    res.options.reply_markup.inline_keyboard = [];
    // if (!no_infos) {
    //     res.options.reply_markup.inline_keyboard.push([
    //         {
    //             text: "Maggiori Informazioni ⓘ",
    //             callback_data: "LEGA:TRAINER:INFO"
    //         }
    //     ]);
    // }
    let impatient = "0";
    if (no_infos) {
        impatient = "1"
    }

    /*
    res.options.reply_markup.inline_keyboard.push([
        {
            text: "Eufemo ✸",
            callback_data: "LEGA:TRAINER:" + impatient + ":1:0"
        },
        {
            text: "Corono ❃",
            callback_data: "LEGA:TRAINER:" + impatient + ":2:0"
        },
        {
            text: "Orfeo ❈",
            callback_data: "LEGA:TRAINER:" + impatient + ":3:0"
        }
    ]);
    */
    res.options.reply_markup.inline_keyboard.push([
        {
            text: "Figurina 🎴",
            callback_data: "LEGA:MAIN:1"
        }

    ]);

    return (manageDeletion(user_info, res));

}

function mastersMessage(user_RawInfos, typeAndLevel, impatient) {
    return new Promise(function (masters_message_res) {
        //Aggiorno il path dell'utente con "MASTERS:type:level"
        // type ==  (1 -> Eufemo, 2 -> Corono, 3 -> Orfeo
        // impatient == (0, 1)
        myLog("> mastersMessage -> level: " + typeAndLevel[1] + ", type: " + typeAndLevel[0]);
        let user_info = new lega_model.user(user_RawInfos);
        return lega_model.update_Path([user_info.telegram_id, ("MASTERS:" + typeAndLevel[0] + ":" + typeAndLevel[1])]).then(function (updatePath_res) {
            let msg_text = "";
            if (typeAndLevel[0] == 1) {
                msg_text += "✸ *Ginnasio*\n\n";
            } else if (typeAndLevel[0] == 2) {
                msg_text += "❃ *Foro*\n\n";
            } else {
                msg_text += "❃ *Basilica*\n\n";
            }
            if (typeAndLevel[1] == 0) {
                msg_text += "Livello ZERO";
            } else {
                msg_text += "Livello: " + parseInt(typeAndLevel[1]) + "°";
            }

            let res = simpleMessage(user_info.telegram_id, msg_text);
            res.options.reply_markup = {};
            res.options.reply_markup.inline_keyboard = [];

            res.options.reply_markup.inline_keyboard.push([
                {
                    text: "✸",
                    callback_data: "LEGA:TRAINER:" + impatient + ":" + typeAndLevel[0] + ":" + (parseInt(typeAndLevel[1]) + 1)
                },
                {
                    text: "❃",
                    callback_data: "LEGA:TRAINER:" + impatient + ":" + typeAndLevel[0] + ":" + (parseInt(typeAndLevel[1]) + 1)
                },
                {
                    text: "❈",
                    callback_data: "LEGA:TRAINER:" + impatient + ":" + typeAndLevel[0] + ":" + (parseInt(typeAndLevel[1]) + 1)
                }
            ]);



            return masters_message_res(manageDeletion(user_info, res));
        });
    });
}

function braveMessage(user_rawInfo, options) {
    return new Promise(function (braveMessage_res) {
        return lega_model.update_Path([user_rawInfo.telegram_id, "BEGIN"]).then(function (pathUpdate_res) {
            let message_text = "*⁈*\n_È un mondo selvaggio…_\n";
            let user_info = new lega_model.user(user_rawInfo);
            let now_date = Math.floor(Date.now() / 1000);

            myLog("> now_date: " + now_date);

            myLog("> last_msg_date: " + user_info.lastMessage_date);
            myLog("> piu 30 minuti: " + (60 * 30 + user_info.lastMessage_date));

            if (typeof options != "string") {
                if (now_date >= (60 * 30 + user_info.lastMessage_date)) {
                    message_text += "_Dove chiedere un nuovo messaggio può voler dire perder quello precedente._\n\n";
                } else if (now_date < (60 + user_info.lastMessage_date)) {
                    message_text += "_Non serve cercare glitch._\n\n";
                } else { // altri casi di skip per trainer…
                    message_text += "_Dove nulla è e tutto è lecito._\n\n";
                }

            } else {
                if (now_date > (60 * 60 + user_info.lastMessage_date)) {
                    message_text += "_Dove lasciar passare il tempo può voler dire perdere un occasione._\n\n";
                } else if (now_date < (60 + user_info.lastMessage_date)) {
                    message_text += "_Meglio non perdere tempo…_\n\n";
                } else { // altri casi di skip per trainer…
                    message_text += "_selvaggio!_\n\n";
                }
            }

            if (now_date > (60 * 60 * 24 * 7 + user_info.lastMessage_date)) {
                message_text += "Hai creato il tuo mob molto, molto tempo fa…\nOra, se lo vuoi, è il tempo di cominciare occuparsi di " + user_info.mob_fullName + ".";
            } else if (now_date > (60 * 60 * 48 + user_info.lastMessage_date)) {
                message_text += "Hai creato il tuo mob qualche giorno fa, vuoi iniziare a prenderti cura di " + user_info.mob_fullName + "?";
            } else if (now_date < (60 * 5 + user_info.lastMessage_date)) {
                message_text += user_info.mob_fullName + " non vede l'ora di cominciare…";
            } else {
                message_text += "Hai creato il tuo mob, è giunto il momento di prendersene cura?";
            }

            let res = simpleMessage(user_info.telegram_id, message_text);
            res.options.reply_markup = {};
            res.options.reply_markup.inline_keyboard = [
                [
                    {
                        text: "Figurina 🎴",
                        callback_data: "LEGA:MAIN:1"
                    }
                ]
            ];

            return braveMessage_res(manageDeletion(user_info, res));

        });
    });

}

// BATTAGLIE
function manageBattle(t_message) {
    return new Promise(async (battle_res) => {
        let to_return = [{}];
        let loaded_b = await lega_model.loadBattlesFor(Math.abs(t_message.chat.id));
        if (loaded_b.current != false && loaded_b.current.mess_id < (t_message.message_id + 1)) {
            to_return.push({ toDelete: { chat_id: t_message.chat.id, mess_id: loaded_b.current.mess_id } });

            loaded_b.current.mess_id = t_message.message_id + 1;
            await lega_model.updateBattle(Math.abs(t_message.chat.id), loaded_b);
        }
        to_return[0].toSend = battle_Main_message(t_message, loaded_b);
        to_return[0].toSend.options.reply_markup.remove_keyboard = true;
        to_return[0].toDelete = { chat_id: t_message.chat.id, mess_id: t_message.message_id };
        return battle_res(to_return);

    });
}
module.exports.battle = manageBattle;

function battle_Main_message(t_message, loaded_b) {
    let buttons_array = [[{ text: "Chiudi ⨷", callback_data: 'LEGA:FORGET' }]];
    let message_text = "🏟 *Arena Argonauta*\n_…Botte pre-alpha in `" + t_message.chat.title + "`_\n\n";
    if (loaded_b.played == 0) {
        message_text += "• Nessuna battaglia pregressa\n";
    } else if (loaded_b.played == 1) {
        message_text += "• Una sola battaglia giocata\n";
    } else {
        message_text += "• " + loaded_b.played + " Battaglie giocate\n";
    }

    if (loaded_b.current == false) {
        buttons_array.unshift([{ text: "Avvia Sfida ⚔", callback_data: 'LEGA:B:NEW' }])
    } else {
        buttons_array.unshift([{ text: "Sfida Attuale ⚔", callback_data: 'LEGA:B:CURR' }])
    }


    return simpleMessage(t_message.chat.id, message_text, buttons_array);
}

function newBattle(battle_info, chat_id, user, t_query) {
    return new Promise(async (battle_res) => {
        let to_return = {
            query: { id: t_query.id, options: { text: "", cache_time: 2 } }
        }

        let tmp_mob = await lega_model.loadMob(user.id);
        console.log(tmp_mob);

        if (tmp_mob == false) {
            to_return.query.options.text = "🏟 Woops!\n\nPer poter giocare, manda il comando /arena \n\n(in chat privata)";
            to_return.query.options.show_alert = true;
        } else {
            battle_info.current = {
                c1: {
                    is_ready: false,
                    id: user.id,
                    nick: user.username,
                    mob: tmp_mob.infos,
                    actions: []
                },
                mess_id: t_query.message.message_id
            }

            let battle_update = await lega_model.updateBattle(chat_id, battle_info);
            if (battle_update == false) {
                to_return.query.options.text = "Woops!\nNon sono riuscito a creare la sfida!";
                to_return.query.options.show_alert = true;
            } else {
                to_return.query.options.text = "⚔\n\nSfida Lanciata!";
                to_return.query.options.show_alert = true;
                to_return.toEdit = waitingRoom_message(t_query.message, battle_info);
            }
        }
        return battle_res(to_return);

    });
}

function battleActions_manager(t_query, questions, raw_info) {
    return new Promise(function (battleAM_res) {
        // console.log("Query: ");
        // console.log(t_query);
        // console.log("\n\n");
        let chat_id = Math.abs(t_query.message.chat.id);
        let to_return = {
            query: { id: t_query.id, options: { text: "", cache_time: 2 } }
        }

        if (questions[2] == "A") {
            let moves_sound = ["Ciuf!", "Ciaf!", "Cauf!", "Paff!", "Ciac!"];
            to_return.query.options.text = moves_sound[intIn(0, moves_sound.length)];

            if (intIn(0, 100) < 25) {
                return battleAM_res(to_return);
            }
        }


        return lega_model.loadBattlesFor(chat_id).then(function (loaded_b) {
            if ((loaded_b.current == false && questions[2] != "NEW") || t_query.message.message_id < loaded_b.current.mess_id) {
                to_return.query.options.text = "Obsoleto!\n\nIl messaggio è fuori contesto...";
                to_return.query.options.show_alert = true;
                to_return.toDelete = { chat_id: t_query.message.chat.id, mess_id: t_query.message.message_id }
                return battleAM_res(to_return);
            } else if (questions[2] == "NEW") {
                if (loaded_b.current == false) {
                    return newBattle(loaded_b, chat_id, t_query.from, t_query).then((query_res) => {
                        return battleAM_res(query_res);
                    });
                } else {
                    to_return.query.options.text = "Woops!\nc'è una sfida in corso";
                    to_return.query.options.show_alert = true;
                    to_return.toEdit = waitingRoom_message(t_query.message, loaded_b);
                    return battleAM_res(to_return);
                }
            } else if (questions[2] == "CURR") {
                to_return.query.options.text = "Sfida in corso";
                if (typeof loaded_b.current.has_started != "undefined") {
                    let msg_options = { title: t_query.message.chat.title, keyboard: t_query.message.reply_markup.inline_keyboard, chat_id: t_query.message.chat.id, msg_id: t_query.message.message_id }
                    to_return.toEdit = battleRoom_message(msg_options, loaded_b, true);
                } else {
                    to_return.toEdit = waitingRoom_message(t_query.message, loaded_b);
                }

                return battleAM_res(to_return);
            } else if (questions[2] == "IS_READY") {
                return setReady(loaded_b, t_query.from.id, chat_id).then(function (set_res) {
                    if (set_res.esit == "IS_READY") {
                        to_return.query.options.text = t_query.from.username + " è Pronto!";
                        to_return.toEdit = waitingRoom_message(t_query.message, set_res.battle);
                    } else if (set_res.esit == "IS_OPEN") {
                        to_return.query.options.text = "🥊\n\nPrima registrati alla Sfida";
                        to_return.query.options.show_alert = true;
                    } else if (set_res.esit == "IS_UPDATED") {
                        to_return.query.options.text = "✅\n\nHai confermato la tua voglia di menarmani";
                        to_return.query.options.show_alert = true;
                    } else if (set_res.esit == "IS_ALREADY") {
                        to_return.query.options.text = "✅\n\nAspettiamo l'altro!";
                        to_return.query.options.show_alert = true;
                    } else if (set_res.esit == "IS_NOT") {
                        to_return.query.options.text = "✋\n\nQuesta sfida non ti riguarda";
                        to_return.query.options.show_alert = true;
                    } else {
                        to_return.query.options.text = "Woops!\n\nHo qualche problema 🤢";
                        to_return.query.options.show_alert = true;
                    }

                    return battleAM_res(to_return);
                });
            } else if (questions[2] == "LEAVE") {
                return leaveRoom_manager(t_query, loaded_b, t_query.from.id).then(function (query_res) {
                    return battleAM_res(query_res);
                });
            } else if (questions[2] == "CURR_MOB") {
                return lega_model.loadMob(raw_info.telegram_id).then(function (raw_mobInfo) {
                    return battleAM_res({
                        query: { id: t_query.id, options: { text: "Inviato in chat privata...", cache_time: 3 } },
                        toSend: private_chat_message(raw_mobInfo, raw_info, 1).message
                    });
                });
            } else if (questions[2] == "JOIN") {
                if (t_query.from.id == loaded_b.current.c1.id) {
                    if (loaded_b.current.c1.is_ready == false) {
                        to_return.query.options.text = "🦍\n\nDichiarati \"pronto\" per avviare la sfida contro un mob selvatico\n\n(✅)";
                        to_return.query.options.show_alert = true;

                        return battleAM_res(to_return);
                    } else {
                        return setIAMob(t_query, loaded_b, Math.abs(t_query.message.chat.id)).then(function (ia_battle_res) {
                            return battleAM_res(ia_battle_res);
                        });
                    }
                } else {
                    // join c2
                    let tmp_mob = new lega_mob.mob(true);
                    loaded_b.current.c2 = {
                        is_ready: false,
                        id: t_query.from.id,
                        nick: t_query.from.username,
                        mob: tmp_mob,
                        actions: []
                    }
                    return lega_model.updateBattle(chat_id, loaded_b).then(function (update_res) {
                        if (update_res == false) {
                            to_return.query.options.text = "Woops!\nNon sono riuscito a creare la sfida!";
                            to_return.query.options.show_alert = true;
                        } else {
                            to_return.query.options.text = "⚔\n\nSfida Accettata!";
                            to_return.query.options.show_alert = true;
                            to_return.toEdit = waitingRoom_message(t_query.message, loaded_b);
                        }
                        return battleAM_res(to_return);
                    });
                }
            } else if (questions[2] == "A") {
                return battle_action(t_query, loaded_b, questions[3]).then(function (action_res) {
                    return battleAM_res(action_res);
                });
            } else if (questions[2] == "RELOAD") {
                console.log("ID_MSG: " + t_query.message.message_id);
            } else {
                to_return.query.options.text = "Prossimamente…";
                return battleAM_res(to_return);
            }

        });
    });
}

function battle_action(t_query, curr_battle, action) {
    return new Promise(function (action_res) {
        let from_id = t_query.from.id;

        let to_return = {
            query: { id: t_query.id, options: { text: "", cache_time: 2 } }
        };
        let range = intIn(0, 45) + intIn(0, 45);
        let moves_sound = [];
        console.log(curr_battle.current.turn);
        let msg_options = { title: t_query.message.chat.title, keyboard: t_query.message.reply_markup.inline_keyboard, chat_id: t_query.message.chat.id, msg_id: t_query.message.message_id }

        if (curr_battle.current.turn == 0) {
            let nick = "";
            if (from_id == curr_battle.current.c1.id) {
                nick = curr_battle.current.c1.nick;
            } else if (from_id == curr_battle.current.c2.id) {
                nick = curr_battle.current.c2.nick;
            }

            if (nick.length > 0) {
                to_return.query.options.text = `È ${curr_battle.current.c1.nick} a lanciare la prima pietra!`;
                curr_battle.current.turn = 1;

                return lega_model.updateBattle(Math.abs(t_query.message.chat.id), curr_battle).then(function (update_res) {
                    if (!update_res) {
                        to_return.query.options.text = "Woops!";
                    } else {

                        to_return.toEdit = battleRoom_message(msg_options, curr_battle, false);
                        to_return.toEdit.mess_id = t_query.message.message_id;
                    }
                    return action_res(to_return);

                })
            } else {
                moves_sound = ["Coraggio!", "Forza!", "Cominciate", "Abbiamo pagato il biglietto!", "Eddaje!"];
                to_return.query.options.text = "🗣 \"" + moves_sound[intIn(0, moves_sound.length)] + "\"";

                return action_res(to_return);
            }
        } else {


            if (from_id != curr_battle.current.c1.id && from_id != curr_battle.current.c2.id) {
                if (action == "LEAVE") {
                    moves_sound = ["Molla!", "Stai a'arrancà!", "Fai Schifo!", "Booo!", "Che pena!"];
                } else {
                    moves_sound = ["Daje!", "Menaje!", "Picchia, picchia!", "Sul muso!", "Gancio, gancio!", "Più forte!", "Così!"];
                }
                to_return.query.options.text = "🗣 \"" + moves_sound[intIn(0, moves_sound.length)] + "\"";
                return action_res(to_return);
            } else if (t_query.message.message_id > curr_battle.current.mess_id) {
                curr_battle.current.mess_id = t_query.message.message_id;
            } else if (range % 2 == 0 && -1 != curr_battle.current.c2.id && -1 != curr_battle.current.c1.id) {
                moves_sound = ["Shh..", "Zaf!", "Quack!", "Grunk!"];
                to_return.query.options.text = moves_sound[intIn(0, moves_sound.length)];
                return action_res(to_return);
            }
            range += intIn(0, 10);

            moves_sound.push("Sdong!", "Sbum!", "Sbam!", "Sbem!", "Sbeng!", "Stonk!", "Crank!", "Sbadabim", "Woof!", "Deng!");
            to_return.query.options.text = moves_sound[intIn(4, moves_sound.length)];


            if (from_id == curr_battle.current.c1.id) {
                if (typeof curr_battle.current.c1.is_leaving != "undefined") {
                    delete curr_battle.current.c1.is_leaving;
                }
                if (range % 27 == 0) {
                    curr_battle.current.c1.actions = [];
                } else if (curr_battle.current.c1.actions.length < 6) {
                    if (range > 80) {
                        to_return.query.options.text += moves_sound[intIn(4, moves_sound.length)];
                    }
                    curr_battle.current.c1.actions.push({ type: action, strength: range });
                } else if (range % 3 == 0) {
                    curr_battle.current.c1.actions = [];
                } else {
                    if (range > 50) {
                        to_return.toEdit = battleRoom_message(msg_options, curr_battle, true);
                        to_return.toEdit.mess_id = t_query.message.message_id;
                    }
                    return action_res(to_return);
                }

                if (curr_battle.current.c1.actions.length > 5) {
                    if (intIn(0, 5) > 3) {
                        curr_battle.current.c1.actions = [];
                    } else {
                        curr_battle.current.c1.actions.splice(intIn(0, curr_battle.current.c1.actions.length - 2), 1);
                        curr_battle.current.c1.actions.splice(intIn(0, curr_battle.current.c1.actions.length - 2), 1);
                    }
                }

                if (curr_battle.current.c2.id == -1) {
                    if (curr_battle.current.c2.actions.length < 6) {
                        curr_battle.current.c2.actions.push(iaLiveMoove(action, t_query.message.reply_markup.inline_keyboard));
                    } else if (intIn(0, 5) > 3) {
                        curr_battle.current.c2.actions.slice(0, intIn(0, curr_battle.current.c2.actions.length - 1));
                    } else {
                        curr_battle.current.c2.actions.splice(intIn(0, curr_battle.current.c2.actions.length - 2), 1);
                    }
                }
            } else {
                if (typeof curr_battle.current.c2.is_leaving != "undefined") {
                    delete curr_battle.current.c2.is_leaving;
                }
                if (range < 30) {
                    if (range > 10) {
                        to_return.toEdit = battleRoom_message(msg_options, curr_battle, true);
                        to_return.toEdit.mess_id = t_query.message.message_id;
                    }
                    return action_res(to_return);
                } else if (curr_battle.current.c1.actions.length < 6) {
                    if (range > 80) {
                        to_return.query.options.text += moves_sound[intIn(4, moves_sound.length)];
                    }
                    curr_battle.current.c2.actions.push({ type: action, strength: range });
                } else if ((range + 1) % 2 == 0) {
                    curr_battle.current.c2.actions = [];
                } else {
                    return action_res(to_return);
                }

                if (curr_battle.current.c2.actions.length > 5) {
                    if (intIn(0, 5) > 3) {
                        curr_battle.current.c2.actions = [];
                    } else {
                        curr_battle.current.c2.actions.splice(intIn(0, curr_battle.current.c2.actions.length - 2), 1);
                        curr_battle.current.c2.actions.splice(intIn(0, curr_battle.current.c2.actions.length - 2), 1);

                    }
                }
                if (curr_battle.current.c1.id == -1) {
                    if (curr_battle.current.c1.actions.length < 6) {
                        curr_battle.current.c1.actions.push(iaLiveMoove(action, t_query.message.reply_markup.inline_keyboard));
                    } else if (intIn(0, 5) > 3) {
                        curr_battle.current.c1.actions.slice(0, intIn(0, curr_battle.current.c1.actions.length - 1));
                    } else {
                        curr_battle.current.c1.actions.splice(intIn(0, curr_battle.current.c1.actions.length - 2), 1);
                    }
                }
            }

            if (action == "ICE") {
                to_return.query.options.text = "Craaackzz…";
            } else if (action == "FIRE") {
                to_return.query.options.text = "Wfsbrsbrrr";
            } else if (action == "STRIKE") {
                to_return.query.options.text = "Sparlk!";
            } else if (action == "EAGLE") {
                to_return.query.options.text = "Eiiiiiiiii";
            } else if (action == "WOLF") {
                to_return.query.options.text = "Wfgrrrrr";
            } else if (action == "PRIMO") {
                to_return.query.options.text = "Auuuuaaaaah!";
            } else if (action == "INSULT") {
                moves_sound = ["Muori!", "Carogna!", "Grrr!", "Uh!", "T'ammazzo!", "Ti spezzo!", "Cane!", "Aarg!"];
                to_return.query.options.text = moves_sound[intIn(0, moves_sound.length)];

            }
        }


        return lega_model.updateBattle(Math.abs(t_query.message.chat.id), curr_battle).then(function (update_res) {
            if (!update_res) {
                to_return.query.options.text = "Woops!";
            } else if (range > 42) {
                to_return.toEdit = battleRoom_message(msg_options, curr_battle, true);
                to_return.toEdit.mess_id = t_query.message.message_id;
            } else {
                to_return.toEdit = battleRoom_message(msg_options, curr_battle, false);
                to_return.toEdit.mess_id = t_query.message.message_id;
            }
            return action_res(to_return);

        })

    });
}

function waitingRoom_message(t_message, curr_battle) { // 👊🖕🦶🧠🦴👁🔥❄️💥🦅🐺 
    let message_text = "🏟 *Arena Argonauta*\n_…Botte pre-alpha in `" + t_message.chat.title + "`_\n\n";
    let buttons_array = [[
        { text: "🐗", callback_data: 'LEGA:B:CURR_MOB' },
        { text: "✅", callback_data: 'LEGA:B:IS_READY' },
        { text: "🏳", callback_data: 'LEGA:B:LEAVE' },
    ]];
    //let now = Date.now();
    //let players_ready = { c1: false, c2: false };

    message_text += "• Per " + lega_names.getArticle(curr_battle.current.c1.mob).det + curr_battle.current.c1.mob.type_name + " *" + curr_battle.current.c1.mob.name + "* gioca:\n";


    message_text += " > ";
    if (curr_battle.current.c1.id != "-1") {
        message_text += "@";
    }
    message_text += curr_battle.current.c1.nick + " ";

    if (curr_battle.current.c1.is_ready == false) {
        message_text += "⏱\n";
    } else {
        message_text += "💪\n";
    }

    if (typeof curr_battle.current.c2 != "undefined") {
        message_text += "\n• Per " + lega_names.getArticle(curr_battle.current.c2.mob).det + curr_battle.current.c2.mob.type_name + " *" + curr_battle.current.c2.mob.name + "* gioca:\n";


        message_text += " > ";
        if (curr_battle.current.c2.id != "-1") {
            message_text += "@";
        }
        message_text += curr_battle.current.c2.nick + " ";
        if (curr_battle.current.c2.is_ready == false) {
            message_text += "⏱\n";
        } else {
            message_text += "💪\n";
        }

    } else {
        message_text += "\n• In attesa d'un avversario…";

        buttons_array[0].push({ text: "🥊", callback_data: 'LEGA:B:JOIN' });
    }

    let to_return = simpleMessage(t_message.chat.id, message_text, buttons_array);
    to_return.options.reply_markup.remove_keyboard = true;
    to_return.mess_id = t_message.message_id;

    return to_return;

}

function battleRoom_message(message_options, loaded_b, change_buttons) { // 👊🖕🦶🧠🦴👁🔥❄️💥🦅🐺 
    // {title: t_message.chat.title, keyboard: t_message.options.reply_markup.inline_keyboard, chat_id: t_message.chat.id, msg_id: t_message.message_id}
    let message_text = "🏟 *Arena Argonauta*\n";
    message_text += "_…Botte pre-alpha in `" + message_options.title + "`_\n\n";
    let buttons_array = [];
    if (change_buttons == true) {
        buttons_array = [[
            { text: "👊", callback_data: 'LEGA:B:A:PUNCH' }, // 
            { text: "👏", callback_data: 'LEGA:B:A:PARRY' },
            { text: "🖕", callback_data: 'LEGA:B:A:INSULT' },
        ]];
        let range = intIn(0, 11);
        console.log("> range: " + range);
        if (range < 3) {
            buttons_array[0][range] = ({ text: "🦶", callback_data: 'LEGA:B:A:KICK' });
            range = intIn(0, 11);
        } else if (range > 8) {
            buttons_array[0].push({ text: "🧠", callback_data: 'LEGA:B:A:THINK' });
        } else if (range > 5) {
            buttons_array[0].push({ text: "🦴", callback_data: 'LEGA:B:A:PRIMO' });
        } else {
            range = intIn(0, buttons_array.length);
            buttons_array[0][range] = ({ text: "👁", callback_data: 'LEGA:B:A:LOOK' });
        }
        range = range + intIn(0, 11);
        console.log("> range: " + range);
        if (range < 15) {
            if (range <= 1) {
                buttons_array[0].push({ text: "🦅", callback_data: 'LEGA:B:A:EAGLE' });
            } else if (range < 5) {
                buttons_array[0].push({ text: "🐺", callback_data: 'LEGA:B:A:WOLF' });
            }
        } else if (range > 18) {
            buttons_array[0].push({ text: "🔥", callback_data: 'LEGA:B:A:FIRE' });
        } else if (range > 16) {
            buttons_array[0].push({ text: "❄️", callback_data: 'LEGA:B:A:ICE' });
        } else {
            buttons_array[0].push({ text: "💥", callback_data: 'LEGA:B:A:STRIKE' });
        }

        shuffle(buttons_array[0]);

        buttons_array[0].push({ text: "🏳", callback_data: 'LEGA:B:LEAVE' });
    } else {
        buttons_array = message_options.keyboard;
    }

    let tmp_line = "";
    let full_line = "                       ";

    tmp_line = `${full_line} _${lega_names.getArticle(loaded_b.current.c1.mob, false).det}${loaded_b.current.c1.mob.type_name}_ _*${loaded_b.current.c1.mob.name}*_`;
    message_text += "" + tmp_line.slice(-30) + "\n";

    tmp_line = full_line + "contro   ";
    message_text += tmp_line.slice(-24) + "\n";

    tmp_line = `${full_line} _${lega_names.getArticle(loaded_b.current.c2.mob, false).det}${loaded_b.current.c2.mob.type_name}_ _*${loaded_b.current.c2.mob.name}*_`;
    message_text += "" + tmp_line.slice(-30) + "\n\n";

    if (loaded_b.current.turn == 0) {
        message_text += "\n_«I due si studiano silenziosamente, la battaglia sta per cominciare!»_"
    } else {
        message_text += `\n• ${loaded_b.current.turn}° round: «Ci si azzuffa!» 🌪\n\n`;
        let longest = Math.max(loaded_b.current.c1.mob.name.length, loaded_b.current.c2.mob.name.length);
        message_text += `• \`${loaded_b.current.c1.mob.name.padEnd(longest, " ")}\`: \`${print_currentMoves(loaded_b.current.c1.actions)}\`\n`;
        message_text += `• \`${loaded_b.current.c2.mob.name.padEnd(longest, " ")}\`: \`${print_currentMoves(loaded_b.current.c2.actions)}\`\n`;

    }

    let to_return = simpleMessage(message_options.chat_id, message_text, buttons_array);
    to_return.options.reply_markup.remove_keyboard = true;
    to_return.mess_id = message_options.msg_id;

    return to_return;

}

function print_currentMoves(moves_array) {
    if (typeof moves_array == "undefined") {
        return "-";
    }
    // allMoves: ["PUNCH", "PARRY", "KICK", "INSULT", "THINK", "LOOK", "PRIMO", "EAGLE", "WOLF", "FIRE", "ICE", "STRIKE"]
    let symbol_array = [];
    if (moves_array.length > 0) {
        for (let i = 0; i < moves_array.length; i++) {
            if (moves_array[i].type == "PUNCH" || moves_array[i].type == "KICK" || moves_array[i].type == "PRIMO") {
                symbol_array.push("△");
            } else if (moves_array[i].type == "PARRY" || moves_array[i].type == "THINK" || moves_array[i].type == "LOOK") {
                symbol_array.push("⦻");
            } else if (moves_array[i].type == "INSULT") {
                symbol_array.push("○");
            } else {
                symbol_array.push("↯");
            }
        }
    }
    return symbol_array.join(" ");
}

function battle_rutine(battle_info) {
    return new Promise(async (rutine_res) => {
        let this_battle_id = Math.abs(battle_info.chat_id);
        let loaded_b = await lega_model.loadBattlesFor(this_battle_id);
        let now_date = Date.now() / 1000;

        if (loaded_b.current == false) {
            return rutine_res(-1);
        } else if (typeof loaded_b.current.is_reading != "undefined" && (now_date - loaded_b.current.is_reading) > 28) {
            let msg_options = { title: battle_info.title, keyboard: [], chat_id: battle_info.chat_id, msg_id: loaded_b.current.mess_id }
            delete loaded_b.current.is_reading;
            loaded_b.current.c1.actions = [];
            loaded_b.current.c2.actions = [];
            loaded_b.current.turn++;

            await lega_model.updateBattle(this_battle_id, loaded_b);

            return rutine_res(battleRoom_message(msg_options, loaded_b, true));
        } else if (typeof loaded_b.current.has_started == "undefined") {
            return rutine_res(-1);
        } else {
            if ((now_date - loaded_b.current.has_started) < 30) {
                return rutine_res(0);
            } else if (loaded_b.current.turn > 5) {
                let message_text = "🏟 *Arena Argonauta*\n_…Botte pre-alpha in `" + battle_info.title + "`_\n\n";
                message_text += "Il combattimento s'è protratto troppo a lungo, i mob si ritirano...";
                let buttons_array = [[
                    { text: "⨷", callback_data: 'LEGA:FORGET' }
                ]];

                let to_return = simpleMessage(battle_info.chat_id, message_text, buttons_array);
                to_return.mess_id = Math.max(battle_info.msg_id, loaded_b.current.mess_id);

                loaded_b.current = false;

                await lega_model.updateBattle(this_battle_id, loaded_b);
                let all_battles = await lega_model.load_activeBattles();
                for (let i = 0; i < all_battles.length; i++) {
                    if (all_battles[i].chat_id == battle_info.chat_id) {
                        all_battles.splice(i, 1);
                        break;
                    }
                }
                await lega_model.update_activeBattles(all_battles);


                return rutine_res(to_return);

            } else {
                console.log("> Eseguo rutine per: " + battle_info.chat_id);
                console.log(battle_info);
                let message_text = "🏟 *Arena Argonauta*\n_…Botte pre-alpha in `" + battle_info.title + "`_\n\n";
                let tmp_line = "";
                let full_line = "                       ";

                tmp_line = `${full_line} _${lega_names.getArticle(loaded_b.current.c1.mob, false).det}${loaded_b.current.c1.mob.type_name}_ _*${loaded_b.current.c1.mob.name}*_`;
                message_text += "" + tmp_line.slice(-30) + "\n";

                tmp_line = full_line + "contro   ";
                message_text += tmp_line.slice(-24) + "\n";

                tmp_line = `${full_line} _${lega_names.getArticle(loaded_b.current.c2.mob, false).det}${loaded_b.current.c2.mob.type_name}_ _*${loaded_b.current.c2.mob.name}*_`;
                message_text += "" + tmp_line.slice(-30) + "\n\n";


                if (loaded_b.current.c1.actions.length == 0) {
                    loaded_b.current.c1.actions = iaMooves(loaded_b.current.c2.actions, loaded_b.current.c1.mob);
                } else if (loaded_b.current.c2.actions.length == 0) {
                    loaded_b.current.c2.actions = iaMooves(loaded_b.current.c1.actions, loaded_b.current.c2.mob);
                }


                let c1_initiative = Math.floor((loaded_b.current.c1.mob.destrezza + loaded_b.current.c1.mob.determinazione + loaded_b.current.c1.mob.intelligenza) / 3)
                c1_initiative = Math.floor((c1_initiative / loaded_b.current.c1.actions.length));

                let c2_initiative = Math.floor((loaded_b.current.c2.mob.destrezza + loaded_b.current.c2.mob.determinazione + loaded_b.current.c2.mob.intelligenza) / 3)
                c2_initiative = Math.floor((c2_initiative / loaded_b.current.c2.actions.length));

                let c1_actions = flattedActions(loaded_b.current.c1.actions);
                let c2_actions = flattedActions(loaded_b.current.c2.actions);

                let max_iterations = Math.min(c1_actions.length, c2_actions.length);

                for (let i = 0; i < max_iterations; i++) {
                    let tmp_c;
                    if (c1_initiative >= c2_initiative) {
                        tmp_c = cronaca(c1_actions[i], c2_actions[i], loaded_b.current.c1.mob, loaded_b.current.c2.mob);
                    } else {
                        tmp_c = cronaca(c2_actions[i], c1_actions[i], loaded_b.current.c2.mob, loaded_b.current.c1.mob);
                    }
                    if (tmp_c.text.length > 0) {
                        message_text += "• _" + tmp_c.text + "_\n";
                    } else {
                        message_text += "…\n";
                    }

                    if (tmp_c.esit == "end") {
                        break;
                    } else {
                        c1_initiative = Math.floor((loaded_b.current.c1.mob.destrezza + loaded_b.current.c1.mob.determinazione + loaded_b.current.c1.mob.intelligenza) / 3)
                        c1_initiative = Math.abs(Math.floor((c1_initiative / (loaded_b.current.c1.actions.length - i))));
                        c2_initiative = Math.floor((loaded_b.current.c2.mob.destrezza + loaded_b.current.c2.mob.determinazione + loaded_b.current.c2.mob.intelligenza) / 3)
                        c2_initiative = Math.abs(Math.floor((c2_initiative / (loaded_b.current.c2.actions.length - i))));
                    }
                }

                loaded_b.current.is_reading = Date.now() / 1000;
                await lega_model.updateBattle(this_battle_id, loaded_b);



                let buttons_array = [[{ text: "🏳", callback_data: "LEGA:B:LEAVE" }]];

                let to_return = simpleMessage(battle_info.chat_id, message_text, buttons_array);
                to_return.mess_id = Math.max(battle_info.msg_id, loaded_b.current.mess_id);

                return rutine_res(to_return);
            }
        }

    });
}
module.exports.battle_rutine = battle_rutine;

function iaLiveMoove(player_moove, curr_keyboard) {
    let keyboard = curr_keyboard[0].slice();
    keyboard.pop();
    let to_return = {
        type: "NONE",
        strength: intIn(30, 100)
    };
    let avaible_actions = [];
    for (let i = 0; i < curr_keyboard.length; i++) {
        console.log(keyboard);
        avaible_actions.push(keyboard[i].callback_data.split(":")[3]);
    }
    //     let randomMooves = ["PUNCH", "PARRY", "KICK", "INSULT", "THINK", "PRIMO", "EAGLE", "WOLF", "ICE", "STRIKE"];
    if (player_moove == "PUNCH" || player_moove == "KICK") {
        if (avaible_actions.indexOf("PARRY") && intIn(0, 10) > 4) {
            to_return.type = ("PARRY");
        } else if (avaible_actions.indexOf("INSULT")) {
            to_return.type = ("INSULT");
        } else {
            to_return.type = (avaible_actions[intIn(0, avaible_actions.length - 1)]);
        }
    } else if (player_moove == "PARRY" || player_moove == "THINK" || player_moove == "PRIMO") {
        if (avaible_actions.indexOf("INSULT") && intIn(0, 10) > 4) {
            to_return.type = ("INSULT");
        } else if (avaible_actions.indexOf("PUNCH")) {
            to_return.type = ("PUNCH");
        } else {
            to_return.type = (avaible_actions[intIn(0, avaible_actions.length - 1)]);
        }
    } else {
        if (avaible_actions.indexOf("PARRY") && intIn(0, 10) > 2) {
            to_return.type = ("PARRY");
        } else if (avaible_actions.indexOf("PUNCH")) {
            to_return.type = ("PUNCH");
        } else if (avaible_actions.indexOf("KICK")) {
            to_return.type = ("KICK");
        } else {
            to_return.type = (avaible_actions[intIn(0, avaible_actions.length - 1)]);
        }
    }
    return to_return;

}

function iaMooves(player_mooves, mob_infos) {
    let res = [];
    let randomMooves = ["PUNCH", "PARRY", "KICK", "INSULT", "THINK", "PRIMO", "EAGLE", "WOLF", "ICE", "STRIKE"];
    if (player_mooves.length <= 3) {
        let mooves_n = intIn(2, 7);
        for (let i = 0; i < mooves_n; i++) {
            res.push({ type: randomMooves[intIn(0, 5)], strength: intIn(30, 100) });
        }
    } else {
        while (res.length < 6) {
            let tmp_index = intIn(0, player_mooves.length);
            let tmp_s = Math.max(0, (player_mooves[tmp_index].strength - 10));
            tmp_s = intIn(tmp_s, 100) + intIn(0, 10);
            res.push({ type: player_mooves[tmp_index].type, strength: tmp_s });

        }
    }
    return res;

}

function flattedActions(actions, length) {
    console.log("actions");
    console.log(actions);

    let special_actions = ["EAGLE", "WOLF", "FIRE", "ICE", "STRIKE"];
    let res_actions = [];
    for (let i = 0; i < actions.length - 1; i++) {
        let tmp_times = 1;
        let increment = 0;
        let is_valid = false;

        if (special_actions.indexOf(actions[i].type) >= 0) {
            if (i > actions.length - 3) {
                if (actions[i].type == "EAGLE") {
                    if (i > 0 && actions[i - 1].type == "PUNCH" && actions[i - 2].type == "KICK") {
                        actions.splice(i - 2, 2);
                        is_valid = true;
                    } else {
                        res_actions.push({ type: actions[i].type, strength: -1, times: 0 });
                    }
                } else if (actions[i].type == "WOLF") {
                    if (i > 0 && actions[i - 1].type == "KICK" && actions[i - 2].type == "PUNCH") {
                        actions.splice(i - 2, 2);
                        is_valid = true;
                    } else {
                        res_actions.push({ type: actions[i].type, strength: -1, times: 0 });
                    }
                } else if (actions[i].type == "FIRE") {
                    if (i > 0 && actions[i - 1].type == "PUNCH" && actions[i - 2].type == "THINK") {
                        actions.splice(i - 2, 2);
                        is_valid = true;
                    } else {
                        res_actions.push({ type: actions[i].type, strength: -1, times: 0 });
                    }
                } else if (actions[i].type == "ICE") {
                    if (i > 0 && actions[i - 1].type == "KICK" && actions[i - 2].type == "THINK") {
                        actions.splice(i - 2, 2);
                        is_valid = true;
                    } else {
                        res_actions.push({ type: actions[i].type, strength: -1, times: 0 });
                    }
                } else if (actions[i].type == "STRIKE") {
                    if (i > 0 && actions[i - 1].type == "THINK" && actions[i - 2].type == "THINK") {
                        actions.splice(i - 2, 2);
                        is_valid = true;
                    } else {
                        res_actions.push({ type: actions[i].type, strength: -1, times: 0 });
                    }
                }

            } else {
                res_actions.push({ type: actions[i].type, strength: -2, times: 0 });
            }
        } else if (actions[i].type == actions[i + 1].type) { // combo
            tmp_times++;
            increment++;
            if ((i + 2) < actions.length && actions[i].type == actions[i + 2].type) {
                tmp_times++;
                increment++;
            }
            i += increment;

            is_valid = true;
        } else {
            is_valid = true;
        }
        if (is_valid) {
            res_actions.push({ type: actions[i].type, strength: actions[i].strength, times: tmp_times });
        }
    }

    console.log("res_actions");
    console.log(res_actions);
    return res_actions;


    actions.reduce(function (actions, moove) {
        var key = moove['type'];
        if (!actions[key]) {
            actions[key] = [];
        }
        if (intIn(0, 2) == 1) {
            actions[key].push(moove.strength);
        }
        return actions;
    }, {});
    return actions;
}

function cronaca(c1_action, c2_action, c1_mob, c2_mob) {
    let res_text = "";
    let tmp_esit = "continue";
    console.log("> " + c1_mob.name + ": " + c1_action);
    console.log("> " + c2_mob.name + ": " + c2_action);

    let offensive = ["PUNCH", "KICK", "PRIMO", "EAGLE", "WOLF", "FIRE", "ICE", "STRIKE"];
    let difensive = ["PARRY", "THINK", "LOOK"];

    // allMoves: ["PUNCH", "PARRY", "KICK", "INSULT", "THINK", "LOOK", "PRIMO", "EAGLE", "WOLF", "FIRE", "ICE", "STRIKE"]

    if ((c1_mob.forza + c1_mob.costituzione / 2) < 10 || c1_mob.forza <= 1) {
        if ((c2_mob.forza + c2_mob.costituzione / 2) < 10 || c2_mob.forza <= 1) {
            res_text += "Entrambi i combattenti sono esausti.";
            tmp_esit = "end";
        } else {
            res_text += "" + c1_mob.name + " è " + lega_names.gF(c1_mob.isMale, "esaust") + ".\n";
            res_text += cronaca(c2_action, c1_action, c2_mob, c1_mob).text;
        }
    } else if ((c2_mob.forza + c2_mob.costituzione / 2) < 10 || c2_mob.forza <= 1) {
        res_text += "" + c2_mob.name + " è esamine, ";
        if (c1_action.type == "INSULT") {
            let random_q = [
                lega_names.gF(c2_mob.isMale, "", ["lo", "la"]) + " guarda con disgusto",
                lega_names.gF(c2_mob.isMale, "", ["lo", "la"]) + " deride",
                "ringhia feroce",
                "urla «Alla vittoria!»",
                "ulua «Vittoria!»",
                "sghignazza " + lega_names.gF(c1_mob.isMale, "ebr"),
            ];
            res_text += c1_mob.name + " " + random_q[intIn(0, random_q.length)] + ".\n";
        } else if (c1_action.type != "THINK" && c1_action.type != "PARRY") {
            if (c1_action.type == "PRIMO") {
                res_text += c1_mob.name + " " + lega_names.gF(c2_mob.isMale, "", ["gli", "le"]) + " si avventa contro ";
                res_text += lega_names.gF(c2_mob.isMale, "finendol") + ".\n";
            } else if (c1_action.type == "FIRE" || c1_action.type == "ICE" || c1_action.type == "STRIKE") {
                res_text += lega_names.gF(c1_mob.isMale, "spietat") + " " + c1_mob.name + " ";
                res_text += lega_names.gF(c1_mob.isMale, "", ["gli", "le"]) + " lancia contro un incantesimo, ";
                if (c1_action.type == "ICE") {
                    res_text += lega_names.gF(c2_mob.isMale, "congelandol") + ".\n";
                } else {
                    res_text += lega_names.gF(c2_mob.isMale, "carbonizzandol") + ".\n";
                }
            } else {
                res_text += "è sufficente un rapido colpo per " + lega_names.gF(c2_mob.isMale, "finirl") + ".\n";
            }
        } else {
            res_text += "ma " + c1_mob.name + " resta " + lega_names.gF(c1_mob.isMale, "ferm") + ".\n";
        }
    } else if (typeof c1_action == "undefined") {
        res_text += cronaca(c2_action, c1_action, c2_mob, c1_mob).text;
    } else if (typeof c2_action == "undefined") {
        if (c1_action.type == "INSULT") {
            let random_q = [
                lega_names.gF(c2_mob.isMale, "", ["lo", "la"]) + " guarda con disgusto",
                lega_names.gF(c2_mob.isMale, "", ["lo", "la"]) + " deride",
                "ringhia feroce",
                "urla «Alla Vittoria!»",
                "ulua «Vittoria!»",
                "sghignazza " + lega_names.gF(c1_mob.isMale, "ebr"),
            ];
            res_text += c1_mob.name + " " + random_q[intIn(0, random_q.length)] + ".\n";
            if (intIn(10) > 7) {
                c2_mob.forza -= 5;
            }
        } else if (c1_action.type == "THINK") {
            res_text += "" + c1_mob.name + " studia l'" + lega_names.gF(c2_mob.isMale, "avversari");
            if (c1_action.strength > c2_mob.forza && intIn(10) > 4) {
                c1_mob.forza += 15;
                res_text += ", è " + lega_names.gF(c1_mob.isMale, "pront") + " a colpire!"
            }
        } else if (c1_action.type == "PUNCH" || c1_action.type == "KICK") {
            res_text += "" + c1_mob.name + " sfodera un attacco rapido e " + c2_mob.name + " resta inerme";
            if (c1_action.strength / 10 > 6) {
                res_text += ", barcollando";
            }
            c2_mob.costituzione -= Math.floor(c1_action.strength / 10);
        } else if (offensive.indexOf(c1_action.type) >= 0) {
            res_text += "" + c1_mob.name + " sfodera un attacco caricato all'inerme " + c2_mob.name + ".";
            c2_mob.costituzione -= Math.floor(c1_action.strength / 10);
        } else {
            res_text += "" + c1_mob.name + " osserva l'" + lega_names.gF(c2_mob.isMale, "avversari");
            if (c1_action.strength > c2_mob.forza && intIn(10) > 8) {
                c1_mob.destrezza += 10;
                res_text += ", notando un punto debole."

            }
        }
    } else if (c1_action.type == "PUNCH") {
        if (c2_action.type == "INSULT") {
            let random_q = [
                "guarda " + lega_names.gF(c2_mob.isMale, "l'altr") + " con disgusto",
                lega_names.gF(c2_mob.isMale, "", ["lo", "la"]) + " deride",
                "ringhia feroce",
                "urla " + lega_names.gF(c2_mob.isMale, "rabbios"),
                "ulua " + lega_names.gF(c2_mob.isMale, "indemoniat"),
                "sghignazza " + lega_names.gF(c1_mob.isMale, "ebr"),
            ];
            res_text += "Mentre " + c2_mob.name + " " + random_q[intIn(0, random_q.length)] + ", " + c1_mob.name + " ";
            res_text += lega_names.gF(c2_mob.isMale, "", ["lo", "la"]) + " colpisce in volto.\n";
            c2_mob.costituzione -= Math.floor((c1_action.strength - c2_action.strength / 2) / 10);
            c2_mob.resistenza -= Math.floor((c1_action.strength - c2_action.strength / 2) / 10);

        } else if (difensive.indexOf(c2_action.type) >= 0) {
            if ((c2_mob.destrezza + c2_mob.costituzione + c2_action.strength) > c1_action.strength) {
                res_text += "" + c1_mob.name + " sfodera un attacco rapido ma " + c2_mob.name + " para il colpo";
                if (c1_action.strength / 20 > 6) {
                    res_text += ", barcollando...";
                }
                res_text += ".\n";
                if (c2_action.type == "THINK") {
                    c2_mob.costituzione -= Math.floor(c1_action.strength / 20);
                } else {
                    c2_mob.costituzione -= Math.floor(c1_action.strength / 20) + 1;
                    c2_mob.forza += Math.floor(c1_action.strength / 20);
                    c2_mob.destrezza += 2;
                }
            } else {
                res_text += "" + c1_mob.name + " attacca, " + c2_mob.name + " tenta di parare il colpo ";
                if (c1_mob.destrezza >= c2_mob.destrezza) {
                    res_text += "ma è troppo " + lega_names.gF(c1_mob.isMale, "lent") + ".\n";
                    c2_mob.costituzione -= Math.floor((c1_action.strength - c2_action.strength / 2) / 10);
                    c2_mob.forza -= Math.floor((c1_action.strength - c2_mob.resistenza) / 10);

                } else if (c1_mob.forza >= c2_mob.resistenza) {
                    res_text += "ma la sua è una difesa troppo debole.\n";
                    c2_mob.resistenza -= Math.floor((c1_action.strength - c2_action.strength / 2) / 10);
                    c2_mob.forza -= Math.floor((c1_action.strength - c2_mob.resistenza) / 15);
                }

            }
        } else if (c2_action.type == "KICK") {
            if ((c1_mob.forza + c1_mob.destrezza) >= (c2_mob.forza + c2_mob.destrezza)) {
                res_text += "" + c2_mob.name + " tenta di colpire con una mossa acrobatica, ma ";
                res_text += c1_mob.name + " " + lega_names.gF(c2_mob.isMale, "l") + " scaraventa a terra con una contromossa.\n";
                c2_mob.destrezza -= Math.floor(c1_action.strength / 10);
                c2_mob.resistenza -= Math.floor((c1_action.strength - c2_mob.resistenza / 2) / 10);
            } else {
                res_text += c1_mob.name + " carica l'" + lega_names.gF(c2_mob.isMale, "avversari");
                res_text += ", ma " + lega_names.gF(c2_mob.isMale, "quell") + " " + lega_names.gF(c1_mob.isMale, "l") + " colpisce con una contromossa acrobatica.\n"

                c1_mob.forza -= Math.floor(c1_action.strength / 10);
                c1_mob.resistenza -= Math.floor((c1_action.strength - c2_mob.resistenza / 2) / 12);
            }
        } else {
            res_text += "fuf...";
        }
    } else if (c1_action.type == "KICK") {
        if (c2_action.type == "INSULT") {
            let random_q = [
                "osserva " + lega_names.gF(c1_mob.isMale, "l'altr") + " " + lega_names.gF(c2_mob.isMale, "allibit"),
                "tenta di sbeffeggiar" + lega_names.gF(c2_mob.isMale, "l"),
                "ringhia feroce",
                "urla " + lega_names.gF(c2_mob.isMale, "rabbios"),
                "ulua " + lega_names.gF(c2_mob.isMale, "indemoniat"),
                "sghignazza " + lega_names.gF(c1_mob.isMale, "ebr"),
            ];
            res_text += "Mentre " + c2_mob.name + " " + random_q[intIn(0, random_q.length)] + ", " + c1_mob.name + " ";
            res_text += lega_names.gF(c2_mob.isMale, "l") + " colpisce";

            if (intIn(0, 2) == 1) {
                res_text += " in viso ";
                c2_mob.costituzione -= Math.floor((c1_action.strength - c2_action.strength / 2) / 8);
                c2_mob.resistenza -= Math.floor((c1_action.strength - c2_action.strength / 2) / 10);
            } else {
                res_text += " alle gambe ";

                c2_mob.costituzione -= Math.floor((c1_action.strength - c2_action.strength / 2) / 10);
                c2_mob.resistenza -= Math.floor((c1_action.strength - c2_action.strength / 2) / 12);
            }
            res_text += "con un colpo rapido";
        } else if (difensive.indexOf(c2_action.type) >= 0) {
            if ((c2_mob.destrezza + c2_mob.costituzione + c2_action.strength) > c1_action.strength) {
                res_text += "" + c1_mob.name + " sfodera un attacco rapido ma " + c2_mob.name + " para il colpo";
                if (c1_action.strength / 20 > 6) {
                    res_text += ", barcollando";
                    if (c2_action.type == "THINK") {
                        c2_mob.costituzione -= 10;
                    } else {
                        c2_mob.forza -= 10;
                    }
                }
                res_text += ".\n";

            } else {
                res_text += "" + c1_mob.name + " attacca " + lega_names.gF(c2_mob.isMale, "fulmine") + ", " + c2_mob.name + " tenta una parata ";
                if (c1_mob.destrezza >= c2_mob.destrezza) {
                    res_text += "ma è troppo " + lega_names.gF(c1_mob.isMale, "lent") + ".\n";
                    c2_mob.costituzione -= Math.floor((c1_action.strength - c2_action.strength / 2) / 10);
                    c2_mob.forza -= Math.floor((c1_action.strength - c2_mob.resistenza) / 10);

                } else if (c1_mob.forza >= c2_mob.resistenza) {
                    res_text += "ma il colpo è micidiale.\n";
                    c2_mob.resistenza -= Math.floor((c1_action.strength - c2_action.strength / 2) / 10);
                    c2_mob.forza -= Math.floor((c1_action.strength - c2_mob.resistenza) / 15);
                }

            }
        } else if (c2_action.type == "KICK") {
            res_text += "I due si lanciano l'" + lega_names.gF(c2_mob.isMale, "un") + " contro l'" + lega_names.gF(c2_mob.isMale, "altr");

            if ((c2_mob.forza + c2_mob.destrezza) >= (c1_mob.forza + c1_mob.destrezza)) {
                res_text += " e " + c1_mob.name + " viene " + lega_names.gF(c1_mob.isMale, "scaraventat") + " a terra.\n";
                c1_mob.destrezza -= Math.floor(c1_action.strength / 10);
                c1_mob.resistenza -= Math.floor((c1_action.strength - c1_mob.resistenza / 2) / 10);
                c1_mob.costituzione -= 10;
                c2_mob.destrezza += 5;
            } else {
                res_text += " ma " + c2_mob.name + " è nettamente in ritardo: cade a terra " + lega_names.gF(c2_mob.isMale, "ferit") + ".\n";
                c2_mob.destrezza -= Math.floor(c1_action.strength / 10);
                c2_mob.resistenza -= Math.floor((c1_action.strength - c2_mob.resistenza / 2) / 10);
                c2_mob.costituzione -= 15;
                c1_mob.destrezza += 6;
            }
        } else {
            res_text + "faf...";
        }
    } else if (c1_action.type == "PARRY") {
        if (offensive.indexOf(c2_action.type) >= 0) {
            if ((c1_mob.forza + c1_mob.costituzione) >= (c2_mob.forza + c2_action.strength)) {
                res_text += c1_mob.name + " para facilmente il" + (c2_action.strength > 50 ? " debole" : "") + " colpo dell'" + lega_names.gF(c2_mob.isMale, "avversari") + ".\n";
                c2_mob.forza -= (((c1_mob.forza + c1_mob.costituzione) - c2_action.strength) / 10);
            } else {
                res_text += "È vana la difesa di " + c1_mob.name + ", " + c2_mob.name + " " + lega_names.gF(c1_mob.isMale, "l") + " colpisce"; //".\n";
                if (c2_action.type == "KICK") {
                    res_text += " con un attacco acrobatico.\n";
                } else {
                    res_text += " con un attacco rapido.\n";
                }
            }

        }

    } else if (c1_action.type == "INSULT") {

    } else {
        if (c1_action.type == "THINK") {

        } else if (c1_action.type == "LOOK") {

        } else if (c1_action.type == "PRIMO") {

        } else if (c1_action.type == "EAGLE") {

        } else if (c1_action.type == "FIRE") {

        } else if (c1_action.type == "ICE") {

        } else if (c1_action.type == "STRIKE") {

        }
    }

    return { text: res_text, esit: tmp_esit };
}

// MOB

function private_chat_message(mob_infos, user, page_n) {
    let buttons_array = [];
    let message_text;
    let q_text = "";

    if (page_n == 0) { // MAIN info_page
        q_text = "Bugiardino";
        message_text = `🏟 *Arena Argonauta*\n_${q_text}_\n\n`;
        message_text += "```";
        message_text += " .----------------.\n| .--------------. |\n";
        message_text += "| |    ______    | |\n| |   / ____ \\`.  | |\n";
        message_text += "| |  |_/    | |  | |\n| |     ____| |  | |\n| |    /  ___.'  | |\n";
        message_text += "| |    |_|       | |\n| |     _        | |\n| |    (_)       | |\n";
        message_text += "| |              | |\n| ·--------------· |\n ·----------------· \n```";


        message_text += "L'Arena è in _costruzione_";



        buttons_array.push(
            [{ text: `🎴`, callback_data: 'LEGA:MAIN:1' }, //
            { text: `🐗`, callback_data: 'LEGA:MAIN:2' }, // 
            { text: `⚔️`, callback_data: 'LEGA:MAIN:3' },
            { text: `🤖`, callback_data: 'LEGA:MAIN:4' },
            { text: "⨷", callback_data: 'LEGA:FORGET' }]
        );
    } else {
        buttons_array.push([
            { text: "?🏟?", callback_data: 'LEGA:MAIN:0' },
            { text: "⨷", callback_data: 'LEGA:FORGET' }
        ]);

        if (page_n == 1) { // figurina info_page
            console.log(mob_infos);
            let this_mob = new lega_mob.mob(false, mob_infos.infos);
            q_text = mob_infos.infos.name;

            message_text = `🎴 *${q_text}*,\n_ …${lega_names.getArticle(mob_infos.infos, false).indet}${mob_infos.infos.type_name}_\n\n`;

            message_text += "• `🜂\t" + displayStats(proportionalStat(mob_infos, "ALTO"), 300) + "`\n";
            message_text += "• `⟁\t" + displayStats(Math.floor(mob_infos.infos.affiatamento * 10), 100) + "`\n";
            message_text += "• `🜃\t" + displayStats(proportionalStat(mob_infos, "CENTRALE"), 300) + "`\n";
            message_text += "• `🜄\t" + displayStats(Math.floor(proportionalStat(mob_infos, "BASSO") / 2), 125) + "`\n";

            let enlapsed_days = Math.floor((Date.now() - mob_infos.stats.nascita) / (1000 * 60 * 60 * 60));
            message_text += `\nIn vita da: ${enlapsed_days == 0 ? `_oggi_` : `*${enlapsed_days}g*`}\n\n`;
            if (mob_infos.stats.vinte + mob_infos.stats.perse == 0) {
                message_text += "• Non ha affrontato ancora la sua prima battaglia\n\n";
            } else {
                message_text += `• Vittorie: ${mob_infos.stats.vinte}\n`;
                message_text += `• Sconfitte: ${mob_infos.stats.perse}\n`;
            }

            message_text += this_mob.describe(enlapsed_days);


        } else if (page_n == 2) { // Mob info_page
            q_text = "Il Mob";
            message_text = `🐗 *Arena Argonauta*\n_${q_text}_\n\n`;
        } else if (page_n == 3) { // ARENA info_page
           

            q_text = "Le Battaglie";
            message_text = `⚔️ *Arena Argonauta*\n_${q_text}_\n\n`;

            let ascii_text = "```";
            ascii_text += "   _   |~  _\n";
            ascii_text += "  [_]--'--[_]\n";
            ascii_text += "  |'|-----|'|\n";
            ascii_text += "  | | .^. | |\n";
            ascii_text += "  |_|_|I|_|_|\n";
            ascii_text += "```";
            ascii_text.split("_").join("\\_");

            message_text += ascii_text;

        } else if (page_n == 4) { // ARENA info_page
            q_text = "Sullo Sviluppo...";
            message_text = `🤖 *Arena Argonauta*\n_${q_text}_\n\n`;

            let ascii_text = "```";
            ascii_text += "     _____\n";
            ascii_text += "    ||'''||\n";
            ascii_text += "    ||___||\n";
            ascii_text += "    [ -=. ]\n";
            ascii_text += "    =======\n";
            ascii_text += "```";
            ascii_text.split("_").join("\\_");

            message_text += ascii_text;
        }

    }

    //message_text += `• È il tuo primo mob\n`;


    return { message: simpleMessage(user.telegram_id, message_text, buttons_array), query_text: q_text };
}

function proportionalStat(mob_infos, type) {
    if (type == "ALTO") {
        return mob_infos.infos.determinazione + mob_infos.infos.intelligenza + mob_infos.infos.fede;
    } else if (type == "CENTRALE") {
        return mob_infos.infos.forza + mob_infos.infos.destrezza + mob_infos.infos.resistenza;
    } else if (type == "BASSO") {
        return mob_infos.infos.costituzione + mob_infos.infos.forza / 2 + mob_infos.infos.temperamento;
    }
}

function displayStats(cur_val, max_val) {
    console.log(`• ${cur_val} ${max_val}`)
    let to_return = "";
    let index = Math.floor(max_val / 5);

    for (let i = 0; i < Math.floor(cur_val / index); i++) {
        to_return += "█";//"■";
    }

    let resto = max_val / index - Math.floor(cur_val / index);
    if (cur_val % index > index / 2) {
        resto--;
        to_return += "▌";//"◧";
    }

    for (let i = 0; i < resto; i++) {
        to_return += " ";//"□";
    }


    return to_return;
}


function leaveRoom_manager(t_query, curr_battle, player_id) {
    return new Promise(async (leaveRoom_manager) => {
        let to_return = {
            query: { id: t_query.id, options: { text: "", cache_time: 2 } }
        };
        let has_left = false;
        let is_not_ready = false;

        if (curr_battle.current == false) {
            to_return.query.options.text = "🥀\n\nSfida Sparita";
            to_return.query.options.show_alert = true;
            to_return.toEdit = battle_Main_message(t_query.message, curr_battle);
            to_return.toEdit.mess_id = t_query.message.message_id;

            let all_battles = await lega_model.load_activeBattles();
            for (let i = 0; i < all_battles.length; i++) {
                if (all_battles[i].chat_id == t_query.message.chat.id) {
                    all_battles.splice(i, 1);
                    console.log(await lega_model.update_activeBattles(all_battles));
                    break;
                }
            }
            return leaveRoom_manager(to_return);

        } else if (curr_battle.current.c1.id == player_id) {
            if (curr_battle.current.c1.is_leaving == true) {
                if (typeof curr_battle.current.c2 != "undefined" && curr_battle.current.c2.id != -1) {
                    curr_battle.current.c1 = curr_battle.current.c2;
                    delete curr_battle.current.c2;
                } else {
                    curr_battle.current = false;
                }
                has_left = true;
            } else {
                if (curr_battle.current.c1.is_ready != false && typeof curr_battle.current.has_started == "undefined") {
                    curr_battle.current.c1.is_ready = false;
                    is_not_ready = true;
                } else {
                    curr_battle.current.c1.is_leaving = true;
                }
            }

        } else if (typeof curr_battle.current.c2 != "undefined" && curr_battle.current.c2.id == player_id) {
            if (curr_battle.current.c2.is_leaving == true) {
                if (typeof curr_battle.current.c1 != "undefined" && curr_battle.current.c1.id != -1) {
                    delete curr_battle.current.c2;
                } else {
                    curr_battle.current = false;
                }
                has_left = true;
            } else {
                if (curr_battle.current.c2.is_ready != false && typeof curr_battle.current.has_started == "undefined") {
                    is_not_ready = true;
                    curr_battle.current.c2.is_ready = false;
                } else {
                    curr_battle.current.c2.is_leaving = true;
                }
            }
        } else {
            to_return.query.options.text = "✋\n\nQuesta sfida non ti riguarda";
            to_return.query.options.show_alert = true;
            return leaveRoom_manager(to_return);
        }

        return lega_model.updateBattle(Math.abs(t_query.message.chat.id), curr_battle).then(async function (update_res) {
            if (update_res == false) {
                to_return.query.options.text = "🤢 Woops!\n\nHo qualche problema…";
                to_return.query.options.show_alert = true;
            } else {
                if (curr_battle.current == false) {
                    to_return.query.options.text = "🦆\n\nSfida Annullata.";
                    to_return.query.options.show_alert = true;
                    to_return.toEdit = battle_Main_message(t_query.message, curr_battle);
                    to_return.toEdit.mess_id = t_query.message.message_id;

                    let all_battles = await lega_model.load_activeBattles();
                    for (let i = 0; i < all_battles.length; i++) {
                        if (all_battles[i].chat_id == t_query.message.chat.id) {
                            all_battles.splice(i, 1);
                            break;
                        }
                    }
                    await lega_model.update_activeBattles(all_battles);

                } else if (has_left) {
                    to_return.query.options.text = "🐁\n\nHai Abdicato!";
                    to_return.query.options.show_alert = true;
                    to_return.toEdit = waitingRoom_message(t_query.message, curr_battle);
                } else if (is_not_ready) {
                    to_return.query.options.text = "🐜\n\nDisponibilità rimossa!";
                    to_return.query.options.show_alert = true;
                    to_return.toEdit = waitingRoom_message(t_query.message, curr_battle);
                } else {
                    to_return.query.options.text = "🐇\n\nPremi ancora per abbandonare la sfida…";
                    // to_return.query.options.cache_time = 5;
                }
            }
            return leaveRoom_manager(to_return);

        });
    });


}

function setReady(curr_battle, player_id, chat_id) {
    return new Promise(function (is_ready) {
        let now = Date.now() / 1000;
        let to_return = { esit: "IS_READY" };

        if (curr_battle.current == false) {
            to_return.esit = "ERR";
            return is_ready(to_return);
        } else if (curr_battle.current.c1.id == player_id) {
            if (curr_battle.current.c1.is_ready != false) {
                if ((now - curr_battle.current.c1.is_ready < 30)) {
                    to_return.esit = "IS_ALREADY";
                    return is_ready(to_return);
                } else {
                    to_return.esit = "IS_UPDATED";

                }
            }
            if (typeof curr_battle.current.c1.is_leaving != "undefined") {
                delete curr_battle.current.c1.is_leaving;
            }
            curr_battle.current.c1.is_ready = now;
        } else if (typeof curr_battle.current.c2 == "undefined") {
            to_return.esit = "IS_OPEN";
            return is_ready(to_return);
        } else if (curr_battle.current.c2.id == player_id) {
            curr_battle.current.c2.is_ready = now;

            if ((now - curr_battle.current.c2.is_ready < 30)) {
                to_return.esit = "IS_ALREADY";
                return is_ready(to_return);
            } else {
                to_return.esit = "IS_UPDATED";
            }

            if (typeof curr_battle.current.c2.is_leaving != "undefined") {
                delete curr_battle.current.c2.is_leaving;
            }
        } else {
            to_return.esit = "IS_NOT";
            return is_ready(to_return);
        }

        return lega_model.updateBattle(chat_id, curr_battle).then(function (update_res) {
            if (!update_res) {
                to_return.esit = "ERR";
            } else {
                to_return.battle = curr_battle;
            }
            return is_ready(to_return);

        })

    });
}

function setIAMob(t_query, curr_battle, chat_id) {
    return new Promise(function (set_esit) {
        let to_return = {
            query: { id: t_query.id, options: { text: "", cache_time: 2 } }
        };

        let ia_mob = new lega_mob.mob(true);
        let ia_names = ["Ascalafo", "Asterio", "Bute", "Ceneo", "Eracle", "Eufemo", "Idas", "Idmone", "Laerte", "Orfeo", "Peleo", "Polifemo", "Zete", "Giasone"]
        curr_battle.current.c2 = {
            is_ready: true,
            id: -1,
            nick: ia_names[intIn(0, ia_names.length)],
            mob: ia_mob,
            actions: []
        };

        curr_battle.current.has_started = Date.now() / 1000;
        curr_battle.current.turn = 0;
        curr_battle.current.mess_id = t_query.message.message_id;
        let msg_options = {
            title: t_query.message.chat.title,
            keyboard: t_query.message.reply_markup.inline_keyboard,
            chat_id: t_query.message.chat.id,
            msg_id: t_query.message.message_id,
            turn: 0
        }

        to_return.toEdit = battleRoom_message(msg_options, curr_battle, true);


        return lega_model.addActiveBattle(msg_options).then(function (all_battles) {

            return lega_model.updateBattle(chat_id, curr_battle).then(function (update_res) {
                if (update_res == false) {
                    to_return.query.options.text = "Woops!\nNon sono riuscito a creare la sfida con il mob!";
                    to_return.query.options.show_alert = true;
                } else {
                    to_return.query.options.text = "⚔\n\nSfida d'allenamento\nLanciata!";
                    to_return.query.options.show_alert = true;
                }
                to_return.startBattle = msg_options;
                return set_esit(to_return);
            });
        });
    });
}

async function updateAllBattle(updated_battle) {
    const update_Battle = await lega_model.update_activeBattles(updated_battle);
    return (update_Battle);
}
module.exports.updateAllBattle = updateAllBattle;


function getAllBattles() {
    return new Promise(async (all_battles) => {
        let battles = await lega_model.load_activeBattles();
        console.log(battles);
        return all_battles(battles);
    });
}
module.exports.getAllBattles = getAllBattles;


// ACCESSORIO

function myLog(thing) {
    if (true) {
        console.log(thing);
    }
}

function intIn(min, max) {

    if (typeof max == "undefined") {
        max = min;
        min = 0;
    } else {
        min = Math.ceil(min);
        max = Math.floor(max);
    }
    return Math.floor(Math.random() * (max - min)) + min; //max è escluso, min incluso
}

function shuffle(array) {
    let i, j, x;
    for (i = array.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = array[i];
        array[i] = array[j];
        array[j] = x;

    }
    return array;
}

function manageDeletion(user_info, res) {
    let to_return;
    if (!user_info.isQuery) {
        to_return = [];
        to_return.push({ toSend: res });

        if (user_info.lastMessage_id > 0) {
            myLog("> chiedo di eliminare: " + user_info.lastMessage_id);
            to_return.push({ toDelete: { chat_id: user_info.telegram_id, mess_id: user_info.lastMessage_id } });
            //to_return.push({ toDelete: { chat_id: user_info.telegram_id, mess_id: user_info.curr_msgId } });
        }
    } else {
        to_return = res;
    }
    return to_return;
}

function simpleMessage(id, text, buttons_array) {
    /*
    reply_markup: {
                inline_keyboard: [[{
                    text: "Ok",
                    callback_data: 'SUGGESTION:FORGET'
                }]]
            }
    */

    let parsed_text = text.split("!").join("\\!").split("-").join("\\-");
    parsed_text = parsed_text.split(".").join("\\.");
    parsed_text = parsed_text.split(">").join("\\>");
    parsed_text = parsed_text.split("(").join("\\(");
    parsed_text = parsed_text.split(")").join("\\)");
    parsed_text = parsed_text.split("]").join("\\]"); // |
    parsed_text = parsed_text.split("|").join("\\|"); // |


    let simple_msg = {
        chat_id: id,
        message_text: parsed_text,
        options: {
            parse_mode: "MarkdownV2",
            disable_web_page_preview: true
        }
    };
    if (typeof buttons_array != "undefined") {
        simple_msg.options.reply_markup = {
            inline_keyboard: buttons_array
        }
    }
    return simple_msg;

}


// (: