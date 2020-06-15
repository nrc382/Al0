const request = require('request-promise');
const model = require('./models/argo_model');
const { console_log, isNull, isNully } = require('./Utilities');

const all_rarity = ["C", "NC", "R", "UR", "L", "E", "UE", "U", "X", "D", "S", "IN", "A"];

let allItemsArray = [];

let allSplittedItems = {
    comuni: [],
    non_comuni: [],
    rari: [],
    ultra_rari: [],
    leggendari: [],
    epici: [],
    ultra_epici: [],
    unici: [],
    x: [],
    draconici: [],
    speciali: [],
    inestimabili: [],
    artefatti: []
}

// Sfruttando l'hoisting di ES2015 (https://developer.mozilla.org/it/docs/Glossary/Hoisting)
// metto in memoria all'inizio del codice i metodi/proprietà che verranno esportati, prima ancora di dichiararli. 
// In questo modo posso richiamare dentro il codice gli stessi metodi che saranno poi accessibili dall'esterno e 
// questo barbatrucco mi consentirà di creare degli stub dei metodi in fase di test.
// È importante ricordare che l'hoisting non funziona per le dichiarazioni, ma solo per le funzioni, 
// quindi qui sopra vanno necessariamente dichiarati all_rarity, allItemsArray, allSplittedItems, che sono -appunto- assegnati.
module.exports = {
    all_rarity: all_rarity,
    allSplittedItems: allSplittedItems,
    getAllItemsArray: getAllItemsArray,
    loadZainoOf: loadZainoOf,
    getItemsCount: getItemsCount,
    getIdOf: getIdOf,
    getItemFromId: getItemFrom,
    getItem: getItem,
    extimate: extimateItemList,
    quick_itemFromName: quick_itemFrom,
    loadAllItems: loadAllItems,
    raritySplit: raritySplit,
    getItemInfo: getItemInfo,
    addLootItem: addLootItem,
    fillerCoatto: fillerCoatto,
    updateSellPrice: updateSellPrice,
    completeUpdateItem: completeUpdateItem,
    printItem: singleItemPrint,
    getCraftList: getCraftList,
    prepareAllItems: prepareAllItems
};

function getAllItemsArray() {
    // in questo modo è possibile creare uno stub e simulare diverse condizioni
    return allItemsArray;
}

function getItemsCount() {
    let craft = allItemsArray.filter(function (item) {
        return item.craftable == 1
    })
    return { all: allItemsArray.length, craftable: craft.length };
}

function getIdOf(item_name) {
    for (let i = 0; i < allItemsArray.length; i++) {
        if (allItemsArray[i].name == item_name) {
            //console_log("Trovat! "+allItemsArray[i].name);
            return allItemsArray[i].id;
        }
    }
    return -1;
}

function getItem(fromName, currPrice, currDealer, update_counter) {
    return new Promise(function (items_res) {
        console_log("> Chiesto " + fromName + ", prezzo: " + currPrice);
        //console_log("> In memoria ho " + allItemsArray.length + " Oggetti");
        //let now_date = Date.now() / 1000;
        let myres = quick_itemFrom(fromName, false, 1, null, 1);

        if (myres == -1 || myres.length <= 0) {
            return items_res(false);
        }
        myres = myres[0];

        let min_price = myres.smuggler_min_value;
        let max_price = isNaN(myres.smuggler_max_value) ? 0 : myres.smuggler_max_value;

        if (update_counter) {
            console_log("> Aggiorno il contatore.");
            myres.offert_counter = Number(myres.offert_counter) + 1;
        } else {
            console_log("> Non aggiorno il contatore.");
        }

        if (Number(currPrice) > Number(max_price)) {
            myres.min_price = max_price;
            myres.max_price = currPrice;
            myres.lucky_guy = currDealer;
        } else if (Number(currPrice) < Number(min_price)) {
            myres.min_price = currPrice;
        }
        console_log("> Prezzo massimo: " + max_price);
        return completeUpdateItem(myres).then(function (complete_update_res) {
            return items_res(complete_update_res);
        });
    });
}

function extimateItemList(itemNames_list) {
    return new Promise(function (estimated) {
        console_log("Chiesta stima di " + itemNames_list.length + " oggetti...");
        let promise_array = [];
        for (let i = 0; i < itemNames_list.length; i++) {
            console_log("> Aggiungo: " + itemNames_list[i])
            promise_array.push(getItem(itemNames_list[i]));
        }

        return Promise.all(promise_array).then(function (itemsRes_array) {
            return estimated(itemsRes_array);
        });
    });
}

function quick_itemFrom(name, isRarity, quantity, sell_value, craftable) {
    let to_res = [];
    let imputName_array = name.toLowerCase().trim().split(" ");
    console_log("> QuickFinder per:\n> (name: '" + name + "', rarità: " + isRarity + ", quantity: " + quantity + " (" + (quantity == 1) + ") , craftable: " + craftable + ")");
    if (imputName_array.length > 6) {
        return -1;
    }


    let tmp_recCounter;
    let imput_tmp_condition;
    for (let i = 0; i < allItemsArray.length; i++) {
        if (quantity == 1) {
            if (allItemsArray[i].name.toLowerCase() == name.toLowerCase()) {
                to_res.push(allItemsArray[i]);
                break;
            }
        } else if (isRarity) {
            imput_tmp_condition = allItemsArray[i].rarity.toLowerCase() == isRarity.toLowerCase();
            if (typeof craftable != "undefined" && craftable >= 0) {
                imput_tmp_condition = imput_tmp_condition && allItemsArray[i].craftable == craftable;
            }
            if (name.length > 1 && name != isRarity.toLowerCase()) {
                tmp_recCounter = 0;

                for (let j = 0; j < imputName_array.length; j++) {
                    if (allItemsArray[i].name.toLowerCase().match(imputName_array[j])) {
                        tmp_recCounter++;
                    }
                }
                if (imputName_array.length == 1) {
                    imput_tmp_condition = imput_tmp_condition && tmp_recCounter == 1;
                } else {
                    imput_tmp_condition = imput_tmp_condition && (tmp_recCounter >= (Math.round(imputName_array.length / 2) + 1));
                }
            }
            if (imput_tmp_condition) {
                to_res.push(allItemsArray[i])
            }
        } else if (imputName_array.length > 0) {
            tmp_recCounter = 0;

            for (let j = 0; j < imputName_array.length; j++) {
                if (allItemsArray[i].name.toLowerCase().match(imputName_array[j])) {
                    tmp_recCounter++;
                }
            }
            if (imputName_array.length == 1) {
                imput_tmp_condition = tmp_recCounter == 1;
            } else {
                imput_tmp_condition = (tmp_recCounter >= (Math.round(imputName_array.length / 2) + 1));
            }
            if (typeof craftable != "undefined" && craftable >= 0) {
                imput_tmp_condition = imput_tmp_condition && allItemsArray[i].craftable == craftable;
            }

            if (imput_tmp_condition) {
                to_res.push(allItemsArray[i]);
            }
        }
    }


    if (isRarity != false && to_res.length == 0) {
        return quick_itemFrom(name + " " + isRarity.toUpperCase(), false, quantity, sell_value, craftable);
    }

    if (craftable != 1) {
        to_res = to_res.sort(function (item_a, item_b) {
            return all_rarity.indexOf(item_a.rarity) - all_rarity.indexOf(item_b.rarity);
        });
    } else {
        to_res = to_res.sort(function (item_a, item_b) {
            return item_b.craft_pnt - item_a.craft_pnt;
        })
    }

    if (quantity == -1 && to_res.length > 0) {
        for (let i = 0; i < to_res.length; i++) {
            if (to_res[i].name.toLowerCase() == name.toLowerCase()) {
                return ([to_res[i]]);
            }
        }
        return ([to_res[0]]);
    } else {
        return to_res;
    }

}

