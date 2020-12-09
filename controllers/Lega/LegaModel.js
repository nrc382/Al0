const model = require('../Argonauti/argo_model');
const fs = require('fs');
const path = require("path");
const { all } = require('promise');

let allProto = [];
module.exports.allProto = allProto;

loadAllCardsFromLocal().then(function (allProtoLength) {
    console.log("> Init Prototipi Mob (ARENA): " + allProto.length);
});

class user {
    constructor(db_select) {
        this.telegram_id = db_select.telegram_id;
        this.lastMessage_id = db_select.lastMessage_id;
        this.lastMessage_date = db_select.lastMessage_date;
        this.mob_fullName = db_select.mob_fullName;
        this.mob_level = db_select.mob_level;
        this.battle_id = db_select.battle_id;
        this.curr_path = db_select.curr_path;
        if (db_select.curr_msgId) {
            this.curr_msgId = db_select.curr_msgId;
        } else {
            this.curr_msgId = -1;
        }
        if (db_select.isQuery) {
            this.isQuery = true;
        } else {
            this.isQuery = false;
        }

    }
}
module.exports.user = user;

function getUser(t_id) {
    return new Promise(function (user_info) {
        model.argo_pool.query("SELECT * FROM " + model.tables_names.lega_u + " WHERE telegram_id = ?", [t_id],
            function (err, select_res) {
                if (err) {
                    console.log("Errore contattando il database ");
                    console.log(err);
                    return user_info({ found: -1 });
                } else if (select_res.length <= 0) {
                    console.log("Non ho trovato nessuno per " + t_id + ", ritorno le default_infos");
                    return user_info({ found: 0, telegram_id: t_id });
                } else {
                    console.log("> " + t_id + " è registrato.\n> Ritorno le raw infos");
                    return user_info(select_res[0]);
                }

            });
    });
}
module.exports.getUser = getUser;

function addUser(db_infos) {
    return new Promise(function (add_res) {
        let query = "INSERT INTO " + model.tables_names.lega_u;
        query += " (telegram_id, lastMessage_id, lastMessage_date)";
        query += " VALUES ?";
        query += " ON DUPLICATE KEY UPDATE lastMessage_id=VALUES(`lastMessage_id`), lastMessage_date=VALUES(`lastMessage_date`);";
        console.log("> updateUser (model)\n> last_messageId: " + db_infos[1]);

        let toSet = [db_infos[0], db_infos[1], Math.floor(db_infos[2])];

        return model.argo_pool.query(query, [[toSet]],
            function (err, select_res) {
                if (err) {
                    console.log("Errore contattando il database ");
                    console.log(err);
                    return add_res(false);
                } else {
                    console.log("> " + db_infos[0] + " aggiornato (last_msg_id: " + db_infos[1] + ")\n> Ritorno true");
                    return add_res(true);
                }

            });
    });
}
module.exports.updateUser = addUser;


function addUserMob(db_infos) {
    return new Promise(function (add_res) {
        let query = "INSERT INTO " + model.tables_names.lega_u;
        query += " (telegram_id, mob_fullName, mob_level, mob_birth)";
        query += " VALUES ?";
        query += " ON DUPLICATE KEY UPDATE mob_fullName=VALUES(`mob_fullName`), mob_level=VALUES(`mob_level`), mob_birth=VALUES(`mob_birth`);";
        console.log("> Salvo nel db, mob_level: " + db_infos.mob_level);
        let toSet = [db_infos.user_id, db_infos.mob_fullName, db_infos.mob_level, (Date.now() / 1000)];

        return model.argo_pool.query(query, [[toSet]],
            function (err, select_res) {
                if (err) {
                    console.log("Errore contattando il database ");
                    console.log(err);
                    return add_res(false);
                } else {
                    console.log("> " + db_infos.user_id + " è ora registrato.\n> Ritorno:");
                    console.log(select_res);
                    return add_res(true);
                }

            });
    });
}


module.exports.update_Path = (db_infos) => {
    return new Promise(function (update_UserPath_res) {
        //db_infos => [telegram_id, curr_path]
        let query = "INSERT INTO " + model.tables_names.lega_u;
        query += " (telegram_id, curr_path)";
        query += " VALUES ?";
        query += " ON DUPLICATE KEY UPDATE curr_path = VALUES(`curr_path`);";
        console.log("> update_UserPath (model)\n> new_path: " + db_infos[1]);

        let toSet = [db_infos[0], db_infos[1]];

        return model.argo_pool.query(query, [[toSet]],
            function (err, select_res) {
                if (err) {
                    console.log("Errore contattando il database ");
                    console.log(err);
                    return update_UserPath_res(false);
                } else {
                    console.log("> " + db_infos[0] + " aggiornato (curr_path: " + db_infos[1] + ")\n> Ritorno true");
                    return update_UserPath_res(true);
                }

            });
    });
};

