const mysql = require('mysql');
const config = require('../models/config');
//const request = require('request-promise');
const fs = require('fs');
const path = require("path");
const { intIn } = require('../Lega/LegaModel');

const simple_log = true;

const databaseUser = config.databaseLootUser;
const databaseHost = config.databaseHost;
const databasePsw = config.databasePsw;
const databaseName = config.databaseIncarichi;


// Accessorie
const submit_dir = "controllers/Incarichi/UsersSubmit/";

const pool = mysql.createPool({
    host: databaseHost,
    user: databaseUser,
    password: databasePsw,
    database: databaseName,

    charset: 'utf8mb4'
});

const tables_names = {
    users: "Users",
    incarichi: "Incarichi"
};

function create_table(string, struct, connection) {
    return new Promise(function (create_resolve) {
        return connection.query("CREATE TABLE " + string + struct + " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;",
            function (err, res) {
                if (res) {
                    myLog(">\t\t> Creata la tabella: " + string);
                    return create_resolve(true);
                } else {
                    myLog(">\t\t> Errore creando la tabella: " + string);
                    console.error(err);
                    return create_resolve(false);
                }
            });
    });
}

function recreateAllTablesStruct() {
    return new Promise(function (local_tables_struct) {
        return pool.getConnection(function (conn_err, single_connection) {
            if (conn_err) {
                myLog("> Non sono riuscito a connettermi al database...\n");
                let tmp_connection = mysql.createConnection({
                    host: databaseHost,
                    user: databaseUser,
                    password: databasePsw
                });
                return tmp_connection.connect(function (connection_error) {
                    if (connection_error) {
                        console.error("> Nope... non sono riuscito neanche a creare il DB");
                        console.error(connection_error);
                        return local_tables_struct(false);
                    } else {
                        myLog("> Connesso all'istanza mysql, (ri)creo il DB...");
                        return tmp_connection.query("CREATE DATABASE " + databaseName, function (err, result) {
                            tmp_connection.release();
                            if (err) {
                                return local_tables_struct(false);
                            }
                            myLog("> Database Creato, ricomincio!");
                            return local_tables_struct(recreateAllTablesStruct());

                        });
                    }
                })
            } else if (single_connection) {
                let main_dir = path.dirname(require.main.filename);
                main_dir = path.join(main_dir, "./controllers/Incarichi/IncarichiTablesStruct.json");
                myLog("> Path per il source.json: " + main_dir);
                return fs.access(main_dir, fs.F_OK, function (err) {
                    if (err) {
                        console.error("> Non ho trovato il file!!\n");
                        console.error(err);
                        return local_tables_struct(false);
                    } else {
                        myLog("> Creo le tabelle nel database " + databaseName);
                        myLog(tables_names);
                        let rawdata = fs.readFileSync(main_dir);
                        let tables_structs = JSON.parse(rawdata);
                        let recreate = [];
                        recreate.push(create_table(tables_names.users, tables_structs.usrs, single_connection));
                        recreate.push(create_table(tables_names.incarichi, tables_structs.incarichi, single_connection));

                        return Promise.all(recreate).then(function (create_res) {
                            //pool.releaseConnection(single_connection);
                            single_connection.release();

                            if (create_res) {
                                myLog("> Ricreate tutte le tabelle senza Errori");
                                return local_tables_struct(true);
                            } else {
                                console.error("> Errore nella creazione delle tabelle");
                                return local_tables_struct(false);
                            }
                        });
                    }
                });
            }
        });
    });
}

function myLog(string) {
    if (simple_log) {
        console.log(string);
    }
}

function dealError(code, msg) {
    return ("*Woops...*\n_codice: " + code + "_\n\n" + msg + "\nSe riesci, contatta @nrc382");
}