function prepareAllItems(results) {
    // è una buona pratica separare il codice che elabora i risultati della query dalla query stessa 
    // in questo modo il codice è testabile e indipendente dal DB usato
    let risultato = [];
    if (!isNully(results)) {
        for (let i = 0; i < results.length; i++) {
            if (results[i].craftable == 1) {
                let item_info = infoFromRarity(results[i].rarity);
                results[i].craft_pnt = item_info.craft_pnt;
                results[i].craft_cost = item_info.craft_cost;

                if (!isNully(results[i].is_needed_for) && results[i].is_needed_for.length > 2) {
                    results[i].childIds_array = results[i].is_needed_for.split(":").filter(s => s !== "").map(s => parseInt(s, 10))
                }
            }

            risultato.push(results[i]);
        }
        console_log("▸ Caricati " + allItemsArray.length + " oggetti");
    }
    return risultato;
}

function loadAllItems() {
    console_log("> Carico gli oggetti di loot");
    return new Promise(function (loadAllItems_res) {
        model.argo_pool.query("SELECT * FROM " + model.tables_names.items,
            function (error, results) {
                if (!error) {
                    allItemsArray = prepareAllItems(results);
                    raritySplit(allItemsArray);

                    console_log("▸ AllSplittedItems: C=" + allSplittedItems.comuni.length + ", NC=" + allSplittedItems.non_comuni.length + ", R=" + allSplittedItems.rari.length);

                    loadAllItems_res(allItemsArray.length);
                } else {
                    console.error("▸ Errore nel caricamento in ram della lista oggetti!");
                    loadAllItems_res(-1);
                }

            });
    });
}

function raritySplit(items_array) {

    for (let i = 0; i < items_array.length; i++) {
        switch (items_array[i].rarity) {
            case 'C': {
                allSplittedItems.comuni.push({
                    id: items_array[i].id,
                    name: items_array[i].name,
                    rarity: items_array[i].rarity,
                    craftable: items_array[i].craftable
                });
                break;
            } case 'NC': {
                allSplittedItems.non_comuni.push({
                    id: items_array[i].id,
                    name: items_array[i].name,
                    rarity: items_array[i].rarity,
                    craftable: items_array[i].craftable
                });
                break;
            } case 'R': {
                allSplittedItems.rari.push({
                    id: items_array[i].id,
                    name: items_array[i].name,
                    rarity: items_array[i].rarity,
                    craftable: items_array[i].craftable
                });
                break;
            } case 'UR': {
                allSplittedItems.ultra_rari.push({
                    id: items_array[i].id,
                    name: items_array[i].name,
                    rarity: items_array[i].rarity,
                    craftable: items_array[i].craftable
                });
                break;
            } case 'L': {
                allSplittedItems.leggendari.push({
                    id: items_array[i].id,
                    name: items_array[i].name,
                    rarity: items_array[i].rarity,
                    craftable: items_array[i].craftable
                });
                break;
            } case 'E': {
                allSplittedItems.epici.push({
                    id: items_array[i].id,
                    name: items_array[i].name,
                    rarity: items_array[i].rarity,
                    craftable: items_array[i].craftable
                });
                break;
            } case 'UE': {
                allSplittedItems.ultra_epici.push({
                    id: items_array[i].id,
                    name: items_array[i].name,
                    rarity: items_array[i].rarity,
                    craftable: items_array[i].craftable
                });
                break;
            } case 'U': {
                allSplittedItems.unici.push({
                    id: items_array[i].id,
                    name: items_array[i].name,
                    rarity: items_array[i].rarity,
                    craftable: items_array[i].craftable
                });
                break;
            } case 'X': {
                allSplittedItems.x.push({
                    id: items_array[i].id,
                    name: items_array[i].name,
                    rarity: items_array[i].rarity,
                    craftable: items_array[i].craftable
                });
                break;
            } case 'D': {
                allSplittedItems.draconici.push({
                    id: items_array[i].id,
                    name: items_array[i].name,
                    rarity: items_array[i].rarity,
                    craftable: items_array[i].craftable
                });
            } default: {
                break;
            }
        }
    }
    console_log("> to_return.comuni: " + allSplittedItems.comuni.length);
}

function getItemInfo(fromName, isRarity, craftable, precise) {
    console_log("Chieste info per " + fromName);
    return new Promise(function (getItemInfo_res) {
        let resText = "";
        let test = fromName.match("!!");
        fromName = fromName.split("*").join("");
        fromName = fromName.split("!!").join("");


        if (!test) {
            fromName = fromName.split("%").join("");
            let quickRes = quick_itemFrom(fromName, isRarity, precise, null, craftable);
            if (quickRes == -1) {
                getItemInfo_res("*...non esaggeriamo!*\n\nCercare `\"" + fromName + "\"` non porterebbe ad alcun risultato!");
            }
            console_log("Quick!");
            if (quickRes.length <= 0) {
                fromName = fromName.split("%").join("").toUpperCase();
                resText = "🤔 \"" + fromName.toLowerCase() + "\"...\nNon mi dice niente.";
            } else {
                if (quickRes.length == 1) {
                    resText = "*Trovato un oggetto* 📦\n\n";
                } else {
                    resText = "*Trovati " + quickRes.length + " oggetti* 📦\n\n";
                }
                resText = itemsPrint(resText, quickRes);
            }

            getItemInfo_res(resText);


        } else {
            let query;
            console_log("Slow... :( ");

            if (!isRarity) {
                query = "SELECT * FROM " + model.tables_names.items + " WHERE `name` LIKE ? ORDER BY `craft_pnt`"
            } else {
                query = "SELECT * FROM " + model.tables_names.items + " WHERE `rarity` = ? ORDER BY `offert_counter` DESC"
            }
            model.argo_pool.query(query, fromName, function (error, results) {
                if (!error) {
                    console_log(results);
                    if (results.length <= 0) {
                        fromName = fromName.split("%").join("").toUpperCase();
                        resText = "🤔 \"" + fromName.toLowerCase() + "\"...\nNon mi dice niente, sai?";
                    } else {
                        if (results.length == 1) {
                            resText = "*Trovato un oggetto* 📦\n\n";
                        } else {
                            resText = "*Trovati " + results.length + " oggetti* 📦\n\n";
                        }
                        resText = itemsPrint(resText, results);
                    }

                    getItemInfo_res(resText);
                } else {
                    console_log(error);
                    getItemInfo_res(false);
                }
            });
        }



    })
}

