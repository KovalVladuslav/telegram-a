// const { Mutex } = require('async-mutex');

// const mutex = new Mutex();

// const closeError = new Error('WebSocket was closed');
// const CONNECTION_TIMEOUT = 30000;
// const MAX_TIMEOUT = 30000;

// class PromisedWebSockets {
//     constructor(disconnectedCallback) {
//         /* CONTEST
//         this.isBrowser = typeof process === 'undefined' ||
//             process.type === 'renderer' ||
//             process.browser === true ||
//             process.__nwjs

//          */
//         this.client = undefined;
//         this.closed = true;
//         this.disconnectedCallback = disconnectedCallback;
//         this.timeout = CONNECTION_TIMEOUT;
//     }

//     async readExactly(number) {
//         let readData = Buffer.alloc(0);
//         // eslint-disable-next-line no-constant-condition
//         while (true) {
//             const thisTime = await this.read(number);
//             readData = Buffer.concat([readData, thisTime]);
//             number -= thisTime.length;
//             if (!number) {
//                 return readData;
//             }
//         }
//     }

//     async read(number) {
//         if (this.closed) {
//             throw closeError;
//         }
//         await this.canRead;
//         if (this.closed) {
//             throw closeError;
//         }
//         const toReturn = this.stream.slice(0, number);
//         this.stream = this.stream.slice(number);
//         if (this.stream.length === 0) {
//             this.canRead = new Promise((resolve) => {
//                 this.resolveRead = resolve;
//             });
//         }

//         return toReturn;
//     }

//     async readAll() {
//         if (this.closed || !await this.canRead) {
//             throw closeError;
//         }
//         const toReturn = this.stream;
//         this.stream = Buffer.alloc(0);
//         this.canRead = new Promise((resolve) => {
//             this.resolveRead = resolve;
//         });

//         return toReturn;
//     }

//     getWebSocketLink(ip, port, testServers, isPremium) {
//         if (port === 443) {
//             return `wss://${ip}:${port}/apiws${testServers ? '_test' : ''}${isPremium ? '_premium' : ''}`;
//         } else {
//             return `ws://${ip}:${port}/apiws${testServers ? '_test' : ''}${isPremium ? '_premium' : ''}`;
//         }
//     }

//     connect(port, ip, testServers = false, isPremium = false) {
//         this.stream = Buffer.alloc(0);
//         this.canRead = new Promise((resolve) => {
//             this.resolveRead = resolve;
//         });
//         this.closed = false;
//         this.website = this.getWebSocketLink(ip, port, testServers, isPremium);
//         this.client = new WebSocket(this.website, 'binary');
//         return new Promise((resolve, reject) => {
//             let hasResolved = false;
//             let timeout;
//             this.client.onopen = () => {
//                 this.receive();
//                 resolve(this);
//                 hasResolved = true;
//                 if (timeout) clearTimeout(timeout);
//             };
//             this.client.onerror = (error) => {
//                 // eslint-disable-next-line no-console
//                 console.error('WebSocket error', error);
//                 reject(error);
//                 hasResolved = true;
//                 if (timeout) clearTimeout(timeout);
//             };
//             this.client.onclose = (event) => {
//                 const { code, reason, wasClean } = event;
//                 if (code !== 1000) {
//                     // eslint-disable-next-line no-console
//                     console.error(`Socket ${ip} closed. Code: ${code}, reason: ${reason}, was clean: ${wasClean}`);
//                 }

//                 this.resolveRead(false);
//                 this.closed = true;
//                 if (this.disconnectedCallback) {
//                     this.disconnectedCallback();
//                 }
//                 hasResolved = true;
//                 if (timeout) clearTimeout(timeout);
//             };

//             timeout = setTimeout(() => {
//                 if (hasResolved) return;

//                 reject(new Error('WebSocket connection timeout'));
//                 this.resolveRead(false);
//                 this.closed = true;
//                 if (this.disconnectedCallback) {
//                     this.disconnectedCallback();
//                 }
//                 this.client.close();
//                 this.timeout *= 2;
//                 this.timeout = Math.min(this.timeout, MAX_TIMEOUT);
//                 timeout = undefined;
//             }, this.timeout);

//             // CONTEST
//             // Seems to not be working, at least in a web worker
//             // eslint-disable-next-line no-restricted-globals
//             self.addEventListener('offline', async () => {
//                 await this.close();
//                 this.resolveRead(false);
//             });
//         });
//     }

//     write(data) {
//         if (this.closed) {
//             throw closeError;
//         }
//         this.client.send(data);
//     }

//     async close() {
//         await this.client.close();
//         this.closed = true;
//     }

//     receive() {
//         this.client.onmessage = async (message) => {
//             await mutex.runExclusive(async () => {
//                 const data = message.data instanceof ArrayBuffer
//                     ? Buffer.from(message.data)
//                     : Buffer.from(await new Response(message.data).arrayBuffer());
//                 this.stream = Buffer.concat([this.stream, data]);
//                 this.resolveRead(true);
//             });
//         };
//     }
// }

