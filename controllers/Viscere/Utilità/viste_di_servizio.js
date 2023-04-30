// VISTE DI SERVIZIO
// il modulo raccoglie i messaggi e le risposte alle callback per i casi di interazione utente non specifici

const messaggi = require("./scheletro_messaggi");


module.exports.impossibile_cancellare = (trigger) =>{
    let testo_query= "Woops\n\nIl messaggio è troppo vecchio perché possa cancellarlo…";
    return { 
        risposta_callback:  messaggi.risposta_callback(trigger, testo_query, true),
        modifica_tastiera: messaggi.modifica_tastiera(trigger)
    }
}

module.exports.cancella = (trigger) =>{
    let testo_query= "Ok…";

    return { 
        risposta_callback:  messaggi.risposta_callback(trigger, testo_query),
        cancella: messaggi.cancella(trigger)
    }
}

module.exports.togli_tastiera = (trigger) => {
    return {
        modifica_tastiera: messaggi.modifica_tastiera(trigger, [])
    }
}

module.exports.modifica = (trigger, nuovo_testo, nuova_tastiera) => {
    let tastiera = Array.isArray(nuova_tastiera) ? nuova_tastiera.slice() : trigger.tastiera.slice();
    return {modifica: messaggi.modifica(trigger, nuovo_testo, tastiera)};
}

module.exports.risposta_callback = (trigger, testo_query, show_alert, cache_time) => {
    return {
        risposta_callback: messaggi.risposta_callback(trigger, testo_query, show_alert, cache_time)
    }
}