function addLootItem(itemName, currPrice, currDealer) {
    return new Promise(function (addLootItem_res) {
        request({
            "method": "GET",
            "uri": "http://fenixweb.net:3300/api/v2/GbeUaWrGXKNYUcs910310/items/" + itemName.split(" ").join("_"),
            "json": true
        }).then(function (infos) {
            if (typeof infos.res == 'undefined' || infos.res.length == 0) {
                addLootItem_res(false);
            } else {
                if (infos.res.length > 1) {
                    infos.res = infos.res[0];
                }
                get_itemBaseFor(infos.res.id, parseInt(infos.res.craftable)).then(function (item_is_used_for) {
                    console_log("> Id per i quali è usato " + infos.res.name + ": ");
                    console_log(item_is_used_for);
                    let toSave = [
                        infos.res.id,
                        infos.res.craftable,
                        infos.res.name,
                        infos.res.rarity,
                        infos.res.craft_pnt,
                        currPrice,
                        currDealer,
                        1
                    ];
                    let insert_query = "INSERT INTO " + model.tables_names.items;
                    insert_query += " (id,craftable, name, rarity, craft_pnt, max_value, lucky_guy, offert_counter) VALUES ? ";
                    insert_query += " ON DUPLICATE KEY UPDATE name=VALUES(`name`), craftable= VALUES(`craftable`), rarity=VALUES(`rarity`), craft_pnt=VALUES(`craft_pnt`))";

                    model.argo_pool.query(insert_query, [[toSave]], function (error) {
                        if (!error) {
                            addLootItem_res({ id: infos.res.id, name: infos.res.name, is_used_for: "NON DISPONIBILE", craftable: (infos.res.craftable == 0 ? false : true) });
                        }
                        else {
                            console_log(error);
                            addLootItem_res(false);
                        }
                    });
                });
            }
        });
    });
}

function addAllLootItems() {
    return new Promise(function (addLootItem_res) {

        request({
            "method": "GET",
            "uri": "http://fenixweb.net:3300/api/v2/GbeUaWrGXKNYUcs910310/items/",
            "json": true
        }).then(function (infos) {
            if (typeof infos.res == 'undefined' || infos.res.length == 0) {
                addLootItem_res(false);
            } else {
                console_log("> Aggiorno tutti gli oggetti di Lootia (" + infos.res.length + ")");
                let the_big_array = [];

                for (let i = 0; i < infos.res.length; i++) {
                    console_log("> " + infos.res[i].name);
                    the_big_array.push([
                        infos.res[i].id,
                        infos.res[i].craftable,
                        infos.res[i].name,
                        infos.res[i].rarity,
                        infos.res[i].craft_pnt,
                        infos.res[i].estimate,
                        infos.res[i].value
                    ]);
                }

                let insert_query = "INSERT INTO " + model.tables_names.items;
                insert_query += " (id, craftable, name, rarity, craft_pnt, estimate_value, base_value, is_needed_for) VALUES ? ";
                insert_query += " ON DUPLICATE KEY UPDATE " +
                    "name=VALUES(`name`), " +
                    "craftable= VALUES(`craftable`), " +
                    "rarity=VALUES(`rarity`), " +
                    "craft_pnt=VALUES(`craft_pnt`), " +
                    "estimate_value=VALUES(`estimate_value`), " +
                    "base_value=VALUES(`base_value`), " +
                    "is_needed_for=VALUES(`is_needed_for`) ";

                model.argo_pool.query(insert_query, [the_big_array], async function (error, res) {
                    if (!error) {
                        console_log(res);
                        const all_reloaded = await module.exports.loadAllItems();
                        addLootItem_res(res);
                    }
                    else {
                        console_log(error);
                        addLootItem_res(false);
                    }
                });

            }
        });
    });
}

function updateItemValues(itemID, values) {
    return new Promise(function (updateItem_res) {
        if (typeof counter == NaN) {
            counter = 1;
        }

        let val_array = [];
        let query_array = [];
        if (typeof values.smuggler_max_value != "undefined") {
            query_array.push("  smuggler_max_value = ?")
            val_array.push(values.smuggler_max_value);
        }
        if (typeof values.smuggler_min_value != "undefined") {
            query_array.push("  smuggler_min_value = ?")
            val_array.push(values.smuggler_min_value);
        }
        if (typeof values.smuggler_lucky_guy != "undefined") {
            query_array.push("  lucky_guy = ?")
            val_array.push(values.smuggler_lucky_guy);
        }
        if (typeof values.counter != "undefined") {
            query_array.push("  offert_counter = ?")
            val_array.push(values.counter);
        }
        if (typeof values.last_market_update != "undefined") {
            query_array.push("  last_market_update = ?")
            val_array.push(values.last_market_update);
        }
        if (typeof values.market_min_value != "undefined") {
            query_array.push("  market_min_value = ?")
            val_array.push(values.market_min_value);
        }
        if (typeof values.market_max_value != "undefined") {
            query_array.push("  market_max_value = ?")
            val_array.push(values.market_max_value);
        }
        if (typeof values.market_medium_value != "undefined") {
            query_array.push("  market_medium_value = ?")
            val_array.push(values.market_medium_value);
        }
        if (typeof values.market_recent_sells != "undefined") {
            query_array.push("  market_recent_sells = ?")
            val_array.push(values.market_recent_sells);
        }


        let query = "UPDATE " + model.tables_names.items + " SET " + query_array.join(", ") + " WHERE id = ?";
        val_array.push(itemID);


        model.argo_pool.query(query,
            val_array,
            function (error) {
                if (!error) {
                    updateItem_res(true)
                }
                else {
                    console_log(error);
                    updateItem_res(false);
                }
            });
    });
}

