
const fs = require('fs');
const path = require("path");
const got = require("got");

function carica_sfida(chat_id){
    return new Promise(function (sfida_res){
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, `../Al0bot/Sources/SfideStuff/chats/${chat_id}.json`);

        fs.access(main_dir, fs.F_OK, function (err) {
            if (err) {
                console.log("> Nessun dato precedente...");
                let data = JSON.stringify({
                    start_time: Date.now()
                }, null, 2);
                return fs.writeFile(main_dir, data, function (error) {
                    if (error) {
                        console.log("> Errore! ");
                        console.log(error);
                        return sfida_res(false);
                    } else {
                        return sfida_res({});
                    }
                });
            } else {
                let rawdata = fs.readFileSync(main_dir);                
                return sfida_res(JSON.parse(rawdata));
            }
        });
    });
}
module.exports.carica_sfida = carica_sfida;

function aggiorna_sfida(chat_id, sfida){
    return new Promise(function (risposta){
        let main_dir = path.dirname(require.main.filename);
        main_dir = path.join(main_dir, `../Al0bot/Sources/SfideStuff/chats/${chat_id}.json`);
        let data = JSON.stringify(sfida, null, 2);
        return fs.writeFile(main_dir, data, function (error) {
            if (error) {
                console.log("> Errore! ");
                console.log(error);
                return risposta(false);
            } else {
                return risposta(true);
            }
        });
    });
}
module.exports.aggiorna_sfida = aggiorna_sfida;

function controlla(parola){
    return new Promise(function (risposta){
        return got.get(`https://api.dictionaryapi.dev/api/v2/entries/it/${parola}`, { responseType: 'json' }).then(function (full_infos) {
            if (full_infos.title == "No Definitions Found"){
                return risposta(false);
            } else {
                return risposta(true);
            }
        });
    })
}
module.exports.controlla = controlla;
