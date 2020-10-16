//const argobot = require('./al0bot');
//const model = require('./models/argo_model');
const request = require('request-promise');
const theCreator = "16964514";
const fs = require('fs');
const path = require("path");



const edicolaID = "-1001225957195"; // vero: -1001177786583


const figurine = {
    id: -1,
    partial_name: "",
    attribute: "",
    rarity: -1
};

let generalStuff = {};
let edicolaStuff = {};
let allCards = new Array(figurine);
let rarityInfo = {
    uno: 0,
    due: 0,
    tre: 0,
    quattro: 0,
    cinque: 0,
    sei: 0,
    sette: 0,
    otto: 0,
    nove: 0,
    dieci: 0,
};

const messages_title = "🃏 *Figurine di Loot*\n";
const edicola_messages_title = "🃏 *Edicola di Lootia*\n";


function manageMessage(message) {
    return new Promise(function (cards_message_res) {

        if (typeof message.text == "undefined") { //|| message.chat.id != theCreator){
            console.log("> esco precoce!");
            return cards_message_res([]);
        } else {
            let res = [];
            let first_res = {};

            let command_text = message.text.toLowerCase();
            let message_array = command_text.split(" ");
            if (message_array[0].length >= 4 && message_array[0].toLowerCase().match("figu")) {
                message_array.shift();
            }
            // qui arriva un message_array (array dei comandi dopo il trigger)
            console.log(message.from.id == theCreator);
            console.log(message_array[0]);

            if (message.chat.id == edicolaID && message_array.length > 0 || message_array[0] == "cerco" || message_array[0] == "scambio") {
                res = edicolaManager(message, message_array);
            } else if (message_array.length > 0) {

                if (message_array[0] === "genera") {
                    let all_inefficent = getPartialAndAttribute(allCards);
                    let partial_random = Math.ceil(Math.random() * all_inefficent.partial.length) - 1;
                    let attribute_random = Math.ceil(Math.random() * all_inefficent.attribute.length) - 1;
                    let name = all_inefficent.partial[partial_random] + " " + all_inefficent.attribute[attribute_random];

                    let rarity = generateACardRarity();
                    let down_line = "`⎬――――――――――――――――――`";//"`";


                    let generi = ["Luce", "Buio", "Acqua", "Fuoco", "Terra"];
                    let attacchi = ["Colpo Basso", "Trottola", "Calcio", "Pugno", "Carica"];
                    let mage = ["Scaramantico", "Fedele", "Discepolo", "Professante", "Profeta"];


                    let msg_text = "";
                    msg_text += "`" + parseRarityChar(rarity) + " ⁞` *" + name + "*" + "\n";
                    msg_text += down_line + "\n";
                    msg_text += "❂ " + generi[Math.ceil(Math.random() * (generi.length - 1))] + "\n";
                    msg_text += "✪ " + mage[Math.ceil(Math.random() * (mage.length - 1))] + "\n";

                    msg_text += down_line + "\n";

                    let avaible_attacchi = [];
                    let random_known = Math.ceil(Math.random() * 3) + 1;
                    let tmp_attack;

                    for (let i = 0; i < random_known; i++) {
                        tmp_attack = attacchi[Math.ceil(Math.random() * (attacchi.length - 1))];
                        if (avaible_attacchi.indexOf(tmp_attack) < 0) {
                            avaible_attacchi.push(tmp_attack);
                            msg_text += "✷ " + tmp_attack + "\n";
                        }
                    }
                    msg_text += down_line + "\n";

                    random_debolezze = Math.ceil(Math.random() * 2);

                    avaible_attacchi = [];
                    for (let i = 0; i < random_debolezze; i++) {
                        tmp_attack = generi[Math.ceil(Math.random() * (generi.length - 1))];
                        if (avaible_attacchi.indexOf(tmp_attack) < 0) {
                            avaible_attacchi.push(tmp_attack);
                            msg_text += "❖ " + tmp_attack + "\n";
                        }
                    }
                    random_debolezze = Math.round(Math.random());
                    if (random_debolezze == 1) {
                        tmp_attack = generi[Math.ceil(Math.random() * (generi.length - 1))];
                        if (avaible_attacchi.indexOf(tmp_attack) < 0) {
                            msg_text += "⊗ " + tmp_attack + "\n";

                        }
                    }
                    //msg_text += "`                      ⎭`\n"; // 
                    msg_text += "`⎩" + down_line.slice(2, down_line.length) + "";


                    first_res.toSend = simpleMessage(msg_text, message.chat.id);
                    res.push(first_res);

                } else if (message_array[0] === "r" || message_array[0] === "rarità") {

                } else if (message_array[0].length > 3 && message_array[0].slice(0, -1) === "list") {
                    let splitted = getPartialAndAttribute(allCards);
                    console.log("Unici di primo livello: " + splitted.partial.length + ", Secondo: " + splitted.attribute.length);

                    if (message_array.length > 1) {
                        if (message_array[1] == "tipi") {
                            let partialNames_text = messages_title + "\nCi sono " + splitted.partial.length + " tipi *base*:\n\n";
                            let ordered_list = splitted.partial.sort();

                            for (let i = 0; i < ordered_list.length; i++) {
                                partialNames_text += "> " + ordered_list[i] + "\n";
                            }
                            first_res.toSend = simpleMessage(partialNames_text, message.chat.id);
                            res.push(first_res);
                        } else if (message_array[1] == "attributi") {
                            let partialNames_text = messages_title + "\nCi sono " + splitted.attribute.length + " tipi *secondari*:\n\n";

                            let ordered_list = splitted.attribute.sort();
                            for (let i = 0; i < ordered_list.length; i++) {
                                partialNames_text += "> " + ordered_list[i] + "\n";
                            }
                            first_res.toSend = simpleMessage(partialNames_text, message.chat.id);
                            res.push(first_res);
                        }
                    } else {
                        let res_text = messages_title + "\nCi sono " + allCards.length + " figurine in giro.\n";
                        res_text += "> " + splitted.partial.length + " tipi *base*:\n";
                        res_text += "> " + splitted.attribute.length + " tipi *secondari*:\n";

                        first_res.toSend = simpleMessage(res_text, message.chat.id);
                        res.push(first_res);
                    }


                } else if ("cerca".match(message_array[0])) {
                    let res_text = messages_title + "";
                    if (message_array.length == 1) {
                        res_text += "_Ricerca flessibile_\n\nSpecifica il nome, anche parziale, della figurina da cercare...";
                    } else {
                        let match = getMatch(message_array.slice(1, message_array.length).join(" ").toLowerCase());
                        res_text += "\n" + printMatch(match);
                    }
                    first_res.toSend = simpleMessage(res_text, message.chat.id);
                    res.push(first_res);
                } else if (message.from.id == theCreator) {
                    if (message_array[0] === "carica") {
                        return loadAllCards(false).then(function (cards_count) {
                            first_res.toSend = simpleMessage(messages_title + "\nCi sono: " + cards_count.cards_n + " figurine, in giro...\n\n", message.chat.id);
                            res.push(first_res);
                            return cards_message_res(res);

                        });
                    } else if (message_array[0] === "aggiorna") {
                        return loadAllCards(true).then(function (cards_count) {
                            let res_text = messages_title + "\nCi sono: " + cards_count.cards_n + " figurine, in giro...\n\n";

                            if (cards_count.new.length > 0) {
                                if (cards_count.new.length == 1) {
                                    res_text += "Ne sono state aggiunte una dall'ultimo controllo:\n";

                                } else {
                                    res_text += "Ne sono state aggiunte " + cards_count.new.length + " dall'ultimo controllo:\n\n";
                                }

                                for (let i = 0; i < cards_count.new.length; i++) {
                                    res_text += "> " + cards_count.new[i].partial_name + " " + cards_count.new[i].attribute + " (" + cards_count.new[i].rarity + ")\n";
                                }
                            }

                            first_res.toSend = simpleMessage(res_text, message.chat.id);
                            res.push(first_res);
                            return cards_message_res(res);

                        });
                    }
                }
            } else {
                let msg_text;
                if (message.chat.type == "private"){
                    msg_text =  messages_title + generateCasualDayName(message.chat.type == "private")+"\n\n(:";
                } else{
                    msg_text =  messages_title+ generateCasualDayName(message.chat.type == "private")+"\n\nQuesto è un gruppo...";
                }
                first_res.toSend = simpleMessageWhitKeyB( message.chat.id, msg_text, [["☆ Test"],["🃟 Figurine", "⌘ Scambia"], ["⏣ Arena"]]);
                res.push(first_res);

            }

            return cards_message_res(res);
        }

    });
}
module.exports.manage = manageMessage