// ***********************************************
module.exports.User = class User {
    constructor(rawdata, personals) {
        this.id = rawdata.USER_ID;
        this.reg_date = rawdata.REG_DATE;
        this.alias = rawdata.ALIAS;
        this.gender = rawdata.GENDER;
        this.role = rawdata.ROLE;
        this.scones = rawdata.SCONES;
        this.tmp_text = rawdata.TMP_TEXT;
        this.b_point = rawdata.B_POINT;
        this.has_pending = rawdata.HAS_PENDING;
        this.curr_activity = rawdata.CURR_ACTIVITY;
        this.last_actuvity = rawdata.LAST_ACTIVITY;


        if ((personals instanceof Array)) {
            this.personals = personals;
        } else {
            this.personals = [];
        }
    }
}

class Choice { //[{ id, delay, type, title_text}]
    constructor(rawdata) {
        this.id = rawdata.id;
        this.delay = rawdata.delay;
        this.availability = rawdata.type; // ("ALL", "DAY", "NIGTH") // ...long (:
        this.type = rawdata.type; // (0, -1, 1) = (continua, fine negativa, fine positiva)
        this.title_text = rawdata.title_text;
    }
}

function getUserInfos(user_id) {
    return new Promise(function (getUserInfos_res) {
        return pool.query(
            "SELECT * FROM " + tables_names.users + " WHERE USER_ID = ?",
            [user_id],
            function (err, usr_infos) {
                if (err) {
                    console.error(err)
                    return getUserInfos_res(false);
                } else {
                    return getUserInfos_res(usr_infos);
                }
            });
    })
}
module.exports.getUserInfos = getUserInfos;

module.exports.insertUser = function insertUser(user_infos) {
    return new Promise(function (insertUser_res) {
        let query = "INSERT INTO " + tables_names.users;
        query += "(USER_ID, ALIAS, REG_DATE) ";
        query += "VALUES ? ";

        return pool.query(
            query,
            [[user_infos]],
            function (err, usr_infos) {
                if (err) {
                    console.error(err)
                    return insertUser_res(false);
                } else {
                    return insertUser_res(usr_infos);
                }
            });
    });
}

module.exports.checkAlias = function checkAlias(alias) {
    return new Promise(function (checkAlias_res) {
        return pool.query(
            "SELECT USER_ID FROM " + tables_names.users + " WHERE ALIAS LIKE ?",
            [alias],
            function (err, alias_res) {
                if (err) {
                    console.error(err)
                    return checkAlias_res(false);
                } else {
                    if (alias_res.length == 0) {
                        return checkAlias_res(true);
                    } else {
                        return checkAlias_res(false);
                    }
                }
            });
    });
}

module.exports.setUserGender = function setUserGender(user_id, new_gender) {
    return new Promise(function (setUserGender_res) {

        let query = "UPDATE " + tables_names.users;
        query += " SET GENDER = ? ";
        query += " WHERE USER_ID = ?";
        return pool.query(query, [new_gender, user_id], function (err, db_res) {
            if (err) {
                console.error(err);
                return setUserGender_res({ esit: false, text: dealError(" SUG:1", "Errore aggiornando i tuoi dati nel database..") });
            } else {
                myLog("> Settato il genere (" + new_gender + ") per " + user_id)
                return setUserGender_res(true);
            }
        });
    });
}

// # TmpStruct (Bozza)

module.exports.newUserTmpStruct = function newUserTmpStruct(user_info) {
    return new Promise(function (newUserTmp_res) {
        let template = standardStructTemplate();
        template.title = "La mia " + (user_info.personals.length + 1) + "° storia";
        let data = JSON.stringify(template, null, 2);
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_info.id + ""); // "/struct.json"

        return fs.mkdir(main_dir, 0766, function (error_create) {
            if (error_create && error_create.code != "EEXIST") {
                console.error("> Errore creando il file: " + main_dir);
                console.error(error_create);
                return newUserTmp_res({ esit: false, text: dealError(" NUT:1", "Non sono riuscito a creare i files necessari...") });
            } else {
                main_dir = path.join(main_dir, "/struct.json"); // 

                return fs.writeFile(main_dir, data, function (write_error) {
                    if (write_error) {
                        console.error("> Errore d'accesso al file: " + main_dir);
                        console.error(write_error);
                        return newUserTmp_res({ esit: false, text: dealError(" NUT:2", "Non sono riuscito a creare i files necessari...") });
                    }

                    let query = "UPDATE " + tables_names.users;
                    query += " SET HAS_PENDING = 1 ";
                    query += " WHERE USER_ID = ?";
                    return pool.query(query, [user_info.id], function (pool_err) {
                        if (pool_err) {
                            console.error(pool_err);
                            return newUserTmp_res({ esit: false, text: dealError(" NUT:3", "Errore aggiornando i tuoi dati nel database..") });
                        } else {
                            myLog("> Inizializzata una nuova avventura per " + user_info.id)
                            return newUserTmp_res({ esit: true, struct: template });
                        }
                    });
                });
            }
        });
    });
}

