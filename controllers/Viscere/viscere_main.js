// Viscere/viscere_main.js 
//  raccoglie le richieste verso il modulo viscere
//  delega ai sottomoduli la gestione
//  restituisce un array, anche vuoto, di risposte (oggetti del tipo toSend, toEdit, toDelete, callback_query, inline_query?) 

const parser = require("./Utilità/parser_messaggi");
const callback = require("./Controllers/callback_manager");
const cg = require("./Giocatori/giocatori_controller");


// Viscere è controllato esclusivamente tramite risposte a bottoni inline (callbaclk_query che iniziano per "VSCR:")
// L'unico messaggio di testo ammesso è il comando /viscere (??? Oltre all'helper ("?" mandato in risposta) ???)


module.exports.manage = async (update) => {
    let trigger = parser.trigger(update);

    if (Object.entries(trigger).length === 0) {
        console.error("Esco, non fa per me…")
        return ([]);
    } else if (trigger.callback.length > 0) {
        return await callback.gestisci(update);
    } else {
        return await cg.controllo_giocatore(trigger);
    }
}