function loadAllCardsFromLocal() {
    return new Promise(function (loadAllCardsFromLocal_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./LegaStuff/MobsPrototype/Proto.json");

        fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                console.error("> ERRORE accedendo al file!");
                return loadAllCardsFromLocal_res([]);
            } else {
                let rawdata = fs.readFileSync(main_dir);
                let tmp_array = JSON.parse(rawdata);
                console.log("> Caricati i prototipi: " + tmp_array.length);
                for (let i = 0; i < tmp_array.length; i++) {
                    allProto.push(tmp_array[i]);
                }
                return loadAllCardsFromLocal_res(allProto.length);
            }
        });
    });
}

function generateMob(base_level) {
    let tmp_mob = allProto[Math.floor(Math.random() * (allProto.length - 1))];
    let res_mob = {
        type_name: tmp_mob.type_name,
        type_name_plural: tmp_mob.type_name_plural,
        costituzione: tmp_mob.costituzione,
        gender: tmp_mob.gender,
        forza: tmp_mob.forza,
        destrezza: tmp_mob.destrezza,
        determinazione: tmp_mob.determinazione,
        intelligenza: tmp_mob.intelligenza,
        fede: tmp_mob.fede
    }
    if (base_level > 1) {

    }
    return res_mob;
}
module.exports.getRandomMob = generateMob;

function saveMob(db_infos, mob_info) {
    return new Promise(function (save_esit) {
        console.log("> Salvo un nuovo mob per " + db_infos.user_id);
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./LegaStuff/Mobs/" + db_infos.user_id);

        return fs.mkdir(main_dir, { recursive: true }, function (dir_err) {
            if (dir_err && dir_err.code != "EEXIST") {
                console.error("> Dir-ERROR! ");
                console.log(dir_err);
                return save_esit(false);
            }
            let data = JSON.stringify(mob_info, null, 2);
            main_dir = path.join(main_dir, "/MobInfos.json");
            return fs.writeFile(main_dir, data, function (error) {
                if (error) {
                    console.log("> Errore! ");
                    console.log(error);
                    return save_esit(false);
                } else {
                    return addUserMob(db_infos).then(function (add_res) {
                        return save_esit(add_res);
                    });
                }
            });
        });
    });
}
module.exports.saveMob = saveMob;

function loadMob(for_user) {
    return new Promise(function (loadMob_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./LegaStuff/Mobs/" + for_user + "/MobInfos.json");

        return fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                console.error("> ERRORE accedendo al file!");
                return loadMob_res(false);
            } else {
                let rawdata = fs.readFileSync(main_dir);
                let mob_info = JSON.parse(rawdata);
                console.log("> Caricate le info per il mob di: " + for_user);

                return loadMob_res(mob_info);
            }
        });
    });
}
module.exports.loadMob = loadMob;


function saveNewProtos(toSave_data) {
    return new Promise(function (save_esit) {
        console.log("> Salvo i nuovi " + toSave_data.length + " mob...");

        let data = JSON.stringify(toSave_data, null, 2);
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./LegaStuff/MobsPrototype/Proto.json");

        return fs.writeFile(main_dir, data, function (error) {
            if (error) {
                console.log("> Errore! ");
                console.log(error);
                return save_esit(false);
            } else {
                console.log("> Salvata la lista dei tipi! ");
                return save_esit(true);
            }
        });
    });
}
module.exports.saveNewProtos = saveNewProtos;

function intIn(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //max è escluso, min incluso
}
module.exports.intIn = intIn;

function load_activeBattles() {
    return new Promise (async (all_battles)=>{
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./LegaStuff/Battles/all_battles.json");
    
        return fs.access(main_dir, fs.F_OK, async (err) => {
            if (err) {
                return fs.writeFile(main_dir, JSON.stringify([], null, 2), function (error) {
                    if (error) {
                        console.log("> Errore! ");
                        console.error(error);
                        return all_battles(false);
                    } else {
                        return all_battles([]);
                    }
                });
            } else {
                let rawdata = await fs.promises.readFile(main_dir, {encoding: "utf8"});

                let tmp_array = [];
                if (rawdata.length > 0){
                    console.log("LEGGO");

                    console.log(rawdata);

                    tmp_array = JSON.parse(rawdata);
                } else{
                    console.log(rawdata);
                }
                console.log("> Caricate le battaglie: " + tmp_array.length);
    
                return all_battles(tmp_array);
            }
        });
    });
}
module.exports.load_activeBattles = load_activeBattles;

function update_activeBattles(updated_infos) {
    return new Promise (function (update_res){
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./LegaStuff/Battles/all_battles.json");
    
        return fs.writeFile(main_dir, JSON.stringify(updated_infos, null, 2), function (error) {
            if (error) {
                console.log("> Errore! ");
                console.error(error);
                return update_res(false);
            } else {
                return update_res(true);
            }
        });
    });
}
module.exports.update_activeBattles = update_activeBattles;

