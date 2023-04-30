// Raccoglie i messaggi testuali inviati via telegram per il sottomodulo Giocatori

const messaggi = require("../Utilità/scheletro_messaggi");
const QT = "VSCR";
const titolo = `${messaggi.logo} *Terre Remote…*`;

module.exports.risposte_callback = {
    errore: "Dannazione!",
    menu: "Verso terre remote…",
    già_iniziata: "???\n\nLa tua esplorazione è già iniziata…"
}

module.exports.nessuna_mappa = (user_id) =>{
    let risposta = messaggi.invia(true);
    let casualità = [`con una mappa per orientarsi…`, `con un po di coraggio…`, `\n…`];

    risposta.id_chat = user_id;
    risposta.testo= `${titolo}\n\n`;
    risposta.testo+= `_Ci sono territori selvaggi oltre i confini del regno._\n`;
    risposta.testo+= `_Forse… ${casualità[Math.floor(Math.random()*casualità.length)]}_`;

    risposta.opzioni.reply_markup.inline_keyboard.unshift([{text: "⚔️", callback_data: `${QT}:REGISTRA`}]);
    return risposta;
}

module.exports.già_registrato = (user_id) =>{
    let risposta = messaggi.invia(true);

    risposta.id_chat = user_id;
    risposta.testo= `${titolo}\n\n`;
    risposta.testo+= `_La tua esplorazione è già iniziata…_\n`;

    return risposta;
}

module.exports.errore_generico = (user_id, codice_errore) =>{
    let risposta = messaggi.invia(true);

    risposta.id_chat = user_id;
    risposta.testo= `${titolo}\nWoops!\n\n`;
    risposta.testo+= `_Qualche stregoneria ha fatto inceppare un ingranaggio!\n`;
    risposta.testo+= `\nL'unica soluzione potrebbe essere quella di contattare direttamente @nrc382_\n`;
    risposta.testo+= `> Errore: ${codice_errore}`;

    return risposta;
}

module.exports.registrazione_completata = (user_id, genoma) =>{
    let risposta = messaggi.invia(false);

    risposta.id_chat = user_id;
    risposta.testo= `${titolo}\n???\n\n`;
    risposta.testo+= `_Non davanti agli occhi ma nitida, nella tua testa, una strana sequenza di lettere appare_\n\n`;
    risposta.testo+= `> \`${genoma}\``;

    risposta.opzioni.reply_markup.inline_keyboard = [[{text: "…", callback_data: `${QT}:MENU`}]];

    return risposta;
}

module.exports.menu = (trigger) => {
    let prima_linea = [];
    let risposta = messaggi.invia(true);
    risposta.id_chat = trigger.id_utente;

    risposta.testo= `${titolo}\n\n`;
    prima_linea.push(
        {text: `${messaggi.logo}`, callback_data:`${QT}:DUNGEON`},
        {text: "👁", callback_data:`${QT}:CICLOPE`},
        {text: "🎒", callback_data:`${QT}:ZAINO`},
        {text: "?", callback_data:`${QT}:MANUALE`},
    );
    risposta.opzioni.reply_markup.inline_keyboard.unshift(prima_linea);

    return risposta;
}