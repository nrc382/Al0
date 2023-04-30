// Espone gli oggetti con cui creare le viste, offendo costruttori basici

module.exports.logo = "🌋";


module.exports.risposta_callback = (trigger, text, show_alert, cache_time) => {
    return {
        query_id: trigger.id_callback,
        opzioni: {
            text: text,
            show_alert: (typeof show_alert != "boolean" ? false : show_alert),
            cache_time: (typeof cache_time != "number" ? 4 : cache_time)
        }
    }
}

module.exports.invia = (deletable) =>{
    let bottoni = [];

    if (deletable === true) {
        bottoni.push([{
            text: "⨷",
            callback_data: 'VSCR:FORGET'
        }]);
    }

    return {
        id_chat: -1,
        testo: "",
        opzioni: {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: bottoni
            }
        }
    };
}

module.exports.cancella = (trigger)=>{
    return {
        chat_id: trigger.id_utente,
        message_id: trigger.id_modifica
    }
}

module.exports.modifica = (trigger, testo, tastiera) =>{
    return {
        testo: typeof testo == "string" ? testo : "*???*\n\n…",
        opzioni: {
            chat_id: trigger.id_utente,
            message_id: trigger.id_modifica,
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: Array.isArray(tastiera) ? tastiera : []
            }
        }
    }
}

module.exports.modifica_tastiera = (trigger, tastiera) => {
    return {
        tastiera: {
            inline_keyboard: Array.isArray(tastiera) ? tastiera : []
        },
        opzioni: {
            chat_id: trigger.id_utente,
            message_id: trigger.id_modifica
        }
    }
}