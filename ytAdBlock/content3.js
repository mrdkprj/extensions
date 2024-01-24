(function() {
    // >>>> start of private namespace

    ;

    const scriptletGlobals = new Map([
      [
        "warOrigin",
        "chrome-extension://cjpalhdlnbpafiamejdnhcphjbkeiagm/web_accessible_resources"
      ],
      [
        "warSecret",
        "5kc0qcjr701toa5ms9"
      ]
    ]);

    function matchObjectProperties(propNeedles, ...objs) {
        if ( matchObjectProperties.extractProperties === undefined ) {
            matchObjectProperties.extractProperties = (src, des, props) => {
                for ( const p of props ) {
                    const v = src[p];
                    if ( v === undefined ) { continue; }
                    des[p] = src[p];
                }
            };
        }
        const safe = safeSelf();
        const haystack = {};
        const props = safe.Array_from(propNeedles.keys());
        for ( const obj of objs ) {
            if ( obj instanceof Object === false ) { continue; }
            matchObjectProperties.extractProperties(obj, haystack, props);
        }
        for ( const [ prop, details ] of propNeedles ) {
            let value = haystack[prop];
            if ( value === undefined ) { continue; }
            if ( typeof value !== 'string' ) {
                try { value = JSON.stringify(value); }
                catch(ex) { }
                if ( typeof value !== 'string' ) { continue; }
            }
            if ( safe.testPattern(details, value) ) { continue; }
            return false;
        }
        return true;
    }

    function parsePropertiesToMatch(propsToMatch, implicit = '') {
        const safe = safeSelf();
        const needles = new Map();
        if ( propsToMatch === undefined || propsToMatch === '' ) { return needles; }
        const options = { canNegate: true };
        for ( const needle of propsToMatch.split(/\s+/) ) {
            const [ prop, pattern ] = needle.split(':');
            if ( prop === '' ) { continue; }
            if ( pattern !== undefined ) {
                needles.set(prop, safe.initPattern(pattern, options));
            } else if ( implicit !== '' ) {
                needles.set(implicit, safe.initPattern(prop, options));
            }
        }
        return needles;
    }

    function safeSelf() {
        if ( scriptletGlobals.has('safeSelf') ) {
            return scriptletGlobals.get('safeSelf');
        }
        const self = globalThis;
        const safe = {
            'Array_from': Array.from,
            'Error': self.Error,
            'Function_toStringFn': self.Function.prototype.toString,
            'Function_toString': thisArg => safe.Function_toStringFn.call(thisArg),
            'Math_floor': Math.floor,
            'Math_random': Math.random,
            'Object_defineProperty': Object.defineProperty.bind(Object),
            'RegExp': self.RegExp,
            'RegExp_test': self.RegExp.prototype.test,
            'RegExp_exec': self.RegExp.prototype.exec,
            'Request_clone': self.Request.prototype.clone,
            'XMLHttpRequest': self.XMLHttpRequest,
            'addEventListener': self.EventTarget.prototype.addEventListener,
            'removeEventListener': self.EventTarget.prototype.removeEventListener,
            'fetch': self.fetch,
            'JSON': self.JSON,
            'JSON_parseFn': self.JSON.parse,
            'JSON_stringifyFn': self.JSON.stringify,
            'JSON_parse': (...args) => safe.JSON_parseFn.call(safe.JSON, ...args),
            'JSON_stringify': (...args) => safe.JSON_stringifyFn.call(safe.JSON, ...args),
            'log': console.log.bind(console),
            uboLog(...args) {
                if ( scriptletGlobals.has('canDebug') === false ) { return; }
                if ( args.length === 0 ) { return; }
                if ( `${args[0]}` === '' ) { return; }
                this.log('[uBO]', ...args);
            },
            initPattern(pattern, options = {}) {
                if ( pattern === '' ) {
                    return { matchAll: true };
                }
                const expect = (options.canNegate !== true || pattern.startsWith('!') === false);
                if ( expect === false ) {
                    pattern = pattern.slice(1);
                }
                const match = /^\/(.+)\/([gimsu]*)$/.exec(pattern);
                if ( match !== null ) {
                    return {
                        pattern,
                        re: new this.RegExp(
                            match[1],
                            match[2] || options.flags
                        ),
                        expect,
                    };
                }
                return {
                    pattern,
                    re: new this.RegExp(pattern.replace(
                        /[.*+?^${}()|[\]\\]/g, '\\$&'),
                        options.flags
                    ),
                    expect,
                };
            },
            testPattern(details, haystack) {
                if ( details.matchAll ) { return true; }
                return this.RegExp_test.call(details.re, haystack) === details.expect;
            },
            patternToRegex(pattern, flags = undefined, verbatim = false) {
                if ( pattern === '' ) { return /^/; }
                const match = /^\/(.+)\/([gimsu]*)$/.exec(pattern);
                if ( match === null ) {
                    const reStr = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    return new RegExp(verbatim ? `^${reStr}$` : reStr, flags);
                }
                try {
                    return new RegExp(match[1], match[2] || undefined);
                }
                catch(ex) {
                }
                return /^/;
            },
            getExtraArgs(args, offset = 0) {
                const entries = args.slice(offset).reduce((out, v, i, a) => {
                    if ( (i & 1) === 0 ) {
                        const rawValue = a[i+1];
                        const value = /^\d+$/.test(rawValue)
                            ? parseInt(rawValue, 10)
                            : rawValue;
                        out.push([ a[i], value ]);
                    }
                    return out;
                }, []);
                return Object.fromEntries(entries);
            },
        };
        scriptletGlobals.set('safeSelf', safe);
        return safe;
    }

    function shouldLog(details) {
        if ( details instanceof Object === false ) { return false; }
        return scriptletGlobals.has('canDebug') && details.log;
    }

    try {
    // >>>> scriptlet start
    (function trustedReplaceXhrResponse(
        pattern = '',
        replacement = '',
        propsToMatch = ''
    ) {
        const safe = safeSelf();
        const xhrInstances = new WeakMap();
        const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);
        const logLevel = shouldLog({
            log: pattern === '' && 'all' || extraArgs.log,
        });
        const log = logLevel ? ((...args) => { safe.uboLog(...args); }) : (( ) => { });
        if ( pattern === '*' ) { pattern = '.*'; }
        const rePattern = safe.patternToRegex(pattern);
        const propNeedles = parsePropertiesToMatch(propsToMatch, 'url');
        self.XMLHttpRequest = class extends self.XMLHttpRequest {
            open(method, url, ...args) {
                const outerXhr = this;
                const xhrDetails = { method, url };
                let outcome = 'match';
                if ( propNeedles.size !== 0 ) {
                    if ( matchObjectProperties(propNeedles, xhrDetails) === false ) {
                        outcome = 'nomatch';
                    }
                }
                if ( outcome === logLevel || outcome === 'all' ) {
                    log(`xhr.open(${method}, ${url}, ${args.join(', ')})`);
                }
                if ( outcome === 'match' ) {
                    xhrInstances.set(outerXhr, xhrDetails);
                }
                return super.open(method, url, ...args);
            }
            get response() {
                const innerResponse = super.response;
                const xhrDetails = xhrInstances.get(this);
                if ( xhrDetails === undefined ) {
                    return innerResponse;
                }
                const responseLength = typeof innerResponse === 'string'
                    ? innerResponse.length
                    : undefined;
                if ( xhrDetails.lastResponseLength !== responseLength ) {
                    xhrDetails.response = undefined;
                    xhrDetails.lastResponseLength = responseLength;
                }
                if ( xhrDetails.response !== undefined ) {
                    return xhrDetails.response;
                }
                if ( typeof innerResponse !== 'string' ) {
                    return (xhrDetails.response = innerResponse);
                }
                const textBefore = innerResponse;
                const textAfter = textBefore.replace(rePattern, replacement);
                const outcome = textAfter !== textBefore ? 'match' : 'nomatch';
                if ( outcome === logLevel || logLevel === 'all' ) {
                    log(
                        `trusted-replace-xhr-response (${outcome})`,
                        `\n\tpattern: ${pattern}`,
                        `\n\treplacement: ${replacement}`,
                    );
                }
                return (xhrDetails.response = textAfter);
            }
            get responseText() {
                const response = this.response;
                if ( typeof response !== 'string' ) {
                    return super.responseText;
                }
                return response;
            }
        };
    })("/\"adPlacements.*?([A-Z]\"\\}|\"\\}{2})\\}\\],/","","/playlist\\?list=|player\\?key=|watch\\?v=|youtubei\\/v1\\/player/");
    // <<<< scriptlet end
    } catch (e) {

    }

    try {
    // >>>> scriptlet start
    (function trustedReplaceXhrResponse(
        pattern = '',
        replacement = '',
        propsToMatch = ''
    ) {
        const safe = safeSelf();
        const xhrInstances = new WeakMap();
        const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);
        const logLevel = shouldLog({
            log: pattern === '' && 'all' || extraArgs.log,
        });
        const log = logLevel ? ((...args) => { safe.uboLog(...args); }) : (( ) => { });
        if ( pattern === '*' ) { pattern = '.*'; }
        const rePattern = safe.patternToRegex(pattern);
        const propNeedles = parsePropertiesToMatch(propsToMatch, 'url');
        self.XMLHttpRequest = class extends self.XMLHttpRequest {
            open(method, url, ...args) {
                const outerXhr = this;
                const xhrDetails = { method, url };
                let outcome = 'match';
                if ( propNeedles.size !== 0 ) {
                    if ( matchObjectProperties(propNeedles, xhrDetails) === false ) {
                        outcome = 'nomatch';
                    }
                }
                if ( outcome === logLevel || outcome === 'all' ) {
                    log(`xhr.open(${method}, ${url}, ${args.join(', ')})`);
                }
                if ( outcome === 'match' ) {
                    xhrInstances.set(outerXhr, xhrDetails);
                }
                return super.open(method, url, ...args);
            }
            get response() {
                const innerResponse = super.response;
                const xhrDetails = xhrInstances.get(this);
                if ( xhrDetails === undefined ) {
                    return innerResponse;
                }
                const responseLength = typeof innerResponse === 'string'
                    ? innerResponse.length
                    : undefined;
                if ( xhrDetails.lastResponseLength !== responseLength ) {
                    xhrDetails.response = undefined;
                    xhrDetails.lastResponseLength = responseLength;
                }
                if ( xhrDetails.response !== undefined ) {
                    return xhrDetails.response;
                }
                if ( typeof innerResponse !== 'string' ) {
                    return (xhrDetails.response = innerResponse);
                }
                const textBefore = innerResponse;
                const textAfter = textBefore.replace(rePattern, replacement);
                const outcome = textAfter !== textBefore ? 'match' : 'nomatch';
                if ( outcome === logLevel || logLevel === 'all' ) {
                    log(
                        `trusted-replace-xhr-response (${outcome})`,
                        `\n\tpattern: ${pattern}`,
                        `\n\treplacement: ${replacement}`,
                    );
                }
                return (xhrDetails.response = textAfter);
            }
            get responseText() {
                const response = this.response;
                if ( typeof response !== 'string' ) {
                    return super.responseText;
                }
                return response;
            }
        };
    })("/\"adPlacements.*?(\"adSlots\"|\"adBreakHeartbeatParams\")/gms","$1","youtubei/v1/player");
    // <<<< scriptlet end
    } catch (e) {

    }

    function replaceFetchResponseFn(
        trusted = false,
        pattern = '',
        replacement = '',
        propsToMatch = ''
    ) {
        if ( trusted !== true ) { return; }
        const safe = safeSelf();
        const extraArgs = safe.getExtraArgs(Array.from(arguments), 4);
        const logLevel = shouldLog({
            log: pattern === '' || extraArgs.log,
        });
        const log = logLevel ? ((...args) => { safe.uboLog(...args); }) : (( ) => { });
        if ( pattern === '*' ) { pattern = '.*'; }
        const rePattern = safe.patternToRegex(pattern);
        const propNeedles = parsePropertiesToMatch(propsToMatch, 'url');

        self.fetch = new Proxy(self.fetch, {
            apply: function(target, thisArg, args) {

                if ( logLevel === true ) {
                    log('replace-fetch-response:', JSON.stringify(Array.from(args)).slice(1,-1));
                }
                const fetchPromise = Reflect.apply(target, thisArg, args);
                if ( pattern === '' ) { return fetchPromise; }
                let outcome = 'match';
                if ( propNeedles.size !== 0 ) {
                    const objs = [ args[0] instanceof Object ? args[0] : { url: args[0] } ];
                    if ( objs[0] instanceof Request ) {
                        try { objs[0] = safe.Request_clone.call(objs[0]);}
                        catch(ex) { console.log(ex); }
                    }
                    if ( args[1] instanceof Object ) {
                        objs.push(args[1]);
                    }
                    if ( matchObjectProperties(propNeedles, ...objs) === false ) {
                        outcome = 'nomatch';
                    }

                    if ( outcome === logLevel || logLevel === 'all' ) {
                        log(
                            `replace-fetch-response (${outcome})`,
                            `\n\tpropsToMatch: ${JSON.stringify(Array.from(propNeedles)).slice(1,-1)}`,
                            '\n\tprops:', ...args,
                        );
                    }
                }

                if ( outcome === 'nomatch' ) { return fetchPromise; }
                return fetchPromise.then(responseBefore => {
                    const response = responseBefore.clone();
                    return response.text().then(textBefore => {
                        const textAfter = textBefore.replace(rePattern, replacement);
                        const outcome = textAfter !== textBefore ? 'match' : 'nomatch';
                        if ( outcome === logLevel || logLevel === 'all' ) {
                            log(
                                `replace-fetch-response (${outcome})`,
                                `\n\tpattern: ${pattern}`,
                                `\n\treplacement: ${replacement}`,
                            );
                        }
                        if ( outcome === 'nomatch' ) { return responseBefore; }

                        const responseAfter = new Response(textAfter, {
                            status: responseBefore.status,
                            statusText: responseBefore.statusText,
                            headers: responseBefore.headers,
                        });
                        Object.defineProperties(responseAfter, {
                            ok: { value: responseBefore.ok },
                            redirected: { value: responseBefore.redirected },
                            type: { value: responseBefore.type },
                            url: { value: responseBefore.url },
                        });
                        return responseAfter;
                    }).catch(reason => {
                        log('replace-fetch-response:', reason);
                        return responseBefore;
                    });
                }).catch(reason => {
                    log('replace-fetch-response:', reason);
                    return fetchPromise;
                });
            }
        });
    }

    try {
    // >>>> scriptlet start
    (function trustedReplaceFetchResponse(...args) {
        replaceFetchResponseFn(true, ...args);
    })("/\"adPlacements.*?([A-Z]\"\\}|\"\\}{2})\\}\\],/","","player?key=");
    // <<<< scriptlet end
    } catch (e) {

    }

    function setConstantCore(
        trusted = false,
        chain = '',
        cValue = ''
    ) {
        if ( chain === '' ) { return; }
        const safe = safeSelf();
        const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);
        function setConstant(chain, cValue) {
            const trappedProp = (( ) => {
                const pos = chain.lastIndexOf('.');
                if ( pos === -1 ) { return chain; }
                return chain.slice(pos+1);
            })();
            if ( trappedProp === '' ) { return; }
            const thisScript = document.currentScript;
            const cloakFunc = fn => {
                safe.Object_defineProperty(fn, 'name', { value: trappedProp });
                const proxy = new Proxy(fn, {
                    defineProperty(target, prop) {
                        if ( prop !== 'toString' ) {
                            return Reflect.defineProperty(...arguments);
                        }
                        return true;
                    },
                    deleteProperty(target, prop) {
                        if ( prop !== 'toString' ) {
                            return Reflect.deleteProperty(...arguments);
                        }
                        return true;
                    },
                    get(target, prop) {
                        if ( prop === 'toString' ) {
                            return function() {
                                return `function ${trappedProp}() { [native code] }`;
                            }.bind(null);
                        }
                        return Reflect.get(...arguments);
                    },
                });
                return proxy;
            };
            if ( cValue === 'undefined' ) {
                cValue = undefined;
            } else if ( cValue === 'false' ) {
                cValue = false;
            } else if ( cValue === 'true' ) {
                cValue = true;
            } else if ( cValue === 'null' ) {
                cValue = null;
            } else if ( cValue === "''" || cValue === '' ) {
                cValue = '';
            } else if ( cValue === '[]' || cValue === 'emptyArr' ) {
                cValue = [];
            } else if ( cValue === '{}' || cValue === 'emptyObj' ) {
                cValue = {};
            } else if ( cValue === 'noopFunc' ) {
                cValue = cloakFunc(function(){});
            } else if ( cValue === 'trueFunc' ) {
                cValue = cloakFunc(function(){ return true; });
            } else if ( cValue === 'falseFunc' ) {
                cValue = cloakFunc(function(){ return false; });
            } else if ( /^-?\d+$/.test(cValue) ) {
                cValue = parseInt(cValue);
                if ( isNaN(cValue) ) { return; }
                if ( Math.abs(cValue) > 0x7FFF ) { return; }
            } else if ( trusted ) {
                if ( cValue.startsWith('{') && cValue.endsWith('}') ) {
                    try { cValue = safe.JSON_parse(cValue).value; } catch(ex) { return; }
                }
            } else {
                return;
            }
            if ( extraArgs.as !== undefined ) {
                const value = cValue;
                if ( extraArgs.as === 'function' ) {
                    cValue = ( ) => value;
                } else if ( extraArgs.as === 'callback' ) {
                    cValue = ( ) => (( ) => value);
                } else if ( extraArgs.as === 'resolved' ) {
                    cValue = Promise.resolve(value);
                } else if ( extraArgs.as === 'rejected' ) {
                    cValue = Promise.reject(value);
                }
            }
            let aborted = false;
            const mustAbort = function(v) {
                if ( trusted ) { return false; }
                if ( aborted ) { return true; }
                aborted =
                    (v !== undefined && v !== null) &&
                    (cValue !== undefined && cValue !== null) &&
                    (typeof v !== typeof cValue);
                return aborted;
            };
            // https://github.com/uBlockOrigin/uBlock-issues/issues/156
            //   Support multiple trappers for the same property.
            const trapProp = function(owner, prop, configurable, handler) {
                if ( handler.init(configurable ? owner[prop] : cValue) === false ) { return; }
                const odesc = Object.getOwnPropertyDescriptor(owner, prop);
                let prevGetter, prevSetter;
                if ( odesc instanceof Object ) {
                    owner[prop] = cValue;
                    if ( odesc.get instanceof Function ) {
                        prevGetter = odesc.get;
                    }
                    if ( odesc.set instanceof Function ) {
                        prevSetter = odesc.set;
                    }
                }
                try {
                    safe.Object_defineProperty(owner, prop, {
                        configurable,
                        get() {
                            if ( prevGetter !== undefined ) {
                                prevGetter();
                            }
                            return handler.getter(); // cValue
                        },
                        set(a) {
                            if ( prevSetter !== undefined ) {
                                prevSetter(a);
                            }
                            handler.setter(a);
                        }
                    });
                } catch(ex) {
                }
            };
            const trapChain = function(owner, chain) {
                const pos = chain.indexOf('.');
                if ( pos === -1 ) {
                    trapProp(owner, chain, false, {
                        v: undefined,
                        init: function(v) {
                            if ( mustAbort(v) ) { return false; }
                            this.v = v;
                            return true;
                        },
                        getter: function() {
                            return document.currentScript === thisScript
                                ? this.v
                                : cValue;
                        },
                        setter: function(a) {
                            if ( mustAbort(a) === false ) { return; }
                            cValue = a;
                        }
                    });
                    return;
                }
                const prop = chain.slice(0, pos);
                const v = owner[prop];
                chain = chain.slice(pos + 1);
                if ( v instanceof Object || typeof v === 'object' && v !== null ) {
                    trapChain(v, chain);
                    return;
                }
                trapProp(owner, prop, true, {
                    v: undefined,
                    init: function(v) {
                        this.v = v;
                        return true;
                    },
                    getter: function() {
                        return this.v;
                    },
                    setter: function(a) {
                        this.v = a;
                        if ( a instanceof Object ) {
                            trapChain(a, chain);
                        }
                    }
                });
            };
            trapChain(window, chain);
        }
        runAt(( ) => {
            setConstant(chain, cValue);
        }, extraArgs.runAt);
    }

    function runAt(fn, when) {
        const intFromReadyState = state => {
            const targets = {
                'loading': 1,
                'interactive': 2, 'end': 2, '2': 2,
                'complete': 3, 'idle': 3, '3': 3,
            };
            const tokens = Array.isArray(state) ? state : [ state ];
            for ( const token of tokens ) {
                const prop = `${token}`;
                if ( targets.hasOwnProperty(prop) === false ) { continue; }
                return targets[prop];
            }
            return 0;
        };
        const runAt = intFromReadyState(when);
        if ( intFromReadyState(document.readyState) >= runAt ) {
            fn(); return;
        }
        const onStateChange = ( ) => {
            if ( intFromReadyState(document.readyState) < runAt ) { return; }
            fn();
            safe.removeEventListener.apply(document, args);
        };
        const safe = safeSelf();
        const args = [ 'readystatechange', onStateChange, { capture: true } ];
        safe.addEventListener.apply(document, args);
    }

    try {
    // >>>> scriptlet start
    (function setConstant(
        ...args
    ) {
        setConstantCore(false, ...args);
    })("ytInitialPlayerResponse.playerAds","undefined");
    // <<<< scriptlet end
    } catch (e) {

    }

    try {
    // >>>> scriptlet start
    (function setConstant(
        ...args
    ) {
        setConstantCore(false, ...args);
    })("ytInitialPlayerResponse.adPlacements","undefined");
    // <<<< scriptlet end
    } catch (e) {

    }

    try {
    // >>>> scriptlet start
    (function setConstant(
        ...args
    ) {
        setConstantCore(false, ...args);
    })("ytInitialPlayerResponse.adSlots","undefined");
    // <<<< scriptlet end
    } catch (e) {

    }

    try {
    // >>>> scriptlet start
    (function setConstant(
        ...args
    ) {
        setConstantCore(false, ...args);
    })("playerResponse.adPlacements","undefined");
    // <<<< scriptlet end
    } catch (e) {

    }

    // <<<< end of private namespace
    })();