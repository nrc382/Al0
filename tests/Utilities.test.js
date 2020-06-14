const assert = require("assert");

const { isNull, isNully, setVerbosity } = require("../controllers/Utilities");

// nascondo i console.log
setVerbosity(0);

describe("verifico funzioni di utilità presenti in Utilities: isNull", function () {
    beforeEach(function () {
        setVerbosity(0);   
    });
    
    afterEach(function () {
        setVerbosity(1);   
    });

    it('isNull dovrebbe restituire true se la variabile è null', function () {
        assert.strictEqual(isNull(null), true);
    });

    it('isNull dovrebbe restituire false se la variabile è undefined', function () {
        assert.strictEqual(isNull(undefined), false);
    });

    it('isNull dovrebbe restituire false se la variabile è un numero', function () {
        assert.strictEqual(isNull(1), false);
        assert.strictEqual(isNull(-1), false);
        assert.strictEqual(isNull(0), false);
        assert.strictEqual(isNull(-1.0), false);
    });

    it('isNull dovrebbe restituire false se la variabile è un oggetto vuoto', function () {
        assert.strictEqual(isNull({}), false);
    });

    it('isNull dovrebbe restituire false se la variabile è un array vuoto', function () {
        assert.strictEqual(isNull([]), false);
    });

    it('isNull dovrebbe restituire false se la variabile è una stringa', function () {
        assert.strictEqual(isNull(""), false);
        assert.strictEqual(isNull("null"), false);
        assert.strictEqual(isNull("undefined"), false);
        assert.strictEqual(isNull("-1"), false);
        assert.strictEqual(isNull("0"), false);
    });
});

describe("verifico funzioni di utilità presenti in Utilities: isNully", function () {
    beforeEach(function () {
        setVerbosity(0);   
    });

    afterEach(function () {
        setVerbosity(1);   
    });

    it('isNully dovrebbe restituire true se la variabile è null', function () {
        assert.strictEqual(isNully(null), true);
    });

    it('isNully dovrebbe restituire true se la variabile è undefined', function () {
        assert.strictEqual(isNully(undefined), true);
    });

    it('isNully dovrebbe restituire false se la variabile è un numero', function () {
        assert.strictEqual(isNully(1), false);
        assert.strictEqual(isNully(-1), false);
        assert.strictEqual(isNully(0), false);
        assert.strictEqual(isNully(-1.0), false);
    });

    it('isNully dovrebbe restituire false se la variabile è un oggetto vuoto', function () {
        assert.strictEqual(isNully({}), false);
    });

    it('isNully dovrebbe restituire false se la variabile è un array vuoto', function () {
        assert.strictEqual(isNully([]), false);
    });

    it('isNully dovrebbe restituire false se la variabile è una stringa', function () {
        assert.strictEqual(isNully(""), false);
        assert.strictEqual(isNully("null"), false);
        assert.strictEqual(isNully("undefined"), false);
        assert.strictEqual(isNully("-1"), false);
        assert.strictEqual(isNully("0"), false);
    });
});

setVerbosity(1);