// Riceve in ingresso un oggetto message o callback_query 
// restituisce un oggetto uniformato 'trigger'

// Un assunzione è che chat_id e user_id siano sempre corrispondenti (solo chat privata)


module.exports.trigger = (telegram_update) =>{
    let trigger = {
        id_utente: telegram_update.from.id,
        orario: -1,
        orario_callback: -1,
        id_callback: -1,
        id_modifica: -1,
        testo: "",
        tastiera: [],
        callback: [],
    }



    if (telegram_update.chat_id != trigger.id_utente){
        console.log(telegram_update);
    } 
    
    if (telegram_update.hasOwnProperty("message_id")){
        trigger.orario = telegram_update.date;
        trigger.testo = telegram_update.text
    } else {
        if (telegram_update.hasOwnProperty("message") && telegram_update.message.reply_markup.hasOwnProperty("inline_keyboard")){
            trigger.tastiera = telegram_update.message.reply_markup.inline_keyboard.slice()
        }
        trigger.orario = telegram_update.message.date;
        trigger.orario_callback = telegram_update.date;
        trigger.id_callback = telegram_update.id;
        trigger.id_modifica = telegram_update.message.message_id;
        trigger.testo = telegram_update.message.text;
        trigger.callback = [...trigger.callback, ...telegram_update.data.split(":").splice(1)]
    }
    
    return trigger;
}