function cardsManager(message){
    return new Promise(function (cards_message){
        console.log("> entrato!");
        let message_res = {};
        let res_array = [];

        message_res.toSend = simpleMessage("Test", message.chat.id);
        res_array.push(message_res)
        return cards_message(res_array);
    });
}
module.exports.cardsManager = cardsManager



function manageInline(in_query, user) {
    return new Promise(function (inline_cards_res) {
        console.log("> inline Figurine!");
        let inline_result = {};
        let res_array = [];

        let command_array = in_query.query.split(" ");
        command_array.shift();

        if (command_array.length == 0) {
            inline_result.title = "Figurine di Loot";
            inline_result.desc = "Enciclopedia inline";
            inline_result.to_send = messages_title + "\nRicerca inline:\n> Rarità (scrivi: `rarità [N]`\n> Nome (anche parziale   )";
            res_array = parseInlineResult(user.id, in_query.id, "error", res_array, inline_result);

        } else if (command_array[0] === "r" || command_array[0] === "rarità") {
            if (command_array.length == 1) {
                inline_result.title = "Figurine di Loot,";
                inline_result.desc = "Scrivi la rarità per cui filtrare...";
                inline_result.to_send = messages_title + "\nFiltra la ricerca per rarità o nome parziale";
                res_array = parseInlineResult(user.id, in_query.id, "error", res_array, inline_result);
            } else {
                let rarity = parseInt(command_array[1]);
                if (isNaN(rarity) || rarity < 1 || rarity > 10) {
                    inline_result.title = "Woops!";
                    inline_result.desc = "Quale rarità?";
                    inline_result.to_send = messages_title + "\nLa rarità delle figurine va da 1 a 10.";
                    res_array = parseInlineResult(user.id, in_query.id, "error", res_array, inline_result);
                } else {
                    let res_cards = rarityFilter(rarity);
                    let splitted = getPartialAndAttribute(res_cards);

                    inline_result.title = "Rarità: " + rarity;
                    if (res_cards.length == 1) {
                        inline_result.desc = "C'è una sola figurina in giro!";
                    } else {
                        inline_result.desc = "Ce ne sono " + res_cards.length;
                    }
                    let res_text = messages_title + "\n_Di rarità " + rarity + "_\n\n";

                    console.log("> Unici in rarità " + rarity + ": " + splitted.partial.length);

                    for (let i = 0; i < splitted.partial.length; i++) {
                        res_text += "> " + splitted.partial[i] + "\n";
                    }
                    inline_result.to_send = res_text;
                    res_array = parseInlineResult(user.id, in_query.id, "single", res_array, inline_result);


                }

            }

        } else if (command_array[0].length >= 4 && "distribuzione".match(command_array[0])) {

            let res_text = messages_title + "\n_Distribuzione delle rarità per le " + allCards.length + " figurine esistenti..._\n\n";
            res_text += "``` • 1 ↦  " + rarityInfo.uno + "   (" + Math.round((rarityInfo.uno * 100) / allCards.length).toFixed(1) + "%) ```\n";
            res_text += "``` • 2 ↦  " + rarityInfo.due + "   (" + Math.round((rarityInfo.due * 100) / allCards.length).toFixed(1) + "%) ```\n";
            res_text += "``` • 3 ↦  " + rarityInfo.tre + "   (" + Math.round((rarityInfo.tre * 100) / allCards.length).toFixed(1) + "%) ```\n";
            res_text += "``` • 4 ↦  " + rarityInfo.quattro + "   (" + Math.round((rarityInfo.quattro * 100) / allCards.length).toFixed(1) + "%) ```\n";
            res_text += "``` • 5 ↦  " + rarityInfo.cinque + "   (" + Math.round((rarityInfo.cinque * 100) / allCards.length).toFixed(1) + "%) ```\n";
            res_text += "``` • 6 ↦  " + rarityInfo.sei + "   (" + Math.round((rarityInfo.sei * 100) / allCards.length).toFixed(1) + "%) ```\n";
            res_text += "``` • 7 ↦  " + rarityInfo.sette + "   (" + Math.round((rarityInfo.sette * 100) / allCards.length).toFixed(1) + "%) ```\n";
            res_text += "``` • 8 ↦  " + rarityInfo.otto + "   (" + Math.round((rarityInfo.otto * 100) / allCards.length).toFixed(1) + "%) ```\n";
            res_text += "``` • 9 ↦  " + rarityInfo.nove + "   (" + Math.round((rarityInfo.nove * 100) / allCards.length).toFixed(1) + "%) ```\n";
            res_text += "``` • 10 ↦ " + rarityInfo.dieci + "   (" + Math.round((rarityInfo.dieci * 100) / allCards.length).toFixed(1) + "%) ```\n";


            inline_result.title = allCards.length + " figurine";
            inline_result.desc = "Tap per la distribuzione delle rarità";
            inline_result.to_send = res_text;

            inline_result.to_send = res_text;
            res_array = parseInlineResult(user.id, in_query.id, "multy", res_array, inline_result);
        } else {
            inline_result.title = "Figurine di Loot";
            let string = "";
            let rarity = -1;
            let attribute = "none";

            rarity = parseInt(command_array[0]);
            if (isNaN(rarity)) {
                string = command_array[0];
                if (command_array.length > 1) {
                    rarity = parseInt(command_array[1]);
                    if (isNaN(rarity)) {
                        rarity = false;
                    } else {
                        if (command_array[1].indexOf("+") >= 0) {
                            attribute = "over";
                        } else if (command_array[1].indexOf("-") >= 0) {
                            attribute = "under";
                        }
                    }
                } else {
                    rarity = false;
                }
            } else {
                if (command_array[0].indexOf("+") >= 0) {
                    attribute = "over";
                } else if (command_array[0].indexOf("-") >= 0) {
                    attribute = "under";
                }
                if (command_array.length > 1) {
                    string = command_array[1];
                }
            }

            if (string.length < 4) {
                inline_result.desc = "🔍 " + string;
                for (let i = 0; i < (4 - string.length); i++) {
                    inline_result.desc += " _ ";
                }
                inline_result.to_send = "ciccio ciccio";

                res_array = parseInlineResult(user.id, in_query.id, "single", res_array, inline_result);

            } else {
                let match = getMatch(string, rarity, attribute);
                //let to_search = normalizeQuestionArray(string);
                let results = (match.partial.length + match.attribute.length);
                if (results == 1) {
                    inline_result.desc = "Un risultato: ";
                } else {
                    inline_result.desc = (match.partial.length + match.attribute.length) + " risultati...\nTap per l'elenco";
                }
                inline_result.to_send = messages_title + "Enciclopedia Argonauta\n\n";
                inline_result.to_send += "> Ricercando: `" + string + "`";
                if (rarity != false) {
                    inline_result.to_send += " `(" + rarity;
                    if (attribute == "over") {
                        inline_result.to_send += "⁺"
                    } else if (attribute == "under") {
                        inline_result.to_send += "⁻"
                    }
                    inline_result.to_send += ")`";
                }
                inline_result.to_send += "\n\n" + printMatch(match);
                res_array = parseInlineResult(user.id, in_query.id, "error", res_array, inline_result);
            }

        }



        return inline_cards_res(res_array);
    });
}
module.exports.manageInline = manageInline

