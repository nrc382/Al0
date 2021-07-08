
const fs = require('fs');
const path = require("path");
const db_model = require("./db_model");
const config = require('../models/config');


const submit_dir = config.submit_dir;
const users_dir = config.users_dir;

// #Draft (Bozza) = il file struct.json
//crea (eventualmente) la cartella per l'utente in /tmp e la popola con struct.json 
module.exports.newDraft = function newDraft(user_info) {
    return new Promise(function (newUserDraft_res) {
        let template = inc_draft_template();
        template.inc_title = "Il mio " + (user_info.personals.length + 1) + "° racconto";
        let data = JSON.stringify(template, null, 2);
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, `./${submit_dir}tmp/${user_info.id}`); // "/struct.json"

        return fs.mkdir(main_dir, 0766, function (error_create) {
            if (error_create && error_create.code != "EEXIST") {
                console.error("> Errore creando il file: " + main_dir);
                console.error(error_create);
                return newUserDraft_res({ esit: false, text: dealError(" NUT:1", "Non sono riuscito a creare i files necessari...") });
            } else {
                main_dir = path.join(main_dir, "/struct.json"); // 

                return fs.writeFile(main_dir, data, function (write_error) {
                    if (write_error) {
                        console.error("> Errore d'accesso al file: " + main_dir);
                        console.error(write_error);
                        return newUserDraft_res({ esit: false, text: dealError(" NUT:2", "Non sono riuscito a creare i files necessari...") });
                    }

                    let query = "UPDATE " + db_model.tables_names.users;
                    query += " SET HAS_PENDING = 0 ";
                    query += " WHERE USER_ID = ?";

                    return db_model.pool.query(query, [user_info.id], function (pool_err) {
                        if (pool_err) {
                            console.error(pool_err);
                            return newUserDraft_res({ esit: false, text: dealError(" NUT:3", "Errore aggiornando i tuoi dati nel database..") });
                        } else {
                            db_model.myLog("> Inizializzata una nuova avventura per " + user_info.id)
                            return newUserDraft_res({ esit: true, struct: template });
                        }
                    });
                });
            }
        });
    });
}

module.exports.deleteDraft = async function deleteDraft(user_id) {
    return new Promise(function (deleteUserDraft_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id);
        db_model.myLog(main_dir);

        return fs.readdir(main_dir, function (err, dir_files) {
            if (err) {
                console.error("> File non trovato: " + main_dir);
                return deleteUserDraft_res({ esit: false, text: dealError(" DUT:1", "Non mi risulta ci sia nulla da eliminare!") });
            } else {
                if (dir_files.length > 0) {
                    for (let i = 0; i < dir_files.length; i++) {
                        let filePath = main_dir + '/' + dir_files[i];
                        fs.unlinkSync(filePath);
                    }
                }

                let query = "UPDATE " + db_model.tables_names.users;
                query += " SET HAS_PENDING = -1 ";
                query += " WHERE USER_ID = ?";
                return db_model.pool.query(query, [user_id], function (pool_err) {
                    if (pool_err) {
                        console.error(pool_err);
                        return deleteUserDraft_res({ esit: false, text: dealError(" DUT:3", "Non sono riuscito ad aggiornare il database") });
                    } else {
                        return deleteUserDraft_res({ esit: true });
                    }
                });

            }
        });
    })


}

module.exports.updateDraft = async function updateDraft(user_id, data) {
    return new Promise(function (updateUserDraft_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/struct.json");

        return fs.writeFile(main_dir, JSON.stringify(data, null, 2), function (error) {
            if (error) {
                console.error("> Errore d'accesso al file: " + main_dir);
                console.error(error);
                return updateUserDraft_res({ esit: false, text: dealError(" SUT:1", "Non sono riuscito a modificare i files necessari...") });
            } else {
                db_model.myLog("> Modificata l'avventura di: " + user_id + ", struct.json")
                return updateUserDraft_res({ esit: true, struct: data });
            }
        });
    });

}

module.exports.getDraft = async function getDraft(user_id) {
    return new Promise(function (getUserDraft_res) {

        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/struct.json");

        fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                console.error(err);
                return getUserDraft_res({ esit: false, text: dealError(" GUTS:1", "Non sono riuscito a recuperare informazioni sulla bozza...") });
            } else {
                fs.readFile(main_dir, 'utf8', function (err2, rawdata) {
                    if (err) {
                        console.error(err2);
                        return getUserDraft_res({ esit: false, text: dealError(" GUTS:2", "Non sono riuscito a leggere le informazioni sulla bozza...") });
                    } else {
                        let tmp_daft = JSON.parse(rawdata);
                        console.error("Esco senza problemi...");

                        return getUserDraft_res(tmp_daft);
                    }
                });
            }
        });
    });

}

// #Paragraph (i paragrafi)