function getSteriles() {
    let tmp_childs_array = [];
    let res_id = [];
    let tmp_bool = false;
    let tmp_child;
    for (let i = 0; i < allItemsArray.length; i++) {
        if (typeof allItemsArray[i].is_needed_for != undefined && allItemsArray[i].is_needed_for != null && allItemsArray[i].is_needed_for.length > 2) {
            tmp_childs_array = allItemsArray[i].is_needed_for.substring(1, allItemsArray[i].is_needed_for.length - 1).split(":");
        }
        tmp_bool = true;
        for (let j = 0; j < tmp_childs_array.length; j++) {
            tmp_child = getItemFrom(tmp_childs_array[j]);
            if (tmp_child.craftable == 1) {
                tmp_bool = false;
            }
        }
        if (tmp_bool) {

            res_id.push(allItemsArray[i].id);
        }

    }

    let promise_array = [];

    for (let i = 0; i < res_id.length; i++) {
        promise_array.push(updateItemsSteriles(res_id[i]));
    }

    Promise.all(promise_array).then(function (all_res) {
        console_log(all_res);
    });
}

function updateItemsSteriles(id) {
    return new Promise(function (steriles_update) {
        let get_query = "UPDATE " + model.tables_names.items + " SET isSterile = 1 WHERE id = ? "; // OR is_used_for = '')
        model.argo_pool.query(get_query, [id], function (error, item_res) {
            if (error) {
                console_log("Errore: ");
                console_log(error);
            } else {
                console_log("NON Errore: ");
                console_log(item_res);
            }
        });
    });
}

function get_itemBaseFor(item_id, is_craftable) {
    return new Promise(function (get_itemBaseFor_res) {
        if (is_craftable == 0) {
            return get_itemBaseFor_res([]);
        } else {
            request({
                "method": "GET",
                "uri": "http://fenixweb.net:3300/api/v2/GbeUaWrGXKNYUcs910310/crafts/" + item_id + "/needed",
                "json": true
            }).then(function (infos) {
                if (typeof infos.res == 'undefined' || infos.res.length == 0) {
                    get_itemBaseFor_res(false);
                } else {
                    let to_return = [];
                    for (let i = 0; i < infos.res.length; i++) {
                        to_return.push(infos.res[i].id);
                    }
                    get_itemBaseFor_res(to_return);
                }
            });
        }


    });
}

function fillerCoatto(argonaut, command) {
    return new Promise(function (fillerCoatto_res) {
        let avaible = [16964514];

        if (command.length < 2) {
            return fillerCoatto_res("Devi specificare l'id di un oggetto, o uno tra i comandi:\n\n> `quali?`\n>`matto`\n> `una decina`");
        }
        if (avaible.indexOf(argonaut.info.id) < 0) {
            return fillerCoatto_res("Non sei abilitato. Chiedi ad @nrc382");
        }
        if (command[1] == "quali?") {
            return getItemsToUpdate().then(function (all_res) {
                fillerCoatto_res(all_res)
            });
        } if (command[1] == "matto") {
            return addAllLootItems().then(function (all_res) {
                fillerCoatto_res("fine!")
            });
        } if (command[1] == "una" && command[2] == "decina") {
            return fillerSecondo().then(function (all_res) {
                fillerCoatto_res(all_res)
            });
        } else {
            return fillerCoatto_res("Funzione non piu disponibile. Usa `/aggiorna una decina` (con parsimonia!)");

            let id = parseInt(command[1]);
            if (isNaN(id)) {
                return fillerCoatto_res("Devi specificare l'id di un oggetto, cosa mi significa \" " + command[1] + "\"?");
            } else if (id < 1 || id > 783) {
                return fillerCoatto_res("Esistono *solo* 783 oggetti su lootia...");
            } else {
                addLootItem("" + id, 0, argonaut.info.nick).then(function (add_res) {
                    fillerCoatto_res(add_res);
                });
            }
        }

    });

}

function fillerSecondo() {
    return new Promise(function (fillerSecondo_res) {
        let get_query = "SELECT id, is_needed_for FROM " + model.tables_names.items + " WHERE is_needed_for IS NULL ORDER BY id DESC"; // OR is_used_for = '')
        model.argo_pool.query(get_query, function (error, item_res) {
            if (item_res.length <= 0) {
                return fillerSecondo_res("Nulla da aggiornare");
            } else if (!error) {
                let big_array = [];
                shuffleArray(item_res);
                let safe_limit = Math.min(item_res.length, 100);

                for (let i = 0; i < safe_limit; i++) {
                    big_array.push(get_itemBaseFor(item_res[i].id, 1));
                }

                Promise.all(big_array).then(function (big_res) {
                    console_log(big_res);
                    let res_array = [];
                    for (let o = 0; o < big_res.length; o++) {
                        res_array.push([
                            item_res[o].id,
                            big_res[o] != false ? ":" + big_res[o].join(":") + ":" : ""
                        ]);
                    }

                    let insert_query = "INSERT INTO " + model.tables_names.items;
                    insert_query += " (id, is_needed_for) VALUES ?";
                    insert_query += " ON DUPLICATE KEY UPDATE is_needed_for=VALUES(`is_needed_for`)";

                    model.argo_pool.query(insert_query, [res_array], function (error, final_res) {
                        if (!error) {
                            console_log(final_res);
                            return fillerSecondo_res("Aggiornate le info di " + final_res.changedRows + "/" + safe_limit + " oggetti\n(Da aggiornare: " + item_res.length + "+)");
                        }
                        else {
                            console_log(error);
                            return fillerSecondo_res("Problemi... troppa roba!");
                        }
                    });
                });
            }
            else {
                console_log(error);
                return fillerSecondo_res(false);
            }
        });
    });

}

function getItemsToUpdate() {
    return new Promise(function (toUpdate_res) {
        let get_query = "SELECT id as `id` FROM " + model.tables_names.items + " WHERE is_needed_for IS NULL LIMIT 50"; // OR is_used_for = '')
        model.argo_pool.query(get_query, function (error, res) {
            if (!error) {
                let to_return = "Ecco " + res.length + " ID da aggiornare:\n\n";
                if (res.length == 0) {
                    to_return += "*Scherzetto!!* (finiti! 💪)";

                } else {
                    for (let i = 0; i < res.length; i++) {
                        to_return += "> `/aggiorna " + res[i].id + "`\n";
                    }
                }

                toUpdate_res(to_return);
            }
            else {
                console_log(error);
                toUpdate_res(false);
            }
        });
    });
}