function edicolaManager(message, message_array) {
    console.log("> ok, nell'edicola!");
    console.log("> id del gruppo: " + edicolaStuff.edicolaGroupID);
    console.log("> id del fissato: " + edicolaStuff.pinnedMsgID);

    let res = [];
    let edicola_msg = {};


    if (message_array[0] === "fissa" && message.from.id == theCreator) {
        edicola_msg.toPin = simpleMessage("*Prova fissato*\n\nQuesta è una prova!", message.chat.id);

        res.push(edicola_msg);
    } else if (message_array.length == 1 && "informazioni".indexOf(message_array[0]) >= 0) {
        let targhet_user = "";
        if (typeof message.reply_to_message != "undefined" && message.reply_to_message.from.id == theCreator) {
            targhet_user = message.reply_to_message.from.first_name;
        } else {
            targhet_user = message.from.first_name;
        }
        let res_text = "*ⓘ Informazioni sull'Edicola di Loot*\n\n";
        res_text += "_Un gruppo aperto dove poter chattare e commerciare in libertà, ";
        res_text += "auspicabilmente tentando:\n";
        res_text += "Ⓐ di rispettare gli altri, e\n";
        res_text += "Ⓑ di mantenere il tema delle conversazioni sul topic \"Figurine di Loot\"_\n";
        res_text += "\n\n";
        res_text += "Puoi aggiungerti alla coda delle _offerte_ o delle _richieste_ che è nel fissato.";
        res_text += "\nTi proporrò io stesso di farlo quando inizierai un messaggio con:\n";
        res_text += "> \"`Scambio`\" o `Cerco`\" ";

        edicola_msg.toSend = simpleMessage(res_text, message.from.id);
        edicola_msg.errorHandler = { user: "" + targhet_user };

        res.push(edicola_msg);
        if (message.chat.id != message.from.id) {
            edicola_msg = {};
            edicola_msg.toSend = simpleMessage("*" + message.from.first_name + "*,\nT'ho scritto in privato", edicolaID);
            edicola_msg.toSend.options.reply_to_message_id = message.message_id;
            //edicola_msg.toDelete = { mess_id: message.message_id };
            res.push(edicola_msg);
        }
        //edicola_msg.toDelete = { mess_id: message.message_id };

        res.push(edicola_msg);

    } else {
        let trigger = message_array[0].toLowerCase();
        let res_text = "";
        if (trigger.charAt(0) == "#") trigger = trigger.slice(1, trigger.length);

        console.log("> Trigger (fuori): " + trigger);

        if (trigger == "scambio" || trigger == "cerco") {
            if (message_array.length <= 1) {
                res_text = "*ⓘ Informazioni sull'Edicola di Loot,\n";
                if (trigger == "scambio") res_text += "Lo Scambio*\n\n";
                else if (trigger == "cerco") res_text += "La Ricerca*\n\n";
                res_text += "Iniziando nel gruppo un messaggio con \"" + trigger + "\" ti proporrò d'aggiungere una tua offerta al fissato del giorno.";
                res_text += "\n\nSpecifica una _rarità_ o un _tipo di mostro_";
                if (trigger == "scambio") res_text += " che sei disposto a cedere ";
                else if (trigger == "cerco") res_text += " che stai cercando ";
                res_text += "(Per offerte multiple separa con delle virgole)\n";
                res_text += "\n*• Esempi:*\n";
                let random_partial_names = [];
                let tmp_name;
                for (let i = 0; i < 3; i++) {
                    tmp_name = allCards[Math.ceil(Math.random() * (allCards.length - 1))].partial_name;
                    while (random_partial_names.indexOf(tmp_name) >= 0) {
                        tmp_name = allCards[Math.ceil(Math.random() * (allCards.length - 1))].partial_name;
                    }
                    random_partial_names.push(tmp_name);
                }
                let random_int_array = [];
                let tmp_int;
                for (let i = 0; i < 3; i++) {
                    tmp_int = getRandomInt(1, 11);
                    while (random_int_array.indexOf(tmp_int) >= 0) {
                        tmp_int = getRandomInt(1, 11);
                    }
                    random_int_array.push(tmp_int);
                }
                res_text += "> `" + trigger + " " + random_partial_names[1] + " e " + random_partial_names[0] + " di rarità " + random_int_array[Math.ceil(Math.random() * 2)] + "+`\n";
                res_text += "> `" + trigger + " rarità " + random_int_array[1] + ", " + random_int_array[0] + " e " + random_int_array[2] + "`\n";
                res_text += "\nOvviamente puoi anche specificare una precisa figurina (o più)\n";
                res_text += "(troverò da me la corrispondente rarità)\n\n";

                res_text += "*• Esempo:*\n";
                res_text += "> `" + trigger + " Bardo furioso, " + random_partial_names[2] + " lunare`\n";

                edicola_msg.errorHandler = { user: "" + message.from.first_name };
                edicola_msg.toSend = simpleMessage(res_text, message.from.id);
                res.push(edicola_msg);
                if (message.chat.id != message.from.id) {
                    edicola_msg = {};

                    edicola_msg.toSend = simpleMessage("*" + message.from.first_name + "*,\nT'ho scritto in privato", edicolaID);
                    edicola_msg.toSend.options.reply_to_message_id = message.message_id;
                    //edicola_msg.toDelete = { mess_id: message.message_id };
                    res.push(edicola_msg);
                }



            } else {
                let to_search = normalizeQuestionArray(message_array.slice(1, message_array.length));


                let toSave = {
                    user_id: message.from.id,
                    user_nick:  message.from.nickname,
                    asked_cards: [],
                    offered_cards: []
                }

                if (to_search.toCheck_array.length > 0) {
                    console.log("> devo cercare la corrispondenza per " + to_search.toCheck_array.length + " tipi di figurine...");
                    let matched = checkCardsNames(to_search.toCheck_array);
                    console.log("> ne ho trovate " + matched.length + "!");
                    if (to_search.toCheck_array.length - matched.length != 0) {
                        console.log("> Woops! C'è qualche figurina che non conrrisponde! ");
                        for (let i = 0; i < to_search.toCheck_array.length; i++) {
                            if (matched.indexOf(to_search.toCheck_array[i]) < 0) {
                                console.log("> " + to_search.toCheck_array[i] + " (fuori elenco)");
                            }
                        }


                    }
                    console.log("> Figurine valide: ");
                    console.log(matched);


                }

            }
        }
    }

    return res;
}