function paragraph_IDBuilder() {
    let id = [];
    let idPossible_chars = "ABCDEFGHIJKLMNOPQRSTQVXYWZ";
    for (let i = 0; i < 2; i++) {
        id.push(idPossible_chars.charAt(intIn(0, 25)));
    }

    id.push(Math.ceil(Math.random() * 9));
    id.push(Math.ceil(Math.random() * 9));

    return id.join("");
}

module.exports.checkParagraphID = function checkParagraphID(check_id) {
    if (typeof check_id == "undefined") {
        return false;
    }
    if (check_id.length != 4) {
        return false;
    } else {
        let tocheck_id = check_id.toUpperCase();
        if (isNaN(tocheck_id.charAt(2)) || isNaN(tocheck_id.charAt(3))) {
            return false;
        } else {
            let idPossible_chars = "ABCDEFGHIJKLMNOPQRSTQVXYWZ";
            if (idPossible_chars.indexOf(tocheck_id.charAt(0)) < 0 || idPossible_chars.indexOf(tocheck_id.charAt(1)) < 0) {
                return false;
            }
            return true;
        }
    }
}

module.exports.updateParagraph = async function updateParagraph(user_id, paragraph_id, new_data) {
    return new Promise(function (updateParagraph_res) {

        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/" + paragraph_id + ".json");
        return fs.writeFile(main_dir, JSON.stringify(new_data, null, 2), function (error) {
            if (error) {
                console.error("> Errore d'accesso al file: " + main_dir);
                console.error(error);
                return updateParagraph_res({ esit: false, text: dealError(" SUT:1", "Non sono riuscito a modificare i files necessari...") });
            } else {
                console.log("> Modificata l'avventura di: " + user_id + ", paragrafo " + paragraph_id)
                return updateParagraph_res({ esit: true, struct: new_data });
            }
        });
    });

}

async function getParagraph(user_id, paragraph_id) {
    return new Promise(function (getParagraph_res) {
        if (typeof paragraph_id != "string"){
            return getParagraph_res({ esit: false, text: dealError(" LP:0", "Input: "+paragraph_id) });
        }
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/" + paragraph_id + ".json");

        return fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                console.error("> Errore d'accesso al file: " + main_dir);
                console.error(err);
                return getParagraph_res({ esit: false, text: dealError(" LP:1", "Non sono riuscito a caricare il paragrafo " + paragraph_id) });
            } else {
                return fs.readFile(main_dir, 'utf8', function (err2, rawdata) {
                    if (err2) {
                        console.error("> Errore d'accesso al file: " + main_dir);
                        console.error(err);
                        return getParagraph_res({ esit: false, text: dealError(" LP:2", "Non sono riuscito a caricare il paragrafo " + paragraph_id) });
                    } else {
                        let tmp_daft = JSON.parse(rawdata);
                       
                        return getParagraph_res(tmp_daft);
                    }
                });
            }
        });

    });
}
module.exports.getParagraph = getParagraph;

// ACCESSORIE
function dealError(code, msg) {
    return ("*Woops...*\n_codice: " + code + "_\n\n" + msg + "\nSe riesci, contatta @nrc382");
}


// TEMPLATES

function inc_draft_template() { //struttura della bozza
    return ({
        inc_title: "",
        inc_intro: "",

        inc_ids: [],
        inc_pcache: [],

        inc_meta: {
            creazione: Math.floor(Date.now() / 1000),
            pubblicazione: -1
        },
        inc_options: {
            type: "SOLO",
            default_delay: 10
        }
    })
}

function inc_pcache_template(new_id) { // struttura per l'indice
    return ({
        id: new_id,
        title: "",
        level_deep: 0,
        esit_type: 0,

        room_name: ""
    });
}

function paragraph_template(new_id) { // struttura per i paragrafi
    return ({
        id: new_id,
        level_deep: 0,
        esit_type: 0,
        title: "",

        scripts: [],
        choices: []
    });
}
module.exports.paragraph_template = paragraph_template;

function scripts_template() { // struttura per i testi dei paragrafi
    return ({
        type: "", //"day/night",
        text: "",

        availability: {
            status_needed: [], // Vuoto = ALL, altrimenti MOJI_ARRAY,
            status_excluded: [], // Vuoto = NONE, altrimenti MOJI_ARRAY,

            choices_needed: [], // Vuoto = NONE, altrimenti PID_ARRAY,
            choiches_excluded: [], // Vuoto = NONE, altrimenti PID_ARRAY,

            stat_alto: "ALL", // LOW/MEDIUM/HIGH",
            stat_affiatamento: "ALL", // LOW/MEDIUM/HIGH",
            stat_centrale: "ALL", // LOW/MEDIUM/HIGH",
            stat_basso: "ALL", //LOW/MEDIUM/HIGH",

            item_ask: [] // Vuoto = NONE, altrimentiIDS_ARRAY"
        }
    });
}
module.exports.scripts_template = scripts_template;