function updateSellPrice(argonaut, command, toAnalize) {
    return new Promise(function (updateSellPrice_res) {
        let text = "";
        let main_lines_array = [];
        let personal_price = 0;
        console_log("Ricevo: " + command.join(" "));
        console_log("Voglio: " + command[1]);

        if (typeof command != 'undefined' && command.length > 0) {
            for (let i = 0; i < command.length; i++) {
                if (command[i].indexOf("%") > 0) {
                    console_log("Sono nell'if...");
                    personal_price = parseInt(command[i].slice(0, command[i].length - 1));
                }
            }

        }
        console_log(command);
        console_log(personal_price);

        let tmp_line;
        let tmp_item_name;
        let tmp_item_price;

        //Deduce le line con /negozio e le parsa
        for (let i = 0; i < toAnalize.length; i++) {
            tmp_line = toAnalize[i].split(" ");
            if (tmp_line[0] == "Negozi") {
                tmp_item_name = toAnalize[i].substring(toAnalize[i].indexOf(" per ") + 5, toAnalize[i].length - 1);
                //tmp_item_name = tmp_item_name.slice(0, tmp_item_name.length - 1);
                tmp_line = toAnalize[i + 1].split(" ");
                tmp_item_price = parseInt(tmp_line[2].substring(1).split(".").join(""));

                main_lines_array.push({ name: tmp_item_name, price: tmp_item_price });
            }
        }

        //Titolo
        if (main_lines_array.length < 3) {
            text = "*Ti piace fare le cose con calma?*\nLo sai che puoi mandare /ricerca di tre oggetti, si?\n\n";
        } else {
            text = "🏷* Etichette!*\n...per 3 oggetti\n\n";
        }

        let toSave_array = [];
        let now_date = (Date.now() / 1000).toFixed();
        let promise_array = [];

        for (let i = 0; i < main_lines_array.length; i++) {
            text += "> " + main_lines_array[i].name + " " + parsePrice(main_lines_array[i].price) + "\n";
            promise_array.push(updateItemPrice([main_lines_array[i].price, now_date, main_lines_array[i].name]));

            for (let j = 0; j < allItemsArray.length; j++) {
                if (allItemsArray[j].name == main_lines_array[i].name) {
                    allItemsArray[j].sell_value = main_lines_array[i].price;
                    break;
                }
            }
        }

        console_log(promise_array.length + " promesse (da mantenere!!)");

        Promise.all(promise_array).then(function (update_res) {
            console_log(toSave_array);

            updateSellPrice_res(text);
        });


    });
}

function updateItemPrice(items_array) {
    return new Promise(function (updateItem_res) {
        let queries = "UPDATE " + model.tables_names.items + " SET sell_value = ?, last_price_update = ?  WHERE name = ?;";
        console_log("> " + items_array[2]);
        model.argo_pool.query(queries, items_array,
            function (error, res) {
                if (!error) {
                    console_log(res);
                    model.argo_pool.query("SHOW WARNINGS", function (error, res) {
                        updateItem_res(true)
                    });
                }
                else {
                    console_log(error);
                    updateItem_res(false);
                }
            });
    });
}

function updateItemMarketPrice(item_info, force) {
    return new Promise(function (updateItemMarketPrice_res) {
        if (typeof force == "undefined") {
            force = false;
        }
        let now_date = Date.now() / 1000;
        let name = (item_info.name + "").toLowerCase().split(" ").join("%20");
        // console_log("> to search: " + name);
        // console_log("> last_market_update: " + item_info.last_market_update);
        // console_log("> diff: " + (now_date - parseInt(item_info.last_market_update)));
        let condition;
        if (force && (now_date - parseInt(item_info.last_market_update)) > (60)) {
            condition = true;
        } else {
            condition = item_info.last_market_update == null || item_info.last_market_update == 0 || (now_date - parseInt(item_info.last_market_update)) > (60 * 60);
        }

        if (condition) {
            request({
                "method": "GET",
                "uri": "http://fenixweb.net:3300/api/v2/GbeUaWrGXKNYUcs910310/history/market_direct?limit=1000&fromItem=" + name,
                "json": true
            }).then(function (infos) {
                if (typeof infos.res == 'undefined' || infos.res.length == 0) {
                    //console_log(infos);
                    return updateItemMarketPrice_res(false);
                } else {
                    console_log("> Transizioni: " + infos.res.length);
                    now_date = new Date(now_date * 1000);

                    let first_price_array = [];
                    let firs_media = 0;
                    let max_value = 0;
                    let min_value = 0;
                    let market_recent_sells = 0;

                    let tmp_price;
                    let tmp_date;

                    let storico = { min: -1, max: -1, counter: [] };

                    for (let i = 0; i < infos.res.length; i++) {
                        if (infos.res[i].type == 2) {
                            tmp_date = new Date(infos.res[i].time);
                            //console_log("> " + infos.res[i].price + " alle: " + tmp_date);
                            tmp_price = parseInt(infos.res[i].price);

                            if ((now_date - tmp_date.getTime()) < (1000 * 60 * 60 * 24 * 30)) {
                                if (tmp_price > (item_info.base_value + ((item_info.base_value * 20) / 100))) {
                                    market_recent_sells++;
                                    console_log("> Faccio cose. tmp_price = " + tmp_price);

                                    if (min_value == 0) {
                                        min_value = tmp_price;
                                    }

                                    if (tmp_price > max_value) {
                                        max_value = tmp_price;
                                    } else if (tmp_price < min_value) {
                                        min_value = tmp_price;
                                    }

                                    first_price_array.push(tmp_price);
                                    firs_media += parseInt(tmp_price);
                                }
                            } else {
                                storico.counter.push(tmp_price);

                                if (storico.min == -1) {
                                    storico.min = tmp_price;
                                }
                                if (tmp_price > storico.max) {
                                    storico.max = tmp_price;
                                } else if (tmp_price < storico.min) {
                                    storico.min = tmp_price;
                                }
                            }
                        }
                    }

                    let second_media = 0;
                    let second_media_count = 0;

                    if (firs_media != 0) {
                        firs_media = firs_media / (first_price_array.length == 0 ? 1 : first_price_array.length);

                        for (let i = 0; i < first_price_array.length; i++) {
                            if (first_price_array[i] < (firs_media + Math.round((firs_media * 8) / 10))) {
                                second_media += first_price_array[i];
                                second_media_count++;
                            }
                        }
                        second_media = second_media / second_media_count;
                    } else {
                        max_value = storico.max;
                        min_value = storico.min;
                        let count_media = 0;
                        for (let i = 0; i < storico.counter.length; i++) {
                            count_media += storico.counter[i];
                        }
                        second_media = Math.floor(count_media / storico.counter.length);
                    }


                    item_info.market_medium_value = second_media;
                    item_info.market_max_value = max_value;
                    item_info.market_min_value = min_value;
                    item_info.market_recent_sells = market_recent_sells;

                    return updateItemMarketPrice_res(item_info);
                }
            });

        } else {
            return updateItemMarketPrice_res(item_info);
        }

    });
}

