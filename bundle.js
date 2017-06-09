(function e(t, n, r) { function s(o, u) { if (!n[o]) {
    if (!t[o]) {
        var a = typeof require == "function" && require;
        if (!u && a)
            return a(o, !0);
        if (i)
            return i(o, !0);
        var f = new Error("Cannot find module '" + o + "'");
        throw f.code = "MODULE_NOT_FOUND", f;
    }
    var l = n[o] = { exports: {} };
    t[o][0].call(l.exports, function (e) { var n = t[o][1][e]; return s(n ? n : e); }, l, l.exports, e, t, n, r);
} return n[o].exports; } var i = typeof require == "function" && require; for (var o = 0; o < r.length; o++)
    s(r[o]); return s; })({ 1: [function (require, module, exports) {
            // Copyright Joyent, Inc. and other Node contributors.
            //
            // Permission is hereby granted, free of charge, to any person obtaining a
            // copy of this software and associated documentation files (the
            // "Software"), to deal in the Software without restriction, including
            // without limitation the rights to use, copy, modify, merge, publish,
            // distribute, sublicense, and/or sell copies of the Software, and to permit
            // persons to whom the Software is furnished to do so, subject to the
            // following conditions:
            //
            // The above copyright notice and this permission notice shall be included
            // in all copies or substantial portions of the Software.
            //
            // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
            // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
            // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
            // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
            // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
            // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
            // USE OR OTHER DEALINGS IN THE SOFTWARE.
            function EventEmitter() {
                this._events = this._events || {};
                this._maxListeners = this._maxListeners || undefined;
            }
            module.exports = EventEmitter;
            // Backwards-compat with node 0.10.x
            EventEmitter.EventEmitter = EventEmitter;
            EventEmitter.prototype._events = undefined;
            EventEmitter.prototype._maxListeners = undefined;
            // By default EventEmitters will print a warning if more than 10 listeners are
            // added to it. This is a useful default which helps finding memory leaks.
            EventEmitter.defaultMaxListeners = 10;
            // Obviously not all Emitters should be limited to 10. This function allows
            // that to be increased. Set to zero for unlimited.
            EventEmitter.prototype.setMaxListeners = function (n) {
                if (!isNumber(n) || n < 0 || isNaN(n))
                    throw TypeError('n must be a positive number');
                this._maxListeners = n;
                return this;
            };
            EventEmitter.prototype.emit = function (type) {
                var er, handler, len, args, i, listeners;
                if (!this._events)
                    this._events = {};
                // If there is no 'error' event listener then throw.
                if (type === 'error') {
                    if (!this._events.error ||
                        (isObject(this._events.error) && !this._events.error.length)) {
                        er = arguments[1];
                        if (er instanceof Error) {
                            throw er; // Unhandled 'error' event
                        }
                        else {
                            // At least give some kind of context to the user
                            var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
                            err.context = er;
                            throw err;
                        }
                    }
                }
                handler = this._events[type];
                if (isUndefined(handler))
                    return false;
                if (isFunction(handler)) {
                    switch (arguments.length) {
                        // fast cases
                        case 1:
                            handler.call(this);
                            break;
                        case 2:
                            handler.call(this, arguments[1]);
                            break;
                        case 3:
                            handler.call(this, arguments[1], arguments[2]);
                            break;
                        // slower
                        default:
                            args = Array.prototype.slice.call(arguments, 1);
                            handler.apply(this, args);
                    }
                }
                else if (isObject(handler)) {
                    args = Array.prototype.slice.call(arguments, 1);
                    listeners = handler.slice();
                    len = listeners.length;
                    for (i = 0; i < len; i++)
                        listeners[i].apply(this, args);
                }
                return true;
            };
            EventEmitter.prototype.addListener = function (type, listener) {
                var m;
                if (!isFunction(listener))
                    throw TypeError('listener must be a function');
                if (!this._events)
                    this._events = {};
                // To avoid recursion in the case that type === "newListener"! Before
                // adding it to the listeners, first emit "newListener".
                if (this._events.newListener)
                    this.emit('newListener', type, isFunction(listener.listener) ?
                        listener.listener : listener);
                if (!this._events[type])
                    // Optimize the case of one listener. Don't need the extra array object.
                    this._events[type] = listener;
                else if (isObject(this._events[type]))
                    // If we've already got an array, just append.
                    this._events[type].push(listener);
                else
                    // Adding the second element, need to change to array.
                    this._events[type] = [this._events[type], listener];
                // Check for listener leak
                if (isObject(this._events[type]) && !this._events[type].warned) {
                    if (!isUndefined(this._maxListeners)) {
                        m = this._maxListeners;
                    }
                    else {
                        m = EventEmitter.defaultMaxListeners;
                    }
                    if (m && m > 0 && this._events[type].length > m) {
                        this._events[type].warned = true;
                        console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
                        if (typeof console.trace === 'function') {
                            // not supported in IE 10
                            console.trace();
                        }
                    }
                }
                return this;
            };
            EventEmitter.prototype.on = EventEmitter.prototype.addListener;
            EventEmitter.prototype.once = function (type, listener) {
                if (!isFunction(listener))
                    throw TypeError('listener must be a function');
                var fired = false;
                function g() {
                    this.removeListener(type, g);
                    if (!fired) {
                        fired = true;
                        listener.apply(this, arguments);
                    }
                }
                g.listener = listener;
                this.on(type, g);
                return this;
            };
            // emits a 'removeListener' event iff the listener was removed
            EventEmitter.prototype.removeListener = function (type, listener) {
                var list, position, length, i;
                if (!isFunction(listener))
                    throw TypeError('listener must be a function');
                if (!this._events || !this._events[type])
                    return this;
                list = this._events[type];
                length = list.length;
                position = -1;
                if (list === listener ||
                    (isFunction(list.listener) && list.listener === listener)) {
                    delete this._events[type];
                    if (this._events.removeListener)
                        this.emit('removeListener', type, listener);
                }
                else if (isObject(list)) {
                    for (i = length; i-- > 0;) {
                        if (list[i] === listener ||
                            (list[i].listener && list[i].listener === listener)) {
                            position = i;
                            break;
                        }
                    }
                    if (position < 0)
                        return this;
                    if (list.length === 1) {
                        list.length = 0;
                        delete this._events[type];
                    }
                    else {
                        list.splice(position, 1);
                    }
                    if (this._events.removeListener)
                        this.emit('removeListener', type, listener);
                }
                return this;
            };
            EventEmitter.prototype.removeAllListeners = function (type) {
                var key, listeners;
                if (!this._events)
                    return this;
                // not listening for removeListener, no need to emit
                if (!this._events.removeListener) {
                    if (arguments.length === 0)
                        this._events = {};
                    else if (this._events[type])
                        delete this._events[type];
                    return this;
                }
                // emit removeListener for all listeners on all events
                if (arguments.length === 0) {
                    for (key in this._events) {
                        if (key === 'removeListener')
                            continue;
                        this.removeAllListeners(key);
                    }
                    this.removeAllListeners('removeListener');
                    this._events = {};
                    return this;
                }
                listeners = this._events[type];
                if (isFunction(listeners)) {
                    this.removeListener(type, listeners);
                }
                else if (listeners) {
                    // LIFO order
                    while (listeners.length)
                        this.removeListener(type, listeners[listeners.length - 1]);
                }
                delete this._events[type];
                return this;
            };
            EventEmitter.prototype.listeners = function (type) {
                var ret;
                if (!this._events || !this._events[type])
                    ret = [];
                else if (isFunction(this._events[type]))
                    ret = [this._events[type]];
                else
                    ret = this._events[type].slice();
                return ret;
            };
            EventEmitter.prototype.listenerCount = function (type) {
                if (this._events) {
                    var evlistener = this._events[type];
                    if (isFunction(evlistener))
                        return 1;
                    else if (evlistener)
                        return evlistener.length;
                }
                return 0;
            };
            EventEmitter.listenerCount = function (emitter, type) {
                return emitter.listenerCount(type);
            };
            function isFunction(arg) {
                return typeof arg === 'function';
            }
            function isNumber(arg) {
                return typeof arg === 'number';
            }
            function isObject(arg) {
                return typeof arg === 'object' && arg !== null;
            }
            function isUndefined(arg) {
                return arg === void 0;
            }
        }, {}], 2: [function (require, module, exports) {
            var psm = require('./parser.js');
            var print = console.log;
            var geid = function (i) { return document.getElementById(i); };
            var input = geid('input');
            var json = geid('json');
            var lisp = geid('lisp');
            var example = "\nprint 42\nprint\n  + 2\n    * 10 4\n\n+\n  * 4 3\n  * 15 2\n\n+ (* 4 3)(* 15 2\n\ndefun max2 (a b\n  cond\n    (> a b) a\n    t b\n\ndefun abs2 (x\n  cond\n    (> x 0) x\n    t (- 0 x\n\ndefun show-squares (start end\n  do\n    (i start (+ i 1\n    (> i end) (quote (done\n    format t '~A ~A~%' i (* i i\n\nshow-squares 2 5\n";
            input.value = example.trim();
            function translate() {
                var program = input.value;
                var lot = psm.parse(program);
                var list = psm.listify(lot);
                json.value = JSON.stringify(list, null, 4);
                lisp.value = lot.map(function (n) { return psm.explain(n); }).join('').trim();
            }
            function trytranslate() {
                try {
                    translate();
                }
                catch (e) {
                    json.value = e.toString();
                    console.error(e);
                    throw e;
                }
            }
            input.addEventListener('input', function () {
                trytranslate();
                // event handling code for sane browsers
            }, false);
            trytranslate();
        }, { "./parser.js": 4 }], 3: [function (require, module, exports) {
            // this routine(TypeScript) helps to inherit static methods
            var __extends = (this && this.__extends) || function (d, b) {
                for (var p in b)
                    if (b.hasOwnProperty(p))
                        d[p] = b[p];
                function __() { this.constructor = d; }
                d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
            };
            var __extends = function (d, b) {
                for (var p in b)
                    if (b.hasOwnProperty(p))
                        d[p] = b[p];
            };
            var make = (function () {
                var _make = function (parent) { return function (populator) {
                    var nc = function () { if (this.init)
                        this.init.apply(this, arguments); };
                    var proto = {};
                    if (typeof populator === 'function') {
                        populator(proto, parent.prototype);
                    }
                    else {
                        // Object.assign(proto, populator)
                        proto = populator;
                    }
                    proto.__proto__ = parent.prototype;
                    nc.prototype = proto;
                    __extends(nc, parent);
                    return nc;
                }; };
                Function.prototype.make = function (p) {
                    return _make(this)(p);
                };
                Function.prototype.setp = function (o) { return Object.assign(this, o); };
                var make = _make(function () { });
                return make;
            })();
            module.exports = make;
            var assert = function (cond, msg) {
                if (!cond)
                    throw 'assert failed' + (msg ? ': ' + msg.toString() : "");
            };
            function tests() {
                // baseclass
                var Animal = make(function (p) {
                    p.init = function () {
                        this.legs = 4;
                    };
                    p.say = function () {
                        return this.sound;
                    };
                });
                // static methods
                Animal.kill = function (ani) { return ani.sound + '...bang!'; };
                // baseclass, in another flavor
                var Animal2 = make({
                    init: function () {
                        this.legs = 4;
                    },
                    say: function () {
                        return this.sound;
                    }
                });
                assert(new Animal2().legs === 4);
                // inherit + override
                var Sheep = Animal.make(function (p, s) {
                    p.init = function () {
                        s.init.call(this);
                        this.sound = 'baa';
                    };
                });
                assert(new Sheep().say() === 'baa');
                // mixin
                var AngryMixin = function (p) {
                    p.say = function () {
                        return this.sound + '!!!';
                    };
                };
                var AngrySheep = Sheep.make(AngryMixin);
                assert(new AngrySheep().say(), 'baa!!!');
                // getter setter
                var RunningAnimal = Animal.make({
                    get speed() { return this.legs * 10; },
                    set speed(x) { this.legs = x / 10; }
                });
                assert(new RunningAnimal().speed === 40);
                // getter setter, another flavor
                var RunningAnimal = Animal.make(function (p) {
                    Object.defineProperty(p, 'speed', {
                        get: function () { return this.legs * 10; },
                        set: function (x) { this.legs = x / 10; }
                    });
                });
                assert(new RunningAnimal().speed === 40);
                var Dog = RunningAnimal.make(function (p, s) {
                    p.init = function () {
                        s.init.call(this);
                        this.sound = 'bark';
                    };
                });
                var d = new Dog();
                assert(d.speed === 40);
                assert(d.say() === 'bark');
                assert(Dog.kill(d) === 'bark...bang!');
            }
            tests();
        }, {}], 4: [function (require, module, exports) {
            var make = require('./meik.js');
            var thisf = function (f) { return function (a1, a2, a3, a4, a5) { return f(this, a1, a2, a3, a4, a5); }; };
            var cond = function () {
                var arr = arguments;
                for (var i = 0; i < arr.length; i += 2) {
                    if (arr[i + 1] !== undefined) {
                        if (arr[i]) {
                            return arr[i + 1];
                        }
                    }
                    else {
                        return arr[i];
                    }
                }
            };
            var print = console.log;
            var debug_flag = false;
            var dp = function () { if (debug_flag)
                print.apply(null, arguments); };
            var range = function (i) { var a = []; for (var j = 0; j < i; j++)
                a.push(j); return a; };
            var last = function (arr, s) { return arr[arr.length - 1 - (s || 0)]; };
            var first = function (arr) { return arr[0]; };
            dp(cond(false, '1f', true, '2f', '3f'));
            var program = "\n__\n= x 2\n= x\n  + 3 2 y\n\n= x (+ 3 2 y\n* x (+ 1.5 6 (* 2 3\n\n+ (* 3 3) (* 4 4\n  * 5 5\n  * 6 6\n\n+\n  (3) 4 5\n  3 4 5\n  (3 4 5\n\n* (+ 1 2)(+ 3 4)\n___\n+ 'holy' 'fuc ing' spaces\nprint x\nwhile\n__> x 0.2\n__= x\n____- x 178\n__\niif\n__> x 2\n__- x 1\n__+ x\n____* 5 x".replace(/_/g, ' ');
            // dp(program)
            var error = function (str) { throw new Error(str); };
            var node = make(function (p) {
                p.init = function (type, symbol) {
                    if (type === 'symbol') {
                        this.symbol = symbol;
                    }
                    else if (type === 'string') {
                        this.string = symbol;
                    }
                    else if (type === 'list') {
                        this.children = [];
                    }
                    else {
                        throw new Error('unsupported node type');
                    }
                    this.type = type;
                };
                p.setParent = function (parent) {
                    if (!parent && parent !== null) {
                        throw new Error('parent invalid in setParent');
                    }
                    this.parent = parent;
                    if (parent !== null) {
                        parent.children.push(this);
                    }
                    else {
                    }
                    return this;
                };
            });
            var sy_node = function (s) { return new node('symbol', s); };
            var li_node = function () { return new node('list'); };
            var eve = require('events');
            var InitResetMixin = function (p) {
                p.init = thisf(function (t) { return t.reset(); });
            };
            var SymbolStateMachine = eve.make(InitResetMixin).make(function (p) {
                p.reset = thisf(function (t) { return t.start(); });
                p.start = thisf(function (t) { t.cache = ''; });
                p.in = thisf(function (t, c) { t.cache += c; });
                p.end = thisf(function (t) {
                    dp('(ssm)symbol', t.cache);
                    t.emit('symbol', t.cache);
                });
            });
            var StringStateMachine = SymbolStateMachine.make(function (p) {
                p.end = thisf(function (t) {
                    dp('(ssm)string', t.cache);
                    t.emit('string', t.cache);
                });
            });
            var ListStateMachine = eve.make(InitResetMixin).make(function (p) {
                p.reset = function () {
                    this.rootnode = null; //li_node(null)
                    this.currnode = this.rootnode;
                };
                p.append = function (node) {
                    node.setParent(this.currnode);
                };
                p.push = function () {
                    dp('(lsm)->');
                    this.currnode = li_node().setParent(this.currnode);
                };
                p.pop = function () {
                    dp('(lsm)<-');
                    var curr = this.currnode;
                    this.currnode = curr.parent;
                    if (this.currnode === this.rootnode) {
                        this.emit('list', curr);
                    }
                };
            });
            var RefCounter = eve.make(InitResetMixin).make(function (p) {
                p.reset = function () {
                    this.count = 0;
                };
                p.inc = thisf(function (t) {
                    t.count++;
                    t.emit('inc');
                    dp('(brc)+');
                });
                p.dec = thisf(function (t) {
                    t.count--;
                    t.check();
                    t.emit('dec');
                    dp('(brc)-');
                });
                p.check = thisf(function (t) {
                    if (t.count < 0)
                        throw new Error('ref underflow');
                });
                p.zero = thisf(function (t) { return t.count === 0; });
            });
            var BraceCounter = RefCounter.make(function (p) {
                p.closebraces = function () {
                    while (this.count > 0) {
                        this.dec();
                    }
                };
            });
            var IndentStateMachine = eve.make(InitResetMixin).make(function (p) {
                p.reset = function () {
                    dp('(ism)reset');
                    this.stack = [];
                    this.count = 0;
                };
                // indent counting
                p.start = function () {
                    dp('(ism)start');
                    this.count = 0;
                };
                p.in = thisf(function (t) { t.count++; });
                p.end = function () { this.got_indent(this.count); };
                // indent stacking
                p.last = thisf(function (t) { return last(t.stack); });
                p.push = function (i) {
                    this.stack.push(i);
                    dp('(ism.stack)push', i, this.stack);
                };
                p.pop = function () {
                    if (this.stack.length === 0)
                        error('indentation stack underflow');
                    var k = this.stack.pop();
                    dp('(ism.stack)pop', k, this.stack);
                    return k;
                };
                // indent event handling
                p.got_indent = function (i) {
                    dp('(ism.stack)got_indent', i);
                    if (i > this.last() || this.stack.length === 0) {
                        this.push(i);
                        this.emit('push');
                    }
                    else {
                        this.emit('pop');
                        // lsm.pop()
                        while (i < this.last()) {
                            this.pop();
                            this.emit('pop');
                        }
                        if (i > this.last()) {
                            throw 'indentation imbalance';
                        }
                        this.emit('push');
                    }
                };
                p.end_indent = function () {
                    while (this.stack.length !== 0) {
                        this.pop();
                        this.emit('pop');
                    }
                };
            });
            // state machinery
            var parsing_statemachine = function () {
                var lsm = new ListStateMachine();
                var ins = new IndentStateMachine();
                var sy = new SymbolStateMachine();
                var st = new StringStateMachine();
                // state reset
                var reset = function () {
                    sy.reset();
                    lsm.reset();
                    ins.reset();
                    csm.reset();
                    st.reset();
                    brc.reset();
                };
                var brc = new BraceCounter();
                // when a symbol is parsed
                sy.on('symbol', function (s) {
                    lsm.append(new node('symbol', s));
                });
                // when a string is parsed
                st.on('string', function (s) {
                    lsm.append(new node('string', s));
                });
                // upon receiving EOS
                var str_end = function () {
                    // ins.got_indent(0) // indent set to 0
                    ins.end_indent();
                    // lsm.rootnode.children.pop()
                };
                // when indentation decides that lists should open or close themselves
                ins.on('push', function () { lsm.push(); });
                ins.on('pop', function () { lsm.pop(); });
                // when braces decides that lists should open or close themselves
                brc
                    .on('inc', function () { lsm.push(); })
                    .on('dec', function () { lsm.pop(); });
                // stack growth chart
                //      ()
                //   [ = x 2 (0)
                // ][ = x  (0)
                // [ + 3 2 (0,2)
                //
                // ]] [ prn x (0)
                // ] [ whi (0)
                // [ > x 0 (0,2)
                // ][ = x (0,2)
                // [ - x 1 (0,2,4)
                // end: ]]] ()
                // input character categorization
                var there = function (c, str) { return (str.indexOf(c) >= 0); }; // include
                var eq = function (str) { return function (c) { return c === str; }; }; // equal
                var symbol = function (c) {
                    return ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z') ||
                        ('0' <= c && c <= '9') || there(c, ":.<>?=_-+*/!%^&@$\\");
                };
                var space = eq(' ');
                var endl = eq('\n');
                var eos = eq('\0');
                var quote = eq("'");
                // valid char for string literal
                var validstr = function (c) { return (csm.state === 'quoting')
                    && (!(endl(c) || eos(c) || quote(c))); };
                var lbr = eq('(');
                var rbr = eq(')');
                // the categorizer
                var cat = function (c) { return cond(validstr(c), 'string', lbr(c), 'lbr', rbr(c), 'rbr', symbol(c), 'symbol', space(c), 'space', endl(c), 'newline', eos(c), 'eos', quote(c), 'quote', 'invalid-category'); };
                // initial state
                // var state = 'linestart'
                var CharacterStateMachine = make(function (p) {
                    p.init = function () {
                        this.reset();
                        this.smap = {};
                    };
                    p.reset = function () {
                        this.state = 'linestart';
                    };
                    // one character in
                    p.eat = function (c) {
                        var char_category = cat(c);
                        // if current state exists in smap
                        var smap_state = this.smap[this.state];
                        if (!smap_state)
                            error("unexpected state: " + this.state);
                        // if handler exists for current character type
                        var handler = smap_state[char_category];
                        if (!handler)
                            error("handler not found for '" + c + "' of category: " + char_category + " on state " + this.state);
                        //call the handler
                        handler(c);
                    };
                    // register state transitions
                    p.reg = function (statename) {
                        var _this = this;
                        var statenames = (typeof statename == 'string') ? [statename] : statename;
                        var r = function (cat, nextstatename, handler) {
                            statenames.map(function (sn) {
                                _this.smap[sn] = _this.smap[sn] || {};
                                _this.smap[sn][cat] = function (c) { _this.state = nextstatename; handler(c); };
                            });
                            return r;
                        };
                        return r;
                    };
                });
                var csm = new CharacterStateMachine();
                csm.reg('linestart') // at start of line
                ('symbol', 'symboling', function (c) { ins.start(); ins.end(); sy.start(); sy.in(c); })('space', 'indenting', function (c) { ins.start(); ins.in(); });
                csm.reg('indenting') // during indentation of line
                ('symbol', 'symboling', function (c) { ins.end(); sy.start(); sy.in(c); })('space', 'indenting', function (c) { ins.in(); })('quote', 'quoting', function (c) { ins.end(); st.start(); });
                csm.reg('symboling') // during symbol
                ('symbol', 'symboling', function (c) { sy.in(c); })('space', 'spacing', function (c) { sy.end(); })('newline', 'linestart', function (c) { sy.end(), brc.closebraces(); });
                csm.reg('spacing') // during spaces between symbol
                ('symbol', 'symboling', function (c) { sy.start(); sy.in(c); })('space', 'spacing', function (c) { })('quote', 'quoting', function (c) { st.start(); });
                csm.reg('quoting') // during anything between quote
                ('string', 'quoting', function (c) { st.in(c); })('quote', 'quoted', function (c) { st.end(); });
                csm.reg('quoted') //exit quote
                ('space', 'spacing', function (c) { });
                csm.reg('symboling')('lbr', 'spacing', function (c) { sy.end(); brc.inc(); });
                csm.reg('linestart')('lbr', 'spacing', function (c) { ins.start(); ins.end(); brc.inc(); });
                csm.reg('indenting')('lbr', 'spacing', function (c) {
                    ins.end();
                    brc.inc();
                });
                csm.reg(['spacing', 'quoted'])('lbr', 'spacing', function (c) { brc.inc(); });
                csm.reg('symboling')('rbr', 'spacing', function (c) { sy.end(); brc.dec(); });
                csm.reg(['spacing', 'quoted'])('rbr', 'spacing', function (c) { brc.dec(); });
                csm.reg(['linestart', 'spacing', 'indenting', 'quoted'])('newline', 'linestart', function (c) { brc.closebraces(); })('eos', 'eos', function (c) { brc.closebraces(); str_end(); });
                csm.reg(['symboling'])('eos', 'eos', function (c) { sy.end(); brc.closebraces(); str_end(); });
                function show_state_map() { print(csm.smap); }
                var lot = []; // list of trees
                lsm.on('list', function (node) {
                    lot.push(node);
                });
                function parse(str) {
                    dp('begin parse');
                    reset();
                    lot = [];
                    for (var i = 0; i < str.length; i++) {
                        csm.eat(str[i]);
                    }
                    csm.eat('\0');
                    dp('end parse');
                    return lot;
                }
                return {
                    parse: parse,
                    // get_tree,
                    show_state_map: show_state_map
                };
            };
            // debug_flag=true
            var psm = parsing_statemachine();
            module.exports = psm;
            var sp = function (depth) { return put(range(depth * 4).map(function (c) { return ' '; }).join('')); };
            var strbuf = '';
            var put = function (s) {
                // process.stdout.write.apply(process.stdout,arguments)
                strbuf += s;
            };
            var expand = function (node, depth) {
                depth = depth || 0;
                cond(node.type === 'symbol', function () { put(' ' + node.symbol + ' '); }, node.type === 'string', function () { put(' (str)\'' + node.string + '\' '); }, node.type === 'list', function () {
                    put('\n');
                    sp(depth);
                    put('(');
                    node.children.map(function (c) { expand(c, depth + 1); });
                    put(')'); //sp(depth-1)
                }, function () { throw new Error('unknown node type'); })();
            };
            // visually explain
            psm.explain = function (node) {
                strbuf = '';
                expand(node);
                return strbuf;
            };
            function test() {
                print('program:');
                print(program);
                print('\nparsed:');
                var lot = psm.parse(program);
                lot.map(function (n) { print(psm.explain(n)); });
                print(listify(lot));
            }
            // test()
            // test()
            function listify(lot) {
                // var lot = psm.parse(prog)
                var reduce_node = function (node) {
                    return cond(node.type === 'list', function () { return node.children.map(reduce_node); }, node.type === 'string', function () { return node.string; }, node.type === 'symbol', function () { return node.symbol; }, function () { throw new Error('unknown node type'); })();
                };
                var res = lot.map(reduce_node);
                return res;
            }
            function json(s) {
                return JSON.stringify(s, null, 4);
            }
            // print(json(listify(program)))
            psm.listify = listify;
        }, { "./meik.js": 3, "events": 1 }] }, {}, [2]);
