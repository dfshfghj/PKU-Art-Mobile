function defineValue(target, key, value) {
    Object.defineProperty(target, key, {
        value,
        configurable: true,
        writable: true,
    });
}

if (typeof Uint8Array.prototype.toHex !== 'function') {
    defineValue(Uint8Array.prototype, 'toHex', function toHex() {
        let result = '';
        for (let index = 0; index < this.length; index += 1) {
            result += this[index].toString(16).padStart(2, '0');
        }
        return result;
    });
}

if (typeof URL.parse !== 'function') {
    defineValue(URL, 'parse', function parse(url, base) {
        try {
            return new URL(url, base);
        } catch (_error) {
            return null;
        }
    });
}

if (typeof Response !== 'undefined' && typeof Response.prototype.bytes !== 'function') {
    defineValue(Response.prototype, 'bytes', async function bytes() {
        return new Uint8Array(await this.arrayBuffer());
    });
}

if (typeof Map.prototype.getOrInsertComputed !== 'function') {
    defineValue(Map.prototype, 'getOrInsertComputed', function getOrInsertComputed(key, callbackFn) {
        if (!this.has(key)) {
            this.set(key, callbackFn(key));
        }
        return this.get(key);
    });
}

if (typeof Promise.withResolvers !== 'function') {
    defineValue(Promise, 'withResolvers', function withResolvers() {
        let resolve;
        let reject;
        const promise = new Promise((promiseResolve, promiseReject) => {
            resolve = promiseResolve;
            reject = promiseReject;
        });
        return { promise, resolve, reject };
    });
}

if (typeof Promise.try !== 'function') {
    defineValue(Promise, 'try', function promiseTry(callbackFn, ...args) {
        return new Promise((resolve) => resolve())
            .then(() => callbackFn(...args));
    });
}

if (typeof Math.sumPrecise !== 'function') {
    defineValue(Math, 'sumPrecise', function sumPrecise(numbers) {
        return Array.from(numbers).reduce((sum, value) => sum + value, 0);
    });
}
