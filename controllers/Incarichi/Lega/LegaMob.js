const lega_names = require('./LegaNames');
const lega_model = require('./LegaModel');


function addRange(in_value, range) {
    let new_range = lega_model.intIn(0, 10);
    if (!isNaN(range)) {
        new_range = lega_model.intIn(0, range);
    }
    return (in_value + ((lega_model.intIn(0, 1) == 1) ? new_range : -new_range));
}


class Mob {
    constructor(isNew, loaded_infos) {
        if (isNew) {
            let proto;
            if (typeof loaded_infos != "undefined") {
                proto = loaded_infos;
            } else {
                proto = lega_model.getRandomMob(1);
            }


            this.name = lega_names.generateMobName(proto.type_name);
            this.type_name = proto.type_name;

            // (this.isMale: "È un maschietto?") ?
            if (proto.gender == "b") {
                if (lega_model.intIn(0, 1) == 1) {
                    this.isMale = true;
                }
                else {
                    this.isMale = false;
                }
            } else {
                this.isMale = (proto.gender == "f" ? false : true);
            }

            let tmp_range = addRange(lega_model.intIn(0, 8), lega_model.intIn(0, 2)); // tra 0 e 10.. È un "valore completamente casuale che casualmente influenza cose a caso|"

            this.genoma = {
                resistenza: lega_model.intIn((proto.destrezza) / 2, (proto.costituzione + proto.forza) / 2),
                affiatamento: addRange(lega_model.intIn(0, 80), tmp_range),
                temperamento: lega_model.intIn(0, 100),

                costituzione: addRange(proto.costituzione, tmp_range),
                forza: addRange(proto.forza, tmp_range),
                destrezza: addRange(proto.destrezza, tmp_range),
                determinazione: addRange(proto.determinazione, tmp_range),
                intelligenza: addRange(proto.intelligenza, tmp_range),
                fede: addRange(proto.fede, tmp_range),

                range: (1 + addRange(tmp_range, tmp_range))
            }





        } else {
            this.name = loaded_infos.name;
            this.type_name = loaded_infos.type_name;
            this.isMale = loaded_infos.isMale;

            this.genoma = loaded_infos.genoma;

        }
    }

    describe(enlapsed_days) {
        let res_text = "";
        if (!enlapsed_days) {
            console.log(this);
            let mob_article = lega_names.getArticle(this);
            res_text = "_" + this.name + " è " + mob_article.indet + this.type_name;
            let proto = getPrototype(this.type_name);
            res_text += mobDescribe_byNature(this, proto, enlapsed_days);
            res_text += "_";

        } else {

        }
        return res_text;
    }


