const assert = require("assert");
const { stub } = require('sinon');

const itemsManager = require("../controllers/ItemsManager.js");
const utilities = require("../controllers/Utilities.js");
const craftable_array = require('./examples/LootItems_7.6.20.json');
const { Oggetto, Zaino } = require("../controllers/ItemsManager.js");

describe("verifico la creazione di istanze Zaino", function () {
    beforeEach(function () {
        utilities.setVerbosity(0);
        // mocking della funzione getAllItemsArray al fine di simulare un array predefinito
        getAllItemsArrayMocked = stub(itemsManager, 'getAllItemsArray').returns(itemsManager.prepareAllItems(craftable_array));
    });

    afterEach(function () {
        getAllItemsArrayMocked.restore();
        utilities.setVerbosity(1);
    });

    it('dovrebbe creare oggetti Zaino correttamente popolati e gestire i metodi contiene e rimuovi', function () {
        const oggetto1 = new Oggetto(33);
        const oggetto2 = new Oggetto(12,2);
        const oggetto3 = new Oggetto(25,7);
        let zaino = new Zaino([oggetto1, oggetto2, oggetto3, new Oggetto(221,1)]);
        assert.strictEqual(zaino.contenuto.length, 4);
        assert.strictEqual(zaino.contiene(12), true);
        assert.strictEqual(zaino.contiene(34), false);
        zaino.rimuovi(12);
        assert.strictEqual(zaino.contiene(12), true);
        zaino.rimuovi(12);
        assert.strictEqual(zaino.contiene(12), false);
        assert.throws(()=>{
            zaino.rimuovi(12); // non dovrebbero essercene più
        }, Error);
    });
});