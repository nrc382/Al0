const lega_model = require('./LegaModel');
const lega_names = require('./LegaNames');
const lega_mob = require('./LegaMob');

function myLog(thing) {
    if (true) {
        console.log(thing);
    }
}

function menageMessage(t_message) {
    //myLog(t_message);
    return new Promise(function (mess_res) {
        if (t_message.from.isBot) {
            return mess_res([]);
        } else if (t_message.text.match("genera")) {
            return register_MessageManager(t_message.from, ["", "", "1"]).then(function (res_mess) {
                return mess_res({ toSend: res_mess });
            });
        }
        //myLog("> Prossimo msg_id: " + (t_message.message_id + 1));

        return lega_model.getUser(t_message.from.id).then(function (raw_info) {
            // myLog("> MS_IDs:\n");
            // myLog("> Attuale: " + t_message.message_id + ", prossimo: " + (t_message.message_id + 1));
            // myLog("> Vecchio: " + raw_info.lastMessage_id);

            if (raw_info.found == -1) { //Errore
                myLog("Problemi contattando il db...");
                res.toSend = simpleMessage(t_message.from.id, "⧱ *Desolato...*\n\nAl momento ho problemi a comunicare con il database. Ogni funzionalità è interrotta.")
                return mess_res(res);
            } else if (raw_info.found == 0) { // Nuovissimo Utente (proprio il primo messaggio)
                raw_info.lastMessage_date = Math.floor(Date.now() / 1000);
                raw_info.lastMessage_id = 0;
                return lega_model.updateUser([raw_info.telegram_id, (t_message.message_id + 1), raw_info.lastMessage_date]).then(function (insert_esit) {
                    raw_info.curr_msgId = t_message.message_id;
                    return mess_res(newUser_MessageMenager(raw_info, "page1"));
                });
            } else { // Utente Registrato
                return lega_model.updateUser([raw_info.telegram_id, (t_message.message_id + 1), (Date.now() / 1000)]).then(function (insert_esit) {
                    myLog("> Utente Registrato...");
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
                        return mess_res({ toSend: simpleMessage(raw_info.telegram_id, "Ciao, _nuovo utente registrato_!\nIl tuo mob si chiama: boh!") });
                    }
                });

            }
        });
    });
}
module.exports.menage = menageMessage;