    randomizeProperties(malus) {
        let bonus_seed = 20 - (lega_model.intIn(1, 10) + lega_model.intIn(1, 10));
        if (malus < -20) {
            this.affiatamento += Math.abs(Math.floor(malus / 4));
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
            this.intelligenza = 10 + lega_model.intIn((proto_intelligenza / 2) - (proto_intelligenza / 5), Math.floor(this.intelligenza + (50 - Math.floor(this.costituzione / 2 + this.fede))));
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


    ha_necessari({ fisico, velocità, mentale, emotivo }) { // i 'necessari' della mossa 'lanciata', calcolati sul mob che attacca

    }

    calcola_Impatto({ fisico, velocità, mentale, emotivo }) { // l' 'impatto' della mossa 'subita', calcolati sul mob che subisce

        let danni = {
            fisico: 0,
            velocità: 0,
            mentale: 0,
            emotivo: 0
        }

        // CALCOLO DELL'OGGETTO 'danni'
        if (fisico > 0) { // valore(colpo) + 200 (che è il massimo della somma tra costituzione e resistenza) su un decimo della somma di costituzione e resistenza del mob
            danni.fisico = (fisico + 200) / ((this.costituzione + this.resistenza) / 10);
            // monetina sulla destrezza: (maggiore è il valore, maggiori le probabilità di diminuire il colpo)
            if (lega_model.intIn(0, 100) < this.destrezza) {
                danni.fisico -= this.genoma.range;
            }
        }
        if (velocità > 0) { // In base ad intelligenza e destrezza 
            danni.velocità = (velocità + 200) / ((this.intelligenza + this.destrezza) / 10);
            // monetina sulla costituzione: (maggiore è il valore, maggiori le probabilità di aumentare il colpo subito)
            if (lega_model.intIn(0, 100) < this.costituzione) {
                danni.velocità += this.genoma.range;
            }
        }
        if (mentale > 0) { // In base ad intelligenza e fede 
            danni.mentale = (mentale + 200) / ((this.intelligenza + this.fede) / 10);
            // monetina sulla determinazione: (maggiore è il valore, maggiori le probabilità di diminuire il colpo subito)
            if (lega_model.intIn(0, 100) < this.determinazione) {
                danni.mentale -= this.genoma.range;
            }
        }
        if (emotivo > 0) { // In base ad intelligenza e temperamento ed affiatamento 
            danni.emotivo = (emotivo + 300) / ((this.temperamento + this.affiatamento) / 10);
            // monetina sulla intelligenza: (maggiore è il valore, maggiori le probabilità di diminuire il colpo subito)
            if (lega_model.intIn(0, 100) < this.intelligenza) {
                danni.emotivo -= this.genoma.range;
            }
        }

        return danni;
        // APPLICAZIONE DELL'OGGETTO 'danni'




    }

    impatto({ fisico, velocità, mentale, emotivo }) { // i 'necessari' della mossa 'lanciata', calcolati sul mob che attacca

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
        let overall_stats = {
            nascita: Date.now(),
            vinte: 0,
            perse: 0
        }
        //db_infos.lastMessage_date = Date.now()/1000;
        let to_save= {
            infos: mob,
            stats: overall_stats
        }
        
        return lega_model.saveMob(db_infos, to_save).then(function (save_esit){
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
            description += " che sembra ti si sia già " + lega_names.gF(mob_infos.isMale, "affezzionat", ["o", "a"]) + ". ";
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

    //Prima info - stamina
    if ((mob_infos.destrezza + (mob_infos.forza + mob_infos.determinazione)/4) <= 30) {
        description += "A " + lega_names.gF(mob_infos.isMale, "guardarl", ["o", "a"]) + " non pare affatto "+lega_names.gF(mob_infos.isMale, "fatt", ["o", "a"]);
        description += "per la battaglia.";
        isNegative = true;

    } else if ((mob_infos.destrezza + (mob_infos.forza + mob_infos.determinazione)/4) > mob_infos.costituzione) {
        description += "In battaglia dovrebbe essere in grado di muoversi velocemente";
        if ((mob_infos.forza + mob_infos.costituzione) < 75) {
            description += ", compensando la gracile costituzione.";
            isNegative = true;
        }
    } else if ((mob_infos.destrezza + (mob_infos.forza + mob_infos.determinazione)/4) >= 120) {
        if (mob_infos.forza > 50) {
            if (mob_infos.costituzione > 50){
                description += "È un colosso granitico, abile, indistruttibile...";
            } else{
                description +=  lega_names.gF(mob_infos.isMale, "rapid", ["o", "a"]) +  lega_names.gF(mob_infos.isMale, ", legger", ["o", "a"]) + ", formidabile!";
            }
            description += ", forte"
        } else{
            description += "Dall'aspetto gracile ma atletico, scattante.";
        }
    } else {
        if ((mob_infos.forza+mob_infos.costituzione+mob_infos.destrezza) > 120 ){
            description += "Pare ";
        } else{
            description += "Non pare ";
            isNegative = true;
        }
        if (mob_infos.isMale) {
            description += "un ";
        } else {
            description += "un'";
        }
        
        description += "abile "+(mob_infos.mob_type != "Combattente" ? "combattente" : lega_names.gF(mob_infos.isMale, "lottat", ["ore", "rice"]) );
        description += "."
    }

    // //Link
    // if (isNegative){
    //     description += "\nEppure, ";
    // } else{
        
    // }

    // //Seconda info - range_min
    // if (mob_infos.range_min > mob_proto.range_min) {
    //     description += "l'avversario dovrà trovarsi ad una certa distanza. ";
    // } else if (mob_infos.range_min >= (mob_proto.range_min + 2)) {
    //     description += "potrebbe colpire avversari relativamente vicini. ";
    // } else {
    //     description += "può colpire avversari relativamente vicini. ";
    // }

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