function completeUpdateItem(item, force) {
    return new Promise(function (completeUpdateItem_res) {
        if (typeof force == "undefined") {
            force = false;
        }
        console_log("> Entro nel completeUpdate per " + item.name + ", force: " + force);
        //console_log(item);
        //console_log("________");
        if (typeof item.name == "undefined") {
            console_log("> Esco (subito) ");

            return completeUpdateItem_res(true);
        }

        return updateItemMarketPrice(item, force).then(function (new_market_val) {
            console_log("> completeUpdateItem: " + new_market_val);
            let values = {
                smuggler_max_price: item.smuggler_max_value,
                smuggler_min_price: item.smuggler_min_value,
                smuggler_lucky_guy: item.lucky_guy,
                counter: item.offert_counter,
                market_max_value: new_market_val.market_max_value,
                market_min_value: new_market_val.market_min_value,
                market_medium_value: new_market_val.market_medium_value,
                market_recent_sells: new_market_val.market_recent_sells,
                last_market_update: Date.now() / 1000
            }
            return updateItemValues(item.id, values).then(function (res) {
                console_log("> updateItem: " + res);
                if (res) {
                    for (let i = 0; i < allItemsArray.length; i++) {
                        if (allItemsArray[i].id == item.id) {
                            allItemsArray[i].smuggler_max_price = values.smuggler_max_price;
                            allItemsArray[i].smuggler_min_price = values.smuggler_min_price;
                            allItemsArray[i].smuggler_lucky_guy = values.smuggler_lucky_guy;
                            allItemsArray[i].market_max_value = values.market_max_value;
                            allItemsArray[i].market_min_value = values.market_min_value;
                            allItemsArray[i].market_medium_value = values.market_medium_value;
                            allItemsArray[i].market_recent_sells = values.market_recent_sells;
                            allItemsArray[i].offert_counter = values.counter;
                            allItemsArray[i].last_market_update = values.last_market_update;
                            return completeUpdateItem_res(allItemsArray[i]);
                        }
                    }

                    return completeUpdateItem_res(false);
                } else {
                    return completeUpdateItem_res(false);
                }

            });
        });

    });
}

function itemsPrint(sourceText, items_array) {
    for (let i = 0; i < items_array.length; i++) {
        sourceText += "• " + singleItemPrint(items_array[i]) + "\n";
    }
    return sourceText;
}

function singleItemPrint(item) {
    // console_log("Chiesta print di:")
    // console_log(item);

    let res_text = "> " + item.name + " (" + item.rarity + ")\n";
    if (item.craftable == 1) {
        res_text += "⚒ _Creato_";
    } else if (item.craftable == 0) {
        res_text += "⊙ _Base_";
    }
    if (item.craftable == 1) { // 
        res_text += ", *" + item.craft_pnt + "* PC\n";

        if (item.smuggler_max_value > 0) {
            res_text += "\nContrabbando 👣 \n";

            res_text += " > C. Offerte: " + item.offert_counter + "\n";
            if (item.smuggler_min_value > 0) {
                res_text += " > Da: " + parsePrice(item.smuggler_min_value) + "\n";
            }
            res_text += " > A: " + parsePrice(item.smuggler_max_value) + "\n";
        }
    } else {
        res_text += "\n";
    }

    res_text += "\n";

    if (item.market_min_value > 0) {
        res_text += "Mercato 💰 \n";
        res_text += " > Transizioni: " + item.market_recent_sells + " (30g⁻)\n";
        res_text += " > Medio: " + parsePrice(item.market_medium_value) + " ";
        if ((item.market_max_value - item.base_value) > 0) {
            let tmp_sellAndBase_proportion = Math.round((item.base_value * 100) / item.market_medium_value);
            if (tmp_sellAndBase_proportion > 0) {
                res_text += "(+" + tmp_sellAndBase_proportion + "%)\n";
            } else {
                res_text += "(base: " + parsePrice(item.base_value) + ")\n";
            }
        }
        res_text += " > Max.: " + parsePrice(item.market_max_value) + " \n";
        res_text += " > Min.: " + parsePrice(item.market_min_value) + " \n";

    }

    return res_text;
}

// #crafting

function loadZainoOf(user_id, bool) {
    return new Promise(function (loadZainoOf_res) {
        if (!bool) {
            return loadZainoOf_res(false);
        }
        return model.argo_pool.query(
            "SELECT * FROM " + model.tables_names.zaini + " WHERE user_id = ?",
            [user_id],
            function (err, zaino) {
                if (err || zaino.length <= 0) {
                    console.error(err);
                    return loadZainoOf_res(false);
                } else {
                    console_log("> zaino di " + user_id + " caricato correttamente: " + zaino.length);
                    return loadZainoOf_res(zaino);
                }
            });
    });
}

