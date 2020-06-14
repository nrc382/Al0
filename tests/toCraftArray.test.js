const assert = require("assert");
const { stub } = require('sinon');

const model = require('../controllers/models/argo_model');
const itemsManager = require("../controllers/ItemsManager.js");
const utilities = require("../controllers/Utilities.js");
const craftable_array = require('./examples/LootItems_7.6.20.json');
const { loadZainoOf } = require("../controllers/ItemsManager.js");

const verifica_risultato_vuoto = function (result) {
    // se toCraft_array = [] allora posso attendermi questo:

    assert.strictEqual(result.curr_index, 0);
    assert.strictEqual(result.needed_crafts, 0);
    assert.strictEqual(result.total_pc, 0);
    assert.strictEqual(result.total_cost, 0);
    assert.strictEqual(result.target_gain, 0);

    assert.deepEqual(result.root_item, []);
    assert.deepEqual(result.already_avaible_root_item, []);
    assert.deepEqual(result.craftable_array, []);
    assert.deepEqual(result.missingItems_array, []);

    assert.strictEqual(result.impact.total_impact, 0);
    assert.deepEqual(result.impact.base, []);
    assert.deepEqual(result.impact.crafted, []);
}

describe("verifico getItemFromId", function () {
    beforeEach(function () {
        utilities.setVerbosity(0);
        // mocking della funzione getAllItemsArray al fine di simulare un array predefinito
        getAllItemsArrayMocked = stub(itemsManager, 'getAllItemsArray').returns(itemsManager.prepareAllItems(craftable_array));
    });

    afterEach(function () {
        getAllItemsArrayMocked.restore();
        utilities.setVerbosity(1);
    });

    it('getItemFromId dovrebbe restituire un oggetto correttamente popolato', function () {

        const oggetto = itemsManager.getItemFromId(25);

        assert.strictEqual(oggetto.id, 25);
        assert.strictEqual(oggetto.name, "Lastra di Legno");
        assert.strictEqual(oggetto.rarity, "NC");
        assert.strictEqual(oggetto.is_used_for, ":26:28:228:246:318:3");
        assert.strictEqual(oggetto.is_needed_for, ":281:373:385:");

        assert.strictEqual(oggetto.isSterile, 1);
        assert.strictEqual(oggetto.sell_value, 0);
        assert.strictEqual(oggetto.base_value, 1117);
        assert.strictEqual(oggetto.estimate_value, 11750);
        assert.strictEqual(oggetto.market_min_value, 0);
        assert.strictEqual(oggetto.market_max_value, 0);
        assert.strictEqual(oggetto.market_medium_value, 0);
        assert.strictEqual(oggetto.market_recent_sells, 0);
        assert.strictEqual(oggetto.last_market_update, "0");
        assert.strictEqual(oggetto.last_price_update, "");
        assert.strictEqual(oggetto.smuggler_max_value, 0);
        assert.strictEqual(oggetto.smuggler_min_value, 0);
        assert.strictEqual(oggetto.craftable, 1);
        assert.strictEqual(oggetto.craft_pnt, 0);
        assert.strictEqual(oggetto.lucky_guy, "ilFiglioDiDio");
        assert.strictEqual(oggetto.offert_counter, 1);

        // queste proprietà erano calcolate inizialmente in getItemFrom, ora sono in reatà già presenti in allItemsArray ma controlliamo comunque anche qui, per backward compatibility
        assert.deepEqual(oggetto.childIds_array, [281, 373, 385]);
        assert.strictEqual(oggetto.craft_cost, 2000);
        assert.strictEqual(oggetto.craft_pnt, 0);
    });
});

