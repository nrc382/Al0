const fs = require('fs');
const path = require("path");


// NEW_BATTLE -> MENAGE_TURN -> END_BATTLE

/*
oggetto Mob (in Battle):
let mob = {
    type: "",
    curr_combo: [],
    prew_combo: [],
    special_moveSet : [],
    // **
    puntiFerita_rimanenti: 1,
    stamina: 1,
    forza_istant: 1,
    determinazione: 1,
    affiatamento: 1
}
*/ 


// Crea il file battle_id.json 
// Carica l'array specifico delle special_moves per i due mob
// Carica i .json dei due mob (rosso, blu) ed inizzializza i valori per (distance, condition, turn)
// restituisce battle_id
function newBattle(red_telegramId, blu_telegramId){
    return new Promise(function (battle_messageArray){


    });
}
module.exports.createBattle = newBattle;


//Una funzione che, creata una battaglia, viene chiamata ciclicamente.
// Non ha bisogno di ingressi, tutti i valori sono aggiornati nel file "battle_id.json"
// Restituisce un messaggio per "situazione corrente", dopo aver aggiornato le info in battle_id.json
function menageTurn(battle_id){
    return new Promise(function (battle_messageArray){


    });
}
module.exports.turn = menageTurn;