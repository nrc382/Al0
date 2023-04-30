// Espone le funzioni (set e get) su giocatore
//  ottiene tramite giocatori_model.js le infonmazioni dalla persistenza 
//  LE FUNZIONI: 
//              in ingresso ricevono l'oggetto trigger 
//              restituiscono un array, anche vuoto, di risposte (oggetti message_res o callback_query_res)

const model = require("./giocatori_model");
const servizio = require("../Utilità/viste_di_servizio");
const vista = require("./giocatori_vista");



// Controllo Giocatore
// controlla se l'utente è registrato al modulo 
module.exports.controllo_giocatore = async (trigger) => {
    let lista_risposte = [];
    let controllo_registrazione = await model.controllo_registrazione(trigger.id_utente);

    if (controllo_registrazione.esito == false) { // console.log("Controllo NON superato");
        // Solo gli utenti che hanno ricevuto una "mappa" possono iniziare l'esplorazione!
        lista_risposte.push({ invia: vista.nessuna_mappa(trigger.id_utente) });
    } else { // console.log("Controllo superato");
        lista_risposte.push({ invia: vista.menu(trigger) });
    }

    return lista_risposte;
}


// Registra un Giocatore
module.exports.registra_giocatore = async (trigger) => {
    let lista_risposte = [];
    let controllo_registrazione = await model.controllo_registrazione(trigger.id_utente);

    if (controllo_registrazione.esito == true) {
        lista_risposte.push(servizio.risposta_callback(trigger,  vista.risposte_callback.già_iniziata, true));
        //lista_risposte.push({ invia: vista.già_registrato(trigger.id_utente) }); // Già registrato...
        lista_risposte.push(servizio.togli_tastiera(trigger)); // elimino la tastiera dal messaggio trigger
    } else {
        let genoma = model.crea_genoma().join("");
        console.log(genoma);
        console.log(typeof genoma);
        console.log(genoma.split(genoma[0]).length);


        let scheda_giocatore = model.crea_schedaGiocatore(trigger.id_utente, genoma);
        let registra_giocatore = await model.registra_giocatore(scheda_giocatore);
        let risposta;

        if (registra_giocatore.esito == false){
            risposta = vista.errore_generico(trigger.id_utente, registra_giocatore.codice);
            lista_risposte.push(servizio.risposta_callback(trigger, vista.risposte_callback.errore, true));
            lista_risposte.push({invia: risposta});
        } else {
            risposta = vista.registrazione_completata(trigger.id_utente, scheda_giocatore.genoma);

            lista_risposte.push(servizio.risposta_callback(trigger, vista.risposte_callback.menu));
            lista_risposte.push(servizio.modifica(trigger, risposta.testo, risposta.opzioni.reply_markup.inline_keyboard));
        }
    }
    return lista_risposte;
}

module.exports.menu_giocatore = async (trigger) => {
    let controllo_registrazione = await model.controllo_registrazione(trigger.id_utente);
    let risposta;
    let lista_risposte = [];


    if (controllo_registrazione.esito == false) { 
        risposta =  vista.nessuna_mappa(trigger.id_utente);
        lista_risposte.push(servizio.modifica(trigger, risposta.testo, risposta.opzioni.reply_markup.inline_keyboard));
        lista_risposte.push(servizio.risposta_callback(trigger, vista.risposte_callback.errore, true));

    } else { // MENU, CICLOPE, ZAINO
        if (trigger.callback[0] != "MENU"){
            let info_giocatore = await model.carica_infogiocatore(trigger.id_utente);

            if (info_giocatore.esito == false){
                risposta = vista.errore_generico(trigger.id_utente, info_giocatore.codice);
                lista_risposte.push(servizio.modifica(trigger, risposta.testo, risposta.opzioni.reply_markup.inline_keyboard));
                lista_risposte.push(servizio.risposta_callback(trigger, vista.risposte_callback.errore, true));
            } else {

            }
        } else {
            risposta = vista.menu(trigger);
            lista_risposte.push(servizio.modifica(trigger, risposta.testo, risposta.opzioni.reply_markup.inline_keyboard));
        }
    }
    return (lista_risposte);
}