function menageQuery(t_query) {
    return new Promise(function (query_res) {
        return lega_model.getUser(t_query.from.id).then(function (raw_info) {
            let question = t_query.data.split(":");
            if (t_query.message.message_id < raw_info.lastMessage_id){
                return query_res({
                    query: { id: t_query.id, options: { text: "Obsoleto!\n\nIl messaggio è fuori contesto", cache_time: 2, show_allert: true } },
                    toDelete: { chat_id: raw_info.telegram_id, mess_id: t_query.message.message_id }
                });
            } else if (!checkInvalidQuery(question[1], raw_info)) {
                return query_res({
                    query: { id: t_query.id, options: { text: "Obsoleto!\n\nIl messaggio è fuori contesto", cache_time: 2, show_allert: true } },
                    toDelete: { chat_id: raw_info.telegram_id, mess_id: t_query.message.message_id }
                });
            } else {
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
                                message_txt: res_msg.message_txt,
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
                                        message_txt: reg_esit.message_txt,
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
                                    message_txt: res_msg.message_txt,
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
                            text_message += "_Tra queste ci sono ad esempio l'agilita, la forza e la resitenza...\n_";
                            text_message += "_Ma anche l'intelligenza creativa e l'attitudine, o fede, nelle arti metafisiche e alchemiche»_\n";

                            text_message += "\nI maesti Argonauti sono abili stimatori capaci, ognuno nel suo campo, di individuare a colpo d'occhio punti di forza e debolezze di ogni _mob_ esistente.\n";
                            text_message += "Dovresti approfittare di quest'occasione: non si ripresenterà!";

                            return query_res({
                                query: { id: t_query.id, options: { text: "Coraggioso nuovo mondo...", cache_time: 3 } },
                                toEdit: {
                                    message_txt: text_message,
                                    chat_id: t_query.message.chat.id,
                                    mess_id: t_query.message.message_id,
                                    options: {
                                        parse_mode: "Markdown",
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
                                let res_msg = newWorld_message(1, raw_mobInfo, raw_info, true);
                                return query_res({
                                    query: { id: t_query.id, options: { text: "A brave world...", cache_time: 3 } },
                                    toEdit: {
                                        message_txt: res_msg.message_txt,
                                        chat_id: t_query.message.chat.id,
                                        mess_id: t_query.message.message_id,
                                        options: res_msg.options
                                    }
                                });

                            });
                        } else { // Messaggio verso un Maestro
                            return mastersMessage(raw_info, [question[3], question[4]], question[2]).then(function (master_res) {
                                let query_textArray = ["Il valore si misura sul campo...", "La conoscenza è potere...", "La magia è ovunque..."];
                                return query_res({
                                    query: { id: t_query.id, options: { text: query_textArray[parseInt(question[2]) - 1], cache_time: 3 } },
                                    toEdit: {
                                        message_txt: master_res.message_txt,
                                        chat_id: t_query.message.chat.id,
                                        mess_id: t_query.message.message_id,
                                        options: master_res.options
                                    }
                                });
                            });
                        }
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
    let message_txt = "🎴*Arena Argonauta*\n";
    let proto2;
    if (page == "page1" || page == "page3") {
        let now_date = new Date(Date.now());
        if (Math.floor(Date.now() / 1000) > (user_info.lastMessage_date + (60 * 60 * 12))) {
            message_txt += "\nChi si rivede!";
        } else if (now_date.getHours() > 21 || now_date.getHours() < 4) {
            if (page == "page1") {
                message_txt += "\nBuonasera!";
            } else {
                message_txt += "\nAncora buona sera!";
            }
        } else {
            if (page == "page1") {
                message_txt += "\nSalve!";
            } else {
                message_txt += "\nDi nuovo salve!";
            }
        }
        message_txt += "\nQuesto è un _modulo-companion_ per @LootGamebot.\n\nQui potrai curare quotidianamente, ";
        message_txt += "addestrare e far duellare nella prestigiosa Lega Argonauta un Mob da Combattimento\n\n";
        // message_txt += "_« /.../ infine sono solo semplici e fragili evocazioni di futili figurine!»_";

    } else if (page == "page2") {
        let proto = lega_model.getRandomMob();
        proto2 = lega_model.getRandomMob();

        message_txt += "_Introduzione non-esaustiva_\n\n";
        message_txt += "🐗 *Cura del Mob*\n";
        message_txt += "_«Il mob non beve ne deglutisce, e molto raramente barigatta. Ma quando chiede il luccio a bisce bisce, o sdilenca un poco o gnagio s’azzittisce...»_\n";
        message_txt += "\n🎯 *Addestramento*\n";
        message_txt += "_«S'allenano girando e facendo e trovando. O sul campo, che sia contr'un fantoccio o contro " + lega_names.getArticle(proto, true).det + proto.type_name + "»_\n";
        message_txt += "\n📖 *Esperienza*\n";
        message_txt += "_«Solo giocando, leggendo ed inoltrando messaggi si potranno avere più informazioni ";
        if (proto2.gender == "m") {
            if (proto2.type_name.charAt(0) == "E" || proto2.type_name.substring(0, 2).toLowerCase() == "sc" || proto2.type_name.substring(0, 2).toLowerCase() == "st" || proto2.type_name.substring(0, 2).toLowerCase() == "zo") {
                message_txt += "sugli ";
            } else {
                message_txt += "sui ";

            }
        } else {
            message_txt += "sulle ";
        }
        message_txt += proto2.type_name_plural + ". Questo o chiedere ad altri allenatori... ma fidandosi?»_"
    }

    let res = simpleMessage(user_info.telegram_id, message_txt);
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
                let text_message = "⧱ *Desolato...*\n\nNon sono riuscito a completare la registrazione per motivi tecnici.\nSe puoi, segnala a @nrc382";
                return registration_esit(simpleMessage(t_message_from.id, text_message));
            } else {
                return lega_model.update_Path([t_message_from.id, "POST_REG"]).then(function (updatePath_res) {

                    return registration_esit(newWorld_message(parseInt(options[2]), new_mob, { telegram_id: t_message_from.id, isQuery: true }, false));
                });
            }
        });
    });
}

function newWorld_message(mob_counter, mob_info, user_info, no_infos) {
    let message_txt = "🌎 _Ciao Mondo!_\n\n";
    let mob = new lega_mob.mob(false, mob_info);
    if (mob_counter == 1) {
        message_txt += "❂ *Il tuo primo Mob*\n";
        message_txt += "«" + mob.describe(0) + "»\n";

        message_txt += "\n" + lega_names.gF(mob.isMale, "Mandal") + " da uno dei tre maestri per una prima valutazione delle sue doti";

    } else {
        // non il primo...
    }

    let res = simpleMessage(user_info.telegram_id, message_txt);
    res.options.reply_markup = {};
    res.options.reply_markup.inline_keyboard = [];
    if (!no_infos) {
        res.options.reply_markup.inline_keyboard.push([
            {
                text: "Maggiori Informazioni ⓘ",
                callback_data: "LEGA:TRAINER:INFO"
            }
        ]);
    }
    let impatient = "0";
    if (no_infos) {
        impatient = "1"
    }

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
    res.options.reply_markup.inline_keyboard.push([
        {
            text: "Fa niente... ۝",
            callback_data: "LEGA:TRAINER:NO:SKIP"
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
            let message_txt = "*⁈*\n_È un mondo selvaggio..._\n";
            let user_info = new lega_model.user(user_rawInfo);
            let now_date = Math.floor(Date.now() / 1000);

            myLog("> now_date: " + now_date);

            myLog("> last_msg_date: " + user_info.lastMessage_date);
            myLog("> piu 30 minuti: " + (60 * 30 + user_info.lastMessage_date));

            if (typeof options != "string") {
                if (now_date >= (60 * 30 + user_info.lastMessage_date)) {
                    message_txt += "_Dove chiedere un nuovo messaggio può voler dire perder quello precedente._\n\n";
                } else if (now_date < (60 + user_info.lastMessage_date)) {
                    message_txt += "_Non serve cercare glitch._\n\n";
                } else { // altri casi di skip per trainer...
                    message_txt += "_Dove nulla è e tutto è lecito._\n\n";
                }

            } else {
                if (now_date > (60 * 60 + user_info.lastMessage_date)) {
                    message_txt += "_Dove lasciar passare il tempo può voler dire perdere un occasione._\n\n";
                } else if (now_date < (60 + user_info.lastMessage_date)) {
                    message_txt += "_Meglio non perdere tempo..._\n\n";
                } else { // altri casi di skip per trainer...
                    message_txt += "_selvaggio!_\n\n";
                }
            }

            if (now_date > (60 * 60 * 24 * 7 + user_info.lastMessage_date)) {
                message_txt += "Hai creato il tuo mob molto, molto tempo fa...\nOra, se lo vuoi, è il tempo di cominciare occuparsi di " + user_info.mob_fullName + ".";
            } else if (now_date > (60 * 60 * 48 + user_info.lastMessage_date)) {
                message_txt += "Hai creato il tuo mob qualche giorno fa, vuoi iniziare a prenderti cura di " + user_info.mob_fullName + "?";
            } else if (now_date < (60 * 5 + user_info.lastMessage_date)) {
                message_txt += user_info.mob_fullName + " non vede l'ora di cominciare...";
            } else {
                message_txt += "Hai creato il tuo mob, è giunto il momento di prendersene cura?";
            }

            let res = simpleMessage(user_info.telegram_id, message_txt);
            res.options.reply_markup = {};
            res.options.reply_markup.inline_keyboard = [
                [
                    {
                        text: "Inizia... ۞",
                        callback_data: "LEGA:BEGIN"
                    }

                ]
            ];

            return (manageDeletion(user_info, res));

        });
    });

}


// ACCESSORIO

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

function simpleMessage(id, text) {
    /*
    reply_markup: {
                inline_keyboard: [[{
                    text: "Ok",
                    callback_data: 'SUGGESTION:FORGET'
                }]]
            }
    */
    let simple_msg = {
        chat_id: id,
        message_txt: text,
        options: {
            parse_mode: "Markdown",
            disable_web_page_preview: true
        }
    };
    return simple_msg;

}

//function menuMessage()