//#utility
function checkCardsId(id) {
    for (let i = 0; i < allCards.length; i++) {
        if (allCards[i].id == id) {
            return allCards[i];
        }
    }
    return null;
}

function rarityFilter(rarity) {
    let res = [];
    console.log("> nel rarityFilter");
    for (let i = 0; i < allCards.length; i++) {
        if (allCards[i].rarity == rarity) {
            res.push(allCards[i]);
        }
    }
    console.log("> Esco con " + res.length);

    return res;
}

function allFiltered() {
    let res = {
        uno: 0,
        due: 0,
        tre: 0,
        quattro: 0,
        cinque: 0,
        sei: 0,
        sette: 0,
        otto: 0,
        nove: 0,
        dieci: 0,
    };

    for (let i = 0; i < allCards.length; i++) {
        if (allCards[i].id < 0) {
            console.log(" Quella infetta è la " + i);
            console.log(allCards[i]);
        }
        switch (allCards[i].rarity) {
            case 1: {
                res.uno++;
                break;
            }
            case 2: {
                res.due++;
                break;
            }
            case 3: {
                res.tre++;
                break;
            }
            case 4: {
                res.quattro++;
                break;
            }
            case 5: {
                res.cinque++;
                break;
            }
            case 6: {
                res.sei++;
                break;
            }
            case 7: {
                res.sette++;
                break;
            }
            case 8: {
                res.otto++;
                break;
            }
            case 9: {
                res.nove++;
                break;
            }
            case 10: {
                res.dieci++;
                break;
            }
        }
    }

    return res;
}