function choice_template() { // struttura per le scelte dei paragrafi
    return ({
        dest_id: "", //"day/night",
        delay: 0,
        title_text: "",
        type: "", // ALL/DAY/NIGHT

        availability: {
            status_needed: [], // Vuoto = ALL, altrimenti MOJI_ARRAY,
            status_excluded: [], // Vuoto = NONE, altrimenti MOJI_ARRAY,

            choices_needed: [], // Vuoto = NONE, altrimenti PID_ARRAY,
            choiches_excluded: [], // Vuoto = NONE, altrimenti PID_ARRAY,

            stat_alto: "ALL", // ...LOW/MEDIUM/HIGH",
            stat_affiatamento: "ALL", // ...LOW/MEDIUM/HIGH",
            stat_centrale: "ALL", // ...LOW/MEDIUM/HIGH",
            stat_basso: "ALL", //..LOW/MEDIUM/HIGH",

            item_ask: [] // Vuoto = NONE, altrimentiIDS_ARRAY"
        },

        options: {
            items_ratio: "NONE", // ...RARE/UNLIKELY/COMMON/SURE",
            item_drop: [],  // Vuoto = NONE, altrimenti "IDS_ARRAY",
            item_take: [],  // Vuoto = NONE, altrimenti "IDS_ARRAY",

            status_ratio: "NONE",  // ...RARE/UNLIKELY/COMMON/SURE",
            status_become: "", // Vuoto = NONE, altrimenti MOJI",

            mob_ratio: "NONE", // ...RARE/UNLIKELY/COMMON/SURE"
            mob_type: "WEAK" // ...REGULAR/STRONG/BOSS"

        }

    });
}
module.exports.choiche_template = choice_template;


// #Retrocompatibilità

module.exports.update_user_draft = function update_user_draft(old_struct) {
    let new_struct = inc_draft_template();
    new_struct.inc_title = old_struct.title;
    new_struct.inc_intro = old_struct.desc;
    new_struct.inc_options.default_delay = old_struct.delay;
    new_struct.inc_options.type = old_struct.play_type;
    new_struct.inc_meta.creazione = old_struct.created;

    for (let i = 0; i < old_struct.paragraphs_ids.length; i++) {
        new_struct.inc_ids.push(old_struct.paragraphs_ids[i]);
    }

    if ("cached_paragraphs_infos" in old_struct){
        for (let i = 0; i < old_struct.cached_paragraphs_infos.length; i++) {
            let tmp_pcache = inc_pcache_template(old_struct.cached_paragraphs_infos[i].id);
            tmp_pcache.title = old_struct.cached_paragraphs_infos[i].title ? old_struct.cached_paragraphs_infos[i].title : "Inizio";
            tmp_pcache.level_deep = old_struct.cached_paragraphs_infos[i].level_deep;
            tmp_pcache.esit_type = -1;
            new_struct.inc_pcache.push(tmp_pcache);
        }
    }
    

    return new_struct;
}

module.exports.update_paragraph_struct = function update_paragraph_struct(old_struct) {

    let new_struct = paragraph_template(old_struct.id);
    new_struct.title = old_struct.choice_title;
    new_struct.esit_type = old_struct.esit_type;
    new_struct.level_deep = old_struct.level_deep;


    //Scripts
    if (old_struct.text != "") {
        let day_script = scripts_template();
        day_script.type = "DAY";
        day_script.text = old_struct.text;
        new_struct.scripts.push(day_script);
    }
    if (old_struct.night_text != "") {
        let night_script = scripts_template();
        night_script.type = "NIGHT";
        night_script.text = old_struct.night_text;
        new_struct.scripts.push(night_script);
    }
    if (typeof old_struct.variations != "undefined") {
        for (let i = 0; i < old_struct.variations.length; i++) {
            let new_script = scripts_template();
            if (old_struct.variations[i].night_text) {
                new_script.type = "NIGHT";
                new_script.text = old_struct.variations[i].night_text;
            } else {
                new_script.type = "DAY";
                new_script.text = old_struct.variations[i].text;
            }
            if (old_struct.variations[i].moji) {
                new_script.availability.status_needed.push(old_struct.variations[i].moji);
            } else if (old_struct.variations[i].p_id) {
                new_script.availability.choices_needed.push(old_struct.variations[i].p_id);
            }
            new_struct.scripts.push(new_script);
        }
    }

    //Choices
    if (typeof old_struct.choices != "undefined") {
    for (let i = 0; i < old_struct.choices.length; i++) {
        let new_choice = choice_template();
        new_choice.dest_id = old_struct.choices[i].id;
        new_choice.delay = old_struct.choices[i].delay;
        new_choice.type = old_struct.choices[i].availability;
        new_choice.title_text = old_struct.choices[i].title_text;
        if (old_struct.choices[i].excluded) {
            new_choice.availability.status_excluded = old_struct.choices[i].excluded;
        }
        if (old_struct.choices[i].exclusive) {
            new_choice.availability.status_needed = old_struct.choices[i].exclusive;
        }
        if (old_struct.choices[i].become) {
            new_choice.options.status_become = old_struct.choices[i].become;
        }
        new_struct.choices.push(new_choice);
    }
    }

    return (new_struct);
}
