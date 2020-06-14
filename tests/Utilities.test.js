const assert = require("assert");

const { isNull, isNully, setVerbosity } = require("../controllers/Utilities");

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

    it('isNull dovrebbe restituire false se la variabile è undefined, un numero, un oggetto vuoto, un array vuoto, una stringa', function () {
        const tests = [undefined, 1, -1, 0, -1.0, {}, [], "", "null", "undefined", "-1", "0"];
        for (const verifica in tests) {
            assert.strictEqual(isNull(tests[verifica]), false);
        }
    });
});

describe("verifico funzioni di utilità presenti in Utilities: isNully", function () {
    beforeEach(function () {
        setVerbosity(0);
    });

    afterEach(function () {
        setVerbosity(1);
    });

    it('isNully dovrebbe restituire true se la variabile è undefined o null', function () {
        const tests = [undefined, null];
        for (const verifica in tests) {
            assert.strictEqual(isNully(tests[verifica]), true);
        }
    });

    it('isNully dovrebbe restituire false se la variabile è un numero, un oggetto vuoto, un array vuoto, una stringa', function () {
        const tests = [1, -1, 0, -1.0, {}, [], "", "null", "undefined", "-1", "0"];
        for (const verifica in tests) {
            assert.strictEqual(isNully(tests[verifica]), false);
        }
    });
});
