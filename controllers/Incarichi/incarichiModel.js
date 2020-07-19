const mysql = require('mysql');
const config = require('../models/config');
const fs = require('fs');
const path = require("path");

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

function intIn(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //max è escluso, min incluso
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
        this.availability = rawdata.availability; // ("ALL", "DAY", "NIGHT") // ...long (:
        this.esit_type = rawdata.esit_type; // (0, -1, 1) = (continua, fine negativa, fine positiva)
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


// # USER
module.exports.insertUser = function insertUser(user_infos) {
    return new Promise(function (insertUser_res) {
        let query = "INSERT INTO " + tables_names.users;
        query += "(USER_ID, ALIAS, REG_DATE, GENDER) ";
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

function updateUserParagraph(user_id, new_pending, noedit_bool) {
    return new Promise(function (updateUserParagraph_res) {
        if (noedit_bool == true){
            return updateUserParagraph_res(true);
        }
        let query = "UPDATE " + tables_names.users;
        query += " SET HAS_PENDING = ? ";
        query += " WHERE USER_ID = ?";
        return pool.query(query, [new_pending, user_id], function (err, db_res) {
            if (err) {
                console.error(err);
                return updateUserParagraph_res({ esit: false, text: dealError(" SUP:1", "Errore aggiornando i tuoi dati nel database..") });
            } else {
                myLog("> Settato paragrafo (" + new_pending + ") per " + user_id)
                return updateUserParagraph_res(true);
            }
        });
    });
}
module.exports.updateUserParagraph = updateUserParagraph;

// # TmpStruct (Bozza)

module.exports.newUserDaft = function newUserDaft(user_info) {
    return new Promise(function (newUserTmp_res) {
        let template = standardDraftTemplate();
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
                    query += " SET HAS_PENDING = 0 ";
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

function getUserDaft(user_id) {
    return new Promise(function (getUserTmpStruct_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/struct.json");

        return fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                console.error(err);
                return getUserTmpStruct_res({ esit: false, text: dealError(" GUTS:1", "Non sono riuscito a recuperare informazioni sulla bozza...") });
            } else {
                return fs.readFile(main_dir, 'utf8', function (err2, rawdata) {
                    if (err) {
                        console.error(err2);
                        return createParagraph_res({ esit: false, text: dealError(" GUTS:2", "Non sono riuscito a leggere le informazioni sulla bozza...") });
                    } else {
                        let tmp_daft = JSON.parse(rawdata);
                        if ("type" in tmp_daft) {
                            tmp_daft.play_type = tmp_daft.type;
                            delete tmp_daft.type;
                        }
                        if (!("view_type" in tmp_daft)) {
                            tmp_daft.view_type = "ALL";
                        }
                        return getUserTmpStruct_res(tmp_daft);
                    }
                });
            }
        });
    });
}
module.exports.getUserDaft = getUserDaft;

module.exports.deleteUserDaft = function deleteUserDaft(user_id) {
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
                query += " SET HAS_PENDING = -1 ";
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

function setUserDaft(user_id, data) {
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
module.exports.setUserTmpDaft = setUserDaft;

function editUserDaft(user_id, type, new_infos) { // type: "title", "desc", "diff", "type", "delay"
    return new Promise(function (editUserTmp_res) {
        return getUserDaft(user_id).then(function (res_tmp) {

            if (type == "TITLE") {
                res_tmp.title = new_infos;
            } else if (type == "DESC") {
                res_tmp.desc = new_infos;
            } else if (type == "diff") {
                res_tmp.diff = new_infos;
            } else if (new_infos == "SOLO" || new_infos == "MULTI") {
                res_tmp.play_type = new_infos;
            } else if (type == "DELAY") {
                res_tmp.delay = new_infos;
            } else if (type == "VIEW_TYPE") {
                res_tmp.view_type = new_infos;
            }
            return setUserDaft(user_id, res_tmp).then(function (set_res) {
                return editUserTmp_res(set_res);
            })
        });
    });
}
module.exports.editUserDaft = editUserDaft;

function standardDraftTemplate() { // file struct.js : struttura della bozza
    return ({
        title: "",
        created: (Date.now() / 1000),
        diff: 0,
        desc: "",
        creative_typeSet: "",
        play_type: "SOLO",
        view_type: "ALL",
        delay: 10,
        paragraphs_ids: [],
        //gran_father_id: {}, // {id, childs = [{id, delay, availability, type}]
        //childs_three: [] // 
    })
}

// # Paragraphs (Bozza)

function standardParagraphTemplate(new_id, fixed_father_id) { // standardParagraphTemplate
    return ({
        id: new_id,
        father_id: fixed_father_id,
        esit_type: 0, // (loosing (-1), winning (1), continue (0)
        availability: "ALL", // DAY, ALL, NIGHT
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

module.exports.createFirstParagraph = function createFirstParagraph(user_id, inc_struct, loop_n, father_id) {
    return new Promise(function (firstParagraph_res) {
        let tmp_pId = paragraph_IDBuilder();
        if (loop_n > 9) {
            console.error(">\tTroppi tentativi, esco!");
            return firstParagraph_res({ esit: false, text: dealError(" CP:2", "Al momento non è possibile creare piu di 62.500 paragrafi...") });
        } else if (inc_struct.paragraphs_ids.indexOf(tmp_pId) >= 0) {
            return createFirstParagraph(inc_struct.paragraphs_ids, (loop_n + 1)); // ricorsiva
        } else { // Valido:
            //return temp;
            let template = standardParagraphTemplate(tmp_pId, father_id);
            template.level_deep = 0;

            let paragraph_data = JSON.stringify(template, null, 2);
            let main_dir = path.dirname(require.main.filename);
            main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/" + tmp_pId + ".json");

            return fs.writeFile(main_dir, paragraph_data, function (error) {
                if (error) {
                    console.error("> Errore d'accesso al file: " + main_dir);
                    console.error(error);
                    return firstParagraph_res({ esit: false, text: dealError(" CP:1", "Non sono riuscito a creare i files necessari...") });
                } else {
                    inc_struct.paragraphs_ids.push(tmp_pId); // aggiorno array di id usati
                    return setUserDaft(user_id, inc_struct).then(function (set_res) {
                        if (set_res.esit == false){
                            return firstParagraph_res(set_res);
                        }
                        return firstParagraph_res(template);
                    });
                }
            });
        }
    });
}

module.exports.createChoice = function createChoice(user_id, choice_text, inc_struct, loop_n, father_id, level_deep, force_availability) {
    return new Promise(function (createParagraph_res) {
        let tmp_pId = paragraph_IDBuilder();
        if (loop_n > 9) {
            console.error(">\tTroppi tentativi, esco!");
            return createParagraph_res({ esit: false, text: dealError(" CP:2", "Al momento non è possibile creare piu di 62.500 paragrafi...") });
        } else if (inc_struct.paragraphs_ids.indexOf(tmp_pId) >= 0) {
            return createParagraph(inc_struct.paragraphs_ids, (loop_n + 1)); // ricorsiva
        } else { // Valido:
            //return temp;
            let paragraph_infos = standardParagraphTemplate(tmp_pId, father_id);
            paragraph_infos.level_deep = level_deep;
            if (force_availability != false) {
                paragraph_infos.availability = force_availability;
            }
            paragraph_infos.choice_title = choice_text;
            let paragraph_data = JSON.stringify(paragraph_infos, null, 2);
            let main_dir = path.dirname(require.main.filename);
            main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/" + tmp_pId + ".json");

            return fs.writeFile(main_dir, paragraph_data, function (error) {
                if (error) {
                    console.error("> Errore d'accesso al file: " + main_dir);
                    console.error(error);
                    return createParagraph_res({ esit: false, text: dealError(" CP:1", "Non sono riuscito a creare i files necessari...") });
                } else {
                    inc_struct.paragraphs_ids.push(tmp_pId); // aggiorno array di id usati
                    return setUserDaft(user_id, inc_struct).then(function (set_res) {

                        return createParagraph_res(new Choice({
                            id: paragraph_infos.id,
                            delay: inc_struct.delay,
                            availability: paragraph_infos.availability,
                            esit_type: 0, // 0 = continua, -1 = 
                            title_text: choice_text
                        }));
                    });
                }
            });
        }
    });
}

module.exports.deleteChoice = function deleteChoice(user_id, paragraph_infos, inc_struct) {
    return new Promise(function (deleteChoice_res) {
        return loadParagraph(user_id, paragraph_infos.father_id).then(function (father_infos) {
            if (father_infos.esit == false) {
                return deleteChoice_res(father_infos);
            } else {
                for (let i = 0; i < father_infos.choices.length; i++) {
                    if (father_infos.choices[i].id == paragraph_infos.id) {
                        father_infos.choices.splice(i, 1);
                        break;
                    }
                }
                for (let i = 0; i < inc_struct.paragraphs_ids.length; i++) {
                    if (inc_struct.paragraphs_ids[i] == paragraph_infos.id) {
                        inc_struct.paragraphs_ids.splice(i, 1);
                        break;
                    }
                }


                return updateParagraph(user_id, father_infos.id, father_infos).then(function (paragraph_update_res) {
                    if (paragraph_update_res.esit == false) {
                        return deleteChoice_res(paragraph_update_res);
                    } else {
                        return setUserDaft(user_id, inc_struct).then(function (update_res) {
                            if (update_res.esit == false) {
                                return deleteChoice_res(update_res);
                            } else {
                                let file_dir = path.dirname(require.main.filename);
                                file_dir = path.join(file_dir, "./" + submit_dir + "tmp/" + user_id + "/" + paragraph_infos.id + ".json");
                                fs.unlinkSync(file_dir);
                                return updateUserParagraph(user_id, father_infos.id, false).then(function (db_update) {
                                    if (db_update.esit == false) {
                                        return deleteChoice_res(db_update);
                                    }
                                    return deleteChoice_res(father_infos);

                                })

                            }
                        });
                    }
                });
            }
        });
    });
}

function loadParagraph(user_id, paragraph_id) {
    return new Promise(function (loadParagraph_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./" + submit_dir + "tmp/" + user_id + "/" + paragraph_id + ".json");

        return fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                console.error("> Errore d'accesso al file: " + main_dir);
                console.error(err);
                return loadParagraph_res({ esit: false, text: dealError(" LP:1", "Non sono riuscito a caricare il paragrafo " + paragraph_id) });
            } else {
                return fs.readFile(main_dir, 'utf8', function (err2, rawdata) {
                    if (err2) {
                        console.error("> Errore d'accesso al file: " + main_dir);
                        console.error(err);
                        return loadParagraph_res({ esit: false, text: dealError(" LP:2", "Non sono riuscito a caricare il paragrafo " + paragraph_id) });
                    } else {
                        let tmp_daft = JSON.parse(rawdata);
                        if ("type" in tmp_daft) {
                            tmp_daft.esit_type = tmp_daft.type;
                            delete tmp_daft.type;
                        }
                        return loadParagraph_res(tmp_daft);
                    }
                });
            }
        });

    });
}
module.exports.loadParagraph = loadParagraph;

function updateParagraph(user_id, paragraph_id, new_data) {
    return new Promise(function (updateParagraph_res) {
        if ("type" in new_data) {
            //tmp_daft.esit_type = tmp_daft.type;
            delete new_data.type;
        }
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
module.exports.updateParagraph = updateParagraph;

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

