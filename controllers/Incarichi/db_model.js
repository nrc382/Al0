const mysql = require('mysql');
const config = require('../models/config');

const path = require("path");


const databaseUser = config.databaseLootUser;
const databaseHost = config.databaseHost;
const databasePsw = config.databasePsw;
const databaseName = config.databaseIncarichi;

const submit_dir = config.submit_dir;
const users_dir = config.users_dir;

const simple_log = true;

module.exports.pool = mysql.createPool({
    host: databaseHost,
    user: databaseUser,
    password: databasePsw,
    database: databaseName,

    charset: 'utf8mb4'
});

module.exports.tables_names = {
    users: "Users",
    incarichi: "Incarichi"
};


module.exports.myLog = function myLog(string) {
    if (simple_log) {
        console.log(string);
    }
}
