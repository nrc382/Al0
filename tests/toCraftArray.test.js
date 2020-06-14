const assert = require("assert");
const { stub } = require('sinon');

const itemsManager = require("../controllers/ItemsManager.js");
const utilities = require("../controllers/Utilities.js");
const toCraft_array_esempio = require('./examples/LineaPostazione.json');
const craftable_array = require('./examples/LootItems_7.6.20.json');
const risultato_atteso_1 = require('./examples/risultato_atteso_1.json');

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

describe("verifico getCraftList", function () {

    beforeEach(function () {
        utilities.setVerbosity(0);
        // mocking della funzione loadZainoOf per questi test. 
        // In questo modo restituirà una Promise(false) ogni volta che viene chiamata.
        loadZainoOfMocked = stub(itemsManager, 'loadZainoOf').returns(false);

        // mocking della funzione getAllItemsArray al fine di simulare un array predefinito
        getAllItemsArrayMocked = stub(itemsManager, 'getAllItemsArray').returns(craftable_array);
    });

    afterEach(function () {

        loadZainoOfMocked.restore();
        getAllItemsArrayMocked.restore();
        utilities.setVerbosity(1);
    });

    it('getCraftList dovrebbe restituire array vuoti e variabili azzerate quando toCraft_array è vuoto, l\'id argonauta = 0 e check_zaino = false',
        async function () {
            const toCraft_array = [];
            const forArgonaut_id = 0;
            const check_zaino = false;
            const preserve_zaino = false;

            const result = await itemsManager.getCraftList(toCraft_array, forArgonaut_id, check_zaino, preserve_zaino);
            verifica_risultato_vuoto(result);

        });

    it('getCraftList dovrebbe restituire array vuoti e variabili azzerate quando toCraft_array è vuoto, l\'id argonauta = null e check_zaino = false',
        async function () {
            const toCraft_array = [];
            const forArgonaut_id = null;
            const check_zaino = false;

            const result = await itemsManager.getCraftList(toCraft_array, forArgonaut_id, check_zaino);
            verifica_risultato_vuoto(result);

        });

    it('getCraftList dovrebbe restituire array vuoti e variabili azzerate quando toCraft_array è vuoto, l\'id argonauta = undefined e check_zaino = false',
        async function () {
            const toCraft_array = [];
            let forArgonaut_id;
            const check_zaino = false;

            const result = await itemsManager.getCraftList(toCraft_array, forArgonaut_id, check_zaino);
            verifica_risultato_vuoto(result);

        });

    it('getCraftList dovrebbe restituire array vuoti e variabili azzerate quando toCraft_array è null, l\'id argonauta = 0 e check_zaino = false',
        async function () {
            const toCraft_array = null;
            const forArgonaut_id = 0;
            const check_zaino = false;

            const result = await itemsManager.getCraftList(toCraft_array, forArgonaut_id, check_zaino);
            verifica_risultato_vuoto(result);

        });

    it('getCraftList dovrebbe restituire array vuoti e variabili azzerate quando toCraft_array è vuoto, l\'id argonauta = 0 e check_zaino = null',
        async function () {
            const toCraft_array = [];
            const forArgonaut_id = 0;
            const check_zaino = null;

            const result = await itemsManager.getCraftList(toCraft_array, forArgonaut_id, check_zaino);
            verifica_risultato_vuoto(result);

        });

    it('getCraftList dovrebbe restituire array vuoti e variabili azzerate quando toCraft_array è vuoto, l\'id argonauta = 0 e check_zaino = undefined',
        async function () {
            const toCraft_array = [];
            const forArgonaut_id = 0;
            let check_zaino;

            const result = await itemsManager.getCraftList(toCraft_array, forArgonaut_id, check_zaino);
            verifica_risultato_vuoto(result);

        });

    it('getCraftList dovrebbe restituire array vuoti e variabili azzerate quando toCraft_array è vuoto, l\'id argonauta = -1 e check_zaino = false',
        async function () {
            const toCraft_array = [];
            const forArgonaut_id = -1;
            const check_zaino = false;

            const result = await itemsManager.getCraftList(toCraft_array, forArgonaut_id, check_zaino);
            verifica_risultato_vuoto(result);

        });

    it('getCraftList dovrebbe restituire array vuoti e variabili azzerate quando toCraft_array è vuoto, l\'id argonauta = 0 e check_zaino = true',
        async function () {
            const toCraft_array = [];
            const forArgonaut_id = 0;
            const check_zaino = true;

            const result = await itemsManager.getCraftList(toCraft_array, forArgonaut_id, check_zaino);
            verifica_risultato_vuoto(result);

        });

    it('getCraftList dovrebbe restituire array vuoti e variabili azzerate quando toCraft_array è vuoto, l\'id argonauta = 0 e check_zaino = false',
        async function () {
            const toCraft_array = [];
            const forArgonaut_id = -1;
            const check_zaino = true;

            const result = await itemsManager.getCraftList(toCraft_array, forArgonaut_id, check_zaino);
            verifica_risultato_vuoto(result);

        });

    // it('getCraftList dovrebbe restituire un oggetto come da esempio quando toCraft_array è popolato',
    //     async function () {
    //         const toCraft_array = toCraft_array_esempio;
    //         const forArgonaut_id = 0;
    //         const check_zaino = false;
    //         const result = await itemsManager.getCraftList(toCraft_array, forArgonaut_id, check_zaino);
    //         assert.deepEqual(result, risultato_atteso_1);
    //     });
});
