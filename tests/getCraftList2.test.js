const assert = require("assert");
const { stub } = require('sinon');

const model = require('../controllers/models/argo_model');
const itemsManager = require("../controllers/ItemsManager.js");
const utilities = require("../controllers/Utilities.js");
const craftable_array = require('./examples/LootItems_7.6.20.json');
const { Oggetto, Zaino } = require("../controllers/ItemsManager.js");


describe("verifico getCraftList2 con zaino pieno", function () {
    const zainoTest = [{
        item_id: 53,  // acciaio
        user_id: 0,
        item_quantity: 100
    }, {
        item_id: 394, // placca d'acciaio
        user_id: 0,
        item_quantity: 100
    }, {
        item_id: 347, // polvere fatata
        user_id: 0,
        item_quantity: 100
    }];

    beforeEach(function () {
        utilities.setVerbosity(0);
        // mocking della funzione loadZainoOf per questi test. 
        // In questo modo restituirà una Promise(false) ogni volta che viene chiamata.
        loadZainoOfMocked = stub(itemsManager, 'loadZainoOf').returns(zainoTest);

        // mocking della funzione getAllItemsArray al fine di simulare un array predefinito
        getAllItemsArrayMocked = stub(itemsManager, 'getAllItemsArray').returns(craftable_array);
    });

    afterEach(function () {
        loadZainoOfMocked.restore();
        getAllItemsArrayMocked.restore();
        utilities.setVerbosity(1);
    });

    it('getCraftList2 dovrebbe restituire un oggetto singolo, quando toCraft_array contiene una sola richiesta',
        async function () {
            const toCraft_array = [
                {
                    "id": 397, // acciaio temprato
                    "quantity": 1
                }];

            const forArgonaut_id = 0;
            const check_zaino = true;

            const index_callback_function = 2; // numero dell'argomento passato alla funzione query che contiene i callback da eseguire al termine dell'elaborazione
            const err = false;
            const queryMocked = stub(model.argo_pool, 'query').callsArgWith(index_callback_function, err, zainoTest);

            let zaino = new itemsManager.Zaino();
            zaino.fromQuery(await itemsManager.loadZainoOf(forArgonaut_id, check_zaino));

            const listaOggetti = toCraft_array.map((el) => new Oggetto(el.id, el.quantity));
            const result = itemsManager.getCraftList2(listaOggetti, zaino);

            assert.strictEqual(result.zaino.contenuto.length, 3);
            assert.strictEqual(result.zaino.contenuto[0].quantity, 99);
            assert.strictEqual(result.zaino.contenuto[1].quantity, 99);
            assert.strictEqual(result.zaino.contenuto[2].quantity, 99);
            assert.strictEqual(result.daCraftare.length, 1);
            assert.strictEqual(result.dalloZaino.length, 0);
            assert.strictEqual(result.daComprare.length, 0);
            queryMocked.restore();
        });

    it('getCraftList2 dovrebbe restituire tre oggetti, quando toCraft_array contiene una solo oggetto con quantità pari a 3',
        async function () {
            const toCraft_array = [
                {
                    "id": 397, // acciaio temprato
                    "quantity": 3
                }];

            const forArgonaut_id = 0;
            const check_zaino = true;

            const index_callback_function = 2; // numero dell'argomento passato alla funzione query che contiene i callback da eseguire al termine dell'elaborazione
            const err = false;
            const queryMocked = stub(model.argo_pool, 'query').callsArgWith(index_callback_function, err, zainoTest);

            let zaino = new itemsManager.Zaino();
            zaino.fromQuery(await itemsManager.loadZainoOf(forArgonaut_id, check_zaino));

            const listaOggetti = toCraft_array.map((el) => new Oggetto(el.id, el.quantity));
            const result = itemsManager.getCraftList2(listaOggetti, zaino);

            assert.strictEqual(result.zaino.contenuto.length, 3);
            assert.strictEqual(result.zaino.contenuto[0].quantity, 97);
            assert.strictEqual(result.zaino.contenuto[1].quantity, 97);
            assert.strictEqual(result.zaino.contenuto[2].quantity, 97);
            assert.strictEqual(result.daCraftare.length, 3);
            assert.strictEqual(result.dalloZaino.length, 0);
            assert.strictEqual(result.daComprare.length, 0);
            queryMocked.restore();
        });

    it('getCraftList2 non dovrebbe modificare lo zaino quando la richiesta ha quantità pari a 0',
        async function () {
            const toCraft_array = [
                {
                    "id": 397, // acciaio temprato
                    "quantity": 0
                }];

            const forArgonaut_id = 0;
            const check_zaino = true;

            const index_callback_function = 2; // numero dell'argomento passato alla funzione query che contiene i callback da eseguire al termine dell'elaborazione
            const err = false;
            const queryMocked = stub(model.argo_pool, 'query').callsArgWith(index_callback_function, err, zainoTest);

            let zaino = new itemsManager.Zaino();
            zaino.fromQuery(await itemsManager.loadZainoOf(forArgonaut_id, check_zaino));

            const listaOggetti = toCraft_array.map((el) => new Oggetto(el.id, el.quantity));
            const result = itemsManager.getCraftList2(listaOggetti, zaino);

            assert.strictEqual(result.zaino.contenuto.length, 3);
            assert.strictEqual(result.zaino.contenuto[0].quantity, 100);
            assert.strictEqual(result.zaino.contenuto[1].quantity, 100);
            assert.strictEqual(result.zaino.contenuto[2].quantity, 100);
            assert.strictEqual(result.daCraftare.length, 0);
            assert.strictEqual(result.dalloZaino.length, 0);
            assert.strictEqual(result.daComprare.length, 0);
            queryMocked.restore();
        });
});