function getCraftList(toCraft_array, forArgonaut_id, check_zaino, preserve_zaino) {
    return new Promise(function (getCraftList_res) {
        let ids_array = [];
        let allItemsArray = [];
        let already_avaible = [];
        let root_items = { items: [], childIds_array: [] };
        let impact_array = [];
        let target = {
            target_pc: 0,
            target_gain: 0,
            target_craftCost: 0
        };

        if (isNull(toCraft_array)) { toCraft_array = []; }  // per precauzione
        // non serve fare un controllo sugli altri parametri della funzione: anche se fossero null/undefined il codice si comporta nello stesso modo

        if (typeof preserve_zaino == "undefined") {
            preserve_zaino = false;
        }

        return module.exports.loadZainoOf(forArgonaut_id, check_zaino).then(function (zaino) {
            let tmp_root_item;

            //let temp_zaino_quantity_dif;
            //let tmp_zaino_used;
            for (let i = 0; i < toCraft_array.length; i++) { //preparo array root_items (id ripetuto N-volte la quantità)
                tmp_root_item = getItemFrom(toCraft_array[i].id, true);
                tmp_root_item.levels_deep = 0;
                //console_log("> "+tmp_root_item.name+" "+", quantità: "+toCraft_array[i].quantity);
                for (let j = 0; j < toCraft_array[i].quantity; j++) {
                    root_items.items.push(tmp_root_item);
                    root_items.childIds_array = root_items.childIds_array.concat(tmp_root_item.childs_array);
                    target.target_pc += (tmp_root_item.craft_pnt);
                    target.target_gain += (tmp_root_item.base_value);
                    target.target_craftCost += infoFromRarity(tmp_root_item.rarity).craft_cost;
                }
            }
            //console_log("> Radici: " + root_items.items.length);
            //console_log("> Sub-nodi: " + root_items.childIds_array.length);
            //console_log("> target.target_gain: " + target.target_gain);
            //console_log(" >target.target_pc: " + target.target_pc);
            //allItemsArray = allItemsArray.concat(root_items.items);
            let total_info = { total_cost: target.target_craftCost, gained_pc: target.target_pc };
            let now_date = Date.now();
            let craft_res = process_recoursiveCraft(allItemsArray, ids_array, root_items.childIds_array, impact_array, total_info, 1, zaino, preserve_zaino);
            console_log("> Uscito dal craft recursivo. Tempo impiegato: " + ((Date.now() - now_date) / 1000) + " sec");
            //console_log("> max_deep: " + craft_res.max_levels_deep);
            let craft_impact = {};
            craft_impact.total_impact = 0;
            craft_impact.base = [];
            craft_impact.crafted = [];
            if (zaino) {
                let impact_sum = 0;
                if (craft_res.impact.length > 0) {
                    for (let i_1 = 0; i_1 < craft_res.impact.length; i_1++) {
                        impact_sum += craft_res.impact[i_1].impact;
                    }
                    if (impact_sum > 0) {
                        craft_impact.total_impact = Math.round((impact_sum / craft_res.impact.length * 100)) / 100;
                    }
                }
            }
            else {
                console_log("> Nulla nello zaino o opzione == false (opzione: " + zaino + ")");
            }
            //craft_impact.used_array
            for (let i_2 = 0; i_2 < craft_res.impact.length; i_2++) {
                if (craft_res.impact[i_2].craftable == 0) {
                    craft_impact.base.push(craft_res.impact[i_2]);
                }
                else {
                    craft_impact.crafted.push(craft_res.impact[i_2]);
                }
            }
            console_log("> tutti gli oggetti, sono: " + allItemsArray.length);

            for (let i_3 = 0; i_3 < toCraft_array.length; i_3++) {
                let tmp_rootItem = getItemFrom(toCraft_array[i_3].id, true);
                tmp_rootItem.levels_deep = 0;
                tmp_rootItem.total_quantity = toCraft_array[i_3].quantity;
                allItemsArray.unshift(tmp_rootItem);
            }
            // Creo root_items_parsed_array: Rimette assieme la lista root_items, sommando le quantità
            let root_items_parsed_array = [];
            let tmp_roots_ids = [];
            for (let k = 0; k < root_items.items.length; k++) {
                if (tmp_roots_ids.indexOf(root_items.items[k].id) >= 0) {
                    for (let i_4 = 0; i_4 < root_items_parsed_array.length; i_4++) {
                        if (root_items_parsed_array[i_4].id == root_items.items[k].id) {
                            root_items_parsed_array[i_4].quantity++;
                            break;
                        }
                    }
                }
                else {
                    tmp_roots_ids.push(root_items.items[k].id);
                    root_items_parsed_array.push({ id: root_items.items[k].id, name: root_items.items[k].name, quantity: 1 });
                }
            }
            // Conto delle linee craft necessarie, divisione in (to_return_craft_array e to_return_base_array) ed "idea" per stima dell'efficenza della linea
            let serious_crafts_count = 0;
            let efficency_counter = {};
            efficency_counter.perUno = 0;
            efficency_counter.perDue = 0;
            efficency_counter.perTre = 0;
            let to_return_craft_array = [];
            let to_return_missing_array = [];
            for (let i_5 = 0; i_5 < allItemsArray.length; i_5++) {
                if (allItemsArray[i_5].levels_deep == -1) {
                    allItemsArray[i_5].levels_deep += craft_res.max_levels_deep;
                }
                if (allItemsArray[i_5].craftable == 1) {
                    to_return_craft_array.push(allItemsArray[i_5]);
                    // switch (allItemsArray[i].total_quantity % 3) {
                    //     case (1): {
                    //         efficency_counter.perUno++;
                    //     }
                    //     case (2): {
                    //         efficency_counter.perDue++;
                    //         break;
                    //     }
                    //     default: {
                    //         efficency_counter.perTre++;
                    //         break;
                    //     }
                    // }
                    //conteggio delle linee (serio)
                    if (allItemsArray[i_5].total_quantity <= 3) {
                        serious_crafts_count++;
                    }
                    else {
                        serious_crafts_count += Math.floor(allItemsArray[i_5].total_quantity / 3);
                        if ((allItemsArray[i_5].total_quantity % 3) != 0) {
                            serious_crafts_count++;
                        }
                    }
                }
                else {
                    to_return_missing_array.push(allItemsArray[i_5]);
                }
            }
            // Ordinamento: Sort per levels_deep
            to_return_craft_array = to_return_craft_array.sort(sort_ForLevelsDeep);
            to_return_missing_array = to_return_missing_array.sort(sort_ForLevelsDeep);
            return getCraftList_res({
                curr_index: 0,
                needed_crafts: serious_crafts_count,
                //target_pc: target.target_pc,
                total_pc: craft_res.total_craft_point,
                total_cost: craft_res.total_cost,
                target_gain: Math.floor(target.target_gain),
                root_item: root_items_parsed_array,
                already_avaible_root_item: already_avaible,
                craftable_array: to_return_craft_array,
                missingItems_array: to_return_missing_array,
                impact: craft_impact
                //efficency: (100 / Math.abs(1 - (zero_efficency / serious_crafts_count)))
            });
        });
    });
}

