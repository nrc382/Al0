// Carica da /Sources/Giocatori le informazioni su "Giocatori"
const fs = require('fs');
const path = require("path");
const genoma_model = require("./genoma_model");

const path_giocatori = `controllers/Viscere/Sorgenti/Giocatori`;



// * Controllo Registrazione *
// dato user_id (id Telegram) verifica l'esistenza dell'omonimo file .json in /Sources/Giocatori
// restituisce true o false
module.exports.controllo_registrazione = (user_id) => {
    return new Promise((controllo_resolve) => {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, `${path_giocatori}/${user_id}.json`);

        fs.access(main_dir, fs.F_OK, (err) => {
            if (err) {
                console.error(err);
                return controllo_resolve({ esito: false, codice: "ER:CREG" });
            } else {
                return controllo_resolve({ esito: true, codice: "CREG" });
            }
        });
    });
}

module.exports.registra_giocatore = (scheda_giocatore) => {
    return new Promise((registra_resolve) => {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, `${path_giocatori}/${scheda_giocatore.id}.json`);
        let data = JSON.stringify(scheda_giocatore, null, 2);

        return fs.writeFile(main_dir, data, function (write_error) {
            if (write_error) {
                console.error("> Errore nel salvataggio del file: " + main_dir);
                console.error(write_error);
                return registra_resolve({ esito: false, codice: "ER:GREG" });
            } else {
                return registra_resolve({ esito: true, codice: "GREG" });

            }
        });
    });

}

module.exports.crea_genoma = () => {
    return genoma_model.crea_genoma();
}

module.exports.crea_schedaGiocatore =  (id, genoma) => {
    return {
        id: id,
        genoma: genoma,
        info: {
            registrazione: Math.floor(Date.now()/1000),
            oracolo: 0,
            sconfitte: 0,
            uccisioni: 0
        },
        attributi: genoma_model.genera_attributi(genoma),
        sacca: {
            riempimento: 0,
            oggetti: []
        }
    }
}

module.exports.carica_infogiocatore = (user_id) => {
    return new Promise((carica__resolve) => {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, `${path_giocatori}/${user_id}.json`);

        return fs.readFile(main_dir, 'utf8' ,function (read_error, data) {
            if (read_error) {
                console.error("> Errore nella lettura del file: " + main_dir);
                console.error(read_error);
                return carica__resolve({ esito: false, codice: "ER:GLOAD" });
            } else {
                return carica__resolve({ esito: true, codice: "GLOAD",  res: JSON.parse(data)});

            }
        });
    });
}