function getPartialAndAttribute(from_list) {
    let unique_partial = [];
    let unique_attribute = [];

    for (let i = 0; i < from_list.length; i++) {
        if (from_list[i].partial_name.length > 2 && unique_partial.indexOf(from_list[i].partial_name) < 0) {
            unique_partial.push(from_list[i].partial_name);
        }
        if (from_list[i].attribute.length > 2 && unique_attribute.indexOf(from_list[i].attribute) < 0) {
            unique_attribute.push(from_list[i].attribute);
        }

    }
    return ({ partial: unique_partial, attribute: unique_attribute })
}

function getMatch(partial_name, rarity, attribute) {
    let partial_matches = [];
    let attribute_matches = []; //sull'attributo
    console.log("Cerco match per \'" + partial_name + "\'");
    if (typeof rarity == "undefined") {
        rarity = false;
    }

    let tmp_condition = true;

    for (let i = 0; i < allCards.length; i++) {
        if (rarity != false) {
            if (attribute == "over") {
                tmp_condition = allCards[i].rarity >= rarity;
            } else if (attribute == "under") {
                tmp_condition = allCards[i].rarity <= rarity;
            } else {
                tmp_condition = allCards[i].rarity == rarity;
            }
        }
        if (tmp_condition) {
            if (allCards[i].partial_name.toLowerCase().match(partial_name)) {
                partial_matches.push(allCards[i]);
            } else if (allCards[i].attribute.toLowerCase().match(partial_name)) {
                attribute_matches.push(allCards[i]);
            }
        }

    }
    partial_matches.sort(function (a, b) {
        return a.rarity - b.rarity;
    });

    attribute_matches.sort(function (a, b) {
        return a.rarity - b.rarity;
    })
    return ({ partial: partial_matches, attribute: attribute_matches })
}

function parseRarityChar(rarity) {
    switch (rarity) {
        case 1: {
            return "➊";
        }
        case 2: {
            return "➋";
        }
        case 3: {
            return "➌";
        }
        case 4: {
            return "➍";
        }
        case 5: {
            return "➎";
        }
        case 6: {
            return "➏";
        }
        case 7: {
            return "➐";
        }
        case 8: {
            return "➑";
        }
        case 9: {
            return "➒";
        }
        case 10: {
            return "➓";
        }
    }
}


function generateACardRarity() {
    let seed = Math.ceil(10 / Math.PI * Math.abs(Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random())));
    if (seed > 10) return 10;
    else if (seed < 1) return 1;
    else return seed;
}

function generate_EdicolaDayMsg(isAnEdit) {
    if (typeof isAnEdit == "undefined") isAnEdit = false;
    let res_text = "";

    if (!isAnEdit) {
        res_text = edicola_messages_title+ generateCasualDayName();
    
        res_text += random_patron.partial_name + "_\n";
        res_text += "\n\n";
        res_text += "• “`Scambio`“ o “`Cerco`“?\n";
        res_text += "Ancora nessun annuncio...";
    } else {

    }


    return ({ text: res_text });
}
module.exports.edicola_dailyMsg = generate_EdicolaDayMsg;