function addActiveBattle(new_battle) {
    return new Promise (async (all_battles) =>{
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./LegaStuff/Battles/all_battles.json");
        let rawdata = await fs.promises.readFile(main_dir, {encoding: "utf8"});
        let tmp_array = rawdata.length > 0 ? JSON.parse(rawdata) : [];

        for (let i= 0; i< tmp_array.length; i++){
            if (tmp_array[i].chat_id == Math.abs(new_battle.chat_id)){
                return all_battles(tmp_array);
            }
        }


        tmp_array.push(new_battle);
        let data = JSON.stringify(tmp_array, null, 2);

        let error = await fs.promises.writeFile(main_dir, data);

        if (error) {
            console.log("> Errore! ");
            console.error(error);
            return all_battles(false);
        } else {
            return all_battles(tmp_array);
        }
    });
}
module.exports.addActiveBattle = addActiveBattle;


function loadBattlesFor(chat_id) {
    return new Promise(function (loadBattlesFor_res) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./LegaStuff/Battles/" + chat_id + ".json");

        return fs.access(main_dir, fs.F_OK, async function (err) {
            if (err) {
                //console.error("> ERRORE accedendo al file!");
                return loadBattlesFor_res({ played: 0, current: false });
            } else {
                let rawdata = await fs.promises.readFile(main_dir, {encoding: "utf8"});
                
                let tmp_array = {};
                if (rawdata.length > 0){
                    tmp_array = JSON.parse(rawdata);
                }
                
                console.log("> Caricate la battaglie della chat " + chat_id);

                return loadBattlesFor_res(tmp_array);
            }
        });
    });
}
module.exports.loadBattlesFor = loadBattlesFor;

function updateBattle(chat_id, battle_infos) {
    return new Promise(function (updateBattle_esit) {
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./LegaStuff/Battles/" + chat_id + ".json");

        let data = JSON.stringify(battle_infos, null, 2);
        return fs.writeFile(main_dir, data, function (error) {
            if (error) {
                console.log("> Errore! ");
                console.log(error);
                return updateBattle_esit(false);
            } else {
                return updateBattle_esit(true);

            }
        });

    });
}
module.exports.updateBattle = updateBattle;


/*
module.exports.saveAllCardsType = function() {
    return new Promise(function (save_esit) {

        let to_save = [];
        let done_array = [];
        for (let i = 0; i < allCards.length; i++) {
            let mob_type = allCards[i].partial_name;
            if (done_array.indexOf(mob_type) < 0){
                if (mob_type != "Bavoso" && mob_type != "Essere" && mob_type != "Gigantesco" && mob_type != "Grande" && mob_type != "Incantevole") {
                    if (mob_type != "Martellatore" && mob_type != "Mech" && mob_type != "Mostro" && mob_type != "Pianta carnivora" && mob_type.substring(0, mob_type.length - 1) != "Piccol") {
                        if (mob_type != "Sferragliatrice" && mob_type != "Strana" && mob_type != "Tiratore") {
                            done_array.push(mob_type);

                            let tmp_determinazione = 1+Math.floor(Math.random() * 20) + Math.floor(Math.random() * 30);
                            let tmp_stamina = Math.floor((50-tmp_determinazione) + Math.floor(Math.random() * 50) );
                            let tmp_formal =   Math.floor(100-Math.min(90, (tmp_stamina/5+((tmp_determinazione/10)*3))));
                            let tmp_level_multiply = Math.floor( (tmp_determinazione/5) - Math.floor(tmp_formal/20) );
                            if (tmp_level_multiply <= 0){
                                tmp_level_multiply = 1;
                            } else if (tmp_level_multiply > 5){
                                tmp_level_multiply = 4.5;
                            }
                            if((Math.random() * 10 )== 9 ){
                                tmp_level_multiply += 0.5;
                            }
                            to_save.push({
                                type: mob_type,
                                stamina: tmp_stamina,
                                f_instant: 25+ Math.floor( (Math.random() * 25) + (tmp_determinazione/5 - (tmp_stamina/10)*3 ) ),
                                determinazione: tmp_determinazione,
                                formal: tmp_formal,
                                level_multiply: tmp_level_multiply
                            });
                        }
                    }
                }
            }
        }
        console.log("> dento to_save: "+to_save.length);

        let data = JSON.stringify(to_save, null, 2);
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, "./LegaStuff/MobsPrototype/proto.json");

        return fs.writeFile(main_dir, data, function (error) {
            if (error) {
                console.log("> Errore! ");
                console.log(error);
                return save_esit(false);
            } else {
                console.log("> Salvata la lista dei tipi! ");
                return save_esit(true);
            }
        });
    });

}


*/