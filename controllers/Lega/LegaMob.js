const lega_names = require('./LegaNames');
const lega_model = require('./LegaModel');


class Mob {
    constructor(isNew, loaded_infos) {
        if (isNew){
            let proto;
            if(typeof loaded_infos != "undefined"){
                proto = loaded_infos;
            } else{
                proto = lega_model.getRandomMob(1);
            }
            

            this.name = lega_names.generateMobName(proto.type_name);
            this.type_name = proto.type_name;
            if (proto.gender == "b"){
                if (lega_model.intIn(0, 1) == 1) {
                    this.isMale = true;
                }
                else {
                    this.isMale = false;
                }
            } else{
                this.isMale = (proto.gender == "f" ? false : true );
            }
            
            this.costituzione = proto.costituzione;
            this.forza = proto.forza;
            this.destrezza = proto.destrezza;
            this.resistenza = lega_model.intIn((proto.destrezza) / 2, (proto.costituzione + proto.forza) / 2);
            this.determinazione = proto.determinazione;
            this.intelligenza = proto.intelligenza;
            this.fede = proto.fede;
            
            this.affiatamento = lega_model.intIn(0, 10);
            this.temperamento = lega_model.intIn(1, 5);
            this.range = lega_model.intIn(0, 10);
        } else{
            this.name = loaded_infos.name;
            this.type_name = loaded_infos.type_name;
            this.costituzione = loaded_infos.costituzione;
            this.forza = loaded_infos.forza;
            this.destrezza = loaded_infos.destrezza;
            this.resistenza = loaded_infos.resistenza;
            this.determinazione = loaded_infos.determinazione;
            this.intelligenza = loaded_infos.intelligenza;
            this.fede = loaded_infos.fede;
            this.isMale = loaded_infos.isMale;
            this.affiatamento = loaded_infos.affiatamento;
            this.temperamento = loaded_infos.temperamento;
            this.range = loaded_infos.range;

        }
    }
    randomizeProperties(malus) {
        let bonus_seed = 20 - (lega_model.intIn(1, 10) + lega_model.intIn(1, 10));
        if (malus < -20){
            this.affiatamento += Math.abs(Math.floor(malus/4));
        }
        console.log("> randomizeProperties, bonus_seed" + bonus_seed);
        let proto_intelligenza = this.intelligenza;
        if (bonus_seed > 5) {
            this.costituzione += bonus_seed - malus;
            this.resistenza -= (10 - bonus_seed) - malus;
            this.destrezza += lega_model.intIn(0, 10) - 5;
        } else {
            this.destrezza -= (10 - bonus_seed);
            this.resistenza += bonus_seed - malus;
            this.costituzione += lega_model.intIn(0, 10) - 5;
        }
        if (Math.floor(Math.random() * 2) == 1) {
            this.forza += bonus_seed - malus;
        } else {
            this.forza -= bonus_seed - malus;
        }
        bonus_seed = 20 - (lega_model.intIn(1, 10) + lega_model.intIn(1, 10));
        console.log("> Bonus_seed (2)" + bonus_seed);
        if (bonus_seed > 5) {
            this.fede += bonus_seed;
            this.intelligenza -= (10 - bonus_seed) - malus;
            this.determinazione += lega_model.intIn(0, 10) - 5;
        } else {
            this.intelligenza += (10 - bonus_seed);
            this.determinazione += bonus_seed;
            this.fede += lega_model.intIn(0, 10) - 5 - malus;
        }
        if (lega_model.intIn(1, 3) == 1) {
            this.intelligenza = 10 + lega_model.intIn((proto_intelligenza/2)-(proto_intelligenza/5), Math.floor(this.intelligenza + (50 - Math.floor(this.costituzione/2 + this.fede))) );
        }
        
        if (this.costituzione < 1) {
            this.costituzione = 1;
        } else if (this.costituzione > 100) {
            this.costituzione = 100;
        }
        if (this.forza < 1) {
            this.forza = 1;
        } else if (this.forza > 100) {
            this.forza = 100;
        }
        if (this.destrezza < 0) {
            this.destrezza = 1;
        } else if (this.destrezza > 100) {
            this.destrezza = 100;
        }
        if (this.resistenza < 1) {
            this.resistenza = 3;
        } else if (this.resistenza > 80) {
            this.resistenza = 80;
        }
        if (this.determinazione < 1) {
            this.determinazione = lega_model.intIn(0, 5);
        } else if (this.determinazione > 100) {
            this.determinazione = 100;
        }
        if (this.intelligenza < 8) {
            this.intelligenza = lega_model.intIn(1, 10);
        } else if (this.intelligenza > 100) {
            this.intelligenza = 100;
        }
        if (this.fede < 0) {
            this.fede = 0;
        } else if (this.fede > 100) {
            this.fede = 100;
        }
    }
    describe(enlapsed_days) {
        let res_text = "";
        if(!enlapsed_days){
            console.log(this);
            let mob_article = lega_names.getArticle(this);
            res_text = "_"+this.name+" è "+mob_article.indet + this.type_name+" ";
            res_text += "_";
            
        }else{

        }
        return res_text;
    }
}
module.exports.mob = Mob