function generateCasualDayName(is_private){
    let random_patron = generateRandomPartial();

    let nowDate = new Date(Date.now());
    let stringDate = " _" + nowDate.getDate() + " " + printMonth("" + (nowDate.getMonth() + 1));

    let res_text = "" + stringDate;
    if (is_private){
        res_text += ", attento ";
    } else{
        res_text += ", attenti ";
    }

    if (random_patron.gender == "male") {
        if ("aeiou".indexOf(random_patron.partial_name.charAt(0).toLowerCase()) >= 0) {
            res_text += "all'";
        } else {
            if (random_patron.partial_name.charAt(0).toLowerCase() == "s") {
                if (random_patron.partial_name.charAt(1) == "i" || "aeiou".indexOf(random_patron.partial_name.charAt(1)) < 0) {
                    res_text += "allo ";
                } else {
                    res_text += "al ";
                }
            } else {
                let exceptions = ["i", "gn", "x", "j", "y", "z"];
                let isException = false;

                for (let i = 0; i < exceptions.length; i++) {
                    if (random_patron.partial_name.indexOf(exceptions[i]) == 0) {
                        res_text += "allo ";
                        isException = true;
                        break;
                    }
                }

                if (!isException) {
                    res_text += "al ";

                }
            }
        }

    } else {
        if ("aeiou".indexOf(random_patron.partial_name.charAt(0).toLowerCase()) >= 0) {
            res_text += "all'";
        } else {
            res_text += "alla ";
        }
    }
    return res_text + random_patron.partial_name +"_" ;

}

function printMonth(imput_int) {
    switch (imput_int) {
        case "1": {
            return "Gennaio";
        }
        case "2": {
            return "Gennaio";
        }
        case "3": {
            return "Marzo";
        }
        case "4": {
            return "Aprile";
        }
        case "5": {
            return "Maggio";
        }
        case "6": {
            return "Giugno";
        }
        case "7": {
            return "Luglio";
        }
        case "8": {
            return "Agosto";
        }
        case "9": {
            return "Settembre";
        }
        case "10": {
            return "Ottobre";
        }
        case "11": {
            return "Novembre";
        }
        case "12": {
            return "Dicembre";
        }
    }
}

function printMatch(already_matched) {
    console.log("> dice che sono:");
    let res_text = "*";
    if (already_matched.partial.length == 0) {
        res_text += "Nessun";
    } else {
        if (already_matched.partial.length == 0) {
            res_text += "Un solo ";
        } else {
            res_text += already_matched.partial.length + "";

        }
    }
    res_text += " Match di tipo*\n";
    for (let i = 0; i < already_matched.partial.length; i++) {
        res_text += "> " + already_matched.partial[i].partial_name + " " + already_matched.partial[i].attribute + " (" + already_matched.partial[i].rarity + ")\n";
    }

    res_text += "\n*";
    if (already_matched.attribute.length == 0) {
        res_text += "Nessun";
    } else {
        if (already_matched.attribute.length == 0) {
            res_text += "Un solo ";
        } else {
            res_text += already_matched.attribute.length + "";

        }
    }
    res_text += " Match di genere*\n";
    for (let i = 0; i < already_matched.attribute.length; i++) {
        res_text += "> " + already_matched.attribute[i].partial_name + " " + already_matched.attribute[i].attribute + " (" + already_matched.attribute[i].rarity + ")\n";
    }

    return res_text;
}

function normalizeQuestionArray(imput_array) {
    console.log("> normalizeQuestionArray! ");

    let toanalize_array = [];
    let preciseName_array = [];
    let rarity_array = [];
    let kind_attribute = { type: "none", index: 0 };


    if (imput_array[0].match("rarit")) {
        let tmp_rarity;

        for (let i = 1; i < imput_array.length; i++) {
            tmp_rarity = parseInt(imput_array[i]);
            console.log("> " + imput_array[i] + " -> " + tmp_rarity);
            if (!isNaN(tmp_rarity)) {
                rarity_array.push(tmp_rarity);
                if (imput_array[i].indexOf("+") >= 0) {
                    if (kind_attribute.index < tmp_rarity) {
                        kind_attribute.type = "over";
                        kind_attribute.index = tmp_rarity;
                    }
                } else if (imput_array[i].indexOf("-") >= 0) {
                    if (kind_attribute.index > tmp_rarity) {
                        kind_attribute.type = "under";
                        kind_attribute.index = tmp_rarity;
                    }
                }
            }

        }
    } else {
        let tmp_index = imput_array.indexOf("di");
        console.log("> posizione di 'di': " + tmp_index);

        if (tmp_index > 0 && (tmp_index < imput_array.length - 1)) {
            console.log("> ok, testo la parola all'indice " + (tmp_index + 1));
            console.log("> " + imput_array[tmp_index + 1]);

            if (("r" == imput_array[tmp_index + 1]) || imput_array[tmp_index + 1].match("rarit")) {
                rarity_array = imput_array.slice((tmp_index + 2), imput_array.length);
            }
            imput_array = imput_array.slice(0, tmp_index);
        }

        let tmp_split;
        let precise_slice = imput_array.join(" ").split(" e ").join(",").split(",");

        for (let i = 0; i < precise_slice.length; i++) {
            tmp_split = precise_slice[i].split(" ");
            if (tmp_split.length > 1) {
                preciseName_array.push(precise_slice[i].trim());
            } else {
                toanalize_array.push(precise_slice[i].trim());
            }
        }
    }


    return ({
        toCheck_array: toanalize_array,
        precise_array: preciseName_array,
        rarity_array: rarity_array,
        attribute: kind_attribute
    });
}

