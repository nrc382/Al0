const parser = require("../Utilità/parser_messaggi");
const servizio = require ("../Utilità/viste_di_servizio");
const cg = require("../Giocatori/giocatori_controller");


module.exports.gestisci = async (update) => {
    let trigger = parser.trigger(update);

    switch (trigger.callback[0]){
        case ("FORGET"): return chiudi_messaggio(trigger);
        case ("REGISTRA"): return await cg.registra_giocatore(trigger);
        case ("MANUALE"): break;
        case ("DUNGEON"): break;
        default: return await cg.menu_giocatore(trigger);
    }

}


function chiudi_messaggio(trigger){
    if (((Date.now()/1000) - trigger.orario) >= (60*60*24) ){
        return servizio.impossibile_cancellare(trigger);
    } else {
        return servizio.cancella(trigger);
    }
}


