module.exports = {
    setVerbosity: setVerbosity,
    console_log: console_log,
    isNull: isNull,
    isNully: isNully
}

// se impostato a 0 non emette chiamate a console.log (usato nei test)
global.global_verbosity_argo = 1; 

// imposta la verbosity del modulo
function setVerbosity(verbosity) {
    global_verbosity_argo = verbosity;
    return global_verbosity_argo;
}

// mostra la stringa solo se global_verbosity > 0 (default)
function console_log(stringa){
    if (global_verbosity_argo > 0){
        console.log(stringa);
    }
}

// maledetto javascript e i suoi peccati originali.
// in javascript typeof null === "object". yes, really.
// creiamo un controllo più robusto va' 
function isNull  (value) {return  typeof value === "object" && !value};

// variante valida sia per null che per variabili undefined
function isNully  (value) {return  isNull(value) || typeof value === 'undefined'};