// module.exports = PromisedWebSockets;

import Mutex from 'async-mutex';

const mutex = new Mutex();
const closeError = new Error('WebSocket was closed');
const CONNECTION_TIMEOUT = 3000;
const MAX_TIMEOUT = 30000;
const RECONNECT_INTERVAL = 5000; // Початковий інтервал для повторного підключення

class PromisedWebSockets {
    constructor(disconnectedCallback) {
        this.client = undefined;
        this.closed = true;
        this.disconnectedCallback = disconnectedCallback;
        this.timeout = CONNECTION_TIMEOUT;
        this.reconnectAttempts = 0; // Лічильник для кількості повторних спроб
    }

    async connect(port, ip, testServers = false, isPremium = false) {
        this.stream = Buffer.alloc(0);
        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve;
        });
        this.closed = false;
        this.website = this.getWebSocketLink(ip, port, testServers, isPremium);
        this.client = new WebSocket(this.website, 'binary');

        return new Promise((resolve, reject) => {
            let hasResolved = false;
            let timeout;

            this.client.onopen = () => {
                this.receive();
                resolve(this);
                hasResolved = true;
                this.reconnectAttempts = 0; // Скидаємо лічильник після успішного підключення
                if (timeout) clearTimeout(timeout);
            };

            this.client.onerror = (error) => {
                console.error('WebSocket error', error);
                reject(error);
                hasResolved = true;
                if (timeout) clearTimeout(timeout);
            };

            this.client.onclose = (event) => {
                const { code, reason, wasClean } = event;
                console.error(`Socket ${ip} closed. Code: ${code}, reason: ${reason}, was clean: ${wasClean}`);

                this.resolveRead(false);
                this.closed = true;

                // Перевіряємо, чи ми можемо повторно підключитися
                if (this.shouldReconnect(code)) {
                    this.reconnect(port, ip, testServers, isPremium);
                } else if (this.disconnectedCallback) {
                    this.disconnectedCallback();
                }

                hasResolved = true;
                if (timeout) clearTimeout(timeout);
            };

            timeout = setTimeout(() => {
                if (hasResolved) return;

                reject(new Error('WebSocket connection timeout'));
                this.resolveRead(false);
                this.closed = true;
                if (this.disconnectedCallback) {
                    this.disconnectedCallback();
                }
                this.client.close();
                this.timeout = Math.min(this.timeout * 2, MAX_TIMEOUT);
                timeout = undefined;
            }, this.timeout);
        });
    }

    shouldReconnect(code) {
        // Підключатися повторно лише за певних умов (напр., код 1006)
        return code === 1006 || code === 1011; // 1011 - код внутрішньої помилки
    }

    async reconnect(port, ip, testServers, isPremium) {
        this.reconnectAttempts += 1;
        const delay = Math.min(RECONNECT_INTERVAL * this.reconnectAttempts, MAX_TIMEOUT);
        
        console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);
        
        setTimeout(async () => {
            try {
                await this.connect(port, ip, testServers, isPremium);
                console.log('Reconnected successfully.');
            } catch (error) {
                console.error('Reconnect failed:', error);
                this.reconnect(port, ip, testServers, isPremium);
            }
        }, delay);
    }

    async readExactly(number) {
        let readData = Buffer.alloc(0);
        while (true) {
            const thisTime = await this.read(number);
            readData = Buffer.concat([readData, thisTime]);
            number -= thisTime.length;
            if (!number) {
                return readData;
            }
        }
    }

    async read(number) {
        if (this.closed) {
            throw closeError;
        }
        await this.canRead;
        if (this.closed) {
            throw closeError;
        }
        const toReturn = this.stream.slice(0, number);
        this.stream = this.stream.slice(number);
        if (this.stream.length === 0) {
            this.canRead = new Promise((resolve) => {
                this.resolveRead = resolve;
            });
        }

        return toReturn;
    }

    async readAll() {
        if (this.closed || !await this.canRead) {
            throw closeError;
        }
        const toReturn = this.stream;
        this.stream = Buffer.alloc(0);
        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve;
        });

        return toReturn;
    }

    getWebSocketLink(ip, port, testServers, isPremium) {
        return port === 443
            ? `wss://${ip}:${port}/apiws${testServers ? '_test' : ''}${isPremium ? '_premium' : ''}`
            : `ws://${ip}:${port}/apiws${testServers ? '_test' : ''}${isPremium ? '_premium' : ''}`;
    }

    write(data) {
        if (this.closed) {
            throw closeError;
        }
        this.client.send(data);
    }

    async close() {
        await this.client.close();
        this.closed = true;
    }

    receive() {
        this.client.onmessage = async (message) => {
            await mutex.runExclusive(async () => {
                const data = message.data instanceof ArrayBuffer
                    ? Buffer.from(message.data)
                    : Buffer.from(await new Response(message.data).arrayBuffer());
                this.stream = Buffer.concat([this.stream, data]);
                this.resolveRead(true);
            });
        };
    }
}

module.exports = PromisedWebSockets;