describe("verifico risposte corrette di loadZainoOf in caso di zaino vuoto", function () {
    beforeEach(function () {
        utilities.setVerbosity(0);
        const index_callback_function = 2; // numero dell'argomento passato alla funzione query che contiene i callback da eseguire al termine dell'elaborazione
        const err = false;
        const zaino = [];
        queryMocked = stub(model.argo_pool, 'query').callsArgWith(index_callback_function, err, zaino);
    });

    afterEach(function () {
        utilities.setVerbosity(1);
        queryMocked.restore();
    });

    it("Se chiamato con check_zaino=false deve restituire uno zaino vuoto", async function () {
        const user_id = 0;
        const check_zaino = false;

        const risultato = await loadZainoOf(user_id, check_zaino);

        assert.strictEqual(queryMocked.called, false); // non deve eseguire alcuna query
        assert.notStrictEqual(risultato, false); // il risultato non deve essere false, perchè false significa che c'è stato un errore
        assert.deepEqual(risultato, []); // il risultato deve essere un array vuoto
    });

    it("Se chiamato con check_zaino=true ma l'utente ha lo zaino vuoto deve restituire uno zaino vuoto", async function () {
        const user_id = 0;
        const check_zaino = true;

        const risultato = await loadZainoOf(user_id, check_zaino);

        assert.strictEqual(queryMocked.called, true); // deve eseguire una query
        assert.notStrictEqual(risultato, false); // il risultato non deve essere false, perchè false significa che c'è stato un errore
        assert.deepEqual(risultato, []); // il risultato deve essere un array vuoto
    });
});

describe("verifico risposte corrette di loadZainoOf in caso di zaino pieno", function () {
    beforeEach(function () {
        utilities.setVerbosity(0);
    });

    afterEach(function () {
        utilities.setVerbosity(1);
    });

    it("Se chiamato con check_zaino=true e l'utente ha lo zaino con del contenuto deve restituire quel contenuto", async function () {
        const user_id = 0;
        const check_zaino = true;

        const zaino = [{ id: 1 }];
        const index_callback_function = 2; // numero dell'argomento passato alla funzione query che contiene i callback da eseguire al termine dell'elaborazione
        const err = false;
        const queryMocked = stub(model.argo_pool, 'query').callsArgWith(index_callback_function, err, zaino);

        const risultato = await loadZainoOf(user_id, check_zaino);

        assert.strictEqual(queryMocked.called, true); // deve eseguire una query
        assert.notStrictEqual(risultato, false); // il risultato non deve essere false, perchè false significa che c'è stato un errore
        assert.deepEqual(risultato, zaino); // il risultato deve essere un array vuoto
        queryMocked.restore();
    });
});

describe("verifico getCraftList con zaino vuoto", function () {

    beforeEach(function () {
        utilities.setVerbosity(0);
        // mocking della funzione loadZainoOf per questi test. 
        // In questo modo restituirà una Promise(false) ogni volta che viene chiamata.
        loadZainoOfMocked = stub(itemsManager, 'loadZainoOf').returns([]);

        // mocking della funzione getAllItemsArray al fine di simulare un array predefinito
        getAllItemsArrayMocked = stub(itemsManager, 'getAllItemsArray').returns(craftable_array);
    });

    afterEach(function () {

        loadZainoOfMocked.restore();
        getAllItemsArrayMocked.restore();
        utilities.setVerbosity(1);
    });

    it('getCraftList dovrebbe restituire array vuoti e variabili azzerate per ogni possibile permutazione di valori null, false o array vuoti',
        async function () {
            const toCraft_array = [[], null];
            const forArgonaut_id = [0, -1, null, undefined];
            const check_zaino = [false, true];
            const preserve_zaino = [false, true];
            let result;

            for (const tca_el in toCraft_array) {
                for (const fai_el in forArgonaut_id) {
                    for (const cz_el in check_zaino) {
                        for (const ps_el in preserve_zaino) {
                            result = await itemsManager.getCraftList(toCraft_array[tca_el], forArgonaut_id[fai_el], check_zaino[cz_el], preserve_zaino[ps_el]);
                            verifica_risultato_vuoto(result);
                        }
                    }
                }
            }
        });
});