function newMob(proto_type, malus, db_infos) {
    return new Promise(function (new_mob) {
        console.log("> Genero Mob");
        let mob;
        let effective_malus = 0;
        if (!isNaN(malus)){
            effective_malus = malus;
        }
        if (Array.isArray(proto_type) && proto_type.length == 2){
            console.log("> Da prototipo: "+proto_type[0]+" ("+proto_type[1]+")");
            let proto = getPrototype(proto_type[0]);
            mob = new Mob(true, proto);
            
        } else{
            mob = new Mob(true);
        }
        console.log("\n> effective_malus: "+effective_malus);

        mob.randomizeProperties(effective_malus);

        db_infos.mob_fullName = mob.name+" "+lega_names.getArticle(mob).det+mob.type_name;
        db_infos.mob_level = 0;
        //db_infos.lastMessage_date = Date.now()/1000;
        
        return lega_model.saveMob(db_infos, mob).then(function (save_esit){
            if (save_esit){
                console.log("> Generato un/a: "+mob.type_name+" genere: "+mob.isMale);
                return new_mob(mob);
            } else{
                return new_mob(false);
            }
        });

    });
}
module.exports.newMob = newMob

function getRandomMob(mob_type) {
    let tmp_array = lega_model.allProto;
    for (let i = 0; i < tmp_array.length; i++) {
        if (tmp_array[i].type_name == mob_type) {
            return tmp_array[i];
        }
    }
    return tmp_array[0];
}
module.exports.getRandomMob = getRandomMob

function getPrototype(mob_type) {
    let tmp_array = lega_model.allProto;
    for (let i = 0; i < tmp_array.length; i++) {
        if (tmp_array[i].type_name == mob_type) {
            return tmp_array[i];
        }
    }
    return tmp_array[0];
}
module.exports.getPrototype = getPrototype

function describe(mob_infos, enlapsed) {
    let mob_article = lega_names.getArticle(mob_infos, mob_infos.isMale);
    let mob_proto = getPrototype(mob_infos.type_name);
    console.log("Mob proto stamina: " + mob_proto.stamina);

    let description = mob_infos.name + " è ";
    if (enlapsed != 0) {
        description += "ora "
    }
    description += mob_article.indet + mob_infos.type_name + " dall'aria " + getMobNatureString(mob_infos.level_multiply).f;
    description += mobDescribe_byNature(mob_infos, mob_proto, 0);

    return (description);
}
module.exports.describe = describe

function getMobNatureString(level_multiply) {
    switch (level_multiply) {
        case 1: {
            return { m: "docile", f: "docile" };
        }
        case 2: {
            return { m: "schivo", f: "schiva" };
        }
        case 3: {
            return { m: "collerico", f: "collerica" };
        }
        case 4: {
            return { m: "furbo", f: "furba" };
        }
        default: {
            return { m: "flemmatico", f: "flemmatica" };
        }
    }

}

