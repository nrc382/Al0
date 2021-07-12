const alName = "AldegliArgonautiIlBot";

//const Intl = require("intl"); // TODO rimuovere questo require. L'oggetto Intl è disponibile in node @see: https://nodejs.org/api/intl.html#intl_internationalization_support 

const ascii_char = require("asciichart");
const fs = require('fs');
const path = require("path");
const got = require('got');

const config = require('../models/config');
const items_manager = require('./ItemsManager');
const figu_manager = require('./figurineManager');

const model = require('./argo_model');
const { loadZainoOf } = require("./ItemsManager");

const theCreator = config.creatore_id;

let globalArgonauts = [];
let allLootUsers = [];

//let bootDate = Date.now();
let globalInfos = { global_on: null, global_cap_hide: 1, global_tot: 0, global_cap: 0, global_members: 0, global_limit: 0, last_update: 0, argo_point: 0 };


function loadInMem() {
    return new Promise(async function (loadInMem_resolve) {
        globalArgonauts = [];
        allLootUsers = await getLootUsers();
        console.log("> Utenti Loot: " + allLootUsers.length);

        return model.argo_pool.getConnection(function (conn_err, single_connection) {
            if (conn_err) {
                console.log("Errore!");
                console.log(conn_err);
                return loadInMem_resolve(-1);
            } else if (single_connection) {
                console.log("> Connesso al database");

                let query = "SELECT * FROM " + model.tables_names.argonauti;
                single_connection.query(query,
                    function (err, result_1) {
                        if (result_1) {
                            for (let i = 0; i < result_1.length; i++) {
                                let tmp_split = result_1[i].global_pos != null ? result_1[i].global_pos.split(":") : [];
                                let global_pos_point = -1;
                                let global_pos_date = -1;
                                let global_posP = -1;

                                if (tmp_split.length == 3) {
                                    global_posP = tmp_split[0];
                                    global_pos_point = tmp_split[1];
                                    global_pos_date = tmp_split[2];
                                }

                                globalArgonauts.push({
                                    id: result_1[i].id,
                                    role: result_1[i].role,
                                    t_name: result_1[i].t_name,
                                    nick: result_1[i].nick,
                                    is_crafting: result_1[i].is_crafting,
                                    craft_option: result_1[i].craft_option,
                                    party: result_1[i].party,
                                    madre: result_1[i].madre,
                                    rango: result_1[i].rango,
                                    unique_figu: result_1[i].unique_figu,
                                    exp: result_1[i].exp,
                                    craft_pnt: result_1[i].craft_pnt,
                                    rinascita: result_1[i].rinascita,
                                    artefatti_n: result_1[i].artefatti_n,
                                    drago: result_1[i].drago,
                                    ability: result_1[i].ability,
                                    mana: result_1[i].mana,
                                    drago_lv: result_1[i].drago_lv,
                                    last_update: result_1[i].last_update,
                                    global_pos: global_posP,
                                    global_posDate: global_pos_date,
                                    global_posPoint: global_pos_point,
                                    gain_globalPoint: result_1[i].gain_globalPoint
                                });
                            }
                            console.log("▸ Argonauti: " + globalArgonauts.length);
                            //console.log(globalArgonauts);
                        } else {
                            console.error("> Lista argonauti NON caricata");
                            console.error(err);
                        }

                        return items_manager.loadAllItems().then(function (loadItems_res) {
                            model.argo_pool.releaseConnection(single_connection);
                            return loadInMem_resolve({ items: loadItems_res, argonauts: globalArgonauts.length });
                        });
                    });
            } else {
                console.log("Mumble....");
                return loadInMem_resolve(-1);
            }
        });


    });
}
module.exports.update = loadInMem;


// #MAIN-MANAGERs

function manageMessage(message, argo, chat_members) {
    return new Promise(function (argo_resolve) {
        let res = {};
        console.log("\n***********\n> Inizio gestione messaggio " + message.message_id + " (Da " + argo.info.nick + ")\n");
        if (typeof message.text != 'undefined') {
            let nowDate = (Date.now() / 1000);
            console.log(message);
            let toAnalyze = message;

            let from = message.from;
            let is_private = (message.chat.id == message.from.id);
            let replyT = (typeof message.reply_to_message != 'undefined');
            let forwardT = (typeof message.forward_from != 'undefined');

            let lowercaseText = message.text.toLowerCase();

            let inReplyOfMine = false;

            if (message.date < nowDate - 600) {
                return argo_resolve();
            }

            if (typeof argo.info.madre == 'undefined') {
                let conditionA = false;
                if (forwardT && (message.forward_from.username == "lootplusbot" || message.forward_from.username == "lootgamebot")) {
                    conditionA = (message.text.indexOf("Giocat") == 0);
                } else if (replyT && (message.reply_to_message.from.username == "lootplusbot" || message.reply_to_message.from.username == "lootgamebot")) {
                    conditionA = (message.reply_to_message.text.indexOf("Giocat") == 0);
                }
                console.log(forwardT ? "> Da: " + message.forward_from.username : "> Non inoltrato...");
                console.log(replyT ? "> In risposta ad un messaggio di: " + message.reply_to_message.from.username : "> Non in risposta...");
                console.log("> Condizione: " + conditionA);

                if (!conditionA) {
                    let message_text = "Ciao " + argo.info.nick.split("_").join("\\_") + "!\n";
                    if (message.chat.type == "private") {
                        message_text += "Inoltrami la tua scheda giocatore di @lootgamebot";
                    } else {
                        return argo_resolve([]);

                    }
                    if (lowercaseText == "/giocatore")
                        res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                    res.toSend = simpleMessage(message_text, message.chat.id);
                    return argo_resolve(res);
                }
            }

            if (!forwardT) {
                if (argo.info.t_name.length <= 0 && typeof message.from.first_name != "undefined") {
                    model.argo_pool.query("UPDATE `Argonauti` SET `t_name` = ? WHERE `id`= ?", [message.from.first_name, argo.info.id],
                        function (updated_name_res) {
                            console.log("> Ho aggiornato il nome di " + argo.info.nick + ": " + message.from.first_name + "\nSarà valido dal prossimo riavvio...");
                            console.log(updated_name_res);
                        });
                }
            }


            if (message.text.toLowerCase().match("enricchio")) {
                let text = lowercaseText.split(" ");
                let position = text.indexOf("enricchio");
                if (position >= 0) {
                    text[position] = message.from.first_name;
                }
                res.toSend = simpleMessage(text.join(" "), message.chat.id);
                res.toSend.options.reply_to_message_id = message.message_id;
                return argo_resolve(res);
            } else if (forwardT) {
                console.log(message.from.username + " ha inoltrato un messaggio di " + message.forward_from.username);
                toAnalyze.from = message.forward_from;
            } else if (replyT) {
                if (typeof message.reply_to_message.text != "undefined") {
                    toAnalyze = message.reply_to_message;
                    if (typeof message.reply_to_message.forward_from != 'undefined') {
                        toAnalyze.from = message.reply_to_message.forward_from;
                    }
                    console.log(message.from.username + " ha risposto ad un messaggio di " + toAnalyze.from);
                }
                console.log("son nell'else..");


            }

            if (toAnalyze.from.username == alName) {
                inReplyOfMine = true;
            }

            let line = "";
            let all_lines = [];


            let quote_pos = -1;

            if (!inReplyOfMine || (forwardT && !is_private) || !replyT) {
                quote_pos = checkQuote(lowercaseText.split(" "), "al");
            } else {
                quote_pos = 0;
            }

            if (!inReplyOfMine) {
                if (typeof toAnalyze.text != 'undefined') {
                    all_lines = toAnalyze.text.toLowerCase().split("\n");
                    line = all_lines[0];
                }
            } else {
                all_lines = message.text.toLowerCase().split("\n");
                line = all_lines[0];
            }


            if (message.chat.type == "private" && !(quote_pos >= 0)) {
                quote_pos = 0;
            }

            let words_count = line.split(" ").length;


            console.log("> Linea: " + line);
            console.log("> words_count: " + words_count);
            console.log("> quote_pos: " + quote_pos);
            console.log("> inReplyOfMine: " + inReplyOfMine);
            console.log("> replyT: " + replyT);
            console.log("> forwardT: " + forwardT);



            if (inReplyOfMine) {
                if (line.indexOf("👣") == 0) {
                    if (lowercaseText.match("crea")) {
                        let question_array = lowercaseText.split(" ");
                        let quantity;
                        for (let i = 0; i < (question_array.length - 1); i++) {
                            if (question_array[i].match("crea")) {
                                quantity = parseInt(question_array[i + 1]);
                                break;
                            }
                        }
                        if (!(typeof quantity == "undefined") && !isNaN(quantity)) {
                            return inoltroCrafter(toAnalyze.text, argo, "smuggler", quantity).then(function (crafter_res) {
                                res.toSend = simpleDeletableMessage(message.chat.id, true, crafter_res.text);
                                let has_craftedImpact = checkPreserveNeeds(crafter_res.used_c, crafter_res.root_items);
                                giveDetailBotton(res.toSend.options, crafter_res.needed, crafter_res.used_b, crafter_res.used_c.length, has_craftedImpact);
                                return argo_resolve(res);
                            });
                        } else {
                            let res = simpleMessage("*Mumble...*\n\nNon ho capito la _quantità!_", query.message.chat.id);
                            return argo_resolve(res);
                        }
                    } else if (lowercaseText.match("vend") || lowercaseText.match("regal")) {
                        let text_array = toAnalyze.text.split("\n");
                        let price = 1;
                        if (lowercaseText.match("vend")) {
                            console.log("> `" + text_array[6].split(" ")[3].split(".").join("") + "`");
                            price = parseInt(text_array[6].split(" ")[3].split(".").join(""));
                        }
                        let name = text_array[1].substring(1, text_array[1].indexOf("(") - 1).trim();
                        res.toSend = simpleMessage("`/negozio " + name + ":" + price + ":1`", argo.info.id);

                        return argo_resolve(res);
                    }
                } else if (line.match("buggetto")) {
                    if (message.from.id == theCreator) {
                        if (lowercaseText.match("no")) {
                            let name = toAnalyze.text.split(",")[1].split("...")[0].trim();
                            res.toSend = simpleMessage("*Peccato!*\n_È sveglio, ma non si applica._\nPovero " + name + "... 😔", message.chat.id);
                        } else if (lowercaseText.match("si")) {

                        }
                        return argo_resolve(res);
                    }
                } else if (replyT && toAnalyze.text.match("/negozio") && lowercaseText.match("negozio ")) {
                    return analize_StringaNegozio(toAnalyze.text.substring(9).split("\n"), lowercaseText.split(" "), argo).then(function (res_text) {
                        res.toSend = simpleMessage(res_text, argo.info.id);
                        res.toSend.options.reply_markup = {};
                        res.toSend.options.reply_markup.inline_keyboard = [[{
                            text: "Chiedi nel Porto",
                            callback_data: 'ARGO:CRAFT:ASK'
                        }]];

                        //res.toSend.options.reply_to_message_id = message.message_id;
                        return argo_resolve(res);
                    });
                } else if (line.match("progresso artefatti")) {
                    return artefattiProgress_manager(argo.info, toAnalyze.text.split("\n"), lowercaseText.split("\n")[0].split(" ")).then(function (res_text) {
                        res.toSend = simpleMessage(res_text, message.chat.id);
                        if (!(message.chat.type == "private")) {
                            res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                        }
                        argo_resolve(res);
                    });
                } else if (line.match("si") && words_count < 5) {
                    res.toSend = simpleMessage("Grazie!", message.chat.id);
                    res.toSend.options.reply_to_message_id = message.message_id;
                    return argo_resolve(res);
                } else if (line.match("no") && words_count < 5) {
                    let sed_array = [
                        "Ah.",
                        "😞",
                        "😩",
                        "Uffi...",
                        "Ma ma... ma io..."
                    ];

                    res.toSend = simpleMessage(sed_array[Math.floor(Math.random() * sed_array.length)], message.chat.id);
                    res.toSend.options.reply_to_message_id = message.message_id;
                    return argo_resolve(res);

                } else if (line.indexOf("bentornato") > 0) {
                    res.toSend = simpleMessage("🤖❓\n\n_Grazie, grazie..._", message.chat.id);
                    res.toSend.options.reply_to_message_id = message.message_id;
                    return argo_resolve(res);
                } else if (line.endsWith("?")) {
                    let message_text = "";
                    if (words_count == 1) {
                        let word = line.split("?").join("");
                        message_text = `${word} ${word}!`;
                        if (Math.floor(Math.random() * (2 * word.length)) <= Math.floor(word.length / 2)) {
                            message_text = `${word}, ${word}, ${word}, ${word}, ${word}, ${word}!!`;
                        }
                    } else {
                        let sed_array = [];
                        if (Math.floor(Math.random() * (2 * word.length)) >= 7) {
                            sed_array = [
                                "Non credo, dai...",
                                "Spero di no!",
                                "Ma NO!",
                                "Eh si, mo!",
                                "Ma te pare?",

                            ];
                        } else {
                            sed_array = [
                                "È capace...",
                                "È probabile",
                                "È *probbabbile*... si, si!",
                                "Lo penso anche io",
                                "E come no?",

                            ];
                        }

                        message_text = sed_array[Math.floor(Math.random() * sed_array.length)];
                    }
                    res.toSend = simpleMessage(message_text, message.chat.id);
                    res.toSend.options.reply_to_message_id = message.message_id;
                    return argo_resolve(res);

                } else {
                    let sed_array = [
                        "Ah.",
                        "Si si, ok.",
                        "Capito!",
                        "Me lo son segnato",
                        "Capisco perfettamente",

                    ];

                    res.toSend = simpleMessage(sed_array[Math.floor(Math.random() * sed_array.length)], message.chat.id);
                    res.toSend.options.reply_to_message_id = message.message_id;
                    return argo_resolve(res);
                }

            } else if (toAnalyze.from.username === "lootgamebot" || toAnalyze.from.username === "lootplusbot") {
                if (line.indexOf("giocat") == 0 && quote_pos >= 0) { // console.log("Da loot O dal plus");
                    console.log("Scheda giocatore");
                    console.log("> quote_pos: " + quote_pos);

                    if (toAnalyze.date < (nowDate - (12000))) {
                        res.toSend = simpleMessage("La scheda che hai citato è un po vecchiotta...", message.chat.id);
                        argo_resolve(res);
                    } else {
                        if (message.from.id == theCreator) {
                            let mess_array = message.text.split(" ");
                            if (mess_array.length > 1 && !isNaN(parseInt(mess_array[1]))) {
                                message.from.id = parseInt(mess_array[1]);
                            }
                        }
                        return updateScheda(toAnalyze.text, from, argo, toAnalyze.date).then(function (res_text) {
                            res.toSend = simpleMessage(res_text, message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                            return argo_resolve(res);
                        });
                    }
                } else if (replyT && quote_pos >= 0 && lowercaseText.match("conta")) { // console.log("Da loot O dal plus");
                    if (toAnalyze.text.match("> Pietra ")) {
                        let count = parsePietre(toAnalyze.text);
                        if (count.point > 0) {
                            res.toSend = simpleMessage("🐉\nSono " + count.point.toString() + " punti\n*" + (count.levels).toFixed(2) + "* lv. Drago", message.chat.id);
                        } else {
                            res.toSend = simpleMessage("Non c'è nemmeno un punto anima lì...", message.chat.id);
                        }
                        res.toSend.options.reply_to_message_id = toAnalyze.message_id;
                        if (count.levels > 100) {
                            let tmp = res;
                            res = [];
                            let tmp2 = {};
                            tmp2.toSend = simpleMessage("Esagerato...", message.chat.id);
                            tmp2.toSend.options.reply_to_message_id = toAnalyze.message_id + 1;
                            res.push(tmp);
                            res.push(tmp2);
                        }
                        argo_resolve(res);
                    } else {
                        updateCapsulaCounter(toAnalyze).then(function (res) {
                            console.log(res);
                        });
                    }
                } else if (quote_pos >= 0 && toAnalyze.from.username === "lootgamebot") { // SOLO Loot
                    console.log("> Messaggio di LootGame");
                    let private = message.chat.type == "private";
                    //console.log(lowercaseText);
                    if (line.startsWith("statistiche giocatore")) {
                        return artefattiProgress_manager(argo.info, toAnalyze.text.split("\n"), lowercaseText.split("\n")[0].split(" ")).then(function (res_text) {
                            res.toSend = simpleMessage(res_text, message.chat.id);
                            if (!(message.chat.type == "private")) {
                                res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                            }
                            argo_resolve(res);
                        });
                    } else if (private && line.startsWith("hai trovato ")) {
                        let items_array = [];
                        let total_copyes = 0;
                        let total_gain = 0;
                        let base_gain = 0;
                        for (let i = 0; i < all_lines.length; i++) {
                            if (all_lines[i].charAt(0) == ">") {
                                let tmp_quantity = parseInt(all_lines[i].substring(all_lines[i].indexOf("> ") + 2, all_lines[i].indexOf("x ")));
                                if (!isNaN(tmp_quantity)) {
                                    let item_name = all_lines[i].substring(all_lines[i].indexOf("x ") + 2, all_lines[i].indexOf(" ("));
                                    let tmp_item = items_manager.quick_itemFromName(item_name, false, 1)[0];
                                    if (typeof tmp_item != "undefined") {
                                        items_array.push([tmp_item.id, argo.info.id, tmp_quantity]);
                                        total_copyes += tmp_quantity;
                                        let tmp_price = parseInt(tmp_item.base_value);
                                        if (!isNaN(tmp_price)) {
                                            base_gain += (tmp_price * tmp_quantity);
                                            tmp_price = parseInt(tmp_item.market_medium_value > 0 ? tmp_item.market_medium_value : tmp_item.base_value);
                                            if (!isNaN(tmp_price)) {
                                                total_gain += (tmp_price * tmp_quantity);
                                            }
                                        }


                                    }

                                }
                            }
                        }
                        return zainoQuantityUpdate(items_array, "+").then(function (update_res) {
                            let res_text = "*Zaino Aggiornato!* 🎒\n\n";
                            res_text += "• Oggetti: " + items_array.length + "\n";
                            res_text += "• Copie totali: " + total_copyes + "\n";
                            res_text += "• Valore a base: " + edollaroFormat(base_gain) + "\n";
                            res_text += "• Stimato: " + edollaroFormat(total_gain) + "\n";
                            res.toSend = simpleDeletableMessage(argo.info.id, true, res_text);
                            return argo_resolve(res);
                        });
                    } else if (line.startsWith("hai creato ")) {
                        return simpleQuantityUpdate(line, argo, res, message, argo_resolve);

                        // if (argo.info.is_crafting === 0) {
                        //     return simpleQuantityUpdate(line, argo, res, message, argo_resolve);
                        // } else {
                        //     console.log("È nel craft...");
                        //     let quantity = 1;
                        //     let start = line.indexOf("x");
                        //     let partial_start = line.indexOf("hai creato ") + "hai creato ".length;

                        //     if (start > 0) {
                        //         quantity = parseInt(line.substring(partial_start, start));
                        //         start += 2;
                        //         console.log("> Quantità trovata: " + quantity);
                        //     } else {
                        //         start = partial_start;
                        //     }
                        //     let limit = line.indexOf(" (");
                        //     if (limit < 0) {
                        //         limit = line.indexOf(" ed");
                        //     }

                        //     let zaino_quantity = line.substring(line.indexOf("ne possiedi ") + 12, line.indexOf(")"));
                        //     let root_item = {
                        //         name: line.substring(start, limit),
                        //         avaible_quantity: quantity
                        //     };

                        //     return manageBrokenCraftLine(argo, false, zaino_quantity, [root_item]).then(function (broken_res) {
                        //         res.toSend = simpleDeletableMessage(argo.info.id, true, broken_res.text);
                        //         res.toSend.options.reply_markup = {};
                        //         if (broken_res.editable) {
                        //             res.toSend.options.reply_markup.inline_keyboard = [
                        //                 [
                        //                     {
                        //                         text: "－",
                        //                         callback_data: "ARGO:CRAFT:BROKEN:-"

                        //                     },
                        //                     {
                        //                         text: "＋",
                        //                         callback_data: "ARGO:CRAFT:BROKEN:+"
                        //                     }

                        //                 ]

                        //             ];
                        //             if (typeof broken_res.mergeable == "string") {
                        //                 res.toSend.options.reply_markup.inline_keyboard.push([
                        //                     {
                        //                         text: "Aggiungi alla Linea",
                        //                         callback_data: "ARGO:CRAFT:RECREATE:ADD:" + broken_res.mergeable
                        //                     }
                        //                 ]);
                        //             } else {
                        //                 res.toSend.options.reply_markup.inline_keyboard.push([
                        //                     {
                        //                         text: "Crea!",
                        //                         callback_data: "ARGO:CRAFT:BROKEN:START:" + broken_res.objects_ids.join("-")
                        //                     }
                        //                 ]);
                        //             }
                        //         } else if (broken_res.newCraft) {
                        //             let has_craftedImpact = checkPreserveNeeds(broken_res.craft_list.impact.crafted, broken_res.craft_list.root_item);
                        //             giveDetailBotton(res.toSend.options, broken_res.craft_list.missingItems_array.length, broken_res.craft_list.impact.base.length, broken_res.craft_list.impact.crafted.length, has_craftedImpact);

                        //         }
                        //         return argo_resolve(res);
                        //     });
                        // }
                        //});
                    } else if (line.startsWith("benvenut") && line.split(" ").length == 2) {
                        let private = message.chat.type == "private";
                        if (private || Math.abs(message.chat.id) === 1001322169661) {
                            return parseSmuggler(toAnalyze.text, private, (((Date.now() / 1000) - (message.date / 1000)) <= 60)).then(function (smugglerRes) {

                                if (smugglerRes[0] == false && typeof (smugglerRes[1]) != "string") {
                                    res = {
                                        toSend: simpleMessage(smugglerRes[1].user + ",\nNon sono riuscito a riconoscere \"" + smugglerRes[1].item + "\" tra gli oggetti di Loot...", message.chat.id),
                                    }
                                } else {
                                    let option = "private";
                                    if (!private) {
                                        option = "Porto"
                                    }

                                    console.log("> in ritorno, ID oggetto-aggiornato: " + smugglerRes[2]);
                                    res = {
                                        toSend: smugglerMessage(message.chat.id, smugglerRes[1], option, argo.info, smugglerRes[2]),
                                        toDelete: { chat_id: message.chat.id, mess_id: message.message_id }
                                    };
                                }
                                return argo_resolve(res);
                            });
                        }
                    } else if (line.startsWith("il tempo a disposizione")) {
                        let random_array = ["Dio, che scarsi...", "Ao, ma che davero?", "👆 /facepalm ", "🤦‍♂️"];
                        console.log(random_array[Math.ceil(Math.random() * (random_array.length)) - 1])

                        res.toSend = simpleMessage(random_array[Math.ceil(Math.random() * (random_array.length)) - 1], message.chat.id);
                        res.toSend.options.reply_to_message_id = message.message_id;
                        return argo_resolve(res);

                    } else if (line.match("oggetti contenuti nel pacchetto")) {
                        let box_price = 0;
                        let box_iems_cost = 0;
                        let copy_counter = 0;
                        let rarity = "";

                        let itemsList_text = "";

                        for (let i = 0; i < all_lines.length; i++) {
                            if (all_lines[i].charAt(0) == ">") {
                                let tmp_copys = parseInt(all_lines[i].substring(all_lines[i].indexOf("> ") + 2, all_lines[i].indexOf("x")));
                                if (isNaN(tmp_copys)) {
                                    return argo_resolve({
                                        toSend: simpleDeletableMessage(argo.info.id, true, "*Woops!*\n\nNon ho riconosciuto la quantità del " + i + "° oggetto!\nCapace che edo abbia cambiato la sintassi, se puoi contatta @nrc382")
                                    });
                                } else {
                                    let tmp_item = items_manager.quick_itemFromName(all_lines[i].substring(all_lines[i].indexOf("x ") + 2), false, 1)[0];
                                    if (!tmp_item.id) {
                                        return argo_resolve({
                                            toSend: simpleDeletableMessage(argo.info.id, true, "*Woops!*\n\nNon ho riconosciuto il nome del " + i + "° oggetto!\nCapace che edo abbia cambiato la sintassi, se puoi contatta @nrc382")
                                        });
                                    } else {
                                        if (rarity.length <= 0) {
                                            rarity = tmp_item.rarity;
                                        }
                                        copy_counter = tmp_copys;
                                        let tmp_cost = parseInt(tmp_item.market_medium_value < 0 ? tmp_item.base_value : tmp_item.market_medium_value);
                                        if (isNaN(tmp_cost)) {
                                            tmp_cost = 0;
                                        }
                                        box_iems_cost += tmp_cost * tmp_copys;
                                        itemsList_text += "• " + tmp_copys + "x " + tmp_item.name + "\n\t\t§: " + edollaroFormat(tmp_cost) + "\n";
                                    }
                                }
                            } else if (all_lines[i].match("al prezzo di: ")) {
                                let tmp_price = all_lines[i].split(":")[1].trim().split(" ")[0].split(".").join("");
                                tmp_price = parseInt(tmp_price);
                                if (!isNaN(tmp_price)) {
                                    box_price = tmp_price;
                                } else {
                                    return argo_resolve({
                                        toSend: simpleDeletableMessage(argo.info.id, true, "*Woops!*\n\nNon ho riconosciuto il costo del pacchetto. Capace che edo abbia cambiato la sintassi, se puoi contatta @nrc382")
                                    });
                                }
                            }
                        }

                        let res_rext = "*Offerta del Mercante Pazzo*👝\n";
                        res_rext += "_" + copy_counter + " oggetti di rarità " + rarity + "_\n\n";

                        res_rext += itemsList_text + "\n";

                        res_rext += "• Prezzo pacchetto: " + edollaroFormat(box_price) + "\n";
                        res_rext += "• Valore stimato: " + edollaroFormat(box_iems_cost) + "\n";

                        let firs_button = { text: "", switch_inline_query: "" };
                        if (box_iems_cost > box_price) {
                            res_rext += "• Mi sembra ";
                            if ((box_iems_cost < box_price + (box_price / 2))) {
                                if ((box_iems_cost < box_price + (box_price / 4))) {
                                    res_rext += "un'offerta decente ";
                                } else {
                                    res_rext += "una buona offerta ";
                                }
                            } else {
                                res_rext += "un'ottima offerta ";

                            }
                            res_rext += "👍\n• Risparmio: " + edollaroFormat((box_iems_cost - box_price));

                            firs_button.text = "Accetta";

                            firs_button.switch_inline_query = "eco: Accetta\n";
                        } else {
                            res_rext += "• Non mi sembra una buona offerta 👎\n";
                            res_rext += "• Spesa: " + edollaroFormat(box_iems_cost - box_price);
                            firs_button.text = "Cambia";
                            firs_button.switch_inline_query = "eco: Mercante Pazzo 👝"
                        }

                        res.toSend = simpleDeletableMessage(argo.info.id, true, res_rext);
                        res.toSend.options.reply_markup.inline_keyboard.unshift([
                            firs_button,
                            {
                                text: "Acquistato!",
                                callback_data: 'ARGO:MERCHANT:DONE'
                            }
                        ]);

                        return argo_resolve(res);
                    } else if (quote_pos >= 0 && line.match("le tue riserve di mana:")) {
                        return parseMana(toAnalyze.text, false, message.chat.id, argo.info.nick).then(function (mana_res) {
                            console.log("Torno con: " + (typeof mana_res));
                            console.log(mana_res);
                            if (mana_res != null) {
                                res.toSend = mana_res;
                                res.toDelete = { chat_id: message.chat.id, mess_id: toAnalyze.message_id };
                                argo_resolve(res);
                            }
                        });
                    } else if (line.match("ispezioni passate ")) {
                        return parseStoricoIspezioni(message.text.split("\n"), message.from.username).then(function (parse_res) {
                            res.toSend = simpleMessage(parse_res, message.chat.id);
                            res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                            argo_resolve(res);
                        });

                    } else if (line.startsWith("cosa vuoi fare con la polvere?")) {
                        let quantity = parseFloat(line.substring("Cosa vuoi fare con la polvere? Ne possiedi ".length, line.indexOf("unità"))) * 1000;
                        let proportion = Math.round(((quantity * 100) / 10000) * 10) / 10;
                        let article = "Il ";
                        if (Math.floor(proportion) == 1 || Math.floor(proportion) == 8 || Math.floor(proportion / 10) == 8) {
                            article = "L'"
                        }
                        return argo_resolve({
                            toSend: simpleMessage(article + proportion + "% del necessario per la plus...", message.chat.id),
                        });
                    } else if (line.startsWith("puoi migliorare ")) {
                        return inoltroCrafter(toAnalyze.text, argo, "assalto").then(function (crafter_res) {
                            res.toSend = simpleDeletableMessage(message.chat.id, true, crafter_res.text);
                            res.toSend.options.reply_markup.inline_keyboard.unshift([
                                {
                                    text: "Al Craft",
                                    switch_inline_query: "linea 1"

                                }
                            ]);
                            if (crafter_res.needed + crafter_res.used > 0) {
                                let has_craftedImpact = checkPreserveNeeds(crafter_res.used_c, crafter_res.root_items);
                                giveDetailBotton(res.toSend.options, crafter_res.needed, crafter_res.used_b, crafter_res.used_c.length, has_craftedImpact);
                                let eco_text = manageDeposit(crafter_res.text);
                                res.toSend.options.reply_markup.inline_keyboard.push([
                                    {
                                        text: "Deposita ",
                                        switch_inline_query: "eco: " + eco_text

                                    }
                                ]);
                            } else if (crafter_res.complete == true) {
                                res.toSend.options.reply_markup = {};
                                res.toSend.options.reply_markup.inline_keyboard = [
                                    [
                                        {
                                            text: "Consumati in Postazione",
                                            callback_data: "ARGO:CRAFT:ASSALTO_DONE:"
                                        }
                                    ]
                                ];
                            }

                            return argo_resolve(res);
                        });
                    } else if (line.startsWith("creazione ")) {
                        let notAvaibleItems = [];
                        let toUpdateItems = [];

                        let root_item = {
                            name: line.substring(line.indexOf("x ") + 2, line.indexOf(" (")),
                            avaible_quantity: parseInt(line.substring(line.indexOf(" hai ") + 5, line.indexOf(")")))
                        };
                        if (isNaN(root_item.avaible_quantity)) {
                            console.error("> Substring: " + line.substring(line.indexOf(" hai ") + 5, line.indexOf(")")));
                        } else if (root_item.avaible_quantity == 0) {
                            notAvaibleItems.push(root_item);
                        } else {
                            toUpdateItems.push(root_item);
                        }


                        let tmp_index = 0;
                        let tmp_final_index = 0;

                        let quantity = parseInt(all_lines[0].substring(all_lines[1].indexOf("consumerai") + 11, all_lines[1].indexOf(" copi")));
                        if (isNaN(quantity)) {
                            quantity = 1;
                        }

                        console.log("> Ricreo in quantità: " + quantity);
                        for (let i = 0; i < all_lines.length; i++) {
                            tmp_final_index = all_lines[i].indexOf("🚫");
                            if (tmp_final_index > 0) {
                                tmp_index = all_lines[i].indexOf(" (");
                                let tmp_object = {};
                                tmp_object.name = all_lines[i].substring(2, tmp_index);
                                tmp_object.rarity = all_lines[i].substring(tmp_index + 2, all_lines[i].indexOf(", "));
                                tmp_object.avaible_quantity = parseInt(all_lines[i].substring((all_lines[i].indexOf(", ") + 2), (tmp_final_index - 2)));
                                notAvaibleItems.push(tmp_object);
                            } else if (all_lines[i].indexOf("✅") > 0) {
                                toUpdateItems.push({
                                    name: all_lines[i].substring(2, all_lines[i].indexOf(" (")),
                                    avaible_quantity: parseInt(all_lines[i].substring((all_lines[i].indexOf(", ") + 2), all_lines[i].indexOf(") ")))
                                });
                            }
                        }
                        console.log("> Oggetti che ha: " + toUpdateItems.length);
                        console.log("> Oggetti che non ha: " + notAvaibleItems.length);


                        return manageBrokenCraftLine(argo, notAvaibleItems, quantity, toUpdateItems).then(function (broken_res) {
                            res.toSend = simpleDeletableMessage(argo.info.id, true, broken_res.text);
                            res.toSend.options.reply_markup = {};
                            if (broken_res.editable) {
                                res.toSend.options.reply_markup.inline_keyboard = [
                                    [
                                        {
                                            text: "－",
                                            callback_data: "ARGO:CRAFT:BROKEN:-"

                                        },
                                        {
                                            text: "＋",
                                            callback_data: "ARGO:CRAFT:BROKEN:+"
                                        }

                                    ]

                                ];
                                if (typeof broken_res.mergeable == "string") {
                                    res.toSend.options.reply_markup.inline_keyboard.push([
                                        {
                                            text: "Aggiungi alla Linea",
                                            callback_data: "ARGO:CRAFT:RECREATE:ADD:" + broken_res.mergeable
                                        }
                                    ]);
                                } else {
                                    res.toSend.options.reply_markup.inline_keyboard.push([
                                        {
                                            text: "Crea!",
                                            callback_data: "ARGO:CRAFT:BROKEN:START:" + broken_res.objects_ids.join("-")
                                        }
                                    ]);
                                }
                            } else if (broken_res.newCraft) {
                                let has_craftedImpact = checkPreserveNeeds(broken_res.craft_list.impact.crafted, broken_res.craft_list.root_item);
                                giveDetailBotton(res.toSend.options, broken_res.craft_list.missingItems_array.length, broken_res.craft_list.impact.base.length, broken_res.craft_list.impact.crafted.length, has_craftedImpact);

                            }
                            return argo_resolve(res);
                        });

                    } else if (line.startsWith("nella stanza incontri un viandante")) {
                        return checkValidOffert_viandante(toAnalyze.text).then(function (offert_res) {

                            res.toSend = simpleMessage(offert_res[0], message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;

                            let switch_text = "";
                            if (offert_res[0].match("✅")) {
                                switch_text = "Accetta Oggetto " + offert_res[1];
                            } else {
                                switch_text = "Ignora";
                            }
                            res.toSend.options.reply_markup = {};
                            res.toSend.options.reply_markup.inline_keyboard = [];
                            res.toSend.options.reply_markup.inline_keyboard.push([{ text: switch_text, switch_inline_query: "eco: " + switch_text }]);

                            return argo_resolve(res);
                        });

                    } else if (line.startsWith("nella stanza incontri un predone")) {
                        return checkValidOffert_predone(toAnalyze.text).then(function (res_text) {

                            res.toSend = simpleMessage(res_text, message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                            let switch_text = "";
                            if (res_text.match("👎")) {
                                switch_text = "Ignora";
                            } else {
                                switch_text = "Accetta";
                            }
                            res.toSend.options.reply_markup = {};
                            res.toSend.options.reply_markup.inline_keyboard = [];
                            res.toSend.options.reply_markup.inline_keyboard.push([{ text: switch_text, switch_inline_query: "eco: " + switch_text }]);

                            return argo_resolve(res);
                        });

                    } else if (line.startsWith("entri in una stanza completamente luccicante")) {
                        return checkValidOffert_luccicante(toAnalyze.text).then(function (isValid_res) {
                            let res_text = isValid_res[0];
                            let craftable = isValid_res[1];
                            res.toSend = simpleMessage(res_text, message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;

                            let switch_text = { text: "", query: "" };
                            if (res_text.match("👎")) {
                                switch_text.query = "No";
                                switch_text.text = "Rifiuta";
                            } else {
                                switch_text.query = "Si";
                                switch_text.text = "Accetta";
                            }
                            res.toSend.options.reply_markup = {};
                            res.toSend.options.reply_markup.inline_keyboard = [];
                            res.toSend.options.reply_markup.inline_keyboard.push([{ text: switch_text.text, switch_inline_query: "eco: " + switch_text.query }]);

                            if (craftable) {
                                res.toSend.options.reply_markup.inline_keyboard.push([{ text: "⚒ Craft", callback_data: 'ARGO:SMUGL:CRAFT' }]);
                            }


                            return argo_resolve(res);
                        });
                    } else if (line.startsWith("in attesa per l'oggetto")) { // Crafting Festival
                        return manageFestival(toAnalyze, message.chat.id, from.id).then(function (festivalMessage) {
                            return argo_resolve({ toSend: festivalMessage });
                        });
                    } else if (line.startsWith("vendita completata! ")) {
                        return smugglerGain_manager(toAnalyze.text, argo.info, message.forward_date * 1000).then((smugg_res) => {
                            return argo_resolve({
                                toSend: smugg_res,
                                toDelete: { chat_id: message.chat.id, mess_id: message.message_id }
                            });
                        });
                    }

                } else { // SOLO plus
                    if (line.startsWith("posizione in globale")) {

                        let res_text = "🌍 *Impresa Globale*\n";
                        let now_date = new Date(Date.now());
                        let month_parse = getMonthString(now_date);
                        res_text += `_${month_parse.article}${month_parse.name} ${now_date.getFullYear()}_ \n\n`;

                        let to_save_array = [];
                        let out_of_list = [];

                        for (let i = 1; i < all_lines.length; i++) {
                            let pos = parseInt(all_lines[i].substring(all_lines[i].indexOf(" alla posizione ") + 16, all_lines[i].indexOf(" con ")));
                            console.log(pos)
                            let nick;
                            let point = -1;
                            let is_gaining = 0;

                            if (isNaN(pos)) {
                                nick = all_lines[i].substring(all_lines[i].indexOf("> ") + 2, all_lines[i].indexOf(" non ")).trim();
                                if (nick == toAnalyze.from.username.toLowerCase()) {
                                    res_text += `⌾ `;
                                }
                                let random_array = ["🧚‍♂️", "🐰", "🐡", "🐌", "🦗", "🐭", "🦜", "🐮", "🐔", "🐓"];
                                pos = -1;
                                res_text += `> \`${nick}\` ${random_array[Math.ceil(Math.random() * (random_array.length)) - 1]}\n`;
                            } else {
                                point = parseInt(all_lines[i].substring(all_lines[i].indexOf(" con ") + 5, all_lines[i].indexOf(" punti")).split(".").join(""));
                                if (isNaN(point)) {
                                    point = 0;
                                }
                                nick = all_lines[i].substring(all_lines[i].indexOf("> ") + 2, all_lines[i].indexOf(" alla ")).trim();

                                if (point >= (globalInfos.global_cap/globalInfos.global_members)) {
                                    res_text += `✓ `;
                                    is_gaining = 1;
                                } else {
                                    res_text += `✗ `;
                                }

                                res_text += `_${i}°_ `;
                                if (nick == toAnalyze.from.username.toLowerCase()) {
                                    res_text += `⌾ `;
                                }
                                res_text += `\`${nick}\` (*${pos}°*, ${point})\n`;
                            }
                            let curr_id = 0;

                            for (let i = 0; i < globalArgonauts.length; i++) {
                                if (globalArgonauts[i].nick.toLowerCase() == nick) {
                                    curr_id = globalArgonauts[i].id;
                                    break;
                                }
                            }
                            if (curr_id != 0) {
                                let now_date = Math.floor(Date.now() / 1000);
                                to_save_array.push([curr_id, `${pos}:${point}:${now_date}`, is_gaining]);
                            } else {
                                out_of_list.push(nick);
                            }

                        }

                        return updateMultipleGlobalPos(to_save_array).then(function (save_esit) {
                            if (save_esit == false) {
                                res_text += "\n\n🤖 *woops!*\nNon sono riuscito ad aggiornare il db\n";
                            } else {
                                res_text += "\n\n🤖 *✓*\nAggiornata la posizione per " + to_save_array.length + " Argonauti\n";
                                if (out_of_list.length == 1) {
                                    res_text += `${out_of_list[0]} si deve ancora presentare`;
                                } else if (out_of_list.length > 0) {
                                    res_text += `${out_of_list.length} non si sono mai presentati:\n`;
                                    for (let i = 0; i < out_of_list.length; i++) {
                                        res_text += `· @${out_of_list[i]}\n`;

                                    }

                                }
                            }
                            res.toSend = simpleMessage(res_text, message.chat.id);
                            //res.toSend.options.reply_to_message_id = message.message_id;
                            res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                            if (replyT) {
                                return argo_resolve([res, { toDelete: { chat_id: message.chat.id, mess_id: message.reply_to_message.message_id } }]);
                            } else {
                                return argo_resolve(res);
                            }
                        });



                    } else if (line.endsWith("figurine doppie:")) {
                        return figu_manager.figuDoppie(all_lines, argo.info).then(function (check_res) {

                            console.log("Ritorno con: " + check_res);
                            let res_text = "🃏 *Gestore Scambi*\n\n";
                            if (check_res === -1) {
                                res_text += "Spiacente!\nQualche bug m'ha impedito di aggiornare i tuoi dati.\nSe puoi, segnala a @nrc382 l'errore FDW:1";
                            } else if (check_res === -2) {
                                res_text += "Woops!\nPer paragonare la lista delle figurine di qualcun'altro devo prima conoscere le tue...";
                            } else if (check_res === -3) {
                                res_text += "Woops!\nNon sono riuscuto a parsare la lista...\nSe puoi, segnala a @nrc382 l'errore FDR:1";
                            } else {
                                if (check_res === true) {
                                    res_text += "Lista dei doppioni: *Aggiornata*\n";
                                } else {
                                    if (check_res.match.length > 0) {
                                        res_text += "> _Mima_ (" + check_res.missing.length + ")\n";
                                        for (let i = 0; i < check_res.missing.length; i++) {
                                            res_text += `> \`${check_res.missing[i].name} (${check_res.missing[i].rarity}, ${check_res.missing[i].quantity})ß\n`;
                                        }

                                        res_text += "> Célo (" + check_res.match.length + ")\n";
                                    } else {
                                        res_text += "Da quello che so, non hai nessuna di queste figurine...\n\n";
                                        for (let i = 0; i < check_res.missing.length; i++) {
                                            res_text += `> \`${check_res.missing[i].name}\` (${check_res.missing[i].rarity}, ${check_res.missing[i].quantity})\n`;
                                        }
                                    }
                                }
                            }
                            res.toSend = simpleMessage(res_text, message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                            return argo_resolve(res);
                        });
                    } else if (line.match(", hai raggiunto")) {
                        if (((Date.now() / 1000) - toAnalyze.date) > 3 * 60) {
                            res.toSend = simpleMessage("Il messaggio citato è troppo vecchio!", message.chat.id);
                            return argo_resolve(res);
                        }
                        let name = toAnalyze.text.substring(0, toAnalyze.text.indexOf(", "));
                        let pos = parseInt(toAnalyze.text.substring(toAnalyze.text.indexOf(",") + " hai raggiunto la posizione ".length, toAnalyze.text.indexOf(" con")));
                        let point = parseInt(toAnalyze.text.substring(toAnalyze.text.indexOf(" con ") + " con ".length, toAnalyze.text.indexOf(" punti ")).split(".").join(""));
                        let stampTime = Math.round(Date.now() / 1000);
                        let toSave = pos + ":" + point + ":" + stampTime;
                        let isGaining = toAnalyze.text.match("NON verrà") ? 0 : 1;
                        if (checkArgonaut(name).isArgonaut == false) {
                            res.toSend = simpleDeletableMessage(name + " non mi risulta sia Argonauta...", message.chat.id);
                        } else {
                            let text = "🌍 *Impresa Globale*\n";
                            let now_date = new Date(Date.now());
                            let month_parse = getMonthString(now_date);
                            text += `_${month_parse.article}${month_parse.name} ${now_date.getFullYear()}_ \n\n`;
                            let last_textPart = "";
                            return getGlobalPos(name).then(function (get_res) {
                                if (get_res != false && get_res[0].global_pos != null && typeof get_res[0].nick != 'undefined') {
                                    let lastPos_date = new Date(get_res[0].global_posDate * 1000);
                                    if (lastPos_date.getMonth() < now_date.getMonth()) {
                                        last_textPart = "\n🌱 È la prima volta che mandi /posizione questo mese.";
                                    } else {


                                        let time_difference = stampTime - parseInt(get_res[0].global_posDate);
                                        let pos_difference = pos - parseInt(get_res[0].global_pos);
                                        let point_difference = point - parseInt(get_res[0].global_posPoint);

                                        if (pos_difference == 0) {
                                            last_textPart += "\n💪 ";
                                            if (time_difference < 60) {
                                                last_textPart += "Incredibilmente, non hai perso posizioni in questi ultimi " + Math.round((time_difference + 2)) + " secondi\n";
                                            } else {
                                                if (time_difference < 3600) {
                                                    last_textPart += "Non hai perso posizioni in questi ultimi " + Math.round((time_difference / 60) + 1) + " minuti\n";
                                                } else if (time_difference > 3600) {
                                                    last_textPart += "Non hai perso posizioni in questi ultime " + Math.round((time_difference / 3600) + 1) + " ore,";

                                                    if (isGaining == 1) {
                                                        last_textPart += " ottimo direi!\n";
                                                    } else {
                                                        last_textPart += " tantomeno ne hai guadagnate... ";
                                                        if (point_difference <= 0) {
                                                            last_textPart += "non ti starai mica arrendendo?\n";
                                                        } else {
                                                            last_textPart += "bisogna _spingere di più!_\n";
                                                        }
                                                    }

                                                }
                                            }

                                        } else if (pos_difference > 0) {
                                            if (pos_difference < 10) {
                                                last_textPart += "\n🙁 ";
                                            } else {
                                                last_textPart += "\n😞 ";
                                            }
                                            if (pos_difference == 1) {
                                                last_textPart += "Hai perso una posizione";
                                            } else {
                                                last_textPart += "Hai perso " + pos_difference + " posizioni";
                                            }
                                        } else if (pos_difference < 0) {
                                            if (pos_difference > -10) {
                                                last_textPart += "\n🙂 ";
                                            } else {
                                                last_textPart += "\n☺️ ";
                                            }
                                            if (pos_difference == -1) {
                                                last_textPart += "Hai guadagnato una posizione";
                                            } else {
                                                last_textPart += "Hai guadagnato " + Math.abs(pos_difference) + " posizioni";
                                            }
                                        }

                                        if (pos_difference != 0) {
                                            if (time_difference < 61) {
                                                last_textPart += ", in pochi secondi!\n"
                                            } else {
                                                if (time_difference < 3600) {
                                                    last_textPart += ", in *" + Math.round((time_difference + 60) / 60) + "* minuti circa\n";
                                                } else {
                                                    last_textPart += ", in *" + Math.round(time_difference / 3600) + "* ore circa\n";
                                                }
                                            }
                                        }
                                        if (point_difference > 0) {
                                            last_textPart += " (*+" + point_difference + "* punti)\n";
                                        }

                                        if (isGaining == 1) {

                                        } else {

                                        }
                                    }
                                }

                                return updateGlobalPos(argo.info.id, toSave, isGaining).then(function (update_res) {
                                    console.log("Devo salvare? " + update_res);

                                    if (update_res == true) {
                                        let time = new Date(stampTime * 1000);
                                        if (!message.from.is_bot && name == message.from.username) {
                                            name = "Aggiornata la tua posizione, " + String(argo.info.nick).split("_").join("\\_") + "\n";
                                        } else {
                                            name = "Aggiornata la posizione di " + String(name).split("_").join("\\_");
                                        }
                                        if (isGaining == 1) {
                                            name = "⊕ " + name + "\n\n✅ ";
                                        } else {
                                            name = "⊖ " + name + "\n\n❌ ";
                                        }
                                        text += name + "*" + pos + "°* con " + point + "pt alle " + String("0" + time.getHours()).slice(-2) + ":" + String("0" + time.getMinutes()).slice(-2) + "\n" + last_textPart;
                                        res.toSend = simpleMessage(text, message.chat.id);
                                        res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                                    } else {
                                        res.toSend = simpleMessage("Problemi...", message.chat.id);
                                    }
                                    console.log(res);
                                    return argo_resolve([res, { toDelete: { chat_id: message.chat.id, mess_id: toAnalyze.message_id } }]);
                                });
                            });
                        }
                    } else if (message.chat.type == "private" && line.match("risultati ricerca di ")) {
                        items_manager.updateSellPrice(argo, lowercaseText.split(" "), toAnalyze.text.split("\n")).then(function (update_res) {
                            res.toSend = simpleMessage(update_res, message.chat.id);
                            if (message.chat.id != message.from.id) { //elimina se non in privata
                                res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                            }
                            console.log(update_res);
                            argo_resolve(res);
                        });
                    } else if (quote_pos >= 0 && all_lines.length > 1 && all_lines[1].substring(0, 5) == "monet") {
                        return parseMana(toAnalyze.text, true, message.chat.id, message.from.username).then(function (parse_res) {
                            console.log("Torno con: " + (typeof parse_res));
                            console.log(parse_res);
                            if (parse_res != null) {
                                let to_res = [];
                                if (Array.isArray(parse_res)) {
                                    res.toSend = parse_res[0];
                                    res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                                    to_res.push(res);
                                } else {
                                    res.toSend = parse_res;
                                    res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                                    to_res.push(res);
                                    to_res.push({ toDelete: { chat_id: message.chat.id, mess_id: toAnalyze.message_id } });
                                }

                                return argo_resolve(to_res);
                            }
                        });
                    } else if (line.match(" possiedi troppi oggetti")) {
                        return compareItems(toAnalyze.text.split("\n"), argo.info).then(function (compare_res) {
                            res.toSend = simpleMessage(compare_res, message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                            return argo_resolve(res);
                        });
                    } else if (message.text != "/stima" && message.text != "/valuta" && quote_pos >= 0 && !message.text.match("negoz") && line.match("possiedi ")) {
                        let split_array = toAnalyze.text.split("\n");
                        let tmp_name = split_array[0].split(" ")[0].split(",").join("");
                        if (tmp_name.toLowerCase() != argo.info.nick.toLowerCase()) {
                            res.toSend = simpleMessage("*Mumble...* 🎒\n\n_È tutta robba tua quella, ve?_", message.chat.id);
                            return argo_resolve(res);
                        } else {
                            if (line.indexOf("figurine") > 0) {
                                let rarità = parseInt(line.substring(line.indexOf("rarità") + 7, line.indexOf(":")));
                                if (isNaN(rarità)) {
                                    res.toSend = simpleMessage("🃏 *Woops...* \n\n_Non sono riuscito a riconoscere la rarità della lista. Se puoi segnala a @nrc382_", message.chat.id);
                                    return argo_resolve(res);
                                } else {
                                    split_array.shift();
                                    res.toSend = figu_manager.figuDiff(split_array, rarità);
                                    res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                                    return argo_resolve(res);

                                }

                            }
                            return zainoFreshUpdate(argo.info.id, split_array).then(function (updateZaino_res) {
                                res.toSend = simpleMessage(updateZaino_res.text, message.chat.id);
                                if (updateZaino_res.esit == true) {
                                    res.toDelete = { chat_id: message.chat.id, mess_id: toAnalyze.message_id };
                                }

                                argo_resolve(res);

                            });
                        }
                    }
                }
            }

            if (0 == lowercaseText.indexOf("/")) { // iniziano con comando
                let start_comand = lowercaseText.split(" ")[0];
                if (start_comand == "/init" && message.from.id == theCreator) {
                    return items_manager.loadAllItems().then(function (loadAll_res) {
                        return argo_resolve();
                    });
                } else if (start_comand == "/help" || start_comand == "/aiuto") {
                    let generalHelp = manualGeneralPage((message.chat.id != message.from.id));
                    res.toSend = simpleMessage(generalHelp.messageText, message.chat.id);
                    res.toSend.options.reply_markup = generalHelp.replyMarkup;
                    return argo_resolve(res);

                } else if (!replyT && start_comand == "/spia") {
                    let array = message.text.trim().split(" ");
                    if (array.length < 2) {
                        res.toSend = simpleMessage("👁‍🗨 *Spia Anonimamente*\n\nRicerca di un nome giocatore (anche parziale) nel database di LootBot, ottenendo informazioni sul suo team.\nPer non sovrapporsi a quello del plus, non può essere mandato in risposta.\n💡 Completa il comando con il _nickname_ di un utente", message.chat.id);
                        return argo_resolve(res);
                    } else {
                        if (array[1].charAt(0) == "@") {
                            array[1] = array[1].substring(1, array[1].length);
                        }
                        return anonymousSpia(array[1], false).then(function (aspia_res) {
                            if (aspia_res.length > 1) {
                                res.toSend = simpleMessage(aspia_res[1], message.chat.id);
                                if (typeof message.reply_to_message_id != 'undefined')
                                    res.toSend.options.reply_to_message_id = message.reply_to_message.message_id;
                            } else {
                                res.toSend = simpleMessage("mumble", message.chat.id);

                            }
                            return argo_resolve(res);
                        });
                    }
                } else if (start_comand == "/bimbi") {
                    res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                    res.toSend = simpleMessage("_Eh!\nSiamo nel mondo dei bimbi..._", message.chat.id);
                    if (typeof message.reply_to_message_id != 'undefined')
                        res.toSend.options.reply_to_message_id = message.reply_to_message.message_id;

                    argo_resolve(res);

                } else if (start_comand == "/bug") {
                    res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                    if (argo.info.id != theCreator) {
                        res.toSend = simpleMessage("Il Buggetto sei tu, " + argo.info.nick.split("_").join("\\_") + "... 😘\n(Risolto?)", message.chat.id);
                    } else if (argo.info.id == theCreator) {
                        res.toSend = simpleMessage("Buggetto 😘\n(Risolto!)", message.chat.id);
                    }
                    if (message.reply_to_message_id != 'undefined')
                        res.toSend.options.reply_to_message_id = message.reply_to_message_id;

                    return argo_resolve(res);

                } else if (start_comand == "/aggiornapos") {
                    res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                    return getTooOldGlobalInfos().then(function (tooOld_res) {
                        let text = "";
                        if (tooOld_res == null) {
                            res.toSend = simpleMessage("Non ho info aggiornate per alcun argonauta... dovrei taggarli tutti!", message.chat.id);
                        } else {
                            if ((tooOld_res.length / 4) < 1) {
                                res.toSend = simpleMessage("💪 *Alle Armi!*\n\n" + message.from.username.split("_").join("\\_") + " incita i prigri Argonauti ad aggiornare la loro posizione in Globale\n\n" + tooOld_res.join("\n"), message.chat.id);
                            } else {
                                res = [];
                                res.push({ toSend: simpleMessage("💪 *Alle Armi!*\n\n" + message.from.username.split("_").join("\\_") + " incita i prigri Argonauti ad aggiornare la loro posizione in Globale", message.chat.id) });

                                for (let i = 0; i < tooOld_res.length; i++) {
                                    text += tooOld_res[i];

                                    if ((i + 1) % 4 == 0) {
                                        res.push({ toSend: simpleMessage(text, message.chat.id) });
                                        text = "";
                                    }
                                }
                            }
                        }
                        argo_resolve(res);
                    });

                } else if (start_comand == "/spia") {
                    res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                    if (replyT) {
                        let mess = "";
                        if (message.reply_to_message.from.is_bot == true) {
                            if (message.reply_to_message.from.username == "AldegliArgonautiIlBot") {
                                mess = "👁‍🗨 " + String(message.from.username).split("_").join("\\_") + " ha provato a spiarmi\n...ok!";
                            } else {
                                mess = "👁‍🗨 " + String(message.from.username).split("_").join("\\_") + " ha provato a spiare *" + String(message.reply_to_message.from.username).split("_").join("\\_") + "*\n...ok!";
                            }
                        } else {
                            mess = "👁‍🗨 " + String(message.from.username).split("_").join("\\_") + " ha spiato *" + message.reply_to_message.from.username + "*";
                        }
                        res.toSend = simpleMessage(mess, message.chat.id);
                    }
                    return argo_resolve(res);
                } else if (start_comand == "/cerca") {
                    if (message.text.toLowerCase().match("albanese")) {
                        res.toSend = simpleMessage("*Scappato!*\n_L'albanese non lo acciuffi..._", message.chat.id);
                        return argo_resolve(res);
                    }
                    let question_array = message.text.trim().split(" ");
                    if (question_array.length < 2) {
                        res.toSend = simpleMessage("Completa il comando con il nome di un craftato o una rarità.\n_Es: /cerca NC_", message.chat.id);
                        argo_resolve(res);
                    } else {
                        question_array.shift();

                        let object_array = parseCraftQuestion(question_array.join(" "));
                        //console.log(object_array);
                        let matched_items = [];
                        let tmp_parse;
                        let tmp_items;
                        let res_string = "🔍 *Ricerca Manuale*\n";

                        for (let i = 0; i < object_array.length; i++) {
                            tmp_parse = parseImputSearch(object_array[i].partial_name.split(" "));
                            tmp_items = items_manager.quick_itemFromName(tmp_parse.imput_name, tmp_parse.rarity_index, tmp_parse.res_count, null, tmp_parse.craftable);
                            matched_items = matched_items.concat(tmp_items);
                        }
                        if (matched_items.length == 0) {
                            res_string += "Nessun risultato per:\n";
                            res_string += "`" + question_array.join(" ") + "`";

                        } else {
                            if (matched_items.length == 1) {
                                res_string += "Un risultato:\n";
                            } else {
                                res_string += matched_items.length + " risultati:\n\n";
                            }

                            if (matched_items.length < 6) {
                                for (let j = 0; j < matched_items.length; j++) {
                                    res_string += "\n" + items_manager.printItem(matched_items[j]) + "\n";
                                }
                            } else {
                                let all_splitted = [];
                                for (let i = 0; i < items_manager.all_rarity.length; i++) {
                                    recursiveRaritySplit(all_splitted, items_manager.all_rarity[i], matched_items);
                                }

                                for (let i = 0; i < all_splitted.length; i++) {
                                    if (all_splitted[i].array.length > 0) {
                                        res_string += "Rarità: *" + all_splitted[i].rarity + "*\n"
                                        for (let j = 0; j < all_splitted[i].array.length; j++) {
                                            res_string += "> " + all_splitted[i].array[j].name + "\n\t\t• " + edollaroFormat(all_splitted[i].array[j].market_medium_value) + "\n";
                                        }
                                        res_string += "\n";
                                    }
                                }


                            }
                        }

                        res.toSend = simpleMessage(res_string, message.chat.id);
                        return argo_resolve(res);

                    }
                } else if (start_comand == "/crea") {
                    let question = lowercaseText.split(" ").slice(1);
                    let zaino_bool = true;
                    if (question.length <= 0) {
                        let info_text = "🛠 *Let's make...,* \n_Automatizza il processo di craft!_\n\n";
                        info_text += "Scrivi:";
                        info_text += "\n> Il nome (anche parziale) di uno o più oggetti, puoi specificare le singole quantità dopo i _due punti_";
                        info_text += "\n> Una o più rarità (ne considererò tutti i _creabili_)";
                        info_text += "\n\n• Es: `/crea crios:2, lama UR:3, NC`\n";
                        info_text += "  _creerà la linea per: 2x Armatura Crios, 3x Lama Fusa e tutti i creati di rarità NC_\n\n"
                        info_text += "\n\nPotrai seguire la linea dei craft inline nella chat con @lootgamebot\n";
                        info_text += "\n> Prova anche i comandi /craft, e /necessari";
                        info_text += "\n> Ricorda: il crafter è anche inline con la stessa sintassi iniziando la query con \"crea\"!";
                        res.toSend = simpleMessage(info_text, message.chat.id);
                        return argo_resolve(res);
                    }
                    if (question.indexOf("no") >= 0 && question.indexOf("no") < question.indexOf("zaino")) {
                        zaino_bool = false;
                        for (let i = 0; i < question.length; i++) {
                            if (question[i] == "no" || question[i] == "zaino") {
                                question[i] = "";
                            }
                        }
                    }
                    console.log("Chiesto crea per: [" + question.join(", ") + "]");
                    return manageCraftQuestion(question, argo.info, zaino_bool).then(function (craft_question) {
                        if (craft_question.esit != true) {
                            res.toSend = simpleMessage("Mumble...", message.chat.id);
                            return argo_resolve(res);
                        } else {
                            return saveCraftListForUser(craft_question.craft_list, argo.info.id).then(function (save_esit) {
                                console.log("> Salvate info per: " + argo.info.nick + " " + save_esit);
                                let res_text = "";
                                res_text = getCurrCraftDetails(craft_question.craft_list, argo.info);

                                res.toSend = simpleDeletableMessage(message.chat.id, true, res_text);//simpleMessage(res_text, message.chat.id);
                                let has_craftedImpact = checkPreserveNeeds(craft_question.craft_list.impact.crafted, craft_question.craft_list.root_item);

                                giveDetailBotton(res.toSend.options, craft_question.craft_list.missingItems_array.length, craft_question.craft_list.impact.base.length, craft_question.craft_list.impact.crafted.length, has_craftedImpact);

                                return argo_resolve(res);;

                            });
                        }

                    });
                } else if (start_comand == "/posizione") {
                    //res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                    if (Math.round(1 + Math.random() * 88) == 3) {
                        let mess = message.from.username + ", hai raggiunto la posizione *a pecora* nell'Impresa Globale in corso!";
                        res.toSend = simpleMessage(mess, message.chat.id);
                    }
                    argo_resolve(res);
                } else if (start_comand == "/stima" || start_comand == "/valuta") {
                    return estimateList(toAnalyze, argo.info, toAnalyze.chat.id).then(function (estimate_res) {
                        res.toSend = estimate_res;
                        return argo_resolve(res);
                    });

                } else if (start_comand == "/fabbro" || start_comand.match("/craft")) {
                    if (lowercaseText.match("imput")) {
                        if (argo.info.is_crafting == 0) {
                            res.toSend = simpleDeletableMessage(argo.info.id, true, "*Woops!*\n\nPosso restituirti l'imput solo per la linea craft che stai seguendo. Usa il comando /crea");
                            return argo_resolve(res);
                        } else {
                            return loadCraftList(argo.info.id).then(function (on_disk) {
                                let res_text = "*Imput (per testing)*\n_Puoi controllare la linea attuale con /craft_\n\n";
                                res_text += "`[\n";//+"]`";
                                for (let i = 0; i < on_disk.craft_list.root_item.length; i++) {
                                    res_text += "\t{\n\t\tid: " + on_disk.craft_list.root_item[i].id + ",\n\t\tquantity: " + on_disk.craft_list.root_item[i].quantity + "\n\t}";
                                    if ((i + 1) < on_disk.craft_list.root_item.length) {
                                        res_text += ",";
                                    }
                                    res_text += "\n";
                                }
                                res_text += "]`";
                                res.toSend = simpleDeletableMessage(argo.info.id, true, res_text);
                                return argo_resolve(res);
                            });
                        }
                    }

                    let chat_id = argo.info.id;
                    console.log("> membri nella chat: " + chat_members);
                    if (chat_members > 1 && chat_members <= 5) {
                        chat_id = message.chat.id;
                    }

                    return manageCraftCommand(argo.info, lowercaseText, chat_id).then(function (craftcmd_res) {
                        res.toSend = craftcmd_res;
                        return argo_resolve(res);
                    });
                } else if (start_comand.match("/chiedoaiuto")) {
                    res.toSend = simpleMessage("🛡 *Dungeon* da " + argo.info.nick.split("_").join("\\_"), message.chat.id);
                    res.toSend.options.reply_markup = {};
                    res.toSend.options.reply_markup.inline_keyboard = [[
                        { text: "Ci sono!", callback_data: 'ARGO:DUNGEON:REQUEST:' + argo.info.nick }
                    ]];
                    res.toSend.options.reply_to_message_id = message.message_id;

                    return argo_resolve(res);
                } else if (start_comand.match("/contra")) {
                    return smugglerGain_stats("PERSONAL", message.from, message.chat.id).then((toSend_res) => {
                        console.log(toSend_res);
                        res.toSend = toSend_res;
                        res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };

                        return argo_resolve(res);
                    });
                } else if (words_count > 1 && start_comand.match("/nec")) {
                    return manageCraftNeeds(argo.info, lowercaseText.split(" ")).then(function (craft_needs_res) {
                        res.toSend = simpleMessage(craft_needs_res.text, message.chat.id);
                        if (craft_needs_res.needs > 0) {
                            res.toSend.options.reply_markup = {};
                            res.toSend.options.reply_markup.inline_keyboard = [];
                            res.toSend.options.reply_markup.inline_keyboard.push([{
                                text: "Negozi",
                                callback_data: 'ARGO:NEGOZI:MAKE'
                            }]);

                            res.toSend.options.reply_markup.inline_keyboard.push([{
                                text: "Chiedi nel Porto",
                                callback_data: 'ARGO:CRAFT:ASK'
                            }]);
                        }

                        argo_resolve(res);
                    });
                } else if (start_comand == "/info" && lowercaseText.match(" contr")) {
                    return getAllSmugglerItem().then(function (smugglerItems) {
                        console.log(smugglerItems);

                        res.toSend = simpleMessage(smugglerItems, message.from.id);

                        argo_resolve(res);
                    });
                } else if (start_comand == "/valorezaino") {
                    return calcValueOfZaino(argo.info).then(function (res_message) {
                        res.toSend = simpleDeletableMessage(message.chat.id, true, res_message);
                        return argo_resolve(res);
                    });

                } else if (start_comand.match("zaino")) {
                    let condition = true;
                    // if (chat_members > 4) {
                    //     condition = lowercaseText.match("al");
                    // }
                    if (condition) {
                        let rarity = lowercaseText.split(" ")[1];
                        let res_text = "*Il tuo Zaino salvato* 🎒\n";
                        if (typeof rarity == "undefined") {
                            return getZainoFor(argo.info.id).then(function (loaded) {
                                res_text += "_riassunto per rarità_\n\n";
                                res_text += "> D: " + (loaded.draconici_copyes) + "\n";
                                res_text += "> C: " + (loaded.comuni_copyes) + "\n";
                                res_text += "> NC: " + (loaded.non_comuni_copyes) + "\n";
                                res_text += "> R: " + (loaded.rari_copyes) + "\n";
                                res_text += "> UR: " + (loaded.ultra_rari_copyes) + "\n";
                                res_text += "> L: " + (loaded.leggendari_copyes) + "\n";
                                res_text += "> E: " + (loaded.epici_copyes) + "\n";
                                res_text += "> UE: " + (loaded.ultra_epici_copyes) + "\n";
                                res_text += "> U: " + (loaded.unici_copyes) + "\n";
                                res_text += "> X: " + (loaded.x_copyes) + "\n";
                                res_text += "`——————`\n";
                                res_text += "> S: " + (loaded.speciali_copyes) + "\n";
                                res_text += "> IN: " + (loaded.inestimabili_copyes) + "\n";
                                if (loaded.artefatti) {
                                    res_text += "> A: " + loaded.artefatti.length + "\n";
                                }

                                res_text += "\n• Oggetti: " + loaded.all_elements + "\n";
                                res_text += "• Copie: " + loaded.all_copyes + "\n";



                                res_text += "\n• Per visualizzare il dettaglio, usa una delle sintassi:\n> `/zaino` rarità\n> `/zaino` nomeParziale";
                                res.toSend = simpleDeletableMessage(message.chat.id, true, res_text);
                                return argo_resolve(res);
                            });
                        } else if (items_manager.all_rarity.indexOf(rarity.toUpperCase()) < 0) {
                            let query = lowercaseText.split(" ").splice(1).join(" ");
                            let matched_items = items_manager.quick_itemFromName(query, false);
                            if (matched_items.length == 0) {
                                res.toSend = simpleDeletableMessage(message.chat.id, true, "*Woops!*\n\nNon ho riconoscito alcun oggetto da: `" + query + "`");
                                return argo_resolve(res);
                            } else {
                                let items_array = [];
                                for (let i = 0; i < matched_items.length; i++) {
                                    items_array.push([argo.info.id, matched_items[i].id]);
                                }
                                return getZainoItemsFor(items_array).then(function (zaino_res) {
                                    let res_string = "*Nel tuo Zaino *🎒\n\n";
                                    let existingItems_array = [];
                                    let others_array = [];

                                    for (let i = 0; i < matched_items.length; i++) {
                                        let found = false;
                                        for (let j = 0; j < zaino_res.length; j++) {
                                            if (zaino_res[j].item_id == matched_items[i].id) {
                                                matched_items[i].quantity = zaino_res[j].item_quantity;
                                                found = true;
                                                existingItems_array.push(matched_items[i]);
                                                break;
                                            }
                                        } if (found == false) {
                                            others_array.push(matched_items[i]);
                                        }
                                    }

                                    if (existingItems_array.length <= 0) {
                                        res_string += "• Non mi risulta tu abbia alcun oggetto per: `" + query + "`\n";
                                    } else if (existingItems_array.length <= 5) {
                                        for (let j = 0; j < existingItems_array.length; j++) {
                                            if (existingItems_array[j].craftable == 0) {
                                                res_string += "> " + existingItems_array[j].name + " (" + existingItems_array[j].quantity + ")\n";
                                            } else {
                                                res_string += "✓ " + existingItems_array[j].name + " (" + existingItems_array[j].quantity + ")\n";
                                            }
                                        }
                                    } else {
                                        let all_splitted = [];
                                        for (let i = 0; i < items_manager.all_rarity.length; i++) {
                                            recursiveRaritySplit(all_splitted, items_manager.all_rarity[i], existingItems_array);
                                        }

                                        for (let i = 0; i < all_splitted.length; i++) {
                                            if (all_splitted[i].array.length > 0) {
                                                res_string += "Rarità: *" + all_splitted[i].rarity + "*\n"
                                                for (let j = 0; j < all_splitted[i].array.length; j++) {
                                                    if (all_splitted[i].array[j].craftable == 0) {
                                                        res_string += "> " + all_splitted[i].array[j].name + " (" + all_splitted[i].array[j].quantity + ")\n";
                                                    } else {
                                                        res_string += "✓ " + all_splitted[i].array[j].name + " (" + all_splitted[i].array[j].quantity + ")\n";
                                                    }
                                                }
                                                res_string += "\n";
                                            }
                                        }
                                    }
                                    if (others_array.length > 0) {
                                        res_string += "\n• Match che non hai: `" + others_array.length + "`\n";
                                    }

                                    res.toSend = simpleDeletableMessage(message.chat.id, true, res_string);
                                    return argo_resolve(res);

                                });
                            }
                        } else {
                            return showZainoForRarity(argo.info, rarity, "CR").then(function (mess_res) {
                                res.toSend = mess_res;
                                return argo_resolve(res);
                            });
                        }
                    }
                } else if (from.id == theCreator && start_comand == ("/aggiorna")) {
                    console.log("Aggiorno... (?)");
                    return items_manager.fillerCoatto(argo, lowercaseText.split(" ")).then(function (filler_res) {
                        if (filler_res) {

                            if (typeof filler_res == "string") {
                                res.toSend = simpleMessage(filler_res, message.chat.id);
                            } else {
                                let text = "🙂 *Grazie!*\n\nAggiornate info per:\n> " + filler_res.name
                                if (!filler_res.craftable) {
                                    text += " (*Base*)";
                                }
                                text += "\n> ID: " + filler_res.id + "\n";
                                if (typeof (filler_res.is_used_for) != "undefined") {
                                    console.log(filler_res.is_used_for);
                                    if (filler_res.craftable) {
                                        text += "\nNecessario per ";
                                    }
                                    if (!filler_res.is_used_for || filler_res.is_used_for.length == 0) {
                                        //text += "nulla!";
                                    } else {
                                        text += filler_res.is_used_for.length + "oggetti\n[" + filler_res.is_used_for.toString() + "]";
                                    }
                                }
                                res.toSend = simpleMessage(text, message.chat.id);
                            }

                            argo_resolve(res);
                        }

                    });

                }


            } else {
                console.log("> Comandi secondari...");
                let entities = [];
                let text_array = lowercaseText.split("\n");
                line = text_array[0];

                let firstLine_array = line.split(" ");

                let mentionedUsers = [];
                if (typeof message.entities != "undefined") { // controllo Entities
                    entities = message.entities;
                    for (let i = 0; i < entities.length; i++) {
                        if (entities[i].type == "mention") {
                            console.log(entities[i]);
                            mentionedUsers.push(lowercaseText.substring(entities[i].offset + 1, entities[i].offset + entities[i].length));
                        }
                    }
                }



                if (message.chat.type == "private" || quote_pos >= 0) { //Messaggi citando Al o in privata
                    if (line.match("chi sono")) {
                        res.toSend = simpleMessage(whoami(message.from.id), message.chat.id);
                        res.toSend.options.reply_to_message_id = toAnalyze.message_id;
                        return argo_resolve(res);
                    } if (line.match("la kasta")) {
                        return argoTeamList().then(function (toSend) {
                            res.toSend = toSend;
                            res.toSend.options.reply_to_message_id = toAnalyze.message_id;
                            return argo_resolve(res);
                        });

                    } else if (line.match("conta ")) { //pietre o capsule
                        if (toAnalyze.text.indexOf("> Pietra ") > 0) {
                            let count = parsePietre(toAnalyze.text);
                            if (count.point > 0) {
                                res.toSend = simpleMessage("🐉\nSono " + count.point.toString() + " punti\n*" + (count.levels).toFixed(2) + "* lv. Drago", message.chat.id);
                            } else {
                                res.toSend = simpleMessage("Non c'è nemmeno un punto anima lì...", message.chat.id);
                            }
                            res.toSend.options.reply_to_message_id = toAnalyze.message_id;
                            if (message.from.id == 485089916) {
                                let tmp = res;
                                res = [];
                                let tmp2 = {};
                                tmp2.toSend = simpleMessage("Si ma tu non conti...", message.chat.id);
                                tmp2.toSend.options.reply_to_message_id = toAnalyze.message_id + 1;
                                res.push(tmp);
                                res.push(tmp2);

                            }
                            return argo_resolve(res);
                        } else {
                            return updateCapsulaCounter(toAnalyze).then(function (update_res) {
                                if (update_res > 0) {
                                    res.toSend = simpleMessage("*" + update_res + "* Scrigni capsula -> *" + update_res + "x* 💎\n😏", message.chat.id);
                                } else if (res == 0) {
                                    res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                                    res.toSend = simpleMessage("*" + String(message.from.username).split("_").join("\\_") + "* possiedi:\n▸ Nessuno Scrigno Capsula (💔)", message.chat.id);
                                } else {
                                    res.toSend = simpleMessage("Problemi, sempre problemi...", message.chat.id);
                                }
                                return argo_resolve(res);
                            });
                        }
                    } else if (line.match("negozi") && lowercaseText.length < 30) {
                        console.log(toAnalyze);
                        let fixedQ = lowercaseText.split(" ");
                        let drago_lv = false;

                        if (fixedQ.indexOf("di") > 0 && fixedQ.length >= fixedQ.indexOf("di") + 1) {
                            if (lowercaseText.match("dr") || lowercaseText.match("lv") || lowercaseText.match("liv")) {
                                drago_lv = parseFloat(fixedQ[fixedQ.indexOf("di") + 1]);
                                if (isNaN(drago_lv)) {
                                    drago_lv = true;
                                }
                            } else {
                                fixedQ = parseInt(fixedQ[fixedQ.indexOf("di") + 1].split(".").join(""));
                                if (isNaN(fixedQ)) {
                                    fixedQ = 1;
                                }
                            }
                        } else {
                            fixedQ = false;
                        }


                        if (replyT) {
                            text_array = message.reply_to_message.text.toLowerCase().split("\n");
                        } else if (!drago_lv) {
                            text_array = null;
                        }

                        let condition = text_array == null;

                        if (drago_lv != false) {
                            condition = false;
                        } else if (!condition) {
                            condition = text_array.length < 2 || !message.reply_to_message.text.match("> ");
                        }
                        console.log("message.message_id: " + message.message_id);

                        if (condition) {
                            res.toSend = simpleMessage("Posso creare stringhe di negozi da liste di oggetti.\n(prova anche `negozio di N`, specificando il numero di copie per ogni oggetto)", message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                        } else {
                            let parse = parseNegozi(text_array, fixedQ, drago_lv);
                            let resText;
                            if (parse.objects > 0) {
                                let first_part;
                                let second_part;
                                if (drago_lv == false) {
                                    first_part = parse.objects > 1 ? "\n\n*" + parse.objects + " oggetti*\n..." : "\n\n*Un oggetto*\n...";
                                    second_part = parse.copyes > 1 ? "_" + parse.copyes + " copie_\n\n" : "_una copia_\n\n";
                                } else {
                                    first_part = parse.objects > 1 ? "\n\n*" + parse.objects + " tipi di pietra*\n..." : "\n\n*Un tipo di pietra*\n...";
                                    second_part = (parse.copyes > 1 ? "_" + parse.copyes + " punti drago_" : "_un punto drago_") + " 🐉\n\n";
                                }

                                resText = parse.text + first_part + second_part;

                            } else {
                                resText = "Whoops!\nNon ho trovato nessun oggetto...";
                                if (parse.text.length > 0) {
                                    resText = parse.text;
                                }
                            }
                            res.toSend = simpleMessage(resText, message.from.id);
                        }
                        if (message.chat.type != "private") {
                            let in_group = simpleMessage("*Fatto!*\nT'ho mandato il messaggio in chat privata", message.chat.id);
                            in_group.options.reply_to_message_id = message.message_id;
                            return argo_resolve([res, { toSend: in_group }]);
                        } else {
                            res.toSend.options.reply_to_message_id = message.message_id;

                            if (!condition) {
                                res.toSend.options.reply_markup = {};
                                res.toSend.options.reply_markup.inline_keyboard = [[{
                                    text: "Chiedi nel Porto",
                                    callback_data: 'ARGO:CRAFT:ASK'
                                }]];
                            }

                            return argo_resolve(res);
                        }


                    } else if (line.match("bilancio")) {
                        let aUser = message.from.username;
                        let bUser = null;
                        if (replyT && (!line.match("per ") && !line.match("di "))) {
                            if (message.reply_to_message.from.is_bot) {
                                argo_resolve({ toSend: simpleMessage("M'hai chiesto il bilancio con un bot, " + aUser.split("_").join("\\_") + "?", message.chat.id) });
                            } else {
                                bUser = message.reply_to_message.from.username;
                            }
                        } else {
                            let the_index = lowercaseText.indexOf(" tra ");
                            if (the_index < 0) {
                                the_index = lowercaseText.indexOf(" fra ");
                            }

                            if (the_index > 0) {
                                aUser = message.text.substring((the_index + 5), message.text.indexOf(" e ")).trim();
                                bUser = message.text.substring(message.text.indexOf(" e ") + 3, message.text.length).trim();
                            } else if (lowercaseText.indexOf(" con ") > 0) {
                                bUser = message.text.substring(message.text.indexOf(" con ") + 5, message.text.length).trim();
                            } else if (lowercaseText.indexOf(" per ") > 0) {
                                bUser = message.text.substring(message.text.indexOf(" per ") + 5, message.text.length).trim();
                                aUser = null;
                            } else if (lowercaseText.indexOf(" di ") > 0) {
                                bUser = message.text.substring(message.text.indexOf(" di ") + 4, message.text.length).trim();
                                aUser = null;
                            }
                        }
                        console.log("> Chiesto bilancio tra " + aUser + " e " + bUser);
                        if (typeof message.reply_to_message != 'undefined' && typeof message.reply_to_message.forward_from != 'undefined') {
                            bUser = message.reply_to_message.forward_from.username;
                        }
                        if (bUser == aUser) {
                            return argo_resolve({ toSend: simpleMessage("M'hai chiesto il bilancio con te stesso, " + aUser.split("_").join("\\_") + "?", message.chat.id) });
                        }

                        return anonymousSpia(bUser, true).then(function (bUser_res) {
                            return getBilance(aUser, bUser_res, message.chat.id, "").then(function (res) {
                                return argo_resolve({ toSend: res });
                            });
                        });

                    } else if (line.match("tutti i ") && line.match(" craft")) {
                        return got.get("https://fenixweb.net:6600/api/v2/" + config.loot_token + "/items", { responseType: 'json' }).then(function (full_infos) {
                            let allItems = full_infos.body;
                            let text = "*Informazioni in tempo reale*\n\nIn Loot ci sono " + allItems.res.length + " oggetti,\n";
                            let craftable = [];
                            for (let i = 0; i < allItems.res.length; i++) {
                                if (allItems.res[i].craftable == "1") {
                                    craftable.push(allItems.res[i]);
                                }

                            }
                            if (craftable.length > 0) {
                                text += "E " + craftable.length + " sono craftabili.\n";
                            }
                            res.toSend = simpleMessage(text, message.chat.id);
                            return argo_resolve(res);
                        });
                    } else if (line.match("craft") && line.match("info")) {
                        let info_text = "🛠 *Let's make...,* \n_Automatizza il processo di craft!_\n\n";
                        info_text += "Scrivi:";
                        info_text += "\n> Il nome (anche parziale) di uno o più oggetti, puoi specificare le singole quantità dopo i _due punti_";
                        info_text += "\n> Una o più rarità (ne considererò tutti i _creabili_)";
                        info_text += "\n\nCreerò automaticamente la linea dei craft che potrai seguire inline nella chat con @lootgamebot\n";
                        info_text += "\n> Prova i comandi /crea, /craft, e /necessari";
                        info_text += "\n> Ricorda: il crafter è anche inline!";
                        res.toSend = simpleMessage(info_text, message.chat.id);
                        res.toSend.options.reply_to_message_id = message.message_id;

                        return argo_resolve(res);

                    } else if (line.match("globale") && line.match("info")) {
                        return getGlobalDetail().then(function (res_text) {
                            res.toSend = simpleMessage(res_text, message.chat.id);
                            return argo_resolve(res);
                        });
                    } else if (firstLine_array.indexOf("deposita") == 0) {
                        if (typeof message.reply_to_message.text != "string") {
                            res.toSend = simpleMessage("Usa questo comando in risposta ad un messaggio che sia una lista d'oggetti!", message.chat.id);

                        } else {
                            res.toSend = simpleMessage("Invia a LootBot...", message.chat.id);
                            let eco_text = manageDeposit(message.reply_to_message.text);
                            res.toSend.options.reply_markup = {
                                inline_keyboard: [[
                                    {
                                        text: "Deposita",
                                        switch_inline_query: "eco: " + eco_text

                                    }
                                ]]
                            };
                        }
                        return argo_resolve(res);

                    } else if (message.text.length < 25 && lowercaseText.match("chi") && lowercaseText.match("ispezion")) {
                        //res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                        return getIspezionabili(argo.rinascita).then(function (ispezionabili_res) {
                            res.toSend = simpleMessage(ispezionabili_res, message.chat.id);
                            argo_resolve(res);
                        });

                    } else if (line.match("chi sei") || line.match("come ti chiami")) {
                        let reply = [
                            "🤔\nE tu come ti chiami, " + toAnalyze.from.username + "???",
                            "😕\nMi prendi in giro?",
                            "... " + toAnalyze.from.username.split("").reverse().join(""),
                            "`Zorro` è il mio nome, che non lo sai?",
                            "Piacere, sono *" + toAnalyze.from.username.split("").reverse().join("") + "* _Il Rompiballe_"
                        ];
                        if (toAnalyze.from.username == "EmperorMaximo" || toAnalyze.from.username == "Mattitb") {
                            reply = [
                                "🤨\nE tu come ti chiami?",
                                "Maaa... e tu chi sei?"
                            ];
                        }
                        res.toSend = simpleMessage(reply[Math.floor(Math.random() * reply.length)], message.chat.id);
                        res.toSend.options.reply_to_message_id = message.message_id;
                        return argo_resolve(res);
                    } else if (line.match("bentornato")) {
                        res.toSend = simpleMessage("🤖❓⁉️\n\nÈ passato molto?", message.chat.id);
                        res.toSend.options.reply_to_message_id = message.message_id;
                        return argo_resolve(res);
                    } else if (line.match("offri") && words_count > 1 && firstLine_array[0] != "🎁") {
                        if (quote_pos >= 0) {
                            line = line.substring(line.indexOf("offri"), line.length);
                        }
                        let tmp_line_split = line.split(",");
                        let targetNick = "none";

                        if (tmp_line_split.length > 1 && tmp_line_split[1].trim().length > 1) {
                            targetNick = tmp_line_split[1].trim();
                            console.log("> targetNick: " + targetNick);

                            let allRegisteredArgonautsNames = [];

                            for (let i = 0; i < globalArgonauts.length; i++) {
                                allRegisteredArgonautsNames.push({ nick: globalArgonauts[i].nick, t_name: globalArgonauts[i].t_name });
                            }
                            let tmp_nick;
                            let tmp_tName;
                            for (let i = 0; i < allRegisteredArgonautsNames.length; i++) {
                                tmp_nick = allRegisteredArgonautsNames[i].nick.toLowerCase();
                                tmp_tName = allRegisteredArgonautsNames[i].t_name.toLowerCase()
                                if (tmp_nick.match(targetNick.toLowerCase()) || tmp_tName.match(targetNick.toLowerCase())) {
                                    targetNick = allRegisteredArgonautsNames[i].nick;
                                    break;
                                }
                            }
                        } else if (replyT) {
                            targetNick = toAnalyze.from.username;
                        }

                        console.log("> targetNick: " + targetNick);

                        if (targetNick != "none") {
                            line = tmp_line_split[0] + ", " + targetNick;
                        }

                        res.toSend = simpleMessage("🎁 *Offri oggetti*\n\n> Comando: `" + line + "`", message.chat.id);
                        res.toSend.options.reply_markup = {
                            inline_keyboard: [[{
                                text: "Passa all'inline",
                                switch_inline_query_current_chat: line
                            }]]
                        }
                        return argo_resolve(res);

                    } else if (quote_pos > 0 && firstLine_array[quote_pos + 1] == "è") {
                        let array = [
                            "Io sono un bravo Bot!",
                            "Lo prendo come un complimento",
                            "❤️❤️❤️"
                        ];
                        res.toSend = simpleMessage(array[Math.floor(Math.random() * array.length)], message.chat.id);
                        res.toSend.options.reply_to_message_id = message.message_id;
                        return argo_resolve(res);
                    } else {
                        if (line.match("ciao") || line.match("salve") || line.match("buon")) {
                            let reply = [
                                "Ciao Mondo!",
                                "Ciao a te, " + toAnalyze.from.username,
                                "Hey " + toAnalyze.from.username + "!",
                                toAnalyze.from.username + " _grandissssimo!_\nDimmi tutto",
                                "Ah!\nSei tu, " + toAnalyze.from.username + ". Se proprio devi..."
                            ];
                            if (toAnalyze.from.username == "EmperorMaximo" || toAnalyze.from.username == "Mattitb") {
                                reply = [
                                    "🤨\nE tu che voi?",
                                    "Cià, cià...\n(ora sta zitto!)" + toAnalyze.from.username,
                                    "Hey " + toAnalyze.from.username + ", ancora vivo?",
                                    toAnalyze.from.username + " _ma ancora che parli?_"
                                ];
                            }
                            res.toSend = simpleMessage(reply[Math.floor(Math.random() * reply.length)], message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                            return argo_resolve(res);
                        } else if (!forwardT && !inReplyOfMine && line.charAt(0) != "ⓘ") { //Liste Argonauti (per rinascita e team)
                            let argoBool = checkArgoQuestion(line);
                            console.log("> isArgoQuestion? " + argoBool);
                            if (argoBool != null) {
                                res.toSend = simpleMessage(argoBool, message.chat.id);
                                return argo_resolve(res);
                            } else {
                                return argo_resolve()
                            }
                        }

                    }
                } else {
                    //                    if (true) { //Math.round(1 + Math.random() * 9) <= 3
                    if (message.from.id == 399772013) { // bullizza matti
                        if (lowercaseText.indexOf("limone") >= 0) {
                            res.toSend = simpleMessage("Cane!", message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                            return argo_resolve(res);
                        }
                    } else if (mentionedUsers.length > 0) {
                        console.log(mentionedUsers);
                        let questionIndex = mentionedUsers.indexOf("pess4");
                        if (questionIndex >= 0) {
                            let message_text = "🚂\n\nStarà _rincorrendo treni..._";
                            if (mentionedUsers.length > 1) {
                                message_text += "\n(perlomeno il " + (questionIndex + 1) + "° che hai citato...)"
                            }
                            res.toSend = simpleMessage(message_text, message.chat.id);
                            return argo_resolve(res);
                        }
                    } else if ((lowercaseText != "si, ma edo...") && (lowercaseText.indexOf("edo") == 0 || lowercaseText.match(" edo "))) {
                        if ((1 + Math.random() * 10) <= 5) {
                            res.toSend = simpleMessage("Si, ma Edo...", message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                            return argo_resolve(res);
                        } else {
                            return argo_resolve([]);
                        }
                    } else if (message.from.id == 342918885) { // bullizza Jak
                        let text = "";
                        if (lowercaseText.indexOf("sfiga") >= 0 || lowercaseText.indexOf("sfortuna") >= 0) {
                            text += "Ma cosa ne sai tu di _sfiga_, vorrei sapere!";
                        } else if (lowercaseText.indexOf("fortuna") >= 0) {
                            text += "Ascoltatelo, sa quel che dice...";
                        }
                        if (text.length > 0) {
                            res.toSend = simpleMessage(text, message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                            return argo_resolve(res);
                        }
                    } else if (message.from.id == 430117468 || message.from.id == 211530362) { // bullizza EmperorMaximo e Gyonm
                        let random = [];
                        if (message.text.indexOf("scusa") >= 0) {
                            random = [
                                "Scusa un cazzo!",
                                "...pollo! 🐔",
                                "non ruggisci più è, galletto?!",
                                "Sei imbarazzante...",
                                "No comment",
                                "Non mi commuovi...",
                            ];
                            res.toSend = simpleMessage(random[Math.round(Math.random() * (random.length - 1))], message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                        } else if (Math.round(1 + Math.random() * 9) <= 3) {
                            random = [
                                "Ignoratelo, è solo un bug nel sistema...",
                                "Ssht, zitto tu!",
                                "🤔 Qualcuno ha parlato?\nHo sentito un _ronzio..._",
                                "Cos'è questo suono fastidioso?",
                                "Ancora che parli?",
                                "🤔 ...che palle ao! Ancora a parlà stai?",
                                "Bla, bla, bla...",
                                "_\"Non mi da fastidio, kek!\"_"
                            ];
                            res.toSend = simpleMessage(random[Math.round(Math.random() * (random.length - 1))], message.chat.id);
                            res.toSend.options.reply_to_message_id = message.message_id;
                        } else if (Math.round(1 + Math.random() * 8) <= 2) {
                            if (Math.round(1 + Math.random() * 2) == 2) {
                                res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                                res.toSend = simpleMessage("È successo qualcosa...\nQualcosa di futile ed ininfluente.\n_Continuate pure come se niente fosse_", message.chat.id);
                            }
                        }
                        return argo_resolve(res);
                    } else if (firstLine_array.length == 1 && line.charAt(0) == ".") {
                        if (emojiCount(line) > 2) {
                            res.toDelete = { chat_id: message.chat.id, mess_id: message.message_id };
                        }
                        return argo_resolve(res);
                    } else if (lowercaseText == "furetto") {
                        let array = [
                            "Furetto @furins, ti sei perso in chiacchiere?",
                            "Capace sia co la senatrice... @furins ...sssss!",
                            "Capiamolo, @furins è un giovanotto impegnato"
                        ];
                        res.toSend = simpleMessage(array[Math.floor(Math.random() * array.length)], message.chat.id);
                        res.toSend.options.reply_to_message_id = message.message_id;
                        return argo_resolve(res);
                    } else if (line.match("albanese")) {
                        res.toSend = simpleMessage("🤔\nChi, Victor?", message.chat.id);
                        res.toSend.options.reply_to_message_id = message.message_id;
                        return argo_resolve(res);
                    } else if (line.match("albarumeno")) {
                        res.toSend = simpleMessage("...Anche detto Victor 😉 ", message.chat.id);
                        return argo_resolve(res);
                    } else if (lowercaseText.match("buon senso")) {
                        res.toSend = simpleMessage("_Si, ma Matti..._", message.chat.id);
                        res.toSend.options.reply_to_message_id = message.message_id;
                        return argo_resolve(res);
                    } else if (lowercaseText.match("arrapa")) {
                        let array = [
                            "Matti",
                            "Ehh... Matti 😔",
                            "Capiamolo, Matti è un animale con i suoi istinti."
                        ];
                        res.toSend = simpleMessage(array[Math.floor(Math.random() * array.length)], message.chat.id);
                        res.toSend.options.reply_to_message_id = message.message_id;
                        return argo_resolve(res);
                    } else if (lowercaseText.match("ascet")) {
                        let array = [
                            "Oh, _Karellen_",
                            "Eppure è la nostra guida!",
                            "Parli der capoccia?"
                        ];
                        res.toSend = simpleMessage(array[Math.floor(Math.random() * array.length)], message.chat.id);
                        res.toSend.options.reply_to_message_id = message.message_id;
                        return argo_resolve(res);
                    } else if (lowercaseText.match("zitto")) {
                        res.toSend = simpleMessage("Ma zitto tu!", message.chat.id);
                        return argo_resolve(res);
                    } else {
                        return argo_resolve()
                    }
                }
            }
        }
        console.log("FINE NON CONTROLLATA!\n********");
    });
}
module.exports.manage = manageMessage;



function manageCallBack(query) {
    return new Promise(function (callBack_resolve) {
        let question = query.data.split(":");
        let no_message = typeof query.message == "undefined";
        let chat_id = no_message ? query.from.id : query.message.chat.id;
        let is_private = no_message ? false : (query.message.chat.id == query.from.id);

        if (question[1] == "FORGET") {
            return callBack_resolve({
                query: { id: query.id, options: { text: "Ok...", cache_time: 4 } },
                toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
            });
        } else if (question[1] == "GLOBAL") {
            if (question[2] == "REFRESH") {
                return getCurrGlobal(chat_id, is_private, query.from.username, "", no_message).then(function (res_mess) {
                    let res = {};
                    let query_text;
                    if (no_message) {
                        query_text = "Aggiono...";
                        res.toEdit = res_mess.complete_msg;
                        res.toEdit.inline_message_id = query.inline_message_id;

                    } else if (res_mess.valueOf() != query.message.text.valueOf()) {
                        query_text = "Aggiono...";
                        res.toEdit = res_mess;
                        if (no_message) {
                            res.toEdit.inline_message_id = query.inline_message_id;
                        } else {
                            res.toEdit.mess_id = query.message.message_id;
                        }
                    } else {
                        query_text = "Nulla da Aggiornare!";
                    }
                    res.query = { id: query.id, options: { text: query_text, cache_time: 4 } };
                    return callBack_resolve(res);
                });
            } if (question[2] == "INFO") {
                return getGlobalDetail().then(function (res_mess) {
                    let res = {};
                    let query_text;

                    let mess_button = [];

                    mess_button.push([
                        { text: "📈", callback_data: 'ARGO:GLOBAL:PROG' },
                        { text: "🌐", callback_data: 'ARGO:GLOBAL:REFRESH' },
                        { text: "📊", callback_data: 'ARGO:GLOBAL:RITMO' }
                    ]);

                    let cmd_options = {
                        parse_mode: "Markdown",
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: mess_button
                        }
                    };

                    let simple_msg = {
                        chat_id: chat_id,
                        message_text: res_mess,
                        options: cmd_options
                    };




                    if (no_message) {
                        res.toEdit = simple_msg;
                        res.toEdit.inline_message_id = query.inline_message_id;
                        query_text = "Dettagli sulla globale...";
                    } else if (res_mess.valueOf() != query.message.text.valueOf()) {
                        query_text = "Dettagli sulla globale...";
                        res.toEdit = simple_msg;

                        if (no_message) {
                            res.toEdit.inline_message_id = query.inline_message_id;
                        } else {
                            res.toEdit.mess_id = query.message.message_id;
                        }
                    } else {
                        query_text = "Nulla da Aggiornare!";
                    }
                    res.query = { id: query.id, options: { text: query_text, cache_time: 4 } };
                    return callBack_resolve(res);
                });
            } else {
                console.log("> Avvio query! index: " + question[3] + ", command = " + question[4] + "\n");
                //console.log(query.message.chat.type);
                let plot_index;
                if (!isNaN(question[3])) {
                    if (question[4] == "+") {
                        plot_index = 1 + parseInt(question[3]);
                    } else {
                        plot_index = parseInt(question[3]) - 1;
                    }

                    if (plot_index <= 1) {
                        plot_index = 1;
                    } else if (plot_index >= 6) {
                        plot_index = 6;
                    }
                } else {
                    plot_index = 3;
                }
                return getGlobalPlot(
                    question[2].split(":").join(),
                    plot_index,
                    (typeof query.message == "undefined" ? false : (query.message.chat.type != "private"))
                ).then(function (global_plot) {
                    //console.log(question);
                    let res = { query: { id: query.id, options: { text: "Elaboro Grafico", cache_time: 4 } } };
                    if (question.length == 5) {
                        res.toEdit = plotMessage(chat_id, global_plot, question[2] + ":" + plot_index);
                    } else {
                        res.toEdit = plotMessage(chat_id, global_plot, question[2] + ":" + plot_index);
                    }
                    if (typeof query.message == "undefined") {
                        res.toEdit.inline_message_id = query.inline_message_id;
                    } else {
                        res.toEdit.mess_id = query.message.message_id;
                    }

                    return callBack_resolve(res);

                });
            }
        } else if (question[1] == "CRAFT") {
            let argo = getArgonaut(query.from.id);
            console.log("> Domanda: " + question.join(", "));

            if (question[2] == "USED") { // manageUsedInCraft
                let type = "CR";
                if (question.length > 3) {
                    type = question[3];
                }
                console.log("> Chiesti usati di tipo: " + type)
                return manageUsedInCraft(argo.info, type).then(function (craft_needs_res) {
                    let toSend_res = simpleDeletableMessage(chat_id, true, craft_needs_res.text);

                    if (craft_needs_res.used == -1) {
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Oggetti Consumati", cache_time: 6 } },
                            toEdit: {
                                chat_id: query.from.id,
                                mess_id: query.message.message_id,
                                message_text: "*Messaggio Obsoleto*\n\nNon mi risulta tu stia seguendo una linea craft al momento...",
                                options: {
                                    parse_mode: "Markdown",
                                    disable_web_page_preview: true
                                }
                            }
                        });
                    } else {
                        toSend_res.options.reply_to_message_id = query.message.message_id;
                        if (craft_needs_res.needs > 0) {
                            //toSend_res.options.reply_markup = {};
                            toSend_res.options.reply_markup.inline_keyboard.unshift([{
                                text: "Negozi",
                                callback_data: 'ARGO:NEGOZI:MAKE'
                            }]);
                        }
                        let switch_button = { text: "", callBack: "" };
                        if (type == "CR") {
                            if (craft_needs_res.base > 1) {
                                switch_button.text = "Vedi i Base";
                                switch_button.callback_data = "ARGO:CRAFT:USED:BS";
                                toSend_res.options.reply_markup.inline_keyboard[toSend_res.options.reply_markup.inline_keyboard.length - 1].push(switch_button);

                                if (craft_needs_res.critics > 0) {
                                    toSend_res.options.reply_markup.inline_keyboard.unshift([{ text: "Pre Consolida", callback_data: "ARGO:CRAFT:RECREATE:PRE" }]);
                                }
                            }
                        } else {
                            if (craft_needs_res.crafted > 1) {
                                switch_button.text = "Vedi i Creati";
                                switch_button.callback_data = "ARGO:CRAFT:USED:CR";
                                toSend_res.options.reply_markup.inline_keyboard[toSend_res.options.reply_markup.inline_keyboard.length - 1].push(switch_button);
                            }
                        }
                        if (question.length > 3) {
                            toSend_res.mess_id = query.message.message_id;
                            return callBack_resolve({
                                query: { id: query.id, options: { text: (type == "BS" ? "Base" : "Creati") + " Consumati ", cache_time: 6 } },
                                toEdit: toSend_res
                            });
                        } else {
                            return callBack_resolve({
                                query: { id: query.id, options: { text: (type == "BS" ? "Base" : "Creati") + " Consumati ", cache_time: 6 } },
                                toSend: toSend_res
                            });
                        }

                    }

                });

            } else if (question[2] == "NEEDED") {
                return manageCraftNeeds(argo.info, "").then(function (craft_needs_res) {
                    let toSend_res = simpleDeletableMessage(chat_id, true, craft_needs_res.text);
                    if (typeof query.message != "undefined") {
                        toSend_res.options.reply_to_message_id = query.message.message_id;
                    }
                    if (craft_needs_res.needs > 0) {
                        //toSend_res.options.reply_markup = {};
                        //toSend_res.options.reply_markup.inline_keyboard = [];
                        toSend_res.options.reply_markup.inline_keyboard.unshift([{
                            text: "Negozi",
                            callback_data: 'ARGO:NEGOZI:MAKE'
                        }]);

                        toSend_res.options.reply_markup.inline_keyboard.unshift([{
                            text: "Chiedi nel Porto",
                            callback_data: 'ARGO:CRAFT:ASK'
                        }]);
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Base Necessari", cache_time: 6 } },
                            toSend: toSend_res
                        });
                    } else {
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Obsoleto!", cache_time: 6 } },
                            toEdit: {
                                chat_id: query.from.id,
                                mess_id: query.message.message_id,
                                message_text: "*Messaggio Obsoleto*\n\nNon mi risulta tu stia seguendo una linea craft al momento...",
                                options: {
                                    parse_mode: "Markdown",
                                    disable_web_page_preview: true
                                }
                            }
                        });
                    }

                });
            } else if (question[2] == "ASK") {
                return postPortoRequest(argo.info, query.message.text.split("\n")).then(function (res_text) {
                    let porto_id = -1001322169661;
                    callBack_resolve({
                        query: { id: query.id, options: { text: "Pubblicato nel Porto!", cache_time: 8 } },
                        toSend: smugglerMessage(porto_id, res_text, "Porto", argo.info.id)
                    });
                });
            } else if (question[2] == "LIST") {
                return manageCraftList(argo.info, "").then(function (list_res) {
                    if (list_res.needs == -1) {
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Lista Craft", cache_time: 6 } },
                            toEdit: {
                                chat_id: query.from.id,
                                mess_id: query.message.message_id,
                                message_text: "*Messaggio Obsoleto*\n\nNon mi risulta tu stia seguendo una linea craft al momento...",
                                options: {
                                    parse_mode: "Markdown",
                                    disable_web_page_preview: true
                                }
                            }
                        });
                    } else {
                        let toSend_res = simpleDeletableMessage(chat_id, true, list_res.text);

                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Lista Craft", cache_time: 6 } },
                            toSend: toSend_res
                        });
                    }

                });
            } else if (question[2] == "BROKEN") {
                let message_array = query.message.text.split("\n");
                let last_line_array = message_array[message_array.length - 1].split(" ");
                console.log("> Cerco la quantità in: ");
                console.log(last_line_array);
                let current_counter = 1;
                if (last_line_array[2] == "creare") {
                    current_counter = parseInt(last_line_array[3].trim());
                } else {
                    current_counter = parseInt(last_line_array[2].trim());
                }

                if (question[3] == "START") {

                    let objects_ids = question[4].split("-");
                    console.log(objects_ids);
                    console.log("Devo creare questi oggetti, x" + current_counter);
                    let craft_array = [];
                    for (let i = 0; i < objects_ids.length; i++) {
                        craft_array.push({ id: objects_ids[i], quantity: current_counter });
                    }
                    let query_text = "Creo lista per " + (craft_array.length == 1 ? "un oggetto" : (craft_array.length + "oggetti..."));

                    return items_manager.getCraftList(craft_array, argo.info.id, true).then(function (craft_res) {
                        return saveCraftListForUser(craft_res, argo.info.id).then(function (save_esit) {
                            console.log("> Salvate info per: " + argo.info.nick + " " + save_esit);
                            console.log("> Aggiorno info per: " + argo.info.nick);
                            let res_text = "";
                            res_text = getCurrCraftDetails(craft_res, argo.info);

                            let to_Send = simpleDeletableMessage(chat_id, res_text);//simpleMessage(res_text, query.message.chat.id);
                            let has_craftedImpact = checkPreserveNeeds(craft_res.impact.crafted, craft_res.root_item);

                            giveDetailBotton(to_Send.options, craft_res.missingItems_array, craft_res.impact.base.length, craft_res.impact.crafted.length, has_craftedImpact);

                            return callBack_resolve({
                                query: { id: query.id, options: { text: query_text, cache_time: 6 } },
                                toSend: to_Send
                            });
                        });


                    });

                } else {
                    let query_text = "Aggiorno quantità: " + current_counter;

                    if (current_counter == 1) {
                        if (question[3] == "-") {
                            query_text = "Meno di una?!"
                        }
                    }

                    if (question[3] == "-") {
                        current_counter = Math.max(1, (current_counter - 1))
                    } else {
                        current_counter = current_counter + 1
                    }

                    let new_lastLine = "\nVuoi creare " + (current_counter);
                    if (current_counter == "1") {
                        new_lastLine += " copia "
                    } else {
                        new_lastLine += " copie "

                    }
                    if (last_line_array[4].indexOf("'") > 0) {
                        new_lastLine += "dell'oggetto?"
                    } else {
                        new_lastLine += "di questi oggetti?"
                    }
                    let new_message = "*" + message_array[0] + "*\n" + message_array.slice(1, -1).join("\n") + new_lastLine;

                    return callBack_resolve({
                        query: { id: query.id, options: { text: query_text, cache_time: 6 } },
                        toEdit: {

                            message_text: new_message,
                            chat_id: query.message.chat.id,
                            mess_id: query.message.message_id,
                            options: {
                                parse_mode: "Markdown",
                                reply_markup: query.message.reply_markup
                            }
                        }
                    });

                }

            } else if (question[2] == "ASSALTO_DONE") {
                let splitted_text = query.message.text.split("\n");
                let toUpdate_array = [];
                let updated_items = [];
                let lost_value = 0;
                let lost_copyes = 0;

                for (let i = 0; i < splitted_text.length; i++) {
                    if (splitted_text[i].charAt(0) == ">") {
                        let tmp_name = splitted_text[i].substring(splitted_text[i].indexOf("x ") + 2, splitted_text[i].indexOf(" ("));
                        let tmp_item = items_manager.quick_itemFromName(tmp_name, false, 1, null, 1)[0];
                        let tmp_quantity = parseInt(splitted_text[i].substring(splitted_text[i].indexOf(" (") + 2, splitted_text[i].indexOf(")")));
                        lost_value += tmp_item.market_medium_value;
                        lost_copyes += tmp_quantity;
                        toUpdate_array.push([tmp_item.id, argo.info.id, tmp_quantity]);
                        updated_items.push({ name: tmp_item.name, lost_quantity: tmp_quantity });
                    }
                }
                return zainoQuantityUpdate(toUpdate_array, "-").then(function (update_res) {
                    let res_text = "";
                    if (update_res == false) {
                        res_text += "*Woops!*\n\nHo avuto qualche problema aggiornando il tuo zaino. Se puoi, segnala a @nrc382";
                    } else {
                        res_text += "*Zaino Aggiornato!* 🎒\n";
                        res_text += "_dopo il Potenziamento d'una postazione_\n\n";
                        res_text += "· Spesa stimata: " + edollaroFormat(lost_value) + "\n";
                        res_text += "· Copie consumate: " + lost_copyes + "\n\n";

                        for (let i = 0; i < updated_items.length; i++) {
                            res_text += "> " + updated_items[i].name + " (-" + updated_items[i].lost_quantity + ")\n";
                        }
                    }
                    let res_msg = simpleDeletableMessage(chat_id, true, res_text);
                    return callBack_resolve({
                        query: { id: query.id, options: { text: "Zaino Aggiornato", cache_time: 6 } },
                        toEdit: {
                            message_text: res_msg.message_text,
                            chat_id: query.message.chat.id,
                            mess_id: query.message.message_id,
                            options: res_msg.options
                        }
                    });
                });
            } else if (question[2] == "SETG") {
                return loadZainoOf(argo.info.id, true).then(function (zaino) {
                    let res_msg = fabbroMenu("settings", zaino, argo.info, chat_id);
                    return callBack_resolve({
                        query: { id: query.id, options: { text: "Impostazioni Craft", cache_time: 6 } },
                        toEdit: {
                            message_text: res_msg.message_text,
                            chat_id: query.message.chat.id,
                            mess_id: query.message.message_id,
                            options: res_msg.options
                        }
                    });
                });


            } else if (question[2] == "EDIT") {

            } else if (question[2] == "SETT_UP") {

            } else if (question[2] == "SETT_DOWN") {

            } else if (question[2] == "MAIN_MNU") {
                return getZainoFor(argo.info.id, true).then(function (zaino) {
                    let res_msg = fabbroMenu("main", zaino, argo.info, chat_id);
                    return callBack_resolve({
                        query: { id: query.id, options: { text: "Fabbro Argonauta", cache_time: 4 } },
                        toEdit: {
                            message_text: res_msg.message_text,
                            chat_id: query.message.chat.id,
                            mess_id: query.message.message_id,
                            options: res_msg.options
                        }
                    });
                });
            } else if (question[2] == "ANALISI_MAIN") {
                return getZainoFor(argo.info.id).then(function (zaino) {
                    let res_msg = fabbroMenu("R:", zaino, argo.info, chat_id);
                    return callBack_resolve({
                        query: { id: query.id, options: { text: "Analisi main page", cache_time: 6 } },
                        toEdit: {
                            message_text: res_msg.message_text,
                            chat_id: query.message.chat.id,
                            mess_id: query.message.message_id,
                            options: res_msg.options
                        }
                    });
                });
            } else if (question[2] == "ANALISI") {
                let type = "R:";
                if (question.length == 4) {
                    type += question[3] + ":CR";
                } else if (question.length == 5) {
                    type += question[3] + ":" + question[4];
                }
                console.log("> type: " + type + ", question.length: " + question.length);

                return getZainoFor(argo.info.id).then(function (zaino) { // getPartialZaino QUI

                    let res_msg = fabbroMenu(type, zaino, argo.info, chat_id);

                    return callBack_resolve({
                        query: { id: query.id, options: { text: "Analisi Zaino " + question[3], cache_time: 4 } },
                        toEdit: {
                            message_text: res_msg.message_text,
                            chat_id: query.message.chat.id,
                            mess_id: query.message.message_id,
                            options: res_msg.options
                        }
                    });
                });

            } else if (question[2] == "LIST_DEL") {
                return deleteCraftList(argo.info.id).then(function (delete_res) {
                    return getZainoFor(argo.info.id).then(function (zaino) {
                        let res_msg = fabbroMenu("main", zaino, argo.info, chat_id);
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Fabbro Argonauta", cache_time: 4 } },
                            toEdit: {
                                message_text: res_msg.message_text,
                                chat_id: query.message.chat.id,
                                mess_id: query.message.message_id,
                                options: res_msg.options
                            }
                        });
                    });
                });

            } else if (question[2] == "CONSOLIDA" || question[2] == "COMPLETA") {
                let items_array = [];
                let text_array = [];
                let fixed_quantity = -1;
                let copy_counter = 0;
                if (question[2] == "CONSOLIDA") {
                    if (query.message.text.indexOf("🜛") > 0) {
                        text_array = query.message.text.substring(query.message.text.indexOf("🝩") + 2, query.message.text.indexOf("🜛")).split("\n");
                    } else {
                        text_array = query.message.text.substring(query.message.text.indexOf("🝩") + 2).split("\n");
                    }
                } else {
                    fixed_quantity = parseInt(query.message.text.substring(query.message.text.indexOf("Consolidamento: ") + 17, query.message.text.indexOf("🝩")));
                    if (isNaN(fixed_quantity)) {
                        fixed_quantity = 1;
                    }
                    text_array = query.message.text.substring(query.message.text.indexOf("🜛") + 2).split("\n");
                }
                for (let i = 0; i < text_array.length; i++) {
                    if (text_array[i].substring(0, 1) != " ") {
                        console.log("> cerco oggetto: " + text_array[i].trim());
                        if (fixed_quantity < 0) { // è un consolida
                            let tmp_quantity = parseInt(text_array[i].trim().substring(0, text_array[i].trim().indexOf("x")));
                            let tmp_name = text_array[i].substring(text_array[i].indexOf("x ") + 2).trim();

                            let tmp_item = items_manager.quick_itemFromName(tmp_name, false, 1)[0];
                            if (typeof tmp_item != "undefined") {
                                copy_counter += tmp_quantity;
                                items_array.push({ id: tmp_item.id, quantity: tmp_quantity });
                            }

                        } else {
                            let tmp_name = text_array[i].trim();
                            let tmp_item = items_manager.quick_itemFromName(tmp_name, false, 1)[0];
                            if (typeof tmp_item != "undefined") {

                                copy_counter += fixed_quantity;
                                items_array.push({ id: tmp_item.id, quantity: fixed_quantity });
                            }
                        }
                    }
                }
                items_array.sort(function (a, b) {
                    if (a.quantity > b.quantity) {
                        return 1;
                    } else {
                        return -1;
                    }
                });

                return items_manager.getCraftList(items_array, argo.info.id, true).then(function (craft_res) {
                    if (!craft_res) {
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Woops", cache_time: 8 } },
                            toSend: simpleMessage("Non sono riuscito a caricare la linea craft!\nPer favore, segnala a @nrc382", chat_id)
                        });
                    } else {
                        return saveCraftListForUser(craft_res, argo.info.id).then(function (save_craft_res) {
                            if (!save_craft_res.esit) {
                                return callBack_resolve({
                                    query: { id: query.id, options: { text: "Woops", cache_time: 8 } },
                                    toSend: simpleMessage("Non sono riuscito a salvare la linea craft!\nPer favore, segnala a @nrc382", chat_id)
                                });
                            } else {
                                let res_text = "*" + (question[2] == "CONSOLIDA" ? "Consolidamento " : "Completamento ") + " Zaino* 🎒\n";
                                if (craft_res.root_item.length == 1) {
                                    res_text += "_Per: " + craft_res.root_item[0].quantity + "x " + craft_res.root_item[0].name + "_\n";
                                } else {
                                    res_text += "_Per " + craft_res.root_item.length + " oggetti, "
                                    if (copy_counter == 1) {
                                        res_text += "una copia_\n";
                                    } else {
                                        res_text += copy_counter + " copie_\n";
                                    };
                                }
                                if (craft_res.needed_crafts == 1) {
                                    res_text += "\n> Una sola linea!\n";
                                } else {
                                    res_text += "\n> Linee: " + craft_res.needed_crafts + "\n";
                                }
                                res_text += "> PC: " + craft_res.total_pc + "\n";
                                res_text += "> Spesa: " + parsePrice(craft_res.total_cost) + "\n";

                                let res_mess = simpleDeletableMessage(chat_id, true, res_text);
                                let has_craftedImpact = checkPreserveNeeds(craft_res.impact.crafted, craft_res.root_item);

                                giveDetailBotton(res_mess.options, craft_res.missingItems_array.length, craft_res.impact.base.length, craft_res.impact.crafted.length, has_craftedImpact);

                                return callBack_resolve({
                                    query: { id: query.id, options: { text: (question[2] == "CONSOLIDA" ? "Al Consolidamento!" : "Al Completamento!"), cache_time: 8 } },
                                    toSend: res_mess,
                                    toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
                                });

                            }
                        });
                    }

                });
            } else if (question[2] == "RECREATE") { // RECREATE
                let items_array = [];
                let zainoPreserve_bool = false;
                let preserve_bool = false;
                let pre_preserve = false;

                if (question[3] == "ADD") {
                    for (let i = 4; i < question.length; i++) {
                        items_array.push({ id: parseInt(question[i]), quantity: parseInt(question[i + 1]) });
                        i++;
                    }
                } else if (question.length != 5) {
                    if (question[3] == "NOZAINO") {
                        zainoPreserve_bool = true;
                    } else if (question[3] == "PRESERVE") {
                        preserve_bool = true;
                    } else if (question[3] == "PRE") {
                        pre_preserve = true;
                    }
                } else {
                    items_array.push({ id: parseInt(question[3]), quantity: parseInt(question[4]) });
                }

                return recreateCraftListForUser(argo.info.id, items_array, zainoPreserve_bool, preserve_bool, pre_preserve).then(function (recreate_res) {
                    if (recreate_res.esit == true) {

                        if (recreate_res.isEnded == true) {
                            return deleteCraftList(argo.info.id).then(function (del_res) {
                                return getZainoFor(argo.info.id).then(function (zaino) {
                                    let res_msg = fabbroMenu("main", zaino, argo.info, chat_id);

                                    return callBack_resolve({
                                        query: { id: query.id, options: { text: "Linea terminata!", cache_time: 10 } },
                                        toEdit: {
                                            message_text: res_msg.message_text,
                                            chat_id: query.message.chat.id,
                                            mess_id: query.message.message_id,
                                            options: res_msg.options
                                        }
                                    });
                                });
                            });
                        }

                        let edited = simpleDeletableMessage(chat_id, true, recreate_res.text);
                        let has_craftedImpact = checkPreserveNeeds(recreate_res.usedC_array, recreate_res.root_items);

                        giveDetailBotton(edited.options, recreate_res.missingItems_array, recreate_res.usedB_array, recreate_res.usedC_array.length, has_craftedImpact);
                        edited.mess_id = query.message.message_id;
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Linea Aggiornata!", cache_time: 10 } },
                            toEdit: edited
                        });
                    } else {
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Ups!", cache_time: 3 } },
                            //toSend: simpleMessage(recreate_res.text, argo.info.id),
                            toEdit: {
                                chat_id: query.from.id,
                                mess_id: query.message.message_id,
                                message_text: recreate_res.text,
                                options: {
                                    parse_mode: "Markdown",
                                    disable_web_page_preview: true
                                }
                            }
                        });
                    }
                });

            } else if (question[2] == "SUGGESTIONS") { // RECREATE
                return callBack_resolve({
                    query: { id: query.id, options: { text: "Prossimamente...", cache_time: 3 } },
                    toSend: []
                });
            } else if (question[2] == "ASSALTO_UPDATE") {
                return updateZainoAfterSell(argo.info, "ASSALTO").then(function (update_res) {
                    let res = {
                        toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
                        query: {
                            id: query.id, options: { text: update_res == false ? "'Azz!" : "Ok!", cache_time: 4 }
                        }
                    };
                    if (update_res != false) {
                        res.toSend = simpleDeletableMessage(chat_id, true, update_res);//simpleMessage(update_res, query.message.chat.id);
                    }
                    return callBack_resolve(res);
                });
            }
        } else if (question[1] == "NEGOZI") {
            if (question[2] == "MAKE") {
                let parse = parseNegozi(query.message.text.split("\n"), false, false);
                let resText = "🥴 *Mumble...*\n\nNon son riuscito a ricavare gli oggetti!";

                if (parse.copyes > 0) {
                    let first_part = parse.objects > 1 ? "\n\n*" + parse.objects + " oggetti*\n..." : "\n\n*Un oggetto*\n...";
                    let second_part = parse.copyes > 1 ? "_" + parse.copyes + " copie_\n\n" : "_una copia_\n\n";
                    resText = parse.text + first_part + second_part;
                }

                return callBack_resolve({
                    query: { id: query.id, options: { text: "Inviato in chat privata", cache_time: 4 } },
                    toSend: simpleDeletableMessage(query.from.id, true, resText)
                });
            }
        } else if (question[1] == "SMUGL") {
            if (question[2] == "RESERVE") {
                let argo = getArgonaut(query.from.id);
                return parseMySmuggler(query.message.text, query.from.username).then(function (mysmuggler) {
                    if (query.from.id == theCreator || mysmuggler.offerer != query.from.username) {
                        let tocraft = [];
                        let root_item = [];
                        console.log("Torno con: ");
                        console.log(mysmuggler);
                        let item = items_manager.quick_itemFromName(mysmuggler.item, false, 1, null, 1);
                        tocraft.push({ id: item[0].id, quantity: 1 });

                        item[0].quantity = 1;
                        item[0].sell_price_string = formatNumber(mysmuggler.item_price) + " §";

                        root_item.push(item[0]);

                        return inoltroCrafter("", argo, "smuggler", null, { tocraft_array: tocraft, root_item_parsed_array: root_item }).then(function (asker_res) {
                            let toSend_res = simpleMessage(mysmuggler.asker_text, query.message.chat.id);
                            toSend_res.options.reply_to_message_id = query.message.message_id;
                            let askerSend = simpleMessage(asker_res.text, query.from.id);

                            let has_craftedImpact = checkPreserveNeeds(crafter_res.used_c, crafter_res.root_items);
                            giveDetailBotton(askerSend.options, asker_res.needed, asker_res.used_b, crafter_res.used_c.length, has_craftedImpact);

                            let to_res = [];
                            to_res.push({ query: { id: query.id, text: "ok!" } });
                            to_res.push({ toSend: toSend_res });
                            to_res.push({ toSend: askerSend });


                            return callBack_resolve(to_res);
                        });
                    } else {
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Fai tutto da solo?", cache_time: 0 } },
                        });
                    }

                });
            } else if (question[2] == "DEL") {
                return parseMySmuggler(query.message.text, query.from.username).then(function (mysmuggler) {
                    console.log("Sono qui con")
                    console.log(mysmuggler);
                    if (mysmuggler.offerer == query.from.username) {
                        let res = {
                            toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
                            query: { id: query.id, options: { text: "Ok!", cache_time: 0 } }
                        }
                        callBack_resolve(res);
                    } else {
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Non sono affari tuoi!", cache_time: 0 } },
                        });
                    }

                });
            } else if (question[2] == "CRAFT") {
                let quantity = 1;
                if (question.length == 4) {
                    quantity = question[3];
                }
                return inoltroCrafter(query.message.text, checkArgonaut(query.from.username), "smuggler", quantity).then(function (crafter_res) {
                    let res = simpleDeletableMessage(query.message.chat.id, true, crafter_res.text);
                    //if (crafter_res.used_b + crafter_res.used_c.length > 0) {
                    let has_craftedImpact = checkPreserveNeeds(crafter_res.used_c, crafter_res.root_items);
                    giveDetailBotton(res.options, crafter_res.needed, crafter_res.used_b, crafter_res.used_c.length, has_craftedImpact);
                    //}
                    res.mess_id = query.message.message_id;

                    callBack_resolve({
                        query: { id: query.id, options: { text: "Al Craft!", cache_time: 4 } },
                        toEdit: res
                    });
                });
            } else if (question[2] == "SELL") {
                return updateZainoAfterSell(getArgonaut(query.from.id).info, "SMUGGLER", question[3]).then(function (update_res) {
                    let res = {
                        toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
                        query: {
                            id: query.id, options: { text: update_res == false ? "'Azz!" : "Ok!", cache_time: 4 }
                        }
                    };
                    if (update_res != false) {
                        res.toSend = simpleDeletableMessage(query.message.chat.id, true, update_res);
                        res.toSend.options.reply_markup.inline_keyboard.unshift([{ text: "⚒", callback_data: 'ARGO:SMUGL:CRAFT' }, { text: "💰", switch_inline_query: 'eco: Accetta Vendita' }]);
                    } else {
                        res.toSend = simpleDeletableMessage(query.message.chat.id, true, "*Woops!*\n\nSpiacente, ma non ho trovato la lista degli oggetti da aggiornare. Hai eliminato la linea craft attuale?");//simpleMessage(update_res, query.message.chat.id);
                    }
                    return callBack_resolve(res);
                });
            } else if (question[2] == "INFO") {
                return getMarketInfo(query.message.text).then(function (market_info) {

                    let msg_toSend = simpleDeletableMessage(query.from.id, true, market_info.toSendText);
                    // msg_toSend.options.reply_markup.inline_keyboard.unshift([{
                    //     text: "Cerca nello zaino 🎒",
                    //     switch_inline_query: "eco: /oggetti " + market_info.item
                    // }]);
                    msg_toSend.options.reply_markup.inline_keyboard.unshift([
                        { text: "× ①", callback_data: 'ARGO:SMUGL:CRAFT' },
                        { text: "× ③", callback_data: 'ARGO:SMUGL:CRAFT:3' },
                    ]);
                    if (question[3] != 0) {
                        msg_toSend.options.reply_markup.inline_keyboard.unshift([{ text: "Venduto!", callback_data: 'ARGO:SMUGL:SELL:' + question[3] }])
                    }

                    msg_toSend.mess_id = query.message.message_id;

                    let res = {
                        toEdit: msg_toSend,
                        query: {
                            id: query.id, options: { text: "Inoltra al #plus", cache_time: 0 }
                        }
                    }
                    callBack_resolve(res);
                });
            } else if (question[2] == "TOGIVE_INFO") {
                return callBack_resolve({
                    query: { id: query.id, options: { text: "Prossimamente...", cache_time: 3 } },
                });
            } else if (question[2] == "STATS") {
                return smugglerGain_stats(question[3], query.from, chat_id).then((stats) => {
                    stats.mess_id = query.message.message_id;
                    let query_res = "";
                    switch (question[3]) {
                        case "DAY": {
                            query_res = "🐣\n\nStatistiche Giornaliere ";
                            break;
                        }
                        case "WEEK": {
                            query_res = "🧚\n\nStatistiche Settimanali ";
                            break;
                        }
                        case "ALL": {
                            query_res = "🦖\n\nStatistiche Globali ";
                            break;
                        }
                        default: {
                            query_res = "👤\n\nStatistiche Personali ";

                        }
                    }
                    return callBack_resolve({
                        query: { id: query.id, options: { text: query_res, cache_time: 3, show_alert: true } },
                        toEdit: stats
                    });
                });

            } else {
                return callBack_resolve({ query: { id: query.id, options: { text: "Woops!", cache_time: 4 } } });
            }
        } else if (question[1] == "DUNGEON") {
            if (question[2] == "REQUEST") {
                if (query.from.username.toLowerCase() != question[2]) {
                    let res = simpleMessage("👆\n\n@*" + query.from.username.split("_").join("\\_") + "* si offre!", query.message.chat.id);
                    res.options.reply_to_message_id = query.message.reply_to_message.message_id;
                    return callBack_resolve({
                        query: { id: query.id, options: { text: "Segnalato!", cache_time: 4 } },
                        toSend: res
                    });
                }
            } else {
                return callBack_resolve({ query: { id: query.id, options: { text: "Woops!", cache_time: 4 } } });
            }
        } else if (question[1] == "HELP") {
            let res = {};
            let on_private = query.from.id;
            let confirm_text = "Uno è felice d'aiutare";
            let message_text = "";
            if (typeof query.message != "undefined") {
                on_private = query.message.chat.id;
                confirm_text = "Inviato in chat privata...";
            }
            if (question[2] == "INLINE") {
                message_text = "*HELPER -> *`INLINE`";
            } else if (question[2] == "CMD") {
                message_text += "📖* Manuale Comandi*\n_...cominciano sempre con /_\n\n";
                message_text += "Questa è una semplice lista.\nSe non sono autoesplicativi, i comandi stessi mostreranno maggiori dettagli quando li utilizzerai\n\n";

                message_text += "> /aiuto o /help\n";
                message_text += "> /spia\n";
                message_text += "> /cerca\n";
                message_text += "> /crea\n";
                message_text += "> /craft\n";
                message_text += "> /info\n";
                //message_text += "> /presentati\n";

            } else if (question[2] == "CHAT") {
                message_text = "*HELPER -> *`CHAT`";

            }

            res = simpleMessage(message_text, on_private);
            return callBack_resolve({
                query: { id: query.id, options: { text: confirm_text } },
                toSend: res
            });
        } else if (question[1] == "UPDATE") {
            console.log("Fine craft per: " + question[2]);
            return endCraft_ZainoUpdate(question[2]).then(function (zaino_updateText) {
                console.log("Is Over? " + zaino_updateText);
                if (typeof zaino_updateText == "string") {
                    return deleteCraftList(question[2]).then(function (delete_res) {
                        return callBack_resolve({
                            query: { id: query.id, options: { text: "Report in privato", cache_time: 4 } },
                            toSend: {
                                chat_id: chat_id,
                                message_text: zaino_updateText,
                                options: {
                                    parse_mode: "Markdown",
                                    disable_web_page_preview: true
                                }
                            }
                        });
                    });

                } else {
                    return callBack_resolve({
                        query: { id: query.id, options: { text: "Woops!", cache_time: 4 } },
                        toEdit: {
                            chat_id: query.from.id,
                            mess_id: query.message.message_id,
                            message_text: "*Messaggio Obsoleto*\n\nNon mi risulta tu stia seguendo una linea craft al momento...",
                            options: {
                                parse_mode: "Markdown",
                                disable_web_page_preview: true
                            }
                        }
                    });

                }
            });

        } else if (question[1] == "ZAINO") {
            if (question[2] == "SHOW") {
                return showZainoForRarity(getArgonaut(query.from.id).info, question[3], question[4]).then(function (mess_res) {
                    mess_res.mess_id = query.message.message_id;
                    return callBack_resolve({
                        query: { id: query.id, options: { text: ("Rarità " + question[3] + " nello Zaino"), cache_time: 4 } },
                        toEdit: mess_res
                    });
                });
            }
        } else if (question[1] == "PAYMENT") { // ARGO:PAYMENT:CRONO
            let first_line = query.message.text.split("\n")[0];
            let a_user = first_line.substring(first_line.indexOf("di ") + 3);
            return getBilance(a_user, [false], chat_id, question[2]).then(function (bilance_res) {
                bilance_res.mess_id = query.message.message_id;
                return callBack_resolve({
                    query: { id: query.id, options: { text: ("il Bilancio..."), cache_time: 4 } },
                    toEdit: bilance_res
                });
            });
        } else if (question[1] == "FESTIVAL") {
            let craftable_items = question.slice(3, question.length - 1);
            let tocraft = [];
            for (let i = 0; i < craftable_items.length; i++) {
                tocraft.push({ id: craftable_items[i], quantity: question[2] })
            }
            let argo = getArgonaut(query.from.id);

            let item = items_manager.getItemFromId(question[question.length - 1]);

            item.quantity = 1;
            item.sell_price_string = formatNumber(0) + " §";

            return inoltroCrafter("", argo, "festival", question[2], { tocraft_array: tocraft, root_item_parsed_array: [item] }).then(function (crafter_res) {
                let res = simpleDeletableMessage(query.message.chat.id, true, crafter_res.text);
                let has_craftedImpact = checkPreserveNeeds(crafter_res.used_c, crafter_res.root_items);
                giveDetailBotton(res.options, crafter_res.needed, crafter_res.used_b, crafter_res.used_c.length, has_craftedImpact);

                res.mess_id = query.message.message_id;

                return callBack_resolve({
                    query: { id: query.id, options: { text: "Festival!", cache_time: 4 } },
                    toEdit: res
                });
            });
        }
    });
}
module.exports.callBack = manageCallBack;

function manageInline(in_query, user) {
    return new Promise(function (manageInline_resolve) {
        let main_triggers = ["main", "home", "h", "m"]
        if (in_query.query.toLowerCase().length > 0 && main_triggers.indexOf(in_query.query.toLowerCase()) < 0) {
            let question_array = in_query.query.toLowerCase().trim();
            console.log("--------------\nINLINE\n");
            if (question_array.substring(0, 4) == "eco:") {
                let inline_result = {};
                let res_array = [];
                if (question_array.length > 6) {
                    question_array = in_query.query.slice(5, in_query.query.length);
                    inline_result.title = "Tap qui ∿";
                    inline_result.desc = question_array.trim().substring(0, 20) + "...";
                    inline_result.to_send = question_array;

                } else {
                    inline_result.title = "Sono Eco ∿";
                    inline_result.desc = "Quello che scrivi,\nIo ripeto... ";
                    inline_result.to_send = "🌬";
                }
                res_array = parseInlineResult(user.id, in_query.id, "eco", res_array, inline_result);
                return manageInline_resolve(res_array);

            } else if (question_array.substring(0, 4) == "rune") {
                return manageRuneQuestion(user.id, in_query.id, question_array.substring(4, question_array.length)).then(function (inline_res) {
                    return manageInline_resolve(inline_res);
                });
            } else if (question_array.substring(0, 4) == "spia") {
                let targhet = in_query.query.trim().split(" ");
                let inline_result = {};
                let res_array = [];

                if (targhet.length <= 1) {
                    inline_result.title = "👁‍🗨 Spia Anonimamente";
                    inline_result.desc = "Completa il comando con un nick\n(anche parziale)";
                    inline_result.to_send = "👁‍🗨 *Spia Anonimamente*\n\nRicerca di un nome giocatore (anche parziale) nel database di LootBot, ottenendo informazioni sul suo team.\nPer non sovrapporsi a quello del plus, non può essere mandato in risposta.\n💡 Completa il comando con il _nickname_ di un utente";
                    res_array = parseInlineResult(user.id, in_query.id, "search", res_array, inline_result);
                    return manageInline_resolve(res_array);

                } if (targhet[1].length <= 2) {
                    inline_result.title = "👁‍🗨 Spia Anonimamente";
                    inline_result.desc = "Usa almeno tre caratteri";
                    inline_result.to_send = "👁‍🗨 *Spia Anonimamente*\n\nRicerca di un nome giocatore (anche parziale) nel database di LootBot, ottenendo informazioni sul suo team.\nPer non sovrapporsi a quello del plus, non può essere mandato in risposta.\n💡 Completa il comando con il _nickname_ di un utente";
                    res_array = parseInlineResult(user.id, in_query.id, "search", res_array, inline_result);
                    return manageInline_resolve(res_array);
                } else {
                    targhet = targhet[1];
                    if (targhet.charAt(0) == "@") {
                        targhet = targhet.substring(1, targhet.length);
                    }

                    return anonymousSpia(targhet).then(function (aspia_res) {
                        if (aspia_res[0] == false) {
                            inline_result.title = "👁‍🗨 Nessun Match!";
                            inline_result.desc = "...";
                            inline_result.to_send = "👁‍🗨 *Spia Anonimamente*\n\nRicerca di un nome giocatore (anche parziale) nel database di LootBot, ottenendo informazioni sul suo team.\nPer non sovrapporsi a quello del plus, non può essere mandato in risposta.\n💡 Completa il comando con il _nickname_ di un utente";
                        } else {
                            inline_result.title = "👁‍🗨 Info su " + targhet;
                            inline_result.desc = "Tap per i dettagli";

                            inline_result.to_send = "👁‍🗨 Info Anonime\n\n" + aspia_res[1];
                        }
                        res_array = parseInlineResult(user.id, in_query.id, "search", res_array, inline_result);
                        return manageInline_resolve(res_array);

                    });
                }


            } else {
                console.log("Sono nell'else! ");
                console.log("> Carattere: \"" + question_array[0] + "\"");
                question_array = question_array.trim().split("_").join(" ").split("*").join(" ").split(" ");
                console.log("> Query: \"" + question_array.join(", ") + "\"");
            }
            let starting_trigger = question_array[0];

            console.log("> " + user.info.nick + " chiede: ");

            if (starting_trigger == "globale") {
                return getCurrGlobal(user.info.id, false, user.info.nick, "", true).then(function (toSend) {
                    let res_array = [];
                    res_array = parseInlineResult(user.info.id, in_query.id, "globale", res_array, toSend.inline, true, toSend.buttons);

                    return manageInline_resolve(res_array);

                })
            }

            //managePlayerSearch

            if (starting_trigger == "l" && question_array.length > 1) {
                question_array = ["c", "linea", question_array[1]];
            } else if (starting_trigger == "s" || starting_trigger == "sintesi") {
                let calc_id = Date.now() + ":" + (user.id + "" + in_query.id).split('').sort(function () { return 0.5 - Math.random() }).join(''); //user_id + ":" + (Date.now() +"") ;
                let res = {};
                let res_array = [];

                res = { // Furia dei Mari
                    type: "sticker",
                    id: (calc_id + 1),
                    sticker_file_id: "CAACAgIAAxkBAAEBqj1ewUtGzViSPagg3q19Su8YkTD6PAACZgADotsCASCNT33T1n80GQQ",
                    input_message_content: {
                        message_text: "/sintesi 80, 60, 60",
                        disable_web_page_preview: true,
                        parse_mode: "Markdown"
                    },
                };
                res_array.push(res);

                res = { //  Impeto di fiamme
                    type: "sticker",
                    id: (calc_id + 2),
                    sticker_file_id: "CAACAgIAAxkBAAEBqjhewUjE42APPAPuv38-hi5LgkzEawACYwADotsCAYhtS9gmaEH5GQQ",
                    input_message_content: {
                        message_text: "/sintesi 60, 60, 80",
                        disable_web_page_preview: true,
                        parse_mode: "Markdown"
                    },
                };
                res_array.push(res);

                res = { // Tempesta folgorante
                    type: "sticker",
                    id: (calc_id + 3),
                    sticker_file_id: "CAACAgIAAxkBAAEBqjlewUjgORem3c2Q9bg6fXKYpP1SGQACZAADotsCAVOeGxeJJcKJGQQ",
                    input_message_content: {
                        message_text: "/sintesi 60, 80, 60",
                        disable_web_page_preview: true,
                        parse_mode: "Markdown"
                    },
                };
                res_array.push(res);

                return manageInline_resolve(res_array);

            } else if (starting_trigger == "e" || starting_trigger == "esplorazioni" || starting_trigger == "cave") {
                let calc_id = Date.now() + ":" + (user.id + "" + in_query.id).split('').sort(function () { return 0.5 - Math.random() }).join(''); //user_id + ":" + (Date.now() +"") ;
                let res = {};
                let res_array = [];

                res = { // Versak
                    type: "sticker",
                    id: (calc_id + 1),
                    sticker_file_id: "CAACAgIAAxkBAAEBqztewlQYSz2BpAqvLJJOex7Zj52jhgACZwADotsCASek0qtLLMN_GQQ",
                    input_message_content: {
                        message_text: "Viaggia a Cava Vesak",
                        disable_web_page_preview: true,
                        parse_mode: "Markdown"
                    },
                };
                res_array.push(res);

                res = { // Rayquae
                    type: "sticker",
                    id: (calc_id + 2),
                    sticker_file_id: "CAACAgIAAxkBAAEBqzxewlRdkUo-Qq_gQxZDZ3KXZGepZwACaAADotsCATWBhpnCR1cdGQQ",
                    input_message_content: {
                        message_text: "Viaggia a Cava Rayquae",
                        disable_web_page_preview: true,
                        parse_mode: "Markdown"
                    },
                };
                res_array.push(res);

                res = { // Jupiter
                    type: "sticker",
                    id: (calc_id + 3),
                    sticker_file_id: "CAACAgIAAxkBAAEBq0BewlTiCET3U8BePOlfPzKhUi80DwACaQADotsCAWhBDLzBOoIAARkE",
                    input_message_content: {
                        message_text: "Viaggia a Cava Jupiter",
                        disable_web_page_preview: true,
                        parse_mode: "Markdown"
                    },
                };
                res_array.push(res);

                res = { // Shyne
                    type: "sticker",
                    id: (calc_id + 4),
                    sticker_file_id: "CAACAgIAAxkBAAEBqz5ewlTEugAB5rqnfoilIj4kKQkY7GEAAmoAA6LbAgHs8DaVdwfWDRkE",
                    input_message_content: {
                        message_text: "Viaggia a Cava Shyne",
                        disable_web_page_preview: true,
                        parse_mode: "Markdown"
                    },
                };
                res_array.push(res);

                res = { // Arke
                    type: "sticker",
                    id: (calc_id + 5),
                    sticker_file_id: "CAACAgIAAxkBAAEBqz1ewlSyCTMCZq_IqkC0AAGbpPyBVEIAAmsAA6LbAgF8OwL1fBzPkRkE",
                    input_message_content: {
                        message_text: "Viaggia a Cava Arke",
                        disable_web_page_preview: true,
                        parse_mode: "Markdown"
                    },
                };
                res_array.push(res);

                return manageInline_resolve(res_array);

            } else if (starting_trigger == "linea") {
                question_array.unshift("c");
            } else if (starting_trigger == "svuota") {
                question_array.unshift("c");
            } else if (starting_trigger == ">" || starting_trigger == "<") {
                question_array.unshift("c");
            } else if (starting_trigger.length >= 4 && (starting_trigger.substring(0, 5) == "offri" || starting_trigger.substring(0, 5) == "scambia")) {
                return manageItemExcange(in_query, user.info).then(function (inline_res) {
                    return manageInline_resolve(inline_res);
                });
            } else if (starting_trigger == "g") {
                return managePlayerSearch(in_query, user.info).then(function (inline_res) {
                    return manageInline_resolve(inline_res);
                });
            } else if (starting_trigger == "craftati" || starting_trigger == "base") {
                question_array.unshift("i");
            } else if (starting_trigger.indexOf(":") == 0) {
                question_array.unshift("c");
            }

            starting_trigger = question_array[0].toLowerCase();
            console.log("> starting_trigger (nuovo): " + starting_trigger);
            console.log("> Question_array: " + question_array);


            if (starting_trigger == "i" || starting_trigger == "info" || starting_trigger == "cerca") {
                return manageInlineInfos(user, in_query.id, question_array).then(function (infos_res) {
                    manageInline_resolve(infos_res);
                });
            } else if (starting_trigger == "c" || starting_trigger == "craft" || starting_trigger == "crea" || starting_trigger == "c0" || starting_trigger == "cc") {
                return manageInlineCraft(user, in_query.id, question_array).then(function (crafting_res) {
                    manageInline_resolve(crafting_res);
                });
            } else if (starting_trigger == "regala" || starting_trigger == "vendi") {
                return manageItemResell(in_query, user.info).then(function (inline_res) {

                    return manageInline_resolve(inline_res);
                });
            } else {
                if (!isNaN(starting_trigger) && user.info.is_crafting == 1) {
                    return manageInlineCraft(user, in_query.id, ["c", "linea", starting_trigger]).then(function (crafting_res) {
                        manageInline_resolve(crafting_res);
                    });
                } else {
                    let inline_result = {};
                    let res_array = [];

                    inline_result.title = "🤔 Mumble!";
                    inline_result.desc = "\nNon capisco...";
                    inline_result.to_send = "Cosa dovrei rispondere a: \"" + in_query.query + "\"?";
                    res_array = parseInlineResult(user.id, in_query.id, "error", res_array, inline_result);
                    return manageInline_resolve(res_array);
                }
            }
        } else { // Query vuota
            let res_array = [];
            let calc_id = Date.now() + ":" + (user.info.id + "" + in_query.id).split('').sort(function () { return 0.5 - Math.random() }).join(''); //user_id + ":" + (Date.now() +"") ;

            let res = {};
            let now_date = new Date(Date.now());

            if (in_query.chat_type == "private") {
                if (user.info.is_crafting == 1 && main_triggers.indexOf(in_query.query.toLowerCase()) < 0) {
                    return manageInlineCraft(user, in_query.id, ["c", "linea", "1"]).then(function (crafting_res) {
                        manageInline_resolve(crafting_res);
                    });
                } else {
                    console.log("> Sono nell'else. Query vuota...");

                    console.log("> Sono le:" + now_date.getHours());
                    if (now_date.getHours() >= 9 && now_date.getHours() < 23) {
                        res = { // Contrabbandiere
                            type: "sticker",
                            id: (calc_id + 1),
                            sticker_file_id: "CAACAgIAAxkBAAEBm01eLQzDIFCHxSNwi608nq1icqr5WQACYAADotsCAYJQDxXDvX7VGAQ",
                            reply_markup: {
                                inline_keyboard: [[{
                                    text: "Cerca informazioni...",
                                    switch_inline_query_current_chat: "info "
                                }]]
                            },
                            input_message_content: {
                                message_text: "Contrabbandiere dell'Est 👣",
                                disable_web_page_preview: true,
                                parse_mode: "Markdown"
                            },
                        };
                        res_array.push(res);
                    }
                    res = { // Craft
                        type: "sticker",
                        id: (calc_id + 7),
                        sticker_file_id: "CAACAgIAAxkBAAEBpChedLRsEVy3Pf6UmgQ3YiAN9BsrLQACYgADotsCAXWoVGV9GSSzGAQ",
                        reply_markup: {
                            inline_keyboard: [
                                [{
                                    text: "Test 1",
                                    switch_inline_query_current_chat: "è solo un test"
                                }],
                                [{
                                    text: "Test 2",
                                    switch_inline_query: "Test 2"
                                }]
                            ]
                        },
                        input_message_content: {
                            message_text: "*Gestore Craft*\n\n...devo sapere se c'è una linea corrente",
                            disable_web_page_preview: true,
                            parse_mode: "Markdown"
                        },
                    };
                    //res_array.push(res);

                    res = { // Avvia Ispezione
                        type: "sticker",
                        id: (calc_id + 2),
                        sticker_file_id: "CAACAgIAAxkBAAEBmsZeLHAx9GWKH3hDOXmoysN0FlGNZwACXAADotsCAZ0iFrfk1_vpGAQ",
                        input_message_content: {
                            message_text: "mm",
                            disable_web_page_preview: true,
                            parse_mode: "Markdown"
                        },
                    };
                    res_array.push(res);

                    res = { // Contatta lo Gnomo
                        type: "sticker",
                        id: (calc_id + 3),
                        sticker_file_id: "CAACAgIAAxkBAAEBmsdeLHA_jNwyBAnOWO6XmPrkI9DUegACXQADotsCAT-9xyIAAYYv7hgE",
                        reply_markup: {
                            inline_keyboard: [[{
                                text: "Cambia Rune",
                                switch_inline_query_current_chat: "rune "
                            }]]
                        },
                        input_message_content: {
                            message_text: "Contatta lo Gnomo 💭",
                            disable_web_page_preview: true,
                            parse_mode: "Markdown"
                        },
                    };
                    res_array.push(res);

                    res = { // Scrigni
                        type: "sticker",
                        id: (calc_id + 4),
                        sticker_file_id: "CAACAgIAAxkBAAEBmsheLHBX_Lp4uk5psR6MFuzj748iQgACXgADotsCAdCKvWvdUZXlGAQ",
                        input_message_content: {
                            message_text: "Scrigni 🔑",
                            disable_web_page_preview: true,
                            parse_mode: "Markdown"
                        },
                    };
                    res_array.push(res);

                    res = { // Rimuovi Equip
                        type: "sticker",
                        id: (calc_id + 5),
                        sticker_file_id: "CAACAgIAAxkBAAEBms5eLIposSm9Pl1D1uG5hB_i6ryiSwACXwADotsCAeswcmGupyVwGAQ",
                        reply_markup: {
                            inline_keyboard: [
                                [{
                                    text: "Giocatore",
                                    switch_inline_query_current_chat: "eco: Giocatore"
                                }],
                                [{
                                    text: "Imposta Set",
                                    switch_inline_query_current_chat: "eco: Imposta "
                                }]
                            ]
                        },
                        input_message_content: {
                            message_text: "Rimuovi tutto",
                            disable_web_page_preview: true,
                            parse_mode: "Markdown"
                        },
                    };
                    res_array.push(res);


                    let generalPage = manualGeneralPage();

                    res = { // Help#
                        type: "sticker",
                        id: (calc_id + 6),
                        sticker_file_id: "CAACAgIAAxkBAAEBov1ecRxYG1WTBhLNRyMkL1QKYKuP-gACYQADotsCAfIw-rQrKEhNGAQ",
                        reply_markup: generalPage.replyMarkup,
                        input_message_content: {
                            message_text: generalPage.messageText,
                            disable_web_page_preview: true,
                            parse_mode: "Markdown"
                        },
                    };
                    res_array.push(res);

                }
            } else if (in_query.chat_type == "sender") {
                let generalPage = manualGeneralPage();

                res = { // Help#
                    type: "sticker",
                    id: (calc_id + 6),
                    sticker_file_id: "CAACAgIAAxkBAAEBov1ecRxYG1WTBhLNRyMkL1QKYKuP-gACYQADotsCAfIw-rQrKEhNGAQ",
                    reply_markup: generalPage.replyMarkup,
                    input_message_content: {
                        message_text: generalPage.messageText,
                        disable_web_page_preview: true,
                        parse_mode: "Markdown"
                    },
                };
                res_array.push(res);
            } else {
                return getCurrGlobal(user.info.id, false, user.info.nick, "", true).then(function (toSend) {
                    let res_array = [];
                    res_array = parseInlineResult(user.info.id, in_query.id, "globale", res_array, toSend.inline, true, toSend.buttons);

                    return manageInline_resolve(res_array);

                })
            }
            return manageInline_resolve(res_array);




        }
        //console.log("FINE?\n--------------");
    });
}
module.exports.manageInline = manageInline;

// #MESSAGE-QUOTE-CHECK

function checkQuote(array, string) {
    console.log("> checkQuote...")
    for (let i = 0; i < array.length; i++) {
        if (array[i].length <= 4 && array[i].match(string) && !array[i].match("'")) {
            console.log("- checkQuote_res: Trovato! [" + i + "]");
            return (i);
        }
    }
    console.log("- checkQuote_res: Nope!");
    return -1;
}

function checkPartyTrigg(array) {
    for (let i = 0; i < array.length; i++) {
        if (array[i].toLowerCase().indexOf("party") >= 0) {
            return true;
        }
    }
    return false;

}

function checkArgoQuestion(message_text) {
    let messageArray = message_text.split(" ");
    let argoBool = null;
    for (let i = 0; i < messageArray.length; i++) {
        if (messageArray[i].match("argonaut")) {
            argoBool = 0;
            if (messageArray.length > (i + 1)) {
                if (messageArray[i + 1].length === 2 && messageArray[i + 1].charAt(0) == "r") {
                    argoBool = parseInt(messageArray[i + 1].charAt(1));
                    console.log("trovo rinascita: " + argoBool);
                } else if (messageArray[i + 1] == "almeno" && messageArray.length >= i + 2) {
                    argoBool = parseInt(messageArray[i + 2].charAt(1)) + 10;
                    console.log("trovo (almeno): " + argoBool);
                } else if (messageArray[i + 1] == "al" && messageArray[i + 2] == "più" && typeof messageArray[i + 3] != 'undefined') {
                    argoBool = parseInt(messageArray[i + 3].charAt(1)) * (-1);
                    console.log("trovo (al più): " + argoBool);
                }
            }
            break;
        }
    }
    console.log("> checkArgoQuestion, argoBool: " + argoBool + ", messageArray.length: " + messageArray.length);

    if (argoBool != null) {
        let txt;
        let res = null;
        if (argoBool >= 10) {
            res = getArgonautForRMoreThen((Math.abs(argoBool) - 10));
            if (res.result.length > 0) {
                txt = "Ecco gli Argonauti con rinascita maggiore di R" + (Math.abs(argoBool) - 10) + "\n";
            } else {
                txt = "Non conosco nessun Argonauta con rinascita maggiore di R" + (Math.abs(argoBool) - 10) + "\n";
            }
        }
        else if (argoBool >= 0) {
            if (argoBool == 0) {
                txt = "Ecco la lista degli Argonauti, per quello che ne so...\n" + getArgonautListFrom(globalArgonauts);
            } else {
                res = getArgonautForR((Math.abs(argoBool)));
                if (res.result.length > 0) {
                    txt = "Ecco gli Argonauti R" + Math.abs(argoBool) + "\n";
                } else {
                    txt = "Non conosco nessun Argonauta R" + (Math.abs(argoBool)) + "\n";
                }

            }
        }
        else if (argoBool < 0) {
            res = getArgonautForRLessThen((Math.abs(argoBool)));
            if (res.result.length > 0) {
                txt = "Ecco gli Argonauti con rinascita minore di R*" + Math.abs(argoBool) + "*\n";
            } else {
                txt = "Non conosco nessun Argonauta con rinascita minore di R" + (Math.abs(argoBool)) + "\n";
            }
        }
        if (res != null && res.result.length > 0) {
            txt += getArgonautListFrom(res.result);
            console.log(res.result);
        }
        if (res != null && res.unknown.length > 0) {
            if (res.unknown.length == 1) {
                txt += "\nC'è però un Argonauta di cui non ho informazioni: ";
            } else {
                if (res.unknown.length > (globalArgonauts.length / 2 + 1)) {
                    txt += "\nC'è da dire che non ne conosco gran parte:";
                } else {
                    txt += "\nCi sono però " + res.unknown.length + " Argonauti di cui non ho informazioni:";
                }
            }
            for (let i = 0; i < res.unknown.length; i++) {
                txt += "\n▸ `" + res.unknown[i].nick + "`";
            }
        }
        return txt;
    } else {
        return null;
    }
}

// #DITUTTO

function manualGeneralPage(from_inline) {
    let resText = "📖 *Manuale d'Utilizzo*\n_...per Al: Bot di supporto del team Argonauti_\n\n";
    resText += "Questo Bot ha lo scopo di semplificare e dove possibile migliorare l'esperienza utente su @LootGameBot.";
    resText += "\nCon i bottoni qui sotto è possibile avere una panoramica delle funzioni principali.";
    //resText +="\nLo stesso menù è raggiungibile anche inline (`help`) o in chat privata (comando `/help`)";
    if (from_inline) {
        resText += "\n\n👁 I messaggi verranno inviati in chat privata";
    }

    let resMarkup = {
        inline_keyboard: [
            [{
                text: "@ Inline",
                callback_data: "ARGO:HELP:INLINE"
            }],
            [{
                text: "⌘ Comandi",
                callback_data: "ARGO:HELP:CMD"
            }], // 
            [{
                text: "... Chat",
                callback_data: "ARGO:HELP:CHAT"
            }]
        ]
    };

    return { messageText: resText, replyMarkup: resMarkup };
}

function compareItems(toAnalyze_array, argo_info) {
    return new Promise(function (compareItems_res) {
        console.log(toAnalyze_array[1]);
        return getZainoFor(argo_info.id).then(function (parsed_zaino) {
            let c_count = 0;
            let nc_count = 0;
            let r_count = 0;
            let ur_count = 0;
            let l_count = 0;
            let e_count = 0;
            let ue_count = 0;
            let u_count = 0;
            let x_count = 0;
            let d_count = 0;
            let s_count = 0;
            let in_count = 0;
            let a_count = 0;

            let tmp_split = [];
            let tmp_rarity;
            for (let i = 1; i < toAnalyze_array.length; i++) {
                tmp_split = toAnalyze_array[i].split(" ");
                tmp_rarity = tmp_split[1].split(":").join("");
                console.log("> Cerco: " + tmp_rarity);
                switch (tmp_rarity) {
                    case ("C"): {
                        c_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("NC"): {
                        nc_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("R"): {
                        r_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("UR"): {
                        ur_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("L"): {
                        l_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("E"): {
                        e_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("UE"): {
                        ue_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("U"): {
                        u_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("X"): {
                        x_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("D"): {
                        d_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("S"): {
                        s_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("IN"): {
                        in_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                    case ("A"): {
                        a_count = parseInt(tmp_split[2].split(".").join(""));
                        break;
                    }
                }

            }
            console.log("> c_count: " + c_count);
            console.log("> parsed_zaino.c: " + parsed_zaino.comuni.length);

            let res_text = "*Eh, T'ho perso!*\n(_se quello è il tuo /zaino_)\n\nEcco la differenza con quello che risulta a me:";
            let diff = 0;
            let personal_comuni = (parsed_zaino.comuni_copyes);
            let personal_non_comuni = (parsed_zaino.non_comuni_copyes);
            let personal_rari = (parsed_zaino.rari_copyes);
            let personal_ultra_rari = (parsed_zaino.ultra_rari_copyes);
            let personal_leggendari = (parsed_zaino.leggendari_copyes);
            let personal_epici = (parsed_zaino.epici_copyes);
            let personal_ultra_epici = (parsed_zaino.ultra_epici_copyes);
            let personal_unici = (parsed_zaino.unici_copyes);
            let personal_speciali = (parsed_zaino.speciali_copyes);
            let personal_x = (parsed_zaino.x_copyes);
            let personal_draconici = (parsed_zaino.draconici_copyes);
            let personal_artefatti = (parsed_zaino.artefatti.length);
            let personal_inestimabili = (parsed_zaino.inestimabili_copyes);


            if ((c_count - personal_comuni) != 0) {
                res_text += "\n> Comuni: " + (c_count - personal_comuni);
                diff += Math.abs(personal_comuni - c_count);
            }
            if ((nc_count - personal_non_comuni) != 0) {
                res_text += "\n> Non Comuni: " + (nc_count - personal_non_comuni);
                diff += Math.abs(personal_non_comuni - c_count);
            }
            if ((r_count - personal_rari) != 0) {
                res_text += "\n> Rari: " + (r_count - personal_rari);
                diff += Math.abs(personal_rari - c_count);
            }
            if ((ur_count - personal_ultra_rari) != 0) {
                res_text += "\n> Ultra Rari: " + (ur_count - personal_ultra_rari);
                diff += Math.abs(personal_ultra_rari - c_count);
            }
            if ((l_count - personal_leggendari) != 0) {
                res_text += "\n> Leggendari: " + (l_count - personal_leggendari);
                diff += Math.abs(personal_leggendari - c_count);
            }
            if ((e_count - personal_epici) != 0) {
                res_text += "\n> Epici: " + (e_count - personal_epici);
                diff += Math.abs(personal_epici - c_count);
            }
            if ((ue_count - personal_ultra_epici) != 0) {
                res_text += "\n> Ultra Epici: " + (ue_count - personal_ultra_epici);
                diff += Math.abs(personal_ultra_epici - c_count);
            }
            if ((u_count - personal_unici) != 0) {
                res_text += "\n> Unici: " + (u_count - personal_unici);
                diff += Math.abs(personal_unici - c_count);
            }
            if ((s_count - personal_speciali) != 0) {
                res_text += "\n> S: " + (s_count - personal_speciali);
                diff += Math.abs(personal_speciali - c_count);
            }
            if ((x_count - personal_x) != 0) {
                res_text += "\n> X: " + (x_count - personal_x);
                diff += Math.abs(personal_x - c_count);
            }
            if ((d_count - personal_draconici) != 0) {
                res_text += "\n> Draconici: " + (d_count - personal_draconici);
                diff += Math.abs(personal_draconici - c_count);
            }
            if ((a_count - personal_artefatti) != 0) {
                res_text += "\n> Artefatti: " + (a_count - personal_artefatti);
                diff += Math.abs(personal_artefatti - c_count);
            }
            if ((in_count - personal_inestimabili) != 0) {
                res_text += "\n> IN: " + (in_count - personal_inestimabili);
                diff += Math.abs(personal_inestimabili - c_count);
            }
            if (diff == 0) {
                res_text = "*Wow!*\n\n_Sono perfettamente sincronizzato..._ ♼";
            }


            return compareItems_res(res_text);

        });
    });
}

function countRarity(rarity_array) {
    let count = 0;
    for (let i = 0; i < rarity_array.length; i++) {
        count += rarity_array[i].item_quantity;
    }
    return count;
}

function analize_StringaNegozio(toAnalyze_array, command_message, argo_user) {
    return new Promise(function (analize_StringaNegozio_res) {
        let final_string = "`/negozio ";
        console.log("Entro con:");
        console.log(toAnalyze_array);

        let new_quantity = command_message.indexOf("di");
        if (new_quantity >= 0 && command_message.length > new_quantity) {
            new_quantity = parseInt(command_message[new_quantity + 1]);
        }
        if (isNaN(new_quantity)) {
            new_quantity = 1;
        }

        let new_price = 1;

        let copy_counter = 0;
        let items_counter = 0;
        let tmp_line;
        let tmp_tmp;

        for (let i = 0; i < toAnalyze_array.length; i++) {
            if (toAnalyze_array[i].length > 5) {
                tmp_line = toAnalyze_array[i].split(",");
                if (tmp_line.length > 0) {
                    for (let j = 0; j < tmp_line.length; j++) {
                        tmp_tmp = tmp_line[j].split(":");
                        if (tmp_tmp.length == 3) {
                            items_counter += 1;
                            copy_counter += (isNaN(new_quantity) ? parseInt(tmp_tmp[2]) : new_quantity);
                            final_string += tmp_tmp[0] + ":" + new_price + ":" + (isNaN(new_quantity) ? tmp_tmp[2] : new_quantity);
                            if (j < (tmp_line.length - 1)) {
                                final_string += ",";
                            }
                        }
                    }
                    if (i < (tmp_line.length - 1)) {
                        final_string += "`\n\n`";
                    }
                }
            }
        }
        final_string += "`\n\n*" + items_counter + " Oggetti*\n_..." + copy_counter + " copie_";


        analize_StringaNegozio_res(final_string);

    });
}

function parseNegozi(text_array, fixedQ, drago_lv, atBaseValue) {
    console.log("> parse negozi da:");
    console.log(text_array);
    if (typeof atBaseValue == "undefined") {
        atBaseValue = false;
    }
    let resText = "";
    let tmpArray = [];
    let sing_pos;
    let name;
    let quantity = -1;
    if (fixedQ != false) {
        quantity = fixedQ;
    } else {
        quantity = -1;
    }

    let counter = 0;
    let copyCounter = 0;
    let avaible_object = [];
    let requested_object = [];

    let drago_total_point = -1;
    let pietre_count;

    let price = 1;

    if (drago_lv) {
        pietre_count = {
            legno: 0,
            ferro: 0,
            diamante: 0,
            preziosa: 0,
            leggendario: 0,
            epico: 0
        }
    }
    let tmp_quantity = -1;
    for (let i = 0; i < text_array.length; i++) {
        if (drago_lv == false) {
            if (text_array[i].indexOf("> ") == 0) {
                counter++;
                if (text_array[i].indexOf("✅") > 0) {
                    sing_pos = text_array[i].indexOf("/");
                    quantity = parseInt(text_array[i].substring(sing_pos + 1, sing_pos + 2));
                    quantity = (isNaN(quantity) ? 1 : quantity);
                    console.log(typeof (quantity));
                    name = text_array[i].substring(text_array[i].indexOf("> ") + 2, text_array[i].indexOf(" ("));
                    if (name.length > 4) {
                        avaible_object.push(name.trim() + ":1:" + quantity);
                        copyCounter += quantity;
                    }

                } else if (text_array[i].indexOf("🚫") > 0) {
                    sing_pos = text_array[i].indexOf("/");
                    quantity = parseInt(text_array[i].substring(sing_pos + 1, sing_pos + 2)) - parseInt(text_array[i].substring(text_array[i].indexOf(") ") + 2, sing_pos));
                    quantity = (isNaN(quantity) ? 1 : quantity);
                    name = text_array[i].substring(text_array[i].indexOf("> ") + 2, text_array[i].indexOf(" ("));
                    requested_object.push(name.trim() + ":1:" + quantity);
                    copyCounter += quantity;
                } else {
                    tmp_quantity = parseInt(text_array[i].substring(text_array[i].indexOf(", ") + 1, text_array[i].indexOf(")")).split(".").join(""));
                    if (!isNaN(tmp_quantity)) {
                        name = text_array[i].substring(2, text_array[i].indexOf(" ("));
                    } else {
                        tmp_quantity = parseInt(text_array[i].substring(text_array[i].indexOf("(") + 1, text_array[i].indexOf(")")).split(".").join(""));
                        if (!isNaN(tmp_quantity)) {
                            name = text_array[i].substring(2, text_array[i].indexOf(" ("));
                        } else {
                            tmp_quantity = parseInt(text_array[i].substring(text_array[i].indexOf("su ") + 3, text_array[i].indexOf(" di")).split(".").join(""));
                            if (!isNaN(tmp_quantity)) {
                                name = text_array[i].substring(text_array[i].indexOf("di ") + 3, text_array[i].indexOf(" ("));
                            } else {
                                tmp_quantity = parseInt(text_array[i].substring(2, text_array[i].indexOf("x")).split(".").join(""));
                                if (!isNaN(tmp_quantity)) {
                                    name = text_array[i].substring(text_array[i].indexOf("x") + 1, text_array[i].indexOf(" ("));
                                } else {
                                    tmp_quantity = 1;
                                    name = text_array[i].substring(1, text_array[i].indexOf(" (")).trim();
                                    console.log("> Errore, non ho capito la linea: " + text_array[i]);
                                }
                            }
                        }
                    }

                    let item = items_manager.quick_itemFromName(name, false, 1);
                    if (item.length > 0) {
                        item = item[0];

                        if (atBaseValue != false) {
                            price = parseInt(atBaseValue);
                        }
                        console.log("Son qui dentro?");
                        if (quantity == -1) {
                            quantity = tmp_quantity;
                        }
                        copyCounter += quantity;

                        if (tmpArray.length != 0 && tmpArray.length % 10 == 0) {
                            resText += "\n`/negozio " + tmpArray.join(",") + "`\n";
                            tmpArray = [];
                        }
                        tmpArray.push("" + name.trim() + ":" + price + ":" + quantity);


                    } else {
                        console.log("> Whoops! non ho riconosciuto un oggetto!");
                        console.log("> imputName: " + name);
                        console.log("> tmp_quantity: " + tmp_quantity);

                    }
                }

                if (fixedQ != false) {
                    quantity = fixedQ;
                } else {
                    quantity = -1;
                }

            } else if (text_array[i].toLowerCase().indexOf("già possiedi:") >= 0) {
                break;
            }
        } else {
            if (drago_lv == true) {
                break;
            }
            if (text_array[i].substring(0, 9) == ("> pietra ")) {
                number = parseInt(text_array[i].substring(text_array[i].indexOf("(d, ") + 3, text_array[i].indexOf(")")).split(".").join(""));
                if (isNaN(number)) {
                    number = parseInt(text_array[i].substring(text_array[i].indexOf(" (") + 2, text_array[i].indexOf(")")).split(".").join(""));
                }

                if (text_array[i].match(" legno")) {
                    pietre_count.legno += number * 1;
                    drago_total_point += 1 * number;
                } else if (text_array[i].match(" ferro")) {
                    pietre_count.ferro += number * 2;
                    drago_total_point += 2 * number;
                } else if (text_array[i].match(" preziosa")) {
                    pietre_count.preziosa += number * 3;
                    drago_total_point += 3 * number;
                } else if (text_array[i].match(" diamante")) {
                    pietre_count.diamante += number * 4;
                    drago_total_point += 4 * number;
                } else if (text_array[i].match(" leggendario")) {
                    pietre_count.leggendario += number * 5;
                    drago_total_point += 5 * number;
                } else if (text_array[i].match(" epico")) {
                    pietre_count.epico += number * 6;
                    drago_total_point += 6 * number;
                }
            }


        }
    }

    if (drago_lv == false) {
        if (tmpArray.length > 0) {
            resText += "\n`/negozio " + tmpArray.join(",") + "`";
        }

        if (avaible_object.length > 0) {
            resText += "\n✅ *Dei tuoi oggetti: *\n`/negozio ";
            for (let i = 0; i < avaible_object.length; i++) {
                resText += avaible_object[i];
                if (i != 0 && (i + 1) % 10 == 0) {
                    resText += "`\n\n`/negozio ";
                } else if (i < (avaible_object.length - 1)) {
                    resText += ",";
                }
            }
            resText += "`\n";
        }

        if (requested_object.length > 0) {
            resText += "\n\n🚫 *Che non hai:*\n`/negozio ";
            for (let i = 0; i < requested_object.length; i++) {
                resText += requested_object[i];
                if (i != 0 && (i + 1) % 10 == 0) {
                    resText += "`\n\n`/negozio ";
                } else if (i < (requested_object.length - 1)) {
                    resText += ",";
                }
            }
            resText += "`\n";
        }


    } else {
        if (drago_lv == true) {
            resText = "*Whoops!*\nPardon, di quanti livelli?";
        } else {
            console.log("Alla fine dei giochi: (pietre_count)");
            console.log(pietre_count);
            console.log("Punti totali: " + drago_total_point);
            console.log("Punti richiesti: " + drago_lv * 70);
            let impact = ((drago_lv * 70 * 100) / drago_total_point).toFixed(2);
            console.log("Percentuale impatto: " + impact + "%");

            let taken = 0;
            let diff = ((drago_lv * 70) - taken);
            if (drago_total_point == -1) {
                drago_total_point = 700000;
                pietre_count = {
                    legno: 200,
                    ferro: 200,
                    diamante: 100,
                    preziosa: 100,
                    leggendario: 100,
                    epico: 100
                }
            }
            let used_count = {
                legno: 0,
                ferro: 0,
                diamante: 0,
                preziosa: 0,
                leggendario: 0,
                epico: 0
            }
            let tmp_slave = -1;
            let escape = 0;

            while (diff != 0) {
                if (escape > 20) {
                    break;
                }
                if (diff > 6) {
                    if (used_count.preziosa < pietre_count.preziosa) {
                        tmp_slave = 3 * Math.round((((pietre_count.preziosa - used_count.preziosa) * 10) / 100) / 3);
                        taken += tmp_slave;
                        used_count.preziosa += tmp_slave;
                    }
                    diff = ((drago_lv * 70) - taken);
                    if (diff > 6) {
                        if (used_count.diamante < pietre_count.diamante) {
                            tmp_slave = 4 * Math.round((((pietre_count.diamante - used_count.diamante) * 10) / 100) / 4);
                            taken += tmp_slave;
                            used_count.diamante += tmp_slave;
                        }
                        diff = ((drago_lv * 70) - taken);
                        if (diff > 6) {
                            if (used_count.ferro < pietre_count.ferro) {
                                tmp_slave = 2 * Math.round((((pietre_count.ferro - used_count.ferro) * 10) / 100) / 2);
                                taken += tmp_slave;
                                used_count.ferro += tmp_slave;
                            }
                            diff = ((drago_lv * 70) - taken);
                            if (diff > 6) {
                                if (used_count.legno < pietre_count.legno) {
                                    tmp_slave = Math.floor(((pietre_count.legno - used_count.legno) * 10) / 100)
                                    taken += tmp_slave;
                                    used_count.legno += tmp_slave;
                                }
                                diff = ((drago_lv * 70) - taken);
                                if (diff > 6) {
                                    if (used_count.leggendario < pietre_count.leggendario) {
                                        tmp_slave = 5 * Math.round((((pietre_count.leggendario - used_count.leggendario) * 10) / 100) / 5);
                                        taken += tmp_slave;
                                        used_count.leggendario += tmp_slave;
                                    }
                                    diff = ((drago_lv * 70) - taken);
                                    if (diff > 6) {
                                        if (used_count.epico < pietre_count.epico) {
                                            tmp_slave = 6 * Math.round((((pietre_count.epico - used_count.epico) * 10) / 100) / 6);
                                            taken += tmp_slave;
                                            used_count.epico += tmp_slave;
                                        }
                                    }

                                }

                            }

                        }
                    }
                } else if (diff > 0) {
                    tmp_slave = ((drago_lv * 70) - taken);
                    if (tmp_slave == 6) {
                        taken -= 6;
                        used_count.epico -= 5;
                    } else if (tmp_slave == 5) {
                        taken -= 5;
                        used_count.leggendario -= 5;
                    } else if (tmp_slave == 4) {
                        taken -= 4;
                        used_count.diamante -= 4;
                    } else if (tmp_slave == 3) {
                        taken -= 3;
                        used_count.preziosa -= 3;
                    } else if (tmp_slave == 2) {
                        taken -= 2;
                        used_count.ferro -= 2;
                    } else if (tmp_slave == 1) {
                        taken -= 1;
                        used_count.legno -= 1;
                    }
                } else {
                    diff = Math.abs(diff);
                    if (diff / 6 >= 1 && used_count.epico > 0) {
                        tmp_slave = 6 * Math.floor(diff / 6);
                        if (used_count.epico < tmp_slave) {
                            tmp_slave = used_count.epico;
                        }
                        taken -= tmp_slave;
                        used_count.epico -= tmp_slave;
                    } else if (diff / 5 >= 1 && used_count.leggendario > 0) {
                        tmp_slave = 5 * Math.floor(diff / 5);
                        if (used_count.leggendario < tmp_slave) {
                            tmp_slave = used_count.leggendario;
                        }
                        taken -= tmp_slave;
                        used_count.leggendario -= tmp_slave;
                    } else if (diff / 4 >= 1 && used_count.diamante > 0) {
                        tmp_slave = 4 * Math.floor(diff / 4);
                        if (used_count.diamante < tmp_slave) {
                            tmp_slave = used_count.diamante;
                        }
                        taken -= tmp_slave;
                        used_count.diamante -= tmp_slave;
                    } else if (diff / 3 >= 1 && used_count.preziosa > 0) {
                        tmp_slave = 3 * Math.floor(diff / 3);
                        if (used_count.preziosa < tmp_slave) {
                            tmp_slave = used_count.preziosa;
                        }
                        taken -= tmp_slave;
                        used_count.preziosa -= tmp_slave;
                    } else if (diff / 2 >= 1 && used_count.ferro > 0) {
                        tmp_slave = 2 * Math.floor(diff / 2);
                        if (used_count.ferro < tmp_slave) {
                            tmp_slave = used_count.ferro;
                        }
                        taken -= tmp_slave;
                        used_count.ferro -= tmp_slave;
                    } else if (used_count.legno > 0) {
                        tmp_slave = Math.floor(diff);

                        if (used_count.legno < tmp_slave) {
                            tmp_slave = used_count.legno;
                        }

                        taken -= tmp_slave;
                        used_count.legno -= tmp_slave;
                    }

                }

                escape++;
                tmp_slave = -1
                diff = ((drago_lv * 70) - taken);
            }

            if (escape == 100) {
                console.log("Malissimo!");
            }
            console.log("> used_count: ");
            console.log(used_count);
            console.log("> Total taken: " + taken);

            if (used_count.legno > 0) {
                counter++;
                tmpArray.push("Pietra Anima di Legno:1:" + used_count.legno);
            }
            if (used_count.ferro > 0) {
                counter++;
                tmpArray.push("Pietra Anima di Ferro:1:" + used_count.ferro / 2);
            }
            if (used_count.preziosa > 0) {
                counter++;
                tmpArray.push("Pietra Anima Preziosa:1:" + used_count.preziosa / 3);
            }
            if (used_count.diamante > 0) {
                counter++;
                tmpArray.push("Pietra Cuore di Diamante:1:" + used_count.diamante / 4);
            }
            if (used_count.leggendario > 0) {
                counter++;
                tmpArray.push("Pietra Cuore Leggendario:1:" + used_count.leggendario / 5);
            }
            if (used_count.epico > 0) {
                counter++;
                tmpArray.push("Pietra Spirito Epico:1:" + used_count.epico / 6);
            }
            copyCounter = taken;
            resText = "`/negozio " + tmpArray.join(", ") + "`\n\n";


        }

    }




    return { objects: counter, copyes: copyCounter, text: resText.trim() };
}

function manageDeposit(objectList_text) {
    console.log("Manage deposit per:");
    console.log(objectList_text);
    let eco_text = "`/deposita ";
    let text_array = objectList_text.trim().split("\n");

    let tmp_index;

    for (let i = 0; i < text_array.length; i++) {
        tmp_index = text_array[i].indexOf("(");

        if (text_array[i].charAt(0) == ">" && tmp_index > 0) {
            if (isNaN(text_array[i].charAt(tmp_index) + 1)) {
                eco_text += text_array[i].substring(1, tmp_index).trim() + ":" + text_array[i].substring(text_array[i].indexOf(",") + 2, text_array[i].indexOf(")"));
            } else {
                eco_text += text_array[i].substring(1, tmp_index).trim() + ":" + text_array[i].substring(tmp_index + 1, text_array[i].indexOf(")"));
            }
            if (i != 0 && ((i + 1) % 10 == 0)) {
                eco_text += "`\n\n`/deposita ";
            } else if (i < (text_array.length - 1)) {
                eco_text += ", ";
            }
        }

    }
    return eco_text + "`";
}
function parsePietre(messageText) {
    let array = messageText.split("\n");
    let counter = 0;
    let number;
    if (array[0] == "/negozio") {

    }
    for (let i = 0; i < array.length; i++) {
        if (array[i].substring(0, 9) == ("> Pietra ")) {
            number = parseInt(array[i].substring(array[i].indexOf("(D, ") + 3, array[i].indexOf(")")).split(".").join(""));
            if (isNaN(number)) {
                number = parseInt(array[i].substring(array[i].indexOf(" (") + 2, array[i].indexOf(")")).split(".").join(""));
            }
            if (array[i].match(" Legno")) {
                counter += 1 * number;
            } else if (array[i].match(" Ferro")) {
                counter += 2 * number;
            } else if (array[i].match(" Preziosa")) {
                counter += 3 * number;
            } else if (array[i].match(" Diamante")) {
                counter += 4 * number;
            } else if (array[i].match(" Leggendario")) {
                counter += 5 * number;
            } else if (array[i].match(" Epico")) {
                counter += 6 * number;
            }
        }
    }

    return { point: counter, levels: (counter > 0 ? (counter / 70) : 0) };
}

// #DITUTTO ACCESSORIO

function capitalizeArray(string_array) {
    for (let i = 0; i < string_array.length; i++) {
        if (string_array[i].length > 1) {
            string_array[i] = string_array[i][0].toUpperCase() + string_array[i].slice(1);
        }
    }
    return string_array;
}

function formatNumber(num) {
    if (typeof num != "undefined") {
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
    } else {
        return "-1";
    }
}

function parsePrice(price) {
    let final_text = " - ";
    if (price) {
        final_text = "";
        if (Math.abs(price) > 1000) {
            if ((Math.abs(price) / 1000000) > 1) {
                final_text += "" + (price / 1000000).toFixed(2) + "M §";
            } else {
                final_text += "" + (price / 1000).toFixed(2) + "K §";
            }
        } else {
            final_text += "" + price.toLocaleString() + " §";
        }
    }
    return final_text;
}

function parsePrice_simple(price) {
    let final_text = "";
    if (price > 1000) {
        if ((price / 1000000) > 1) {

            final_text += (price / 1000000).toFixed(6) + " §";
        } else {
            final_text += (price / 1000).toFixed(3) + " §";
        }
    } else {
        final_text += price.toLocaleString() + " §";
    }
    return final_text;
}

function edollaroFormat(num) {
    let tmp = num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
    tmp = tmp.split(",").join(" ").split(".").join(",").split(" ").join(".");
    if (tmp.substring(tmp.length - 2, tmp.length) == 00) {
        tmp = tmp.substring(0, tmp.length - 3)
    }
    return tmp + " §";
}

function parseLong(longNumber) {
    let final_text = "";
    if (longNumber > 1000) {
        if (longNumber > 1000000) {
            longNumber = (longNumber / 1000000);
            // if (longNumber % longNumber == 0) {
            //     final_text = "*" + (longNumber).toFixed() + "M*";
            // } else {

            final_text = "*" + (longNumber).toFixed(3) + "M*";
            //}
        } else {
            longNumber = (longNumber / 1000);
            // if (longNumber % longNumber == 0) {
            //     final_text = "*" + (longNumber).toFixed() + "K*";
            // } else {
            final_text = "*" + (longNumber).toFixed(3) + "K*";
            //}
        }
    } else {
        final_text += "*" + longNumber + "*";
    }
    return final_text;
}

function parseDate(long) {
    let text = "";
    let update = new Date(long);
    text += String("0" + update.getHours()).slice(-2) + ":" + String("0" + update.getMinutes()).slice(-2);
    if (((Date.now() - long) / (1000 * 60 * 60)) > 24) {
        if (update.getDate() != 1 && update.getDate() != 8) {
            text += ", del ";
        } else {
            text += ", dell'";
        }
        text += update.getDate() + "/" + (update.getMonth() + 1);
    }
    return text;

}

function getMonthString(date) {
    let curr_month = date.getMonth() + 1;
    let month_string = { article: "di ", name: "" };
    switch (curr_month) {
        case 1: {
            month_string.name = "Gennaio";
            break;
        }
        case 2: {
            month_string.name = "Febbraio";
            break;
        }
        case 3: {
            month_string.name = "Marzo";
            break;
        }
        case 4: {
            month_string.name = "Aprile";
            month_string.article = "d'";
            break;
        }
        case 5: {
            month_string.name = "Maggio";
            break;
        }
        case 6: {
            month_string.name = "Giugno";
            break;
        }
        case 7: {
            month_string.name = "Luglio";
            break;
        }
        case 8: {
            month_string.name = "Agosto";
            month_string.article = "d'";
            break;
        }
        case 9: {
            month_string.name = "Settembre";
            break;
        }
        case 10: {
            month_string.name = "Ottobre";
            break;
        }
        case 11: {
            month_string.name = "Novembre";
            break;
        }
        case 12: {
            month_string.name = "Dicembre";
            break;
        }
    }
    return month_string;
}

function getIspezionabili(forUserR) {
    return new Promise(function (getIspezionabili_res) {
        model.argo_pool.query("SELECT * FROM Argonauti WHERE global_pos IS NOT NULL ORDER BY ispezione_InLimit DESC", function (err, res) {
            if (res.length > 0) {
                let finalText = "";
                let counter = 0;
                let toParse;
                let nowDate = Date.now() / 1000;
                let difference;
                let rinascita = forUserR != null ? forUserR : 0;


                for (let i = 0; i < res.length; i++) {
                    toParse = res[i].global_pos.split(":");
                    difference = (nowDate - toParse[2]);
                    if (difference < (3600 * 6) && res[i].ispezione_InLimit > 0 && res[i].rinascita != null && res[i].rinascita >= rinascita) {
                        if (difference < (3600)) {
                            finalText += res[i].ispezione_InLimit + "⁺)\n";
                        } else if ((nowDate - toParse[2]) > (3600 * 3)) {
                            finalText += res[i].ispezione_InLimit + "ꜝ)\n";
                        } else {
                            finalText += res[i].ispezione_InLimit + ")\n";
                        }
                        finalText += "  `ispeziona: " + res[i].nick + "`\n  *" + toParse[0] + "°* " + res[i].ability + " ⇑ \n\n";
                        counter++;
                    }
                }
                if (counter > 0) {
                    if (counter == 1) {
                        finalText = "Un solo Argonauta,\n_mi risulta \"ispezionabile\"_\n\n" + finalText;
                    } else {
                        finalText = counter + " Argonauti,\n_mi risultano \"ispezionabili\"_\n\n" + finalText;
                    }
                    getIspezionabili_res(finalText);
                } else {
                    getIspezionabili_res("Forse non ci crederai, ma di nessun Argonauta ho info aggiornate");
                }
            } else {
                console.log(err);
            }
        });
    });
}

function getCurrGlobalTitle(nowDate) {
    let res_text = "🌐 *Globale ";

    if (nowDate.getUTCMonth() == "3") {
        res_text += "d'Aprile ";
    } else if (nowDate.getUTCMonth() == "7") {
        res_text += "d'Agosto ";
    } else if (nowDate.getUTCMonth() == "9") {
        res_text += "d'Ottobre ";
    } else if (nowDate.getUTCMonth() == "0") {
        res_text += "di Gennaio ";
    } else if (nowDate.getUTCMonth() == "1") {
        res_text += "di Febbraio ";
    } else if (nowDate.getUTCMonth() == "2") {
        res_text += "di Marzo ";
    } else if (nowDate.getUTCMonth() == "4") {
        res_text += "di Maggio ";
    } else if (nowDate.getUTCMonth() == "5") {
        res_text += "di Giugno ";
    } else if (nowDate.getUTCMonth() == "6") {
        res_text += "di Luglio ";
    } else if (nowDate.getUTCMonth() == "8") {
        res_text += "di Settembre ";
    } else if (nowDate.getUTCMonth() == "10") {
        res_text += "di Novembre ";
    } else if (nowDate.getUTCMonth() == "11") {
        res_text += "di Dicembre ";
    }
    res_text += nowDate.getUTCFullYear() + "*";

    return res_text;
}

function groupBy(xs, key) {
    return xs.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, []);
};

function manageRuneQuestion(user_id, in_query_id, rune_question) {
    return new Promise(function (manageRuneQuestion_res) {
        let toparse = rune_question.split(" ").join("").split(",").join("");
        let inline_result = {};
        let res_array = [];

        let default_info = "*Mago delle Rune*\n\nPerché stare a ragionare?\nScrivi quali rune hai e tappa il primo risultato. Ci pensa Al!";
        if (toparse.length == 5) {
            let ligth_array = [];
            let heavy_array = [];
            let ethereogeneity = 1;
            let random_array = toparse.split("");

            for (let i = 0; i < random_array.length; i++) {
                if (ligth_array.indexOf(random_array[i]) < 0) {
                    ligth_array.push(random_array[i]);
                    heavy_array.push({ number: random_array[i], quantity: 1, index: (1 + i) });
                } else {
                    ethereogeneity++;
                    for (let k = 0; k < heavy_array.length; k++) {
                        if (heavy_array[k].number == random_array[i]) {
                            heavy_array[k].quantity++;
                            break;
                        }
                    }
                }
            }

            heavy_array.sort(function (a, b) {
                var n = a.quantity - b.quantity;
                if (n !== 0) {
                    return n;
                }
                return a.number - b.number;
            });

            let change_array = [];

            if (ethereogeneity == 1) {
                let start = heavy_array[0].number;
                let isContinuos = true;
                console.log("> Numero piu basso:" + start);

                for (let k = 1; k < 5; k++) {
                    if (heavy_array[k].number != (parseInt(start) + 1)) {
                        isContinuos = false;
                        console.log("> Caga fuori, " + heavy_array[k].number + " != " + (start + 1));
                        console.log(heavy_array[k]);
                        break;
                    } else {
                        start++;
                    }
                }
                if (isContinuos) {
                    inline_result.title = "Hai una scala...";
                    inline_result.desc = "Non la cambierei"
                    inline_result.to_send = "Torna dallo Gnomo";
                } else {
                    inline_result.title = "Le cambierei tutte";
                    inline_result.desc = "Inutile cercare una scala"
                    inline_result.to_send = "1, 2, 3, 4, 5";
                }
            } else {
                let limit = (ethereogeneity / heavy_array.length) <= 1 ? 2 : Math.round(1 + (ethereogeneity / heavy_array.length));
                if (limit > 5) {
                    limit = 5;
                }
                console.log("> Limite: " + limit);
                for (let k = 0; k < heavy_array.length; k++) {
                    if (heavy_array[k].quantity < limit) {
                        change_array.push(heavy_array[k]);
                    }
                }
                console.log("> change_array.length: " + change_array.length);



                if (change_array.length == 0) {
                    inline_result.title = "Io non cambierei nulla...";
                    inline_result.desc = "Cerchi runa-alta?"
                    inline_result.to_send = "Torna dallo Gnomo";
                } else if (change_array.length == 1) {
                    console.log("> Limite: " + limit)
                    if (limit == 3 && change_array[0].quantity == 2) {
                        inline_result.title = "Hai un Full!";
                        inline_result.desc = "Starei..."
                        inline_result.to_send = "Torna dallo Gnomo";
                    } else {
                        inline_result.title = "Cambierei solo una runa, ";

                        if (change_array[0].number == 1) {
                            inline_result.desc = "...l'1!";
                        } else {
                            if ((1 + Math.random() * 7) % 3 == 0) {
                                inline_result.desc = "...la " + change_array[0].index + "°!";
                            } else {
                                inline_result.desc = "...il " + change_array[0].number + "!";
                            }
                        }

                        inline_result.to_send = change_array[0].index;
                    }

                } else if (change_array.length == 5) {
                    inline_result.title = "Le cambierei tutte";
                    inline_result.desc = "Inutile cercare una scala"
                    inline_result.to_send = "1, 2, 3, 4, 5";
                } else {
                    let suggestion = [];

                    for (let k = 0; k < change_array.length; k++) {
                        if (change_array[k].number == 1) {
                            suggestion.push("l'1");
                        } else {
                            suggestion.push("il " + change_array[k].number);
                        }
                    }
                    inline_result.title = "Cambierei:";
                    let last = suggestion[suggestion.length - 1];
                    suggestion.pop();
                    inline_result.desc = suggestion.join(", ") + " e " + last;

                    let to_send_Numbers = [];
                    for (let i = 0; i < change_array.length; i++) {
                        to_send_Numbers.push(change_array[i].index);
                    }
                    inline_result.to_send = to_send_Numbers.join(", ");
                }




            }

        } else {
            inline_result.title = "Quali rune hai?";
            inline_result.desc = "Scrivilo di seguito\n"
            if (toparse.length == 4) {
                inline_result.desc += "(Ancora una)";
            } else {
                inline_result.desc += "(Mancano " + (5 - toparse.length) + " rune)";
            }
            inline_result.to_send = default_info;

        }

        res_array = parseInlineResult(user_id, in_query_id, "error", res_array, inline_result);
        manageRuneQuestion_res(res_array);
    });
}

// #CONTRABBANDIERE

function getAllSmugglerItem() {
    return new Promise(function (allSmugglerItems) {
        let query = "SELECT name, rarity, offert_counter, ";
        query += "smuggler_max_value AS max_value, ";
        query += "smuggler_min_value AS min_value ";
        query += "FROM LootItems ";
        query += "WHERE smuggler_min_value > 0 ";
        query += "ORDER BY smuggler_min_value DESC"

        return model.argo_pool.query(query, function (err, smugglerItems) {
            if (err) {
                console.log(err);
                allSmugglerItems("Mannaggia!");
            } else {
                let res_text = "ⓘ *Statistiche di Contrabbando*\n\n";
                res_text += "> Richiesti " + smugglerItems.length + " craftabili su " + items_manager.getItemsCount().craftable + "\n";

                res_text += "Ecco l'elenco (per prezzo minimo pagato)\n\n";

                for (let i = 0; i < smugglerItems.length; i++) {
                    res_text += "> " + smugglerItems[i].name + ", " + smugglerItems[i].rarity + " (" + smugglerItems[i].offert_counter + ")\n";//+parsePrice(smugglerItems[i].max_value)+"\n";
                }



                console.log(res_text);

                allSmugglerItems(res_text);

            }

        });
    });
}

function parseSmuggler(offertText, private, update) {
    return new Promise(function (parseSmuggler_res) {
        let guy = offertText.substring("Benvenut".length + 2, offertText.indexOf("!"));
        let thie_line = offertText.split("\n")[3];
        let price = parseInt(thie_line.substring(thie_line.indexOf("prezzo di ") + 10, thie_line.indexOf(" §")).split(".").join(""));
        if (typeof price == NaN) {
            parseSmuggler_res([false, "😤\nNon sono riuscito a ricavare il prezzo, " + guy.split("_").join("\\_") + "\nVuoi vedere che edo ha cambiato qualche spazio? _'naggia oh!_"]);
        } else {
            let ItemName = thie_line.substring(0, thie_line.indexOf(" ("));
            console.log("> Utente: " + guy + ", Oggetto: `" + ItemName + "`, prezzo: " + price);
            return items_manager.getItem(ItemName, price, guy, update).then(function (resItem) {
                if (resItem == false) {
                    parseSmuggler_res([false, { item: ItemName, sell_price: price, user: guy }]);
                } else {
                    let text = "";
                    if (private) {
                        text = "👣 *Craft per Contrabbando*\n> " + ItemName + " (" + resItem.rarity + ")";
                        if (thie_line.indexOf("✅") > 0) {
                            text += " ✅";
                        }
                        text += "\n\n· PC: " + resItem.craft_pnt + "";
                        text += "\n· Venderai a: " + formatNumber(price) + " §\n";
                        let tmp_sellAndBase_proportion = 0;
                        if (resItem.market_medium_value > 0) {
                            text += "· Mercato: " + parsePrice(resItem.market_medium_value) + " ";
                            if ((resItem.market_medium_value - resItem.base_value) > 0) {
                                tmp_sellAndBase_proportion = Math.round(resItem.market_medium_value / resItem.base_value);
                                if (tmp_sellAndBase_proportion > 1) {
                                    text += "(base x" + tmp_sellAndBase_proportion + ")\n";
                                } else {
                                    text += "(base +" + parsePrice(resItem.market_medium_value - resItem.base_value) + ")\n";
                                }
                            }
                        }


                        if (resItem.smuggler_max_value > 0) {
                            //let proportion = 100 - Math.round((100 * price) / resItem.smuggler_max_value);
                            // if... resItem.market_medium_value <= price, if (proportion < 15)
                            text += "\n";

                            if (price >= (resItem.smuggler_min_value + (resItem.smuggler_min_value / 10))) {
                                text += "· 👍\n";
                            } else {
                                text += "· 👎\n";
                            }
                        }

                    } else {
                        text = "#RichiestaContrabbandiere da " + guy.split("_").join("\\_") + "\n\n" +
                            "" + ItemName + " (" + resItem.craft_pnt + " pc)\n" +
                            "per: " + parsePrice(price) + " o più\n";

                        if (resItem.lucky_guy != null) {
                            text += "\n👑\n" + resItem.lucky_guy + " con " + parsePrice(resItem.smuggler_max_value) + "\n";
                            if (resItem.smuggler_min_value > 0) {
                                text += "Minimo storico: " + parsePrice(resItem.smuggler_min_value);
                            }
                        } else {
                            text += "\nÈ una nuova offerta! 🌱 \n";
                        }
                    }
                    parseSmuggler_res([true, text, resItem.id]);
                }
            });
        }
    });
}

function parseMySmuggler(smuggler_text, user_query) {
    return new Promise(function (parseMySmuggler_res) {
        let tmp = smuggler_text.split("\n");
        let res_text = "";
        let res_asker_text = "";
        let guy;
        let item_name = "Colla Vinilica";
        let price = 0;

        if (tmp[0].indexOf("#RichiestaContrabbandiere ") == 0) {
            guy = tmp[0].substring(tmp[0].indexOf(" da ") + 4, tmp[0].length);
            item_name = tmp[2].substring(0, tmp[2].indexOf(" ("));
            price = parseFloat(tmp[3].substring(tmp[3].indexOf("per: ") + 5, tmp[3].indexOf(" §")));
            if (tmp[3].indexOf("K ") > 0) {
                price *= 1000;
            } else if (tmp[3].indexOf("M ") > 0) {
                price *= 1000000;
            }
            res_text = "`/negozio " + item_name + ":" + price + ":1`";
            res_text += "\n`/offri " + item_name + "," + price + ", " + guy + "`";
            res_text += "\n`/craft " + item_name + "`";
            res_text += "\n`/craftc " + item_name + "`";

            res_text += "\n\n*" + item_name + "*, " + parsePrice(price) + "\nA _" + guy.split("_").join("\\_") + "_";

            res_asker_text = "👣 *" + user_query.split("_").join("\\_") + "* si offre!";
        } else {
            guy = tmp[1].substring(tmp[0].indexOf(" da ") + 4, tmp[0].length);

            for (let i = 0; i < tmp.length; i++) {
                //if() // RECENTE
            }
        }
        console.log("offerer: " + guy);

        parseMySmuggler_res({ offerer: guy, item: item_name, item_price: price, text: res_text, asker_text: res_asker_text });
    });
}

function smuggler_StatUpdate(id, date, overall_gain, talento_gain, coupon_gain) {
    return new Promise((db_call) => {
        let now_date = new Date(Date.now())
        now_date.setHours("09", "00", "00", "00");

        now_date = now_date.getTime();

        let query = `INSERT INTO ${model.tables_names.contrabbando} `;
        query += `(id, date, overall_gain, talento_gain, coupon_gain) VALUES ? `;
        //query += `ON DUPLICATE KEY UPDATE overall_gain=VALUES(\`overall_gain\`), talento_gain=VALUES(\`talento_gain\`), coupon_gain=VALUES(\`coupon_gain\`);` ;

        return model.argo_pool.query(query, [[[id, date, overall_gain, talento_gain, coupon_gain]]], (err, res) => {
            if (!err) {
                return db_call(1);
            } else if (err.code == "ER_DUP_ENTRY") {
                return db_call(0);
            } else {
                console.error(err);
                return db_call(-1);
            }
        });
    });

}

function smugglerGain_manager(imput_text, user, m_date) {
    return new Promise(async (gain_res) => {
        /*
        {
            id: ,
            date: ,
            coupon_gain: 0,
            talento_gain: 0
            overall_gain: 0,
        }
        */
        let message_text = "*Statistiche di Contrabbando* 👣\n\n";

        let overall_gain = parseInt(imput_text.substring(imput_text.indexOf(" per ") + 5, imput_text.indexOf(" §")).split(".").join(""));
        let talento_gain = 0;
        let coupon_gain = 0;

        if (imput_text.indexOf(" talento") > 0) {
            let tmp_text = imput_text;
            if (isNaN(tmp_text.charAt(tmp_text.indexOf("(") + 1))) {
                tmp_text = tmp_text.substring(tmp_text.indexOf(")") + 1, tmp_text.length);
            }
            talento_gain = parseInt(tmp_text.substring(tmp_text.indexOf("(") + 1, tmp_text.indexOf(" § grazie")).split(".").join(""));
            message_text += `• Per talento: ${edollaroFormat(talento_gain)}\n`;
        }
        if (imput_text.indexOf(" Coupon") > 0) {
            if (talento_gain > 0) {
                let sell_gain = Math.floor((talento_gain * 100) / 40);
                coupon_gain = overall_gain - sell_gain - talento_gain;
            } else {
                coupon_gain = Math.floor(overall_gain / 3);
            }
            message_text += `• Per Coupon: ${edollaroFormat(coupon_gain)}\n`;
        }

        message_text += `• Guadagno: ${edollaroFormat(overall_gain)}\n`;

        let now_date = new Date(Date.now())
        now_date.setHours("09", "00", "00", "00");
        now_date = now_date.getTime();

        if (m_date > now_date) {
            message_text += `\n✓ Offerta di oggi `;

        } else {
            message_text += `\n> Vecchia offerta `;
        }

        let user_todays_offert = await smuggler_StatUpdate(user.id, m_date, overall_gain, talento_gain, coupon_gain);
        if (user_todays_offert == 0) {
            message_text += ` (duplicato)`;
        } else if (user_todays_offert == -1) {
            message_text += ` (errore)`;
        }
        message_text += `\n`;


        let toSend = simpleMessage(message_text, user.id);

        toSend.options.reply_markup = {};
        toSend.options.reply_markup.inline_keyboard = [
            [
                { text: "🧚", callback_data: "ARGO:SMUGL:STATS:WEEK" },
                { text: "🐣", callback_data: "ARGO:SMUGL:STATS:DAY" },
                { text: "🦖", callback_data: "ARGO:SMUGL:STATS:ALL" },
                { text: "👤", callback_data: "ARGO:SMUGL:STATS:PERSONAL" },
            ],
            [
                { text: "Chiudi ⨷", callback_data: 'ARGO:FORGET' }
            ]
        ];

        return gain_res(toSend);
    })
}

function smugglerGain_stats(type, user, chat_id) { // PERSONAL, DAY, WEEK, ALL
    return new Promise((smuggler_stats) => {
        let query = `SELECT`;
        query += ` sum(${model.tables_names.contrabbando}.coupon_gain) as total_coupon,`;
        query += ` count(${model.tables_names.contrabbando}.coupon_gain) as total_records,`;
        query += ` sum(${model.tables_names.contrabbando}.talento_gain) as total_talento,`;
        query += ` sum(${model.tables_names.contrabbando}.overall_gain) as total_overall,`; //  (sum(Smuggler.overall_gain)/count(Smuggler.coupon_gain)) as rank, 
        query += ` (sum(Smuggler.overall_gain)/count(Smuggler.coupon_gain)) as rank,`; //  , 

        query += ` ${model.tables_names.argonauti}.nick `;
        query += `FROM ${model.tables_names.contrabbando} `;
        query += `INNER JOIN ${model.tables_names.argonauti} ON ${model.tables_names.argonauti}.id = ${model.tables_names.contrabbando}.id `;

        let now_date = new Date(Date.now())
        now_date.setHours("09", "00", "00", "00");

        let message_text = "*Statistiche di Contrabbando* 👣\n";
        let buttons_array = [ //👤 🐣  🦖
            [
                { text: "🧚", callback_data: "ARGO:SMUGL:STATS:WEEK" },
                { text: "🐣", callback_data: "ARGO:SMUGL:STATS:DAY" },
                { text: "🦖", callback_data: "ARGO:SMUGL:STATS:ALL" },
                { text: "👤", callback_data: "ARGO:SMUGL:STATS:PERSONAL" },
            ],
            [
                { text: "Chiudi ⨷", callback_data: 'ARGO:FORGET' }
            ]
        ];


        switch (type) {
            case "DAY": {
                message_text += `_Per oggi, ${now_date.getDate()}/${(now_date.getMonth() + 1)}_\n\n`;
                query += `WHERE date >= ${now_date.getTime()} group by ${model.tables_names.contrabbando}.id`;
                buttons_array[0].splice(1, 1);
                break;
            }
            case "WEEK": {
                let start_day = new Date((now_date.getTime() - (now_date.getDay() * 24 * 60 * 60 * 1000)));
                let end_day = new Date((start_day.getTime() + (7 * 24 * 60 * 60 * 1000)));
                message_text += `_Per la settimana `;
                if (start_day.getDate() != 1 && start_day.getDate() != 8) {
                    message_text += `dal `;
                } else {
                    message_text += `dall'`;
                }
                message_text += `${start_day.getDate()} `;
                if (end_day.getDate() != 1 && end_day.getDate() != 8) {
                    message_text += `al `;
                } else {
                    message_text += `all'`;
                }
                message_text += `${end_day.getDate()}_\n`;


                query += `WHERE date >= ${start_day.getTime()} group by ${model.tables_names.contrabbando}.id`;
                buttons_array[0].splice(0, 1);

                break;
            }
            case "ALL": {
                message_text += `\n`;
                query += `group by ${model.tables_names.contrabbando}.id `;
                buttons_array[0].splice(2, 1);
                break;
            }
            default: {
                message_text += `_Per ${user.username}_\n\n`;

                query += `WHERE ${model.tables_names.contrabbando}.id = ${user.id}`;
                buttons_array[0].splice(3, 1);

            }
        }
        query += ` order by rank DESC`;


        return model.argo_pool.query(query, (err, res) => {

            if (!err) {
                console.log(res);

                if (type == "PERSONAL") {
                    if (res.length <= 0) {
                        message_text += `• Per poter consultare le statistiche, inoltrami i messaggi di vendita al contrabbandiere\n`;
                    } else {
                        message_text += `• Per Talento: ${edollaroFormat(res[0].total_talento)}\n`;
                        message_text += `• Per Coupon: ${edollaroFormat(res[0].total_coupon)}\n`;
                        message_text += `• Dati disponibili: ${res[0].total_records}\n`;
                        message_text += `• Media: ~${edollaroFormat(Math.floor(res[0].total_overall / res[0].total_records))}\n`;
                        message_text += `\n`;
                        message_text += `• Guadagno:\n💰 ${edollaroFormat(res[0].total_overall)}\n`;
                    }

                } else {
                    if (res.length <= 0) {
                        message_text += `• Non ho ancora dati sufficenti per questo intervallo...\n`;
                    } else {
                        for (let i = 0; i < res.length; i++) {
                            message_text += `\n${i + 1}°, *${res[i].nick}* ${(i == 0 ? "👑" : "")} (${res[i].total_records})\n`;
                            message_text += ` • talento: ${parsePrice(res[i].total_talento)}\n`;
                            message_text += ` • coupon: ${parsePrice(res[i].total_coupon)}\n`;
                            message_text += ` • guadagno: ${parsePrice(res[i].total_overall)}\n\n`;
                        }
                    }
                }
            } else {
                message_text += "> S'è verificato un errore contattando il database..."
                console.error(err);
            }
            let toSend = simpleMessage(message_text, chat_id);
            toSend.options.reply_markup = {};
            toSend.options.reply_markup.inline_keyboard = buttons_array;
            return smuggler_stats(toSend);

        });
    });



}



function updateZainoAfterSell(argo_info, type, smugg_id) {
    console.log("> Venduti/usati degli oggetti!");
    console.log("> smugg_id: " + smugg_id);
    if (typeof smugg_id == "undefined") {
        smugg_id = ""
    }

    return new Promise(function (updateZainoAfterSell_res) {
        return loadCraftList(argo_info.id).then(function (on_disk) {
            if (smugg_id.length <= 0 && (on_disk.craft_list == false || on_disk.craft_list.root_item.length <= 0)) {
                return updateZainoAfterSell_res(false);
            }
            let done_items = []; //  items_manager.getItemFromId(item_id);
            let updated_items = [];
            let lost_copyes = 0;
            if (smugg_id.length > 0) {
                done_items.push([smugg_id, argo_info.id, 1]);
                let tmp_item = items_manager.getItemFromId(smugg_id);
                updated_items.push({ name: tmp_item.name, lost_quantity: 1 });
            } else {
                if (on_disk.craft_list.root_item.length > 1) {
                    for (let i = 0; i < on_disk.craft_list.root_item.length; i++) {
                        done_items.push([on_disk.craft_list.root_item[i].id, argo_info.id, on_disk.craft_list.root_item[i].quantity]);
                        updated_items.push({ name: on_disk.craft_list.root_item[i].name, lost_quantity: on_disk.craft_list.root_item[i].quantity });
                        lost_copyes += on_disk.craft_list.root_item[i].quantity;
                    }
                } else {
                    let tmp_quantity = 1;
                    if (type != "SMUGGLER") {
                        tmp_quantity = on_disk.craft_list.root_item[0].quantity;
                    }
                    done_items.push([on_disk.craft_list.root_item[0].id, argo_info.id, tmp_quantity]);
                    updated_items.push({ name: on_disk.craft_list.root_item[0].name, lost_quantity: tmp_quantity });
                    lost_copyes += tmp_quantity;
                }
            }

            console.log("> done_items: " + done_items.length);
            console.log(done_items);


            return zainoQuantityUpdate(done_items, "-").then(function (update_res) {
                let toDel_id = "";
                if (on_disk.craft_list) {
                    if (smugg_id) {
                        if (parseInt(smugg_id) == on_disk.craft_list.root_item[0].id) {
                            toDel_id = argo_info.id;
                        }
                    } else {
                        toDel_id = argo_info.id;
                    }
                }

                return cleanZainiDB().then(function (zainoClear_res) {
                    return deleteCraftList(toDel_id).then(function (delete_res) {
                        let res_text = "";
                        if (update_res == false) {
                            res_text += "*Woops!*\n\nHo avuto qualche problema aggiornando il tuo zaino. Se puoi, segnala a @nrc382";
                        }
                        // else if (delete_res != true) {
                        //     return updateZainoAfterSell_res(false);
                        // }
                        else {
                            res_text += "*Zaino Aggiornato!* 🎒\n";
                            if (type == "SMUGGLER") {
                                res_text += "_dopo una vendita al Contrabbando_\n\n";
                                res_text += "> " + updated_items[0].name + " (-" + updated_items[0].lost_quantity + ")\n";

                            } else {
                                res_text += "_dopo il Potenziamento d'una postazione_\n\n";
                                res_text += "· Copie consumate: " + lost_copyes + "\n\n";
                                for (let i = 0; i < updated_items.length; i++) {
                                    res_text += "> " + updated_items[i].name + " (-" + updated_items[i].lost_quantity + ")\n";
                                }
                            }
                        }
                        return updateZainoAfterSell_res(res_text);
                    });
                });
            });
        });
    });
}

function postPortoRequest(argonaut, negozi_text_array) {
    return new Promise(function (postPortoRequest_res) {

        let res_text = "📦 *Richiesta Materiali*\n_da " + argonaut.nick.split("_").join("\_") + "_\n\n";

        let object_array = [];

        let tmp_line_split;
        let tmp_partial_object;
        let tmp_obj;

        let medium_market_cost = 0;


        for (let i = 0; i < negozi_text_array.length; i++) {
            tmp_line_split = negozi_text_array[i].split(" ");
            console.log(tmp_line_split);
            if (tmp_line_split[0] == "/negozio") {
                tmp_line_split.shift();
                tmp_line_split = tmp_line_split.join(" ").split(",");

                for (let partial = 0; partial < tmp_line_split.length; partial++) {
                    tmp_partial_object = tmp_line_split[partial].split(":");

                    tmp_obj = items_manager.quick_itemFromName(tmp_partial_object[0].trim(), false, 1);
                    if (tmp_obj.length == 1) {
                        if (tmp_obj[0].market_medium_value == 0) {
                            medium_market_cost += tmp_obj[0].estimate_value;
                        } else {
                            medium_market_cost += tmp_obj[0].market_medium_value;
                        }
                        object_array.push({
                            name: tmp_obj[0].name,
                            rarity: tmp_obj[0].rarity,
                            total_quantity: tmp_partial_object[2]
                        });
                    }


                }
            } else if (tmp_line_split[0] == ">") {
                tmp_partial_object = negozi_text_array[i].substring(2, negozi_text_array[i].indexOf("(") - 1);
                tmp_obj = items_manager.quick_itemFromName(tmp_partial_object, false, 1);

                if (tmp_obj.length == 1) {
                    if (tmp_obj[0].market_medium_value == 0) {
                        medium_market_cost += tmp_obj[0].estimate_value;
                    } else {
                        medium_market_cost += tmp_obj[0].market_medium_value;
                    }
                }
                object_array.push({
                    name: tmp_obj[0].name,
                    rarity: tmp_obj[0].rarity,
                    total_quantity: negozi_text_array[i].substring(negozi_text_array[i].indexOf("(") + 1, negozi_text_array[i].indexOf(")"))
                });
            }
        }

        if (object_array.length <= 0) {
            res_text = "🥴 *Woops!*\nAvrei dovuto postare una richiesta per " + argonaut.nick.split("_").join("\_") + ", ma di quali oggetti??"
        } else {
            let all_splitted = [];
            for (let i = 0; i < items_manager.all_rarity.length; i++) {
                recursiveRaritySplit(all_splitted, items_manager.all_rarity[i], object_array);
            }
            res_text += "• Valore totale stimato: " + parsePrice(medium_market_cost) + " \n";
            res_text += "• Oggetti: " + object_array.length + "\n\n";
            for (let i = 0; i < all_splitted.length; i++) {
                if (all_splitted[i].array.length > 0) {
                    res_text += "*" + all_splitted[i].rarity + " (" + all_splitted[i].array.length + ")*\n"
                    for (let j = 0; j < all_splitted[i].array.length; j++) {
                        res_text += "> " + all_splitted[i].array[j].name + " (" + all_splitted[i].array[j].total_quantity + ")\n";// + " (" + all_splitted[i].array[j].rarity+ ")\n";
                    }
                    res_text += "\n";
                }
            }

        }



        postPortoRequest_res(res_text);
    });

}

function smugglerMessage(id, text, type, argonaut_id, item_id) {
    console.log("> SmugglerType: " + type);

    let simple_msg = {
        chat_id: id,
        message_text: text,
        options: {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: []
            }
        }
    };
    if (type == "private") {
        //simple_msg.options.reply_markup.inline_keyboard.push([{ text: "🗑", callback_data: 'SUGGESTION:FORGET' }]);

        if (text.split("\n")[1].match("✅")) {
            simple_msg.options.reply_markup.inline_keyboard.push([{ text: "Venduto!", callback_data: 'ARGO:SMUGL:SELL:' + item_id }]);
        }
        let second_line = [];
        second_line.push({ text: "×①", callback_data: 'ARGO:SMUGL:CRAFT' });
        second_line.push({ text: "Info", callback_data: 'ARGO:SMUGL:INFO:' + item_id });
        second_line.push({ text: "×③", callback_data: 'ARGO:SMUGL:CRAFT:3' });

        simple_msg.options.reply_markup.inline_keyboard.push(second_line);
        simple_msg.options.reply_markup.inline_keyboard.push([{ text: "Chiudi ⨷", callback_data: 'ARGO:FORGET' }]);
    } else if (type == "Porto") {
        simple_msg.options.reply_markup.inline_keyboard.push(
            [
                {
                    text: "❓",
                    callback_data: 'ARGO:SMUGL:TOGIVE_INFO:'
                },
                {
                    text: "☝️",
                    callback_data: 'ARGO:NEGOZI:MAKE:' + argonaut_id
                }

            ],
            [
                {
                    text: "🗑",
                    callback_data: 'ARGO:SMUGL:DEL:' + argonaut_id
                }
            ]
        );
    }

    return simple_msg;
}

// #PLAYERS

function whoami(telegram_id) {
    for (let i = 0; i <= globalArgonauts.length; i++) {
        if (globalArgonauts[i].id == telegram_id) {
            let res_text = "Ti conosco come " + globalArgonauts[i].nick.split("_").join("\\_") + ",\n";
            let nowDate = (Date.now() / 1000).toFixed();
            if (globalArgonauts[i].role == 1) {
                if (globalArgonauts[i].madre == 26) {
                    res_text += "Capo supremo degli ";
                } else {
                    res_text += "Capo in carica degli ";
                }
            } else if (globalArgonauts[i].role == 2) {
                res_text += "Vice degli ";
            } else {
                res_text += "Degli ";
            }
            if (globalArgonauts[i].madre == 26) {
                res_text += "Argonauti";
            } else {
                res_text += "Apprendisti Argonauti";
            }

            if (globalArgonauts[i].last_update == null) {
                res_text += "\n_Non hai mai aggiornato le tue info..._\n";
            } else {
                if ((nowDate - globalArgonauts[i].last_update) >= 60 * 60 * 24) {
                    res_text += "\nMa non aggiorni le tue info dalle " + parseDate(globalArgonauts[i].last_update * 1000) + ". Le _cose_ potrebbero essere cambiate...";
                }
                res_text += "\n";

                res_text += "\n> Rinascita: " + globalArgonauts[i].rinascita + "°";
                res_text += "\n> Artefatti: " + globalArgonauts[i].artefatti_n;
                res_text += "\n> Abilità: " + globalArgonauts[i].ability;
            }

            if ((nowDate - globalArgonauts[i].global_posDate) <= 60 * 60 * 24) {
                res_text += "\n> Posizione in globale: " + globalArgonauts[i].global_pos + "°";
            }

            // if (globalArgonauts[i].info.drago_lv > 0){

            // }
            return res_text;
        }
    }

    let res_text_array = ["Non credo d'aver mai avuto l'onore...", "Ci conosciamo?", "Non mi sembra di conoscerti, mi spiace!"];
    return res_text_array[Math.round((Math.random() * res_text_array.length) - 1)];

}

function anonymousSpia(nickname, quick) {
    return new Promise(function (anonymousSpia_res) {
        if (nickname == null || typeof nickname != "string") {
            return anonymousSpia_res([false, nickname]);
        } else {
            console.log("> anonymousSpia: " + nickname + " (quick: " + quick + ")");

            nickname = nickname.trim();
        }

        return got.get("https://fenixweb.net:6600/api/v2/" + config.loot_token + "/players/" + nickname, { responseType: 'json' }).then(function (full_infos) {
            let infos = full_infos.body;

            if (infos.code != 200) {
                console.error(full_infos)
            } else if (infos.res.length <= 0) {
                anonymousSpia_res([false, "Non ho trovato alcun utente su Loot il cui nickname sia in qualche modo simile a \"" + nickname.split("_").join("\\_").split("*").join("\\*") + "\""]);
            } else if (quick == true) {
                console.log("> Loot ha restituito: " + infos.res.length + " risultati...");
                for (let i = 0; i < infos.res.length; i++) {
                    if (infos.res[i].nickname.toLowerCase() == nickname.toLowerCase()) {
                        console.log("> Trovato: " + infos.res[i].nickname);
                        return anonymousSpia_res([true, infos.res[i]]);
                    }
                }
                return anonymousSpia_res([false, nickname]);
            } else if (infos.res.length > 100) {
                anonymousSpia_res([false, "*Woops* 🥴\n\nCi sono davvero troppi risultati per \"" + nickname.split("_").join("\\_").split("*").join("\\*") + "\" (" + infos.res.length + ")\nProva con un termine piu specifico..."]);
            } else {
                let interessingNickNames = [];
                let final_text = "*ⓘ " + infos.res.length + (infos.res.length == 1 ? " giocatore" : " giocatori") + "*\n\n";


                for (let i = 0; i < infos.res.length; i++) {
                    console.log("> " + i + " -> " + infos.res[i].team + " " + (infos.res[i].team != null));
                    if (infos.res[i].team != null) {
                        //if (infos.res.length > 3) {
                        final_text += "*›* " + infos.res[i].nickname.split("_").join("\\_") + " (" + infos.res[i].team + ")\n";

                        interessingNickNames.push(infos.res[i]);
                    } else {
                        final_text += "› " + infos.res[i].nickname.split("_").join("\\_") + " (↯)\n";
                    }
                }


                return listOfTeams(interessingNickNames).then(function (team_infos) {
                    final_text += "\n------\n";

                    for (let team_index = 0; team_index < team_infos.length; team_index++) {
                        console.log(team_infos[team_index]);

                        final_text += team_infos[team_index].position + "° *" + team_infos[team_index].team_name + "* (" + team_infos[team_index].members.length + ")\n";

                        for (let in_index = 0; in_index < team_infos[team_index].members.length; in_index++) {
                            if (team_infos[team_index].members[in_index].role == 1) {
                                final_text += "› " + team_infos[team_index].members[in_index].nickname.split("_").join("\\_") + " (👑)\n";
                            } else if (team_infos[team_index].members[in_index].role == 2) {
                                final_text += "› " + team_infos[team_index].members[in_index].nickname.split("_").join("\\_") + " (🔰)\n"; // 🃟
                            } else {
                                final_text += "› " + team_infos[team_index].members[in_index].nickname.split("_").join("\\_") + "\n"; // 
                            }
                        }

                        if (team_index < (team_infos.length - 1)) {
                            final_text += "\n ";
                        }
                    }


                    return anonymousSpia_res([true, final_text]);
                });
            }
        });
    });
}

function listOfTeams(fromNames) {

    console.log("> Chiamata listOfTeams per " + fromNames.length + " team");
    return new Promise(async function (listOfTeams_res) {

        let res_array = [];

        if (fromNames.length > 0) {
            let promise_array = [];
            for (let i = 0; i < fromNames.length; i++) {
                console.log("> Team " + (i + 1) + "°: " + fromNames[i].team);
                promise_array.push(getTeamListOf(fromNames[i].team));
            }

            let teamres_array = await Promise.all(promise_array);
            console.log("Fuori dalle promesse, con " + teamres_array.length + " team!");
            let teamnames_array = [];

            for (let team_n = 0; team_n < teamres_array.length; team_n++) {
                if (teamres_array[team_n].team_players.length > 0) {

                    teamnames_array.push(teamres_array[team_n].team_name);
                    res_array.push({ team_name: teamres_array[team_n].team_name, members: teamres_array[team_n].team_players, position: teamres_array[team_n].position });

                    if (fromNames.length == 1 && teamres_array[team_n].child_team != null) {

                        let sub_counter = 0;
                        let forced_stop = false;
                        let tmp_name = teamres_array[team_n].child_team;

                        while (forced_stop == false && sub_counter < 15) {
                            sub_counter++;

                            if (teamnames_array.indexOf(tmp_name) < 0) {

                                let tmp_infos = await getTeamListOf(tmp_name);

                                teamnames_array.push(tmp_infos.team_name);
                                res_array.push({ team_name: tmp_infos.team_name, members: tmp_infos.team_players, position: tmp_infos.position });

                                if (tmp_infos.child_team != null) {
                                    tmp_name = tmp_infos.child_team;
                                } else {
                                    forced_stop = true;
                                }
                            }



                        }
                    }

                }


            }
        }


        return listOfTeams_res(res_array);
    });
}



function getTeamListOf(teamName) {
    console.log("> Chiamata getTeamListOf " + teamName);
    return new Promise(async function (getTeamListOfNickName_res) {
        let address = "https://fenixweb.net:6600/api/v2/" + config.loot_token + "/team/" + teamName.split(" ").join("_");

        const full_infos = await got.get(address, { responseType: 'json' });
        let infos = full_infos.body;

        if (infos.code == 200) {
            getTeamListOfNickName_res(
                {
                    team_name: infos.res.rows[0].name,
                    child_team: infos.res.rows[0].child_team,
                    team_players: infos.res.rows[0].members,
                    position: infos.res.rows[0].position,
                    fame_pnt: infos.res.rows[0].pnt,
                }
            );
        } else {
            getTeamListOfNickName_res({ team_name: teamName, team_players: [] });
        }

    });
}

function updateScheda(toAnalyze, t_user, argo_user, message_date) {
    return new Promise(function (sheda_res) {
        return got.get("https://fenixweb.net:6600/api/v2/" + config.loot_token + "/players/" + t_user.username, { responseType: 'json' }).then(function (full_infos) {

            let infos = full_infos.body.res;

            let tokenized = toAnalyze.split("\n");
            let pars_nick;
            let rinascita;
            let exp;
            let drago;
            let drago_lv;
            let rango;
            let words;
            let craft_pnt;
            let ability;
            let artefatti_n;
            let madre;
            let figu;

            for (let i = 0; i < tokenized.length; i++) {
                words = tokenized[i].split(" ");
                if (words.length > 0) {
                    if (i == 1) {
                        pars_nick = words[1];
                        if (pars_nick.toLowerCase() != t_user.username.toLowerCase()) { // la scheda NON è diretta
                            if ((t_user.id != theCreator) || (t_user.id != 403447701)) {
                                madre = 99;
                            } else {
                                return sheda_res("Mumble...\n" + t_user.username + " questa non sembra essere la tua scheda...");
                            }
                        } else { // controllo se argonauta
                            for (let i = 0; i < infos.length; i++) {
                                if (infos[i].nickname.toLowerCase() == t_user.username.toLowerCase()) {
                                    console.log("Nel for, " + infos[i].team_id);
                                    if (infos[i].team_id == 599) {
                                        madre = 26;
                                    } else if (infos[i].team_id == 1030) {
                                        madre = 66;
                                    } else if (infos[i].team_id == 151) {
                                        madre = 99;
                                    } else if (argo_user.info.madre == 99) {
                                        madre = 99;
                                    } else {
                                        return sheda_res("Mumble...\n" + pars_nick.split("_").join("\\_") + " non mi risulta sia un Argonauta...");
                                    }
                                }
                            }
                        }

                    } else if (i == 3) {
                        console.log("Emoji rinascita:" + words[0]);
                        switch (words[0]) {
                            case "🔆": {
                                rinascita = 1;
                                break;
                            }
                            case "💫": {
                                rinascita = 2;
                                break;
                            }
                            case "⭐️": {
                                rinascita = 3;
                                break;
                            }
                            case "🌟": {
                                rinascita = 4;
                                break;
                            }
                            default: {
                                rinascita = 0;
                                break;
                            }
                        }
                        console.log("rinascita:" + rinascita);

                        exp = parseInt(words[1].split(".").join("")) * 10;
                    } else if (words[words.length - 1] == ("🐉")) {
                        let string = words.join(" ");
                        drago = string.substring(0, string.indexOf("(") - 1);
                        drago_lv = parseInt(string.substring(string.indexOf("(L") + 2, string.indexOf(")")));
                    } else if (words[0] == ("📦")) {
                        craft_pnt = parseInt(words[1].split(".").join(""));
                        if (isNaN(craft_pnt)) {
                            craft_pnt = 0;
                        }
                    } else if (words[0] == "Rango:") {
                        rango = parseInt(words[words.length - 1].replace("(", "").split(".").join(""));
                    } else if (words[0] == "Artefatti:") {
                        artefatti_n = emojiCount(words[1]);
                    } else if (words[0] == "Abilità:") {
                        ability = parseInt(words[1].split(".").join(""));
                    } else if (words[0] == "Figurine") {
                        figu = parseInt(words[2].split("/")[0]);
                    }
                }
            }

            //dodo
            // let drago_lv_difference = argo_user.info.drago_lv -drago_lv;
            // let rinascita_difference = argo_user.info.rinascita -rinascita;

            if (pars_nick != null) {
                let toSet = [t_user.id, pars_nick, rinascita, exp, drago, drago_lv, rango, craft_pnt, ability, artefatti_n, madre, (message_date).toFixed(), figu];
                let query = "INSERT INTO " + model.tables_names.argonauti;
                query += " (id, nick, rinascita, exp, drago, drago_lv, rango, craft_pnt, ability, artefatti_n, madre, last_update, unique_figu)";
                query += " VALUES ?";
                query += " ON DUPLICATE KEY UPDATE id=VALUES(`id`), nick=VALUES(`nick`), rinascita=VALUES(`rinascita`),";
                query += " exp=VALUES(`exp`), drago=VALUES(`drago`), drago_lv=VALUES(`drago_lv`),";
                query += " rango=VALUES(`rango`), craft_pnt=VALUES(`craft_pnt`), ability=VALUES(`ability`), artefatti_n=VALUES(`artefatti_n`), madre=VALUES(`madre`), last_update=VALUES(`last_update`), unique_figu=VALUES(`unique_figu`)";

                console.log("Aggiorno la scheda di " + pars_nick + ", madre: " + madre);
                return model.argo_pool.query(query, [[toSet]],
                    function (err, res) {
                        if (!err) {
                            console.log("Fatto, toSet è:");
                            console.log(toSet);
                            return updateLocalArray(toSet[1], {
                                id: toSet[0],
                                rinascita: toSet[2],
                                exp: toSet[3],
                                drago: toSet[4],
                                drago_lv: toSet[5],
                                rango: toSet[6],
                                craft_pnt: toSet[8],
                                ability: toSet[8],
                                artefatti_n: toSet[9],
                                madre: toSet[10],
                                last_update: toSet[11],
                                unique_figu: toSet[12]
                            }).then(function (update_res) {
                                let res_text;
                                if (!update_res) {
                                    res_text = "Finalmente ci conosciamo, ";
                                } else {
                                    res_text = "Ho aggiornato la tua scheda, ";
                                }
                                res_text += "*" + pars_nick.split("_").join("\\_") + "*!";

                                return sheda_res(res_text);
                            })
                        }
                        else {
                            console.log(err);
                            return sheda_res("*Mumble...*\n\nStavo provando ad aggiornare la scheda. Ma qualche cosa è andato storto.");
                        }
                    });

            }
        });
    });


}

function artefattiProgress_manager(argonaut, statText_array, command) {
    console.log("Comando ricevuto: " + command.toLocaleString());
    return new Promise(function (artefattiProgress_manager) {
        let to_show = argonaut.artefatti_n + 1;
        let to_restext;
        for (let i = 0; i < command.length; i++) {
            console.log("Controllo: " + command[i]);
            if (command[i].length == 2 && command[i].indexOf("a") == 0) {
                to_show = parseInt(command[i].substring(1));
            }
        }

        if (isNaN(to_show) || to_show <= 0 || to_show > 6) {
            to_restext = "Non mi risulta esista un A" + to_show + " 😐";
        } else {
            to_restext = "*" + argonaut.nick.split("_").join("\\_") + " per il " + to_show + "° artefatto * 🔱 \n";
            to_restext += "Alle " + parseDate(argonaut.last_update * 1000) + "\n\n";

            if (argonaut.rinascita <= 3) {
                to_restext += "Non mi risulta tu possa accedere agli artefatti...\nProva ad aggiornare le tue info mandandomi la scheda giocatore";
            } else if (argonaut.artefatti_n >= 6) {
                to_restext += "Hai gia tutti e 6 gli artefatti, cosa dovrei dirti: _Bravo_ (???)";
            } else {
                let tmp_progress;
                to_restext += "⧨ Requisiti\n";

                switch (to_show) {
                    case 1: {
                        if (argonaut.rango - 85 >= 0) {
                            to_restext += "> Rango:  (+" + (argonaut.rango - 85) + "pt.) ✓\n";
                        } else {
                            tmp_progress = ((argonaut.rango * 100) / 85).toFixed();
                            to_restext += "> Rango: -" + (85 - argonaut.rango) + "pt. (" + tmp_progress + "%) ✗ \n";
                        }
                        to_restext += "\n§ Costo:\n";
                        to_restext += "> *5.000.000* §";
                        break;

                    } case 2: {
                        if ((argonaut.craft_pnt - 20000) >= 0) {
                            to_restext += "> P.C:  (+" + (argonaut.craft_pnt - 20000) + ") ✓\n";
                        } else {
                            tmp_progress = ((argonaut.craft_pnt * 2000) / 2000).toFixed();
                            to_restext += "> P.C: -" + (20000 - argonaut.craft_pnt) + " ✗ \n";
                        }
                        if (argonaut.drago_lv - 100 >= 0) {
                            to_restext += "> Drago: (+" + (argonaut.drago_lv - 100) + "lv.) ✓\n";
                        } else {
                            tmp_progress = ((argonaut.drago_lv * 100) / 100).toFixed();
                            to_restext += "> Drago: -" + (100 - argonaut.drago_lv) + "lv. (" + tmp_progress + "%) ✗ \n";
                        }
                        to_restext += "\n§ Costo:\n";
                        to_restext += "> *10.000.000* §";
                        break;


                    } case 3: {
                        let n_dailyachievement = 0;
                        for (let i = 0; i < statText_array.length; i++) {
                            if (statText_array[i].match("Imprese giornaliere: ")) {
                                n_dailyachievement = parseInt(statText_array[i].split(" ")[2]);
                                break;
                            }
                        }

                        if (isNaN(n_dailyachievement)) {
                            n_dailyachievement = 0;
                        }
                        if (n_dailyachievement - 200 >= 0) {
                            to_restext += "> Imprese Giornaliere: (+" + (n_dailyachievement - 200) + ") ✓\n";
                        } else {
                            tmp_progress = ((n_dailyachievement * 100) / 200).toFixed();
                            to_restext += "> Imprese Giornaliere: -" + (200 - n_dailyachievement) + " (" + tmp_progress + "%) ✗ \n";
                        }
                        to_restext += "> 10 talenti maxati\n";
                        to_restext += "\n§ Costo:\n";
                        to_restext += "> 50 💎"; // 2.000 polvere
                        break;
                    } case 4: {
                        let n_missioni = 0;
                        let n_ispezioni = 0;
                        for (let i = 0; i < statText_array.length; i++) {
                            if (statText_array[i].match("Missioni:")) {
                                n_missioni = parseInt(statText_array[i].split(" ")[1].split(".").join(""));
                            } else if (statText_array[i].match("Hai avviato")) {
                                n_ispezioni += parseInt(statText_array[i + 1].split(" ")[1].split(".").join(""));
                            } else if (statText_array[i].match("Hai subito")) {
                                n_ispezioni += parseInt(statText_array[i + 1].split(" ")[1].split(".").join(""));
                            }
                        }

                        if (isNaN(n_missioni)) {
                            n_missioni = 0;
                        }
                        if (isNaN(n_ispezioni)) {
                            n_ispezioni = 0;
                        }
                        if (n_missioni - 2000 >= 0) {
                            to_restext += "> Missioni svolte: (+" + (n_missioni - 2000) + ") ✓\n";
                        } else {
                            tmp_progress = ((n_missioni * 100) / 2000).toFixed();
                            to_restext += "> Missioni svolte: -" + (2000 - n_missioni) + " (" + tmp_progress + "%) ✗ \n";
                        }
                        if (n_ispezioni - 500 >= 0) {
                            to_restext += "> Ispezioni vinte: (+" + (n_ispezioni - 500) + ") ✓\n";
                        } else {
                            tmp_progress = ((n_ispezioni * 100) / 500).toFixed();
                            to_restext += "> Ispezioni vinte: -" + (500 - n_ispezioni) + " (" + tmp_progress + "%) ✗ \n";
                        }
                        to_restext += "\n§ Costo:\n";
                        to_restext += "> 2.000 🌪"; // 2.000 polvere
                        break;

                    } case 5: {
                        let n_incarichi = 0;
                        let n_vendite = 0;
                        let n_global = 0;
                        let n_scalate = 0;
                        let scalate_bool = false;

                        for (let i = 0; i < statText_array.length; i++) {
                            if (statText_array[i].match("Incarichi:")) {
                                n_incarichi = parseInt(statText_array[i].split(" ")[1].split(".").join(""));
                            } else if (statText_array[i].match("Assalti personali nel team attuale:")) {
                                n_scalate += parseInt(statText_array[i].split(" ")[5].split(".").join(""));
                            } else if (statText_array[i].match("Offerte contrabbandiere accettate")) {
                                n_vendite += parseInt(statText_array[i].split(" ")[3].split(".").join(""));
                            } else if (statText_array[i].match("Imprese globali ")) {
                                n_global += parseInt(statText_array[i].split(" ")[4].split(".").join(""));
                            } else if (statText_array[i].match("3 assalti completati:")) {
                                scalate_bool = statText_array[i].split(" ")[3].trim() == "Si";

                            }
                        }

                        if (isNaN(n_incarichi)) {
                            n_incarichi = 0;
                        }
                        if (isNaN(n_scalate)) {
                            n_scalate = 0;
                        }
                        if (isNaN(n_vendite)) {
                            n_vendite = 0;
                        }
                        if (isNaN(n_global)) {
                            n_global = 0;
                        }
                        if (argonaut.exp - 10000 >= 0) {
                            to_restext += "> Esperienza totale: (+" + (argonaut.exp - 10000) + "pt.) ✓\n";
                        } else {
                            tmp_progress = ((argonaut.exp * 100) / 10000).toFixed();
                            to_restext += "> Esperienza totale: -" + (10000 - argonaut.exp) + "pt. (" + tmp_progress + "%) ✗ \n";
                        }

                        if (n_incarichi - 300 >= 0) {
                            to_restext += "> Incarichi: (+" + (n_incarichi - 300) + "pt.) ✓\n";
                        } else {
                            tmp_progress = ((n_incarichi * 100) / 300).toFixed();
                            to_restext += "> Incarichi: -" + (300 - n_incarichi) + "pt. (" + tmp_progress + "%) ✗ \n";
                        }

                        if (argonaut.rango - 200 >= 0) {
                            to_restext += "> Rango: (+" + (argonaut.rango - 200) + "pt.) ✓\n";
                        } else {
                            tmp_progress = ((argonaut.rango * 100) / 200).toFixed();
                            to_restext += "> Rango: -" + (200 - argonaut.rango) + "pt. (" + tmp_progress + "%) ✗ \n";
                        }

                        if (scalate_bool) {
                            to_restext += "> 3 Scalate: (" + (n_scalate) + ") ✓\n";
                        } else {
                            to_restext += "> 3 Scalate: (" + n_scalate + ") ✗ \n";
                        }

                        if (n_vendite - 1000 >= 0) {
                            to_restext += "> Contrabbandiere: (+" + (n_vendite - 1000) + " vendite) ✓\n";
                        } else {
                            tmp_progress = ((n_vendite * 100) / 1000).toFixed();
                            to_restext += "> Contrabbandiere: -" + (1000 - n_vendite) + " vendite (" + tmp_progress + "%) ✗ \n";
                        }

                        if (n_global - 5 >= 0) {
                            to_restext += "> Globali: (+" + (n_global - 5) + ") ✓\n";
                        } else {
                            tmp_progress = ((n_global * 100) / 5).toFixed();
                            to_restext += "> Globali: -" + (5 - n_global) + " (" + tmp_progress + "%) ✗ \n";
                        }
                        break;

                    } case 6: {
                        let n_triplet = 0; // 300 
                        let n_global = 0; // 15
                        let n_flaridion = 0; //300
                        let n_Dpoint = 0; //500



                        for (let i = 0; i < statText_array.length; i++) {
                            if (statText_array[i].match("D accumulate")) {
                                n_Dpoint = parseInt(statText_array[i].split(" ")[2]);
                            } else if (statText_array[i].match("Triplette")) {
                                n_triplet += 0;
                            } else if (statText_array[i].match("Imprese globali ")) {
                                n_global += parseInt(statText_array[i].split(" ")[4].split(".").join(""));
                            } else if (statText_array[i].match("Flaridion")) {
                                n_flaridion = 0;
                            }
                        }

                        if (isNaN(n_Dpoint)) {
                            n_Dpoint = 0;
                        }
                        if (isNaN(n_triplet)) {
                            n_triplet = 0;
                        }
                        if (isNaN(n_flaridion)) {
                            n_flaridion = 0;
                        }
                        if (isNaN(n_global)) {
                            n_global = 0;
                        }

                        if (n_triplet - 300 >= 0) {
                            to_restext += "> Triplette: (+" + (n_triplet - 300) + ") ✓\n";
                        } else {
                            tmp_progress = ((n_triplet * 100) / 300).toFixed();
                            to_restext += "> Triplette: -" + (300 - n_triplet) + " (" + tmp_progress + "%) ✗ \n";
                        }
                        if (n_global - 15 >= 0) {
                            to_restext += "> Punti globale: (+" + (n_global - 300) + ") ✓\n";
                        } else {
                            tmp_progress = ((n_global * 100) / 15).toFixed();
                            to_restext += "> Punti globale: -" + (15 - n_global) + " (" + tmp_progress + "%) ✗ \n";
                        }
                        if (n_flaridion - 300 >= 0) {
                            to_restext += "> Flaridion: (+" + (n_flaridion - 300) + ") ✓\n";
                        } else {
                            tmp_progress = ((n_flaridion * 100) / 300).toFixed();
                            to_restext += "> Flaridion: -" + (300 - n_flaridion) + " (" + tmp_progress + "%) ✗ \n";
                        }

                        if (argonaut.rango - 500 >= 0) {
                            to_restext += "> Rango: (+" + (argonaut.rango - 500) + "pt.) ✓\n";
                        } else {
                            tmp_progress = ((argonaut.rango * 100) / 500).toFixed();
                            to_restext += "> Rango: -" + (500 - argonaut.rango) + "pt. (" + tmp_progress + "%) ✗ \n";
                        }
                        if (n_Dpoint - 500 >= 0) {
                            to_restext += "> D nelle vette: (+" + (n_Dpoint - 500) + ") ✓\n";
                        } else {
                            tmp_progress = ((n_Dpoint * 100) / 500).toFixed();
                            to_restext += "> D nelle vette: -" + (500 - n_Dpoint) + " (" + tmp_progress + "%) ✗ \n";
                        }

                        if (argonaut.unique_figu - 100 >= 0) {
                            to_restext += "> Figurine uniche: (+" + (argonaut.unique_figu - 100) + "pt.) ✓\n";
                        } else {
                            tmp_progress = ((argonaut.unique_figu * 100) / 100).toFixed();
                            to_restext += "> Figurine uniche: -" + (100 - argonaut.unique_figu) + "pt. (" + tmp_progress + "%) ✗ \n";
                        }



                    }
                }
                to_restext += "\n\n*???*\nSe _i conti non ti tornano_, prova ad aggiornare le tue info mandandomi la scheda giocatore";


            }
        }

        return artefattiProgress_manager(to_restext);


    });
}

function getZainoFor(user_id) {
    return new Promise(function (loadZainoOf_res) {
        let query = "SELECT LootItems.name, LootItems.rarity, LootItems.craftable, Zaini.item_quantity";
        query += " FROM " + model.tables_names.items;
        query += " INNER JOIN " + model.tables_names.zaini + " ON LootItems.id = Zaini.item_id";
        query += " WHERE Zaini.user_id = ?";
        return model.argo_pool.query(query,
            [user_id],
            function (err, zaino) {
                if (err || zaino.length <= 0) {
                    return loadZainoOf_res(false);
                } else {
                    // const all_rarity = ["C", "NC", "R", "UR", "L", "E", "UE", "U", "X", "D", "S", "IN", "A"];

                    let parsed_zaino = {
                        all_elements: zaino.length,
                        all_copyes: 0,
                        comuni: [],
                        comuni_copyes: 0,
                        non_comuni: [],
                        non_comuni_copyes: 0,
                        rari: [],
                        rari_copyes: 0,
                        ultra_rari: [],
                        ultra_rari_copyes: 0,
                        leggendari: [],
                        leggendari_copyes: 0,
                        epici: [],
                        epici_copyes: 0,
                        ultra_epici: [],
                        ultra_epici_copyes: 0,
                        unici: [],
                        unici_copyes: 0,
                        x: [],
                        x_copyes: 0,
                        draconici: [],
                        draconici_copyes: 0,
                        speciali: [],
                        speciali_copyes: 0,
                        inestimabili: [],
                        inestimabili_copyes: 0,
                        artefatti: [],
                    };

                    for (let i = 0; i < zaino.length; i++) {
                        parsed_zaino.all_copyes += zaino[i].item_quantity;

                        switch (zaino[i].rarity) {
                            case ("C"): {
                                parsed_zaino.comuni.push(zaino[i]);
                                parsed_zaino.comuni_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("NC"): {
                                parsed_zaino.non_comuni.push(zaino[i]);
                                parsed_zaino.non_comuni_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("R"): {
                                parsed_zaino.rari.push(zaino[i]);
                                parsed_zaino.rari_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("UR"): {
                                parsed_zaino.ultra_rari.push(zaino[i]);
                                parsed_zaino.ultra_rari_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("L"): {
                                parsed_zaino.leggendari.push(zaino[i]);
                                parsed_zaino.leggendari_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("E"): {
                                parsed_zaino.epici.push(zaino[i]);
                                parsed_zaino.epici_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("UE"): {
                                parsed_zaino.ultra_epici.push(zaino[i]);
                                parsed_zaino.ultra_epici_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("U"): {
                                parsed_zaino.unici.push(zaino[i]);
                                parsed_zaino.unici_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("X"): {
                                parsed_zaino.x.push(zaino[i]);
                                parsed_zaino.x_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("D"): {
                                parsed_zaino.draconici.push(zaino[i]);
                                parsed_zaino.draconici_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("S"): {
                                parsed_zaino.speciali.push(zaino[i]);
                                parsed_zaino.speciali_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("IN"): {
                                parsed_zaino.inestimabili.push(zaino[i]);
                                parsed_zaino.inestimabili_copyes += zaino[i].item_quantity;
                                break;
                            }
                            case ("A"): {
                                parsed_zaino.artefatti.push(zaino[i]);
                                break;
                            }
                        }
                    }


                    return loadZainoOf_res(parsed_zaino);
                }
            });
    });
}

function calcValueOfZaino(user_info) {
    return new Promise(function (zaino_val) {
        return getZainoFor(user_info.id).then(function (loaded) {

            let query = "SELECT LootItems.name, LootItems.rarity, LootItems.craftable, Zaini.item_quantity, LootItems.market_medium_value, LootItems.base_value";
            query += " FROM " + model.tables_names.items;
            query += " INNER JOIN " + model.tables_names.zaini + " ON LootItems.id = Zaini.item_id";
            query += " WHERE Zaini.user_id = ?";
            return model.argo_pool.query(query,
                [user_info.id],
                function (err, zaino) {
                    let message_text = "💰 *Stima del Valore Zaino*\n_per " + user_info.nick + "_\n\n";

                    if (err || zaino.length <= 0) {
                        message_text += "Woops! Non conosco affatto questo zaino...";
                    } else {
                        let values = { base: { market: 0, minimum: 0 }, crafted: { market: 0, minimum: 0 } };
                        for (let i = 0; i < zaino.length; i++) {
                            if (zaino[i].craftable == 1) {
                                values.crafted.minimum += zaino[i].item_quantity * zaino[i].base_value;
                                values.crafted.market += zaino[i].item_quantity * zaino[i].market_medium_value;
                            } else {
                                values.base.minimum += zaino[i].item_quantity * zaino[i].base_value;
                                values.base.market += zaino[i].item_quantity * zaino[i].market_medium_value;
                            }
                        }
                        message_text += "• *Oggetti Base:*\n";
                        message_text += "· Minimo: " + edollaroFormat(values.base.minimum) + "\n";
                        message_text += "· Mercato: " + edollaroFormat(values.base.market) + "\n";

                        message_text += "\n• *Creati:*\n";
                        message_text += "· Minimo: " + edollaroFormat(values.crafted.minimum) + "\n";
                        message_text += "· Mercato: " + edollaroFormat(values.crafted.market) + "\n";


                        message_text += "\n· Stima del plus: ~" + edollaroFormat(values.base.minimum + values.crafted.minimum) + "\n";
                        message_text += "· Stima reale: *" + edollaroFormat(values.base.market + values.crafted.market) + "*\n";



                    }
                    return zaino_val(message_text);
                });
        });
    });
}

function getZainoItemsFor(to_search) {
    //MI aspetto to_search = [user_id, item_id]
    return new Promise(function (loadZainoOf_res) {
        let query = "SELECT item_quantity, item_id";
        query += " FROM " + model.tables_names.zaini;
        query += " WHERE (user_id, item_id) IN (?)";
        return model.argo_pool.query(query,
            [to_search],
            function (err, zaino) {
                if (err || zaino.length <= 0) {
                    console.log(err);
                    return loadZainoOf_res(false);
                } else {
                    return loadZainoOf_res(zaino);
                }
            });
    });
}

function getZainoRarityFor(user_id, rarity_string) {
    return new Promise(function (loadZainoOf_res) {
        let query = "SELECT LootItems.name, LootItems.rarity, LootItems.craftable, LootItems.base_value, LootItems.market_medium_value, Zaini.item_quantity";
        query += " FROM " + model.tables_names.items;
        query += " INNER JOIN " + model.tables_names.zaini + " ON LootItems.id = Zaini.item_id";
        query += " WHERE Zaini.user_id = ? AND LootItems.rarity = ?";
        return model.argo_pool.query(query,
            [user_id, rarity_string],
            function (err, zaino) {
                if (err || zaino.length <= 0) {
                    return loadZainoOf_res(false);
                } else {
                    return loadZainoOf_res(zaino);
                }
            });
    });
}

function getQuantityOf(infos) {
    return new Promise(function (quantity_res) {
        if (infos.length < 0) {
            return quantity_res(false);
        }
        let query = "SELECT item_id as `id`, item_quantity as `quantity` FROM " + model.tables_names.zaini;
        query += " WHERE (item_id, user_id) IN (?)";
        return model.argo_pool.query(query,
            [infos],
            function (err, zaino_items) {
                if (err || zaino_items.length <= 0) {
                    console.error(err);
                    return quantity_res(false);
                } else {
                    return quantity_res(zaino_items);
                }
            });

    });
}


// tutta la gestione dello zaino è imbarazzante. Dovrebbero risiedere in separati file json (magari gia divisi?) uff... tanto lavoro
function cleanZaino(to_delete_ob) {
    return new Promise(function (cleanZaino_res) {
        if (to_delete_ob.length <= 0) {
            return cleanZaino_res(false);
        }

        let query = "DELETE FROM " + model.tables_names.zaini;
        query += " WHERE (user_id, item_id) IN (?)";
        return model.argo_pool.query(query, [to_delete_ob],
            function (err1, db_res1) {
                if (err1) {
                    console.error(err1);
                    return cleanZaino_res(false);
                } else {
                    return cleanZaino_res(true);
                }
            });
    });
}

function cleanZainiDB() {
    return new Promise(function (cleanZaino_res) {
        let query = "DELETE FROM " + model.tables_names.zaini;
        query += " WHERE item_quantity <= 0";
        return model.argo_pool.query(query,
            function (err1, db_res1) {
                if (err1) {
                    console.log("ERRORE!");
                    console.log(err1);
                    return cleanZaino_res(false);
                } else {
                    console.log(db_res1);
                    return cleanZaino_res(true);

                }
            });
    });
}

function zainoFreshUpdate(foruserId, toparse_text_array) {
    return new Promise(function (updateZaino_res) {
        let items_ids_array = [];
        let tmp_item = {};
        let total_quantity = 0;
        let update_res = {
            esit: false,
            text: ""
        };
        let rarity = toparse_text_array[0].substring(toparse_text_array[0].indexOf("(") + 1, toparse_text_array[0].indexOf(")")).toUpperCase();
        if (items_manager.all_rarity.indexOf(rarity) < 0) {
            update_res.text = "*Mumble...*\nÈ tutta una rarità quella?\n\nUsa il comando del plus:\n/zaino `\[rarità]` o `zaino completo` di @LootPlusBot";
            return updateZaino_res(update_res);
        }
        let ids_only_array = [];
        let lost_object = [];
        for (let i = 1; i < toparse_text_array.length; i++) {
            if (toparse_text_array[i][0] == ">") {
                tmp_item.id = items_manager.getIdOf(toparse_text_array[i].substring(2, toparse_text_array[i].indexOf(" (")));
                if (tmp_item.id > 0) {
                    tmp_item.quantity = parseInt(toparse_text_array[i].substring(toparse_text_array[i].indexOf(", ") + 2, toparse_text_array[i].length - 1).split(".").join(""));
                    if (!isNaN(tmp_item.quantity)) {
                        ids_only_array.push(tmp_item.id);
                        tmp_item.user_id = foruserId;
                        total_quantity += tmp_item.quantity;
                        items_ids_array.push([tmp_item.id, tmp_item.user_id, tmp_item.quantity]);
                    }
                }
            }
        }
        let to_delete_ob = [];
        for (let i = 0; i < items_manager.getAllItemsArray.length; i++) {
            tmp_item = items_manager.getAllItemsArray[i];
            if (tmp_item.rarity == rarity) {
                if (ids_only_array.indexOf(tmp_item.id) < 0) {
                    to_delete_ob.push([foruserId, tmp_item.id]);
                    lost_object.push(tmp_item.name);
                }
            }
        }
        // let query = "";
        return cleanZaino(to_delete_ob).then(function (del_res) {
            console.log("> del_res: " + del_res);


            query = "INSERT INTO " + model.tables_names.zaini;
            query += " (item_id, user_id, item_quantity)";
            query += " VALUES ?";
            query += " ON DUPLICATE KEY UPDATE item_quantity=VALUES(`item_quantity`)";

            if (items_ids_array.length <= 0) {
                update_res.text = "*Mumble...*\nCosa avrei dovuto fare, aggiornare lo zaino?";
                return updateZaino_res(update_res);
            }

            return model.argo_pool.query(query, [items_ids_array],
                function (err, db_res) {
                    //console.log(res);
                    if (!err) {
                        console.log(db_res.message);
                        update_res.esit = true;
                        update_res.text = "*Zaino Aggiornato!* 🎒\n\n";
                        if (toparse_text_array[0].indexOf("(") > 0) {
                            update_res.text += "> Rarità: " + (rarity) + "\n";
                        }
                        update_res.text += "> Oggetti: " + items_ids_array.length + "/" + (lost_object.length + items_ids_array.length) + "\n";
                        update_res.text += "> Copie: " + total_quantity + " (tot.)\n";
                        // if (lost_object.length > 0) {
                        //     update_res.text += "\n*Non hai:* (" + lost_object.length + " tot.)\n";
                        //     for (let i = 0; i < lost_object.length; i++) {
                        //         update_res.text += "> " + lost_object[i] + "\n";
                        //     }
                        // }

                        return updateZaino_res(update_res);
                    } else {
                        console.log(err);
                        update_res.text = "*Woops!* 🤕\n_Non mi sento tanto bene..._\n\nQuanlche cosa deve essermi andata di traverso, maledetta rarità " + rarity + "!";
                        return updateZaino_res(update_res);

                    }
                });
        });
    });
}

function zainoQuantityUpdate(itemInfos_array, type) {
    // itemInfos_array mi aspetto sia un array di [id_oggetto, user_id, nuova_quantità]
    return new Promise(function (zainoQuantityUpdate_res) {
        if (itemInfos_array.length <= 0) {
            console.log("> zainoQuantityUpdate: nessun oggetto da aggiornare...");
            return zainoQuantityUpdate_res(true);
        }

        console.log("> zainoQuantityUpdate, da aggiornare: " + itemInfos_array.length + " oggetto/i");
        query = "INSERT INTO " + model.tables_names.zaini;
        query += " (item_id, user_id, item_quantity)";
        query += " VALUES ? ON DUPLICATE KEY UPDATE ";
        if (type == "+") {
            query += "item_quantity=item_quantity+VALUES(`item_quantity`)";
        } else if (type == "-") {
            query += "item_quantity= item_quantity-VALUES(`item_quantity`)";
        } else {
            query += "item_quantity=VALUES(`item_quantity`)";
        }

        return model.argo_pool.query(query, [itemInfos_array],
            function (err, db_res) {
                if (err) {
                    console.error("> Err!!! :( ");
                    console.log(err);
                    return zainoQuantityUpdate_res(false);
                } else {
                    console.log("> Update ok! 👍");
                    //console.log(db_res);
                    return zainoQuantityUpdate_res(true);
                }

            });
    });
}

function zainoInsertItems(foruserId, items_array) {
    return new Promise(function (zainoDeleteItems_res) {

        let query = "INSERT INTO " + model.tables_names.zaini;
        query += " (user_id, item_id, item_quantity)";
        query += " VALUES ?";
        query += " ON DUPLICATE KEY UPDATE item_quantity= (item_quantity + VALUES(`item_quantity`))";

        let parsed_array = [];
        for (let i = 0; i < items_array.length; i++) {
            parsed_array.push([foruserId, items_array[i].id, items_array[i].quantity]);
        }


        model.argo_pool.query(query, [parsed_array],
            function (err, db_res) {
                //console.log(res);
                if (!err) {

                } else {


                }
            });

    });

}

function zainoDeleteItems(itemInfos_array) {
    return new Promise(function (zainoDeleteItems_res) {
        // itemInfos_array: mi aspetto sia un array di [id_oggetto, user_id]
        if (itemInfos_array.length <= 0) {
            console.log("> zainoDeleteItems: nessun oggetto da eliminare...");
            return zainoDeleteItems_res(true);
        } else {
            console.log("> Da eliminare per " + itemInfos_array[0][1]);

            for (let i = 0; i < itemInfos_array.length; i++) {
                console.log("\t> Oggetto: " + itemInfos_array[i][0]);

            }
        }

        console.log("> zainoDeleteItems, da eliminare: " + itemInfos_array.length + " oggetto/i");

        let query = "DELETE FROM " + model.tables_names.zaini;
        query += " WHERE (item_id, user_id) IN (?);";

        return model.argo_pool.query(query, [itemInfos_array],
            function (err, res) {
                //console.log(res);
                if (err) {
                    console.error("> Err!!! :( ");
                    console.log(err);
                    return zainoDeleteItems_res(false);
                } else {
                    console.log("> Update ok! 👍");
                    console.log(res);
                    return zainoDeleteItems_res(true);
                }
            });
    });
}

function getAPlayer(partial_name) {
    let matchedNames_array = [];
    let target_name = partial_name.toLowerCase();


    for (let i = 0; i < globalArgonauts.length; i++) {
        if (globalArgonauts[i].nick.toLowerCase().match(target_name) || (typeof globalArgonauts[i].t_name != "undefined" && globalArgonauts[i].t_name.toLowerCase().match(target_name))) {
            if (globalArgonauts[i].madre != 99) {
                matchedNames_array.push({ nick: globalArgonauts[i].nick, isArgonaut: true });
            } else {
                matchedNames_array.push({ nick: globalArgonauts[i].nick, isArgonaut: false });
            }
            console.log("> target name (è argonauta): " + partial_name);
        }
    }

    console.log("> Ricerca di " + target_name + " (per allPlayers)");

    for (let i = 0; i < allLootUsers.length; i++) {
        if (allLootUsers[i].toLowerCase().match(target_name)) {
            console.log("> target name (match): " + target_name);
            matchedNames_array.push({ nick: allLootUsers[i], isArgonaut: false });
        }
    }


    return matchedNames_array;

}

function parseMana(manaText, fromPlus, chat_id, user) {
    return new Promise(function (mana_res) {
        let asker = checkArgonaut(user);
        let found_user = manaText.split(" ")[0];
        console.log("> parseMana");
        console.log("> Richiedente: " + asker.info.nick);
        console.log("> Su info per: " + found_user);

        if (fromPlus) {
            if (asker.info.nick != found_user) {
                let res_text = "*" + asker.info.nick.split("_").join("\\_");
                res_text += "*!\nChe sia " + found_user.split("_").join("\\__");
                res_text += " a chiedermi di valutare il *suo* progresso per la plus!";
                return mana_res([
                    simpleMessage(res_text, chat_id),
                    found_user
                ]);
            } else if (asker.info.drago_lv == null) {
                return mana_res(simpleMessage("Prima mandami... `/giocatore`!", chat_id));
            }
        }

        model.argo_pool.query("SELECT mana FROM " + model.tables_names.argonauti + " WHERE nick LIKE ?", asker.info.nick,
            function (err, old_mana_res) {
                if (!err) {
                    let required = 75;
                    let polvere_required = 1000;
                    let blu;
                    let giallo;
                    let rosso;

                    let to_save_blu;
                    let to_save_giallo;
                    let to_save_rosso;

                    let polvere = -1;

                    line = manaText.split("\n");
                    if (asker.info.drago_lv <= 100) {
                        required = required * 100;
                    } else if (asker.info.drago_lv <= 300) {
                        required = required * 1000;
                        polvere_required = polvere_required * 10;
                    }

                    if (!fromPlus) {
                        for (let i = 2; i < 5; i++) {
                            if (line[i].indexOf("Blu:") == 0) {
                                blu = parseInt(line[i].substring("Blu:".length, line[i].length).split(".").join(""));
                                to_save_blu = blu;
                                blu = Math.min(required, blu);
                            }
                            else if (line[i].indexOf("Giallo:") == 0) {
                                giallo = parseInt(line[i].substring("Giallo:".length, line[i].length).split(".").join(""));
                                to_save_giallo = giallo;
                                giallo = Math.min(required, giallo);
                            }
                            else if (line[i].indexOf("Rosso:") == 0) {
                                rosso = parseInt(line[i].substring("Rosso:".length, line[i].length).split(".").join(""));
                                to_save_rosso = rosso;

                                rosso = Math.min(required, rosso);
                            }
                        }
                    } else {
                        for (let i = 1; i < line.length; i++) {
                            if (line[i].indexOf("Polvere:") == 0) {
                                polvere = parseInt(line[i].substring("Polvere:".length, line[i].indexOf("♨️")).split(".").join(""));
                                polvere = Math.min(polvere_required, polvere);
                            }
                            else if (line[i] == "Mana:") {
                                blu = parseInt(line[i + 1].substring(2, line[i + 1].indexOf(" Blu")).split(".").join(""));
                                to_save_blu = blu;
                                blu = Math.min(required, blu);

                                giallo = parseInt(line[i + 2].substring(2, line[i + 2].indexOf(" Giallo")).split(".").join(""));
                                to_save_giallo = giallo;
                                giallo = Math.min(required, giallo);

                                rosso = parseInt(line[i + 3].substring(2, line[i + 3].indexOf(" Rosso")).split(".").join(""));
                                to_save_rosso = rosso;
                                rosso = Math.min(required, rosso);

                                break;
                            }
                        }
                    }
                    console.log("Dopo il parse: ");

                    console.log("Rosso: " + rosso);
                    console.log("Giallo: " + giallo);
                    console.log("Blu: " + blu);
                    console.log("Polvere: " + polvere);



                    let old_mana = {};
                    old_mana.total_diff = 0;

                    if (old_mana_res[0].mana != null) {
                        let parse = old_mana_res[0].mana.split(":");
                        old_mana.date = parseInt(parse[0]);
                        old_mana.rosso = parseInt(parse[1]);
                        old_mana.rosso_diff = rosso - old_mana.rosso;
                        old_mana.giallo = parseInt(parse[2]);
                        old_mana.giallo_diff = giallo - old_mana.giallo;
                        old_mana.blu = parseInt(parse[3]);
                        old_mana.blu_diff = blu - old_mana.blu;

                        old_mana.total = old_mana.rosso + old_mana.giallo + old_mana.blu;
                        old_mana.total_diff = old_mana.giallo_diff + old_mana.rosso_diff + old_mana.blu_diff;

                        console.log("old_mana");
                        console.log(old_mana);
                    }

                    return updateMana(to_save_rosso, to_save_giallo, to_save_blu, asker.info.nick).then(function (update_res) {

                        let onTotal = Math.round((((rosso + giallo + blu) * 100) / (required * 3)) * 10) / 10;
                        if (polvere > 0) {
                            onTotal = (onTotal + (Math.round((((polvere) * 100) / (polvere_required)) * 10) / 10)) / 2;
                        }
                        let ofGiallo = Math.round(((giallo * 100) / required) * 10) / 10;
                        let ofRosso = Math.round(((rosso * 100) / required) * 10) / 10;
                        let ofBlu = Math.round(((blu * 100) / required) * 10) / 10;

                        let message_text = "☄️ " + user + ", per la";
                        if (asker.info.drago_lv <= 100) {
                            message_text += " scaglia evolutiva ";
                        } else if (asker.info.drago_lv <= 200) {
                            message_text += " plus ";
                        } else {
                            message_text = "☄️ " + user + "\nPer una nuova plus (?) ...";
                        }

                        if (onTotal == 100) {
                            message_text += "*ce l'hai fatta!!*\n";
                        } else if (onTotal > 96) {
                            message_text += "*ci siamo quasi!*\n";
                        } else if (onTotal <= 40) {
                            message_text += "*sei abbastanza lontano!*\n";
                        } else {
                            message_text += "*sei sulla buona strada!*\n";
                        }

                        message_text += "\nProgresso totale: " + onTotal.toFixed() + "%\n\n";
                        message_text += "Mana blu: " + ofBlu + "% ";
                        if (old_mana.total_diff > 0 && typeof old_mana.blu != 'undefined' && old_mana.blu_diff > 0) {
                            message_text += "( *+" + old_mana.blu_diff + "*)";
                        }
                        message_text += "\n";
                        message_text += "Mana giallo: " + ofGiallo + "% ";
                        if (old_mana.total_diff > 0 && typeof old_mana.giallo != 'undefined' && old_mana.giallo_diff > 0) {
                            message_text += "( *+" + old_mana.giallo_diff + "*)";
                        }
                        message_text += "\n";
                        message_text += "Mana rosso: " + ofRosso + "% ";
                        if (old_mana.total_diff > 0 && typeof old_mana.rosso != 'undefined' && old_mana.rosso_diff > 0) {
                            message_text += "( *+" + old_mana.rosso_diff + "*)";
                        }
                        message_text += "\n";
                        if (polvere > 0) {
                            message_text += "Polvere: " + (Math.round(((polvere * 100) / polvere_required) * 10) / 10) + "% \n";
                        }
                        if (old_mana.total_diff == 0) {
                            message_text += "\n🙁 Nessun progresso dall'ultimo aggiornamento!";
                        } else {
                            let fixed_ammount = ((old_mana.total_diff * 100) / old_mana.total).toFixed();

                            if (fixed_ammount > 0) {
                                if (old_mana.total_diff < 2) {
                                    message_text += "\n🙄 *+" + fixed_ammount + "*% dall'ultimo aggiornamento... ";
                                } else if (old_mana.total_diff < 5) {
                                    message_text += "\n😐 *+" + fixed_ammount + "*% dall'ultimo aggiornamento... ";
                                } else {
                                    message_text += "\n😊 *+" + fixed_ammount + "*% dall'ultimo aggiornamento... ";
                                }
                            } else if (fixed_ammount < 0) {
                                message_text += "\n😱 *" + fixed_ammount + "*% dall'ultimo aggiornamento! ";
                            }
                        }

                        if (update_res != true) {
                            message_text += "\nErrore nel salvataggio delle info!";
                        }
                        mana_res(simpleMessage(message_text, chat_id));
                    });
                } else {
                    console.log(err);
                    mana_res(null);
                }
            });

    });
}

function updateMana(rosso, giallo, blu, forUser) {
    return new Promise(function (updateMana_res) {
        let to_save = (Date.now() / 1000).toFixed() + ":" + rosso + ":" + giallo + ":" + blu;
        model.argo_pool.query("UPDATE " + model.tables_names.argonauti + " SET mana = ? WHERE nick LIKE ?",
            [to_save, forUser],
            function (error) {
                if (!error) {
                    updateMana_res(true)
                }
                else {
                    console.log(error);
                    updateMana_res(false);
                }
            });
    });
}

function countPayment(payment_array, user_nick, to_return) {
    console.log("> countPayment: " + payment_array.length + ", user: " + user_nick);

    let argonaut_nick = globalArgonauts.map(function (argonaut) {
        return argonaut.nick;
    });
    let toArgonaut = [];
    let tmp_argo_index = -1;
    let tmp_found = false;

    for (let i = 0; i < payment_array.length; i++) {
        if (payment_array[i].from_nick.toLowerCase() == user_nick.toLowerCase()) {
            to_return.total_given += payment_array[i].price;
            tmp_argo_index = argonaut_nick.indexOf(payment_array[i].to_nick);

            if (tmp_argo_index >= 0) {
                to_return.argoBilance += payment_array[i].price;
                tmp_found = false;
                for (let k = 0; k < toArgonaut.length; k++) {
                    if (toArgonaut[k].nick == argonaut_nick[tmp_argo_index]) {
                        tmp_found = true;
                        toArgonaut[k].given += payment_array[i].price;
                        break;
                    }
                }
                if (!tmp_found) {
                    toArgonaut.push({
                        nick: argonaut_nick[tmp_argo_index],
                        given: payment_array[i].price,
                        recived: 0
                    });
                }
            }
            if (payment_array[i].price > to_return.maxGiven) {
                to_return.luckguy = payment_array[i].to_nick.split("_").join("\\_");
                to_return.maxGiven = payment_array[i].price;
            }
        } else if (payment_array[i].to_nick.toLowerCase() == user_nick.toLowerCase()) {
            to_return.total_recived += payment_array[i].price;
            tmp_argo_index = argonaut_nick.indexOf(payment_array[i].from_nick);

            if (tmp_argo_index >= 0) {
                to_return.argoBilance -= payment_array[i].price;
                tmp_found = false;
                for (let k = 0; k < toArgonaut.length; k++) {
                    if (toArgonaut[k].nick == argonaut_nick[tmp_argo_index]) {
                        tmp_found = true;
                        toArgonaut[k].recived += payment_array[i].price;
                        break;
                    }
                }
                if (!tmp_found) {
                    toArgonaut.push({
                        nick: argonaut_nick[tmp_argo_index],
                        given: 0,
                        recived: payment_array[i].price
                    });
                }
            }
            if (payment_array[i].price > to_return.maxRecived) {
                to_return.mecenate = payment_array[i].from_nick.split("_").join("\\_");
                to_return.maxRecived = payment_array[i].price;
            }

        }

    }
    to_return.toArgonaut = toArgonaut;
    return to_return;
}

function cronoPayment(payment_array, user_nick, recent_bool) {
    console.log("> cronoPayment: " + payment_array.length + ", user: " + user_nick);
    let target_niks = [];


    let to_return = {
        asking_user: user_nick.toLowerCase(),
        total_given: 0,
        total_recived: 0,
        total_transitions: 0,
        users_array: []
    }
    let now_date = Math.floor(Date.now() / 1000);

    for (let i = 0; i < payment_array.length; i++) {
        if (recent_bool != false) {
            let date = Math.floor(((new Date(payment_array[i].time)).getTime()) / 1000);
            if ((now_date - date) > (60 * 60 * 24 * recent_bool)) {
                //console.log((now_date - date));
                continue;
            }
        }

        to_return.total_transitions++;

        let tmp_given = 0;
        let tmp_recived = 0;
        let tmp_nick = "";

        if (payment_array[i].from_nick.toLowerCase() == to_return.asking_user) { // /paga in entrata
            tmp_nick = payment_array[i].to_nick;
            tmp_given = payment_array[i].price;
            to_return.total_given += tmp_given;
        } else if (payment_array[i].to_nick.toLowerCase() == to_return.asking_user) {
            tmp_nick = payment_array[i].from_nick;
            tmp_recived = payment_array[i].price;
            to_return.total_recived += tmp_recived;
        }

        if (target_niks.indexOf(tmp_nick) >= 0) {
            for (let k = 0; k < to_return.users_array.length; k++) {
                if (to_return.users_array[k].nick == tmp_nick) {
                    to_return.users_array[k].given += tmp_given;
                    to_return.users_array[k].recived += tmp_recived;
                    break;
                }
            }
        } else {
            target_niks.push(tmp_nick);

            to_return.users_array.push({
                nick: tmp_nick,
                recived: tmp_recived,
                given: tmp_given
            });
        }

    }

    to_return.users_array.sort(function (a, b) {
        if ((a.recived + a.given) > (b.recived + b.given)) {
            return -1;
        } else {
            return 1;
        }
    });


    return to_return;
}

function getBilance(userA, userB, mess_id, type) {
    return new Promise(function (getBilance_resoult) {

        let questions = [];
        let userB_nick = "";
        if (userA == null) {
            if (userB[0] == false) {
                console.log(userB);
                return getBilance_resoult(simpleMessage(userB[1].split("_").join("\\_") + "!\nNon mi sembra sia un giocatore di Loot... ", mess_id));
            } else {
                console.log("Nuovo Bilancio-Per!");
                userA = userB[1].nickname;
                userB_nick = null
                userB[0] = false;
            }

        } else if (userB[0] == false) {
            console.log("Nuovo Bilancio");
            userB_nick = null;
        } else {
            userB_nick = userB[1].nickname;
        }


        questions.push(getPayment(userA, userB_nick));
        questions.push(getPayment(userB_nick, userA));

        Promise.all(questions).then(function (payments) {
            let final_text = "Work in progress!";
            let res_mess = {};

            if (userB[0]) { // tra due
                final_text = "⚖ ";
                let fromA = 0;
                let fromB = 0;
                for (let i = 0; i < payments[0].length; i++) {
                    fromA += payments[0][i].price;
                }
                for (let i = 0; i < payments[1].length; i++) {
                    fromB += payments[1][i].price;
                }
                let total = fromA - fromB;
                if (fromA == "Reload36" && Math.round(1 + Math.random() * 3) == 2) {
                    userB[1].nickname = "Svizzera Sud";
                }

                final_text += "*" + String(userA).split("_").join("\\_") + ",*\n_considerando i soli /paga..._\n";

                if (fromA == 0 && total == 0) {
                    final_text += "\nNon hai scambiato edollari con " + String(userB[1].nickname).split("_").join("\\_");
                } else {
                    if (userB[1].nickname == "Reload36" && Math.round(1 + Math.random() * 4) == 2) {
                        userB[1].nickname = "Svizzera Sud";
                    }
                    final_text += "\nHai dato a " + String(userB[1].nickname).split("_").join("\\_") + ": " + parsePrice(fromA);
                    final_text += "\nHai ricevuto: " + parsePrice(fromB);
                    final_text += "\n\n*Il Bilancio:* " + parsePrice(total);
                }
                res_mess = simpleMessage(final_text, mess_id);
            } else { // Bilancio complessivo
                let records_count = payments[0].length + payments[1].length;
                let to_return = {}
                to_return.count = payments[0].length + payments[1].length;
                to_return.total_given = 0;
                to_return.total_recived = 0;
                to_return.maxGiven = 0;
                to_return.maxRecived = 0;
                to_return.luckguy;
                to_return.mecenate;
                to_return.argoBilance = 0;
                let nav_button = [[{ text: "Chiudi ⨷", callback_data: "ARGO:FORGET" }]];

                if (records_count == 2000 && type != "CRONO") { //NUOVA PROMISE
                    console.log("Ne faccio un altro...");
                    questions = [];
                    questions.push(getPayment(userA, userB_nick));
                    questions.push(getPayment(userB_nick, userA));
                    return Promise.all(questions).then(function (payments_two) {
                        to_return.count = payments[0].length + payments[1].length + payments_two[0].length + payments_two[1].length;
                        final_text = "⚖ *Bilancio complessivo di " + userA.split("_").join("\__") + "*\n";

                        if (type == "ARGONAUT") {
                            countPayment(payments[0].concat(payments[1]).concat(payments_two[0]).concat(payments_two[1]), userA, to_return);
                            final_text += "_..." + to_return.count + " transizioni_\n";
                            final_text += "\n*Totale*\n";
                            final_text += "Pagato:\n " + edollaroFormat(to_return.total_given) + "\n";
                            final_text += "Ricevuto:\n " + edollaroFormat(to_return.total_recived) + "\n";
                            final_text += "Differenza:\n " + edollaroFormat(to_return.total_given - to_return.total_recived) + "\n\n";

                            if (to_return.toArgonaut.length > 0) {
                                for (let j = 0; j < to_return.toArgonaut.length; j++) {
                                    final_text += "• " + to_return.toArgonaut[j].nick.split("_").join("\\_") + ": ";
                                    if ((to_return.toArgonaut[j].given - to_return.toArgonaut[j].recived) != 0) {
                                        final_text += "" + parsePrice(to_return.toArgonaut[j].given - to_return.toArgonaut[j].recived) + "\n\n";
                                    } else {
                                        final_text += "✓\n\n";
                                    }
                                }
                                final_text += "*Tot:* " + edollaroFormat(to_return.argoBilance) + "\n";
                            } else {
                                final_text += "Al momento non riesco ad accedere alle info sugli Argonauti, riprova tra qualche secondo!\n";
                            }
                            nav_button.unshift([
                                { text: "Recenti", callback_data: "ARGO:PAYMENT:CRONO" }
                            ]);
                        } else {
                            //final_text = "⚖ *Bilancio di " + userA.split("_").join("\__") + "*\n";
                            countPayment(payments[0].concat(payments[1]), userA, to_return);
                            final_text += "_..." + to_return.count + " transizioni_\n";

                            final_text += "\n*Totale*\n";
                            final_text += "Pagato:\n " + edollaroFormat(to_return.total_given) + "\n";
                            final_text += "Ricevuto:\n " + edollaroFormat(to_return.total_recived) + "\n";
                            final_text += "Differenza:\n " + edollaroFormat(to_return.total_given - to_return.total_recived) + "\n";

                            final_text += "\n*Top*\n";
                            final_text += "Pagato: " + parsePrice(to_return.maxGiven) + "\n  a: " + to_return.luckguy + "\n";
                            final_text += "Ricevuto: " + parsePrice(to_return.maxRecived) + "\n  da: " + to_return.mecenate + "\n";

                            nav_button.unshift([
                                { text: "Recenti", callback_data: "ARGO:PAYMENT:CRONO" },
                                { text: "Con Argonauti", callback_data: "ARGO:PAYMENT:ARGONAUT" }
                            ]);
                        }

                        res_mess = simpleMessage(final_text, mess_id);
                        res_mess.options.reply_markup = {};
                        res_mess.options.reply_markup.inline_keyboard = nav_button;
                        return getBilance_resoult(res_mess);
                    });

                } else if (payments.length == 2) {
                    if (type == "ARGONAUT") {
                        final_text = "⚖ *Bilancio Argonauta di " + userA.split("_").join("\__") + "*\n";
                        countPayment(payments[0].concat(payments[1]), userA, to_return);
                        final_text += "_..." + to_return.count + " transizioni_\n\n";

                        final_text += "*Totale*\n";
                        final_text += "Pagato:\n " + edollaroFormat(to_return.total_given) + "\n";
                        final_text += "Ricevuto:\n " + edollaroFormat(to_return.total_recived) + "\n";
                        final_text += "Differenza:\n " + edollaroFormat(to_return.total_given - to_return.total_recived) + "\n\n";

                        to_return.toArgonaut.sort(function (a, b) {
                            if ((a.given + a.recived) > (b.given + b.recived)) {
                                return -1;
                            } else {
                                return 1;
                            }
                        });
                        if (to_return.toArgonaut.length > 0) {
                            for (let j = 0; j < to_return.toArgonaut.length; j++) {
                                final_text += "• " + to_return.toArgonaut[j].nick.split("_").join("\\_") + ": ";
                                if ((to_return.toArgonaut[j].given - to_return.toArgonaut[j].recived) != 0) {
                                    final_text += "" + parsePrice(to_return.toArgonaut[j].given - to_return.toArgonaut[j].recived) + "\n";
                                } else {
                                    final_text += "✓\n";
                                }
                            }

                            final_text += "*Tot:* " + edollaroFormat(to_return.argoBilance) + "\n";
                        } else {
                            final_text += "\nAl momento non riesco ad accedere alle info sugli Argonauti, riprova tra qualche secondo!\n";
                        }
                        nav_button.unshift([
                            { text: "Recenti", callback_data: "ARGO:PAYMENT:CRONO" }
                        ]);
                    } else if (type.match("CRONO")) {
                        final_text = "⚖ *Storico dei pagamenti di " + userA.split("_").join("\__") + "*\n";
                        if (type == "CRONO") {
                            to_return = cronoPayment(payments[0].concat(payments[1]), userA, 30);
                            if (to_return.users_array.length <= 5) {
                                final_text += "_Ultimi 90g, _";
                                to_return = cronoPayment(payments[0].concat(payments[1]), userA, 90);
                            } else {
                                final_text += "_Ultimi 30g, _";
                            }
                        } else {
                            to_return = cronoPayment(payments[0].concat(payments[1]), userA, false);
                        }

                        final_text += "_" + to_return.total_transitions + " transizioni_\n\n";

                        final_text += "*Totale*\n";
                        final_text += "Pagato:\n " + edollaroFormat(to_return.total_given) + "\n";
                        final_text += "Ricevuto:\n " + edollaroFormat(to_return.total_recived) + "\n";
                        final_text += "Differenza:\n " + edollaroFormat(to_return.total_given - to_return.total_recived) + "\n\n";

                        let rest_sumGiven = 0;
                        let rest_sumRecived = 0;

                        for (let i = 0; i < to_return.users_array.length; i++) {
                            if (i < 5) {
                                final_text += "`" + to_return.users_array[i].nick + "`:\n";
                                final_text += " · Dato: ";
                                if ((to_return.users_array[i].given) != 0) {
                                    final_text += "" + parsePrice(to_return.users_array[i].given) + "\n";
                                } else {
                                    final_text += "Nulla\n";
                                }
                                final_text += " · Ricevuto: ";
                                if ((to_return.users_array[i].recived) != 0) {
                                    final_text += "" + parsePrice(to_return.users_array[i].recived) + "\n\n";
                                } else {
                                    final_text += "Nulla\n\n";
                                }
                            } else {
                                rest_sumRecived += to_return.users_array[i].recived;
                                rest_sumGiven += to_return.users_array[i].given;
                            }
                        }
                        if (to_return.users_array.length > 5) {
                            if (to_return.users_array.length == 6) {
                                final_text += "> " + to_return.users_array[i].nick.split("_").join("\\_") + ":\n";
                                final_text += " · Dato: ";
                                if ((to_return.users_array[10].given) != 0) {
                                    final_text += "" + parsePrice(to_return.users_array[10].given) + "\n";
                                } else {
                                    final_text += "Nulla\n";
                                }
                                final_text += " · Ricevuto: ";
                                if ((to_return.users_array[10].recived) != 0) {
                                    final_text += "" + parsePrice(to_return.users_array[10].recived) + "\n";
                                } else {
                                    final_text += "Nulla\n";
                                }
                            } else {
                                final_text += "\nE con altri " + (to_return.users_array.length - 5) + " giocatori:\n";
                                final_text += " · Dato: ";
                                if (rest_sumGiven != 0) {
                                    final_text += "" + edollaroFormat(rest_sumGiven) + "\n";
                                } else {
                                    final_text += "Nulla\n";
                                }
                                final_text += " · Ricevuto: ";
                                if (rest_sumRecived != 0) {
                                    final_text += "" + edollaroFormat(rest_sumRecived) + "\n";
                                } else {
                                    final_text += "Nulla\n";
                                }
                            }

                        }

                        nav_button.unshift([
                            { text: "Riepilogo", callback_data: "ARGO:PAYMENT:" },
                            { text: "Con Argonauti", callback_data: "ARGO:PAYMENT:ARGONAUT" }
                        ]);
                        if (type == "CRONO") {
                            nav_button.unshift([
                                { text: "Esteso", callback_data: "ARGO:PAYMENT:CRONO_EXT:" },
                            ]);
                        } else {
                            nav_button.unshift([
                                { text: "Recenti", callback_data: "ARGO:PAYMENT:CRONO:" },
                            ]);
                        }


                    } else {
                        final_text = "⚖ *Bilancio di " + userA.split("_").join("\__") + "*\n";
                        countPayment(payments[0].concat(payments[1]), userA, to_return);
                        final_text += "_..." + to_return.count + " transizioni_\n";

                        final_text += "\n*Totale*\n";
                        final_text += "Pagato:\n " + edollaroFormat(to_return.total_given) + "\n";
                        final_text += "Ricevuto:\n " + edollaroFormat(to_return.total_recived) + "\n";
                        final_text += "Differenza:\n " + edollaroFormat(to_return.total_given - to_return.total_recived) + "\n";

                        final_text += "\n*Top*\n";
                        final_text += "Pagato: " + parsePrice(to_return.maxGiven) + "\n  a: " + to_return.luckguy + "\n";
                        final_text += "Ricevuto: " + parsePrice(to_return.maxRecived) + "\n  da: " + to_return.mecenate + "\n";

                        nav_button.unshift([
                            { text: "Recenti", callback_data: "ARGO:PAYMENT:CRONO" },
                            { text: "Con Argonauti", callback_data: "ARGO:PAYMENT:ARGONAUT" }
                        ]);
                    }
                    res_mess = simpleMessage(final_text, mess_id);
                    res_mess.options.reply_markup = {};
                    res_mess.options.reply_markup.inline_keyboard = nav_button;
                }
            }

            return getBilance_resoult(res_mess);
        }).catch(function (err) {
            console.log(err);
            getBilance_resoult(simpleMessage("😞\nHo avuto un problema con le api di loot!", mess_id));
        });
    });
}

function getPayment(from, to, offset) {
    console.log("> chiedo pagamenti tra: " + from + " e " + to);
    return new Promise(function (getPayment_resoult) {
        let my_url;
        if (from == null) {
            my_url = "https://fenixweb.net:6600/api/v2/" + config.loot_token + "/history/payments?limit=1000&orderBy=asc&to=" + to;
        } else if (to == null) {
            my_url = "https://fenixweb.net:6600/api/v2/" + config.loot_token + "/history/payments?limit=1000&orderBy=asc&from=" + from;
        } else {
            my_url = "https://fenixweb.net:6600/api/v2/" + config.loot_token + "/history/payments?limit=1000&orderBy=asc&from=" + from + "&to=" + to;
        }
        if (typeof offset == "string") {
            my_url += "&offset=" + offset;
        }
        return got.get(my_url, { responseType: 'json' }).then(function (full_infos) {
            let payments = full_infos.body.res;
            return getPayment_resoult(payments);
        });

    });
}

function manageItemResell(in_query, argo) { // Regala | Vendi
    return new Promise(function (manageItemResell_res) {
        console.log(argo.id);
        loadCraftList(argo.id).then(function (on_db) {
            let res = [];
            let inline_result = {};

            if (!on_db.craft_list) {
                inline_result.title = "Woops!";

                inline_result.to_send = "Per il momento è possibile usare inline \"vendi\" e \"regala\" solo per craft correnti... ";
                inline_result.desc = "non stai seguendo una linea craft!";// + matched_items.join(" ").trim();
                res = parseInlineResult(argo.id, in_query.id, "smuggler", res, inline_result);

            } else {
                if (in_query.query.toLowerCase().match("regala")) {
                    inline_result.title = "Regala";

                } else {
                    inline_result.title = "Vendi";

                }

                let tmpArray = [];
                let resText = "";


                for (let i = 0; i < on_db.craft_list.root_item.length; i++) {
                    console.log(on_db.craft_list.root_item[i].name);
                    if (tmpArray.length > 10) {
                        resText += "`/negozio " + tmpArray.join(", ") + "`\n";
                        tmpArray = [];
                    }
                    tmpArray.push("" + on_db.craft_list.root_item[i].name.trim() + ":" + 1 + ":" + on_db.craft_list.root_item[i].quantity);

                }

                resText += "\n`/negozio " + tmpArray.join(", ") + "`";

                inline_result.to_send = resText;
                inline_result.desc = "Stringhe negozio (beta)";// + matched_items.join(" ").trim();

                res = parseInlineResult(argo.id, in_query.id, "smuggler", res, inline_result);

            }



            return manageItemResell_res(res);
        });
    });
}

function manageItemExcange(in_query, argo) {
    return new Promise(function (manageItemExcange_res) {

        let query_array = in_query.query.split(" ");
        let trigger = query_array[0];
        query_array.shift();
        console.log("> manageItemExcange_res, query_array: " + query_array);


        let inline_result = {};
        let res_array = [];
        let type = "none";

        if (trigger.charAt(trigger.length - 1) == "m") {
            query_array.unshift("m");
        }

        if (query_array.length >= 1 && query_array[0].length <= 2) {
            if (query_array[0].toLowerCase().charAt(0) == "b") {
                type = "base";
            } else if (query_array[0].toLowerCase().charAt(0) == "m") {
                type = "market";
            }
            query_array.shift();
            console.log("> query_array: " + query_array);
        }


        let parsed_question = query_array.join(" ").split(",");

        if (parsed_question.length == 0 || parsed_question[0].length <= 2) {
            if (trigger == "scambia") {
                inline_result.title = "Scambia oggetti";
                inline_result.desc = "Il tuo oggetto...";
                inline_result.to_send = "🔄 *Scambia oggetti*\n\nPosso semplificare lo scambio di oggetti, permettendo l'uso di nomi parziali";
            } else {
                inline_result.title = "Offri Oggetti";
                inline_result.desc = "L'oggetto da offrire...";

                inline_result.to_send = "🎁 *Offri oggetti*\n\nPosso semplificare l'offerta di un oggetto permettendo l'uso di nomi parziali e completando il prezzo con quello di mercato";
                inline_result.to_send += "\n\n*Sintassi:* \n> `offri (b/m) nome_oggetto(, nome_player)`\n\n_Tra parentesi valori opzionali:\nPrezzi a base (default) o valore medio di mercato e giocatore target\nPer abbreviare \"offri mercato\":_ `offrim`";

            }
            if (parsed_question.length >= 1) {
                inline_result.desc += " (-" + (3 - parsed_question[0].length) + ")";
            }
            res_array = parseInlineResult(argo.id, in_query.id, "exchange", res_array, inline_result);

            return manageItemExcange_res(res_array);
        } else {
            let to_give = items_manager.quick_itemFromName(parsed_question[0], false);

            if (to_give.length <= 0) {
                inline_result.title = "Nessun risultato";
                inline_result.desc = "Cercando: " + parsed_question[0];
                inline_result.to_send = "Nessun risultato cercando: `" + parsed_question[0] + "`"
                res_array = parseInlineResult(argo.id, in_query.id, "error", res_array, inline_result);
                return manageItemExcange_res(res_array);
            } if (trigger == "scambia") {
                if (to_give.length > 1) {

                    if (to_give.length > 8) {
                        inline_result.title = "Troppi risultati...";
                        inline_result.desc = "Scrivi ancora qualche lettera\nQui sotto gli oggetti piu simili:";
                        inline_result.to_send = "Cercando `" + parsed_question[0] + "` ho trovato " + to_give.length + " risultati!";
                        res_array = parseInlineResult(argo.id, in_query.id, "error", res_array, inline_result);
                    } else {
                        inline_result.title = "Seleziona un risultato";
                        inline_result.desc = "Tap per inviare l'offerta";
                        inline_result.to_send = "🔄 *Scambia oggetti*\n\nSeleziona uno dei risultati della query per inviare il messaggio. Ricorda di rispondere al messaggio dell'acquirente, e che il plus deve essere Amministratore del gruppo."
                        res_array = parseInlineResult(argo.id, in_query.id, "exchange", res_array, inline_result);
                    }


                    for (let i = 0; i < Math.min(8, to_give.length); i++) {
                        inline_result = {};
                        inline_result.title = to_give[i].name + " (" + to_give[i].rarity + ")";

                        inline_result.to_send = "*" + to_give[i].name + " (" + to_give[i].rarity + ")*\n\n";
                        inline_result.to_send += "> Prezzo base: " + parsePrice(to_give[i].base_value);
                        if (to_give[i].market_medium_value > 0) {
                            inline_result.to_send += "> Mercato: " + parsePrice(to_give[i].market_medium_value);
                        }

                        if (to_give[i].craftable == 0) {
                            inline_result.desc = "Base";
                            res_array = parseInlineResult(argo.id, in_query.id, "base", res_array, inline_result);
                        } else {
                            inline_result.desc = "Creato";
                            res_array = parseInlineResult(argo.id, in_query.id, "craftable", res_array, inline_result);
                        }
                    }
                    return manageItemExcange_res(res_array);
                } else {
                    //Primo risultato (SCAMBI)
                    inline_result.desc = to_give[0].name + " (" + to_give[0].rarity + ")";
                    inline_result.title = "Scambi";
                    inline_result.to_send = "*Scambia oggetti*\n\n> Scambiando: `" + to_give[0].name + " (" + to_give[0].rarity + ") `\n";
                    inline_result.to_send += "\nCompleta la query per ottenere la stringa da usare con @lootplusbot";
                    res_array = parseInlineResult(argo.id, in_query.id, "giveing", res_array, inline_result);


                    if (parsed_question.length <= 1 || parsed_question[1].length <= 3) {
                        console.log("> attendo l'oggetto target...");
                        inline_result.title = "Per... ";

                        inline_result.desc = "L'oggetto che vorresti ottenere ";
                        if (parsed_question.length > 1) {
                            inline_result.desc += "(" + (4 - parsed_question[1].length) + ")";
                        }
                        inline_result.to_send = "*Scambia*\n\nDopo il tuo oggetto, inserisci quello che vuoi chiedere in cambio.\n";
                        inline_result.to_send += "La sintassi completa è:\n1) oggetto\\_da\\_inviare,\n2) oggetto\\_da\\_ricevere,\n3) giocatore (opzionale),\n4) quantità ";
                        inline_result.to_send += "\n\nUsa la virgola per separare gli elementi";
                        res_array = parseInlineResult(argo.id, in_query.id, "error", res_array, inline_result);

                    } else {
                        let to_recive = items_manager.quick_itemFromName(parsed_question[1], false);

                        if (to_recive.length <= 0) {
                            inline_result.title = "Nessun risultato";
                            inline_result.desc = "Cercando: " + parsed_question[1];
                            inline_result.to_send = "Nessun risultato cercando: `" + parsed_question[1] + "`"
                            res_array = parseInlineResult(argo.id, in_query.id, "error", res_array, inline_result);

                        } else if (to_recive.length > 1) {
                            inline_result.title = "Troppi risultati!";
                            inline_result.desc = "Scrivi ancora qualche lettera\nQui sotto gli oggetti piu simili:";
                            inline_result.to_send = "Cercando `" + parsed_question[0] + "` ho trovato " + to_recive.length + " risultati!";
                            res_array = parseInlineResult(argo.id, in_query.id, "error", res_array, inline_result);

                            for (let i = 0; i < Math.min(5, to_recive.length); i++) {
                                inline_result = {};
                                inline_result.title = to_recive[i].name + " (" + to_recive[i].rarity + ")";

                                inline_result.to_send = "*" + to_recive[i].name + " (" + to_recive[i].rarity + ")*\n\n";
                                inline_result.to_send += "> Prezzo base: " + parsePrice(to_recive[i].base_value);
                                if (to_recive[i].market_medium_value > 0) {
                                    inline_result.to_send += "> Mercato: " + parsePrice(to_recive[i].market_medium_value);
                                }

                                if (to_recive[i].craftable == 0) {
                                    inline_result.desc = "Base";
                                    res_array = parseInlineResult(argo.id, in_query.id, "base", res_array, inline_result);
                                } else {
                                    inline_result.desc = "Creato";
                                    res_array = parseInlineResult(argo.id, in_query.id, "craftable", res_array, inline_result);
                                }
                            }
                        } else {
                            res_array = [];

                            if (parsed_question.length == 2 || parsed_question[2].length < 0) {
                                inline_result.title = to_give[0].name + " per " + to_recive[0].name;
                                inline_result.desc = "O completa la query con le quantità";
                                inline_result.to_send = "/scambia " + to_give[0].name + ", " + to_recive[0].name + ", 1";
                                res_array = parseInlineResult(argo.id, in_query.id, "exchange", res_array, inline_result);

                            } else {
                                let quantity = parseInt(parsed_question[2]);
                                if (!isNaN(quantity)) {
                                    inline_result.title = quantity + "x: " + to_give[0].name + " per " + to_recive[0].name;
                                    inline_result.desc = "Tap per stampare la stringa";
                                    inline_result.to_send = "/scambia " + to_give[0].name + ", " + to_recive[0].name + ", 1";
                                    res_array = parseInlineResult(argo.id, in_query.id, "exchange", res_array, inline_result);

                                } else {
                                    inline_result.title = to_give[0].name + " per " + to_recive[0].name;
                                    inline_result.desc = "Quantità non valida!";
                                    inline_result.to_send = "*Scambio di Oggetti*,\n\nVorresti scambiare " + to_give[0].name + " per " + to_recive[0].name;
                                    inline_result.to_send += " ma per... `" + parsed_question[2] + "`?";
                                    res_array = parseInlineResult(argo.id, in_query.id, "exchange", res_array, inline_result);

                                }
                            }

                        }
                    }

                    return manageItemExcange_res(res_array);
                }

            } else {
                if (to_give.length > 8) {
                    inline_result.title = "Molti risultati (" + to_give.length + ")";
                    inline_result.desc = "Scrivi ancora qualche lettera...";
                    inline_result.to_send = "*Cercando* `" + parsed_question[0] + "`\n\nOggetti: " + to_give.length + "\n";
                    let max = Math.min(20, to_give.length);
                    for (let i = 1; i < max; i++) {
                        inline_result.to_send += "> " + to_give[i].name + " (" + to_give[i].rarity + ")\n";
                    }
                    if ((to_give.length - max) == 1) {
                        inline_result.to_send += "> " + to_give[max].name + " (" + to_give[max].rarity + ")\n";
                    } else if (max != to_give.length) {
                        inline_result.to_send += "\n\n_...Ed altri: " + (max - to_give.length) + "_";
                    }

                    res_array = parseInlineResult(argo.id, in_query.id, "error", res_array, inline_result);
                } else {
                    if (to_give.length == 0) {
                        inline_result.title = "Seleziona il risultato";
                    } else {
                        inline_result.title = "Seleziona un risultato";
                    }
                    inline_result.desc = "";//"Tap per inviare l'offerta";
                    inline_result.to_send = "🎁 *Offri oggetti*\n\nSeleziona uno dei risultati della query per inviare il messaggio. Ricorda di rispondere al messaggio dell'acquirente o di specificarne il nick, e che il plus deve essere Amministratore del gruppo."
                    res_array = parseInlineResult(argo.id, in_query.id, "exchange", res_array, inline_result);
                }

                if (type == "none") {
                    type = "base";
                }
                console.log("> Offro a prezzo: " + type);
                for (let i = 0; i < Math.min(8, to_give.length); i++) {
                    inline_result = {};
                    inline_result.title = to_give[i].name + " (" + to_give[i].rarity + ")";

                    inline_result.to_send = "/offri " + to_give[i].name;

                    if (type == "base") {
                        inline_result.to_send += ", " + to_give[i].base_value;
                        inline_result.desc = parsePrice(to_give[i].base_value);
                    } else {
                        if (to_give[i].market_medium_value > 0) {
                            inline_result.to_send += ", " + to_give[i].market_medium_value;

                            inline_result.desc = parsePrice(to_give[i].market_medium_value);
                        } else {
                            inline_result.to_send += ", 1";

                            inline_result.desc = "Prezzo mercato non disponibile";
                        }
                    }

                    if (to_give[i].craftable == 0) {
                        inline_result.desc += ", Base";
                        res_array = parseInlineResult(argo.id, in_query.id, "base", res_array, inline_result);
                    } else {
                        inline_result.desc += ", Creato";
                        res_array = parseInlineResult(argo.id, in_query.id, "craftable", res_array, inline_result);
                    }
                }

                if (parsed_question.length > 1) {
                    let target_name = parsed_question[1].trim();

                    if (target_name.length < 3) {
                        console.log("> targetName troppo corto...");

                        res_array[0].title = "Autocomplete dell'acquirente";
                        res_array[0].description = "Dopo 3 caratteri";
                        res_array[0].input_message_content.message_text += "\nPosso autocompletare il nome dell'acquirente, contando su un database di " + allLootUsers.length + " giocatori di Loot";
                    } else {
                        let matchedNames_array = getAPlayer(target_name);

                        if (matchedNames_array.length == 0) {
                            res_array[0].title = "Nessun match!";
                            res_array[0].description = "Non ho trovato alcun giocatore con nome simile...";
                            res_array[0].input_message_content.message_text += "\n> Nessun giocatore trovato per `" + target_name + "` ";
                        } else if (matchedNames_array.length == 1) {
                            res_array[0].title = matchedNames_array[0];
                            res_array[0].description = "Sarà l'acquirente per i negozi";
                            res_array[0].input_message_content.message_text += "\n\n>Stringhe automatiche, offri con target `" + matchedNames_array[0] + "`";
                            res_array[0].thumb_url = "https://img.icons8.com/pastel-glyph/64/000000/logout-rounded-up.png";
                            for (let i = 1; i < res_array.length; i++) {
                                res_array[i].input_message_content.message_text += ", `" + matchedNames_array[0] + "`";
                            }
                        } else {
                            res_array[0].title = "Troppi match!";
                            res_array[0].description = "Ci sono " + matchedNames_array.length + " giocatori con nomi simili...";
                            res_array[0].input_message_content.message_text += "\n\n*Giocatori per " + target_name + ": " + matchedNames_array.length + "*";
                            for (let i = 0; i < matchedNames_array.length; i++) {
                                res_array[0].input_message_content.message_text += "\n> `" + matchedNames_array[i] + "`";
                            }
                        }
                    }
                } else {
                    res_array[0].description += "\nRicorda di rispondere ad un messaggio!"
                }

                return manageItemExcange_res(res_array);
            }
        }
    });
}

function managePlayerSearch(in_query, argo) {
    return new Promise(function (managePlayerSearch_result) {
        let inline_result = {};
        let query_array = in_query.query.split(" ");

        let res_array = [];
        inline_result.title = "Rierca Giocatori";
        inline_result.desc = "Scrivi, anche parzialmente, il nick di un giocatore...";
        inline_result.to_send = "🔎 *Rierca Giocatori*\n\n";

        if (query_array.length <= 1) {
            inline_result.to_send += "Posso semplificare la ricerca di un giocatore permettendo l'uso di nick parziali. Degli Argonauti conosco poi i nomi e qualche soprannome...";
            res_array = parseInlineResult(argo.id, in_query.id, "search", res_array, inline_result);

            return managePlayerSearch_result(res_array);
        } else {
            if (query_array[1].length <= 2) {
                inline_result.desc += " (-" + (3 - query_array[1].length) + ")";
                inline_result.to_send += "Posso semplificare la ricerca di un giocatore permettendo l'uso di nick parziali (*almeno 3 caratteri*).\nDegli Argonauti conosco poi i nomi e qualche soprannome...";

                inline_result.to_send += "Posso semplificare lo scambio di oggetti, permettendo l'uso di nomi parziali ";
                res_array = parseInlineResult(argo.id, in_query.id, "search", res_array, inline_result);

                return managePlayerSearch_result(res_array);
            } else {
                let matchedNames_array = getAPlayer(query_array[1]);
                inline_result.desc = "Tap per dettagli";
                let found_player;

                if (matchedNames_array.length == 0) {
                    inline_result.title = "∅ Nessun Match"; // ⛵
                    inline_result.to_send += "Nessun risultato ricercando `" + query_array[1] + "`";
                    inline_result.to_send += "\n> Utenti LootGameBot: " + allLootUsers.length + "\n";
                    inline_result.to_send += "> Argonauti: " + globalArgonauts.length + "\n";

                } else if (matchedNames_array.length == 1) {
                    if (matchedNames_array[0].isArgonaut) {
                        inline_result.title = "⛵ ";
                    } else {
                        inline_result.title = "👤 ";
                    }
                    found_player = matchedNames_array[0];
                    inline_result.title += found_player.nick;
                } else { //
                    let position = 0;
                    if (query_array.length >= 2) {
                        for (let i = 2; i < query_array.length; i++) {
                            position += query_array[i].length;
                        }
                    }

                    if (position >= (matchedNames_array.length - 1)) {
                        position = (position % matchedNames_array.length);
                    }
                    console.log("> Posizione: " + position);

                    inline_result.desc = "> " + matchedNames_array[position].nick + "\n" + inline_result.desc;
                    found_player = matchedNames_array[position];
                    if (found_player.isArgonaut) {
                        inline_result.title = "⛵ Primo Match";
                    } else {
                        inline_result.title = "👤 Primo Match";
                    }
                }

                inline_result.to_send = "*Giocatori di Lootia*\n\n";
                if (found_player.isArgonaut) {
                    inline_result.to_send += "⛵ `";
                } else {
                    inline_result.to_send += "👤 `";
                }
                inline_result.to_send += found_player.nick + "`\n\n"; //+inline_result.to_send;

                res_array = parseInlineResult(argo.id, in_query.id, "search", res_array, inline_result);
                res_array[0].reply_markup = {};
                res_array[0].reply_markup.inline_keyboard = [
                    [
                        {
                            text: "Semplice",
                            switch_inline_query_current_chat: "eco: " + found_player.nick
                        }
                    ], [
                        {
                            text: "🔦",
                            switch_inline_query_current_chat: "eco: Ispeziona " + found_player.nick + "\n"
                        },
                        {
                            text: "💬",
                            switch_inline_query_current_chat: "eco: /m " + found_player.nick + "\n"
                        },
                        {
                            text: "👀",
                            switch_inline_query_current_chat: "eco: Spia " + found_player.nick + "\n"
                        },
                        {
                            text: "👁‍🗨",
                            switch_inline_query_current_chat: "spia " + found_player.nick + "\n"
                        } // 👁‍🗨

                    ]
                ];

                // altri
                if (matchedNames_array.length == 2) {
                    inline_result.title = "👥 Secondo Match";
                    inline_result.desc = "> " + matchedNames_array[1].nick + "\n" + inline_result.desc;
                    inline_result.to_send = "*Giocatori di Lootia*\n\n👤 `" + matchedNames_array[1].nick + "`\n\n"; //+inline_result.to_send;
                    res_array = parseInlineResult(argo.id, in_query.id, "search", res_array, inline_result);

                    res_array[1].reply_markup = {};
                    res_array[1].reply_markup.inline_keyboard = [
                        [
                            {
                                text: "Semplice",
                                switch_inline_query_current_chat: "eco: " + matchedNames_array[1].nick
                            }
                        ], [
                            {
                                text: "🔦",
                                switch_inline_query_current_chat: "eco: Ispeziona " + matchedNames_array[1].nick + "\n"
                            },
                            {
                                text: "💬",
                                switch_inline_query_current_chat: "eco: /m " + matchedNames_array[1].nick + "\n"
                            },
                            {
                                text: "👀",
                                switch_inline_query_current_chat: "eco: Spia " + matchedNames_array[1].nick + "\n"
                            }

                        ]
                    ];

                } else if (matchedNames_array.length > 2) {
                    inline_result.title = "👥 Altri " + (matchedNames_array.length - 1) + "";
                    inline_result.to_send = "*Giocatori di Lootia*\n_Match per: \"" + query_array[1] + "\" _\n\n"; //+inline_result.to_send;
                    inline_result.desc = "Tap per dettagli";

                    for (let i = 1; i < matchedNames_array.length; i++) {

                        inline_result.to_send += "• `" + matchedNames_array[i].nick + "` ";
                        if (matchedNames_array[i].isArgonaut) {
                            inline_result.to_send += "⛵";
                        }
                        inline_result.to_send += "\n";

                    }
                    res_array = parseInlineResult(argo.id, in_query.id, "search", res_array, inline_result);

                }


                return managePlayerSearch_result(res_array);

            }
        }
    });
}

function checkValidOffert_viandante(message_text) {
    return new Promise(function (is_avalid_offert) {
        let line_split = message_text.split("\n");

        let tmp_line;
        let treeItemArray = [];
        for (let counter = 3; counter > 0; counter--) {
            tmp_line = line_split[line_split.length - counter].substring(1);

            let tmp_Item = { name: "", paid: "" };
            tmp_Item.name = tmp_line.split("(")[0].trim();
            tmp_Item.paid = tmp_line.split("(")[1].trim();
            tmp_Item.paid = tmp_Item.paid.substring(0, tmp_Item.paid.length - 2).split(".").join("");

            treeItemArray.push(tmp_Item);
        }

        let promise_array = [];
        for (let i = 0; i < 3; i++) {
            promise_array.push(items_manager.getItem(treeItemArray[i].name));
        }
        return Promise.all(promise_array).then(function (itemInfos_array) {
            let res_text = "🦴 *Offerta del Viandante*\n\n";
            let bestItem = treeItemArray[0];
            bestItem.index = 1;
            for (let i = 0; i < 3; i++) {

                let tmp_diff;
                if (isNaN(itemInfos_array[i].market_medium_value) || itemInfos_array[i].market_medium_value <= 0) {
                    treeItemArray[i].real_cost = itemInfos_array[i].estimate_value;
                } else {
                    treeItemArray[i].real_cost = itemInfos_array[i].market_medium_value;
                }
                tmp_diff = parseInt(treeItemArray[i].real_cost) - parseInt(treeItemArray[i].paid);

                if (tmp_diff >= 0) {
                    res_text += "*✓ *";
                    if ((bestItem.real_cost - bestItem.paid) < tmp_diff) {
                        bestItem = treeItemArray[i];
                        bestItem.index = i + 1;
                    }
                } else {
                    res_text += "*✗ *";
                }
                res_text += treeItemArray[i].name + "\n  Al mercato: " + parsePrice(treeItemArray[i].real_cost) + "\n";

                if (tmp_diff >= 0) {
                    res_text += "  Risparmio: *" + parsePrice(tmp_diff) + "*\n";
                } else {
                    res_text += "  Perdita: " + parsePrice(tmp_diff) + "\n";
                }
                res_text += "\n";

            }

            if ((bestItem.real_cost - bestItem.paid) > 0) {
                res_text += "\nIo prenderei *" + bestItem.name + "* ✅"; //❌ 
            } else {
                res_text += "\nIo *non* prenderei nulla, maledetto _viandante!_ ❌"; // 
            }

            return is_avalid_offert([res_text, bestItem.index]);

        });
        // console.log("> tirdItem: "+tirdItem);

    });
}

function checkValidOffert_predone(message_text) {
    return new Promise(function (is_avalid_offert) {
        console.log("> message_text: \n" + message_text + "\n_________");

        let start_index = message_text.indexOf("Ti offre ") + 9;
        let middle_index = message_text.indexOf(" in cambio del tuo ");
        console.log("> Index: " + start_index + ", " + middle_index);

        let item1 = message_text.substring(start_index, middle_index);
        let item2 = message_text.substring(middle_index + 19);
        if (item2.indexOf("☑️") > 0 || item2.indexOf("✅") > 0) {
            console.log("Emoji!");
            item2 = item2.split(" ").slice(0, -1).join(" ");
        }

        let items_promises = [];
        items_promises.push(items_manager.getItem(item1));
        items_promises.push(items_manager.getItem(item2));


        return Promise.all(items_promises).then(function (all_items) {

            let res_text = "💱* Offerta del Predone*\n";
            if (all_items[0].market_medium_value >= all_items[1].market_medium_value) {
                res_text += "_Ti consiglio di accettare!_ 👍\n\n*Guadagno:* " + parsePrice(all_items[0].market_medium_value - all_items[1].market_medium_value);
            } else {
                res_text += "_Ti sconsiglio di accettare!_ 👎\n\n*Perdita:* " + parsePrice(all_items[1].market_medium_value - all_items[0].market_medium_value);
            }
            res_text += "\n\n⇩ *" + all_items[0].name + "*";
            res_text += "\n Base: " + parsePrice(all_items[0].base_value) + "";
            res_text += "\n Media al mercato: " + parsePrice(all_items[0].market_medium_value) + "";

            res_text += "\n\n⇧ *" + all_items[1].name + "*";
            res_text += "\n Base: " + parsePrice(all_items[1].base_value) + "";
            res_text += "\n Media al mercato: " + parsePrice(all_items[1].market_medium_value) + "";


            return is_avalid_offert(res_text);



        });




    });
}

function checkValidOffert_luccicante(message_text) {
    return new Promise(function (is_avalid_offert) {
        console.log("> message_text: \n" + message_text + "\n_________");

        let item = message_text.substring(message_text.indexOf(" in questo caso: ") + 17);
        item = item.substring(0, item.indexOf(","));

        let multipler = 1;
        if (message_text.match("2x 💎")) {
            multipler = 2;
        }

        if (item.indexOf("✅") > 0 || item.indexOf("☑️") > 0) {
            console.log("Emoji!");
            item = item.split(" ").slice(0, -1).join(" ");
        }


        return items_manager.getItem(item).then(function (item_info) {

            let res_text = "💎 * Offerta del Gioielliere*\n";
            res_text += "> " + item_info.name + " (" + item_info.rarity + ")\n\n";
            let craftable = item_info.craftable == 0 ? false : true;
            if (item_info.market_medium_value <= multipler * 300000) {
                res_text += "_Ti consiglio di accettare!_ 👍\nGuadagno: " + parsePrice(multipler * 300000 - item_info.market_medium_value);//+" 🟢";
            } else {
                res_text += "_Ti sconsiglio di accettare!_ 👎\nPerdita: " + parsePrice(item_info.market_medium_value - multipler * 300000);//+" 🔴";;
            }

            res_text += "\n\n💰Info:";
            res_text += "\n Base: " + parsePrice(item_info.base_value) + "";
            res_text += "\n Media al mercato: " + parsePrice(item_info.market_medium_value) + "";



            return is_avalid_offert([res_text, craftable]);



        });




    });
}

// #ITEMS
function manageInlineInfos(argonaut, query_id, question_array) {
    return new Promise(function (manageInlineInfos_res) {
        let inline_result = {};
        let res_array = [];

        if (question_array.length <= 1) {
            if (isNaN(items_manager.getItemsCount().all) || items_manager.getItemsCount().all == 0) {
                inline_result.title = "Oggetti di Lootia??";
                inline_result.desc = "Non conosco piu niente! 😱";
                inline_result.to_send = inline_result.desc;
                res_array = parseInlineResult(argonaut.id, query_id, "error", res_array, inline_result);
            } else {
                inline_result = infoInlineFAQ();
                res_array = parseInlineResult(argonaut.id, query_id, "info", res_array, inline_result);
            }
        } else if (question_array.slice(1).join(" ").length <= 2) {
            let to_check = question_array.slice(1).join(" ").toUpperCase();
            let is_rarity = false;
            for (let i = 0; i < items_manager.all_rarity.length; i++) {
                if (items_manager.all_rarity[i] == to_check) {
                    is_rarity = true;
                    break;
                }
            }
            if (!is_rarity) {
                console.log("> Domanda corta...");
                inline_result = infoInlineFAQ();
                res_array = parseInlineResult(argonaut.info.id, query_id, "info", res_array, inline_result);
            }
        }

        if (res_array.length == 0) {
            question_array.shift();
            let object_array = parseCraftQuestion(question_array.join(" "));
            //console.log(object_array);
            let matched_items = [];
            let tmp_parse;

            for (let i = 0; i < object_array.length; i++) {
                tmp_parse = parseImputSearch(object_array[i].partial_name.split(" "));
                matched_items = matched_items.concat(items_manager.quick_itemFromName(tmp_parse.imput_name, tmp_parse.rarity_index, tmp_parse.res_count, null, tmp_parse.craftable));
            }

            if (matched_items.length > 0) {
                let to_analize = {};
                let condition;
                let forced = false;
                if (matched_items.length == 1) {
                    forced = true;
                    to_analize = matched_items[0];
                } else {
                    for (let i = 0; i < matched_items.length; i++) {
                        condition = matched_items[i].last_market_update == null || matched_items[i].last_market_update == 0 || ((Date.now() / 1000) - parseInt(matched_items[i].last_market_update)) > (60 * 60);
                        if (condition) {
                            to_analize = matched_items[i];
                            break;
                        }
                    }
                }


                return items_manager.completeUpdateItem(to_analize, forced).then(function (complete_update_res) {
                    console.log("> complete_update_res (esit) " + complete_update_res);
                    let limit = Math.min(matched_items.length, 9);

                    for (let i = 0; i < limit; i++) {
                        //console.log(matched_items[i]);

                        inline_result.title = matched_items[i].name + " (" + matched_items[i].rarity + ")";
                        inline_result.desc = (matched_items[i].craftable ? "Craftato, " + matched_items[i].craft_pnt + "pc." : "Base");
                        if (matched_items[i].market_medium_value > 0) {
                            inline_result.desc += "\nMercato: " + edollaroFormat(matched_items[i].market_medium_value);
                        }
                        inline_result.to_send = "ⓘ *Enciclopedia Argonauta*\n\n" + items_manager.printItem(matched_items[i]);
                        if (matched_items[i].craftable == 1) {
                            let buttons_array = [];
                            buttons_array.push([{
                                text: "Craft",
                                //callback_data: "ARGO:prova:prova",
                                switch_inline_query_current_chat: "crea " + matched_items[i].name + " " + matched_items[i].rarity
                            }]);
                            res_array = parseInlineResult(argonaut.id, query_id, "craftable", res_array, inline_result, true, buttons_array);

                        } else {
                            res_array = parseInlineResult(argonaut.id, query_id, "base", res_array, inline_result);
                        }

                    }
                    if (limit < matched_items.length) {

                        // question_array = [parse.imput_name];
                        // if (parse.rarity_index) {
                        //     question_array.push(parse.rarity_index);
                        // }
                        // if (parse.craftable == 0) {
                        //     question_array.push("Base");
                        // } else if (parse.craftable == 1) {
                        //     question_array.push("Craftati");
                        // }
                        inline_result.title = "Ed altri " + (matched_items.length - limit) + "...";

                        inline_result.to_send = "/cerca " + question_array.join(" ").trim();
                        inline_result.desc = "Tap ";// + matched_items.join(" ").trim();
                        inline_result.desc += "\nPer il comando /cerca ";

                        res_array = parseInlineResult(argonaut.id, query_id, "info", res_array, inline_result);
                    }
                    return manageInlineInfos_res(res_array);

                });
            } else {

                inline_result.title = "Mumble... 🤔";

                inline_result.desc = "Non mi dice nulla \"" + question_array.join(" ") + "\"!";
                inline_result.to_send = inline_result.desc;
                res_array = parseInlineResult(argonaut.id, query_id, "info", res_array, inline_result);

            }

        }

        return manageInlineInfos_res(res_array);
    });
}

function getMarketInfo(toAnalyze_text) { // RECENTE
    return new Promise(function (getMarketInfo_res) {
        let tmp_split = toAnalyze_text.split("\n");
        let item_name;
        let price;
        if (tmp_split[0].charAt(0) == "📦") { // richesta nel porto
            item_name = tmp_split[2];
            item_name = item_name.substring(0, item_name.indexOf(" ("));

            price = tmp_split[3].split(" ")[1];
            if (price.match(".")) {
                let tmp_priceSplit = price.split(".");
                console.log("> tmp_priceSplit:");
                console.log(tmp_priceSplit);


                if (tmp_priceSplit[1].match("M")) {
                    tmp_priceSplit[1] = tmp_priceSplit[1].slice(0, -1);
                    price = parseInt(tmp_priceSplit[0]) * 1000000 + (parseInt(tmp_priceSplit[1]) / 100) * 1000000;
                } else if (tmp_priceSplit[1].match("K")) {
                    tmp_priceSplit[1] = tmp_priceSplit[1].slice(0, -1);
                    price = parseInt(tmp_priceSplit[0]) * 1000 + (parseInt(tmp_priceSplit[1]) / 100) * 1000;
                }
            } else {
                price = parseInt(price);
            }


        } else if (tmp_split[0].startsWith("🎉")) {
            item_name = tmp_split[2];
            item_name = item_name.substring(7, item_name.indexOf(" ("));
            price = tmp_split[3].split(" ")[2];
            price = parseInt(price.split(".").join(""));
        } else {
            item_name = tmp_split[1];
            item_name = item_name.substring(2, item_name.indexOf(" ("));
            price = tmp_split[4].split(" ")[3];
            price = parseInt(price.split(".").join(""));

        }


        console.log("> ItemName: " + item_name);
        console.log("> Price: " + price);

        let resItem = items_manager.quick_itemFromName(item_name, false, 1)[0];
        let text = "";
        if (tmp_split[0].startsWith("🎉")) {
            text = "🎉 *Contrabbando da Festival*\n> " + item_name + " (" + resItem.rarity + ")\n";
            text += "\nBase: " + formatNumber(price) + " §\n";
            text += "\n*Negozi*";
            text += "\n· Medio " + parsePrice(resItem.market_medium_value);
            text += "\n· Range: " + parsePrice(resItem.market_min_value).split("").slice(0, -2).join("") + "* / *";
        } else {
            text = "👣 *Info per Contrabbando*\n> " + item_name + " (" + resItem.rarity + ")\n";
            text += "\nSmerciabile a " + formatNumber(price) + " §\n";
            if (resItem.market_medium_value != 0) {
                text += "\n*Negozi*";
                if (price < resItem.market_min_value) {
                    text += " *-* ⚠️";
                }
                text += "\n· Medio " + parsePrice(resItem.market_medium_value);
                text += "\n· Range: " + parsePrice(resItem.market_min_value).split("").slice(0, -2).join("") + "* / *";
                text += parsePrice(resItem.market_max_value) + "\n";

                //text += "\n"; //✅
            }


            if (resItem.lucky_guy != null) {
                text += "\n*Storico*";

                text += "\n· A " + String(resItem.lucky_guy).split("_").join("\\_") + ": " + parsePrice(resItem.smuggler_max_value);
                let proportion = 100 - Math.round((100 * price) / resItem.smuggler_max_value);

                if (price > resItem.smuggler_max_value) {
                    proportion = Math.round((100 * price) / resItem.smuggler_max_value) - 100;
                    text += " (+" + Math.abs(proportion) + "%!)";
                } else if (price < resItem.smuggler_max_value) {
                    text += " (-" + Math.abs(proportion) + "%)";
                }

                if (resItem.offert_counter > 1) {
                    text += "\n· Offerto: *" + resItem.offert_counter + "* volte";
                }

                if (resItem.smuggler_min_value > 0) {
                    if (price != resItem.smuggler_min_value) {
                        text += "\n· Minimo: " + parsePrice(resItem.smuggler_min_value);

                        proportion = Math.abs(100 - Math.round((100 * price) / resItem.smuggler_min_value));
                        if (price > resItem.smuggler_min_value) {
                            text += " (+" + proportion + "%)"
                        } else if (price < resItem.smuggler_min_value) {
                            text += " (-" + proportion + "%)";
                        }
                    }

                    if (price > resItem.smuggler_max_value) {
                        text += "\n 👌"
                    } else if (price < (resItem.smuggler_min_value + (resItem.smuggler_min_value / 10))) {
                        text += "\n 👎";
                    }

                } else {
                    text += "\n· Non è ancora noto il range d'offerta.\n";
                }

            } else {
                text = "🌱 È una nuova offerta per gli Argonauti,\nNon so dirti se " + parsePrice(price) + " sia un buon prezzo...";
            }
        }




        getMarketInfo_res({ toSendText: text, item: item_name });

    });
}

function parseImputSearch(question_array) {
    let r_index = false;
    let is_craftable = -1;
    let new_question_array = question_array.slice();
    let precise = 10;
    let flexible = false;
    let quantity = -1;
    console.log("Chiesto parse dell'imput: [" + question_array.join(", ") + "]");

    for (let i = 0; i < question_array.length; i++) {
        if (question_array[i].length > 0) {
            if (question_array[i] == "prezzi" || question_array[i] == "mercato") {
                console.log("> Prezzi!");
            } else if (question_array[i].toLowerCase() == "base") {
                is_craftable = 0;
                new_question_array = new_question_array.filter(function (val) {
                    return val != question_array[i];
                });
                console.log("> Tolgo: " + question_array[i]);
            } else if (question_array[i] == "!") {
                precise = -1;
                new_question_array = new_question_array.filter(function (val) {
                    return val != question_array[i];
                });
                console.log("> Tolgo: " + question_array[i]);
            } else if (question_array[i] == "?") {
                flexible = true;
                new_question_array = new_question_array.filter(function (val) {
                    return val != question_array[i];
                });
                console.log("> Tolgo: " + question_array[i]);
            } else if (question_array[i].indexOf("!") > 0) {
                precise = -1;
                new_question_array[i] = question_array[i].substring(0, question_array[i].indexOf("!"));
                console.log("> Preciso-attaccato (pulito?): " + new_question_array[i]);
            } else if (question_array[i].indexOf("?") > 0) {
                flexible = true;
                new_question_array[i] = question_array[i].substring(0, question_array[i].indexOf("?"));
            } else if (question_array[i].toLowerCase() == "craftati" || question_array[i].toLowerCase() == "creati" || question_array[i].toLowerCase().match("craftabil") || question_array[i].toLowerCase().match("creabil")) {
                is_craftable = 1;
                new_question_array = new_question_array.filter(function (val) {
                    return val != question_array[i];
                });
                console.log("> Scarto: " + question_array[i]);
            } else if (!isNaN(question_array[i])) {
                console.log("> Trovato un numeroooo!");
                quantity = parseInt(question_array[i]);
                new_question_array = new_question_array.filter(function (val) {
                    return val != question_array[i];
                });
                console.log("> Tolgo: " + question_array[i]);
            } else if (question_array[i].length <= 2) {
                console.log("> Ricerco rarità....");
                let all_rarity = items_manager.all_rarity;
                for (let j = 0; j < all_rarity.length; j++) {
                    if (question_array[i].toUpperCase() == all_rarity[j]) {
                        console.log("Trovatà rarità: '" + all_rarity[j] + "'");
                        r_index = all_rarity[j];
                        new_question_array = new_question_array.filter(function (val) {
                            return val != question_array[i];
                        });
                        console.log("> Tolgo: " + question_array[i]);

                        break;
                    }
                }
            }
        }
    }

    console.log("> Restituisco: Indice Rarità: " + r_index + ", craftabile: " + is_craftable + ",\n> Ho scartato: " + (question_array.length - new_question_array.length) + " parole...");
    console.log("> Servitore: " + new_question_array.join(" "));

    return {
        imput_name: new_question_array.join(" ").trim(),
        rarity_index: r_index,
        craftable: is_craftable,
        res_count: precise,
        a_bunch: flexible,
        new_quantity: quantity
    };

}

function estimateList(message, argo_info, chat_id) {
    return new Promise(function (estimate_res) {
        let items_array = [];
        let complete_array = [];
        let splitted_text = message.text.split("\n");
        console.log(splitted_text);
        if (splitted_text.length <= 1) {
            return estimate_res(simpleMessage("🤯 *Woops*\n\nIl messaggio a cui hai risposto non mi sembra includa una lista di oggetti!", chat_id));
        } else if (splitted_text[0] == "Zaino Aggiornato! 🎒") {
            //devo mettere nella lista tutti gli oggetti nello zaino (di rarita nella seconda riga)
            return estimate_res(simpleMessage(":( *Desolato*\n\nLa stima dallo zaino non è ancora supportata...", chat_id));
        } else {
            for (let i = 1; i < splitted_text.length; i++) {
                if (splitted_text[i].charAt(0) == ">") {
                    let tmp_quantity;
                    if (splitted_text[i].indexOf(",") > 0) {
                        tmp_quantity = parseInt(splitted_text[i].substring(splitted_text[i].indexOf(",") + 2, splitted_text[i].indexOf(")")));
                    } else {
                        tmp_quantity = parseInt(splitted_text[i].substring(splitted_text[i].indexOf("(") + 1, splitted_text[i].indexOf(")")));
                    }
                    if (!isNaN(tmp_quantity)) {
                        items_array.push(splitted_text[i].substring(2, splitted_text[i].indexOf(" (")));
                        complete_array.push(tmp_quantity);
                    }
                }
            }
            return items_manager.extimate(items_array).then(function (estimated_array) {

                if (estimated_array.length == 0 || estimated_array.length != complete_array.length) {
                    return estimate_res(simpleMessage(":( *Desolato*\n\nHo ottenuto dei risultati inconsistenti.", chat_id));
                } else {
                    let res_text = "💰 *Stima del valore di Mercato*\n_...per ";
                    if (estimated_array.length == 1) {
                        res_text += "un oggetto\n\n";
                    } else {
                        res_text += estimated_array.length + " oggetti_\n\n";
                    }
                    let total_value = 0;
                    let total_object = 0;
                    let object_text = "";
                    for (let i = 0; i < estimated_array.length; i++) {
                        total_value += estimated_array[i].market_medium_value * complete_array[i];
                        total_object += complete_array[i];
                        //console.log("> Controllo: " + estimated_array[i].name + ", " + complete_array[i]);
                        if (estimated_array[i].market_medium_value) {
                            object_text += "> *" + estimated_array[i].name + "*, " + parsePrice(estimated_array[i].market_medium_value * complete_array[i]) + "\n";
                            object_text += "  " + parsePrice(estimated_array[i].market_medium_value) + "\n";
                        } else {
                            object_text += "> *" + estimated_array[i].name + "*, " + parsePrice(estimated_array[i].base_value * complete_array[i]) + "\n";
                            object_text += "  " + parsePrice(estimated_array[i].base_value) + "\n";
                        }

                    }
                    res_text += "• Copie totali: " + total_object + "\n";
                    res_text += "• Valore stimato: " + edollaroFormat(total_value) + "\n\n";
                    res_text += object_text;

                    return estimate_res(simpleMessage(res_text, chat_id));
                }

            });
        }

    });
}

// 🛠#CRAFT


function inoltroCrafter(toAnalyze_text, argo, type, fixed_quantity, autofiller) {
    return new Promise(function (inoltroCraft_res) {
        let res_text = "";
        let craft_array = [];
        let root_item_parsed_array = [];
        console.log("> inoltroCrafter! type: " + type + ", fixed_quantity= " + fixed_quantity);

        if (typeof autofiller != "undefined" && typeof autofiller.tocraft_array != "undefined") {
            craft_array = autofiller.tocraft_array.slice(0);
            root_item_parsed_array = autofiller.root_item_parsed_array.slice(0);
            autofiller = true;
        } else {
            if (type == "assalto") {
                let lines = toAnalyze_text.split("\n");
                let tmp_name;
                let tmp_id;
                let tmp_quantity_has;
                let tmp_quantity_needed;

                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].match("🚫")) {
                        tmp_name = lines[i].substring(2, lines[i].indexOf(" ("));
                        tmp_quantity_has = parseInt(lines[i].substring(lines[i].indexOf(")") + 2, lines[i].indexOf("/")));
                        tmp_quantity_needed = parseInt(lines[i].substring(lines[i].indexOf("/") + 1, lines[i].indexOf("🚫") - 1));
                        tmp_id = items_manager.getIdOf(tmp_name);
                        if (tmp_id > 0) {
                            //console.log("> "+tmp_name+" x"+(tmp_quantity_needed - tmp_quantity_has))
                            craft_array.push({ id: tmp_id, quantity: (tmp_quantity_needed - tmp_quantity_has) });
                            root_item_parsed_array.push({ id: tmp_id, name: tmp_name, quantity: (tmp_quantity_needed - tmp_quantity_has) });
                        }
                    }
                }
            } else if (type == "smuggler") {
                let tmp_split = toAnalyze_text.split("\n")[1].trim().split(" ");
                if (tmp_split[tmp_split.length - 1] == "Contrabbando") {
                    tmp_split = toAnalyze_text.split("\n")[3].trim().split(" ");
                }

                if (tmp_split.indexOf("✅") > 0) {
                    console.log("C'è la spunta");
                    tmp_split.pop();
                } else if (tmp_split[1].indexOf("x") == (tmp_split[1].length - 1)) {
                    console.log("C'è la quantità");
                    tmp_split.shift(); //tolgo "> ", dopo verra tolta la quantità. BIGHACKKKK!!!1!

                }

                tmp_split.pop(); //tolgo rarità
                console.log("> Ultimo elemento: " + tmp_split[tmp_split.length - 1]);
                tmp_split.shift(); //tolgo "> "

                let item_name = tmp_split.join(" ").toLowerCase();
                console.log(item_name);

                let item = items_manager.quick_itemFromName(
                    item_name,
                    false,
                    1,
                    null,
                    1);

                if (item != -1 && item.length > 0) {
                    let def_quantity = (typeof fixed_quantity != "undefined") ? fixed_quantity : 1;

                    craft_array.push({ id: item[0].id, quantity: def_quantity });
                    item[0].quantity = def_quantity;
                    console.log(toAnalyze_text);
                    console.log("Prendo: " + toAnalyze_text.split("\n")[4]);
                    let item_price = 0;
                    let message_split = toAnalyze_text.split("\n");
                    let price_index = -1;
                    for (let i = 0; i < message_split.length; i++) {
                        if (0 == message_split[i].indexOf("> Venderai a:")) {
                            price_index = i;
                            break;
                        }
                    }
                    if (price_index > 0) {
                        item_price = parseInt(message_split[price_index].split(" ")[3].split(".").join(""));
                    }

                    if (isNaN(item_price)) {
                        item_price = 0;
                    }
                    item[0].sell_price_string = formatNumber(item_price) + " §"; //toAnalyze_text.split("\n")[3].split(" ")[3] + " §";

                    root_item_parsed_array.push(item[0]);
                }
            }
        }
        console.log(craft_array);
        console.log(root_item_parsed_array);

        if (craft_array.length > 0) {
            return items_manager.getCraftList(craft_array, argo.info.id, true).then(function (craft_res) {
                if (!craft_res) {
                    res_text = "*Mumble...*_Non sono riuscito ad ottenere la linea craft!_\n\n> Oggetti trovati nel messaggio: " + craft_array.length;
                    return inoltroCraft_res({
                        text: res_text,
                        needed: -1,
                        used: -1
                    });
                } else {
                    return saveCraftListForUser(craft_res, argo.info.id).then(function (save_craft_res) {
                        if (!save_craft_res.esit) {
                            res_text = "*Woops...*\n";
                            res_text += "Errore salvando la lista craft!\n\nSolo nrc382 sa cosa sia successo.";
                            return inoltroCraft_res({
                                text: res_text,
                                needed: -1,
                                used: -1
                            });
                        } else {
                            if (type == "assalto") {
                                res_text = "🐺 *Craft per Assalto* \n";
                                res_text += craft_array.length == 1 ? "Un oggetto:\n\n" : craft_array.length + " oggetti:\n";

                            } else if (type == "smuggler") {
                                res_text = "👣 *Craft per Contrabbando*\n";
                            } else if (type == "festival") {
                                res_text = "🎉  *Craft per Festival*\n";
                            }

                            let first_item = {};
                            first_item.quantity = craft_res.craftable_array[0].total_quantity;
                            first_item.index = 0;

                            if (type == "smuggler" || type == "festival") {
                                let total_pc = root_item_parsed_array[0].craft_pnt;
                                console.log(root_item_parsed_array[0]);
                                res_text += "> ";
                                if (root_item_parsed_array[0].quantity > 1) {
                                    res_text += root_item_parsed_array[0].quantity + "x ";
                                    total_pc = total_pc * root_item_parsed_array[0].quantity;
                                }
                                res_text += root_item_parsed_array[0].name + " (" + root_item_parsed_array[0].rarity + ") ";
                                if (type == "festival") {
                                    res_text += "x" + craft_array[0].quantity;
                                }

                                res_text += "\n\n";
                                res_text += "· Linee craft: " + craft_res.needed_crafts + "\n";
                                res_text += "· PC: " + craft_res.total_pc + "\n";
                                res_text += "· Costo craft: " + parsePrice(craft_res.total_cost) + "\n";
                                if (autofiller) {
                                    res_text += "· Smerciabile a: " + root_item_parsed_array[0].sell_price_string + " \n";
                                } else {
                                    res_text += "· Venderai a: " + root_item_parsed_array[0].sell_price_string + " \n";
                                }
                                res_text += "\n\n";

                                res_text += "· Creati consumati: ";
                                if (craft_res.impact.crafted.length == 0) {
                                    res_text += "Nessuno!\n";
                                } else {
                                    res_text += craft_res.impact.crafted.length + "\n";
                                }
                                res_text += "· Base consumati: ";
                                if (craft_res.impact.base.length == 0) {
                                    res_text += "· Nessuno!\n";
                                } else {
                                    res_text += craft_res.impact.base.length + "\n";
                                }

                                res_text += "\n";
                                if (craft_res.missingItems_array.length == 0) {
                                    res_text += "· Hai tutto ✅\n";
                                } else {
                                    res_text += "· Base mancanti: " + craft_res.missingItems_array.length + "\n";
                                }


                            } else {
                                res_text += "\n· Linee craft: " + craft_res.needed_crafts + "\n";
                                res_text += "· PC: " + craft_res.total_pc + "\n";
                                res_text += "· Costo craft: " + parsePrice(craft_res.total_cost) + "\n";

                                for (let k = 0; k < root_item_parsed_array.length; k++) {
                                    res_text += "> " + root_item_parsed_array[k].name;
                                    res_text += " (" + root_item_parsed_array[k].quantity + ")";

                                    if (k < root_item_parsed_array.length - 1) {
                                        res_text += "\n";
                                    }
                                }
                            }
                            return inoltroCraft_res({
                                text: res_text,
                                root_items: craft_res.root_item,
                                needed: craft_res.missingItems_array.length,
                                used_c: craft_res.impact.crafted,
                                used_b: craft_res.impact.base.length
                            });

                        }
                    });
                }
            });
        } else {
            if (type == "assalto") {
                let toUpdate_array = [];
                let items_array = [];
                let lines = toAnalyze_text.split("\n");
                let tmp_name;
                let tmp_quantityLost;
                let tmp_quantityHas;

                for (let i = 1; i < lines.length; i++) {
                    let moji_index = lines[i].indexOf("✅");
                    if (moji_index > 0 && lines[i].charAt(0) == ">") {
                        tmp_name = lines[i].substring(2, lines[i].indexOf(" ("));
                        tmp_quantityLost = parseInt(lines[i].substring(lines[i].indexOf("/") + 1, moji_index).trim());
                        tmp_quantityHas = parseInt(lines[i].substring(lines[i].indexOf(") ") + 2, lines[i].indexOf("/")));

                        items_array.push({ name: tmp_name, quantityLost: tmp_quantityLost, quantityHas: tmp_quantityHas });
                        toUpdate_array.push([items_manager.getIdOf(tmp_name), argo.info.id, tmp_quantityHas]);
                    }
                }
                if (toUpdate_array.length <= 0) {
                    return inoltroCraft_res({ text: "*Sigh! :(*\nVolevo aggiornare lo zaino, ma non sono riuscito a riconoscere alcun'oggetto creato...", needed: -1, used: -1 });
                } else {
                    return zainoQuantityUpdate(toUpdate_array, "-").then(function (zaino_update) {
                        if (!zaino_update) {
                            res_text = "*Woops! :(*\n\nDovevo aggiornare lo zaino per " + toUpdate_array.length + " oggetti, ma ho fallito!";
                        } else {
                            res_text = "*Zaino Aggiornato!* 🎒\n";
                            res_text += "_per " + toUpdate_array.length + " oggetti_\n\n";
                            for (let i = 0; i < items_array.length; i++) {
                                res_text += "> " + items_array[i].quantityHas + "x " + items_array[i].name + " (" + items_array[i].quantityLost + ")\n";
                            }

                        }
                        return inoltroCraft_res({ text: res_text, complete: true, needed: -1, used: -1 });

                    });
                }
            } else {
                return inoltroCraft_res({ text: "*Sigh! :(*\nNon sono riuscito a riconoscere alcun'oggetto da craftare...", needed: -1, used: -1 });
            }
        }
    });
}

function manageCraftQuestion(question_array, argonaut_info, zaino_bool) {
    return new Promise(function (manageCraftQuestion_res) {
        let first_parse = parseCraftQuestion(question_array.join(" "));
        let toCraft_array_res = [];
        let tmp_parse;
        let tmp_item_array;
        let total_res = 0;
        let all_rarity = [];

        let flexible = false;

        let positives_expectations = true;
        let isAnWholeRarity = items_manager.all_rarity.indexOf(question_array[0].split(":")[0].toUpperCase()) >= 0 ? true : false;
        let fixed_limit = -1;
        let fixed_quantity;

        for (let i = 0; i < first_parse.length; i++) {
            tmp_parse = parseImputSearch(first_parse[i].partial_name.split(" "));
            fixed_limit = -1;


            if (tmp_parse.new_quantity == -1) {
                fixed_quantity = first_parse[i].quantity;
            } else {
                fixed_quantity = parseInt(tmp_parse.new_quantity);
            }
            console.log("fixed_quantity: "+fixed_quantity);

            if (tmp_parse.a_bunch == true) {
                flexible = true;
            }
            if (tmp_parse.imput_name.length == 0) {
                all_rarity.push(tmp_parse.rarity_index);
                isAnWholeRarity = true;
                if (tmp_parse.rarity_index == "E") {
                    fixed_limit = Math.min(first_parse[i].quantity, 10);
                } else if (tmp_parse.rarity_index == "L") {
                    fixed_limit = Math.min(first_parse[i].quantity, 15);
                } else if (tmp_parse.rarity_index == "NC") {
                    fixed_limit = Math.min(first_parse[i].quantity, 100);
                } else {
                    fixed_limit = Math.min(first_parse[i].quantity, 25);
                }
            }


            tmp_item_array = items_manager.quick_itemFromName(tmp_parse.imput_name, tmp_parse.rarity_index, tmp_parse.res_count, null, 1);

            tmp_item_ligth_array = [];

            if (tmp_item_array.length != 1) {
                positives_expectations = false;
            }

            for (let j = 0; j < tmp_item_array.length; j++) {
                if (tmp_item_array[j].name.indexOf("" + fixed_quantity) > 0) {
                    fixed_quantity = first_parse[i].quantity;
                }
                tmp_item_ligth_array.push({ id: tmp_item_array[j].id, name: tmp_item_array[j].name, rarity: tmp_item_array[j].rarity, quantity: fixed_quantity })
            }
            total_res += tmp_item_ligth_array.length;
            toCraft_array_res.push({ items: tmp_item_ligth_array, from: first_parse[i].partial_name, quantity_limit: fixed_limit });
        }

        console.log("In totale: " + total_res + " match!");

        if (total_res == 0) {
            return manageCraftQuestion_res({ esit: -1, total_match: total_res });
        } else if (!isAnWholeRarity && !positives_expectations && !flexible) {
            return manageCraftQuestion_res({ esit: -1, total_match: total_res, toCraft_array: toCraft_array_res });
        } else {
            let ids_array = [];
            console.log("> isAnWholeRarity? " + isAnWholeRarity);

            for (let i = 0; i < toCraft_array_res.length; i++) {
                for (let j = 0; j < toCraft_array_res[i].items.length; j++) {
                    ids_array.push({ id: toCraft_array_res[i].items[j].id, quantity: (toCraft_array_res[i].quantity_limit != -1 ? toCraft_array_res[i].quantity_limit : toCraft_array_res[i].items[j].quantity) });
                    // console.log("> quantity_limit-> " + toCraft_array_res[i].quantity_limit);
                    // console.log("> quantity-> " + toCraft_array_res[i].quantity);
                    // console.log("> SCELGO: il " + ((toCraft_array_res[i].quantity_limit != -1) ? "primo" : "secondo"));
                    // console.log("> Valori: ID = " + toCraft_array_res[i].items[j].id + " quantità = " + (toCraft_array_res[i].quantity_limit != -1 ? toCraft_array_res[i].quantity_limit : toCraft_array_res[i].items[j].quantity));
                }
                //console.log("> Sisteato '" + toCraft_array_res[i].from + "'. Il limite = " + toCraft_array_res[i].quantity_limit);
            }

            return items_manager.getCraftList(ids_array, argonaut_info.id, zaino_bool).then(function (craft_res) {
                let root_item_string_res = "";
                if (craft_res.root_item.length == 1) {
                    root_item_string_res = craft_res.root_item[0].name;
                    if (craft_res.root_item[0].quantity > 1) {
                        root_item_string_res += ", " + craft_res.root_item[0].quantity;
                    }
                } else {
                    if (craft_res.root_item.length < 4) {
                        for (let k = 0; k < craft_res.root_item.length; k++) {
                            root_item_string_res += craft_res.root_item[k].name;
                            if (craft_res.root_item[k].quantity > 1) {
                                root_item_string_res += " (" + craft_res.root_item[k].quantity + ")";
                            }
                            if (k < craft_res.root_item.length - 1) {
                                root_item_string_res += ", ";
                            }
                        }
                    } else {
                        root_item_string_res = craft_res.root_item.length + " oggetti";
                    }
                }

                return manageCraftQuestion_res({
                    esit: true,
                    wholeRarity: isAnWholeRarity,
                    rarity_array: all_rarity,
                    craft_list: craft_res,
                    root_item_string: root_item_string_res,
                    total_match: total_res
                });

            });
        }

    });
}

function parseCraftQuestion(craft_question) { //controlla ("!", "?", "quantità"). -> Restituisce una lista con (string, int)
    console.log("> Imput: " + craft_question);
    let items_names = craft_question.split(",");
    let tmp_quantity = 1;
    let tmp_split = [];
    let res_array = [];

    for (let i = 0; i < items_names.length; i++) {
        if (items_names[i].length > 0) {
            console.log("> Controllo: " + items_names[i]);
            tmp_quantity = 1;
            tmp_split = items_names[i].split(":");

            if (tmp_split.length > 1) {
                tmp_quantity = parseInt(tmp_split[1].split(" ")[0].split("!").join("").split("?").join());
                console.log("> Specifica una quantità: " + tmp_quantity)
                if (isNaN(tmp_quantity)) {
                    tmp_quantity = 1;
                }
                if (tmp_split[1].indexOf("!") >= 0) {
                    console.log("> Trovato preciso dopo i due punti!");
                    tmp_split[0] = tmp_split[0] + "!";
                    console.log("> tmp_split[0]: " + tmp_split[0]);
                } else if (tmp_split[1].indexOf("?") >= 0) {
                    console.log("> Trovato 'libero' dopo i due punti!");
                    tmp_split[0] = tmp_split[0] + "?";
                    console.log("> tmp_split[0]: " + tmp_split[0]);
                } else if (tmp_split[1].split(" ").length > 1) {
                    tmp_split[0] = tmp_split[0] + " " + tmp_split[1].split(" ").slice(1).join(" ");
                }
            } else {
                let all_words = items_names[i].split(" ");
                for (let j = 0; j< all_words.length; j++){
                    if (!isNaN(all_words[i])){
                        tmp_quantity = parseInt(all_words[i]);
                        break;
                    }
                }
            }

            res_array.push({ partial_name: tmp_split[0].trim(), quantity: tmp_quantity });
        }
    }
    return res_array;
}

function craftInlineFAQ() {
    let inline_result = {};
    inline_result.title = "Let's make...";
    inline_result.desc = "[scrivi qualcosa]\nConosco " + items_manager.getItemsCount().craftable + " creabili.";
    inline_result.to_send = "*Let's make,*\n";
    inline_result.to_send += "_Automatizza il processo di craft!_\n\n";
    inline_result.to_send += "Scrivi il nome (anche parziale) di un oggetto o di una rarità, puoi specificare:\n";
    inline_result.to_send += "> La quantità, dopo i _due punti_\n";
    inline_result.to_send += "> Più oggetti, separandoli da _virgole_\n";
    inline_result.to_send += "> Es: `crea crios:2, lama! L`\n";
    inline_result.to_send += "\nCreerò automaticamente la linea dei craft che potrai seguire inline nella chat con @lootgamebot\n";
    inline_result.to_send += "\n> Prova anche i comandi /craft, /crea e /necessari \n";
    return inline_result;
}

function infoInlineFAQ() {
    let inline_result = {};
    inline_result.title = "Cerchi qualcosa?";
    inline_result.desc = "Conosco " + items_manager.getItemsCount().all + " oggetti di Lootia";
    inline_result.desc += "\nPuoi filtrare per rarita, 'base' o 'creati' ";
    inline_result.to_send = "*Oggetti di Lootia*\n...ne conosco " + items_manager.getItemsCount().all + "\n";
    inline_result.to_send += "\nPuoi cercare nomi anche parziali ed includere una _Rarità_ per filtrare il risultato.\nProva anche il comando /cerca !";
    return inline_result;
}

function craftInlineProTips() {
    let inline_result = {};
    inline_result.title = "Controllo della linea craft";
    inline_result.desc = "Indietro / Salta: \"<\" / \">\"\nCambio quantità: \":[nuova]\"   ";
    inline_result.to_send = "*Let's make,*\n";
    inline_result.to_send += "_Automatizza il processo di craft!_\n\n";
    inline_result.to_send += "Puoi controllare la linea in corso:\n";
    inline_result.to_send += "> Modificando la quantità: \"*:*\[nuova\]\" \n";
    inline_result.to_send += "> Passando all'oggetto successivo: \"*>*\" \n";
    inline_result.to_send += "> Tornando all'oggetto precedente: \"*<*\"\n";
    inline_result.to_send += "\nPuoi segnalare la nuova quantità di oggetti nello zaino:\n> Dopo \"*>*\" o \"*<*\" scrivi la quantita aggiornata\n";

    return inline_result;
}

function proportionalIndexCalc(craftable_array, total_lines, curr_index, curr_leasting_quantity) {
    let proportion_index = 0;
    console.log("> chiesto indice per: (curr_index: " + curr_index + ", curr_leasting_quantity: " + curr_leasting_quantity + ")");

    //sommo proportional_index per tutti i precedenti
    for (let i = 0; i < curr_index; i++) {
        if (craftable_array[i].total_quantity > 3) {
            proportion_index += Math.floor(craftable_array[i].total_quantity / 3) + (craftable_array[i].total_quantity % 3);
        } else {
            proportion_index++;
        }
    }

    //aggiungo gli attuali
    let quantity_diff = (craftable_array[curr_index].total_quantity - curr_leasting_quantity);

    console.log("Linee fatte prima di curr_index: " + proportion_index);
    console.log("> Livello attuale: " + craftable_array[curr_index].total_quantity + "x " + craftable_array[curr_index].name);
    console.log("Quantity_Diff (Livello attuale, " + curr_index + "): " + quantity_diff);

    if (quantity_diff > 0) {
        proportion_index += Math.floor(quantity_diff / 3) + (quantity_diff % 3);
    }

    console.log("> proportion_index (Calcolato) " + proportion_index + "/" + total_lines);

    return proportion_index;
}

function manageFestival(toAnalyze, chat_id, user_id) {
    return new Promise(function (festival_res) {
        console.log("user_id: " + user_id);
        let item_name = toAnalyze.text.substring(toAnalyze.text.indexOf("oggetto ") + 8, toAnalyze.text.indexOf(" ("));
        let time_string = toAnalyze.text.substring(toAnalyze.text.indexOf("bile alle ") + 10, toAnalyze.text.indexOf(" con un"));
        let price_string = toAnalyze.text.substring(toAnalyze.text.indexOf("enza di ") + 8, toAnalyze.text.length - 2);

        let item = items_manager.quick_itemFromName(item_name)[0];
        return getQuantityOf([[item.childIds_array[0], user_id], [item.childIds_array[1], user_id], [item.childIds_array[2], user_id]]).then(function (quantity_infos) {
            let rarityName = "";
            switch (item.rarity) {
                case "C": {
                    rarityName += "Comune";
                    break;
                } case "NC": {
                    rarityName += "non Comune";
                    break;
                } case "R": {
                    rarityName += "Prezioso";
                    break;
                } case "UR": {
                    rarityName += "di Diamante";
                    break;
                } case "L": {
                    rarityName += "Leggendario";
                    break;
                } case "E": {
                    rarityName += "Epico";
                    break;
                } default: {
                    rarityName = "Ultra Epico!?";
                    break;
                }
            }
            let res_text = "🎉 *Festival " + rarityName + (!time_string.startsWith("01") ? "* delle " : "* dell'") + time_string + "\n";
            res_text += "\n• Per: " + item.name + " (" + item.rarity + ")";
            res_text += "\n• A: " + price_string;

            console.log(typeof (quantity_infos));
            console.log(quantity_infos);

            if (quantity_infos.length != 3) {
                res_text += "\n\n";
                res_text += "• Non puoi crearne copie rapide\n";
                res_text += "\nHai solo " + (quantity_infos.length == 1 ? "uno" : quantity_infos.length) + " degli oggetti necessari:\n";
                for (let i = 0; i < quantity_infos.length; i++) {
                    let tmp_item = items_manager.getItemFromId(quantity_infos[i].id);
                    res_text += "· " + quantity_infos[i].quantity + "x " + tmp_item.name + " (" + tmp_item.rarity + ")\n";
                }
            } else {
                res_text += "\n\n";

                let min_quantity = Math.min(quantity_infos[0].quantity, quantity_infos[1].quantity, quantity_infos[1].quantity);
                res_text += "• Copie creabili: " + min_quantity;
            }

            let craftable_childs = [];
            for (let i = 0; i < item.childIds_array.length; i++) {
                let tmp_item = items_manager.getItemFromId(item.childIds_array[i]);
                if (tmp_item.craftable == 1) {
                    craftable_childs.push(item.childIds_array[i]);
                }
            }
            console.log("craftable_childs: " + craftable_childs.length);
            console.log(craftable_childs);
            let toSend = simpleMessage(res_text, chat_id);
            if (craftable_childs.length > 0) {
                let buttons_array = [];
                buttons_array.push({ text: "×30", callback_data: 'ARGO:FESTIVAL:30:' + craftable_childs.join(":") + ":" + item.id });
                buttons_array.push({ text: "×90", callback_data: 'ARGO:FESTIVAL:90:' + craftable_childs.join(":") + ":" + item.id });
                buttons_array.push({ text: "×300", callback_data: 'ARGO:FESTIVAL:300:' + craftable_childs.join(":") + ":" + item.id });

                toSend.options.reply_markup = {};
                toSend.options.reply_markup.inline_keyboard = [buttons_array, [{ text: "Info", callback_data: 'ARGO:SMUGL:INFO:0' }]];
            }
            //buttons_array.push({ text: "Info", callback_data: 'ARGO:SMUGL:INFO' });


            return festival_res(toSend);
        });
    });
}
// 🛠 #CRAFT #ACCESSORIO
function loadCraftList(argonaut_id) {
    return new Promise(function (loadCraftList_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "../Al0bot/Sources/CraftLists/" + argonaut_id + ".json");

        fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                return loadCraftList_res({ craft_list: false });
            } else {
                let rawdata = fs.readFileSync(main_dir);
                return loadCraftList_res({ craft_list: JSON.parse(rawdata) });
            }
        });
    });
}

function deleteCraftList(argonaut_id) {
    return new Promise(function (deleteCraftList_res) {
        if (argonaut_id.length <= 0) {
            return deleteCraftList_res(true);
        }
        let main_dir = path.dirname(require.main.filename);
        console.log(main_dir);
        main_dir = path.join(main_dir, "../Al0bot/Sources/CraftLists/" + argonaut_id + ".json");

        fs.access(main_dir, fs.F_OK, function (err, stats) {
            console.log(stats);
            if (err) {
                console.log("File non trovato...");
                return deleteCraftList_res(-2);
            } else {
                return fs.unlink(main_dir, function (del_error) {
                    if (del_error) {
                        console.log(del_error);
                        return deleteCraftList_res(-1);
                    }


                    let query = "UPDATE " + model.tables_names.argonauti;
                    query += " SET is_crafting = 0 ";
                    query += " WHERE id = ?";
                    return model.argo_pool.query(query, [argonaut_id], function (err, db_res) {
                        if (err) {
                            console.error(err);
                        } else {
                            for (let i = 0; i < globalArgonauts.length; ++i) {
                                if (globalArgonauts[i].id == argonaut_id) {
                                    globalArgonauts[i].is_crafting = 0;
                                    break;
                                }
                            }
                            return deleteCraftList_res(true);
                        }
                    });
                });


            }
        });
    });
}
module.exports.deleteCraftList = deleteCraftList;

function saveCraftListForUser(craft_list, user_id) {
    return new Promise(function (saveCraftListForUser_res) {
        let data = JSON.stringify(craft_list, null, 2);
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "../Al0bot/Sources/CraftLists/" + user_id + ".json");

        let res_text = "";
        let res_esit = true;
        return fs.writeFile(main_dir, data, function (error) {
            if (error) {
                res_esit = false;
                res_text = "*Woops...*\n";
                res_text += "Errore salvando la lista craft!\n\nSolo nrc382 sa cosa sia successo.";
            }
            let query = "UPDATE " + model.tables_names.argonauti;
            query += " SET is_crafting = 1 ";
            query += " WHERE id = ?";
            return model.argo_pool.query(query, [user_id], function (err, db_res) {
                if (err) {
                    console.error(err);
                    res_esit = false;
                    res_text = "*Woops...*\n";
                    res_text += "Errore aggiornando i tuoi dati nel database!\n\nSolo nrc382 sa cosa sia successo.";
                } else {
                    for (let i = 0; i < globalArgonauts.length; ++i) {
                        if (globalArgonauts[i].id == user_id) {
                            globalArgonauts[i].is_crafting = 1;
                            break;
                        }
                    }
                    console.log("> Salvata la linea craft per " + user_id)
                    return saveCraftListForUser_res({ esit: res_esit, text: res_text });
                }
            });

        });
    });
}

function checkPreserveNeeds(craftableImpact_array, root_array) {
    console.log("> Controllo la necessita di \"preserve\" per: " + craftableImpact_array.length);
    console.log("> RootItems: " + root_array);

    for (let i = 0; i < craftableImpact_array.length; i++) {
        if (craftableImpact_array[i].remaning_quantity == 0) {
            let found = false;
            for (let j = 0; j < root_array.length; j++) {
                if ((craftableImpact_array[i].id == root_array[j].id) && (craftableImpact_array[i].used_quantity <= root_array[j].quantity)) {
                    found = true;
                    break;
                } else {
                    console.log("> IDs: " + craftableImpact_array[i].id + " e (root) " + root_array[j].id);
                    console.log("> Quantitys: " + craftableImpact_array[i].used_quantity + " e (root)" + root_array[j].quantity);
                }
            }
            if (found == false) {
                return true;
            }
        }
    }

    return false;
}

function recreateCraftListForUser(user_id, new_rootItems_array, zaino_bool, preserve_bool, pre_preserve) {
    console.log("> recreateCraftListForUser " + user_id + ", zaino_bool= " + zaino_bool);
    return new Promise(function (recreateCraftListForUser_res) {
        return loadCraftList(user_id).then(function (on_db) {
            if (on_db.craft_list == false) {
                return recreateCraftListForUser_res({ esit: false, text: "*Woops!*\n\nNon mi risulta tu stia seguendo una linea /craft" });
            } else {
                let new_root_array = [];
                if (pre_preserve == false) {
                    for (let i = 0; i < on_db.craft_list.root_item.length; i++) {
                        let found = false;
                        for (let new_index = 0; new_index < new_rootItems_array.length; new_index++) {
                            console.log("> il confronto: " + new_rootItems_array[new_index].id + " con " + on_db.craft_list.root_item[i].id);
                            if (new_rootItems_array[new_index].id == on_db.craft_list.root_item[i].id) {
                                found = true;
                                console.log("> Trovato: " + on_db.craft_list.root_item[i].name);
                                console.log("Nuova quantità: " + (on_db.craft_list.root_item[i].quantity - new_rootItems_array[new_index].quantity));
                                if ((on_db.craft_list.root_item[i].quantity - new_rootItems_array[new_index].quantity) > 0) {
                                    new_root_array.push({ id: on_db.craft_list.root_item[i].id, quantity: (on_db.craft_list.root_item[i].quantity - new_rootItems_array[new_index].quantity) });
                                }
                            }
                        }
                        if (!found) {
                            new_root_array.push({ id: on_db.craft_list.root_item[i].id, quantity: on_db.craft_list.root_item[i].quantity });
                        }
                    }
                    if (preserve_bool == true) {
                        for (let i = 0; i < on_db.craft_list.impact.crafted.length; i++) {
                            if (on_db.craft_list.impact.crafted[i].remaning_quantity <= 1) {
                                new_root_array.push({ id: on_db.craft_list.impact.crafted[i].id, quantity: on_db.craft_list.impact.crafted[i].used_quantity });
                            }
                        }
                    }

                } else {
                    for (let i = 0; i < on_db.craft_list.impact.crafted.length; i++) {
                        if (on_db.craft_list.impact.crafted[i].remaning_quantity <= 1) {
                            new_root_array.push({ id: on_db.craft_list.impact.crafted[i].id, quantity: on_db.craft_list.impact.crafted[i].used_quantity });
                        }
                    }
                }
                if (new_root_array.length == 0) {
                    return recreateCraftListForUser_res({
                        esit: true,
                        isEnded: true
                    });
                }

                return items_manager.getCraftList(new_root_array, user_id, true, zaino_bool).then(function (craft_res) {
                    return saveCraftListForUser(craft_res, user_id).then(function (save_res) {
                        if (save_res.esit == true) {
                            save_res.text = getCurrCraftDetails(craft_res, user_id, true, true);
                            save_res.isEnded = false;
                            save_res.missingItems_array = craft_res.missingItems_array.length;
                            save_res.usedB_array = craft_res.impact.base.length;
                            save_res.usedC_array = craft_res.impact.crafted;
                            save_res.root_items = craft_res.root_item;
                        }
                        return recreateCraftListForUser_res(save_res);
                    });
                });
            }
        });
    });
}

function manageInlineCraft(argonaut, query_id, question_array) {
    return new Promise(function (manageInlineCraft_res) {
        let inline_result = {};
        let res_array = [];
        console.log("> manageInlineCraft per [" + question_array.join(", ") + "]");
        console.log(question_array.length);

        if (question_array[1] == "svuota") {
            return deleteCraftList(argonaut.info.id).then(function (del_res) {
                if (typeof del_res == "number") {
                    inline_result.title = "Mumble!";
                    if (del_res == -2) {
                        inline_result.desc = "Non mi risulta tu stia seguendo una linea craft...";
                    } else {
                        inline_result.desc = "Non sono riuscito ad eliminare il craft: " + argonaut.info.id + ".json!";
                    }
                } else {
                    inline_result.title = "Linea craft pulita";
                    inline_result.desc = "Grazie d'aver craftato con Al0-inline!";
                }
                inline_result.to_send = inline_result.desc;
                res_array = parseInlineResult(argonaut.info.id, query_id, "crafting", res_array, inline_result);

                return manageInlineCraft_res(res_array);
            });
        } else if (question_array[1] == "linea") {
            if (question_array.length >= 3 && question_array[2] == "conclusa") {

                if (argonaut.info.is_crafting == 0) {
                    inline_result.title = "Woops!";
                    inline_result.desc = "Non mi risulta tu stia seguendo una linea di craft...";
                    inline_result.to_send = "Torna al Menu";
                    res_array = parseInlineResult(argonaut.info.id, query_id, "error", res_array, inline_result);
                } else {
                    let res = {};
                    let calc_id = "🎒:" + query_id + ":";

                    res = { // Aggiorna zaino
                        type: "sticker",
                        id: (calc_id + "ZAINO_UPDATE"),
                        sticker_file_id: "CAACAgIAAxkBAAEBz29e3g58Naxr8rRFWZtjgHOoLpqxpAACbAADotsCAS5AnC--czC-GgQ",
                        input_message_content: {
                            message_text: "Torna al Menu",
                            disable_web_page_preview: true,
                            parse_mode: "Markdown"
                        }
                    };
                    res_array.push(res);

                    res = { // Vendi al Contrabbando
                        type: "sticker",
                        id: (calc_id + "SMUGGLER_UPDATE"),
                        sticker_file_id: "CAACAgIAAxkBAAEBz3Je3g8gVA69PNIXl0HXFwrCAaR1_gACbQADotsCARBik4fcEfA8GgQ",
                        input_message_content: {
                            message_text: "Contrabbandiere dell'Est 👣",
                            disable_web_page_preview: true,
                            parse_mode: "Markdown"
                        }
                    };
                    res_array.push(res);

                    res = { // Assalto
                        type: "sticker",
                        id: (calc_id + "ASSALTO_UPDATE"),
                        sticker_file_id: "CAACAgIAAxkBAAEBz3Ne3g80GKJHZmX6D6Ufgh1oW0m6ogACbgADotsCAXxus-ZDZFoNGgQ",
                        input_message_content: {
                            message_text: "Assalto 🐺",
                            disable_web_page_preview: true,
                            parse_mode: "Markdown"
                        }
                    };
                    res_array.push(res);
                }

                return manageInlineCraft_res(res_array);
            }

            return manageCurrentCraft(argonaut.info, query_id, question_array).then(function (inline_craft_queryRes) {
                return manageInlineCraft_res(inline_craft_queryRes);
            });
        } else if (question_array.slice(1).join(" ").length <= 2) {
            let to_check = question_array.slice(1).join(" ").toUpperCase();
            let is_rarity = false;
            for (let i = 0; i < items_manager.all_rarity.length; i++) {
                if (items_manager.all_rarity[i] == to_check) {
                    is_rarity = true;
                    break;
                }
            }
            if (!is_rarity) {
                console.log("> Domanda corta...");
                inline_result = craftInlineFAQ();
                res_array = parseInlineResult(argonaut.info.id, query_id, "info", res_array, inline_result);
                return manageInlineCraft_res(res_array);
            }
        }


        // Nuovo Craft 

        let zaino_bool = !(question_array[0] == "c0" || question_array[0] == "cc");
        if (zaino_bool) {
            zaino_bool = question_array.join(" ").match(" no zaino") ? false : true;
            if (!zaino_bool) {
                question_array = question_array.filter(function (val) {
                    return (val != "no" && val != "zaino");
                });
            }
        }

        question_array.shift();
        let escape_index = -1;
        for (let i = 0; i < question_array.length; i++) {
            if (question_array[i].indexOf("+") >= 0) {
                escape_index = i;
            }
        }

        console.log("> escape_index: " + escape_index)
        if (question_array[question_array.length - 1].charAt(question_array[question_array.length - 1].length - 1) == "+") {
            question_array[question_array.length - 1] = question_array[question_array.length - 1].slice(0, -1);
            escape_index = question_array.length;
            console.log("> Tolgo l'escape_index (nascosto): " + escape_index);

        } else if (escape_index >= 0) {
            console.log("> Tolgo l'escape_index: " + question_array[escape_index] + "indice " + escape_index);
            question_array.splice(escape_index, 1);
        }
        console.log("> Input: `" + question_array.join("-"));


        return manageCraftQuestion(question_array, argonaut.info, zaino_bool).then(function (craft_question) {
            if (craft_question.esit != true) {
                if (craft_question.total_match == 0) {
                    inline_result.title = capitalizeArray(question_array).join(" ") + "??";
                    inline_result.desc = "Non mi sembra sia creabile...";
                    inline_result.to_send = "*Ricerca di oggetti*\n_...durante il craft_\n\n> Specifica il nome, anche parziale.\n";
                    inline_result.to_send += "> La _virgola_ è usata per separare diversi oggetti\n";
                    inline_result.to_send += "> I _due punti_ sono usati per specificare una quantità diversa da 1";
                    inline_result.to_send += "> Il _punto esclamativo_ forza il primo risultato";

                    res_array = parseInlineResult(argonaut.info.id, query_id, "crafting", res_array, inline_result);
                    return manageInlineCraft_res(res_array);
                } else {
                    if (craft_question.total_match < craft_question.toCraft_array.length) {
                        inline_result.title = "😱 Troppi pochi risultati! (" + craft_question.total_match + ")";
                    } else {
                        inline_result.title = "Troppi risultati! (" + craft_question.total_match + ")";
                    }
                    inline_result.desc = "Prova ad essere piu specifico\n";
                    inline_result.desc += "Puoi usare \"!\" per forzare il primo risultato";

                    inline_result.to_send = "*Craft inline*\n\n";
                    inline_result.to_send += "> Input: `" + question_array.join(" ") + "`\n\n*Risultati:*\n";
                    for (let j = 0; j < craft_question.toCraft_array.length; j++) {
                        if (craft_question.toCraft_array.length > 1) {
                            inline_result.to_send += "\n➟ *" + craft_question.toCraft_array[j].from + "* (" + craft_question.toCraft_array[j].items.length + ")\n";
                        }
                        for (let k = 0; k < craft_question.toCraft_array[j].items.length; k++) {
                            inline_result.to_send += "> " + craft_question.toCraft_array[j].items[k].name + " (" + craft_question.toCraft_array[j].items[k].rarity + ")\n";
                        }
                    }
                    res_array = parseInlineResult(argonaut.info.id, query_id, "crafting", res_array, inline_result);

                    return manageInlineCraft_res(res_array);
                }

            } else {
                console.log("> ok, procedo..");
                if (escape_index >= 0) {
                    return saveCraftListForUser(craft_question.craft_list, argonaut.info.id).then(function (save_esit) {
                        console.log("> Salvate info per: " + argonaut.info.nick + " " + save_esit);
                        if (save_esit) {

                            console.log("> .wholeRarity-> " + craft_question.wholeRarity);

                            if (craft_question.wholeRarity) {
                                if (craft_question.rarity_array.length == 1) {
                                    inline_result.title = "Tutta la Rarità " + craft_question.rarity_array[0];
                                } else {
                                    inline_result.title = "Oggetti per " + craft_question.rarity_array.length + " rarità ";
                                }
                            } else if (craft_question.craft_list.root_item.length == 1) {
                                inline_result.title = craft_question.craft_list.root_item[0].name;
                            } else {
                                inline_result.title = craft_question.craft_list.root_item.length + " oggetti";
                            }


                            let total_quantity = 0;
                            for (let i = 0; i < craft_question.craft_list.root_item.length; i++) {
                                total_quantity += craft_question.craft_list.root_item[i].quantity;
                            }

                            inline_result.title += ", " + (total_quantity == 1 ? "Una copia" : total_quantity + " copie");

                            inline_result.desc = craft_question.craft_list.needed_crafts + (craft_question.craft_list.needed_crafts == 1 ? " linea" : " linee") + "\nTap per i dettagli\n";
                            inline_result.to_send = getCurrCraftDetails(craft_question.craft_list, argonaut.info);

                            res_array = parseInlineResult(argonaut.info.id, query_id, "crafting", res_array, inline_result);

                            // let has_craftedImpact = false;
                            // for (let i = 0; i < craft_question.craft_list.impact.crafted.length; i++) {
                            //     if (craft_question.craft_list.impact.crafted[i].remaning_quantity == 0) {
                            //         has_craftedImpact = true;
                            //         break;
                            //     }
                            // }
                            //giveDetailBotton(res_array[0], craft_question.craft_list.missingItems_array.length, craft_question.craft_list.impact.base.length, craft_question.craft_list.impact.crafted.length, has_craftedImpact);
                        } else {
                            inline_result.title = "Woops!";
                            inline_result.desc = "\nErrore aggiornando i tuoi dati sul database!";
                            inline_result.to_send = inline_result.desc;
                            res_array = parseInlineResult(argonaut.info.id, query_id, "error", res_array, inline_result);
                        }
                        return manageInlineCraft_res(res_array);


                    });
                } else {
                    if (craft_question.wholeRarity) {
                        if (craft_question.rarity_array.length == 1) {
                            inline_result.title = "Tutta la Rarità " + craft_question.rarity_array[0];
                        } else {
                            inline_result.title = craft_question.rarity_array.length + " rarità ";
                            if (craft_question.rarity_array.length <= 4) {
                                inline_result.title += "(" + craft_question.rarity_array.join(", ") + ")";
                            }
                        }
                    } else if (craft_question.craft_list.root_item.length > 3) {
                        inline_result.title = craft_question.craft_list.root_item.length + (craft_question.craft_list.root_item.length == 1 ? " oggetto" : " oggetti");
                        let total_quantity = 0;
                        for (let i = 0; i < craft_question.craft_list.root_item.length; i++) {
                            total_quantity += craft_question.craft_list.root_item[i].quantity;
                        }
                        inline_result.title += " " + (total_quantity == 1 ? "ed una copia?" : "e " + total_quantity + " copie?");

                    } else {
                        inline_result.title = craft_question.root_item_string + "?";
                    }
                    inline_result.desc = craft_question.craft_list.needed_crafts + " craft";
                    inline_result.desc += (craft_question.craft_list.needed_crafts > 1 ? " necessari" : " necessario");
                    if (!zaino_bool) {
                        inline_result.desc += " (completa)";
                    }
                    inline_result.desc += "\nScrivi \"+\" per confermare \n";
                    inline_result.to_send = getCurrCraftDetails(craft_question.craft_list, argonaut.info, true);
                    res_array = parseInlineResult(argonaut.info.id, query_id, "crafting", res_array, inline_result);

                    return manageInlineCraft_res(res_array);
                }
            }
        });

    });
}

function manageCurrentCraft(argonaut_info, query_id, question_array) {
    console.log("> manageCurrentCraft per: " + argonaut_info.id);
    let static_infos = "ⓘ *Craft Inline*\n\nPer la navigazione manuale lungo una linea craft, usa la sintassi:\n> `linea n_linea, quantità_rimanente`\n\n(La _quantità rimanente_ è opzionale. Puoi usare \"l\" al posto di \"linea\", ed anche questo è opzionale)";

    return new Promise(function (manageCurrentCraft_res) {
        let inline_result = {};
        let res_array = [];
        let curr_line_index = parseInt(question_array[2]);

        if (isNaN(curr_line_index)) { //return (...)
            inline_result.title = "🤔 Mumble...";
            inline_result.desc = "Cerchi di navigare lungo la linea craft?";
            inline_result.to_send = static_infos;
            res_array = parseInlineResult(argonaut_info.id, query_id, "error", res_array, inline_result);
            return manageCurrentCraft_res(res_array);
        } else {
            if (curr_line_index > 0) {
                curr_line_index--;
            } else {
                curr_line_index = 0;
            }
        }

        return loadCraftList(argonaut_info.id).then(function (argo_on_disk) {
            if (argo_on_disk.craft_list == false) { //return (...)
                inline_result = craftInlineFAQ();
                inline_result.title = "Inline Craft";
                inline_result.desc = "Non mi risulta tu stia seguendo una linea...";

                res_array = parseInlineResult(argonaut_info.id, query_id, "crafting", res_array, inline_result);
                return manageCurrentCraft_res(res_array);
            } else if (curr_line_index >= argo_on_disk.craft_list.craftable_array.length) { //return (...)
                inline_result.title = "Woops!";
                inline_result.desc = "Che strano...";
                inline_result.to_send = "Non dovrebbero esserci più di ";
                if (argo_on_disk.craft_list.craftable_array.length == 1) {
                    inline_result.to_send += "una linea per il craft che stai seguendo."
                } else {
                    inline_result.to_send += argo_on_disk.craft_list.craftable_array.length + " linee per il craft che stai seguendo."

                }
                res_array = parseInlineResult(argonaut_info.id, query_id, "error", res_array, inline_result);
                res_array[0].reply_markup = {
                    inline_keyboard: [[
                        {
                            text: "Svuota",
                            switch_inline_query_current_chat: "craft svuota"
                        },
                        {
                            text: "Conclusa",
                            switch_inline_query_current_chat: "linea conclusa"
                        }
                    ]]
                }
                return manageCurrentCraft_res(res_array);
            }

            console.log("> next_line_index: " + curr_line_index);

            let remaning_quantity = question_array.join(" ").split(",");
            let curr_total_quantity = parseInt(argo_on_disk.craft_list.craftable_array[curr_line_index].total_quantity);
            if (remaning_quantity.length == 2 && remaning_quantity[1].length > 0) {
                remaning_quantity = parseInt(remaning_quantity[1]);
            } else {
                remaning_quantity = curr_total_quantity;
            }
            console.log("> Craft corrente: " + argo_on_disk.craft_list.craftable_array[curr_line_index].name);
            console.log("> remaning_quantity: " + remaning_quantity);

            if (isNaN(remaning_quantity)) { //return (...)
                inline_result.title = "🤔 Mumble...";
                inline_result.desc = "Non capisco cosa intendi";
                inline_result.to_send = static_infos;
                res_array = parseInlineResult(argonaut_info.id, query_id, "error", res_array, inline_result);
                return manageCurrentCraft_res(res_array);
            } else if (remaning_quantity <= 0 || remaning_quantity > curr_total_quantity) { //return (...)
                inline_result.title = "Mi spiace";
                inline_result.desc = "Non supporto ancora un imput di questo tipo...";
                inline_result.to_send = static_infos;
                res_array = parseInlineResult(argonaut_info.id, query_id, "error", res_array, inline_result);
                return manageCurrentCraft_res(res_array);
            }
            let to_craft_quantity = 3;
            if (remaning_quantity < 3) {
                to_craft_quantity = remaning_quantity;
            }

            let proportion_index = proportionalIndexCalc(argo_on_disk.craft_list.craftable_array, argo_on_disk.craft_list.needed_crafts, curr_line_index, remaning_quantity);
            let proportion = Math.floor((100 * proportion_index) / argo_on_disk.craft_list.needed_crafts);

            inline_result.title = to_craft_quantity + "x " + argo_on_disk.craft_list.craftable_array[curr_line_index].name;
            //inline_result.title = argo_on_disk.craft_list.craftable_array[curr_line_index].name + " (" + argo_on_disk.craft_list.craftable_array[curr_line_index].total_quantity + ")";

            let buttons_array = [];
            let next_line_index = { index: 0, remaining: 0 };
            //inline_result.to_send = "*Craft per Linea*\n";
            inline_result.to_send = "`Crea " + argo_on_disk.craft_list.craftable_array[curr_line_index].name + ", " + to_craft_quantity + "`\n\n";
            inline_result.to_send += "📦 *Sul Craft in corso:*\n";
            inline_result.to_send += (proportion < 100 ? ("• Linea: " + (curr_line_index + 1) + "/" + argo_on_disk.craft_list.craftable_array.length + " (" + proportion + "%)") : "• Ultimo craft! ⭐");
            inline_result.to_send += "\n• Copie da creare: *" + argo_on_disk.craft_list.craftable_array[curr_line_index].total_quantity + "*";
            if ((remaning_quantity - to_craft_quantity) > 0) {
                inline_result.to_send += "\n• Ancora: " + (remaning_quantity - to_craft_quantity) + "\n";
            } else {
                inline_result.to_send += "\n• Ultimo " + to_craft_quantity + "x\n";
            }
            if (argo_on_disk.craft_list.craftable_array[curr_line_index].total_quantity > 3) {
                inline_result.to_send += "• Craft necessari: (" + Math.floor(argo_on_disk.craft_list.craftable_array[curr_line_index].total_quantity / 3) + ")3x";
                if ((argo_on_disk.craft_list.craftable_array[curr_line_index].total_quantity % 3) != 0) {
                    inline_result.to_send += " + " + (argo_on_disk.craft_list.craftable_array[curr_line_index].total_quantity % 3) + "x\n";
                }
            }

            if (remaning_quantity > to_craft_quantity) {
                inline_result.desc = "Ancora: " + (remaning_quantity - to_craft_quantity);
                buttons_array.push([{
                    text: "Prossimo",
                    //callback_data: "ARGO:prova:prova",
                    switch_inline_query_current_chat: "\nLinea " + (curr_line_index + 1) + ", " + (remaning_quantity - to_craft_quantity)
                }]);
                next_line_index.index = curr_line_index;
                next_line_index.remaining = (remaning_quantity - to_craft_quantity);

            } else {
                if ((curr_line_index + 1) >= argo_on_disk.craft_list.craftable_array.length) {
                    inline_result.desc = "Ultimo craft ";
                    //proportion = 100;
                    next_line_index.index = 0;
                    next_line_index.remaining = 0;

                    buttons_array.push([{
                        text: "Linea Conclusa",
                        //callback_data: "ARGO:prova:fine",
                        switch_inline_query_current_chat: "\nLinea conclusa"
                    }])
                } else {
                    next_line_index.index = curr_line_index + 1;
                    next_line_index.remaining = argo_on_disk.craft_list.craftable_array[curr_line_index + 1].total_quantity;
                    inline_result.to_send += "> Prossimo: `" + argo_on_disk.craft_list.craftable_array[curr_line_index + 1].name + "`\n";
                    inline_result.desc = "Prossimo: " + argo_on_disk.craft_list.craftable_array[curr_line_index + 1].name;
                    buttons_array.push([{
                        text: "Prossimo",
                        //callback_data: "ARGO:prova:next",
                        switch_inline_query_current_chat: "\nLinea " + (curr_line_index + 2)
                    }]);

                }
            }

            inline_result.desc += (proportion < 100 ? ("\nCompletato: " + proportion + "%") : "⭐")
            res_array = parseInlineResult(argonaut_info.id, query_id, "crafting", res_array, inline_result, true, buttons_array);
            return manageCurrentCraft_res(res_array);

        });
    });
}

async function simpleQuantityUpdate(line, argo, res, message, argo_resolve) {
    let quantity = 1;
    let start = line.indexOf("x");
    let partial_start = line.indexOf("hai creato ") + "hai creato ".length;

    if (start > 0) {
        quantity = parseInt(line.substring(partial_start, start));
        start += 2;
        console.log("> Quantità trovata: " + quantity);
    } else {
        start = partial_start;
    }
    let limit = line.indexOf(" (");
    if (limit < 0) {
        limit = line.indexOf(" ed");
    }
    let item = items_manager.quick_itemFromName(line.substring(start, limit), false, 1)[0];
    let zaino_quantity = line.substring(line.indexOf("ne possiedi ") + 12, line.indexOf(")"));

    let childs = [];
    if (typeof item.is_needed_for != undefined && item.is_needed_for != null && item.is_needed_for.length > 2) {
        childs = item.is_needed_for.substring(1, item.is_needed_for.length - 1).split(":");
    }
    console.log("> Figli per " + item.name + " " + childs.length);
    console.log(childs);


    let toCheck_array = [[item.id, argo.info.id]];
    for (let i = 0; i < childs.length; i++) {
        toCheck_array.push([parseInt(childs[i]), argo.info.id]);
    }
    //return recreateCraftListForUser(argo.info.id, [{ id: item.id, quantity: zaino_quantity }], true).then(function (recreate_res) {
    console.log("> Oggetti richiesti: " + toCheck_array.length);
    const items_quantity = await getQuantityOf(toCheck_array);
    let toUpdate_childsArray = [];
    let toDelete_childsArray = [];
    let parsed_array = [];
    let root_item = {
        id: item.id,
        new_quantity: parseInt(zaino_quantity),
        old_quantity: 0
    };
    let newQuantity_forChild = 0;
    if (items_quantity != false) {
        console.log("> Oggetti presenti nello zaino: " + (items_quantity.length) + ", figli: " + (items_quantity.length - 1));
        console.log(items_quantity);

        //Aggiorno old_quantity di root item
        for (let i_1 = 0; i_1 < items_quantity.length; i_1++) {
            if (root_item.old_quantity == 0 && items_quantity[i_1].id == item.id) {
                found = true;
                root_item.old_quantity = items_quantity[i_1].quantity;
                console.log("> RootItem nello zaino: " + root_item.old_quantity);
                break;
            }
        }
        newQuantity_forChild = root_item.new_quantity - root_item.old_quantity;

        if (newQuantity_forChild > 0) {
            for (let j = 0; j < childs.length; j++) {
                let found = false;
                for (let i_2 = 0; i_2 < items_quantity.length; i_2++) {
                    if (items_quantity[i_2].id == item.id) {
                        found = true;
                    } else if (childs[j] == items_quantity[i_2].id) {
                        found = true;
                        if ((items_quantity[i_2].quantity <= newQuantity_forChild)) {
                            toDelete_childsArray.push([childs[j], argo.info.id]);
                        } else {
                            toUpdate_childsArray.push([childs[j], argo.info.id, (newQuantity_forChild)]);
                            parsed_array.push(items_quantity[i_2]);
                        }

                        break;
                    }
                }
                if (!found) {
                    console.log("> Non è presente nello zaino: " + childs[j]);
                    toDelete_childsArray.push([childs[j], argo.info.id]);
                }
            }
        }
        // controllo old e new quantity per childs
        console.log("> Oggetti da aggiornare: " + toUpdate_childsArray.length);
        console.log(toUpdate_childsArray);
        console.log("> Oggetti da eliminare: " + toDelete_childsArray.length);
        console.log(toDelete_childsArray);

    } else {
        console.log("> Sembra non abbia nulla nello zaino, ergo nulla da ridurre ne da eliminare (aggiornerò solo il root item)");
    }
    if (root_item.new_quantity == root_item.old_quantity) {
        console.log("> Non serve aggiornare! ");
        toUpdate_childsArray = [];
        toDelete_childsArray = [];
    }
    const delete_res = await zainoDeleteItems(toDelete_childsArray);
    const reduce_res = await zainoQuantityUpdate(toUpdate_childsArray, "-");
    const update_res = await zainoQuantityUpdate([[item.id, argo.info.id, root_item.new_quantity]]);
    let res_text;
    if (typeof item.name != "undefined") {
        if (root_item.old_quantity == root_item.new_quantity) {
            res_text = "*Zaino Confermato!* 💪\n\n";
            res_text += "Come immaginavo, hai:\n> " + root_item.new_quantity + "x " + item.name + "";
            res.toSend = simpleDeletableMessage(message.chat.id, true, res_text);
        } else {
            res_text = "*Zaino Aggiornato!* 🎒\n";
            if (root_item.old_quantity > root_item.new_quantity) {
                res_text += "_Figurati, pensavo ne avessi di piu!_\n\n· Hai:\n";
                res_text += "> " + root_item.new_quantity + "x " + item.name + " (" + (newQuantity_forChild) + ")\n";

            } else {
                res_text += "\n· Hai creato:\n";
                res_text += "> " + newQuantity_forChild + "x " + item.name + " (" + (root_item.new_quantity) + ")\n";
                res_text += "\n 📦 PC *" + (newQuantity_forChild * item.craft_pnt) + "*\n";
            }
            res_text += "\n· Consumando " + newQuantity_forChild + "x di:\n";
            for (let i_3 = 0; i_3 < parsed_array.length; i_3++) {
                let tmp_item = items_manager.getItemFromId(parsed_array[i_3].id);
                res_text += "- " + tmp_item.name + " (" + (parsed_array[i_3].quantity - newQuantity_forChild) + ")\n";
            }
            if (toDelete_childsArray.length > 0) {
                res_text += "\n· Non hai piu:\n";
                for (let i_4 = 0; i_4 < toDelete_childsArray.length; i_4++) {
                    let tmp_item_1 = items_manager.getItemFromId(toDelete_childsArray[i_4][0]);
                    res_text += "- " + tmp_item_1.name + "\n"; //" (" + (toDelete_childsArray[i][2]) + ")\n";
                }
            }

            if (newQuantity_forChild <= 0) {
                res_text += "\n`NOTA:`\n Dovresti aggiornare lo zaino che conosco...";
            }
            res.toSend = simpleDeletableMessage(message.chat.id, true, res_text);

            if (argo.info.is_crafting == 1) {
                res.toSend.options.reply_markup.inline_keyboard.unshift([
                    {
                        text: "Aggiorna Linea ↺",
                        callback_data: "ARGO:CRAFT:RECREATE:" + item.id + ":" + zaino_quantity
                    }
                ]);
            }



        }
        //res_text += "Ecco una stringa per il negozio a valore medio di mercato.\n_(è una vecchia funzione... se la usi, ricordati di ri-aggiornare poi lo zaino!)_\n\n\n`/negozio " + item.name + ":" + item.market_medium_value + ":" + quantity + "`";
    } else {
        res_text = "*Whoops!*\nChe strano...\n\nNon sono riuscito a riconoscere nessun oggetto da: `" + line.substring(start, limit) + "`";
        res.toSend = simpleDeletableMessage(message.chat.id, true, res_text);
    }
    return argo_resolve(res);
}



function manageBrokenCraftLine(argonaut, object_list, asked_quantity, toUpdateItems) {
    return new Promise(async function (manageBrokenCraftLine_res) {
        let objectsIds = [];
        let avaible_itemsArray = [];
        let toDelete_itemsArray = [];

        if (object_list != false) {
            for (let i = 0; i < object_list.length; i++) {
                let tmp = items_manager.quick_itemFromName(object_list[i].name, false, 1, null, true);
                if (tmp.length > 0) {
                    objectsIds.push("" + tmp[0].id);
                    if (object_list[i].avaible_quantity > 0) {
                        avaible_itemsArray.push([tmp[0].id, argonaut.info.id, object_list[i].avaible_quantity]);
                    } else {
                        toDelete_itemsArray.push([tmp[0].id, argonaut.info.id]);
                    }
                }
            }
        }

        if (toUpdateItems.length > 0) {
            console.log("> Inserisco gli oggetti che già ha");
            for (let i = 0; i < toUpdateItems.length; i++) {
                let tmp = items_manager.quick_itemFromName(toUpdateItems[i].name, false, 1, null, true);
                objectsIds.push("" + tmp[0].id);

                if (toUpdateItems[i].avaible_quantity > 0) {
                    avaible_itemsArray.push([tmp[0].id, argonaut.info.id, toUpdateItems[i].avaible_quantity]);
                } else {
                    console.log("> Questa è strana:\n");
                    console.log(tmp);
                    toDelete_itemsArray.push([tmp[0].id, argonaut.info.id]);
                }
            }

        }
        // Prima cosa: riaggiorno lo zaino con le nuove avaible_quantity
        // elimino gli oggetti con avaible_quantity > 0
        if (toDelete_itemsArray.length > 0) {
            const del_res = await zainoDeleteItems(toDelete_itemsArray);
        }
        if (avaible_itemsArray.length > 0) {
            const update_res = await zainoQuantityUpdate(avaible_itemsArray);
        }

        if (object_list != false && object_list.length <= 0) { // solo aggiornamento
            let res_text = "";

            if (toUpdateItems.length <= 0) {
                res_text += "*🥴 *Woops!*\n* Non sono riuscito a capire quali oggetti hai... che edo abbia ri-cambiato il layout?";

            } else {
                res_text += "*Zaino Aggiornato* 🎒\n\n";
                let tmp_name;
                for (let i_2 = 0; i_2 < toUpdateItems.length; i_2++) {
                    tmp_name = capitalizeArray(toUpdateItems[i_2].name.split(" ")).join(" ");
                    res_text += "> " + tmp_name + " (" + (toUpdateItems[i_2].avaible_quantity) + ")\n";
                }

                res_text += "\n_Non fa mai male confermare le quantità possedute!_";
            }

            return manageBrokenCraftLine_res({
                text: res_text,
                objects_ids: objectsIds,
                editable: false
            });
        }
        const on_disk = await loadCraftList(argonaut.info.id);
        let line = "*Craft Aid* 🧯\n";
        if (on_disk.craft_list) {
            // Scorro craftable_array finche non trovo l'oggetto target (childs_array è == a oggetti necessari)
            // fino a quel momento: (aggiungo tutti gli oggetti creati ad un "done_array")
            // aggiorno lo zaino per: done_array (con quantità +=) e oggetto_target (con quantità quella letta)
            // ricreo la linea craft per lo stesso array di root_item
            let done_array = [];
            let curr_index = -1;
            for (let i_3 = 0; i_3 < on_disk.craft_list.craftable_array.length; i_3++) {
                if (on_disk.craft_list.craftable_array[i_3].childs_array.length == 3) {
                    console.log("> Per: " + on_disk.craft_list.craftable_array[i_3].name + ", " + on_disk.craft_list.craftable_array[i_3].id);
                    console.log("> Devo confrontare: " + on_disk.craft_list.craftable_array[i_3].childs_array[0] + ", " + on_disk.craft_list.craftable_array[i_3].childs_array[1] + ", " + on_disk.craft_list.craftable_array[i_3].childs_array[2] + "");
                    console.log("> Con: " + objectsIds[0] + ", " + objectsIds[1] + ", " + objectsIds[2] + "");
                    let cond1 = objectsIds.indexOf(on_disk.craft_list.craftable_array[i_3].childs_array[0]) >= 0;
                    let cond2 = objectsIds.indexOf(on_disk.craft_list.craftable_array[i_3].childs_array[1]) >= 0;
                    let cond3 = objectsIds.indexOf(on_disk.craft_list.craftable_array[i_3].childs_array[2]) >= 0;

                    if (cond1 && cond2 && cond3) {
                        console.log("> Trovato! Index: " + i_3);
                        curr_index = i_3;
                        break;
                    }
                }

                if (curr_index == -1) {
                    done_array.push([on_disk.craft_list.craftable_array[i_3].id, argonaut.info.id, on_disk.craft_list.craftable_array[i_3].total_quantity]);
                }
            }

            console.log("> Array degli oggetti fatti: ");
            console.log(done_array);

            if (curr_index >= 0) {
                const secondUpdate_res = await zainoQuantityUpdate(done_array, "+");
                console.log(secondUpdate_res);
                console.log("> Aggiornata la quantità di " + done_array.length + " oggetto/i");
                console.log("> Ricreo la linea craft...");
                const newCraft_res = await items_manager.getCraftList(on_disk.craft_list.root_item, argonaut.info.id, true);
                const save_craft_res = await saveCraftListForUser(newCraft_res, argonaut.info.id);
                line += "Per: ";
                if (on_disk.craft_list.root_item.length > 3) {
                    line += on_disk.craft_list.root_item.length + " oggetti\n\n";
                } else {
                    line += "\n";
                    for (let i_4 = 0; i_4 < on_disk.craft_list.root_item.length; i_4++) {
                        line += "> " + on_disk.craft_list.root_item[i_4].name + " (" + on_disk.craft_list.root_item[i_4].quantity + ") \n";

                    }
                }
                if (toDelete_itemsArray.length > 0) {
                    line += "\nPensavo avessi:\n";
                    for (let i_5 = 0; i_5 < toDelete_itemsArray.length; i_5++) {
                        let tmp_obj = items_manager.getItemFromId(toDelete_itemsArray[i_5][0]);
                        line += "> " + tmp_obj.name + "\n";
                    }
                }
                line += "\nHo aggiornato linea craft e zaino\n";
                if (avaible_itemsArray.length > 0) {
                    for (let i_6 = 0; i_6 < avaible_itemsArray.length; i_6++) {
                        let tmp_obj_1 = items_manager.getItemFromId(avaible_itemsArray[i_6][0]);
                        line += "> " + tmp_obj_1.name + "\n";
                    }
                }
                if (done_array.length > 0) {
                    line += "`________`\n";
                    for (let i_7 = 0; i_7 < done_array.length; i_7++) {
                        let tmp_obj_2 = items_manager.getItemFromId(done_array[i_7][0]);
                        line += "> " + tmp_obj_2.name + "\n";
                    }
                }
                return manageBrokenCraftLine_res({
                    text: line,
                    craft_list: newCraft_res,
                    objects_ids: objectsIds,
                    editable: false,
                    newCraft: true
                });
            }
        } else {
            let canMarge = false;
            let tmp_name_1 = "";
            for (let i_8 = 0; i_8 < object_list.length; i_8++) {
                tmp_name_1 = capitalizeArray(object_list[i_8].name.split(" ")).join(" ");
                line += "> " + tmp_name_1 + " (" + (asked_quantity - object_list[i_8].avaible_quantity) + ")\n";
            }
            if (!on_disk.craft_list) {
                line += "\nNon mi risulta tu stia seguendo una linea craft...\nVuoi";
            } else {
                line += "\nNon mi risulta che il craft appartenga alla tua linea attuale.\nVuoi comunque";
                canMarge = "";
                for (let i_9 = 0; i_9 < object_list.length; i_9++) {
                    canMarge += "" + objectsIds[i_9] + ":" + (asked_quantity) + ":";
                }
            }
            line += " creare ";
            if (asked_quantity == 1) {
                line += "1 copia ";
            } else {
                line += asked_quantity + " copie ";
            }
            if (object_list.length == 1) {
                line += "dell'oggetto?";
            } else {
                line += "di questi oggetti?";
            }
            return manageBrokenCraftLine_res({
                text: line,
                objects_ids: objectsIds,
                editable: true,
                mergeable: canMarge
            });
        }
    });
}

function showZainoForRarity(argo_info, rarity, type) {
    return new Promise(function (showZaino_res) {
        return getZainoRarityFor(argo_info.id, rarity).then(function (zaino) {
            res_text = "*Nel tuo Zaino* 🎒\n";
            if (zaino.length <= 0) {
                res.toSend = simpleMessage("*Mumble...* 🎒\n\nNon mi risulta tu abbia oggetti " + rarity + "!\nInoltrami `/zaino " + rarity + "` del plus...", message.chat.id);
                return argo_resolve(res);
            }
            let crafted_array = [];
            let base_array = [];

            let base_value = 0;
            let crafted_value = 0;

            zaino.sort(function (a, b) {
                if (a.item_quantity > b.item_quantity) {
                    return 1;
                } else {
                    return -1;
                }
            });
            if (zaino.length == 1) {
                res_text += "_ un oggetto ";
            } else {
                res_text += "_" + zaino.length + " oggetti "
            }

            let base_copyCount = 0;
            let creati_copyCount = 0;
            for (let i = 0; i < zaino.length; i++) {
                if (zaino[i].craftable == 0) {
                    base_array.push(zaino[i]);
                    base_copyCount += zaino[i].item_quantity;
                    if (zaino[i].market_medium_value > zaino[i].base_value) {
                        base_value += parseInt(zaino[i].market_medium_value * zaino[i].item_quantity);
                    } else {
                        base_value += parseInt(zaino[i].base_value);
                    }
                } else {
                    crafted_array.push(zaino[i]);
                    creati_copyCount += zaino[i].item_quantity;
                    if (zaino[i].market_medium_value > zaino[i].base_value) {
                        crafted_value += parseInt(zaino[i].market_medium_value * zaino[i].item_quantity);
                    } else {
                        crafted_value += parseInt(zaino[i].base_value);
                    }
                }
            }
            res_text += "per la rarità " + rarity.toUpperCase() + "_\n\n";



            if (type == "BS") {
                res_text += "• Base: " + base_array.length + "\n• Copie " + base_copyCount + "\n";
                res_text += "• Valore stimato: " + edollaroFormat(base_value) + "\n\n";

                for (let i = 0; i < base_array.length; i++) {
                    res_text += "> " + base_array[i].name + " (" + base_array[i].item_quantity + ")\n";
                }
            } else {
                res_text += "• Creati: " + crafted_array.length + "\n• Copie " + creati_copyCount + "\n";
                res_text += "• Valore stimato: " + edollaroFormat(crafted_value) + "\n\n";

                for (let i = 0; i < crafted_array.length; i++) {
                    res_text += "> " + crafted_array[i].name + " (" + crafted_array[i].item_quantity + ")\n";
                }
            }

            let toSend = simpleDeletableMessage(argo_info.id, true, res_text);

            if (type == "BS") {
                toSend.options.reply_markup.inline_keyboard.unshift([{
                    text: "Mostra Creati",
                    callback_data: "ARGO:ZAINO:SHOW:" + rarity.toUpperCase() + ":CR"
                }]);
            } else {
                toSend.options.reply_markup.inline_keyboard.unshift([{
                    text: "Mostra Base",
                    callback_data: "ARGO:ZAINO:SHOW:" + rarity.toUpperCase() + ":BS"
                }]);
            }

            return showZaino_res(toSend);
        });
    });
}

function endCraft_ZainoUpdate(forUser_id) {
    return new Promise(function (zaino_update) {
        return loadCraftList(forUser_id).then(function (json_data) {
            if (json_data.craft == false || typeof json_data.craft_list.impact == "undefined") {
                return zaino_update(false);
            }

            let to_update = [];
            let res_text = "🎒*Zaino Aggiornato*\n\n";

            if (json_data.craft_list.root_item.length <= 5) {
                res_text += "• Hai creato:\n";
            } else {
                res_text += "• Hai creato " + json_data.craft_list.root_item.length + " oggetti\n";
            }

            let tmp_object;
            for (let i = 0; i < json_data.craft_list.root_item.length; i++) {
                tmp_object = json_data.craft_list.root_item[i];
                if (json_data.craft_list.root_item.length <= 5) {
                    res_text += "> " + tmp_object.quantity + "x " + tmp_object.name + "\n";
                }
                to_update.push([tmp_object.id, forUser_id, tmp_object.quantity]);
            }



            let query = "INSERT INTO " + model.tables_names.zaini;
            query += "(item_id, user_id, item_quantity) ";
            query += "VALUES ? ";
            query += "ON DUPLICATE KEY UPDATE item_quantity = item_quantity + VALUES(item_quantity);";

            console.log("Chiedo update di:");
            console.log(to_update);

            return model.argo_pool.query(query, [to_update], function (err, db_res) {
                if (err) {
                    console.log(err);
                    res_text += "\n🤯 Upss...\nC'è stato un errore aggiornando il database!\nProbabilmente ti toccherà reinoltrarmi il tuo /zainocompleto";
                    return zaino_update(res_text);

                }
                else {

                    to_update = [];

                    if ((json_data.craft_list.impact.crafted.length + json_data.craft_list.impact.base.length) > 0) {
                        res_text += "\n*Nello Zaino:*";

                        let zaino_items = { zero_q: [], less_then_10: [], less_then_100: [], more_then_100: [] };
                        for (let i = 0; i < json_data.craft_list.impact.crafted.length; i++) {
                            tmp_object = json_data.craft_list.impact.crafted[i];

                            if (tmp_object.remaning_quantity > 100) {
                                zaino_items.more_then_100.push(tmp_object);
                            } else if (tmp_object.remaning_quantity == 0) {
                                zaino_items.zero_q.push(tmp_object);
                            } else if (tmp_object.remaning_quantity <= 10) {
                                zaino_items.less_then_10.push(tmp_object);
                            } else {
                                zaino_items.less_then_100.push(tmp_object);
                            }

                            to_update.push([tmp_object.id, forUser_id, tmp_object.remaning_quantity]);
                        }
                        for (let i = 0; i < json_data.craft_list.impact.base.length; i++) {
                            tmp_object = json_data.craft_list.impact.base[i];

                            if (tmp_object.remaning_quantity > 100) {
                                zaino_items.more_then_100.push(tmp_object);
                            } else if (tmp_object.remaning_quantity == 0) {
                                zaino_items.zero_q.push(tmp_object);
                            } else if (tmp_object.remaning_quantity <= 10) {
                                zaino_items.less_then_10.push(tmp_object);
                            } else {
                                zaino_items.less_then_100.push(tmp_object);
                            }

                            to_update.push([tmp_object.id, forUser_id, tmp_object.remaning_quantity]);
                        }

                        if (zaino_items.zero_q.length > 0) {
                            res_text += "\nPersi:\n";
                            for (let i = 0; i < zaino_items.zero_q.length; i++) {
                                res_text += "> " + zaino_items.zero_q[i].name + " (" + zaino_items.zero_q[i].rarity + ", -" + zaino_items.zero_q[i].used_quantity + ")\n";
                            }
                        } else if (zaino_items.less_then_100.length > 0) {
                            res_text += "\nIn buona quantità:\n";
                            for (let i = 0; i < zaino_items.less_then_100.length; i++) {
                                res_text += "> " + zaino_items.less_then_100[i].remaning_quantity + "x " + zaino_items.less_then_100[i].name + "\n";//+ " (" + zaino_items.less_then_100[i].rarity + ", -" + zaino_items.less_then_100[i].used_quantity + ")\n";
                            }
                        }

                        if (zaino_items.less_then_10.length > 0) {
                            res_text += "\nA rischio:\n";
                            for (let i = 0; i < zaino_items.less_then_10.length; i++) {
                                res_text += "> " + zaino_items.less_then_10[i].remaning_quantity + "x " + zaino_items.less_then_10[i].name + "\n";//+ " (" + zaino_items.less_then_10[i].rarity + ", -" + zaino_items.less_then_10[i].used_quantity + ")\n";
                            }
                        } else if (zaino_items.more_then_100.length > 0) {
                            res_text += "\nAltri:\n";
                            for (let i = 0; i < zaino_items.more_then_100.length; i++) {
                                res_text += "> " + zaino_items.more_then_100[i].remaning_quantity + "x " + zaino_items.more_then_100[i].name + "\n";//+ " (" + zaino_items.more_then_100[i].rarity + ", -" + zaino_items.more_then_100[i].used_quantity + ")\n";
                            }
                        }
                    }


                    query = "INSERT INTO " + model.tables_names.zaini;
                    query += "(item_id, user_id, item_quantity)";
                    query += "VALUES ?";
                    query += "ON DUPLICATE KEY UPDATE item_quantity = VALUES(item_quantity);";

                    return model.argo_pool.query(query, [to_update], function (err2, db_res2) {
                        if (err2) {
                            console.log(err2);
                        }
                        return zaino_update(res_text);

                    });
                    //return zaino_update(res_text);

                }

            });
        });

    });
}
module.exports.endCraft_ZainoUpdate = endCraft_ZainoUpdate;

function recursiveRaritySplit(array, rarity_string, to_filter) {
    array.push({
        rarity: rarity_string,
        array: to_filter.filter(function (el) {
            return el.rarity == rarity_string;
        }).sort(function (a, b) {
            if (typeof a.total_quantity != "undefined") {
                return b.total_quantity - a.total_quantity;
            } else {
                return b.used_quantity - a.used_quantity;
            }
        })
    });
}

function setting_text(type, curr_text) {
    //let curr_splitted = curr_text
    let res_text = "_Impostazioni Craft_\n\nIl menù è ancora in sviluppo...\n(I bottoni NON sono abilitati)\n\n"; // 🔘⚪️
    res_text += "⚪️ Tipo di Craft: Fedele\n    _Rispetta la linea di craft minima_\n\n";
    res_text += "⚪️ Base: 0\n    _Quantità minima: {0, 3, 90}_\n\n";
    res_text += "⚪️ Craftati: 0\n    _Quantità minima: {0, 3, 90}_\n\n";

    return res_text;
}

function settings_getCurrLine(curr_text) {
    let splitted_text = curr_text.split("\n");
    let lines_array = [];

    for (let i = 3; i < splitted_text.length; i++) {
        console.log("Controllo: " + splitted_text[i]);
        if (splitted_text[i].length > 5) {
            let tmp_lineSplit = splitted_text[i].substring(1).split(":");
            if (tmp_lineSplit.length == 2) {
                lines_array.push({
                    active: (splitted_text[i].charAt(0) == "⚪" ? false : true),
                    setting: tmp_lineSplit[0].trim(),
                    option: tmp_lineSplit[1].trim(),
                    comment: splitted_text[i + 1].trim(),
                });
                i += 2;

            }
        }
    }

    console.log(lines_array);
}

// ##CRAFT menu
function fabbroMenu(type, zaino, argo_info, chat_id) {
    console.log("> Fabbro chat: " + chat_id);
    let res_text = "🛠 *Fabbro Argonauta*\n";
    let res_msg;

    if (!chat_id) {
        chat_id = argo_info.id;
    }
    if (zaino == false) {
        res_text += "_Desolato..._\n\nPer iniziare, devo conoscere il tuo /zaino.\n\n";
        res_text += "*Usa @LootPlusBot!*💡\n_Puoi inoltrare i messaggi delle singole rarità o, tutti e contemporaneamente, quelli di_ `/zaino completo`.\n";
        res_text += "\n🤖\nPer il momento non riesco a decifrare i messaggi dello zaino di @LootGameBot";
        //res_text += "Ricorda poi di inoltrare il messaggio di apertura scrigni per segnalare i nuovi rifornimenti.";
        res_msg = simpleDeletableMessage(chat_id, true, res_text);
        return res_msg;
    }

    let inline_keyboard = [];

    if (type == "main") {
        let all_items = items_manager.allSplittedItems;
        res_text += "_Panoramica dei creati nel tuo Zaino_🎒\n\n";
        res_text += "· Comuni: " + zaino.comuni.length + "/" + all_items.comuni.length + "\n";
        res_text += "· Non Comuni: " + zaino.non_comuni.length + "/" + all_items.non_comuni.length + "\n";
        res_text += "· Rari: " + zaino.rari.length + "/" + all_items.rari.length + "\n";
        res_text += "· Ultra Rari: " + zaino.ultra_rari.length + "/" + all_items.ultra_rari.length + "\n";
        res_text += "· Leggendari: " + zaino.leggendari.length + "/" + all_items.leggendari.length + "\n";
        res_text += "· Epici: " + zaino.epici.length + "/" + all_items.epici.length + "\n";
        res_text += "· Ultra Epici: " + zaino.ultra_epici.length + "/" + all_items.ultra_epici.length + "\n";
        res_text += "· Unici: " + zaino.unici.length + "/" + all_items.unici.length + "\n";
        res_text += "· Draconici: " + zaino.draconici.length + "/" + all_items.draconici.length + "\n";
        res_text += "· Mutaforma: " + zaino.x.length + "/" + all_items.x.length + "\n";

        inline_keyboard.push(
            [
                {
                    text: "Impostazioni",
                    callback_data: "ARGO:CRAFT:SETG"
                },
                {
                    text: "Analisi",
                    callback_data: "ARGO:CRAFT:ANALISI_MAIN"
                }
            ],
            [
                {
                    text: "Chiudi ⨷",
                    callback_data: 'ARGO:FORGET'
                }
            ]
        );


    } else if (type == "settings") {
        console.log("> craft_option: ");
        console.log(argo_info);

        res_text += setting_text();
        settings_getCurrLine(res_text);

        inline_keyboard.push([
            {
                text: "↓",
                callback_data: "ARGO:CRAFT:SETT_DOWN"
            },
            {
                text: "↑",
                callback_data: "ARGO:CRAFT:SETT_UP"
            },
            {
                text: "Modifica",
                callback_data: "ARGO:CRAFT:EDIT"
            }

        ]);
        inline_keyboard.push([
            {
                text: "Indietro ⮐",
                callback_data: "ARGO:CRAFT:MAIN_MNU"
            }
        ]);
    } else if (type.match("R:")) {
        let splitted = type.split(":");
        if (splitted[1].length <= 0) {
            res_text += "\nSeleziona una rarità da analizzare.\nRicorda che le quantità mostrate dipendono da quanto hai tenuto aggiornato nello zaino"
            let all_items = items_manager.allSplittedItems;

            let all_diff = [];
            if (all_items.comuni.length - zaino.comuni.length <= 0) {
                all_diff.push("(✓)");
            } else {
                all_diff.push("(-" + (all_items.comuni.length - zaino.comuni.length) + ")");
            }
            if (all_items.non_comuni.length - zaino.non_comuni.length <= 0) {
                all_diff.push("(✓)");
            } else {
                all_diff.push("(-" + (all_items.non_comuni.length - zaino.non_comuni.length) + ")");
            }

            if (all_items.rari.length - zaino.rari.length <= 0) {
                all_diff.push("(✓)");
            } else {
                all_diff.push("(-" + (all_items.rari.length - zaino.rari.length) + ")");
            }
            if (all_items.ultra_rari.length - zaino.ultra_rari.length <= 0) {
                all_diff.push("(✓)");
            } else {
                all_diff.push("(-" + (all_items.ultra_rari.length - zaino.ultra_rari.length) + ")");
            }
            if (all_items.leggendari.length - zaino.leggendari.length <= 0) {
                all_diff.push("(✓)");
            } else {
                all_diff.push("(-" + (all_items.leggendari.length - zaino.leggendari.length) + ")");
            }
            if (all_items.epici.length - zaino.epici.length <= 0) {
                all_diff.push("(✓)");
            } else {
                all_diff.push("(-" + (all_items.epici.length - zaino.epici.length) + ")");
            }
            if (all_items.ultra_epici.length - zaino.ultra_epici.length <= 0) {
                all_diff.push("(✓)");
            } else {
                all_diff.push("(-" + (all_items.ultra_epici.length - zaino.ultra_epici.length) + ")");
            }
            if (all_items.unici.length - zaino.unici.length <= 0) {
                all_diff.push("(✓)");
            } else {
                all_diff.push("(-" + (all_items.unici.length - zaino.unici.length) + ")");
            }
            if (all_items.draconici.length - zaino.draconici.length <= 0) {
                all_diff.push("(✓)");
            } else {
                all_diff.push("(-" + (all_items.draconici.length - zaino.draconici.length) + ")");
            }
            if (all_items.x.length - zaino.x.length <= 0) {
                all_diff.push("(✓)");
            } else {
                all_diff.push("(-" + (all_items.x.length - zaino.x.length) + ")");
            }



            inline_keyboard.push(
                [
                    {
                        text: "C " + all_diff[0],
                        callback_data: "ARGO:CRAFT:ANALISI:C:BS"
                    },
                    {
                        text: "NC " + all_diff[1],
                        callback_data: "ARGO:CRAFT:ANALISI:NC:CR"
                    }
                ],
                [
                    {
                        text: "R " + all_diff[2],
                        callback_data: "ARGO:CRAFT:ANALISI:R:CR"
                    },
                    {
                        text: "UR " + all_diff[3],
                        callback_data: "ARGO:CRAFT:ANALISI:UR:CR"
                    }
                ],
                [
                    {
                        text: "L " + all_diff[4],
                        callback_data: "ARGO:CRAFT:ANALISI:L:CR"
                    },
                    {
                        text: "E " + all_diff[5],
                        callback_data: "ARGO:CRAFT:ANALISI:E:CR"
                    }
                ],
                [
                    {
                        text: "UE " + all_diff[6],
                        callback_data: "ARGO:CRAFT:ANALISI:UE:CR"
                    },
                    {
                        text: "U " + all_diff[7],
                        callback_data: "ARGO:CRAFT:ANALISI:U:BS"
                    }
                ],
                [
                    {
                        text: "D " + all_diff[8],
                        callback_data: "ARGO:CRAFT:ANALISI:D:BS"
                    },
                    {
                        text: "X " + all_diff[9],
                        callback_data: "ARGO:CRAFT:ANALISI:X:CR"
                    }
                ]
            );

            inline_keyboard.push([
                {
                    text: "Info e Consigli ⓘ",
                    callback_data: "ARGO:CRAFT:SUGGESTIONS"
                }
            ]);

            inline_keyboard.push([
                {
                    text: "Indietro ⮐",
                    callback_data: "ARGO:CRAFT:MAIN_MNU"
                },
                {
                    text: "Chiudi ⨷",
                    callback_data: 'ARGO:FORGET'
                }

            ]);
        } else if (splitted[1] == "D") {
            let curr_partial = getPartialZaino(zaino, splitted[1]); //zaino
            let pietre_array = [];
            let vetteStuff_array = [];
            res_text += "_Draconici_\n\n";
            let change_text;
            for (let i = 0; i < curr_partial.length; i++) {
                if (curr_partial[i].name.match("Pietra")) {
                    pietre_array.push(curr_partial[i]);
                } else {
                    vetteStuff_array.push(curr_partial[i]);
                }
            }

            if (splitted[2] == "BS") {
                change_text = "Vette";

                if (pietre_array.length <= 0) {
                    res_text += "Non mi risulta tu abbia alcuna pietra Draconica nello zaino";
                } else {
                    let pietre_counter = 0;
                    let point_counter = 0;

                    for (let i = 0; i < pietre_array.length; i++) {
                        pietre_counter += pietre_array[i].item_quantity;

                        if (pietre_array[i].name.match(" Legno")) {
                            point_counter += 1 * pietre_array[i].item_quantity;
                        } else if (pietre_array[i].name.match(" Ferro")) {
                            point_counter += 2 * pietre_array[i].item_quantity;
                        } else if (pietre_array[i].name.match(" Preziosa")) {
                            point_counter += 3 * pietre_array[i].item_quantity;
                        } else if (pietre_array[i].name.match(" Diamante")) {
                            point_counter += 4 * pietre_array[i].item_quantity;
                        } else if (pietre_array[i].name.match(" Leggendario")) {
                            point_counter += 5 * pietre_array[i].item_quantity;
                        } else if (pietre_array[i].name.match(" Epico")) {
                            point_counter += 6 * pietre_array[i].item_quantity;
                        }
                    }

                    res_text += "· Pietre: " + pietre_counter + "\n";
                    res_text += "· Punti: " + point_counter + "\n";
                    res_text += "· Livelli: " + (point_counter / 70).toFixed(2) + "\n\n";
                    for (let i = 0; i < pietre_array.length; i++) {
                        res_text += "- " + pietre_array[i].name.split(" ").slice(1).join(" ") + " (" + pietre_array[i].item_quantity + ")\n";
                    }

                }

            } else {
                change_text = "Pietre";
                if (vetteStuff_array.length <= 0) {
                    res_text += "Non mi risulta tu abbia alcuna potenziatore o liquido nello zaino!";
                } else {
                    let total_counter = 0;
                    for (let i = 0; i < vetteStuff_array.length; i++) {
                        total_counter += vetteStuff_array[i].item_quantity;
                    }

                    res_text += "· Potenziatori e Liquidi: " + total_counter + "\n\n";

                    for (let i = 0; i < vetteStuff_array.length; i++) {
                        if (vetteStuff_array[i].name.match("Draconic")) {
                            res_text += "- " + vetteStuff_array[i].name.split(" ")[0] + " " + vetteStuff_array[i].name.split(" ")[2] + " (" + vetteStuff_array[i].item_quantity + ")\n";
                        } else {
                            res_text += "- " + vetteStuff_array[i].name.split(" ").slice(1).join(" ") + " (" + vetteStuff_array[i].item_quantity + ")\n";
                        }
                    }
                }
            }

            inline_keyboard.push([
                {
                    text: "Indietro ⮐",
                    callback_data: "ARGO:CRAFT:ANALISI_MAIN"
                },
                {
                    text: change_text,
                    callback_data: "ARGO:CRAFT:ANALISI:" + splitted[1] + (splitted[2] == "BS" ? ":PT" : ":BS")
                }

            ]);



        } else { // se arrivo qui, zaino è già quello parziale
            let curr_partial = getPartialZaino(zaino, splitted[1]); //zaino
            let curr_proto = getPartialZaino(items_manager.allSplittedItems, splitted[1]);
            let singleLine_buttons = [];

            let curr_base = [];
            let proto_base = [];
            let curr_crafted = [];
            let proto_crafted = [];


            for (let i = 0; i < curr_partial.length; i++) {
                if (curr_partial[i].craftable == "0") {
                    curr_base.push(curr_partial[i]);
                } else {
                    curr_crafted.push(curr_partial[i]);
                }
            }
            for (let i = 0; i < curr_proto.length; i++) {
                if (curr_proto[i].craftable == "0") {
                    proto_base.push(curr_proto[i]);
                } else {
                    proto_crafted.push(curr_proto[i]);
                }
            }
            let inner_res_text = "_Rarità: " + splitted[1] + "_\n";
            let stars_text = "";
            let change_text = "Vedi i Base";

            if (splitted[2] == "BS") {
                change_text = "Torna ai Creati";
                inner_res_text += "\n• *Base: " + curr_base.length + "/" + proto_base.length + "*\n\n";

                if (curr_base.length > 0) {
                    let curr_base_infos = {
                        objects_n: 0,
                        media: 0,
                        underMedia_objects: []
                    };
                    let value = { market: 0, base: 0 };
                    for (let i = 0; i < curr_base.length; i++) {
                        curr_base_infos.objects_n += curr_base[i].item_quantity;
                        let tmp_item = items_manager.quick_itemFromName(curr_base[i].name, false, 1, null, false)[0];
                        value.base += (parseInt(tmp_item.base_value) * curr_base[i].item_quantity);
                        value.market += curr_base[i].item_quantity * parseInt(tmp_item.market_medium_value > 0 ? tmp_item.market_medium_value : tmp_item.base_value);

                    }
                    curr_base_infos.media = (curr_base.length > 0 ? Math.floor(curr_base_infos.objects_n / curr_base.length) : curr_base_infos.objects_n);
                    inner_res_text += " · Copie: " + curr_base_infos.objects_n + "\n";
                    inner_res_text += " · Media: " + curr_base_infos.media + "\n";
                    inner_res_text += " · Base: " + edollaroFormat(value.base) + "\n";
                    inner_res_text += " · Mercato: " + edollaroFormat(value.market) + "\n";



                    for (let i = 0; i < curr_base.length; i++) {
                        if (curr_base[i].item_quantity < curr_base_infos.media) {
                            curr_base_infos.underMedia_objects.push(curr_base[i]);
                        }
                    }

                    if (curr_base_infos.underMedia_objects.length > 0) {
                        let scrigni_quantity = Math.floor(curr_base_infos.underMedia_objects.length * curr_base_infos.media);
                        //inner_res_text += "   Scrigni minimi: " + scrigni_quantity + "\n";

                        let max = Math.min(curr_base_infos.underMedia_objects.length, 20);
                        curr_base_infos.underMedia_objects.sort(function (a, b) {
                            if (a.item_quantity > b.item_quantity) {
                                return 1;
                            } else {
                                return -1;
                            }
                        });
                        inner_res_text += "   Minimo: " + curr_base_infos.underMedia_objects[0].item_quantity + "\n";
                        inner_res_text += "\n ↧ Minime copie: " + curr_base_infos.underMedia_objects.length + "\n";

                        for (let i = 0; i < max; i++) {
                            inner_res_text += "- `" + curr_base_infos.underMedia_objects[i].name;
                            inner_res_text += "` (" + (curr_base_infos.underMedia_objects[i].item_quantity) + ")\n";
                        }
                        if ((curr_base_infos.underMedia_objects.length - max) == 1) {
                            inner_res_text += " _...Ed un altro " + splitted[1] + " base_\n";
                        } else if ((curr_base_infos.underMedia_objects.length - max) > 1) {
                            inner_res_text += " _...Ed altri " + (curr_base_infos.underMedia_objects.length - max) + " " + splitted[1] + " base_\n";;
                        }
                        let emporio_name = "Compra Scrigno "
                        switch (splitted[1]) {
                            case "C": {
                                emporio_name += "di Legno";
                                break;
                            } case "NC": {
                                emporio_name += "di Ferro";
                                break;
                            } case "R": {
                                emporio_name += "Prezioso";
                                break;
                            } case "UR": {
                                emporio_name += "di Diamante";
                                break;
                            } case "L": {
                                emporio_name += "Leggendario";
                                break;
                            } case "E": {
                                emporio_name += "Epico";
                                break;
                            } default: {
                                emporio_name = "Emporio";
                                break;
                            }
                        }
                        inline_keyboard.push([
                            {
                                text: "Compra all'Emporio (" + scrigni_quantity + ")",
                                switch_inline_query: "eco: " + emporio_name
                            }
                        ]);

                    }

                    let rarity_mul = 1;
                    switch (splitted[1]) {
                        case "C": {
                            rarity_mul = 10;
                            break;
                        } case "NC": {
                            rarity_mul = 8;
                            break;
                        } case "R": {
                            rarity_mul = 5;
                            break;
                        } case "UR": {
                            rarity_mul = 5;
                            break;
                        } case "L": {
                            rarity_mul = 2;
                            break;
                        } case "E": {
                            rarity_mul = 2;
                            break;
                        }
                    }

                    if (curr_base_infos.media <= (30 * rarity_mul)) {
                        stars_text = "☆"; //
                    } else if (curr_base_infos.media <= (60 * rarity_mul)) {
                        stars_text = "★"; //
                    } else if (curr_base_infos.media > 1000) {
                        for (let i = 0; i < (Math.floor(curr_base_infos.media / 1000)); i++) {
                            stars_text += "★"; //☆
                        }
                        stars_text += " "; //☆
                    }
                } else {
                    stars_text = "↯"
                }

                if (curr_base.length < proto_base.length) {
                    inner_res_text += "\n ⦰ Che non hai: " + (proto_base.length - curr_base.length) + "\n";

                    let counter = 0;
                    for (let i = 0; i < proto_base.length; i++) {
                        let found = false;
                        for (let j = 0; j < curr_base.length; j++) {
                            if (curr_base[j].name == proto_base[i].name) {
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            counter++;
                            if (counter <= 10) {
                                inner_res_text += "`" + proto_base[i].name + "`\n";
                            }
                        }
                    }
                    if (counter > 10) {
                        if ((counter - 10) == 1) {
                            inner_res_text += " _...Ed un altro " + splitted[1] + " base_\n";
                        } else {
                            inner_res_text += " _...Ed altri " + (counter - 10) + " " + splitted[1] + " base_\n";
                        }
                    }

                }

            } else { // CR
                inner_res_text += "\n• *Creati: " + curr_crafted.length + "/" + proto_crafted.length + "*\n\n";

                if (curr_crafted.length > 0) {
                    let curr_crafted_infos = {
                        objects_n: 0,
                        media: 0,
                        underMedia_objects: []
                    };
                    let value = { market: 0, base: 0 };

                    for (let i = 0; i < curr_crafted.length; i++) {
                        curr_crafted_infos.objects_n += curr_crafted[i].item_quantity;
                        let tmp_item = items_manager.quick_itemFromName(curr_crafted[i].name, false, 1, null, true)[0];

                        value.base += (parseInt(tmp_item.base_value) * curr_crafted[i].item_quantity)
                        value.market += curr_crafted[i].item_quantity * parseInt(tmp_item.market_medium_value > 0 ? tmp_item.market_medium_value : tmp_item.base_value)
                    }
                    curr_crafted_infos.media = (curr_crafted.length > 0 ? Math.floor(curr_crafted_infos.objects_n / curr_crafted.length) : curr_crafted_infos.objects_n);
                    inner_res_text += " · Copie: " + curr_crafted_infos.objects_n + "\n";
                    inner_res_text += " · Media: " + curr_crafted_infos.media + "\n";
                    inner_res_text += " · Base: " + edollaroFormat(value.base) + "\n";
                    inner_res_text += " · Mercato: " + edollaroFormat(value.market) + "\n";

                    inner_res_text += " · Consolidamento: x";
                    if (curr_crafted_infos.media <= 1) {
                        curr_crafted_infos.media = 1;
                        inner_res_text += "1\n";
                        stars_text = "✧"; //
                    } else if (curr_crafted_infos.media < 3) {
                        curr_crafted_infos.media = 3;
                        inner_res_text += "3\n";
                        stars_text = "✩"; //
                    } else if (curr_crafted_infos.media <= 15) {
                        curr_crafted_infos.media = 9;
                        inner_res_text += "9\n";
                        stars_text = "☆"; //
                    } else if (curr_crafted_infos.media <= 30) {
                        if (curr_crafted_infos.media == 30) {
                            stars_text = "★"; //☆
                        } else {
                            for (let i = 0; i < (Math.floor(curr_crafted_infos.media / 5)); i++) {
                                stars_text += "☆"; //☆
                            }
                        }
                        curr_crafted_infos.media = 30;
                        inner_res_text += "30\n";
                    } else {
                        for (let i = 0; i < (Math.floor(curr_crafted_infos.media / 30)); i++) {
                            stars_text += "★"; //☆
                        }
                        stars_text += " "; //☆

                        curr_crafted_infos.media = Math.floor(curr_crafted_infos.media / 30) * 30;
                        inner_res_text += (Math.floor(curr_crafted_infos.media / 30) * 30) + "\n";
                    }

                    let minimo = curr_crafted_infos.media;
                    for (let i = 0; i < curr_crafted.length; i++) {
                        if (curr_crafted[i].item_quantity < curr_crafted_infos.media) {
                            curr_crafted_infos.underMedia_objects.push(curr_crafted[i]);
                            if (minimo > curr_crafted[i].item_quantity) {
                                minimo = curr_crafted[i].item_quantity;
                            }
                        }
                    }

                    if (curr_crafted_infos.underMedia_objects.length > 0) {
                        curr_crafted_infos.underMedia_objects.sort(function (a, b) {
                            if (a.item_quantity > b.item_quantity) {
                                return 1;
                            } else {
                                return -1;
                            }
                        });
                        inner_res_text += "   Minimo: " + minimo + "\n";
                        inner_res_text += "\n 🝩 Per il consolidamento: " + curr_crafted_infos.underMedia_objects.length + " ";

                        console.log("> Media: " + curr_crafted_infos.media);
                        let critics_counter = 0;
                        let critics_text = "(⚠️)\n";
                        let crafted_text = "\n";
                        let crafted_counter = 0;

                        for (let i = 0; i < curr_crafted_infos.underMedia_objects.length; i++) {
                            crafted_counter++;
                            let tmp_quantity = (curr_crafted_infos.media - curr_crafted_infos.underMedia_objects[i].item_quantity);
                            console.log("> quantità per " + curr_crafted_infos.underMedia_objects[i].name + ": " + curr_crafted_infos.underMedia_objects[i].item_quantity);
                            console.log("> tmp_quantity: " + tmp_quantity);

                            if (critics_counter < 10 && (curr_crafted_infos.underMedia_objects[i].item_quantity < (minimo + 5))) {
                                critics_counter++;
                                critics_text += "" + tmp_quantity + "x " + curr_crafted_infos.underMedia_objects[i].name + "\n";
                            }
                            if (crafted_counter < 10) {
                                crafted_text += "" + tmp_quantity + "x " + curr_crafted_infos.underMedia_objects[i].name + "\n";
                            }
                        }

                        if (critics_counter > 3) {
                            inner_res_text += critics_text;
                            if ((curr_crafted_infos.underMedia_objects.length - critics_counter) == 1) {
                                inner_res_text += " _...Ed un altro creato " + splitted[1] + "_\n";
                            } else if ((curr_crafted_infos.underMedia_objects.length - critics_counter) > 1) {
                                inner_res_text += " _...Ed altri " + (curr_crafted_infos.underMedia_objects.length - critics_counter) + " creati " + splitted[1] + "_\n";;
                            }
                        } else {
                            inner_res_text += crafted_text;
                            if ((curr_crafted_infos.underMedia_objects.length - crafted_counter) == 1) {
                                inner_res_text += " _...Ed un altro creato " + splitted[1] + "_\n";
                            } else if ((curr_crafted_infos.underMedia_objects.length - crafted_counter) > 1) {
                                inner_res_text += " _...Ed altri " + (curr_crafted_infos.underMedia_objects.length - crafted_counter) + " creati " + splitted[1] + "_\n";;
                            }
                        }

                        singleLine_buttons.push(
                            {
                                text: "Consolida 🝩",
                                callback_data: "ARGO:CRAFT:CONSOLIDA"
                            }
                        );

                    }
                } else {
                    stars_text = "↯";
                }

                if (curr_crafted.length < proto_crafted.length) {
                    inner_res_text += "\n 🜛 Mancanti: " + (proto_crafted.length - curr_crafted.length) + "\n";
                    let counter = 0;
                    for (let i = 0; i < proto_crafted.length; i++) {
                        let found = false;
                        for (let j = 0; j < curr_crafted.length; j++) {
                            if (curr_crafted[j].name == proto_crafted[i].name) {
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            counter++;
                            if (counter <= 10) {
                                inner_res_text += "`" + proto_crafted[i].name + "`\n";
                            }
                        }
                    }
                    if (counter > 10) {
                        if ((counter - 10) == 1) {
                            inner_res_text += " _...Ed un altro creato " + splitted[1] + "_\n";
                        } else {
                            inner_res_text += " _...Ed altri " + (counter - 10) + " creati " + splitted[1] + "_\n";
                        }
                    }
                    singleLine_buttons.push(
                        {
                            text: "Completa 🜛",
                            callback_data: "ARGO:CRAFT:COMPLETA"
                        }
                    );
                }
            }

            if (singleLine_buttons.length > 0) {
                inline_keyboard.push(singleLine_buttons);
            }

            if (proto_crafted.length > 0) {
                inline_keyboard.push([
                    {
                        text: "Indietro ⮐",
                        callback_data: "ARGO:CRAFT:ANALISI_MAIN"
                    },
                    {
                        text: change_text,
                        callback_data: "ARGO:CRAFT:ANALISI:" + splitted[1] + (splitted[2] == "BS" ? ":CR" : ":BS")
                    }

                ]);
            } else {
                inline_keyboard.push([
                    {
                        text: "Indietro ⮐",
                        callback_data: "ARGO:CRAFT:ANALISI_MAIN"
                    }
                ]);
            }
            res_text += inner_res_text + "\n`" + stars_text + "`";
        }
    }

    res_msg = simpleMessage(res_text, chat_id);
    res_msg.options.reply_markup = {};
    res_msg.options.reply_markup.inline_keyboard = inline_keyboard;

    return res_msg;
}

function getPartialZaino(zaino, rarity_string) {
    switch (rarity_string) {
        case "C": {
            return zaino.comuni;
        } case "NC": {
            return zaino.non_comuni;
        } case "R": {
            return zaino.rari;
        } case "UR": {
            return zaino.ultra_rari;
        } case "L": {
            return zaino.leggendari;
        } case "E": {
            return zaino.epici;
        } case "UE": {
            return zaino.ultra_epici;
        } case "U": {
            return zaino.unici;
        } case "X": {
            return zaino.x;
        } default: {
            return zaino.draconici;
        }
    }
}

function manageCraftCommand(argo_info, command, chat_id) {
    return new Promise(function (craft_command_res) {
        return getZainoFor(argo_info.id).then(function (zaino) {
            return loadCraftList(argo_info.id).then(function (on_db) {
                let res_msg = {};
                let res_text = "";
                if (zaino != false) {
                    if (!on_db.craft_list) { //Analisi zaino
                        res_msg = fabbroMenu("main", zaino, argo_info, chat_id);
                    } else { // zaino in relazione al craft
                        res_text = getCurrCraftDetails(on_db.craft_list, argo_info);
                        res_msg = simpleDeletableMessage(chat_id, true, res_text);//simpleMessage(res_text, argo_info.id);

                        let has_craftedImpact = checkPreserveNeeds(on_db.craft_list.impact.crafted, on_db.craft_list.root_item);
                        giveDetailBotton(res_msg.options, on_db.craft_list.missingItems_array.length, on_db.craft_list.impact.base.length, on_db.craft_list.impact.crafted.length, has_craftedImpact);
                    }
                } else {
                    res_text = " ⚠️ *Woops*\nNon conosco il tuo zaino! Inoltrami i messaggi di /zaino del @LootPlusBot\n";
                    res_msg = simpleMessage(res_text, chat_id);

                }
                return craft_command_res(res_msg);
            });
        });
    });
}

function giveDetailBotton(a_message, missing, used_base, used_crafted, impact) {
    console.log("> IMPACT per detailBotton: " + impact)
    let push_bool = false;

    if (typeof a_message.reply_markup != "undefined" && typeof a_message.reply_markup.inline_keyboard != "undefined") {
        push_bool = true;
        a_message.reply_markup.inline_keyboard.unshift(
            [
                {
                    text: "⌫",
                    callback_data: "ARGO:CRAFT:LIST_DEL:"
                },
                {
                    text: "Linea 𐂷",
                    callback_data: "ARGO:CRAFT:LIST"
                },
                {
                    text: "↺",
                    callback_data: "ARGO:CRAFT:RECREATE:"
                }
            ]);
    } else {
        a_message.reply_markup = {};
        a_message.reply_markup.inline_keyboard = [
            [
                {
                    text: "⌫",
                    callback_data: "ARGO:CRAFT:LIST_DEL:"
                },
                {
                    text: "Linea 𐂷",
                    callback_data: "ARGO:CRAFT:LIST"
                },
                {
                    text: "↺",
                    callback_data: "ARGO:CRAFT:RECREATE:"
                }
            ]];
    }

    let secondLine_buttons = [];
    let zaino_buttons = [];

    if (missing > 0) {
        secondLine_buttons.push({ text: "📦 Necessari ", callback_data: 'ARGO:CRAFT:NEEDED' });
    }
    if ((used_crafted + used_base) > 0) {
        //if (used_crafted.length > 0) {
        if (impact) {
            zaino_buttons = [
                { text: "Preserva", callback_data: 'ARGO:CRAFT:RECREATE:PRESERVE' },
                { text: "🎒", callback_data: 'ARGO:CRAFT:USED' },
                { text: "Escludi", callback_data: 'ARGO:CRAFT:RECREATE:NOZAINO' }
            ];
        } else {
            if (used_crafted > 0) {
                secondLine_buttons.push({ text: "🎒Usati", callback_data: 'ARGO:CRAFT:USED' });
                let preserve_button = { text: "Escludi Zaino", callback_data: 'ARGO:CRAFT:RECREATE:NOZAINO' };
                if (secondLine_buttons.length == 1) {
                    secondLine_buttons.push(preserve_button);
                } else {
                    preserve_button.text = "Escludi lo Zaino";
                    if (!push_bool) {
                        a_message.reply_markup.inline_keyboard.push([preserve_button]);
                    } else {
                        a_message.reply_markup.inline_keyboard.unshift([preserve_button]);
                    }
                }
            } else {
                secondLine_buttons.push({ text: "🎒Usati", callback_data: 'ARGO:CRAFT:USED:BS' });
            }
        }

        //}


    }


    if (secondLine_buttons.length > 0) {
        if (!push_bool) {
            a_message.reply_markup.inline_keyboard.push(secondLine_buttons);
        } else {
            a_message.reply_markup.inline_keyboard.unshift(secondLine_buttons);
        }
    }
    if (zaino_buttons.length > 0) {
        if (!push_bool) {
            a_message.reply_markup.inline_keyboard.push(zaino_buttons);
        } else {
            a_message.reply_markup.inline_keyboard.unshift(zaino_buttons);
        }
    }

    if (!push_bool) {
        a_message.reply_markup.inline_keyboard.splice(a_message.reply_markup.inline_keyboard.length - 2, 0, [{
            text: "Al Craft",
            switch_inline_query: "linea 1"
        }]
        );
    } else {
        a_message.reply_markup.inline_keyboard.unshift(
            [
                {
                    text: "Al Craft",
                    switch_inline_query: "linea 1"
                }
            ]

        );
    }



}

function getCurrCraftDetails(curr_craft, argo, just_asking, updated) {
    let res_text = "ⓘ *Dettaglio Craft*\n";
    if (updated == true) {
        res_text += "_Aggiornato!_\n\n";
    } else {
        res_text += "_In corso_\n\n";
    }

    if (curr_craft.root_item.length == 1) {
        res_text += "> " + curr_craft.root_item[0].name + " (x" + curr_craft.root_item[0].quantity + ")";
        // if (curr_craft.already_avaible_root_item.length == 1) {
        //     res_text += " (" + (curr_craft.already_avaible_root_item[0].remaning_quantity);
        //     res_text += "\n> Ne hai ancora";
        // }
    } else {
        let total_quantity = 0;
        for (let i = 0; i < curr_craft.root_item.length; i++) {
            total_quantity += curr_craft.root_item[i].quantity;
        }
        res_text += "Per " + curr_craft.root_item.length + " oggetti, " + (total_quantity == 1 ? "una copia" : total_quantity + " copie");

    }
    if (!just_asking) {
        if (curr_craft.needed_crafts == 1) {
            res_text += "\nUna sola linea!\n";
        } else {
            let curr_line = proportionalIndexCalc(curr_craft.craftable_array, curr_craft.needed_crafts, 0, 0);
            let proportion = Math.floor((100 * curr_line) / curr_craft.needed_crafts);
            res_text += "\nProgresso: " + Math.floor(curr_line).toFixed(0) + "/" + curr_craft.needed_crafts + " (" + proportion + "%)\n";
        }
    } else {
        res_text += "\nLinee: " + curr_craft.needed_crafts + "\n";

    }
    res_text += "\n";



    if (curr_craft.total_pc == 0) {
        res_text += "Punti craft: Nessuno!\n";
    } else {
        res_text += "Punti craft: " + curr_craft.total_pc + "\n";
    }
    if (curr_craft.total_cost > 0) {
        res_text += "Costo craft: " + parsePrice(curr_craft.total_cost) + "\n";
        //res_text += "Possibile guadagno: " + parsePrice(curr_craft.target_gain) + "\n";
    }
    res_text += "\n";

    if ((curr_craft.impact.base.length + curr_craft.impact.crafted.length) == 0) {
        res_text += "Nessun consumato (dallo zaino) \n";
    } else {
        res_text += "Consumerai " + (curr_craft.impact.base.length + curr_craft.impact.crafted.length) + " oggetti:\n";
        if (curr_craft.impact.base.length > 0) {
            res_text += "• Base: " + curr_craft.impact.base.length + "\n";
        }
        if (curr_craft.impact.base.length > 0) {
            res_text += "• Creati: " + curr_craft.impact.crafted.length + "\n";
        }

        if (parseInt(curr_craft.impact.total_impact) > 0) {
            res_text += "Impatto: " + parseInt(curr_craft.impact.total_impact).toFixed(2) + "% \n";
        }

    }

    res_text += "\n";

    if (curr_craft.missingItems_array.length == 0) {
        res_text += "Hai tutto ✅\n";
    } else {
        res_text += "Base mancanti: " + curr_craft.missingItems_array.length + "\n";
    }




    return res_text;
}

function manageCraftNeeds(argonaut, command) { // Stampa oggetti necessari (craft corrente) 
    return new Promise(function (manageCraftNeeds_res) {
        return loadCraftList(argonaut.id).then(function (on_disk) {
            //console.log(craft_list);
            if (!on_disk.craft_list) {
                return manageCraftNeeds_res({
                    needs: -1,
                    text: "*Mumble!*\nNon mi risulta tu stia seguendo una linea craft.\n_Usa il comando inline \"craft\"_"
                });
            } else {
                let res_text = "";
                if (on_disk.craft_list.missingItems_array.length == 0) {
                    return manageCraftNeeds_res({
                        needs: 0,
                        text: "Non hai bisogno di alcun oggetto per il craft attuale!"
                    });
                } else if (on_disk.craft_list.missingItems_array.length == 1) {
                    res_text = "📦 *Ti manca un solo oggetto:*\n\n";
                    res_text += "> " + on_disk.craft_list.missingItems_array[0].name + " (" + on_disk.craft_list.missingItems_array[0].total_quantity + ") ";
                    return manageCraftNeeds_res({
                        craft: true,
                        needs: 1,
                        text: res_text
                    });
                } else {
                    res_text = "📦 *Ti serviranno " + on_disk.craft_list.missingItems_array.length + " oggetti*\n";
                    //res_text += "_per un totale di "+ +" copie_"
                    res_text += "\n";

                    let all_splitted = [];
                    for (let i = 0; i < items_manager.all_rarity.length; i++) {
                        recursiveRaritySplit(all_splitted, items_manager.all_rarity[i], on_disk.craft_list.missingItems_array);
                    }

                    for (let i = 0; i < all_splitted.length; i++) {
                        if (all_splitted[i].array.length > 0) {
                            res_text += "*" + all_splitted[i].rarity + "*:\n"
                            for (let j = 0; j < all_splitted[i].array.length; j++) {
                                res_text += "> " + all_splitted[i].array[j].name + " (" + all_splitted[i].array[j].total_quantity + ")\n";// + " (" + all_splitted[i].array[j].rarity+ ")\n";
                            }
                            res_text += "\n";
                        }
                    }

                    return manageCraftNeeds_res({
                        craft: true,
                        needs: on_disk.craft_list.missingItems_array.length,
                        text: res_text
                    });
                }
            }
        });
    });
}

function manageCraftList(argonaut, command) { // Stampa Linea Craft (corrente) 
    return new Promise(function (manageCraftList_res) {
        return loadCraftList(argonaut.id).then(function (on_disk) {
            //console.log(craft_list);
            if (!on_disk.craft_list) {
                return manageCraftList_res({
                    needs: -1,
                    text: "*Mumble!*\nNon mi risulta tu stia seguendo una linea craft.\n_Usa il comando inline \"craft\"_"
                });
            } else {
                let res_text = "📋 *Linea Craft*\n";
                res_text += "_Craft necessari: " + on_disk.craft_list.needed_crafts + "_\n";

                let grupped = groupBy(on_disk.craft_list.craftable_array, "levels_deep");

                let counter = 1;

                for (let i = (grupped.length - 1); i >= 0; i--) {
                    res_text += "\n*Livello " + (1 + i) + "*\n";
                    if (typeof grupped[i] != "undefined") {
                        for (let j = 0; j < grupped[i].length; j++) {
                            res_text += "`" + counter + "°`: " + grupped[i][j].name + " (" + grupped[i][j].rarity + ", " + grupped[i][j].total_quantity + ")\n";
                            counter++;
                        }
                    }
                }

                return manageCraftList_res({
                    craft: true,
                    needs: on_disk.craft_list.missingItems_array.length,
                    text: res_text
                });
            }

        });
    });
}

function manageUsedInCraft(argonaut, type) { // Stampa oggetti usati (craft corrente) 
    return new Promise(function (manageUsedInCraft_res) {
        return loadCraftList(argonaut.id).then(function (on_disk) {
            //console.log(craft_list);
            if (!on_disk.craft_list) {
                return manageUsedInCraft_res({
                    used: -1,
                    text: "*Mumble!*\nNon mi risulta tu stia seguendo una linea craft.\n_Usa il comando inline \"craft\"_"
                });
            } else {
                let res_text = "";
                let used = 0;
                if (on_disk.craft_list.impact) {
                    used = (on_disk.craft_list.impact.base.length + on_disk.craft_list.impact.crafted.length);
                }
                if (used == 0) {
                    return manageUsedInCraft_res({
                        used: 0,
                        text: "Non consumerai alcun oggetto per il craft attuale!"
                    });
                } else if (used == 1) {
                    res_text = "🎒 *Userai un solo oggetto:*\n\n";
                    let tmp_item;
                    if (on_disk.craft_list.impact.base.length == 0) {
                        tmp_item = on_disk.craft_list.impact.crafted[0];
                    } else {
                        tmp_item = on_disk.craft_list.impact.base[0];
                    }
                    res_text += "> " + tmp_item.name + " (" + tmp_item.remaning_quantity + ", " + tmp_item.used_quantity + ")\n";// + " (" + all_splitted[i].array[j].rarity+ ")\n";
                    return manageUsedInCraft_res({
                        craft: true,
                        used: 1,
                        text: res_text
                    });
                } else {
                    let base_array = on_disk.craft_list.impact.base.slice();
                    let crafted_array = on_disk.craft_list.impact.crafted.slice();

                    res_text = "🎒 *Consumerai " + (base_array.length + crafted_array.length) + " oggetti*\n";
                    //res_text += "_per un totale di "+ +" copie_"

                    let allC_splitted = [];
                    let allB_splitted = [];
                    let last_line = "";


                    for (let i = 0; i < items_manager.all_rarity.length; i++) {
                        if (crafted_array.length > 0 && type == "CR") {
                            recursiveRaritySplit(allC_splitted, items_manager.all_rarity[i], crafted_array);
                        }
                        if (base_array.length > 0 && type == "BS") {
                            recursiveRaritySplit(allB_splitted, items_manager.all_rarity[i], base_array);
                        }

                    }

                    if (type == "BS") {
                        if (allB_splitted.length > 0) {
                            if (base_array.length == 1) {
                                res_text += "_Un oggetto base_\n\n";
                            } else {
                                res_text += "_" + base_array.length + " oggetti base_\n\n";
                            }
                            for (let i = 0; i < allB_splitted.length; i++) {
                                if (allB_splitted[i].array.length > 0) {
                                    res_text += "*" + allB_splitted[i].rarity + "*:\n"
                                    for (let j = 0; j < allB_splitted[i].array.length; j++) {
                                        if (allB_splitted[i].array[j].craftable == 0) {
                                            res_text += "> ";
                                        } else {
                                            res_text += "*>* ";
                                        }
                                        res_text += allB_splitted[i].array[j].used_quantity + "x " + allB_splitted[i].array[j].name;

                                        if (allB_splitted[i].array[j].remaning_quantity == 0) {
                                            res_text += " ◬";//"ꜝ";
                                        } else {
                                            res_text += " (" + allB_splitted[i].array[j].remaning_quantity + ") ";// + " (" + allB_splitted[i].array[j].rarity+ ")\n";
                                        }
                                        res_text += "\n";

                                    }
                                    res_text += "\n";
                                }
                            }
                        }
                    } else {
                        if (base_array.length <= 0) {
                            last_line = "\n• Nessun oggetto base consumato"
                        } else if (base_array.length == 1) {
                            last_line = "\n• Ed un oggetto base:\n";
                            last_line += base_array[0].used_quantity + "x " + base_array[0].name;
                        } else {
                            let critical_counter = 0;
                            for (let i = 0; i < base_array.length; i++) {
                                if (base_array[i].remaning_quantity <= 1) {
                                    critical_counter++;
                                }
                            }
                            last_line = "\n• Più " + base_array.length + " oggetti base...\n";
                            if (critical_counter == 1) {
                                last_line += " (di cui un critico!) ◬";
                            } else if (critical_counter > 1) {
                                last_line += " (di cui " + critical_counter + " critici!) ◬";
                            }
                        }
                    }
                    let c_critics = 0;
                    if (type == "CR") {
                        if (allC_splitted.length > 0) {
                            if (crafted_array.length == 1) {
                                res_text += "_Un Creato_\n\n";
                            } else {
                                res_text += "_" + crafted_array.length + " Creati_\n\n";
                            }
                            for (let i = 0; i < allC_splitted.length; i++) {
                                if (allC_splitted[i].array.length > 0) {
                                    res_text += "*" + allC_splitted[i].rarity + "*:\n"
                                    for (let j = 0; j < allC_splitted[i].array.length; j++) {
                                        if (allC_splitted[i].array[j].craftable == 0) {
                                            res_text += "> ";
                                        } else {
                                            res_text += "*>* ";
                                        }
                                        res_text += allC_splitted[i].array[j].used_quantity + "x " + allC_splitted[i].array[j].name;

                                        if (allC_splitted[i].array[j].remaning_quantity == 0) {
                                            res_text += " ◬";//"ꜝ";
                                            c_critics++;
                                        } else {
                                            res_text += " (" + allC_splitted[i].array[j].remaning_quantity + ") ";// + " (" + allC_splitted[i].array[j].rarity+ ")\n";
                                        }
                                        res_text += "\n";

                                    }
                                    res_text += "\n";
                                }
                            }

                            if (c_critics > 0) {
                                last_line = "\n• Critici: " + c_critics + " ◬ " + last_line;
                            }
                        }
                    } else {
                        if (crafted_array.length <= 0) {
                            last_line = "\n• Nessun creato consumato!"
                        } else if (crafted_array.length == 1) {
                            last_line = "\n• Ed un creato:\n";
                            last_line += crafted_array[0].used_quantity + "x " + crafted_array[0].name;
                        } else {
                            let critical_counter = 0;
                            for (let i = 0; i < crafted_array.length; i++) {
                                if (crafted_array[i].remaning_quantity <= 1) {
                                    critical_counter++;
                                }
                            }
                            last_line = "\n• Più " + crafted_array.length + " creati...\n";
                            if (critical_counter == 1) {
                                last_line += " (di cui un critico!) ◬";
                            } else if (critical_counter > 1) {
                                last_line += " (di cui " + critical_counter + " critici!) ◬";
                            }
                        }
                    }


                    return manageUsedInCraft_res({
                        craft: true,
                        text: res_text + last_line,
                        used: (base_array.length + crafted_array.length),
                        base: base_array.length,
                        crafted: crafted_array.length,
                        critics: c_critics
                    });
                }
            }
        });
    });
}


// ON ARGONAUTS
function checkArgonaut(name, message) {
    for (let i = 0; i < globalArgonauts.length; i++) {
        if (typeof globalArgonauts[i].nick != 'undefined' && globalArgonauts[i].nick.toLowerCase() == name.toLowerCase()) {
            return ({ isArgonaut: true, info: globalArgonauts[i] });
        }
    }
    if (typeof message != 'undefined' && message.toLowerCase().indexOf("al") >= 0 && message.toLowerCase().indexOf("ciao") >= 0) {
        globalArgonauts.push({
            role: (name == "nrc382") ? 1 : 0,
            nick: name
        });
        return { isArgonaut: true, info: { nick: name.toLowerCase() } };

    }
    return { isArgonaut: false, info: { nick: name } };
}
module.exports.check = checkArgonaut;

function getArgonaut(fromID) {
    for (let i = 0; i < globalArgonauts.length; i++) {
        if (globalArgonauts[i].id == fromID) {
            return ({ isArgonaut: true, info: globalArgonauts[i] });
        }
    }
    return { isArgonaut: false, info: { id: fromID } };
}

function getLootUsers() {
    return new Promise(function (allLootUsers) {
        return got.get("https://fenixweb.net:6600/api/v2/" + config.loot_token + "/players/", { responseType: 'json' }).then(function (full_infos) {
            let json = full_infos.body;

            if (typeof json.res != "undefined") {
                let all_playersNames = [];
                for (let i = 0; i < json.res.length; i++) {
                    if (json.res[i].greater_50 != 0) {
                        all_playersNames.push(json.res[i].nickname);
                    }
                }
                return allLootUsers(all_playersNames);
            } else {
                return allLootUsers([]);
            }
        }).catch(function (err) {
            console.error(err);
            return allLootUsers(null);
        });
    });
}

function getCurrArgonautsList() {
    return new Promise(function (allLootUsers) {
        return got.get("https://fenixweb.net:6600/api/v2/" + config.loot_token + "/team/Argonauti", { responseType: 'json' }).then(function (full_infos) {
            let json = full_infos.body;

            if (typeof json.res != "undefined" && typeof json.res.members != "undefined") {
                return allLootUsers(json.res.members);
            } else {
                return allLootUsers([]);
            }
        }).catch(function (err) {
            console.error(err);
            return allLootUsers(null);
        });
    });
}

function argoTeamList() {
    return new Promise(function (toSend) {
        return getCurrArgonautsList().then(function (loot_list) {

        });
    });
}

function getArgonautListFrom(array) {
    let madre = [];
    let accademia = [];
    let friends = [];
    let admin_accademia;
    let vice_accademia;
    let bool = false;

    let res = " *Team Madre* ⛵️\n";


    for (let i = 0; i < array.length; i++) {
        if (array[i].madre == "26") {
            if (array[i].role == 0) {
                madre.push("`" + array[i].nick + "`");
            } else {
                bool = true;
                if (array[i].role == 1) {
                    res += "> `" + array[i].nick + "`, _Karellen_ \n";
                } else {
                    res += "> `" + array[i].nick + "`, _il Guercio_\n";
                }
            }
        }
        else if (array[i].madre == "66") {
            if (array[i].role == 0) {
                accademia.push("" + array[i].nick);
            } else {
                if (array[i].role == 1) {
                    admin_accademia = array[i].nick;
                } else if (array[i].role == 2) {
                    vice_accademia = array[i].nick;
                }
            }
        } else {
            friends.push("" + array[i].nick);
        }
    }
    if (madre.length == 0 && !bool) {
        res = "";
    } else {
        res = "\n" + madre.length + res;
    }

    for (let i = 0; i < madre.length; i++) {
        res += "> " + madre[i] + "\n";
    }

    if (accademia.length > 0) {
        res += "\n*" + accademia.length + " Accademia*\n";
        if (admin_accademia) {
            res += "> `" + admin_accademia + "`, _il Reggente_\n";
        }
        if (vice_accademia) {
            res += "> `" + vice_accademia + "`, _lo Sguattero_\n";
        }

        for (let i = 0; i < accademia.length; i++) {
            res += "> `" + accademia[i] + "`\n";
        }
    }
    if (friends.length > 0) {
        res += "\n*" + friends.length + " Amici*\n";
        for (let i = 0; i < friends.length; i++) {
            res += "> `" + friends[i] + "`\n";
        }
    }

    return res;
}

function getArgonautForR(r) {
    let res = [];
    let unknown = [];
    for (let i = 0; i < globalArgonauts.length; i++) {
        if (globalArgonauts[i].rinascita == r) {
            res.push(globalArgonauts[i]);
        }
        else if (globalArgonauts[i].rinascita == null) {
            unknown.push(globalArgonauts[i]);
        }
    }
    console.log("Ho trovato " + res.length + " argonauti r" + r);
    return { result: res, unknown: unknown };
}
function getArgonautForRLessThen(r) {
    let res = [];
    let unknown = [];
    for (let i = 0; i < globalArgonauts.length; i++) {
        if (globalArgonauts[i].rinascita == null) {
            unknown.push(globalArgonauts[i]);
        }
        else if (globalArgonauts[i].rinascita <= r) {
            res.push(globalArgonauts[i]);
        }
    }
    return { result: res, unknown: unknown };
}
function getArgonautForRMoreThen(r) {
    let res = [];
    let unknown = [];

    for (let i = 0; i < globalArgonauts.length; i++) {
        if (globalArgonauts[i].rinascita >= r) {
            res.push(globalArgonauts[i]);
        }
        else if (globalArgonauts[i].rinascita == null) {
            unknown.push(globalArgonauts[i]);
        }
    }
    return { result: res, unknown: unknown };
}

// #GLOBALE
function updateGlobalPos(id, newPos, gain_globalPoint) {
    return new Promise(function (updateGlobalPos_resoult) {
        let query = "INSERT INTO " + model.tables_names.argonauti;
        query += " (id, global_pos, gain_globalPoint)";
        query += " VALUES ?";
        query += " ON DUPLICATE KEY UPDATE id=VALUES(`id`), global_pos=VALUES(`global_pos`), gain_globalPoint=VALUES(`gain_globalPoint`)";

        model.argo_pool.query(query, [[[id, newPos, gain_globalPoint]]],
            function (err, res) {
                if (!err) {
                    return updateGlobalPos_resoult(true);
                }
                else {
                    console.log("Mumble...");
                    console.log(err);
                    return updateGlobalPos_resoult(false);

                }
            });
    });
}
function updateMultipleGlobalPos(in_array) { // in_array = [[id, newPos, gain_globalPoint]]
    return new Promise(function (updateGlobalPos_resoult) {
        console.log(in_array);
        let query = "INSERT INTO " + model.tables_names.argonauti;
        query += " (id, global_pos, gain_globalPoint)";
        query += " VALUES ?";
        query += " ON DUPLICATE KEY UPDATE global_pos=VALUES(`global_pos`), gain_globalPoint=VALUES(`gain_globalPoint`)";

        return model.argo_pool.query(query, [in_array],
            function (err, res) {
                if (!err) {
                    console.log(res.changedRows);
                    return updateGlobalPos_resoult(true);
                }
                else {
                    console.log("Mumble...");
                    console.log(err);
                    return updateGlobalPos_resoult(false);

                }
            });
    });
}

function getGlobalPos(username) {
    return new Promise(function (getGlobalPos_resoult) {
        let query = "SELECT ";
        query += "nick, global_pos, gain_globalPoint ";
        query += " FROM " + model.tables_names.argonauti;
        query += " where nick like ?";

        model.argo_pool.query(query, [username],
            function (err, res) {
                if (!err) {
                    let parse = "0:0:0";
                    if (res[0].global_pos != null) {
                        parse = res[0].global_pos.split(":");
                    }
                    if (parse.length > 0) {
                        res[0].global_pos = parse[0];
                        res[0].global_posPoint = parse[1];
                        res[0].global_posDate = parse[2];
                    } else {
                        res[0].global_pos = null;
                    }

                    getGlobalPos_resoult(res);
                }
                else {
                    console.log("Mumble...");
                    console.log(err);
                    getGlobalPos_resoult(false);
                }
            });
    });
}

function updateCapsulaCounter(messageText) {
    return new Promise(function (updateCapsulaCounter_resoult) {

        let counter = 0;
        let array = messageText.text.split("\n");
        let player = array[0].split(" ")[0];

        for (let i = 1; i < array.length; i++) {
            if (array[i].indexOf("> ") == 0) {
                let pos1 = array[i].indexOf("Scrigno Capsula");
                let pos2 = array[i].indexOf("(U)");
                if (pos1 > 0) {
                    counter += parseInt(array[i].substring(array[i].indexOf("(") + 1, array[i].indexOf(")")));
                } else if (pos2 > 0) {
                    counter += parseInt(array[i].substring(array[i].indexOf(">") + 2, array[i].indexOf("x")));
                }
            }
        }

        if (counter == 0) {
            updateCapsulaCounter_resoult(counter);
        } else {
            let query = "INSERT INTO " + model.tables_names.argonauti;
            query += " (nick, capsula_counter)";
            query += " VALUES ?";
            query += " ON DUPLICATE KEY UPDATE nick=VALUES(`nick`), rinascita=VALUES(`rinascita`),";
            query += " exp=VALUES(`exp`),drago=VALUES(`drago`),drago_lv=VALUES(`drago_lv`),rango=VALUES(`rango`)";
            let toSet = [player, counter];
            model.argo_pool.query(query, [[toSet]],
                function (error) {
                    if (!error) {
                        updateCapsulaCounter_resoult(counter);
                    } else {
                        updateCapsulaCounter_resoult(false);
                    }

                });


        }
    });
}

function emojiCount(str) {
    const joiner = "\u{200D}";
    const split = str.split(joiner);
    let count = 0;

    for (const s of split) {
        if (s != null) {
            count += Array.from(s.split(/[\ufe00-\ufe0f]/).join("")).length;;
        }

    }
    return count / split.length;
}

function updateAbility(username, toAnalyze) {
    return new Promise(function (updateAbility_res) {
        let ability = parseInt(toAnalyze.substring(toAnalyze.indexOf(", possiedi ") + ", possiedi ".length, toAnalyze.indexOf(" punti abilità!")));
        let ispezione_InLimit = parseInt(toAnalyze.substring(toAnalyze.indexOf(", subirne ") + ", subirne ".length, toAnalyze.indexOf(" e spiare")));
        let ispezione_OutLimit = parseInt(toAnalyze.substring(toAnalyze.indexOf("ancora effettuare ") + "ancora effettuare ".length, toAnalyze.indexOf(", subirne ")));

        if (isNaN(ability * ispezione_InLimit * ispezione_OutLimit)) {
            updateAbility_res("Pardon, non sono riuscito a parsare il messaggio...");
        } else {
            let query = "INSERT INTO " + model.tables_names.argonauti;
            query += " (nick, ability, ispezione_InLimit, ispezione_OutLimit)";
            query += " VALUES ?";
            query += " ON DUPLICATE KEY UPDATE nick=VALUES(`nick`), ability=VALUES(`ability`),";
            query += " ispezione_InLimit=VALUES(`ispezione_InLimit`),ispezione_OutLimit=VALUES(`ispezione_OutLimit`)";
            let toSend = [username, ability, ispezione_InLimit, ispezione_OutLimit];
            model.argo_pool.query(query, [[toSend]],
                function (err) {
                    if (!err) {
                        updateAbility_res(true);
                    }
                    else {
                        console.log(err);
                        updateAbility_res(false);
                    }
                });

        }


    });
}

function updateLocalArray(nickname, infos) {
    return new Promise(function (updateLocalArray_res) {
        let res = {};
        for (let i = 0; i < globalArgonauts.length; i++) {
            if (globalArgonauts[i].nick === nickname) {
                if (typeof infos.nick != 'undefined') {
                    res.oldName = globalArgonauts[i].nick;
                    globalArgonauts[i].nick = infos.nick;
                }
                if (typeof infos.role != 'undefined') {
                    res.oldRole = globalArgonauts[i].role;
                    globalArgonauts[i].role = infos.role;
                }
                if (typeof infos.party != 'undefined') {
                    res.oldParty = globalArgonauts[i].party;
                    globalArgonauts[i].party = infos.party;
                }
                if (typeof infos.madre != 'undefined') {
                    res.oldMadre = globalArgonauts[i].madre;
                    globalArgonauts[i].madre = infos.madre;
                }
                if (typeof infos.rango != 'undefined') {
                    res.oldRango = globalArgonauts[i].rango;
                    globalArgonauts[i].rango = infos.rango;
                }
                if (typeof infos.exp != 'undefined') {
                    res.oldExp = globalArgonauts[i].exp;
                    globalArgonauts[i].exp = infos.exp;
                }
                if (typeof infos.rinascita != 'undefined') {
                    res.oldRinascita = globalArgonauts[i].rinascita;
                    globalArgonauts[i].rinascita = infos.rinascita;
                }
                if (typeof infos.last_update != 'undefined') {
                    res.oldUpdate = globalArgonauts[i].last_update;
                    globalArgonauts[i].last_update = infos.last_update;
                }
                if (typeof infos.drago != 'undefined') {
                    res.oldDrago = globalArgonauts[i].drago;
                    globalArgonauts[i].drago = infos.drago;
                }
                if (typeof infos.drago_lv != 'undefined') {
                    res.drago_lv = globalArgonauts[i].drago_lv;
                    globalArgonauts[i].drago_lv = infos.drago_lv;
                }
                if (typeof infos.artefatti_n != 'undefined') {
                    res.artefatti_n = globalArgonauts[i].artefatti_n;
                    globalArgonauts[i].artefatti_n = infos.artefatti_n;
                }
                if (typeof infos.artefatti_n != 'undefined') {
                    res.artefatti_n = globalArgonauts[i].artefatti_n;
                    globalArgonauts[i].artefatti_n = infos.artefatti_n;
                }
                if (typeof infos.ability != 'undefined') {
                    res.ability = globalArgonauts[i].ability;
                    globalArgonauts[i].ability = infos.ability;
                }
                if (typeof infos.craft_pnt != 'undefined') {
                    res.craft_pnt = globalArgonauts[i].craft_pnt;
                    globalArgonauts[i].craft_pnt = infos.craft_pnt;
                }
                if (typeof infos.mana != 'undefined') {
                    res.mana = globalArgonauts[i].mana;
                    globalArgonauts[i].mana = infos.mana;
                }
                if (typeof infos.last_update != 'undefined') {
                    res.last_update = globalArgonauts[i].last_update;
                    globalArgonauts[i].last_update = infos.last_update;
                }
                if (typeof infos.global_pos != 'undefined') {
                    res.global_pos = globalArgonauts[i].global_pos;
                    globalArgonauts[i].global_pos = infos.global_pos;
                }
                if (typeof infos.gain_globalPoint != 'undefined') {
                    res.gain_globalPoint = globalArgonauts[i].gain_globalPoint;
                    globalArgonauts[i].gain_globalPoint = infos.gain_globalPoint;
                }
                res.nick = nickname;
                console.log("Aggiornate info su " + nickname);
                updateLocalArray_res(res);
                break;
            }
        }

        if (res.length <= 0) {
            console.log("Non ho trovato: " + nickname);

            globalArgonauts.push({
                id: infos.id,
                role: infos.role,
                nick: nickname,
                party: infos.party,
                madre: infos.madre,
                rango: infos.rango,
                exp: infos.exp,
                rinascita: infos.rinascita,
                last_update: infos.last_update,
                drago_lv: infos.drago_lv,
                global_pos: -1,
                global_posDate: -1,
                global_posPoint: -1,
                gain_globalPoint: infos.gain_globalPoint,
            });

            updateLocalArray_res(false)
        }


    });
}

function parseStoricoIspezioni(text_array, user) {
    return new Promise(function (parseStoricoIspezioni_res) {
        let text = "📃 Storico Ispezioni di *" + user.split("_").join("\\_") + "*\n";

        let avviate_counter = 0;
        let subite_counter = 0;
        let argo_subite = 0;
        let argo_avviate = 0;
        let vinte_subite = 0;
        let vinte_avviate = 0;

        let tmp_line;
        let boolean = false;

        // avviate_counter / 100 = vinte_avviate / x -> x = vinte_avviate*100/avviate_counter

        for (let i = 1; i < text_array.length; i++) {
            if (text_array[i] == "Subite:") {
                boolean = true;
            } else {
                tmp_line = text_array[i].split(" ");
                if (tmp_line.length > 1) {
                    if (boolean) {
                        subite_counter++;
                    } else {
                        avviate_counter++;
                    }

                    if (tmp_line[1] == "Vinta") {
                        if (boolean) {
                            vinte_subite++;
                        } else {
                            vinte_avviate++;
                        }
                    }

                    if (checkArgonaut(tmp_line[3]).isArgonaut) {
                        if (boolean) {
                            argo_subite++;
                        } else {
                            argo_avviate++;
                        }
                    }
                }
            }

        }


        if (avviate_counter >= 0) {
            if (avviate_counter == 1) {
                text += "\n*Una* ispezione avviata\n";
            } else {
                text += "\n*" + avviate_counter + "* ispezioni avviate\n";
            }
            text += "> Tasso di Entrata: " + ((vinte_avviate * 100) / avviate_counter).toFixed(1) + "%\n";
            text += "  Su Argonauti: " + ((argo_avviate * 100) / avviate_counter).toFixed(1) + "%\n";
        }
        if (subite_counter >= 0) {
            if (subite_counter == 1) {
                text += "\n*Una* ispezione subita\n";
            } else {
                text += "\n*" + subite_counter + "* ispezioni subite\n";
            }
            text += "  Tasso di Entrata: " + (100 - ((vinte_subite * 100) / subite_counter)).toFixed(1) + "%\n";
            text += "  Da Argonauti: " + ((argo_subite * 100) / subite_counter).toFixed(1) + "%\n\n";
        }

        parseStoricoIspezioni_res(text);

    });
}

function getGlobalInfos() {
    return new Promise(function (getGlobalInfos_res) {
        let nowDate = Date.now() / 1000;
        console.log("> getGlobalInfos, son passati: " + (nowDate - (isNaN(globalInfos.last_update) ? 0 : globalInfos.last_update)));
        if (globalInfos.global_on != null && (nowDate - (isNaN(globalInfos.last_update) ? 0 : globalInfos.last_update)) < 60 * 60) {
            return getGlobalInfos_res(globalInfos);
        } else {
            return got.get("https://fenixweb.net:6600/api/v2/" + config.loot_token + "/info", { responseType: 'json' }).then(function (full_infos) {
                let infos = full_infos.body;

                if (!Array.isArray(infos.res)) {
                    return getGlobalInfos_res(false);
                }
                return loadGlobalPlotData().then(function (curr_plot) {
                    if (curr_plot.data == false) {
                        return getGlobalInfos_res(infos.res[0]);
                    } else {
                        curr_plot.data.cap = infos.res[0].global_cap;
                        console.log("Aggiornato il cap nel plot data");
                        return saveGlobalPlotData(curr_plot.data).then(function (save_esit) {
                            console.log(save_esit);
                            return getGlobalInfos_res(infos.res[0]);
                        });
                    }
                });
            });
        }
    });
}

function getGlobalDetail() {
    return new Promise(function (getGlobalDetail_res) {
        let nowDate = Date.now() / 1000;
        console.log("> updateGlobal, son passati: " + (nowDate - (isNaN(globalInfos.last_update) ? 0 : globalInfos.last_update)));

        return getGlobalInfos().then(function (global_infos) {
            if (global_infos.global_on == 0) {
                return getGlobalDetail_res(false);
            } else {

                return got.get("https://fenixweb.net:6600/api/v2/" + config.loot_token + "/global", { responseType: 'json' }).then(function (full_infos) {
                    let global_dettails = full_infos.body;
                    if (Array.isArray(global_dettails.res)) {
                        let tmp_date;
                        let starting_index = -1;
                        nowDate = new Date(nowDate * 1000);
                        //console.log("> Siamo nel mese: "+nowDate.getUTCMonth()+". Totale dati disponibili: " + global_dettails.res.length);

                        for (let i = 1; i <= global_dettails.res.length; i++) {
                            tmp_date = new Date(global_dettails.res[i].insert_time);
                            if (tmp_date.getUTCMonth() == nowDate.getUTCMonth()) {
                                starting_index = i;
                                break;
                            } else {
                                // console.log("> Scarto un mese diverso: " + tmp_date.getUTCMonth());
                                // console.log("> Valore: "+global_dettails.res[i].value+", mese "+tmp_date.getUTCMonth());
                            }
                        }
                        console.log("> Parto dal risultato n: " + starting_index);

                        if (starting_index > 0) {
                            let tmp_array = [];
                            let tmpComplex_array = [];
                            global_dettails.res = global_dettails.res.slice(starting_index, global_dettails.res.length);
                            console.log("> Primo risultato: " + global_dettails.res[0].value);

                            //let tmp_day;
                            let tmp_sum = 0;
                            let tmp_dataArray = [];
                            let tmp_playerArray = [];
                            for (let i = 1; i <= global_dettails.res.length; i++) {
                                //tmp_day = new Date(global_dettails.res[i].insert_time);
                                tmp_dataArray.push(global_dettails.res[i - 1].value);
                                tmp_playerArray.push(global_dettails.res[i - 1].players);


                                if (((i % 24 == 0)) || i == (global_dettails.res.length)) {
                                    console.log("> Inserisco " + tmp_array.length + " dati per il giorno passato");
                                    tmpComplex_array.push({ data: tmp_dataArray, players: tmp_playerArray });
                                    tmp_dataArray = [];
                                    tmp_playerArray = [];
                                }
                            }
                            //console.log("> Ultimo risultato: (primo g) " + tmpComplex_array[0].data[ tmpComplex_array[0].data.length - 1 ] );

                            let definitive_array = [];

                            //let tmp_dataArray = [];
                            for (let i = 0; i < tmpComplex_array.length; i++) {
                                //console.log(" > Giorno: " + (i + 1));
                                tmp_dataArray = [];

                                if (i > 0) {
                                    tmp_dataArray.push({
                                        dataDiff: tmpComplex_array[i].data[0] - tmpComplex_array[i - 1].data[(tmpComplex_array[i - 1].data.length - 1)],
                                        playersDif: tmpComplex_array[i].players[0] - tmpComplex_array[i - 1].players[(tmpComplex_array[i - 1].players.length - 1)]
                                    });
                                } else {
                                    tmp_dataArray.push({
                                        dataDiff: tmpComplex_array[0].data[0],
                                        playersDif: tmpComplex_array[i].players[0]
                                    });
                                }

                                for (let j = 1; j < tmpComplex_array[i].data.length; j++) {
                                    tmp_dataArray.push({
                                        dataDiff: (tmpComplex_array[i].data[j] - tmpComplex_array[i].data[j - 1]),
                                        playersDif: (tmpComplex_array[i].players[j] - tmpComplex_array[i].players[j - 1])
                                    });
                                }
                                definitive_array.push(tmp_dataArray);
                            }
                            //console.log(definitive_array);

                            let line = "`——————`"
                            let numberFormat = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
                            let res_text = "*Dettagli sulla globale in corso*\n\n> Giorni passati: " + definitive_array.length + "\n\n";
                            res_text += `${line}\n`;

                            let total_count = 0;
                            let tmp_players = 0;
                            let full_days = 0;
                            for (let i = 0; i < definitive_array.length; i++) {
                                tmp_sum = 0;
                                tmp_players = 0;
                                for (let j = 0; j < definitive_array[i].length; j++) {
                                    tmp_sum += parseInt(definitive_array[i][j].dataDiff);
                                    tmp_players += parseInt(definitive_array[i][j].playersDif);
                                }

                                if (definitive_array[i].length == 24) {
                                    res_text += "✓ ";
                                    full_days++;
                                } else {
                                    res_text += "> ";
                                }
                                res_text += (i + 1) + "°: " + numberFormat.format(tmp_sum).split(",").join(".") + (tmp_players != 0 ? " (+" + tmp_players + " p.)" : "") + "\n";

                                total_count += tmp_sum;
                            }


                            res_text += `${line}\n\n`;
                            res_text += "> Totale: " + numberFormat.format(total_count) + "\n";
                            res_text += "> Media necessaria: ~"+  numberFormat.format(Math.floor(globalInfos.global_cap/30) )+ "\n";
                            res_text += "> Media " + (full_days == definitive_array.length ? ": " : "parziale: ") + numberFormat.format(total_count / full_days) + "\n";
                            let enlapsed_min = nowDate.getMinutes();
                            if (enlapsed_min == 1) {
                                res_text += "> Ultimo minuto: ";
                            } else {
                                res_text += "> Ultimi " + enlapsed_min + " minuti: ";

                            }
                            res_text += numberFormat.format(global_infos.global_tot - total_count) + "\n";
                            let media = numberFormat.format((tmp_sum / global_infos.global_members));
                            res_text += "\n*" + global_infos.global_members + " partecipanti, contributo medio:*\n";
                            res_text += "> Di oggi: " + media + "\n";
                            res_text += "> Totale: " + numberFormat.format((global_infos.global_tot / global_infos.global_members))+"\n";
                            res_text += "> Per il punto: " + parseLong(Math.floor(globalInfos.global_cap/globalInfos.global_members)) + "\n";
                            //necessario 
                            console.log("> total_count:" + total_count);
                            console.log("> tmedia:" + media);//media

                            return getGlobalDetail_res(res_text);
                        }
                    }
                });
            }
        });


    });
}

function updateGlobal() {
    return new Promise(function (updateGlobal_res) {
        let nowDate = Date.now() / 1000;
        console.log("> updateGlobal, son passati: " + (nowDate - (isNaN(globalInfos.last_update) ? 0 : globalInfos.last_update)));
        if (globalInfos.global_on != null && (nowDate - (isNaN(globalInfos.last_update) ? 0 : globalInfos.last_update)) < 60 * 60) {
            updateGlobal_res(globalInfos);
        } else {
            return getGlobalInfos().then(function (infos) {
                if (infos == false) {
                    return updateGlobal_res(false);
                } else {
                    globalInfos.global_on = infos.global_on;
                    globalInfos.global_cap_hide = infos.global_cap_hide;
                    globalInfos.global_tot = infos.global_tot;
                    globalInfos.global_cap = infos.global_cap;
                    globalInfos.global_members = infos.global_members;
                    globalInfos.global_limit = (infos.global_cap > 0 ? (infos.global_cap / infos.global_members) : 0);

                    globalInfos.last_update = nowDate;

                    return updateGlobal_res(globalInfos);
                }
            });
        }
    })
}

function workPlotData(definitive_array, type, param, curr_point, isPrivate) {
    console.log("> workPlotData, giorni: " + definitive_array.length + " type: " + type + ", param: " + param);
    let res_array = [];
    let tmp_delta;
    let acc_delta = 0;

    let tmp_proportion;
    let proportion_ref;
    console.log("CAP: " + globalInfos.global_cap);
    if (globalInfos.global_cap != 0) {
        proportion_ref = globalInfos.global_cap;
    } else {
        proportion_ref = curr_point;
    }
    let max_col = isPrivate ? 13 : 18;

    for (let i = 0; i < definitive_array.length; i++) {
        //if (globalInfos.global_cap > definitive_array[i][definitive_array[i].length - 1]) {

        let tmp_records = definitive_array[i].length;
        tmp_delta = parseFloat((definitive_array[i][tmp_records - 1] - definitive_array[i][0]) / tmp_records);
        tmp_proportion = (((tmp_delta * 24) * 100) / proportion_ref);
        if (tmp_proportion < 0) {
            tmp_proportion = 0;
        }

        //console.log("> Giorno " + i + " -> " + tmp_records + " dati");
        //console.log("> " + i + ": " + tmp_proportion + "\t(" + proportion_ref + ", " + tmp_delta + ")");

        acc_delta += tmp_proportion;

        if (param > 1 || (param == 1 && definitive_array.length < max_col)) {
            for (let j = 0; j < param; j++) {
                if (type == "RITMO") {
                    res_array.push(tmp_proportion);
                } else if (type == "PROG") {
                    res_array.push(acc_delta);
                }
            }
        } else {
            //            console.log("> Uno ogni 2!");

            if (i % 3 != 0) {
                if (type == "RITMO") {
                    res_array.push(tmp_proportion);
                } else if (type == "PROG") {
                    res_array.push(acc_delta);
                }
            }

        }

        //}
    }
    if (type == "PROG" && (curr_point == globalInfos.global_cap)) {
        res_array[(res_array.length - 1)] = 100;
    }

    return ({ parsed_array: res_array, acceleration: (acc_delta / definitive_array.length) });
}

function globalPlotManager(type, param, isPrivate) {
    return new Promise(function (globalPlotManager_res) {
        return loadGlobalPlotData().then(function (globalPlot) {
            let nowDate = Date.now() / 1000;
            if (!globalPlot.data || (nowDate - parseInt(globalPlot.data.last_update) > 60 * 60)) {
                console.log("> Ri-Aggiorno il dataset del plot, diff: " + (nowDate - parseInt(globalPlot.data.last_update)));

                return got.get("https://fenixweb.net:6600/api/v2/" + config.loot_token + "/global", { responseType: 'json' }).then(function (full_infos) {
                    let global_dettails = full_infos.body;

                    if (typeof global_dettails.res != 'undefined') {
                        console.log("> dati disponibili: " + global_dettails.res.length);
                        let tmp_date;
                        let starting_index = -1;
                        nowDate = new Date(nowDate * 1000);
                        for (let i = 1; i <= global_dettails.res.length; i++) {
                            tmp_date = new Date(global_dettails.res[i].insert_time);
                            if (tmp_date.getUTCMonth() == nowDate.getUTCMonth()) {
                                starting_index = i;
                                break;
                            }
                        }
                        if (starting_index > 0) {
                            let tmp_array = [];
                            let definitive_array = [];
                            global_dettails.res = global_dettails.res.slice(starting_index, global_dettails.res.length);
                            let curr_global_point_count = parseFloat(global_dettails.res[global_dettails.res.length - 1].value);
                            console.log(curr_global_point_count);

                            for (let i = 1; i <= global_dettails.res.length; i++) {
                                if (type == "RITMO") {
                                    if (global_dettails.res[i - 1].value < curr_global_point_count) {
                                        tmp_array.push(global_dettails.res[i - 1].value);
                                    }
                                } else {
                                    tmp_array.push(global_dettails.res[i - 1].value);
                                }
                                if (tmp_array.length > 0) {
                                    if ((i % 24 == 0) || i == (global_dettails.res.length)) {
                                        definitive_array.push(tmp_array);
                                        tmp_array = [];
                                    }
                                }

                            }
                            // if (tmp_array.length > 0){
                            //     definitive_array.push(tmp_array);
                            // }


                            let res_array = workPlotData(definitive_array, type, param, curr_global_point_count, isPrivate).parsed_array;

                            let json_data = {
                                cap: globalInfos.global_cap,
                                last_days_data: definitive_array[definitive_array.length - 1].length,
                                last_update: Date.now() / 1000,
                                curr_point: curr_global_point_count,
                                data_array: definitive_array
                            }

                            return saveGlobalPlotData(json_data).then(function (save_res) {
                                console.log(save_res);
                                return globalPlotManager_res({ cap: globalInfos.global_cap, data_array: res_array, last_days_data: json_data.last_days_data, last_update: json_data.last_update, days_count: definitive_array.length });
                            });
                        }
                    } else {
                        return globalPlotManager_res({ data_array: [] });
                    }
                });
            } else {
                console.log("Dai dati interni!");
                //console.log(globalPlot.data);
                let res_array = workPlotData(globalPlot.data.data_array, type, param, globalPlot.data.curr_point, isPrivate).parsed_array;
                return globalPlotManager_res({ cap: globalPlot.data.cap, data_array: res_array, last_days_data: globalPlot.data.last_days_data, last_update: globalPlot.data.last_update, days_count: globalPlot.data.data_array.length });
            }
        })
    });
}

function getGlobalPlot(type, param, isPrivate) {
    return new Promise(function (globalPlot_res) {
        console.log("> getGlobalPlot for: " + type + ", param: " + param + " (isPrivate? " + isPrivate + ")");
        //console.log("> global_cap <-" + globalInfos.global_cap);
        return globalPlotManager(type, param, isPrivate).then(function (plot_res) {
            console.log("> plot_res.data_array.length: " + plot_res.data_array.length);
            console.log("> CAP: " + plot_res.cap);

            if (plot_res.data_array.length > 0) {
                let nowDate = new Date(Date.now());
                let graph_array = plot_res.data_array.slice();
                let linear_array = [];

                let truncate_bool = false;
                let dif = plot_res.days_count;
                let max_col = isPrivate ? 13 : 18;

                if (plot_res.data_array.length > max_col) {
                    truncate_bool = true;
                    graph_array = graph_array.slice(-max_col);
                    dif = Math.round(plot_res.days_count / param);
                }

                console.log("> L graph_array " + graph_array.length);
                console.log("> graph_array\n" + graph_array);
                //console.log("> graph_array[1] " + graph_array[1]);

                let m_days = new Date(nowDate.getFullYear(), nowDate.getMonth(), 0).getDate();
                //let total_days = Math.min(max_col, m_days);
                let nec_media = (plot_res.cap / m_days);
                let starter = 0;
                for (let i = 0; i < m_days; i++) {
                    if (starter > plot_res.cap) {
                        break;
                    } else {
                        let tmp_array = [];
                        for (let j = 0; j < 24; j++) {
                            starter += (nec_media / 24);

                            tmp_array.push(Math.floor(starter));
                        }
                        linear_array.push(tmp_array);
                    }
                }


                linear_array = workPlotData(linear_array, type, param, plot_res.cap, isPrivate).parsed_array;
                linear_array = linear_array.slice(-max_col);
                console.log("> linearA.l\n" + linear_array.length);
                console.log("> linearA\n" + linear_array);




                let string = ascii_char.plot([linear_array, graph_array], {
                    offset: 2,
                    padding: '      ',
                    height: 10,
                    format: function (x, i) {
                        let module = 0;
                        if (type == "RITMO") {
                            if (i % 2 == 0) {
                                module = 1;
                            }
                        } else if (i % 5 == 0) {
                            module = 1;
                        }
                        if (module == 1) {
                            let to_res = (x).toFixed(1).toString();
                            to_res = to_res.substring(0, Math.min(5, to_res.length)) + "% ";
                            console.log("> " + to_res + "(" + to_res.length + ")");
                            to_res = ("       " + to_res).slice(-7);
                            //console.log("Ritorno: " + to_res);

                            return to_res;
                        } else {
                            return ("       ").slice(-7);
                        }
                    }
                });
                //string = string.split("\n").slice(1).join("\n");

                if (plot_res.last_days_data < 24) { // il puntino finale
                    let plot_array = string.split("\n");
                    for (let i = 0; i < plot_array.length; i++) { //─ ─ 
                        if (plot_array[i].charAt(plot_array[i].length - 2) == "╰" || plot_array[i].charAt(plot_array[i].length - 2) == "╭" || plot_array[i].charAt(plot_array[i].length - 2) == "─") {
                            plot_array[i] = plot_array[i].substring(0, plot_array[i].length - 1) + "•";
                        }
                    }
                    string = plot_array.join("\n");
                }


                let res_text = getCurrGlobalTitle(nowDate) + "\n";

                if (type == "PROG") {
                    res_text += "_Progresso Medio ";
                    if (!truncate_bool) {
                        res_text += "in " + plot_res.days_count;
                    } else {
                        if (dif > 1) {
                            res_text += "negli ultimi " + dif;
                        } else {
                            res_text += "nell'ultimo ";
                        }
                    }

                } else {
                    res_text += "_Ritmo Medio ";
                    if (!truncate_bool) {
                        res_text += "di " + plot_res.days_count;
                    } else {
                        if (dif > 1) {
                            res_text += "degli ultimi " + dif;
                        } else {
                            res_text += "dell'ultimo ";
                        }
                    }
                }
                res_text += (dif >= 2 ? " giorni_" : "giorno_");
                if (plot_res.days_count % param != 0) {
                    res_text += " (circa)";
                }

                //console.log(string);
                res_text += "\n\n```\n" + string + "\n```";

                return globalPlot_res(res_text);
            } else {
                console.log("> Dati vuoti...");
                return globalPlot_res("Errore processando i dati della globale...");

            }
        });
    });
}

function getTooOldGlobalInfos() {
    return new Promise(function (getTooOldGlobalInfos_res) {
        model.argo_pool.query("SELECT * FROM Argonauti WHERE global_pos IS NOT NULL AND madre != 99", function (err, res) {
            if (res.length > 0) {
                let finalText = [];
                let toParse;
                let nowDate = Date.now() / 1000;

                let today = new Date(nowDate * 1000);
                let argoDay;
                let tmp_line;
                for (let i = 0; i < res.length; i++) {
                    toParse = res[i].global_pos.split(":");
                    if (toParse.length == 3) {
                        argoDay = new Date(toParse[2] * 1000);
                        tmp_line = "";
                        tmp_line += "> ";

                        if (argoDay.getFullYear() < today.getFullYear() || argoDay.getMonth() < today.getMonth()) {
                            tmp_line += "⇊ ";
                        } else if ((nowDate - toParse[2]) > 3600) {
                            tmp_line += "↓ "
                        } else {
                            tmp_line += "✓ "
                        }
                        tmp_line += "@" + res[i].nick.split("_").join("\\_") + " (" + parseDate(toParse[2] * 1000) + ")\n";
                        finalText.push(tmp_line);
                    } else {
                        tmp_line += "> ﹗ @" + res[i].nick.split("_").join("\\_") + " (*Mai!*)\n";
                        finalText.push(tmp_line);
                    }
                }
                getTooOldGlobalInfos_res(finalText);
            } else {
                getTooOldGlobalInfos_res(null);

            }

        });
    });
}

function getCurrGlobal(usr_id, deletable, fromUsername, inText, is_inline) {
    return new Promise(function (getCurrGlobal_resolve) {
        return updateGlobal().then(function (infos) {
            let fromArgonaut = checkArgonaut(fromUsername);
            if (typeof infos.res == false) {
                return getCurrGlobal_resolve(simpleDeletableMessage(usr_id, deletable, "😶 Whoops!\nNon sono riuscito a comunicare con il server di Loot..."));
            } else {
                let text;
                let inline_desc = "";
                if (globalInfos.global_cap_hide == 1) {
                    text = "😶\nIl cap di questa globale non è ancora noto...\n";
                    text += "\nPunteggio attuale: " + parseLong(globalInfos.global_tot) + "\n";
                    if (globalInfos.global_limit > 0) {
                        text += "Soglia punto: *" + globalInfos.global_limit + "*\n";
                    }
                    text += "\n";
                    inline_desc = "CAP: nascosto";
                    inline_desc += "\nPunteggio: " + parseLong(globalInfos.global_tot);
                    inline_desc += "\nPartecipanti: " + parseLong(globalInfos.global_members).split("*").join("");
                } else {
                    if (globalInfos.global_on != 1) {
                        text = "🎉 *Completata!* 😌\n";
                        inline_desc = "Completata! 😌";

                    } else {
                        let toDay = new Date();
                        //let startDay = new Date(toDay.getUTCFullYear(), toDay.getUTCMonth(), 1).getUTCDate();
                        //let enlapsedDays= toDay.getUTCDate() - startDay;  
                        text = getCurrGlobalTitle(toDay) + "\n";
                        text += "⛏ ...*In Corso* ";
                        let progress = Math.floor(((globalInfos.global_tot * 100) / globalInfos.global_cap) * 100) / 100;
                        let remaining = 100 - progress;
                        let remaningD = Math.floor((toDay.getUTCDate() * remaining) / progress);
                        let endDay = toDay.getUTCDate() + remaningD;
                        let partialText = "\nProgresso: *" + progress + "*%\n";
                        inline_desc = "Progresso: " + progress + "%";
                        let thisM = toDay.getUTCMonth() + 1;
                        let max = 31;
                        if (thisM == 4 || thisM == 6 || thisM == 9 || thisM == 11) {
                            max = 30;
                        } else if (thisM == 2) {
                            max = 28;
                        }
                        if (endDay > max) {
                            partialText += "Di questo passo... *Fallisce!*\n";
                            let difference = (endDay - max);
                            console.log("Giorni rimanenti: " + difference + ", percentuale: " + remaining)
                            if (remaningD <= 3 && remaining >= 20) {
                                partialText += "(_a meno di un miracolo_)\n";
                            } else if (difference <= 1) {
                                partialText += "(_per un pugno di ore..._)\n";
                            } else {
                                if (difference < 2) {
                                    partialText += "(_per appena qualche giorno in più..._)\n";
                                }
                                else if (difference < 6) {
                                    partialText += "(_ci fossero altri " + difference + " giorni almeno..._)\n";
                                } else if (difference > 15) {
                                    partialText += "(_magari con un paio di mesi..._)\n";
                                } else {
                                    partialText += "(_ci vorrebbero altri " + difference + " giorni o più_)\n";
                                }

                            }
                            partialText = "🙁\n" + partialText;
                        } else {
                            if (progress > 97) {
                                partialText = "😃\n" + partialText + "\nSta finendo, non fallisce!\n";
                            } else {
                                partialText += "Possibile fine: ";
                                if (remaningD < 1) {
                                    partialText += "Tra poche ore"
                                } else {
                                    if (endDay == "11" || endDay == "8" || endDay == "1") {
                                        partialText += "l'";
                                    } else {
                                        partialText += "il ";
                                    }
                                    partialText += endDay + " (tra " + remaningD + "g)\n";
                                }

                                if (max - endDay <= 2) {
                                    partialText = "😬\n" + partialText;
                                } else {
                                    partialText = "☺️\n" + partialText;
                                }

                            }
                        }
                        text += partialText;

                        text += "\nPartecipanti: " + parseLong(globalInfos.global_members);

                    }
                    inline_desc += "\nPartecipanti: " + parseLong(globalInfos.global_members).split("*").join("");

                    if (globalInfos.global_cap > 0) {
                        text += "\nCap: " + parseLong(globalInfos.global_cap) + "\n";
                        text += "Soglia punto: *" + parseLong(Math.floor(globalInfos.global_cap/globalInfos.global_members)) + "*\n";
                    }

                }
                if (globalInfos.argo_point > globalInfos.global_limit) {
                    text += "Soglia Argonauta: *" + parseLong(globalInfos.argo_point) + "*\n";
                }
                text += "\n";

                if (fromArgonaut.isArgonaut == true && inText.length > 0 && inText.indexOf("semplice") >= 1) {
                    fromArgonaut.isArgonaut = false;
                }
                let functional_buttons = [[
                    {
                        text: "📊 Ritmo",
                        callback_data: 'ARGO:GLOBAL:RITMO'
                    }, // 
                    {
                        text: "ⓘ Info",
                        callback_data: 'ARGO:GLOBAL:INFO'
                    },
                    {
                        text: "📈 Grafico",
                        callback_data: 'ARGO:GLOBAL:PROG'
                    }
                ], [
                    {
                        text: "🔄",
                        callback_data: 'ARGO:GLOBAL:REFRESH'
                    }
                ]];


                if (is_inline == true || (fromArgonaut.isArgonaut != true || (globalInfos.global_on != 1))) {
                    let update = new Date(globalInfos.last_update * 1000);
                    if (update.getHours() == 1) {
                        text += "\n_All'";
                    } else {
                        text += "\n_Alle "
                    }
                    text += String("0" + update.getHours()).slice(-2) + ":" + String("0" + update.getMinutes()).slice(-2) + "_";

                    let res_mess = simpleDeletableMessage(usr_id, deletable, text);
                    if (globalInfos.global_cap_hide != 1) {
                        res_mess.options.reply_markup.inline_keyboard.push([
                            {
                                text: "📊",
                                callback_data: 'ARGO:GLOBAL:RITMO'
                            },  {
                                text: "ⓘ",
                                callback_data: 'ARGO:GLOBAL:INFO'

                            }, {
                                text: "📈",
                                callback_data: 'ARGO:GLOBAL:PROG'
                            }
                        ]);
                    }
                    res_mess.options.reply_markup.inline_keyboard.push([
                        {
                            text: "🔄",
                            callback_data: 'ARGO:GLOBAL:REFRESH'
                        }
                    ]);
                    if (is_inline == true) {

                        return getCurrGlobal_resolve(
                            {
                                inline: {
                                    title: getCurrGlobalTitle(new Date()).split("*").join(""),
                                    to_send: text,
                                    desc: inline_desc
                                },
                                buttons: functional_buttons,
                                complete_msg: res_mess
                            });

                    } else {
                        return getCurrGlobal_resolve(res_mess);
                    }
                } else {
                    return model.argo_pool.query("SELECT * FROM Argonauti WHERE global_pos IS NOT NULL", function (err, res) {
                        if (res.length > 0) {
                            let list = [];
                            let friends = [];
                            let nowDate = Date.now() / 1000;
                            let toDay = new Date(nowDate * 1000);
                            let counter = 0;
                            //let obsolete_counter = 0;
                            //let notIspezionable = [];
                            //let condition;
                            globalInfos.argo_point = 0;

                            for (let i = 0; i < res.length; i++) {
                                toParse = res[i].global_pos.split(":");

                                if (typeof toParse[0] != 'undefined') {
                                    toParse[0] = parseInt(toParse[0].split(".").join(""));
                                } else {
                                    toParse[0] = 0;
                                }
                                if (typeof toParse[1] != 'undefined') {
                                    toParse[1] = parseInt(toParse[1].split(".").join(""));
                                } else {
                                    toParse[1] = 0;
                                }
                                if (typeof toParse[2] != 'undefined') {
                                    toParse[2] = parseInt(toParse[2].split(".").join(""));
                                } else {
                                    toParse[2] = 0;
                                }
                                console.log("Punteggio di " + res[i].nick + ": " + toParse[1]);


                                // if ((res[i].ispezione_InLimit == 0 && res[i].madre != 0) && !(toDay.getHours() < 9)) {
                                //     notIspezionable.push({ nick: res[i].nick, pos: parseInt(toParse[0]), point: parseInt(toParse[1]), update: parseInt(toParse[2]), gain_globalPoint: res[i].gain_globalPoint, ability: res[i].ability, ispezione_InLimit: res[i].ispezione_InLimit });
                                // } else {
                                let extended_date = new Date(toParse[2] * 1000);
                                console.log(`ex: ${extended_date}, ${extended_date.getMonth()} == ${toDay.getMonth()} `)
                                if (toParse[0] > 0 && (extended_date.getMonth() == toDay.getMonth()) && (extended_date.getFullYear() == toDay.getFullYear())) {

                                    if (res[i].madre == 0 && toParse[1] != 0) {
                                        friends.push({ nick: String(res[i].nick), pos: toParse[0], point: toParse[1], update: toParse[2], gain_globalPoint: parseInt(res[i].gain_globalPoint) });// ability: res[i].ability, ispezione_InLimit: res[i].ispezione_InLimit });
                                    } else if (res[i].madre != 0) {
                                        list.push({ nick: String(res[i].nick), pos: toParse[0], point: toParse[1], update: toParse[2], gain_globalPoint: parseInt(res[i].gain_globalPoint) });//  ability: res[i].ability, ispezione_InLimit: res[i].ispezione_InLimit });
                                    }
                                    //}

                                    if (parseInt(res[i].gain_globalPoint) == 1 && (parseInt(toParse[0]) > globalInfos.argo_point && (nowDate - toParse[2]) < (3600 * 6))) {
                                        globalInfos.argo_point = parseInt(toParse[0]);
                                    }
                                }
                            }



                            let atRisk = list.filter(function (users) {
                                return (users.gain_globalPoint == 0);
                            });

                            let onPoint = list.filter(function (users) {
                                return (users.gain_globalPoint == 1);
                            });

                            atRisk.sort(function (a, b) {
                                return ((a.pos == b.pos) ? (a.point - b.point) : (a.pos - b.pos));
                            });

                            onPoint.sort(function (a, b) {
                                return ((a.pos == b.pos) ? (a.point - b.point) : (a.pos - b.pos));
                            });

                            let difference;

                            if (atRisk.length > 0) {
                                text += "\n*In gara " + atRisk.length + "* ⊖\n";
                                for (let i = 0; i < atRisk.length; i++) {
                                    difference = nowDate - atRisk[i].update;
                                    if (difference < (3600 * 12)) {
                                        //if (globalInfos.global_limit > 0) {
                                        text += "› *" + atRisk[i].pos + "°* -";
                                        text += " " + atRisk[i].nick.split("_").join("\\_") + " (" + atRisk[i].point + "pt)";
                                        if (difference > 3600) {
                                            text += "ꜜ\n";
                                            counter++;
                                        } else {
                                            text += "\n";
                                        }
                                        //}
                                    } else {
                                        //obsolete_counter++;
                                        if (difference < (3600 * 24)) {
                                            text += "› *" + atRisk[i].pos + "°* " + atRisk[i].nick.split("_").join("\\_") + "ꜝ \n";
                                        } else {
                                            text += "? *" + atRisk[i].pos + "°* " + atRisk[i].nick.split("_").join("\\_") + "ꜝ \n";
                                        }
                                    }

                                }
                            }
                            if (onPoint.length > 0) {
                                text += "\n*In zona punto " + onPoint.length + "* ⊕\n";
                                for (let i = 0; i < onPoint.length; i++) {
                                    difference = nowDate - onPoint[i].update;
                                    if (difference < (3600 * 12)) {
                                        // if (globalInfos.global_limit > 0) {
                                        text += "› *" + onPoint[i].pos + "°* -";
                                        text += " " + onPoint[i].nick.split("_").join("\\_") + " (" + onPoint[i].point + "pt)";
                                        if (difference > 3600) {
                                            text += "ꜜ\n";
                                            counter++;
                                        } else {
                                            text += "\n";
                                        }
                                        //}
                                    } else {
                                        //obsolete_counter++;

                                        if (difference < (3600 * 24)) {
                                            text += "› *" + onPoint[i].pos + "°* " + onPoint[i].nick.split("_").join("\\_") + "ꜝ \n";
                                        } else {
                                            text += "? *" + onPoint[i].pos + "°* " + onPoint[i].nick.split("_").join("\\_") + "ꜝ \n";

                                        }
                                    }
                                }
                            }



                            if (friends.length > 0) {
                                text += "\n*Amici Argonauti* ⏣\n";
                                for (let i = 0; i < friends.length; i++) {
                                    //if (globalInfos.global_limit > 0) {
                                    if ((nowDate - friends[i].update) < 3600 * 12) {
                                        if (friends[i].gain_globalPoint == 0) {
                                            text += "› *" + friends[i].pos + "*, " + friends[i].point + "pt" + " ⊖:\n";// + "   `ispeziona: " + friends[i].nick + "`\n";
                                        } else {
                                            text += "› *" + friends[i].pos + "*, " + friends[i].point + "pt" + " ⊕:\n";// + "   `ispeziona: " + friends[i].nick + "`\n";
                                        }
                                    } else {
                                        text += "› *" + friends[i].pos + "°* " + friends[i].nick.split("_").join("\\_") + "\n";
                                    }

                                    //}
                                }
                            }

                            if (counter > 0) {
                                if (counter == 1) {
                                    text += "\nSolo di un Argonauta non ho info recenti sulla posizione. ꜜ\n";
                                } else {
                                    text += "\nDi *" + counter + "* Argonauti non ho info recenti sulla posizione. ꜜ\n";
                                }
                            }
                            // if (obsolete_counter > 0) {
                            //     if (counter == 0) {
                            //         text += "\n";
                            //     }
                            //     if (obsolete_counter == 1) {
                            //         text += "Solo di un Argonauta ho info non aggiornate. ꜝ \n";
                            //     } else {
                            //         text += "Di *" + obsolete_counter + "* Argonauti non ho info recenti. ꜝ \n";
                            //     }
                            // }

                            let update = new Date(globalInfos.last_update * 1000);
                            if (update.getHours() == 1)
                                text += "\n_All'";
                            else {
                                text += "\n_Alle "
                            }
                            text += String("0" + update.getHours()).slice(-2) + ":" + String("0" + update.getMinutes()).slice(-2) + "_";
                            let res_mess = simpleDeletableMessage(usr_id, false, text);
                            res_mess.options.reply_markup.inline_keyboard = functional_buttons;
                            return getCurrGlobal_resolve(res_mess);

                        } else {
                            getCurrGlobal_resolve(simpleDeletableMessage(usr_id, true, text + "\n!\nNon conosco la posizione di alcun argonauta..."));
                        }
                    });
                }
            }
        }).catch(function (err) {
            console.log(err);
            getCurrGlobal_resolve(simpleDeletableMessage(usr_id, deletable, "🤪 Whoops!\n_Bugghetto..._"));
        })

    });
}
module.exports.getCurrGlobal = getCurrGlobal;

function loadGlobalPlotData() {
    return new Promise(function (loadGlobalPlotDatares) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "../Al0bot/Sources/GlobalInfos/" + "GlobalPlot" + ".json");

        fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                return loadGlobalPlotDatares({ data: false });
            } else {
                let rawdata = fs.readFileSync(main_dir);
                if (rawdata) {
                    console.log(rawdata);

                    return loadGlobalPlotDatares({ data: JSON.parse(rawdata) });

                } else {
                    console.error("Errore leggendo " + main_dir);
                    console.error(rawdata);
                }
            }
        });
    });
}

function saveGlobalPlotData(plot_data) {
    return new Promise(function (saveGlobalPlotData_res) {
        let data = JSON.stringify(plot_data, null, 2);
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "../Al0bot/Sources/GlobalInfos/" + "GlobalPlot" + ".json");

        let res_text = "";
        let res_esit = true;
        return fs.writeFile(main_dir, data, function (error) {
            if (error) {
                res_esit = false;
                res_text = "*Woops...*\n";
            }
            return saveGlobalPlotData_res({ esit: res_esit, text: res_text });
        });
    });
}

// #PARTY
function getPartyFor(message) {
    let nickname = message.from.username;

    if (typeof message.reply_to_message != 'undefined') {
        nickname = message.reply_to_message.from.username;
        if (typeof message.reply_to_message.forward_from != 'undefined') {
            nickname = message.reply_to_message.forward_from.username;
        }
    }

    let argonaut = checkArgonaut(nickname.toLowerCase());
    console.log("Il target è: " + nickname + " il richiedente: " + message.from.username);

    if (argonaut.isArgonaut) {
        let partyN = argonaut.info.party;
        let mess = "Ups! c'è stato un errore analizzando " + argonaut.info.nick;
        if (partyN > 0) {
            console.log(argonaut.info.nick + " + nel party: " + argonaut.info.party);

            if (argonaut.info.nick == message.from.username) {
                mess = "A me risulti nel party*" + partyN + "* ";
            } else {
                let asker = checkArgonaut(message.from.username);
                if (asker.info.party == argonaut.info.party) {
                    mess = "A me risultate *entrambi* nel party*" + partyN + "* ";
                } else {
                    mess = "A me " + argonaut.info.nick + " risulta nel party*" + partyN + "* ";
                }
            }
            let arr = []
            for (let j = 0; j < globalArgonauts.length; j++) {
                if (globalArgonauts[j].party == partyN) {
                    arr.push(globalArgonauts[j].nick);
                }
            }
            if (arr.length <= 1) {
                mess += "\n...da solo! :(";
            } else {
                mess += "con altri " + (arr.length - 1) + " Argonauti:\n`" + arr.join(",") + "`";
            }
        } else {
            if (argonaut.info.nick == message.from.username) {
                mess = "A me non risulti in alcun party...";
            } else {
                mess = "A me " + argonaut.info.nick + " non risulta in alcun party";
            }
        }

        return (simpleMessage(mess, message.chat.id));


    } else {
        return (simpleMessage("🤔\n" + nickname + " non mi risulta tra gli Argonauti...", message.chat.id));
    }

}

function setPartyOf(nickname, party) {
    return new Promise(function (partyOf_res) {
        model.argo_pool.query("UPDATE `Argonauti` SET `party` = ? WHERE `nick`= ?", [party, nickname],
            function (err, res) {
                if (!err) {
                    partyOf_res(res);
                }
                else {
                    console.log(err);
                    partyOf_res(false);
                }
            });

    });
}

function checkParty(array) {
    for (let i = 0; i < array.length; i++) {
        let pos = array[i].toLowerCase().indexOf("party");
        let arg = -1;
        if (pos >= 0) {
            let length = array[i].length;
            if (length == ("party".length + 1)) {
                arg = parseInt(array[i].substring(length - 1, length));
            } else if (length == ("party".length)) {
                if (typeof array[i + 1] != 'undefined')
                    arg = parseInt(array[i + 1]);
            }
            if (pos >= 0 && arg > 0) {
                console.log("-> Esprime il party: " + arg);
                return { position: (i + 1), number: arg };
            }
        }
    }
    return -1;

}

function managePartySet(message) {
    return new Promise(function (managePartySet_res) {
        if (typeof message.reply_to_message != 'undefined') {
            let asker = checkArgonaut(message.from.username);
            let target = checkArgonaut(message.reply_to_message.from.username);
            if (asker.isArgonaut && asker.info.role > 0) {
                if (target.isArgonaut) {
                    target = target.info.nick
                    let newParty = parseInt(message.text.charAt(message.text.length - 1));
                    console.log("Party nuovo: " + newParty);
                    setPartyOf(target, newParty).then(function (dbset) {

                        if (dbset == false) {
                            target = target.split("_").join("\\_");

                            let text = ":( Ho avuto qualche problema ad aggiornare le info di " + target;
                            managePartySet_res(simpleMessage(text, message.chat.id));
                        } else {
                            updateArgonautsPartys(target, newParty);
                            target = target.split("_").join("\\_");

                            let text = "Ho aggiunto " + target + " al party" + newParty;
                            if (newParty == 0) {
                                text = "Ok, " + target + " è fuori dai party.";
                            }
                            managePartySet_res(simpleMessage(text, message.chat.id));
                        }
                    })
                }
            } else {
                if (message.from.username == "Mattitb")
                    managePartySet_res(simpleMessage("Matti, a 'na certa basta...", message.chat.id));
                else
                    managePartySet_res(simpleMessage("Solo amministratore e vice possono gestire i party...", message.chat.id));
            }
        }
        else {
            managePartySet_res();
        }
    });
}

function manageParty(message) {
    return new Promise(function (manageParty_res) {
        let linesToken = message.text.split("\n");
        let check = -1;
        let partys = [];
        let partysN = [];

        for (let i = 0; i < linesToken.length; i++) {
            if (linesToken[i].length > 4) {
                check = checkParty(linesToken[i].split(" "));
                console.log("> Analizzo la riga: " + i);
            } else {
                console.log("> Scarto la riga: " + i);
            }
            let mbrs = [];
            if (check != -1 && typeof linesToken[i + 1] != 'undefined') {
                if (linesToken[i + 1].indexOf("Assegnato") >= 0) {
                    let j = 2;
                    while ((i + j) < (linesToken.length) && linesToken[i + j].indexOf("> ") >= 0) {
                        mbrs.push(linesToken[i + j].substring(linesToken[i + j].indexOf("> ") + 1, linesToken[i + j].length).trim());
                        j++;
                    }
                    console.log(mbrs);
                    //mbrs = linesToken[i + 2].split(",");
                } else {
                    mbrs = linesToken[i + 1].split(",");
                    i++;
                }
            }

            if (check != -1 && mbrs.length > 0) {
                for (let j = 0; j < mbrs.length; j++) {
                    let tmp = [mbrs[j], check.number];
                    updateArgonautsPartys(mbrs[j], check.number);
                    partys.push(tmp);
                    partysN.push(check.number);
                }


            }
            check = -1;
        }

        if (partys.length > 0) {
            return savePartys(partys).
                then(function (res) {
                    console.log("Fine");
                    manageParty_res(simpleMessage(res, message.chat.id));
                })
        }
        else {
            manageParty_res(simpleMessage("Pardon?", message.chat.id));
        }
    });

}

function updateArgonautsPartys(nick, party) {
    for (let i = 0; i < globalArgonauts.length; ++i) {
        if (globalArgonauts[i].nick == nick) {
            globalArgonauts[i].party = party;
            break;
        }
    }

}

function savePartys(partys) {
    return new Promise(function (save_res) {
        model.argo_pool.getConnection(function (conn_err, single_connection) {
            if (single_connection) {
                let query = "INSERT INTO " + model.tables_names.argonauti;
                query += " (nick, party)";
                query += " VALUES ?";
                query += " ON DUPLICATE KEY UPDATE nick=VALUES(`nick`), party=VALUES(party);";


                single_connection.
                    query(query, [partys],
                        function (err, result) {
                            console.log("___________");
                            console.log("> Err Party: ");
                            console.log(err);
                            console.log("\n▸ Res Party: ");
                            console.log(result);
                            console.log("___________");

                        });

                model.argo_pool.releaseConnection(single_connection);

                console.log("________");
                save_res("Ho aggiornato il party di " + partys.length + " Argonauti.");
            }
        });
    });

}

function getAllParty() {
    let party = [];

    for (let i = 0; i < globalArgonauts.length; i++) {
        if (globalArgonauts[i].party > 0) {
            if (party.indexOf(globalArgonauts[i].party) === -1) {
                party.push(globalArgonauts[i].party);
            }
        }
    }
    let finalArray = [];
    let tmp_Party;
    let tmp_PartyNames
    for (let i = 0; i < party.length; i++) {
        tmp_Party = globalArgonauts.filter(function (argo) {
            return argo.party == party[i];
        });
        tmp_PartyNames = tmp_Party.map(function (argo) {
            return argo.nick;
        });
        finalArray.push(tmp_PartyNames);
    }
    let outOfParties = globalArgonauts.filter(function (argo) {
        return (argo.party == 0) && (argo.madre == 26);
    });

    if (party.length == 0) {
        return "Non conosco alcun party...";
    }

    let resText = "Conosco *" + party.length + "* party al momento:\n";
    if (party.length == 1) {
        resText = "Conosco solo un Party:\n";
    }
    for (let i = 0; i < party.length; i++) {
        resText += "\n*Party" + party[i] + "*\n";
        resText += "`" + finalArray[i].join(", ") + "`\n";
    }
    if (outOfParties.length > 0) {
        resText += "\n*Fuori dai party:* " + outOfParties.length + "\n";

        for (let i = 0; i < outOfParties.length; i++) {
            resText += "`" + outOfParties[i].nick + "`";
            if (i < outOfParties.length - 1) {
                resText += ", ";
            }
            if ((i + 1) % 4 == 0) {
                resText += "\n";
            } else {
                resText += " ";
            }
        }

    }
    return resText;
}

// 💬 #MESSAGGI

function simpleMessage(text, id) {


    //let simple_msg = ;
    return {
        chat_id: id,
        message_text: text,
        options: {
            parse_mode: "Markdown",
            disable_web_page_preview: true
        }
    };

}

function simpleDeletableMessage(mess_id, deletable, text) {
    let mess_button = [];


    if (deletable) {
        mess_button.push([{
            text: "Chiudi ⨷",
            callback_data: 'ARGO:FORGET'
        }]);
    }

    let simple_msg = {
        chat_id: mess_id,
        message_text: text,
        options: {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: mess_button
            }
        }
    };

    return simple_msg;
}

function plotMessage(mess_id, text, index) {
    let mess_button = [];
    mess_button.push([{
        text: "➖",
        callback_data: 'ARGO:GLOBAL:' + index + ':-'
    }, {
        text: "➕",
        callback_data: 'ARGO:GLOBAL:' + index + ':+'
    }]);

    let type = index.split(":")[0];
    if (type == "RITMO") {
        mess_button[0].push({ text: "📈", callback_data: 'ARGO:GLOBAL:PROG' });
    } else {
        mess_button[0].push({ text: "📊", callback_data: 'ARGO:GLOBAL:RITMO' });
    }
    mess_button[0].push({ text: "🌐", callback_data: 'ARGO:GLOBAL:REFRESH' });





    // mess_button.push([{
    //     text: "Ok",
    //     callback_data: 'SUGGESTION:FORGET'
    // }]);

    let cmd_options = {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: mess_button
        }
    };

    let simple_msg = {
        chat_id: mess_id,
        message_text: text,
        options: cmd_options
    };

    return simple_msg;
}

function parseInlineResult(user_id, query_id, up_type, res_array, message_text, has_button, special_id) {
    console.log("> parseInlineResult-> type: " + up_type + ", has_button: " + has_button);

    let thumb = "";
    let calc_id;
    if (!has_button) {
        if (typeof special_id != "string") {
            calc_id = (Date.now() + "" + (user_id + "" + query_id)).split('').sort(function () { return 0.5 - Math.random() }).join(''); //user_id + ":" + (Date.now() +"") ;
        } else {
            let date_str = Date.now().toString();
            calc_id = date_str.substring(1, 4) + date_str.substring(date_str.length - 10, date_str.length) + special_id;
        }
    } else {
        let date_str = Date.now().toString();
        calc_id = date_str.substring(1, 4) + date_str.substring(date_str.length - 10, date_str.length);
        if (typeof special_id == "string") {
            calc_id += special_id;
        } else {
            calc_id = (date_str + "" + (user_id + "" + query_id)).split('').sort(function () { return 0.5 - Math.random() }).join('');
        }
    }
    switch (up_type) {
        case "main_dungeon": {
            thumb = "https://www.shareicon.net/data/128x128/2015/10/29/663524_protection_512x512.png";
            break;
        }
        case "globale": {
            thumb = "https://www.shareicon.net/data/128x128/2016/09/26/835427_internet_512x512.png";
            break;
        }
        case "craftable": {
            thumb = "https://img.icons8.com/material/96/000000/labyrinth.png";
            break;
        } // 
        case "base": {
            thumb = "https://img.icons8.com/material/96/000000/xbox-b.png";//"https://img.icons8.com/ios/100/000000/organic-food-filled.png";
            break;
        } //
        case "giveing": {
            thumb = "https://img.icons8.com/pastel-glyph/64/000000/logout-rounded-up.png";
            break;
        }
        case "eco": {
            thumb = "https://img.icons8.com/ios-filled/100/000000/enka.png";
            break;
        } // 
        case "search": {
            thumb = "https://www.shareicon.net/data/128x128/2016/07/06/105350_document_512x512.png";
            break;
        }
        case "exchange": {
            thumb = "https://img.icons8.com/ios-filled/50/000000/change.png";
            break;
        } // 
        case "crafting": {
            thumb = "https://img.icons8.com/material-rounded/96/000000/hammer-and-anvil.png";//"https://img.icons8.com/ios/100/000000/organic-food-filled.png";
            break;
        }
        case "info": {
            thumb = "https://img.icons8.com/ios/96/000000/info-filled.png"
            break;
        }
        case "smuggler": {
            thumb = "https://www.shareicon.net/data/128x128/2016/06/09/585433_handshake_512x512.png";
            break;
        }
        case "ispezioni": {
            thumb = "https://img.icons8.com/ios/100/000000/dwarf.png";
            break;
        }
        case "assalto": { //<img src="https://img.icons8.com/ios/50/000000/wolf.png"/>
            thumb = "https://img.icons8.com/ios/100/000000/wolf.png";
            break;
        }
        case "zaino": {
            thumb = "https://img.icons8.com/ios/100/000000/backpack.png";
            calc_id += ":🎒:" + user_id;
            break;
        }
        default: {
            thumb = "https://www.shareicon.net/data/128x128/2015/08/26/90992_robot_512x512.png";
            break;
        }
    }

    let res = {
        type: "article",
        id: calc_id,
        title: message_text.title,
        description: message_text.desc,
        input_message_content: {
            message_text: message_text.to_send,
            disable_web_page_preview: true,
            parse_mode: "Markdown"
        },
        thumb_url: thumb
    };

    if (has_button) {
        res.reply_markup = {};
        res.reply_markup.inline_keyboard = [];
        if (Array.isArray(special_id)) {
            console.log("> Con inline_keyboard personalizzata...");

            res.reply_markup.inline_keyboard = special_id;
        } else {
            console.log("> Con aid query...");
            let aid_query = ""

            if (typeof special_id == "string") {
                aid_query = special_id;
            }

            res.reply_markup.inline_keyboard.push([
                {
                    text: "Prossimo",
                    switch_inline_query_current_chat: "\n" + aid_query.substring(1)
                }
            ]);
            console.log("aid_query: " + aid_query);
            res.reply_markup.inline_keyboard.push([
                {
                    text: "⟲",
                    switch_inline_query_current_chat: "work in progress..."
                }
            ]);
        }

    }

    res_array.push(res);
    return (res_array);
}