function getUserTmpStruct(user_id) {
    return new Promise(function (loadCraftList_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/struct.json");

        return fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                console.log(err)
                return loadCraftList_res(false);
            } else {
                return fs.readFile(main_dir, 'utf8', function (err2, rawdata) {
                    if (err) {
                        console.log(err2)
                        return loadCraftList_res(false);
                    } else {
                        console.log(rawdata);
                        return loadCraftList_res(JSON.parse(rawdata));
                    }
                });
            }
        });
    });
}
module.exports.getUserTmpStruct = getUserTmpStruct;

function setUserTmpStruct(user_id, data) {
    return new Promise(function (setUserTmp_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/struct.json");

        return fs.writeFile(main_dir, JSON.stringify(data, null, 2), function (error) {
            if (error) {
                console.error("> Errore d'accesso al file: " + main_dir);
                console.error(error);
                return setUserTmp_res({ esit: false, text: dealError(" SUT:1", "Non sono riuscito a modificare i files necessari...") });
            } else {
                myLog("> Modificata l'avventura di: " + user_id)
                return setUserTmp_res({ esit: true, struct: data });
            }
        });
    });
}
module.exports.setUserTmpStruct = setUserTmpStruct;

module.exports.deleteUserTmp = function deleteUserTmp(user_id) {
    return new Promise(function (deleteUserTmp_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id);
        myLog(main_dir);

        return fs.readdir(main_dir, function (err, dir_files) {
            if (err) {
                console.error("> File non trovato: " + main_dir);
                return deleteUserTmp_res({ esit: false, text: dealError(" DUT:1", "Non mi risulta ci sia nulla da eliminare!") });
            } else {
                if (dir_files.length > 0) {
                    for (let i = 0; i < dir_files.length; i++) {
                        let filePath = main_dir + '/' + dir_files[i];
                        fs.unlinkSync(filePath);
                    }
                }
                let query = "UPDATE " + tables_names.users;
                query += " SET HAS_PENDING = 0 ";
                query += " WHERE USER_ID = ?";
                return pool.query(query, [user_id], function (pool_err) {
                    if (pool_err) {
                        console.error(pool_err);
                        return deleteUserTmp_res({ esit: false, text: dealError(" DUT:3", "Non sono riuscito ad aggiornare il database") });
                    } else {
                        return deleteUserTmp_res({ esit: true });
                    }
                });

            }
        });
    });
}

function editUserTmpStruct(user_id, type, new_infos) { // type: "title", "desc", "diff", "type", "delay"
    return new Promise(function (editUserTmp_res) {
        return getUserTmpStruct(user_id).then(function (res_tmp) {
            if (type == "TITLE") {
                res_tmp.title = new_infos;
            } else if (type == "DESC") {
                res_tmp.desc = new_infos;
            } else if (type == "diff") {
                res_tmp.diff = new_infos;
            } else if (type == "SOLO" || type == "MULTI") {
                res_tmp.type = type;
            } else if (type == "DELAY") {
                res_tmp.delay = new_infos;
            }
            console.log(res_tmp);
            return setUserTmpStruct(user_id, res_tmp).then(function (set_res) {
                return editUserTmp_res(set_res);
            })
        });
    });
}
module.exports.editUserTmpStruct = editUserTmpStruct;

