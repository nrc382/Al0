const model = require("./sfide_model");

function sfide_menu(chat) {
    return new Promise(function (menu_res) {
        return model.carica_sfida(chat.id).then(function (chat_infos) {
            let chat_title = typeof chat.title == "string" ? chat.title : "Covo Anonimi"
            let message_text = `*${chat_title}*\n_Sfida di vocaboli_\n\n`;
            let buttons_array = [];
            if (chat_infos == false) {
                message_text += "Mi spiace, ma al momento c'è qualche cosa che non va in me...";
                buttons_array.push([{ text: "OK...", callback_data: "SFIDE:CHIUDI" }])
            } else {
                if (typeof chat_infos.podio != "undefined") {
                    buttons_array.push([{ text: "🔰 Podio", callback_data: "SFIDE:PODIO" }])
                }
                if (typeof chat_infos.attuale == "undefined") {
                    buttons_array.push([{ text: "⚔️ Lancia una Sfida", callback_data: "SFIDE:NUOVA" }])
                } else {
                    buttons_array.push([{ text: "⚔️ Alla Sfida", callback_data: "SFIDE:NUOVA" }])
                }
            }
            return menu_res(simpleMessage(chat.id, message_text, buttons_array));
        })

    });
}
module.exports.sfide_menu = sfide_menu;

function gestisciQuery(t_query) {
    return new Promise(function (query_res) {
        let args = t_query.data.split(":").splice(1);
        let to_return = {
            query: { id: t_query.id, options: { text: "", cache_time: 1 } }
        }

        if (args[0] == "PODIO") {

        } else if (args[0] == "NUOVA") {
            return nuova_sfida(t_query.message.chat, t_query.from).then(function (nuovaSfida_res) {
                nuovaSfida_res.query.id = to_return.query.id;
                if (typeof nuovaSfida_res.toEdit != "undefined") {
                    nuovaSfida_res.toEdit.mess_id = t_query.message.message_id;
                }
                if (nuovaSfida_res.force_delete == true) {
                    nuovaSfida_res.toDelete = { chat_id: t_query.message.chat.id, mess_id: t_query.message.message_id }
                }
                return query_res(nuovaSfida_res);
            })
        } else if (args[0] == "ENTRA" || args[0] == "ESCI") {
            return iscrizione(t_query.message.chat, t_query.from, args[0]).then(function (iscriozione_res) {
                iscriozione_res.query.id = to_return.query.id;
                if (typeof iscriozione_res.toEdit != "undefined") {
                    iscriozione_res.toEdit.mess_id = t_query.message.message_id;
                }
                if (iscriozione_res.force_delete == true) {
                    iscriozione_res.toDelete = { chat_id: t_query.message.chat.id, mess_id: t_query.message.message_id }
                }
                return query_res(iscriozione_res);
            });
        } else {
            to_return.query.options.text = "Prossimamente…";
            return query_res(to_return);
        }

    });
}
module.exports.gestisciQuery = gestisciQuery;

function nuova_sfida(chat, starter) {
    return new Promise(function (sfida_res) {
        return model.carica_sfida(chat.id).then(function (chat_infos) {

            let risposta = { query: { options: { text: "" } } };

            if (chat_infos == false) {
                risposta.query.options.text = "🤒 Woops!\n\nMi spiace, ma al momento c'è qualche cosa che non va in me...";
                risposta.query.options.show_alert = true;
                return sfida_res(risposta);
            } else if (typeof chat_infos.attuale != "undefined") {
                risposta.query.options.text = "Woops!\n\nC'è già una sfida in corso!";
                risposta.query.options.show_alert = true;
                risposta.force_delete = true;
                return sfida_res(risposta);
            } else {
                let tmp_prefisso = genera_sillaba();
                chat_infos.attuale = {
                    prefisso: tmp_prefisso,
                    proponente: starter.first_name,
                    partecipanti: [{ id: starter.id, nome: starter.first_name }],
                    parole: []
                };
                return model.aggiorna_sfida(chat.id, chat_infos).then(function (res) {
                    if (res == false) {
                        risposta.query.options.text = "🤒 Woops!\n\nMi spiace, ma al momento c'è qualche cosa che non va in me...";
                        risposta.query.options.show_alert = true;
                    } else {
                        risposta.query.options.text = "Sfida Lanciata!";
                        risposta.toEdit = sfida_message(chat, chat_infos);
                    }
                    return sfida_res(risposta);
                });
            }
        });
    });
}