function mobDescribe_byNature(mob_infos, mob_proto, enlapsed) {
    let description = "";
    console.log("Mob infos compare:");
    console.log(mob_infos);

    let isNegative = false;

    //Impressione
    if (enlapsed == 0) {
        if (mob_infos.affiatamento <= 0) {
            description += " che per il momento sembra proprio non sopportarti. Comunque:\n";
        } else if (mob_infos.affiatamento <= 2) {
            description += " a cui non sembra tu abbia fatto una particolare impressione. Comunque:\n";
        } else if (mob_infos.affiatamento == 5) {
            description += " che sembra " + lega_names.gF(mob_infos.isMale, "innamorat", ["o", "a"]) + " di te! ";
        } else {
            description += " che pare ti sia già " + lega_names.gF(mob_infos.isMale, "affezzionat", ["o", "a"]) + ". ";
        }
    } else {
        if (mob_infos.affiatamento <= Math.floor(5 * enlapsed)) {
            description += " con cui non hai un buon legame.\n"
        } else if (mob_infos.affiatamento <= Math.floor(10 * enlapsed)) {
            description += " con cui hai un legame decente.\n"
        } else if (mob_infos.affiatamento >= Math.floor(50 * enlapsed)) {
            description += " che sembra " + lega_names.gF(mob_infos.isMale, "innamorat", ["o", "a"]) + " di te!\n"
        } else {
            description += " che ti è abbastanza " + lega_names.gF(mob_infos.isMale, "affezzionat", ["o", "a"]) + ".\n"
        }
    }

    switch (mob_infos.level_multiply) {
        case 1: {
            //Prima info - formal
            if (mob_infos.formal <= (mob_proto.formal - 10)) {
                description += "Ha decisamente un fisico gracile, per il suo genere, ";
                if (mob_infos.stamina > mob_proto.stamina) {
                    isNegative = true;
                }
            } else if (mob_infos.formal < mob_proto.formal) {
                description += "Ha un fisico gracile, per il suo genere, ";
                if (mob_infos.stamina > mob_proto.stamina) {
                    isNegative = true;
                }
            } else if (mob_infos.formal <= (mob_proto.formal + 10)) {
                description += "È in buona forma fisica, per il suo genere, ";
                if (mob_infos.stamina < mob_proto.stamina) {
                    isNegative = true;
                }
            } else {
                description += "È decisamente in buona forma fisica, per il suo genere, ";
                if (mob_infos.stamina < mob_proto.stamina) {
                    isNegative = true;
                }
            }
            //Link
            if (isNegative) {
                description += "ma ";
            } else {
                description += "e ";
            }

            //Seconda info - stamina
            if (mob_infos.stamina < mob_proto.stamina) {
                description += "non sembra avere molto fiato. ";
            } else if (mob_infos.stamina <= (mob_proto.stamina + 8)) {
                description += "il respiro è regolare. ";
            } else {
                description += "il respiro è calmo e profondo. ";
            }
            break;

        }
        case 2: {
            //Prima info - formal
            if (mob_infos.formal <= (mob_proto.formal - 10)) {
                description += "Ha decisamente un fisico gracile, per il suo genere, ";
                if (mob_infos.f_instant > mob_proto.f_instant) {
                    isNegative = true;
                }
            } else if (mob_infos.formal < mob_proto.formal) {
                description += "Ha un fisico gracile, per il suo genere, ";
                if (mob_infos.f_instant > mob_proto.f_instant) {
                    isNegative = true;
                }
            } else if (mob_infos.formal <= (mob_proto.formal + 10)) {
                description += "È in buona forma fisica, per il suo genere, ";
                if (mob_infos.f_instant < mob_proto.f_instant) {
                    isNegative = true;
                }
            } else {
                description += "È decisamente in buona forma fisica, per il suo genere, ";
                if (mob_infos.f_instant < mob_proto.f_instant) {
                    isNegative = true;
                }
            }
            //Link
            if (isNegative) {
                description += "ma ";
            } else {
                description += "e ";
            }

            //Seconda info
            if (mob_infos.f_instant < mob_proto.f_instant) {
                description += "non sembra capace di colpi tanto letali. ";
            } else if (mob_infos.f_instant <= (mob_proto.f_instant + 8)) {
                description += "sembra capace di assestare buoni colpi. ";
            } else {
                description += "sicuramente è capace di assestare ottimi colpi. ";
            }
            break;
        }
        case 3: {
            //Prima info - Stamina
            if (mob_infos.stamina <= (mob_proto.stamina - 10)) {
                description += "A " + lega_names.gF(mob_infos.isMale, "guardarl", ["o", "a"]) + " non sembra capace di grandi combo, ";
                if (mob_infos.f_instant > mob_proto.f_instant) {
                    isNegative = true;
                }
            } else if (mob_infos.stamina < mob_proto.stamina) {
                description += "A " + lega_names.gF(mob_infos.isMale, "guardarl", ["o", "a"]) + " si direbbe possa eseguire solo minime combinazioni, ";
                if (mob_infos.f_instant >= (mob_proto.f_instant + 10)) {
                    isNegative = true;
                }
            } else if (mob_infos.stamina <= (mob_proto.stamina + 10)) {
                description += "Può eseguire qualche combinazione, ";
                if (mob_infos.f_instant < mob_proto.f_instant) {
                    isNegative = true;
                }
            } else {
                description += "Da l'impressione di essere ";
                if (mob_infos.isMale) {
                    description += "un ";
                } else {
                    description += "un'";
                }
                description += "abile combattente, "
                if (mob_infos.f_instant < mob_proto.f_instant) {
                    isNegative = true;
                }
            }
            //Link
            if (isNegative) {
                description += "ma ";
            } else {
                description += "ed ";
            }

            //Seconda info
            if (mob_infos.f_instant < mob_proto.f_instant) {
                description += "i suoi colpi non saranno letali. ";
            } else if (mob_infos.f_instant <= (mob_proto.f_instant + 10)) {
                description += "i suoi saranno buoni colpi. ";
            } else {
                description += "i suoi saranno ottimi colpi. ";
            }
            break;
        }
        case 4: {
            //Prima info - stamina
            if (mob_infos.stamina <= (mob_proto.stamina - 10)) {
                description += "A " + lega_names.gF(mob_infos.isMale, "guardarl", ["o", "a"]) + " non sembra capace di grandi combo";
                if (mob_infos.range_max > mob_proto.range_max) {
                    isNegative = true;
                }
            } else if (mob_infos.stamina < mob_proto.stamina) {
                description += "A " + lega_names.gF(mob_infos.isMale, "guardarl", ["o", "a"]) + " dovrebbe essere in grado d'eseguire solo minime combinazioni";
                if (mob_infos.range_max < (mob_proto.range_max + 10)) {
                    isNegative = true;
                }
            } else if (mob_infos.stamina <= (mob_proto.stamina + 10)) {
                description += "È in grado di eseguire qualche combinazione";
                if (mob_infos.range_max < mob_proto.range_max) {
                    isNegative = true;
                }
            } else {
                description += "Da l'impressione di essere ";
                if (mob_infos.isMale) {
                    description += "un ";
                } else {
                    description += "un'";
                }
                description += "abile combattente"
                if (mob_infos.range_max < mob_proto.range_max) {
                    isNegative = true;
                }
            }
            //Link
            if (isNegative) {
                description += ", ma ";
            } else {
                description += " e ";
            }

            //Seconda info - range_max
            if (mob_infos.range_max < mob_proto.range_max) {
                description += "non nelle lunghe distanze. ";
            } else if (mob_infos.range_max <= (mob_proto.range_max + 10)) {
                description += "potrebbe colpire avversari anche lontani. ";
            } else {
                description += "colpirebbe anche avversari lontani. ";
            }
            break;
        }
        default: {
            //Prima info - stamina
            if (mob_infos.stamina <= (mob_proto.stamina - 10)) {
                description += "A " + lega_names.gF(mob_infos.isMale, "guardarl", ["o", "a"]) + " non sembra capace di muoversi velocemente";
                if (mob_infos.range_min < mob_proto.range_min) {
                    isNegative = true;
                }
            } else if (mob_infos.stamina < mob_proto.stamina) {
                description += "Potrebbe essere in grado di muoversi velocemente";
                if (mob_infos.range_min < mob_proto.range_min) {
                    isNegative = true;
                }
            } else if (mob_infos.stamina <= (mob_proto.stamina + 10)) {
                description += "Può muoversi velocemente";
                if (mob_infos.range_min > mob_proto.range_min) {
                    isNegative = true;
                }
            } else {
                description += "Da l'impressione di essere ";
                if (mob_infos.isMale) {
                    description += "un ";
                } else {
                    description += "un'";
                }
                description += "abile combattente"
                if (mob_infos.range_min > mob_proto.range_min) {
                    isNegative = true;
                }
            }
            //Link
            if (isNegative) {
                description += ", anche se ";
            } else {
                description += " e ";
            }

            //Seconda info - range_min
            if (mob_infos.range_min > mob_proto.range_min) {
                description += "l'avversario dovrà trovarsi ad una certa distanza. ";
            } else if (mob_infos.range_min >= (mob_proto.range_min + 2)) {
                description += "potrebbe colpire avversari relativamente vicini. ";
            } else {
                description += "può colpire avversari relativamente vicini. ";
            }
            break;
        }
    }

    if (enlapsed == 0) {
        if (mob_infos.determinazione < 10) {
            if (mob_infos.level_multiply == 3) {
                description += "\nTi guarda stizzito...";
            } else if (mob_infos.level_multiply == 4) {
                description += "\nTi guarda con sciocca ironia...";
            } else {
                description += "\nIl suo sguardo spento è un po patetico...";
            }
        } else if (mob_infos.determinazione < 25) {
            if (mob_infos.level_multiply == 1) {
                description += "\nTi guarda teneramente, ammiccante...";
            } else if (mob_infos.level_multiply == 4) {
                description += "\nTi guarda con ironia...";
            } else {
                description += "\nTi guarda con fare sveglio, quasi provocatorio...";
            }
        } else if (mob_infos.determinazione < 45) {
            if (mob_infos.level_multiply == 5) {
                description += "\nTi guarda impassibile, con fredda posatezza...";
            } else {
                description += "\nTi osserva silenziosamente, " + lega_names.gF(mob_infos.isMale, "curios", ["o", "a"]) + "...";
            }
        } else {
            description += "\nTi fissa " + lega_names.gF(mob_infos.isMale, "sever", ["o", "a"]) + " ...pare scrutarti nell'animo.";
        }

    } else {

    }
    return description;
}