function standardStructTemplate() { // standardParagraphTemplate
    return ({
        title: "",
        created: (Date.now() / 1000),
        diff: 0,
        desc: "",
        type: "MULTI",
        delay: 10,
        paragraphs_ids: [],
        complete_paragraphsIds: []
        // adventure: {
        //     paragraphs_ids: [], // custodisce i curr_id per ogni elemento di paragraphs, una versione semplificata all'osso di "three[]"
        //     //three: [], //{curr_id, choices_esit[]}, choices_esit = {c_id, esit_id} // idea: in esit_id mettere l'indice per paragraphs[] (?) 
        //     paragraphs: [] // {curr_id, type, text, ?choices[]}, type = (loosing (-1), winning (1), continue (0)), choices = { next_id, delay, text} 
        // }
    })
}

// # Paragraphs (Bozza)

function standardParagraphTemplate(new_id, fixed_delay, fixed_father) { // standardParagraphTemplate
    return ({
        id: new_id,
        father: fixed_father,
        type: 0, // (loosing (-1), winning (1), continue (0)
        delay: fixed_delay,
        text: "",
        night_text: "",
        choices: [] // [{ id, delay, type, title_text}]
    })
}

function paragraph_IDBuilder() {
    let id = [];
    id.push(Math.ceil(Math.random() * 9));
    id.push(Math.ceil(Math.random() * 9));

    let idPossible_chars = "ABCDEFGHIJKLMNOPQRSTQVXYWZ";
    for (let i = 0; i < 2; i++) {
        id.push(idPossible_chars.charAt(intIn(0, 25)));
    }

    return id.join("");
}

module.exports.createParagraph = function createParagraph(user_id, inc_struct, loop_n, father) {
    return new Promise(function (createParagraph_res) {
        let tmp_pId = paragraph_IDBuilder();
        if (loop_n > 9) {
            console.error(">\tTroppi tentativi, esco!");
            return createParagraph_res({ esit: false, text: dealError(" CP:2", "Al momento non è possibile creare piu di 62.500 paragrafi...") });
        } else if (inc_struct.paragraphs_ids.indexOf(tmp_pId) >= 0) {
            return createParagraph(inc_struct.paragraphs_ids, (loop_n + 1)); // ricorsiva
        } else { // Valido:
            //return temp;
            inc_struct.paragraphs_ids.push(tmp_pId);
            let template = standardParagraphTemplate(tmp_pId, inc_struct.delay, father);
            let data = JSON.stringify(template, null, 2);
            let main_dir = path.dirname(require.main.filename);
            main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/" + tmp_pId + ".json");

            return fs.writeFile(main_dir, data, function (error) {
                if (error) {
                    console.error("> Errore d'accesso al file: " + main_dir);
                    console.error(error);
                    return createParagraph_res({ esit: false, text: dealError(" CP:1", "Non sono riuscito a creare i files necessari...") });
                } else {
                    return setUserTmpStruct(user_id, inc_struct).then(function (set_res) {
                        return createParagraph_res(template);
                    });
                }
            });
        }
    });
}

module.exports.createChoice = function createChoice(user_id, choice_text, inc_struct, loop_n) {
    return new Promise(function (createParagraph_res) {
        let tmp_pId = paragraph_IDBuilder();
        if (loop_n > 9) {
            console.error(">\tTroppi tentativi, esco!");
            return createParagraph_res({ esit: false, text: dealError(" CP:2", "Al momento non è possibile creare piu di 62.500 paragrafi...") });
        } else if (inc_struct.paragraphs_ids.indexOf(tmp_pId) >= 0) {
            return createParagraph(inc_struct.paragraphs_ids, (loop_n + 1)); // ricorsiva
        } else { // Valido:
            //return temp;

            let template = standardParagraphTemplate(tmp_pId, inc_struct.delay, inc_struct.paragraph_id);
            let data = JSON.stringify(template, null, 2);
            let main_dir = path.dirname(require.main.filename);
            main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/" + tmp_pId + ".json");

            return fs.writeFile(main_dir, data, function (error) {
                if (error) {
                    console.error("> Errore d'accesso al file: " + main_dir);
                    console.error(error);
                    return createParagraph_res({ esit: false, text: dealError(" CP:1", "Non sono riuscito a creare i files necessari...") });
                } else {
                    return setUserTmpStruct(user_id, inc_struct).then(function (set_res) {
                        return createParagraph_res(new Choice({
                            id: tmp_pId,
                            delay: inc_struct.delay,
                            availability: "ALL",
                            type: 0, // 0 = continua, -1 = 
                            title_text: choice_text
                        }));
                    });
                }
            });
        }
    });
}

