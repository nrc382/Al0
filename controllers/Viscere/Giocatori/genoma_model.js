module.exports.crea_genoma = () => {
    let genoma = [];
    // Il 'genoma' è una sequenza di 42 caratteri
    // due segmenti di 20 caratteri + 2 caratteri 'genitori'

    let caratteri = "ABCDEFGHIJKLMNOPQRSTUVXYWZ";
    let limite_genitori = caratteri.indexOf("G"); // G -> 7

    // Definizione dei genitori
    genoma.push(caratteri[Math.floor(Math.random()*limite_genitori)]); // Genitore zero
    genoma.push(caratteri[Math.floor(Math.random()*limite_genitori)]); // Genitore uno

    // ogni genitore si espande e poi si mischia
    let subgenoma_zero = mischia_subgenoma(coltiva_subgenoma(genoma[0]));  
    let subgenoma_uno = mischia_subgenoma(coltiva_subgenoma(genoma[1]));

    // il genoma definitivo viene formato dall'unione dei subgenomi accodati ai genitori
    genoma = [...genoma, ...unisci_subgenomi(subgenoma_zero, subgenoma_uno)];

    return (genoma);

}


// GENESI

function compara_caratteri(zero, uno){ // Logica di comparazione tra caratteri. (-1, 0, 1);
    let caratteri = "ABCDEFGHIJKLMNOPQRSTUVXYWZ";
    return zero == uno ? 0 : caratteri.indexOf(zero) > caratteri.indexOf(uno) ? 1 : -1
}

function replica_carattere(carattere){ // Prende un carattere e lo accoppia ad un altro;
    return [carattere, "ABCDEFGHIJKLMNOPQRSTUVXYWZ"[Math.floor(Math.random()*"ABCDEFGHIJKLMNOPQRSTUVXYWZ".length)] ];
}

function coltiva_subgenoma(carattere){ // Prende un carattere e crea un array di 10 elementi (formato da 5 doppiette del tipo: (carattere, random(carattere))
    let sub_genoma = [];
    for (let i=0; i < 5; i++){
        sub_genoma = [...sub_genoma, ...replica_carattere(carattere)];
    }
    return sub_genoma;
}

function mischia_subgenoma(sub){ // Prende un array e lo mischia
    return sub
  .map(value => ({ value, sort: Math.random() }))
  .sort((a, b) => a.sort - b.sort)
  .map(({ value }) => value);
}

function unisci_subgenomi(subzero, subuno){ // Unisce due array (considerati della stessa lunghezza)
    let tmp_compare;
    let unione = [];
    for(let i=0; i< subzero.length; i++){
        tmp_compare = compara_caratteri(subzero[i], subuno[i]);
        if (tmp_compare >= 0){
            unione.push(subzero[i], subzero[i], subzero[i], subuno[i]);
        } else {
            unione.push(subuno[i], subuno[i], subzero[i], subzero[i]);

        }
    }
    return unione;
}


// LETTURA

module.exports.genera_attributi = (genoma) => {
    return ({
        c_salute: 100 +Math.floor( ( (Math.random()*2 > 1 ? -1 : 1) * deduci_cap(genoma) )/2 ),
        c_movimento: 100 +Math.floor( ( (Math.random()*2 > 1 ? -1 : 1) * deduci_cap(genoma) )/2 ),
        altezza: deduci_altezza(genoma),
        muscolatura: deduci_muscolatura(genoma),
        destrezza: deduci_destrezza(genoma),
        ragionamento: deduci_ragionamento(genoma)
    })
}

function deduci_cap(genoma){
    return Math.floor( (( (genoma.split(genoma[0]).length*100) / genoma.length) +  ((genoma.split(genoma[1]).length*100) / genoma.length ))/2 );
}

function deduci_altezza(genoma){
    // intero compreso tra 50 e 150
    return Math.floor(150- ( ( (genoma.split(genoma[0]).length*100) / genoma.length) - ((genoma.split(genoma[1]).length*100) / genoma.length ) ))
}

function deduci_muscolatura(genoma){
    // intero compreso tra 0 e 100
    return  Math.floor(( (genoma.split("A").length*100) / genoma.length )  +  ( (genoma.split("B").length*100) / genoma.length ));
}

function deduci_destrezza(genoma){
    return  Math.floor(( (genoma.split("C").length*100) / genoma.length )  +  ( (genoma.split("D").length*100) / genoma.length ));
}

function deduci_ragionamento(genoma){
    return  Math.floor(( (genoma.split("E").length*100) / genoma.length )  +  ( (genoma.split("F").length*100) / genoma.length ));
}

module.exports.calcola_attacco = (muscolatura, destrezza) =>{
    
}

module.exports.calcola_difesa = (muscolatura, destrezza) =>{
    
}

