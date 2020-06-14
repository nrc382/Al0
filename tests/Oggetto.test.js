const assert = require("assert");
const { stub } = require('sinon');

const itemsManager = require("../controllers/ItemsManager.js");
const utilities = require("../controllers/Utilities.js");
const craftable_array = require('./examples/LootItems_7.6.20.json');
const { Oggetto } = require("../controllers/ItemsManager.js");

describe("verifico la creazione di istanze Oggetto", function () {
    beforeEach(function () {
        utilities.setVerbosity(0);
        // mocking della funzione getAllItemsArray al fine di simulare un array predefinito
        getAllItemsArrayMocked = stub(itemsManager, 'getAllItemsArray').returns(itemsManager.prepareAllItems(craftable_array));
    });

    afterEach(function () {
        getAllItemsArrayMocked.restore();
        utilities.setVerbosity(1);
    });

    it('dovrebbe creare oggetti correttamente popolati', function () {
        const oggetto1 = new Oggetto(33);
        assert.strictEqual(oggetto1.isBase(), true);
        assert.strictEqual(oggetto1.quantity, 1);

        const oggetto2 = new Oggetto(221, 3);
        assert.strictEqual(oggetto2.isBase(), false);
        assert.strictEqual(oggetto2.quantity, 3);

        assert.throws(()=>{
            const oggetto3 = new Oggetto(-1, 3);
        }, Error);
        
        assert.throws(()=>{
            const oggetto4 = new Oggetto(null);
        }, Error);

        assert.throws(()=>{
            const oggetto5 = new Oggetto(null, null);
        }, Error);
        
        const oggetto6 = new Oggetto(12, null);
        assert.strictEqual(oggetto6.quantity, 1);

        const oggetto7 = new Oggetto(12, undefined);
        assert.strictEqual(oggetto7.quantity, 1);

        assert.throws(()=>{
            const oggetto8 = new Oggetto(undefined, 12);
        }, Error);
        
        assert.throws(()=>{
            const oggetto9 = new Oggetto(undefined, undefined);
        }, Error);
    });
});