/* IL C.C gestisce la parte creativa degli Incarichi.
    
*/

// Arrivano qui tutti i messaggi di testo per utenti registrati che hanno has_panding != -1 e words_array.length >= 2 (cioè /bardo [qualsiasi_cosa])
async function dispatch_message(user, message, words_array) {
    // words_array è un array, trimmato, di tutte le parole nel messaggio in minuscolo (comando /bardo compreso). È usato SOLAMENTE per il controllo sui comandi

    /* restituisce:
        • to_return.al_main == true -> chiede invio del main_message
        • to_return == [{toSend?, toDelete?, toEdit?}]
    */


    let comands = []; // la lista dei comandi parsati
    let text_array = []; // array con tutto quello che non è un comando

    let paragraph_bool = false; // se il comando si riferisce -> chiede il caricamento delle info paragrafo

    let complete_text = message.text; // questo, una volta pulito dai comandi, sarà il testo-argomento in forma naturale

    // se il messaggio è in risposta, concateno al complete_text
    if (typeof message.reply_to_message != "undefined" && message.reply_to_message.from.is_bot == false) {
        complete_text += message.reply_to_message.text;
    }

    if (complete_text.indexOf("#") < 0) { // se non ci sono comandi, controlla se la prima parola è ESATTAMENTE un comando
        let main_cmds = [
            "t", "testo",
            "integra",
            "v", "variante",
            "n", "notturno",
            "s", "strada", "scelta",
            "a", "attesa", 
            "na", "alternativa", 
            "i", "intermedio", 
            "p", "paragrafo"
        ];

        let to_check = words_array[1].trim();
        if (main_cmds.indexOf(to_check) >= 0) { // inserisco il tag e pulisco complete_text rimuovendo il comando-trigger () 
            complete_text = "#" + to_check + complete_text.substring((words_array[0].length + 1 + words_array[1].length + 1)).trim();
        }
    } else { // altrimente pulisce complete_text rimuovendo il comando-trigger ()
        complete_text = complete_text.substring((words_array[0].length + 1)).trim();
    }

    // se effettivamente c'è un comando nel testo
    if (complete_text.indexOf("#") >= 0) { // Parser #comandi
        // Ciclo parser: cerca i comandi in ogni linea del testo, 
        // riempie: comands e text_array
        // setta: paragraph_bool

        let paragraph_array = complete_text.split("\n"); // array delle righe

        for (let i = 0; i < paragraph_array.length; i++) {
            let tmp_line = paragraph_array[i].trim().split(" "); // array delle parole

            for (let j = 0; j < tmp_line.length; j++) {
                tmp_line[j] = tmp_line[j].trim(); // trim() fondamentale

                if (tmp_line[j].charAt(0) == "#") { // è un comando
                    let tmp_cmd = tmp_line[j].toLowerCase().trim().substring(1); // tolgo il tag...
                    if (tmp_cmd.length > 0) {
                        if (tmp_cmd.length <= 2) { // Abbreviazioni
                            if (tmp_cmd == "t") { paragraph_bool = true; comands.push("TESTO"); }
                            else if (tmp_cmd == "nt") { paragraph_bool = true; comands.push("TESTO", "NOTTURNO"); }
                            else if (tmp_cmd == "v") { paragraph_bool = true; comands.push("VARIANTE"); }
                            else if (tmp_cmd == "n" || tmp_cmd == "s") { paragraph_bool = true; comands.push("STRADA"); }
                            else if (tmp_cmd == "na") { paragraph_bool = true; comands.push("ALTERNATIVA"); }
                            else if (tmp_cmd == "a") {
                                comands.push("ATTESA");
                                paragraph_bool = true;

                                let parsed_index = parseInt(tmp_line[j + 1]);
                                if (!isNaN(parsed_index)) {
                                    comands.push(Math.abs(parsed_index));
                                    j++;
                                }
                            }
                        } else {

                        }
                        if (tmp_cmd == "integra") {
                            comands.push("INTEGRA");
                            paragraph_bool = true;
                        } else if (tmp_cmd == "t" || tmp_cmd == "testo") {
                            paragraph_bool = true;
                            comands.push("TESTO");
                        } else if (tmp_cmd == "nt" || tmp_cmd == "notturno") {
                            paragraph_bool = true;
                            comands.push("NOTTURNO");
                        } else if (tmp_cmd == "v" || tmp_cmd == "variante") {
                            comands.push("VARIANTE");
                            paragraph_bool = true;
                        } else if (tmp_cmd == "n" || tmp_cmd == "nuovo" || tmp_cmd == "nuova") {
                            comands.push("NUOVA");
                            paragraph_bool = true;
                        } else if (tmp_cmd == "s" || tmp_cmd == "strada" || tmp_cmd == "scelta") {
                            paragraph_bool = true;
                            comands.push("STRADA");
                        } else if (tmp_cmd == "a" || tmp_cmd == "attesa") {
                            comands.push("ATTESA");
                            paragraph_bool = true;

                            let parsed_index = parseInt(tmp_line[j + 1]);
                            if (!isNaN(parsed_index)) {
                                comands.push(Math.abs(parsed_index));
                                j++;
                            }
                        } else if (tmp_cmd == "na" || tmp_cmd == "alternativa") {
                            comands.push("ALTERNATIVA");
                            paragraph_bool = true;
                        } else if (tmp_cmd == "i" || tmp_cmd == "intermedio") {
                            comands.push("INTERMEDIO");
                            paragraph_bool = true;
                        } else if (tmp_cmd == "varianti") {
                            comands.push("LISTA", "VAR");
                            paragraph_bool = true;
                        } else if (tmp_cmd == "alternative") {
                            comands.push("LISTA", "ALT");
                            paragraph_bool = true;
                        } else if (tmp_cmd == "strade" || tmp_cmd == "scelte") {
                            comands.push("LISTA", "STR");
                            paragraph_bool = true;
                        } else if (tmp_cmd.indexOf("parag") == 0) { // TODO
                            comands.push("LISTA", "PARAGRAFO");
                            paragraph_bool = true;
                        } else if (tmp_cmd == "l" || tmp_cmd == "lista" || tmp_cmd == "liste" || tmp_cmd == "indice") {
                            comands.push("LISTA");
                        } else {
                            comands.push(tmp_cmd);
                        }
                    }
                } else if (tmp_line[j] != " " && tmp_line[j].length > 0) { //...un po paranoico(!)
                    text_array.push(tmp_line[j]);
                }
            }

            if ((i < (paragraph_array.length - 1))) {
                text_array.push("\n");
            }
        }
    }



}

function dispatch_query(query) {

}