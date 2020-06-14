const mysql = require('mysql');
const config = require('../models/config');

const databaseUser = config.databaseLootUser;
const databaseHost = config.databaseHost;
const databasePsw = config.databasePsw;
const databaseName = config.databaseLootName;


module.exports.argo_pool = mysql.createPool({
    host: databaseHost,
    user: databaseUser,
    password: databasePsw,
    database: databaseName,

    charset: 'utf8mb4'
});

module.exports.format = function format (string, array){
    return mysql.format(string, array);
}


module.exports.tables_names =  {
    argonauti: "Argonauti",
    zaini: "Zaini",
    items: "LootItems",
    lega_u: "Lega_Users"
};