function checkCardsNames(names_array) {
    let found_array = [];
    let tmp_condition = false;

    let allCards_Splitted = getPartialAndAttribute(allCards);

    for (let j = 0; j < allCards_Splitted.partial.length; j++) {
        for (let i = 0; i < names_array.length; i++) {
            tmp_condition = allCards_Splitted.partial[j].toLowerCase().match(names_array[i]);
            if (tmp_condition && found_array.indexOf(names_array[i]) < 0) {
                found_array.push(names_array[i]);
            }
        }
    }
    return (found_array);

}

function generateRandomPartial() {
    let partial = allCards[Math.ceil(Math.random() * (allCards.length - 1))].partial_name;
    if (partial.charAt(partial.length - 1) == "o") {
        return { gender: "male", partial_name: partial };
    } else if (partial.charAt(partial.length - 1) == "e" && partial != "Sferragliatrice") {
        return { gender: "male", partial_name: partial };
    } else if (partial.charAt(partial.length - 1) == "a" && partial.charAt(partial.length - 2) != "j") {
        return { gender: "female", partial_name: partial };
    } else
        return generateRandomPartial();
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //Il max è escluso e il min è incluso
}

function cardsLineEnd(line) {
    let res = "";

    let diff = 19 - line.length;
    if (diff > 0) {
        for (let i = 0; i < diff; i++) {
            res += " ";
        }
        return "`" + line + "`" + "`" + res + ".`" + "";
    } else {
        return line;
    }

}

//#persistence
function loadAllCards(compare_bool) {
    return new Promise(function (loadAllCards_res) {
        console.log("> Avvio il caricamento della lista figurine...");

        preloadInfos().then(function (cards_infos) {
            if (!cards_infos) {
                return loadAllCards_res({ cards_n: -1, new: false });
            }

            generalStuff = cards_infos;
            let now_date = Date.now() / 1000;
            console.log("Carte in locale: (ipotesi) " + generalStuff.cards_count);


            if (generalStuff.cards_count <= 0 || (now_date - generalStuff.last_cards_update) > 60 * 60*24*7) {
                console.log("> Sembra che debba aggiornarmi...");
                console.log("> Differenza (minuti) " + Math.ceil((now_date - cards_infos.last_cards_update) / 60));
                request({
                    "method": "GET",
                    "uri": "http://fenixweb.net:3300/api/v2/GbeUaWrGXKNYUcs910310/cards/",
                    "json": true
                }).then(function (infos) {
                    let new_cards = [];
                    allCards = [];

                    if (infos.res) {
                        let results = infos.res;
                        let tmp_full_name;
                        let tmp_partial;
                        let tmp_card = {};

                        for (let i = 0; i < results.length; i++) {
                            tmp_full_name = results[i].name.split(" ");
                            if (tmp_full_name[0].length > 3 && tmp_full_name[0] != "Pianta") {
                                tmp_partial = tmp_full_name[0];
                                tmp_full_name.shift();
                            } else {
                                tmp_partial = tmp_full_name[0] + " " + tmp_full_name[1];
                                tmp_full_name = tmp_full_name.slice(2);
                            }

                            tmp_card = {
                                id: results[i].id,
                                partial_name: tmp_partial,
                                attribute: tmp_full_name.join(" "),
                                rarity: results[i].rarity
                            };

                            if (!compare_bool) {
                                allCards.push(tmp_card);
                            } else {
                                if (checkCardsId(tmp_card.id) == null) {
                                    new_cards.push(tmp_card);
                                }
                            }

                        }
                    }

                    rarityInfo = allFiltered();
                    console.log("> Caricate " + allCards.length + " figurine (WEB-GET)");

                    return saveAllCards(allCards).then(function () {
                        console.log("> Lista in memoria aggiornata");
                        loadAllCards_res({ cards_n: allCards.length, new: new_cards });
                    });
                });
            } else {
                console.log("> Non aggiorno (LOCAL-LOAD)");

                return loadAllCardsFromLocal().then(function (allCards_loaded) {
                    if (generalStuff.cards_count != allCards_loaded.length) {
                        console.log("> ...Ma avrei dovuto!!");
                        console.log("> Differenza: " + (generalStuff.cards_count - allCards_loaded.length));
                        return updateInfos({
                            last_cards_update: 0,
                            cards_count: 0
                        }).then(function (updated_infos) {
                            loadAllCards(compare_bool);
                        });
                    } else {
                        allCards = allCards_loaded;
                        rarityInfo = allFiltered();
                        console.log("> Caricate " + allCards.length + " figurine (LOCALE)");
                        loadAllCards_res({ cards_n: allCards.length, new: false });
                    }

                });
            }
        });
    });
}
module.exports.loadAllCards = loadAllCards

