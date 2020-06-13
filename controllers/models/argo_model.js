const mysql = require('mysql');

const databaseUser = "botdb";
const databaseHost = "localhost";
const databasePsw = "!raspdb";
const databaseName = "Argonauti";


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