// items_array -> array di tutti gli oggetti nel craft, 
// ids_array -> array con gli id degli oggetti nel craft (per accesso piu rapido)
// currDeep_array -> array degli oggetti di questo livello dei nodi
// levels_deep -> indice di livello per i nodi
function process_recoursiveCraft(items_array, ids_array, currDeep_array, impact_array, total_info, levels_deep, zaino, preserve_zaino) {
    let tmp_item;
    let tmp_has;
    let tmp_impact = 0;
    let tmp_impact_bool;
    let tmp_impact_remaining;

    let nextDeep_array = [];

    for (let i = 0; i < currDeep_array.length; i++) {
        tmp_item = getItemFrom(currDeep_array[i]); // semplicemente scarta un po di info dalla lista di Item
        if (tmp_item != null) {

            tmp_has = false;
            if (ids_array.indexOf(tmp_item.id) < 0) { //nuovo oggetto in lista
                if (zaino) {// controllo sullo zaino
                    if (preserve_zaino == false || (preserve_zaino == true && tmp_item.craftable == 0)) {
                        for (let zaino_index = 0; zaino_index < zaino.length; zaino_index++) {
                            if (zaino[zaino_index].item_id == tmp_item.id) {
                                tmp_impact_bool = true;
                                tmp_impact_remaining = zaino[zaino_index].item_quantity;
                                for (let impact_index = 0; impact_index < impact_array.length; impact_index++) {
                                    if (impact_array[impact_index].name == tmp_item.name) {
                                        tmp_impact_bool = false;

                                        if (impact_array[impact_index].remaning_quantity >= tmp_item.total_quantity) { // sul controllo...
                                            impact_array[impact_index].used_quantity += tmp_item.total_quantity;
                                            impact_array[impact_index].remaning_quantity -= tmp_item.total_quantity;
                                        } else {
                                            impact_array[impact_index].used_quantity += impact_array[impact_index].remaning_quantity;
                                            impact_array[impact_index].remaning_quantity = 0;
                                        }

                                        tmp_impact_remaining = impact_array[impact_index].remaning_quantity;
                                        impact_array[impact_index].impact = (Math.round((impact_array[impact_index].used_quantity * 100) / zaino[zaino_index].item_quantity));

                                        break;
                                    }
                                }

                                // Nuovo oggetto in impact_array
                                if (tmp_impact_bool == true) {
                                    tmp_impact = Math.round((tmp_item.total_quantity * 100) / zaino[zaino_index].item_quantity);
                                    impact_array.push({
                                        id: tmp_item.id,
                                        name: tmp_item.name,
                                        craftable: tmp_item.craftable,
                                        rarity: tmp_item.rarity,
                                        impact: tmp_impact,
                                        used_quantity: tmp_item.total_quantity,
                                        remaning_quantity: (zaino[zaino_index].item_quantity - tmp_item.total_quantity) < 0 ? 0 : (zaino[zaino_index].item_quantity - tmp_item.total_quantity)
                                    });
                                }

                                if (tmp_impact_remaining >= tmp_item.total_quantity) {
                                    //zaino[zaino_index].item_quantity -= tmp_item.total_quantity;
                                    tmp_has = true;
                                } else {
                                    //zaino[zaino_index].item_quantity = 0;
                                    tmp_item.total_quantity = (tmp_item.total_quantity - tmp_impact_remaining);
                                }
                                //console_log("> Quantità : "+tmp_item.total_quantity);

                                break;
                            }
                        }
                    }
                }

                //console_log("> È nello zaino: "+tmp_has);
                if (!tmp_has) {
                    ids_array.push(tmp_item.id);
                    if (tmp_item.craftable == 0 || tmp_item.isSterile == 0) {
                        tmp_item.levels_deep = levels_deep;
                    } else {
                        tmp_item.levels_deep = -1;
                    }
                    items_array.push(tmp_item);
                }
            } else { // aggiorno quantità e profondità livello
                for (let j = 0; j < items_array.length; j++) {
                    if (items_array[j].id == tmp_item.id) {
                        items_array[j].total_quantity++;
                        if (tmp_item.craftable == 0 || items_array[j].isSterile == 0) {
                            items_array[j].levels_deep = levels_deep;
                        } else {
                            items_array[j].levels_deep = -1;
                        }
                        break;
                    }
                }
            }
            //Aggiorno nextDeep_array con i necessari per tmp_item.craftable
            if (!tmp_has && tmp_item.craftable == 1) {
                if (typeof tmp_item.childs_array != "undefined" && tmp_item.childs_array.length > 0) {
                    for (let j = 0; j < tmp_item.childs_array.length; j++) {
                        nextDeep_array.push(tmp_item.childs_array[j]);
                    }
                }
                total_info.gained_pc += parseInt(tmp_item.craft_pnt);
                total_info.total_cost += parseInt(tmp_item.craft_cost);
            }
        }
    }

    if (nextDeep_array.length > 0) { // se ci sono altri figli, riparto.
        return process_recoursiveCraft(items_array, ids_array, nextDeep_array, impact_array, total_info, (levels_deep + 1), zaino, preserve_zaino);
    } else {
        return ({
            max_levels_deep: levels_deep,
            total_craft_point: total_info.gained_pc,
            total_cost: total_info.total_cost,
            impact: impact_array
        }); // esco, ritornando il livello piu profondo ed i dati accessori
    }
}

function getItemFrom(itemID) {
    // TODO l'eguaglianza non è stretta. Bisogna accertarsi che tutti gli ID siano numeri, sempre.
    let item_fullInfo = module.exports.getAllItemsArray().find(el => el.id == itemID); //prima da "module.exports.", ma credo sia uguale...
    let item_craftInfos = infoFromRarity(item_fullInfo.rarity);
    return {
        id: item_fullInfo.id,
        name: item_fullInfo.name,
        total_quantity: 1,
        craft_pnt: item_craftInfos.craft_pnt,
        craft_cost: item_craftInfos.craft_cost,
        base_value: (item_fullInfo.market_medium_value > 0 ? item_fullInfo.market_medium_value : item_fullInfo.base_value),
        rarity: item_fullInfo.rarity,
        craftable: item_fullInfo.craftable,
        childs_array: item_fullInfo.childIds_array,
        isSterile: item_fullInfo.isSterile,
        levels_deep: 1
    };
}

function infoFromRarity(rarity) {
    switch (rarity) {
        case "NC": {
            return ({ craft_cost: 2000, craft_pnt: 0 });
        } case "R": {
            return ({ craft_cost: 3000, craft_pnt: 1 });
        } case "UR": {
            return ({ craft_cost: 5000, craft_pnt: 2 });
        } case "L": {
            return ({ craft_cost: 7500, craft_pnt: 3 });
        } case "E": {
            return ({ craft_cost: 10000, craft_pnt: 5 });
        } case "UE": {
            return ({ craft_cost: 100000, craft_pnt: 25 });
        } case "U": {
            return ({ craft_cost: 250000, craft_pnt: 35 });
        } case "X": {
            return ({ craft_cost: 1000000, craft_pnt: 50 });
        } default: {
            return ({ craft_cost: 0, craft_pnt: 0 });
        }
    }

}

// #UTILITA'

function sort_ForLevelsDeep(a, b) {
    if (b.levels_deep != a.levels_deep) {
        return (b.levels_deep - a.levels_deep);
    } else {
        return (b.total_quantity < a.total_quantity ? -1 : 1);
    }
}

function shuffleArray(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function parsePrice(price) {
    let final_text = "";
    if (price > 1000) {
        if ((price / 1000000) > 1) {
            final_text += "*" + (price / 1000000).toFixed(2) + "*M §";
        } else {
            final_text += "*" + (price / 1000).toFixed(2) + "*K §";
        }
    } else {
        final_text += "*" + price.toLocaleString() + "* §";
    }
    return final_text;
}