function loadEdicolaStuff() {
    return new Promise(function (loadEdicolaStuff_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./CardsStuff/" + "edicolaGeneralInfos" + ".json");

        fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                return loadEdicolaStuff_res(false);
            } else {
                let rawdata = fs.readFileSync(main_dir);
                edicolaStuff = JSON.parse(rawdata);
                //console.log(edicolaStuff);
                return loadEdicolaStuff_res(true);

            }
        });
    });
}
module.exports.loadEdicolaStuff = loadEdicolaStuff;

function updateEdicolaStuff(infos) {
    return new Promise(function (updateEdicola_res) {
        let data = JSON.stringify(infos, null, 2);
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./CardsStuff/edicolaGeneralInfos.json");

        let res_text = "";
        let res_esit = true;
        return fs.writeFile(main_dir, data, function (error) {
            if (error) {
                console.log(error);
                res_esit = false;
                res_text = "*Woops...*\n";
                res_text += "Errore salvando le info per l'Edicola!\n\nSolo nrc382 sa cosa sia successo.";
            } else {
                edicolaStuff = infos;
            }

            return updateEdicola_res({ esit: res_esit, text: res_text });
        });
    });
}
module.exports.updateEdicolaStuff = updateEdicolaStuff;


function preloadInfos() {
    return new Promise(function (loadGlobalPlotDatares) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./CardsStuff/" + "generalInfos" + ".json");

        fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                return loadGlobalPlotDatares(false);
            } else {
                let rawdata = fs.readFileSync(main_dir);
                return loadGlobalPlotDatares(JSON.parse(rawdata));
            }
        });
    });
}

function updateInfos(infos) {
    return new Promise(function (updateInfos_res) {
        let data = JSON.stringify(infos, null, 2);
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./CardsStuff/generalInfos.json");

        let res_text = "";
        let res_esit = true;
        return fs.writeFile(main_dir, data, function (error) {
            if (error) {
                console.log(error);
                res_esit = false;
                res_text = "*Woops...*\n";
                res_text += "Errore salvando la lista craft!\n\nSolo nrc382 sa cosa sia successo.";
            }

            return updateInfos_res({ esit: res_esit, text: res_text });
        });
    });
}

function loadAllCardsFromLocal() {
    return new Promise(function (loadAllCardsFromLocal_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./CardsStuff/" + "allCards" + ".json");

        fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                console.error("> ERRORE accedendo al file!");
                return loadAllCardsFromLocal_res([]);
            } else {
                let rawdata = fs.readFileSync(main_dir);
                return loadAllCardsFromLocal_res(JSON.parse(rawdata));
            }
        });
    });
}

function saveAllCards(allCards) {
    return new Promise(function (saveAllCards_res) {
        let data = JSON.stringify(allCards, null, 2);
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./CardsStuff/allCards.json");

        let res_text = "";
        let res_esit = true;
        return fs.writeFile(main_dir, data, function (error) {
            if (error) {
                res_esit = false;
                res_text = "*Woops...*\n";
                res_text += "Errore salvando la lista delle figurine!\n\nSolo nrc382 sa cosa sia successo.";
            }
            let updated_infos = {
                last_cards_update: Date.now() / 1000,
                cards_count: allCards.length
            }
            return updateInfos(updated_infos).then(function (update_res) {
                return saveAllCards_res({ esit: res_esit, text: res_text });
            })

        });
    });
}

//#gestori
function simpleMessage(text, id) {
    let simple_msg = {
        chat_id: id,
        message_text: text,
        options: {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup:{ remove_keyboard: true}
            
        }
    };
    return simple_msg;
}

function simpleMessageWhitKeyB(user_id, msg_text, keyboard_array) {
    let simple_msg = {
        chat_id: user_id,
        message_text: msg_text,
        options: {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: {
                keyboard: keyboard_array,
                resize_keyboard: true,
                one_time_keyboard: true,
                selective: true
            }
        }
    };
    return simple_msg;
}

function parseInlineResult(user_id, query_id, up_type, res_array, message_text, has_button, special_id) {
    console.log("> parseInlineResult-> type: " + up_type + ", has_button: " + has_button);
    if (typeof special_id == "undefined") {
        special_id = "" + user_id;
    }
    let thumb = "";
    let calc_id;
    if (!has_button) {
        if (typeof special_id != "string") {
            calc_id = Date.now() + ":" + (user_id + "" + query_id).split('').sort(function () { return 0.5 - Math.random() }).join(''); //user_id + ":" + (Date.now() +"") ;
        } else {
            let date_str = Date.now().toString();
            calc_id = date_str.substring(1, 4) + date_str.substring(date_str.length - 10, date_str.length) + special_id;
        }
    } else {
        let date_str = Date.now().toString();
        calc_id = date_str.substring(1, 4) + date_str.substring(date_str.length - 10, date_str.length) + special_id;
    }
    switch (up_type) {
        case "single": {
            thumb = "https://www.shareicon.net/data/128x128/2015/10/25/661569_cards_512x512.png";
            break;
        }
        case "multy": {
            thumb = "https://www.shareicon.net/data/128x128/2015/10/26/662091_cards_512x512.png";
            break;
        } // 
        case "exchange": {
            thumb = "https://www.shareicon.net/data/128x128/2015/10/25/661851_cards_512x512.png";
            break;
        }
        default: {
            thumb = "https://www.shareicon.net/data/128x128/2016/05/30/773176_image_512x512.png";
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

        res.reply_markup.inline_keyboard.push([]);
    }

    res_array.push(res);
    return (res_array);
}