module.exports.loadParagraph = function loadParagraph(user_id, paragraph_id) {
    return new Promise(function (loadParagraph_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/" + paragraph_id + ".json");

        return fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                console.log(err)
                return loadCraftList_res(false);
            } else {
                return fs.readFile(main_dir, 'utf8', function (err2, rawdata) {
                    if (err) {
                        console.error("> Errore d'accesso al file: " + main_dir);
                        console.error(err);
                        return loadParagraph_res({ esit: false, text: dealError(" LP:1", "Non sono riuscito a caricare il paragrafo " + paragraph_id) });
                    } else {
                        return loadParagraph_res(JSON.parse(rawdata));
                    }
                });
            }
        });

    });
}

module.exports.updateParagraph = function updateParagraph(user_id, paragraph_id, new_data) {
    return new Promise(function (updateParagraph_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/" + paragraph_id + ".json");
        return fs.writeFile(main_dir, JSON.stringify(new_data, null, 2), function (error) {
            if (error) {
                console.error("> Errore d'accesso al file: " + main_dir);
                console.error(error);
                return updateParagraph_res({ esit: false, text: dealError(" SUT:1", "Non sono riuscito a modificare i files necessari...") });
            } else {
                myLog("> Modificata l'avventura di: " + user_id)
                return updateParagraph_res({ esit: true, struct: new_data });
            }
        });
    });
}


// # Incarichi (Paragraphs + Struct)

module.exports.getInfos = function getInfos(user_id) { // infos basiche: select * su Incarichi e User(user_id)
    return new Promise(function (getInfos_res) {
        return pool.query("SELECT * FROM " + tables_names.incarichi, null, function (err, incarichi_res) {
            if (err) {
                return recreateAllTablesStruct().then(function (recreate_res) {
                    if (recreate_res == true) {
                        return getInfos_res(getInfos());
                    } else {
                        console.error(recreate_res);
                        return getInfos_res(recreate_res);
                    }
                })
            } else {
                return getUserInfos(user_id).then(function (userInfos_res) {
                    if (userInfos_res === false) {
                        return getInfos_res(false);
                    } else {
                        let personal_incarichi = [];
                        for (let i = 0; i < incarichi_res.length; i++) {
                            if (incarichi_res[i].AUTHOR_ID == user_id) {
                                personal_incarichi.push(incarichi_res[i]);
                            }
                        }
                        return getInfos_res({
                            incarichi: incarichi_res,
                            user_infos: ((userInfos_res instanceof Array && userInfos_res.length == 1) ? userInfos_res[0] : []),
                            personals: personal_incarichi
                        });
                    }
                });
            }
        })
    });
}

function inc_IDBuilder(yrs) {
    let id = [yrs];

    let idPossible_chars = "ABCDEFGHIJKLMNOPQRSTQVXYWZ"
    for (let i = 0; i < 3; i++) {
        id.push(idPossible_chars.charAt(intIn(0, 25)));
    }
    id.push(Math.ceil(Math.random() * 9));

    return id.join("");
}

function unique_Id(test_id, loop_n) {
    myLog(">\tGenero ID, tentativo n: " + loop_n);

    if (loop_n > 9) {
        console.error(">\tTroppi tentativi, esco!");
        return Promise.resolve(false);
    } else {
        return sugg_pool.query("SELECT * FROM " + tables_names.incarichi + " WHERE ID LIKE ?", [test_id],
            function (err, rows) {
                if (!err) {
                    let now_date = new Date(Date.now());
                    let yrs = now_date.getFullYear().toString().substring(2);

                    myLog(">\tID DUPLICATO (sfiga?): " + test_id);
                    return unique_Id(inc_IDBuilder(yrs), loop_n + 1);
                } else {
                    myLog(">\tNUOVO ID: " + test_id);
                    return test_id;
                }
            });
    }
}