function iscrizione(chat, utente, opzione) {
    return new Promise(function (iscrizione_res) {
        return model.carica_sfida(chat.id).then(function (chat_infos) {

            let risposta = { query: { options: { text: "" } } };

            if (chat_infos == false) {
                risposta.query.options.text = "🤒 Woops!\n\nMi spiace, ma al momento c'è qualche cosa che non va in me...";
                risposta.query.options.show_alert = true;
                return iscrizione_res(risposta);
            } else if (typeof chat_infos.attuale == "undefined") {
                risposta.query.options.text = "Woops!\n\nNon mi risulta ci sia una sfida in corso...";
                risposta.query.options.show_alert = true;
                risposta.force_delete = true;
                return iscrizione_res(risposta);
            } else {
                let trovato = false;
                let elimina = false;
                for (let i = 0; i < chat_infos.attuale.partecipanti.length; i++) {
                    if (chat_infos.attuale.partecipanti[i].id == utente.id) {
                        trovato = true;
                        if (opzione == "ESCI") {
                            if (chat_infos.attuale.partecipanti.length == 1) {
                                risposta.query.options.text = "Sfida Annullata...";
                                delete chat_infos.attuale.partecipanti;
                                elimina = true;
                            } else {
                                risposta.query.options.text = "Sei uscito dalla sfida";
                                chat_infos.attuale.partecipanti.splice(i, 1);
                            }
                            break;
                        } else {
                            risposta.query.options.text = "🙃\n\nSei già iscritto alla sfida...";
                            risposta.query.options.show_alert = true;
                            return iscrizione_res(risposta);
                        }
                    }
                }
                if (!trovato) {
                    if (opzione == "ENTRA") {
                        risposta.query.options.text = "Ti sei iscritto alla sfida";
                        chat_infos.attuale.partecipanti.push({ id: utente.id, nome: utente.first_name });
                    } else {
                        risposta.query.options.text = "🙃\n\nNon sei iscritto alla sfida...";
                        risposta.query.options.show_alert = true;
                        return iscrizione_res(risposta);
                    }
                }

                return model.aggiorna_sfida(chat.id, chat_infos).then(function (res) {
                    if (res == false) {
                        risposta.query.options.text = "🤒 Woops!\n\nMi spiace, ma al momento c'è qualche cosa che non va in me...";
                        risposta.query.options.show_alert = true;
                    } else {
                        risposta.toEdit = sfida_message(chat, chat_infos);
                    }
                    return iscrizione_res(risposta);
                });
            }
        });
    });
}

function sfida_message(chat, sfida) {
    let chat_title = typeof chat.title == "string" ? chat.title : "Covo Anonimo"
    let message_text = `*${chat_title}*\n_Sfida di vocaboli lanciata da ${starter.first_name}_\n\n`;
    message_text += `\\> Prefisso: ${tmp_prefisso.toUpperCase()}\n`;

    let buttons_array = [[
        { text: "✊", callback_data: "SFIDE:ENTRA" },
        { text: "❌", callback_data: "SFIDE:ESCI" }
    ]];

    if (sfida.attuale.partecipanti.length){
        message_text += `\\> Partecipanti: ${sfida.attuale.partecipanti.length}\n`;
        for (let i = 0; i < chat_infos.attuale.partecipanti.length; i++) {
            message_text += ` · ${chat_infos.attuale.partecipanti[i].nome}\n`;
        }
        buttons_array[0].splice(1, 0, { text: "🔄", callback_data: "SFIDE:AGGIORNA" });

        buttons_array.push([{ text: `Avvia sfida a ${chat_infos.attuale.partecipanti.length}`, callback_data: "SFIDE:AVVIA" }]);

    }

    return  simpleMessage(chat.id, message_text, buttons_array);
    
}

function genera_sillaba() {
    let vocali = ["a", "e", "i", "o", "u"];
    let consonanti = ["b", "c", "d", "f", "g", "l", "n", "m", "p", "q", "r", "s", "t", "v", "z"];
    let sillaba = "";
    if (intIn(0, 10) > 5) {
        sillaba = vocali[intIn(0, vocali.length)] + consonanti[intIn(0, consonanti.length)];
    } else {
        sillaba = consonanti[intIn(0, consonanti.length)] + vocali[intIn(0, vocali.length)];
        if (intIn(0, 5) > 3) {
            sillaba += consonanti[intIn(0, consonanti.length)];
        }
    }
    return sillaba;

}

function intIn(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //max è escluso, min incluso
}

function simpleMessage(id, text, buttons_array) {
    let simple_msg = {
        chat_id: id,
        message_text: text,
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

