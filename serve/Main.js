var Elm = Elm || { Native: {} };
Elm.Native.Basics = {};
Elm.Native.Basics.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Basics = localRuntime.Native.Basics || {};
	if (localRuntime.Native.Basics.values)
	{
		return localRuntime.Native.Basics.values;
	}

	var Utils = Elm.Native.Utils.make(localRuntime);

	function div(a, b)
	{
		return (a / b) | 0;
	}
	function rem(a, b)
	{
		return a % b;
	}
	function mod(a, b)
	{
		if (b === 0)
		{
			throw new Error('Cannot perform mod 0. Division by zero error.');
		}
		var r = a % b;
		var m = a === 0 ? 0 : (b > 0 ? (a >= 0 ? r : r + b) : -mod(-a, -b));

		return m === b ? 0 : m;
	}
	function logBase(base, n)
	{
		return Math.log(n) / Math.log(base);
	}
	function negate(n)
	{
		return -n;
	}
	function abs(n)
	{
		return n < 0 ? -n : n;
	}

	function min(a, b)
	{
		return Utils.cmp(a, b) < 0 ? a : b;
	}
	function max(a, b)
	{
		return Utils.cmp(a, b) > 0 ? a : b;
	}
	function clamp(lo, hi, n)
	{
		return Utils.cmp(n, lo) < 0 ? lo : Utils.cmp(n, hi) > 0 ? hi : n;
	}

	function xor(a, b)
	{
		return a !== b;
	}
	function not(b)
	{
		return !b;
	}
	function isInfinite(n)
	{
		return n === Infinity || n === -Infinity;
	}

	function truncate(n)
	{
		return n | 0;
	}

	function degrees(d)
	{
		return d * Math.PI / 180;
	}
	function turns(t)
	{
		return 2 * Math.PI * t;
	}
	function fromPolar(point)
	{
		var r = point._0;
		var t = point._1;
		return Utils.Tuple2(r * Math.cos(t), r * Math.sin(t));
	}
	function toPolar(point)
	{
		var x = point._0;
		var y = point._1;
		return Utils.Tuple2(Math.sqrt(x * x + y * y), Math.atan2(y, x));
	}

	return localRuntime.Native.Basics.values = {
		div: F2(div),
		rem: F2(rem),
		mod: F2(mod),

		pi: Math.PI,
		e: Math.E,
		cos: Math.cos,
		sin: Math.sin,
		tan: Math.tan,
		acos: Math.acos,
		asin: Math.asin,
		atan: Math.atan,
		atan2: F2(Math.atan2),

		degrees: degrees,
		turns: turns,
		fromPolar: fromPolar,
		toPolar: toPolar,

		sqrt: Math.sqrt,
		logBase: F2(logBase),
		negate: negate,
		abs: abs,
		min: F2(min),
		max: F2(max),
		clamp: F3(clamp),
		compare: Utils.compare,

		xor: F2(xor),
		not: not,

		truncate: truncate,
		ceiling: Math.ceil,
		floor: Math.floor,
		round: Math.round,
		toFloat: function(x) { return x; },
		isNaN: isNaN,
		isInfinite: isInfinite
	};
};

Elm.Native.Port = {};

Elm.Native.Port.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Port = localRuntime.Native.Port || {};
	if (localRuntime.Native.Port.values)
	{
		return localRuntime.Native.Port.values;
	}

	var NS;

	// INBOUND

	function inbound(name, type, converter)
	{
		if (!localRuntime.argsTracker[name])
		{
			throw new Error(
				'Port Error:\n' +
				'No argument was given for the port named \'' + name + '\' with type:\n\n' +
				'    ' + type.split('\n').join('\n        ') + '\n\n' +
				'You need to provide an initial value!\n\n' +
				'Find out more about ports here <http://elm-lang.org/learn/Ports.elm>'
			);
		}
		var arg = localRuntime.argsTracker[name];
		arg.used = true;

		return jsToElm(name, type, converter, arg.value);
	}


	function inboundSignal(name, type, converter)
	{
		var initialValue = inbound(name, type, converter);

		if (!NS)
		{
			NS = Elm.Native.Signal.make(localRuntime);
		}
		var signal = NS.input('inbound-port-' + name, initialValue);

		function send(jsValue)
		{
			var elmValue = jsToElm(name, type, converter, jsValue);
			setTimeout(function() {
				localRuntime.notify(signal.id, elmValue);
			}, 0);
		}

		localRuntime.ports[name] = { send: send };

		return signal;
	}


	function jsToElm(name, type, converter, value)
	{
		try
		{
			return converter(value);
		}
		catch(e)
		{
			throw new Error(
				'Port Error:\n' +
				'Regarding the port named \'' + name + '\' with type:\n\n' +
				'    ' + type.split('\n').join('\n        ') + '\n\n' +
				'You just sent the value:\n\n' +
				'    ' + JSON.stringify(value) + '\n\n' +
				'but it cannot be converted to the necessary type.\n' +
				e.message
			);
		}
	}


	// OUTBOUND

	function outbound(name, converter, elmValue)
	{
		localRuntime.ports[name] = converter(elmValue);
	}


	function outboundSignal(name, converter, signal)
	{
		var subscribers = [];

		function subscribe(handler)
		{
			subscribers.push(handler);
		}
		function unsubscribe(handler)
		{
			subscribers.pop(subscribers.indexOf(handler));
		}

		function notify(elmValue)
		{
			var jsValue = converter(elmValue);
			var len = subscribers.length;
			for (var i = 0; i < len; ++i)
			{
				subscribers[i](jsValue);
			}
		}

		if (!NS)
		{
			NS = Elm.Native.Signal.make(localRuntime);
		}
		NS.output('outbound-port-' + name, notify, signal);

		localRuntime.ports[name] = {
			subscribe: subscribe,
			unsubscribe: unsubscribe
		};

		return signal;
	}


	return localRuntime.Native.Port.values = {
		inbound: inbound,
		outbound: outbound,
		inboundSignal: inboundSignal,
		outboundSignal: outboundSignal
	};
};

if (!Elm.fullscreen) {
	(function() {
		'use strict';

		var Display = {
			FULLSCREEN: 0,
			COMPONENT: 1,
			NONE: 2
		};

		Elm.fullscreen = function(module, args)
		{
			var container = document.createElement('div');
			document.body.appendChild(container);
			return init(Display.FULLSCREEN, container, module, args || {});
		};

		Elm.embed = function(module, container, args)
		{
			var tag = container.tagName;
			if (tag !== 'DIV')
			{
				throw new Error('Elm.node must be given a DIV, not a ' + tag + '.');
			}
			return init(Display.COMPONENT, container, module, args || {});
		};

		Elm.worker = function(module, args)
		{
			return init(Display.NONE, {}, module, args || {});
		};

		function init(display, container, module, args, moduleToReplace)
		{
			// defining state needed for an instance of the Elm RTS
			var inputs = [];

			/* OFFSET
			 * Elm's time traveling debugger lets you pause time. This means
			 * "now" may be shifted a bit into the past. By wrapping Date.now()
			 * we can manage this.
			 */
			var timer = {
				programStart: Date.now(),
				now: function()
				{
					return Date.now();
				}
			};

			var updateInProgress = false;
			function notify(id, v)
			{
				if (updateInProgress)
				{
					throw new Error(
						'The notify function has been called synchronously!\n' +
						'This can lead to frames being dropped.\n' +
						'Definitely report this to <https://github.com/elm-lang/Elm/issues>\n');
				}
				updateInProgress = true;
				var timestep = timer.now();
				for (var i = inputs.length; i--; )
				{
					inputs[i].notify(timestep, id, v);
				}
				updateInProgress = false;
			}
			function setTimeout(func, delay)
			{
				return window.setTimeout(func, delay);
			}

			var listeners = [];
			function addListener(relevantInputs, domNode, eventName, func)
			{
				domNode.addEventListener(eventName, func);
				var listener = {
					relevantInputs: relevantInputs,
					domNode: domNode,
					eventName: eventName,
					func: func
				};
				listeners.push(listener);
			}

			var argsTracker = {};
			for (var name in args)
			{
				argsTracker[name] = {
					value: args[name],
					used: false
				};
			}

			// create the actual RTS. Any impure modules will attach themselves to this
			// object. This permits many Elm programs to be embedded per document.
			var elm = {
				notify: notify,
				setTimeout: setTimeout,
				node: container,
				addListener: addListener,
				inputs: inputs,
				timer: timer,
				argsTracker: argsTracker,
				ports: {},

				isFullscreen: function() { return display === Display.FULLSCREEN; },
				isEmbed: function() { return display === Display.COMPONENT; },
				isWorker: function() { return display === Display.NONE; }
			};

			function swap(newModule)
			{
				removeListeners(listeners);
				var div = document.createElement('div');
				var newElm = init(display, div, newModule, args, elm);
				inputs = [];

				return newElm;
			}

			function dispose()
			{
				removeListeners(listeners);
				inputs = [];
			}

			var Module = {};
			try
			{
				Module = module.make(elm);
				checkInputs(elm);
			}
			catch (error)
			{
				if (typeof container.appendChild === "function")
				{
					container.appendChild(errorNode(error.message));
				}
				else
				{
					console.error(error.message);
				}
				throw error;
			}

			if (display !== Display.NONE)
			{
				var graphicsNode = initGraphics(elm, Module);
			}

			var rootNode = { kids: inputs };
			trimDeadNodes(rootNode);
			inputs = rootNode.kids;
			filterListeners(inputs, listeners);

			addReceivers(elm.ports);

			if (typeof moduleToReplace !== 'undefined')
			{
				hotSwap(moduleToReplace, elm);

				// rerender scene if graphics are enabled.
				if (typeof graphicsNode !== 'undefined')
				{
					graphicsNode.notify(0, true, 0);
				}
			}

			return {
				swap: swap,
				ports: elm.ports,
				dispose: dispose
			};
		}

		function checkInputs(elm)
		{
			var argsTracker = elm.argsTracker;
			for (var name in argsTracker)
			{
				if (!argsTracker[name].used)
				{
					throw new Error(
						"Port Error:\nYou provided an argument named '" + name +
						"' but there is no corresponding port!\n\n" +
						"Maybe add a port '" + name + "' to your Elm module?\n" +
						"Maybe remove the '" + name + "' argument from your initialization code in JS?"
					);
				}
			}
		}

		function errorNode(message)
		{
			var code = document.createElement('code');

			var lines = message.split('\n');
			code.appendChild(document.createTextNode(lines[0]));
			code.appendChild(document.createElement('br'));
			code.appendChild(document.createElement('br'));
			for (var i = 1; i < lines.length; ++i)
			{
				code.appendChild(document.createTextNode('\u00A0 \u00A0 ' + lines[i].replace(/  /g, '\u00A0 ')));
				code.appendChild(document.createElement('br'));
			}
			code.appendChild(document.createElement('br'));
			code.appendChild(document.createTextNode('Open the developer console for more details.'));
			return code;
		}


		//// FILTER SIGNALS ////

		// TODO: move this code into the signal module and create a function
		// Signal.initializeGraph that actually instantiates everything.

		function filterListeners(inputs, listeners)
		{
			loop:
			for (var i = listeners.length; i--; )
			{
				var listener = listeners[i];
				for (var j = inputs.length; j--; )
				{
					if (listener.relevantInputs.indexOf(inputs[j].id) >= 0)
					{
						continue loop;
					}
				}
				listener.domNode.removeEventListener(listener.eventName, listener.func);
			}
		}

		function removeListeners(listeners)
		{
			for (var i = listeners.length; i--; )
			{
				var listener = listeners[i];
				listener.domNode.removeEventListener(listener.eventName, listener.func);
			}
		}

		// add receivers for built-in ports if they are defined
		function addReceivers(ports)
		{
			if ('title' in ports)
			{
				if (typeof ports.title === 'string')
				{
					document.title = ports.title;
				}
				else
				{
					ports.title.subscribe(function(v) { document.title = v; });
				}
			}
			if ('redirect' in ports)
			{
				ports.redirect.subscribe(function(v) {
					if (v.length > 0)
					{
						window.location = v;
					}
				});
			}
		}


		// returns a boolean representing whether the node is alive or not.
		function trimDeadNodes(node)
		{
			if (node.isOutput)
			{
				return true;
			}

			var liveKids = [];
			for (var i = node.kids.length; i--; )
			{
				var kid = node.kids[i];
				if (trimDeadNodes(kid))
				{
					liveKids.push(kid);
				}
			}
			node.kids = liveKids;

			return liveKids.length > 0;
		}


		////  RENDERING  ////

		function initGraphics(elm, Module)
		{
			if (!('main' in Module))
			{
				throw new Error("'main' is missing! What do I display?!");
			}

			var signalGraph = Module.main;

			// make sure the signal graph is actually a signal & extract the visual model
			if (!('notify' in signalGraph))
			{
				signalGraph = Elm.Signal.make(elm).constant(signalGraph);
			}
			var initialScene = signalGraph.value;

			// Figure out what the render functions should be
			var render;
			var update;
			if (initialScene.ctor === 'Element_elm_builtin')
			{
				var Element = Elm.Native.Graphics.Element.make(elm);
				render = Element.render;
				update = Element.updateAndReplace;
			}
			else
			{
				var VirtualDom = Elm.Native.VirtualDom.make(elm);
				render = VirtualDom.render;
				update = VirtualDom.updateAndReplace;
			}

			// Add the initialScene to the DOM
			var container = elm.node;
			var node = render(initialScene);
			while (container.firstChild)
			{
				container.removeChild(container.firstChild);
			}
			container.appendChild(node);

			var _requestAnimationFrame =
				typeof requestAnimationFrame !== 'undefined'
					? requestAnimationFrame
					: function(cb) { setTimeout(cb, 1000 / 60); }
					;

			// domUpdate is called whenever the main Signal changes.
			//
			// domUpdate and drawCallback implement a small state machine in order
			// to schedule only 1 draw per animation frame. This enforces that
			// once draw has been called, it will not be called again until the
			// next frame.
			//
			// drawCallback is scheduled whenever
			// 1. The state transitions from PENDING_REQUEST to EXTRA_REQUEST, or
			// 2. The state transitions from NO_REQUEST to PENDING_REQUEST
			//
			// Invariants:
			// 1. In the NO_REQUEST state, there is never a scheduled drawCallback.
			// 2. In the PENDING_REQUEST and EXTRA_REQUEST states, there is always exactly 1
			//    scheduled drawCallback.
			var NO_REQUEST = 0;
			var PENDING_REQUEST = 1;
			var EXTRA_REQUEST = 2;
			var state = NO_REQUEST;
			var savedScene = initialScene;
			var scheduledScene = initialScene;

			function domUpdate(newScene)
			{
				scheduledScene = newScene;

				switch (state)
				{
					case NO_REQUEST:
						_requestAnimationFrame(drawCallback);
						state = PENDING_REQUEST;
						return;
					case PENDING_REQUEST:
						state = PENDING_REQUEST;
						return;
					case EXTRA_REQUEST:
						state = PENDING_REQUEST;
						return;
				}
			}

			function drawCallback()
			{
				switch (state)
				{
					case NO_REQUEST:
						// This state should not be possible. How can there be no
						// request, yet somehow we are actively fulfilling a
						// request?
						throw new Error(
							'Unexpected draw callback.\n' +
							'Please report this to <https://github.com/elm-lang/core/issues>.'
						);

					case PENDING_REQUEST:
						// At this point, we do not *know* that another frame is
						// needed, but we make an extra request to rAF just in
						// case. It's possible to drop a frame if rAF is called
						// too late, so we just do it preemptively.
						_requestAnimationFrame(drawCallback);
						state = EXTRA_REQUEST;

						// There's also stuff we definitely need to draw.
						draw();
						return;

					case EXTRA_REQUEST:
						// Turns out the extra request was not needed, so we will
						// stop calling rAF. No reason to call it all the time if
						// no one needs it.
						state = NO_REQUEST;
						return;
				}
			}

			function draw()
			{
				update(elm.node.firstChild, savedScene, scheduledScene);
				if (elm.Native.Window)
				{
					elm.Native.Window.values.resizeIfNeeded();
				}
				savedScene = scheduledScene;
			}

			var renderer = Elm.Native.Signal.make(elm).output('main', domUpdate, signalGraph);

			// must check for resize after 'renderer' is created so
			// that changes show up.
			if (elm.Native.Window)
			{
				elm.Native.Window.values.resizeIfNeeded();
			}

			return renderer;
		}

		//// HOT SWAPPING ////

		// Returns boolean indicating if the swap was successful.
		// Requires that the two signal graphs have exactly the same
		// structure.
		function hotSwap(from, to)
		{
			function similar(nodeOld, nodeNew)
			{
				if (nodeOld.id !== nodeNew.id)
				{
					return false;
				}
				if (nodeOld.isOutput)
				{
					return nodeNew.isOutput;
				}
				return nodeOld.kids.length === nodeNew.kids.length;
			}
			function swap(nodeOld, nodeNew)
			{
				nodeNew.value = nodeOld.value;
				return true;
			}
			var canSwap = depthFirstTraversals(similar, from.inputs, to.inputs);
			if (canSwap)
			{
				depthFirstTraversals(swap, from.inputs, to.inputs);
			}
			from.node.parentNode.replaceChild(to.node, from.node);

			return canSwap;
		}

		// Returns false if the node operation f ever fails.
		function depthFirstTraversals(f, queueOld, queueNew)
		{
			if (queueOld.length !== queueNew.length)
			{
				return false;
			}
			queueOld = queueOld.slice(0);
			queueNew = queueNew.slice(0);

			var seen = [];
			while (queueOld.length > 0 && queueNew.length > 0)
			{
				var nodeOld = queueOld.pop();
				var nodeNew = queueNew.pop();
				if (seen.indexOf(nodeOld.id) < 0)
				{
					if (!f(nodeOld, nodeNew))
					{
						return false;
					}
					queueOld = queueOld.concat(nodeOld.kids || []);
					queueNew = queueNew.concat(nodeNew.kids || []);
					seen.push(nodeOld.id);
				}
			}
			return true;
		}
	}());

	function F2(fun)
	{
		function wrapper(a) { return function(b) { return fun(a,b); }; }
		wrapper.arity = 2;
		wrapper.func = fun;
		return wrapper;
	}

	function F3(fun)
	{
		function wrapper(a) {
			return function(b) { return function(c) { return fun(a, b, c); }; };
		}
		wrapper.arity = 3;
		wrapper.func = fun;
		return wrapper;
	}

	function F4(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return fun(a, b, c, d); }; }; };
		}
		wrapper.arity = 4;
		wrapper.func = fun;
		return wrapper;
	}

	function F5(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return fun(a, b, c, d, e); }; }; }; };
		}
		wrapper.arity = 5;
		wrapper.func = fun;
		return wrapper;
	}

	function F6(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return fun(a, b, c, d, e, f); }; }; }; }; };
		}
		wrapper.arity = 6;
		wrapper.func = fun;
		return wrapper;
	}

	function F7(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return function(g) { return fun(a, b, c, d, e, f, g); }; }; }; }; }; };
		}
		wrapper.arity = 7;
		wrapper.func = fun;
		return wrapper;
	}

	function F8(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return function(g) { return function(h) {
			return fun(a, b, c, d, e, f, g, h); }; }; }; }; }; }; };
		}
		wrapper.arity = 8;
		wrapper.func = fun;
		return wrapper;
	}

	function F9(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return function(g) { return function(h) { return function(i) {
			return fun(a, b, c, d, e, f, g, h, i); }; }; }; }; }; }; }; };
		}
		wrapper.arity = 9;
		wrapper.func = fun;
		return wrapper;
	}

	function A2(fun, a, b)
	{
		return fun.arity === 2
			? fun.func(a, b)
			: fun(a)(b);
	}
	function A3(fun, a, b, c)
	{
		return fun.arity === 3
			? fun.func(a, b, c)
			: fun(a)(b)(c);
	}
	function A4(fun, a, b, c, d)
	{
		return fun.arity === 4
			? fun.func(a, b, c, d)
			: fun(a)(b)(c)(d);
	}
	function A5(fun, a, b, c, d, e)
	{
		return fun.arity === 5
			? fun.func(a, b, c, d, e)
			: fun(a)(b)(c)(d)(e);
	}
	function A6(fun, a, b, c, d, e, f)
	{
		return fun.arity === 6
			? fun.func(a, b, c, d, e, f)
			: fun(a)(b)(c)(d)(e)(f);
	}
	function A7(fun, a, b, c, d, e, f, g)
	{
		return fun.arity === 7
			? fun.func(a, b, c, d, e, f, g)
			: fun(a)(b)(c)(d)(e)(f)(g);
	}
	function A8(fun, a, b, c, d, e, f, g, h)
	{
		return fun.arity === 8
			? fun.func(a, b, c, d, e, f, g, h)
			: fun(a)(b)(c)(d)(e)(f)(g)(h);
	}
	function A9(fun, a, b, c, d, e, f, g, h, i)
	{
		return fun.arity === 9
			? fun.func(a, b, c, d, e, f, g, h, i)
			: fun(a)(b)(c)(d)(e)(f)(g)(h)(i);
	}
}

Elm.Native = Elm.Native || {};
Elm.Native.Utils = {};
Elm.Native.Utils.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Utils = localRuntime.Native.Utils || {};
	if (localRuntime.Native.Utils.values)
	{
		return localRuntime.Native.Utils.values;
	}


	// COMPARISONS

	function eq(l, r)
	{
		var stack = [{'x': l, 'y': r}];
		while (stack.length > 0)
		{
			var front = stack.pop();
			var x = front.x;
			var y = front.y;
			if (x === y)
			{
				continue;
			}
			if (typeof x === 'object')
			{
				var c = 0;
				for (var i in x)
				{
					++c;
					if (i in y)
					{
						if (i !== 'ctor')
						{
							stack.push({ 'x': x[i], 'y': y[i] });
						}
					}
					else
					{
						return false;
					}
				}
				if ('ctor' in x)
				{
					stack.push({'x': x.ctor, 'y': y.ctor});
				}
				if (c !== Object.keys(y).length)
				{
					return false;
				}
			}
			else if (typeof x === 'function')
			{
				throw new Error('Equality error: general function equality is ' +
								'undecidable, and therefore, unsupported');
			}
			else
			{
				return false;
			}
		}
		return true;
	}

	// code in Generate/JavaScript.hs depends on the particular
	// integer values assigned to LT, EQ, and GT
	var LT = -1, EQ = 0, GT = 1, ord = ['LT', 'EQ', 'GT'];

	function compare(x, y)
	{
		return {
			ctor: ord[cmp(x, y) + 1]
		};
	}

	function cmp(x, y) {
		var ord;
		if (typeof x !== 'object')
		{
			return x === y ? EQ : x < y ? LT : GT;
		}
		else if (x.isChar)
		{
			var a = x.toString();
			var b = y.toString();
			return a === b
				? EQ
				: a < b
					? LT
					: GT;
		}
		else if (x.ctor === '::' || x.ctor === '[]')
		{
			while (true)
			{
				if (x.ctor === '[]' && y.ctor === '[]')
				{
					return EQ;
				}
				if (x.ctor !== y.ctor)
				{
					return x.ctor === '[]' ? LT : GT;
				}
				ord = cmp(x._0, y._0);
				if (ord !== EQ)
				{
					return ord;
				}
				x = x._1;
				y = y._1;
			}
		}
		else if (x.ctor.slice(0, 6) === '_Tuple')
		{
			var n = x.ctor.slice(6) - 0;
			var err = 'cannot compare tuples with more than 6 elements.';
			if (n === 0) return EQ;
			if (n >= 1) { ord = cmp(x._0, y._0); if (ord !== EQ) return ord;
			if (n >= 2) { ord = cmp(x._1, y._1); if (ord !== EQ) return ord;
			if (n >= 3) { ord = cmp(x._2, y._2); if (ord !== EQ) return ord;
			if (n >= 4) { ord = cmp(x._3, y._3); if (ord !== EQ) return ord;
			if (n >= 5) { ord = cmp(x._4, y._4); if (ord !== EQ) return ord;
			if (n >= 6) { ord = cmp(x._5, y._5); if (ord !== EQ) return ord;
			if (n >= 7) throw new Error('Comparison error: ' + err); } } } } } }
			return EQ;
		}
		else
		{
			throw new Error('Comparison error: comparison is only defined on ints, ' +
							'floats, times, chars, strings, lists of comparable values, ' +
							'and tuples of comparable values.');
		}
	}


	// TUPLES

	var Tuple0 = {
		ctor: '_Tuple0'
	};

	function Tuple2(x, y)
	{
		return {
			ctor: '_Tuple2',
			_0: x,
			_1: y
		};
	}


	// LITERALS

	function chr(c)
	{
		var x = new String(c);
		x.isChar = true;
		return x;
	}

	function txt(str)
	{
		var t = new String(str);
		t.text = true;
		return t;
	}


	// GUID

	var count = 0;
	function guid(_)
	{
		return count++;
	}


	// RECORDS

	function update(oldRecord, updatedFields)
	{
		var newRecord = {};
		for (var key in oldRecord)
		{
			var value = (key in updatedFields) ? updatedFields[key] : oldRecord[key];
			newRecord[key] = value;
		}
		return newRecord;
	}


	// MOUSE COORDINATES

	function getXY(e)
	{
		var posx = 0;
		var posy = 0;
		if (e.pageX || e.pageY)
		{
			posx = e.pageX;
			posy = e.pageY;
		}
		else if (e.clientX || e.clientY)
		{
			posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}

		if (localRuntime.isEmbed())
		{
			var rect = localRuntime.node.getBoundingClientRect();
			var relx = rect.left + document.body.scrollLeft + document.documentElement.scrollLeft;
			var rely = rect.top + document.body.scrollTop + document.documentElement.scrollTop;
			// TODO: figure out if there is a way to avoid rounding here
			posx = posx - Math.round(relx) - localRuntime.node.clientLeft;
			posy = posy - Math.round(rely) - localRuntime.node.clientTop;
		}
		return Tuple2(posx, posy);
	}


	//// LIST STUFF ////

	var Nil = { ctor: '[]' };

	function Cons(hd, tl)
	{
		return {
			ctor: '::',
			_0: hd,
			_1: tl
		};
	}

	function list(arr)
	{
		var out = Nil;
		for (var i = arr.length; i--; )
		{
			out = Cons(arr[i], out);
		}
		return out;
	}

	function range(lo, hi)
	{
		var list = Nil;
		if (lo <= hi)
		{
			do
			{
				list = Cons(hi, list);
			}
			while (hi-- > lo);
		}
		return list;
	}

	function append(xs, ys)
	{
		// append Strings
		if (typeof xs === 'string')
		{
			return xs + ys;
		}

		// append Text
		if (xs.ctor.slice(0, 5) === 'Text:')
		{
			return {
				ctor: 'Text:Append',
				_0: xs,
				_1: ys
			};
		}


		// append Lists
		if (xs.ctor === '[]')
		{
			return ys;
		}
		var root = Cons(xs._0, Nil);
		var curr = root;
		xs = xs._1;
		while (xs.ctor !== '[]')
		{
			curr._1 = Cons(xs._0, Nil);
			xs = xs._1;
			curr = curr._1;
		}
		curr._1 = ys;
		return root;
	}


	// CRASHES

	function crash(moduleName, region)
	{
		return function(message) {
			throw new Error(
				'Ran into a `Debug.crash` in module `' + moduleName + '` ' + regionToString(region) + '\n'
				+ 'The message provided by the code author is:\n\n    '
				+ message
			);
		};
	}

	function crashCase(moduleName, region, value)
	{
		return function(message) {
			throw new Error(
				'Ran into a `Debug.crash` in module `' + moduleName + '`\n\n'
				+ 'This was caused by the `case` expression ' + regionToString(region) + '.\n'
				+ 'One of the branches ended with a crash and the following value got through:\n\n    ' + toString(value) + '\n\n'
				+ 'The message provided by the code author is:\n\n    '
				+ message
			);
		};
	}

	function regionToString(region)
	{
		if (region.start.line == region.end.line)
		{
			return 'on line ' + region.start.line;
		}
		return 'between lines ' + region.start.line + ' and ' + region.end.line;
	}


	// BAD PORTS

	function badPort(expected, received)
	{
		throw new Error(
			'Runtime error when sending values through a port.\n\n'
			+ 'Expecting ' + expected + ' but was given ' + formatValue(received)
		);
	}

	function formatValue(value)
	{
		// Explicity format undefined values as "undefined"
		// because JSON.stringify(undefined) unhelpfully returns ""
		return (value === undefined) ? "undefined" : JSON.stringify(value);
	}


	// TO STRING

	var _Array;
	var Dict;
	var List;

	var toString = function(v)
	{
		var type = typeof v;
		if (type === 'function')
		{
			var name = v.func ? v.func.name : v.name;
			return '<function' + (name === '' ? '' : ': ') + name + '>';
		}
		else if (type === 'boolean')
		{
			return v ? 'True' : 'False';
		}
		else if (type === 'number')
		{
			return v + '';
		}
		else if ((v instanceof String) && v.isChar)
		{
			return '\'' + addSlashes(v, true) + '\'';
		}
		else if (type === 'string')
		{
			return '"' + addSlashes(v, false) + '"';
		}
		else if (type === 'object' && 'ctor' in v)
		{
			if (v.ctor.substring(0, 6) === '_Tuple')
			{
				var output = [];
				for (var k in v)
				{
					if (k === 'ctor') continue;
					output.push(toString(v[k]));
				}
				return '(' + output.join(',') + ')';
			}
			else if (v.ctor === '_Array')
			{
				if (!_Array)
				{
					_Array = Elm.Array.make(localRuntime);
				}
				var list = _Array.toList(v);
				return 'Array.fromList ' + toString(list);
			}
			else if (v.ctor === '::')
			{
				var output = '[' + toString(v._0);
				v = v._1;
				while (v.ctor === '::')
				{
					output += ',' + toString(v._0);
					v = v._1;
				}
				return output + ']';
			}
			else if (v.ctor === '[]')
			{
				return '[]';
			}
			else if (v.ctor === 'RBNode_elm_builtin' || v.ctor === 'RBEmpty_elm_builtin' || v.ctor === 'Set_elm_builtin')
			{
				if (!Dict)
				{
					Dict = Elm.Dict.make(localRuntime);
				}
				var list;
				var name;
				if (v.ctor === 'Set_elm_builtin')
				{
					if (!List)
					{
						List = Elm.List.make(localRuntime);
					}
					name = 'Set';
					list = A2(List.map, function(x) {return x._0; }, Dict.toList(v._0));
				}
				else
				{
					name = 'Dict';
					list = Dict.toList(v);
				}
				return name + '.fromList ' + toString(list);
			}
			else if (v.ctor.slice(0, 5) === 'Text:')
			{
				return '<text>';
			}
			else if (v.ctor === 'Element_elm_builtin')
			{
				return '<element>'
			}
			else if (v.ctor === 'Form_elm_builtin')
			{
				return '<form>'
			}
			else
			{
				var output = '';
				for (var i in v)
				{
					if (i === 'ctor') continue;
					var str = toString(v[i]);
					var parenless = str[0] === '{' || str[0] === '<' || str.indexOf(' ') < 0;
					output += ' ' + (parenless ? str : '(' + str + ')');
				}
				return v.ctor + output;
			}
		}
		else if (type === 'object' && 'notify' in v && 'id' in v)
		{
			return '<signal>';
		}
		else if (type === 'object')
		{
			var output = [];
			for (var k in v)
			{
				output.push(k + ' = ' + toString(v[k]));
			}
			if (output.length === 0)
			{
				return '{}';
			}
			return '{ ' + output.join(', ') + ' }';
		}
		return '<internal structure>';
	};

	function addSlashes(str, isChar)
	{
		var s = str.replace(/\\/g, '\\\\')
				  .replace(/\n/g, '\\n')
				  .replace(/\t/g, '\\t')
				  .replace(/\r/g, '\\r')
				  .replace(/\v/g, '\\v')
				  .replace(/\0/g, '\\0');
		if (isChar)
		{
			return s.replace(/\'/g, '\\\'');
		}
		else
		{
			return s.replace(/\"/g, '\\"');
		}
	}


	return localRuntime.Native.Utils.values = {
		eq: eq,
		cmp: cmp,
		compare: F2(compare),
		Tuple0: Tuple0,
		Tuple2: Tuple2,
		chr: chr,
		txt: txt,
		update: update,
		guid: guid,
		getXY: getXY,

		Nil: Nil,
		Cons: Cons,
		list: list,
		range: range,
		append: F2(append),

		crash: crash,
		crashCase: crashCase,
		badPort: badPort,

		toString: toString
	};
};

Elm.Basics = Elm.Basics || {};
Elm.Basics.make = function (_elm) {
   "use strict";
   _elm.Basics = _elm.Basics || {};
   if (_elm.Basics.values) return _elm.Basics.values;
   var _U = Elm.Native.Utils.make(_elm),$Native$Basics = Elm.Native.Basics.make(_elm),$Native$Utils = Elm.Native.Utils.make(_elm);
   var _op = {};
   var uncurry = F2(function (f,_p0) {    var _p1 = _p0;return A2(f,_p1._0,_p1._1);});
   var curry = F3(function (f,a,b) {    return f({ctor: "_Tuple2",_0: a,_1: b});});
   var flip = F3(function (f,b,a) {    return A2(f,a,b);});
   var snd = function (_p2) {    var _p3 = _p2;return _p3._1;};
   var fst = function (_p4) {    var _p5 = _p4;return _p5._0;};
   var always = F2(function (a,_p6) {    return a;});
   var identity = function (x) {    return x;};
   _op["<|"] = F2(function (f,x) {    return f(x);});
   _op["|>"] = F2(function (x,f) {    return f(x);});
   _op[">>"] = F3(function (f,g,x) {    return g(f(x));});
   _op["<<"] = F3(function (g,f,x) {    return g(f(x));});
   _op["++"] = $Native$Utils.append;
   var toString = $Native$Utils.toString;
   var isInfinite = $Native$Basics.isInfinite;
   var isNaN = $Native$Basics.isNaN;
   var toFloat = $Native$Basics.toFloat;
   var ceiling = $Native$Basics.ceiling;
   var floor = $Native$Basics.floor;
   var truncate = $Native$Basics.truncate;
   var round = $Native$Basics.round;
   var not = $Native$Basics.not;
   var xor = $Native$Basics.xor;
   _op["||"] = $Native$Basics.or;
   _op["&&"] = $Native$Basics.and;
   var max = $Native$Basics.max;
   var min = $Native$Basics.min;
   var GT = {ctor: "GT"};
   var EQ = {ctor: "EQ"};
   var LT = {ctor: "LT"};
   var compare = $Native$Basics.compare;
   _op[">="] = $Native$Basics.ge;
   _op["<="] = $Native$Basics.le;
   _op[">"] = $Native$Basics.gt;
   _op["<"] = $Native$Basics.lt;
   _op["/="] = $Native$Basics.neq;
   _op["=="] = $Native$Basics.eq;
   var e = $Native$Basics.e;
   var pi = $Native$Basics.pi;
   var clamp = $Native$Basics.clamp;
   var logBase = $Native$Basics.logBase;
   var abs = $Native$Basics.abs;
   var negate = $Native$Basics.negate;
   var sqrt = $Native$Basics.sqrt;
   var atan2 = $Native$Basics.atan2;
   var atan = $Native$Basics.atan;
   var asin = $Native$Basics.asin;
   var acos = $Native$Basics.acos;
   var tan = $Native$Basics.tan;
   var sin = $Native$Basics.sin;
   var cos = $Native$Basics.cos;
   _op["^"] = $Native$Basics.exp;
   _op["%"] = $Native$Basics.mod;
   var rem = $Native$Basics.rem;
   _op["//"] = $Native$Basics.div;
   _op["/"] = $Native$Basics.floatDiv;
   _op["*"] = $Native$Basics.mul;
   _op["-"] = $Native$Basics.sub;
   _op["+"] = $Native$Basics.add;
   var toPolar = $Native$Basics.toPolar;
   var fromPolar = $Native$Basics.fromPolar;
   var turns = $Native$Basics.turns;
   var degrees = $Native$Basics.degrees;
   var radians = function (t) {    return t;};
   return _elm.Basics.values = {_op: _op
                               ,max: max
                               ,min: min
                               ,compare: compare
                               ,not: not
                               ,xor: xor
                               ,rem: rem
                               ,negate: negate
                               ,abs: abs
                               ,sqrt: sqrt
                               ,clamp: clamp
                               ,logBase: logBase
                               ,e: e
                               ,pi: pi
                               ,cos: cos
                               ,sin: sin
                               ,tan: tan
                               ,acos: acos
                               ,asin: asin
                               ,atan: atan
                               ,atan2: atan2
                               ,round: round
                               ,floor: floor
                               ,ceiling: ceiling
                               ,truncate: truncate
                               ,toFloat: toFloat
                               ,degrees: degrees
                               ,radians: radians
                               ,turns: turns
                               ,toPolar: toPolar
                               ,fromPolar: fromPolar
                               ,isNaN: isNaN
                               ,isInfinite: isInfinite
                               ,toString: toString
                               ,fst: fst
                               ,snd: snd
                               ,identity: identity
                               ,always: always
                               ,flip: flip
                               ,curry: curry
                               ,uncurry: uncurry
                               ,LT: LT
                               ,EQ: EQ
                               ,GT: GT};
};
Elm.Maybe = Elm.Maybe || {};
Elm.Maybe.make = function (_elm) {
   "use strict";
   _elm.Maybe = _elm.Maybe || {};
   if (_elm.Maybe.values) return _elm.Maybe.values;
   var _U = Elm.Native.Utils.make(_elm);
   var _op = {};
   var withDefault = F2(function ($default,maybe) {    var _p0 = maybe;if (_p0.ctor === "Just") {    return _p0._0;} else {    return $default;}});
   var Nothing = {ctor: "Nothing"};
   var oneOf = function (maybes) {
      oneOf: while (true) {
         var _p1 = maybes;
         if (_p1.ctor === "[]") {
               return Nothing;
            } else {
               var _p3 = _p1._0;
               var _p2 = _p3;
               if (_p2.ctor === "Nothing") {
                     var _v3 = _p1._1;
                     maybes = _v3;
                     continue oneOf;
                  } else {
                     return _p3;
                  }
            }
      }
   };
   var andThen = F2(function (maybeValue,callback) {
      var _p4 = maybeValue;
      if (_p4.ctor === "Just") {
            return callback(_p4._0);
         } else {
            return Nothing;
         }
   });
   var Just = function (a) {    return {ctor: "Just",_0: a};};
   var map = F2(function (f,maybe) {    var _p5 = maybe;if (_p5.ctor === "Just") {    return Just(f(_p5._0));} else {    return Nothing;}});
   var map2 = F3(function (func,ma,mb) {
      var _p6 = {ctor: "_Tuple2",_0: ma,_1: mb};
      if (_p6.ctor === "_Tuple2" && _p6._0.ctor === "Just" && _p6._1.ctor === "Just") {
            return Just(A2(func,_p6._0._0,_p6._1._0));
         } else {
            return Nothing;
         }
   });
   var map3 = F4(function (func,ma,mb,mc) {
      var _p7 = {ctor: "_Tuple3",_0: ma,_1: mb,_2: mc};
      if (_p7.ctor === "_Tuple3" && _p7._0.ctor === "Just" && _p7._1.ctor === "Just" && _p7._2.ctor === "Just") {
            return Just(A3(func,_p7._0._0,_p7._1._0,_p7._2._0));
         } else {
            return Nothing;
         }
   });
   var map4 = F5(function (func,ma,mb,mc,md) {
      var _p8 = {ctor: "_Tuple4",_0: ma,_1: mb,_2: mc,_3: md};
      if (_p8.ctor === "_Tuple4" && _p8._0.ctor === "Just" && _p8._1.ctor === "Just" && _p8._2.ctor === "Just" && _p8._3.ctor === "Just") {
            return Just(A4(func,_p8._0._0,_p8._1._0,_p8._2._0,_p8._3._0));
         } else {
            return Nothing;
         }
   });
   var map5 = F6(function (func,ma,mb,mc,md,me) {
      var _p9 = {ctor: "_Tuple5",_0: ma,_1: mb,_2: mc,_3: md,_4: me};
      if (_p9.ctor === "_Tuple5" && _p9._0.ctor === "Just" && _p9._1.ctor === "Just" && _p9._2.ctor === "Just" && _p9._3.ctor === "Just" && _p9._4.ctor === "Just")
      {
            return Just(A5(func,_p9._0._0,_p9._1._0,_p9._2._0,_p9._3._0,_p9._4._0));
         } else {
            return Nothing;
         }
   });
   return _elm.Maybe.values = {_op: _op
                              ,andThen: andThen
                              ,map: map
                              ,map2: map2
                              ,map3: map3
                              ,map4: map4
                              ,map5: map5
                              ,withDefault: withDefault
                              ,oneOf: oneOf
                              ,Just: Just
                              ,Nothing: Nothing};
};
Elm.Native.List = {};
Elm.Native.List.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.List = localRuntime.Native.List || {};
	if (localRuntime.Native.List.values)
	{
		return localRuntime.Native.List.values;
	}
	if ('values' in Elm.Native.List)
	{
		return localRuntime.Native.List.values = Elm.Native.List.values;
	}

	var Utils = Elm.Native.Utils.make(localRuntime);

	var Nil = Utils.Nil;
	var Cons = Utils.Cons;

	var fromArray = Utils.list;

	function toArray(xs)
	{
		var out = [];
		while (xs.ctor !== '[]')
		{
			out.push(xs._0);
			xs = xs._1;
		}
		return out;
	}

	// f defined similarly for both foldl and foldr (NB: different from Haskell)
	// ie, foldl : (a -> b -> b) -> b -> [a] -> b
	function foldl(f, b, xs)
	{
		var acc = b;
		while (xs.ctor !== '[]')
		{
			acc = A2(f, xs._0, acc);
			xs = xs._1;
		}
		return acc;
	}

	function foldr(f, b, xs)
	{
		var arr = toArray(xs);
		var acc = b;
		for (var i = arr.length; i--; )
		{
			acc = A2(f, arr[i], acc);
		}
		return acc;
	}

	function map2(f, xs, ys)
	{
		var arr = [];
		while (xs.ctor !== '[]' && ys.ctor !== '[]')
		{
			arr.push(A2(f, xs._0, ys._0));
			xs = xs._1;
			ys = ys._1;
		}
		return fromArray(arr);
	}

	function map3(f, xs, ys, zs)
	{
		var arr = [];
		while (xs.ctor !== '[]' && ys.ctor !== '[]' && zs.ctor !== '[]')
		{
			arr.push(A3(f, xs._0, ys._0, zs._0));
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function map4(f, ws, xs, ys, zs)
	{
		var arr = [];
		while (   ws.ctor !== '[]'
			   && xs.ctor !== '[]'
			   && ys.ctor !== '[]'
			   && zs.ctor !== '[]')
		{
			arr.push(A4(f, ws._0, xs._0, ys._0, zs._0));
			ws = ws._1;
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function map5(f, vs, ws, xs, ys, zs)
	{
		var arr = [];
		while (   vs.ctor !== '[]'
			   && ws.ctor !== '[]'
			   && xs.ctor !== '[]'
			   && ys.ctor !== '[]'
			   && zs.ctor !== '[]')
		{
			arr.push(A5(f, vs._0, ws._0, xs._0, ys._0, zs._0));
			vs = vs._1;
			ws = ws._1;
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function sortBy(f, xs)
	{
		return fromArray(toArray(xs).sort(function(a, b) {
			return Utils.cmp(f(a), f(b));
		}));
	}

	function sortWith(f, xs)
	{
		return fromArray(toArray(xs).sort(function(a, b) {
			var ord = f(a)(b).ctor;
			return ord === 'EQ' ? 0 : ord === 'LT' ? -1 : 1;
		}));
	}

	function take(n, xs)
	{
		var arr = [];
		while (xs.ctor !== '[]' && n > 0)
		{
			arr.push(xs._0);
			xs = xs._1;
			--n;
		}
		return fromArray(arr);
	}


	Elm.Native.List.values = {
		Nil: Nil,
		Cons: Cons,
		cons: F2(Cons),
		toArray: toArray,
		fromArray: fromArray,

		foldl: F3(foldl),
		foldr: F3(foldr),

		map2: F3(map2),
		map3: F4(map3),
		map4: F5(map4),
		map5: F6(map5),
		sortBy: F2(sortBy),
		sortWith: F2(sortWith),
		take: F2(take)
	};
	return localRuntime.Native.List.values = Elm.Native.List.values;
};

Elm.List = Elm.List || {};
Elm.List.make = function (_elm) {
   "use strict";
   _elm.List = _elm.List || {};
   if (_elm.List.values) return _elm.List.values;
   var _U = Elm.Native.Utils.make(_elm),$Basics = Elm.Basics.make(_elm),$Maybe = Elm.Maybe.make(_elm),$Native$List = Elm.Native.List.make(_elm);
   var _op = {};
   var sortWith = $Native$List.sortWith;
   var sortBy = $Native$List.sortBy;
   var sort = function (xs) {    return A2(sortBy,$Basics.identity,xs);};
   var drop = F2(function (n,list) {
      drop: while (true) if (_U.cmp(n,0) < 1) return list; else {
            var _p0 = list;
            if (_p0.ctor === "[]") {
                  return list;
               } else {
                  var _v1 = n - 1,_v2 = _p0._1;
                  n = _v1;
                  list = _v2;
                  continue drop;
               }
         }
   });
   var take = $Native$List.take;
   var map5 = $Native$List.map5;
   var map4 = $Native$List.map4;
   var map3 = $Native$List.map3;
   var map2 = $Native$List.map2;
   var any = F2(function (isOkay,list) {
      any: while (true) {
         var _p1 = list;
         if (_p1.ctor === "[]") {
               return false;
            } else {
               if (isOkay(_p1._0)) return true; else {
                     var _v4 = isOkay,_v5 = _p1._1;
                     isOkay = _v4;
                     list = _v5;
                     continue any;
                  }
            }
      }
   });
   var all = F2(function (isOkay,list) {    return $Basics.not(A2(any,function (_p2) {    return $Basics.not(isOkay(_p2));},list));});
   var foldr = $Native$List.foldr;
   var foldl = $Native$List.foldl;
   var length = function (xs) {    return A3(foldl,F2(function (_p3,i) {    return i + 1;}),0,xs);};
   var sum = function (numbers) {    return A3(foldl,F2(function (x,y) {    return x + y;}),0,numbers);};
   var product = function (numbers) {    return A3(foldl,F2(function (x,y) {    return x * y;}),1,numbers);};
   var maximum = function (list) {
      var _p4 = list;
      if (_p4.ctor === "::") {
            return $Maybe.Just(A3(foldl,$Basics.max,_p4._0,_p4._1));
         } else {
            return $Maybe.Nothing;
         }
   };
   var minimum = function (list) {
      var _p5 = list;
      if (_p5.ctor === "::") {
            return $Maybe.Just(A3(foldl,$Basics.min,_p5._0,_p5._1));
         } else {
            return $Maybe.Nothing;
         }
   };
   var indexedMap = F2(function (f,xs) {    return A3(map2,f,_U.range(0,length(xs) - 1),xs);});
   var member = F2(function (x,xs) {    return A2(any,function (a) {    return _U.eq(a,x);},xs);});
   var isEmpty = function (xs) {    var _p6 = xs;if (_p6.ctor === "[]") {    return true;} else {    return false;}};
   var tail = function (list) {    var _p7 = list;if (_p7.ctor === "::") {    return $Maybe.Just(_p7._1);} else {    return $Maybe.Nothing;}};
   var head = function (list) {    var _p8 = list;if (_p8.ctor === "::") {    return $Maybe.Just(_p8._0);} else {    return $Maybe.Nothing;}};
   _op["::"] = $Native$List.cons;
   var map = F2(function (f,xs) {    return A3(foldr,F2(function (x,acc) {    return A2(_op["::"],f(x),acc);}),_U.list([]),xs);});
   var filter = F2(function (pred,xs) {
      var conditionalCons = F2(function (x,xs$) {    return pred(x) ? A2(_op["::"],x,xs$) : xs$;});
      return A3(foldr,conditionalCons,_U.list([]),xs);
   });
   var maybeCons = F3(function (f,mx,xs) {    var _p9 = f(mx);if (_p9.ctor === "Just") {    return A2(_op["::"],_p9._0,xs);} else {    return xs;}});
   var filterMap = F2(function (f,xs) {    return A3(foldr,maybeCons(f),_U.list([]),xs);});
   var reverse = function (list) {    return A3(foldl,F2(function (x,y) {    return A2(_op["::"],x,y);}),_U.list([]),list);};
   var scanl = F3(function (f,b,xs) {
      var scan1 = F2(function (x,accAcc) {
         var _p10 = accAcc;
         if (_p10.ctor === "::") {
               return A2(_op["::"],A2(f,x,_p10._0),accAcc);
            } else {
               return _U.list([]);
            }
      });
      return reverse(A3(foldl,scan1,_U.list([b]),xs));
   });
   var append = F2(function (xs,ys) {
      var _p11 = ys;
      if (_p11.ctor === "[]") {
            return xs;
         } else {
            return A3(foldr,F2(function (x,y) {    return A2(_op["::"],x,y);}),ys,xs);
         }
   });
   var concat = function (lists) {    return A3(foldr,append,_U.list([]),lists);};
   var concatMap = F2(function (f,list) {    return concat(A2(map,f,list));});
   var partition = F2(function (pred,list) {
      var step = F2(function (x,_p12) {
         var _p13 = _p12;
         var _p15 = _p13._0;
         var _p14 = _p13._1;
         return pred(x) ? {ctor: "_Tuple2",_0: A2(_op["::"],x,_p15),_1: _p14} : {ctor: "_Tuple2",_0: _p15,_1: A2(_op["::"],x,_p14)};
      });
      return A3(foldr,step,{ctor: "_Tuple2",_0: _U.list([]),_1: _U.list([])},list);
   });
   var unzip = function (pairs) {
      var step = F2(function (_p17,_p16) {
         var _p18 = _p17;
         var _p19 = _p16;
         return {ctor: "_Tuple2",_0: A2(_op["::"],_p18._0,_p19._0),_1: A2(_op["::"],_p18._1,_p19._1)};
      });
      return A3(foldr,step,{ctor: "_Tuple2",_0: _U.list([]),_1: _U.list([])},pairs);
   };
   var intersperse = F2(function (sep,xs) {
      var _p20 = xs;
      if (_p20.ctor === "[]") {
            return _U.list([]);
         } else {
            var step = F2(function (x,rest) {    return A2(_op["::"],sep,A2(_op["::"],x,rest));});
            var spersed = A3(foldr,step,_U.list([]),_p20._1);
            return A2(_op["::"],_p20._0,spersed);
         }
   });
   var repeatHelp = F3(function (result,n,value) {
      repeatHelp: while (true) if (_U.cmp(n,0) < 1) return result; else {
            var _v18 = A2(_op["::"],value,result),_v19 = n - 1,_v20 = value;
            result = _v18;
            n = _v19;
            value = _v20;
            continue repeatHelp;
         }
   });
   var repeat = F2(function (n,value) {    return A3(repeatHelp,_U.list([]),n,value);});
   return _elm.List.values = {_op: _op
                             ,isEmpty: isEmpty
                             ,length: length
                             ,reverse: reverse
                             ,member: member
                             ,head: head
                             ,tail: tail
                             ,filter: filter
                             ,take: take
                             ,drop: drop
                             ,repeat: repeat
                             ,append: append
                             ,concat: concat
                             ,intersperse: intersperse
                             ,partition: partition
                             ,unzip: unzip
                             ,map: map
                             ,map2: map2
                             ,map3: map3
                             ,map4: map4
                             ,map5: map5
                             ,filterMap: filterMap
                             ,concatMap: concatMap
                             ,indexedMap: indexedMap
                             ,foldr: foldr
                             ,foldl: foldl
                             ,sum: sum
                             ,product: product
                             ,maximum: maximum
                             ,minimum: minimum
                             ,all: all
                             ,any: any
                             ,scanl: scanl
                             ,sort: sort
                             ,sortBy: sortBy
                             ,sortWith: sortWith};
};
Elm.Native.Transform2D = {};
Elm.Native.Transform2D.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Transform2D = localRuntime.Native.Transform2D || {};
	if (localRuntime.Native.Transform2D.values)
	{
		return localRuntime.Native.Transform2D.values;
	}

	var A;
	if (typeof Float32Array === 'undefined')
	{
		A = function(arr)
		{
			this.length = arr.length;
			this[0] = arr[0];
			this[1] = arr[1];
			this[2] = arr[2];
			this[3] = arr[3];
			this[4] = arr[4];
			this[5] = arr[5];
		};
	}
	else
	{
		A = Float32Array;
	}

	// layout of matrix in an array is
	//
	//   | m11 m12 dx |
	//   | m21 m22 dy |
	//   |  0   0   1 |
	//
	//  new A([ m11, m12, dx, m21, m22, dy ])

	var identity = new A([1, 0, 0, 0, 1, 0]);
	function matrix(m11, m12, m21, m22, dx, dy)
	{
		return new A([m11, m12, dx, m21, m22, dy]);
	}

	function rotation(t)
	{
		var c = Math.cos(t);
		var s = Math.sin(t);
		return new A([c, -s, 0, s, c, 0]);
	}

	function rotate(t, m)
	{
		var c = Math.cos(t);
		var s = Math.sin(t);
		var m11 = m[0], m12 = m[1], m21 = m[3], m22 = m[4];
		return new A([m11 * c + m12 * s, -m11 * s + m12 * c, m[2],
					  m21 * c + m22 * s, -m21 * s + m22 * c, m[5]]);
	}
	/*
	function move(xy,m) {
		var x = xy._0;
		var y = xy._1;
		var m11 = m[0], m12 = m[1], m21 = m[3], m22 = m[4];
		return new A([m11, m12, m11*x + m12*y + m[2],
					  m21, m22, m21*x + m22*y + m[5]]);
	}
	function scale(s,m) { return new A([m[0]*s, m[1]*s, m[2], m[3]*s, m[4]*s, m[5]]); }
	function scaleX(x,m) { return new A([m[0]*x, m[1], m[2], m[3]*x, m[4], m[5]]); }
	function scaleY(y,m) { return new A([m[0], m[1]*y, m[2], m[3], m[4]*y, m[5]]); }
	function reflectX(m) { return new A([-m[0], m[1], m[2], -m[3], m[4], m[5]]); }
	function reflectY(m) { return new A([m[0], -m[1], m[2], m[3], -m[4], m[5]]); }

	function transform(m11, m21, m12, m22, mdx, mdy, n) {
		var n11 = n[0], n12 = n[1], n21 = n[3], n22 = n[4], ndx = n[2], ndy = n[5];
		return new A([m11*n11 + m12*n21,
					  m11*n12 + m12*n22,
					  m11*ndx + m12*ndy + mdx,
					  m21*n11 + m22*n21,
					  m21*n12 + m22*n22,
					  m21*ndx + m22*ndy + mdy]);
	}
	*/
	function multiply(m, n)
	{
		var m11 = m[0], m12 = m[1], m21 = m[3], m22 = m[4], mdx = m[2], mdy = m[5];
		var n11 = n[0], n12 = n[1], n21 = n[3], n22 = n[4], ndx = n[2], ndy = n[5];
		return new A([m11 * n11 + m12 * n21,
					  m11 * n12 + m12 * n22,
					  m11 * ndx + m12 * ndy + mdx,
					  m21 * n11 + m22 * n21,
					  m21 * n12 + m22 * n22,
					  m21 * ndx + m22 * ndy + mdy]);
	}

	return localRuntime.Native.Transform2D.values = {
		identity: identity,
		matrix: F6(matrix),
		rotation: rotation,
		multiply: F2(multiply)
		/*
		transform: F7(transform),
		rotate: F2(rotate),
		move: F2(move),
		scale: F2(scale),
		scaleX: F2(scaleX),
		scaleY: F2(scaleY),
		reflectX: reflectX,
		reflectY: reflectY
		*/
	};
};

Elm.Transform2D = Elm.Transform2D || {};
Elm.Transform2D.make = function (_elm) {
   "use strict";
   _elm.Transform2D = _elm.Transform2D || {};
   if (_elm.Transform2D.values) return _elm.Transform2D.values;
   var _U = Elm.Native.Utils.make(_elm),$Native$Transform2D = Elm.Native.Transform2D.make(_elm);
   var _op = {};
   var multiply = $Native$Transform2D.multiply;
   var rotation = $Native$Transform2D.rotation;
   var matrix = $Native$Transform2D.matrix;
   var translation = F2(function (x,y) {    return A6(matrix,1,0,0,1,x,y);});
   var scale = function (s) {    return A6(matrix,s,0,0,s,0,0);};
   var scaleX = function (x) {    return A6(matrix,x,0,0,1,0,0);};
   var scaleY = function (y) {    return A6(matrix,1,0,0,y,0,0);};
   var identity = $Native$Transform2D.identity;
   var Transform2D = {ctor: "Transform2D"};
   return _elm.Transform2D.values = {_op: _op
                                    ,identity: identity
                                    ,matrix: matrix
                                    ,multiply: multiply
                                    ,rotation: rotation
                                    ,translation: translation
                                    ,scale: scale
                                    ,scaleX: scaleX
                                    ,scaleY: scaleY};
};

// setup
Elm.Native = Elm.Native || {};
Elm.Native.Graphics = Elm.Native.Graphics || {};
Elm.Native.Graphics.Collage = Elm.Native.Graphics.Collage || {};

// definition
Elm.Native.Graphics.Collage.make = function(localRuntime) {
	'use strict';

	// attempt to short-circuit
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Graphics = localRuntime.Native.Graphics || {};
	localRuntime.Native.Graphics.Collage = localRuntime.Native.Graphics.Collage || {};
	if ('values' in localRuntime.Native.Graphics.Collage)
	{
		return localRuntime.Native.Graphics.Collage.values;
	}

	// okay, we cannot short-ciruit, so now we define everything
	var Color = Elm.Native.Color.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);
	var NativeElement = Elm.Native.Graphics.Element.make(localRuntime);
	var Transform = Elm.Transform2D.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);

	function setStrokeStyle(ctx, style)
	{
		ctx.lineWidth = style.width;

		var cap = style.cap.ctor;
		ctx.lineCap = cap === 'Flat'
			? 'butt'
			: cap === 'Round'
				? 'round'
				: 'square';

		var join = style.join.ctor;
		ctx.lineJoin = join === 'Smooth'
			? 'round'
			: join === 'Sharp'
				? 'miter'
				: 'bevel';

		ctx.miterLimit = style.join._0 || 10;
		ctx.strokeStyle = Color.toCss(style.color);
	}

	function setFillStyle(redo, ctx, style)
	{
		var sty = style.ctor;
		ctx.fillStyle = sty === 'Solid'
			? Color.toCss(style._0)
			: sty === 'Texture'
				? texture(redo, ctx, style._0)
				: gradient(ctx, style._0);
	}

	function trace(ctx, path)
	{
		var points = List.toArray(path);
		var i = points.length - 1;
		if (i <= 0)
		{
			return;
		}
		ctx.moveTo(points[i]._0, points[i]._1);
		while (i--)
		{
			ctx.lineTo(points[i]._0, points[i]._1);
		}
		if (path.closed)
		{
			i = points.length - 1;
			ctx.lineTo(points[i]._0, points[i]._1);
		}
	}

	function line(ctx, style, path)
	{
		if (style.dashing.ctor === '[]')
		{
			trace(ctx, path);
		}
		else
		{
			customLineHelp(ctx, style, path);
		}
		ctx.scale(1, -1);
		ctx.stroke();
	}

	function customLineHelp(ctx, style, path)
	{
		var points = List.toArray(path);
		if (path.closed)
		{
			points.push(points[0]);
		}
		var pattern = List.toArray(style.dashing);
		var i = points.length - 1;
		if (i <= 0)
		{
			return;
		}
		var x0 = points[i]._0, y0 = points[i]._1;
		var x1 = 0, y1 = 0, dx = 0, dy = 0, remaining = 0;
		var pindex = 0, plen = pattern.length;
		var draw = true, segmentLength = pattern[0];
		ctx.moveTo(x0, y0);
		while (i--)
		{
			x1 = points[i]._0;
			y1 = points[i]._1;
			dx = x1 - x0;
			dy = y1 - y0;
			remaining = Math.sqrt(dx * dx + dy * dy);
			while (segmentLength <= remaining)
			{
				x0 += dx * segmentLength / remaining;
				y0 += dy * segmentLength / remaining;
				ctx[draw ? 'lineTo' : 'moveTo'](x0, y0);
				// update starting position
				dx = x1 - x0;
				dy = y1 - y0;
				remaining = Math.sqrt(dx * dx + dy * dy);
				// update pattern
				draw = !draw;
				pindex = (pindex + 1) % plen;
				segmentLength = pattern[pindex];
			}
			if (remaining > 0)
			{
				ctx[draw ? 'lineTo' : 'moveTo'](x1, y1);
				segmentLength -= remaining;
			}
			x0 = x1;
			y0 = y1;
		}
	}

	function drawLine(ctx, style, path)
	{
		setStrokeStyle(ctx, style);
		return line(ctx, style, path);
	}

	function texture(redo, ctx, src)
	{
		var img = new Image();
		img.src = src;
		img.onload = redo;
		return ctx.createPattern(img, 'repeat');
	}

	function gradient(ctx, grad)
	{
		var g;
		var stops = [];
		if (grad.ctor === 'Linear')
		{
			var p0 = grad._0, p1 = grad._1;
			g = ctx.createLinearGradient(p0._0, -p0._1, p1._0, -p1._1);
			stops = List.toArray(grad._2);
		}
		else
		{
			var p0 = grad._0, p2 = grad._2;
			g = ctx.createRadialGradient(p0._0, -p0._1, grad._1, p2._0, -p2._1, grad._3);
			stops = List.toArray(grad._4);
		}
		var len = stops.length;
		for (var i = 0; i < len; ++i)
		{
			var stop = stops[i];
			g.addColorStop(stop._0, Color.toCss(stop._1));
		}
		return g;
	}

	function drawShape(redo, ctx, style, path)
	{
		trace(ctx, path);
		setFillStyle(redo, ctx, style);
		ctx.scale(1, -1);
		ctx.fill();
	}


	// TEXT RENDERING

	function fillText(redo, ctx, text)
	{
		drawText(ctx, text, ctx.fillText);
	}

	function strokeText(redo, ctx, style, text)
	{
		setStrokeStyle(ctx, style);
		// Use native canvas API for dashes only for text for now
		// Degrades to non-dashed on IE 9 + 10
		if (style.dashing.ctor !== '[]' && ctx.setLineDash)
		{
			var pattern = List.toArray(style.dashing);
			ctx.setLineDash(pattern);
		}
		drawText(ctx, text, ctx.strokeText);
	}

	function drawText(ctx, text, canvasDrawFn)
	{
		var textChunks = chunkText(defaultContext, text);

		var totalWidth = 0;
		var maxHeight = 0;
		var numChunks = textChunks.length;

		ctx.scale(1,-1);

		for (var i = numChunks; i--; )
		{
			var chunk = textChunks[i];
			ctx.font = chunk.font;
			var metrics = ctx.measureText(chunk.text);
			chunk.width = metrics.width;
			totalWidth += chunk.width;
			if (chunk.height > maxHeight)
			{
				maxHeight = chunk.height;
			}
		}

		var x = -totalWidth / 2.0;
		for (var i = 0; i < numChunks; ++i)
		{
			var chunk = textChunks[i];
			ctx.font = chunk.font;
			ctx.fillStyle = chunk.color;
			canvasDrawFn.call(ctx, chunk.text, x, maxHeight / 2);
			x += chunk.width;
		}
	}

	function toFont(props)
	{
		return [
			props['font-style'],
			props['font-variant'],
			props['font-weight'],
			props['font-size'],
			props['font-family']
		].join(' ');
	}


	// Convert the object returned by the text module
	// into something we can use for styling canvas text
	function chunkText(context, text)
	{
		var tag = text.ctor;
		if (tag === 'Text:Append')
		{
			var leftChunks = chunkText(context, text._0);
			var rightChunks = chunkText(context, text._1);
			return leftChunks.concat(rightChunks);
		}
		if (tag === 'Text:Text')
		{
			return [{
				text: text._0,
				color: context.color,
				height: context['font-size'].slice(0, -2) | 0,
				font: toFont(context)
			}];
		}
		if (tag === 'Text:Meta')
		{
			var newContext = freshContext(text._0, context);
			return chunkText(newContext, text._1);
		}
	}

	function freshContext(props, ctx)
	{
		return {
			'font-style': props['font-style'] || ctx['font-style'],
			'font-variant': props['font-variant'] || ctx['font-variant'],
			'font-weight': props['font-weight'] || ctx['font-weight'],
			'font-size': props['font-size'] || ctx['font-size'],
			'font-family': props['font-family'] || ctx['font-family'],
			'color': props['color'] || ctx['color']
		};
	}

	var defaultContext = {
		'font-style': 'normal',
		'font-variant': 'normal',
		'font-weight': 'normal',
		'font-size': '12px',
		'font-family': 'sans-serif',
		'color': 'black'
	};


	// IMAGES

	function drawImage(redo, ctx, form)
	{
		var img = new Image();
		img.onload = redo;
		img.src = form._3;
		var w = form._0,
			h = form._1,
			pos = form._2,
			srcX = pos._0,
			srcY = pos._1,
			srcW = w,
			srcH = h,
			destX = -w / 2,
			destY = -h / 2,
			destW = w,
			destH = h;

		ctx.scale(1, -1);
		ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
	}

	function renderForm(redo, ctx, form)
	{
		ctx.save();

		var x = form.x,
			y = form.y,
			theta = form.theta,
			scale = form.scale;

		if (x !== 0 || y !== 0)
		{
			ctx.translate(x, y);
		}
		if (theta !== 0)
		{
			ctx.rotate(theta % (Math.PI * 2));
		}
		if (scale !== 1)
		{
			ctx.scale(scale, scale);
		}
		if (form.alpha !== 1)
		{
			ctx.globalAlpha = ctx.globalAlpha * form.alpha;
		}

		ctx.beginPath();
		var f = form.form;
		switch (f.ctor)
		{
			case 'FPath':
				drawLine(ctx, f._0, f._1);
				break;

			case 'FImage':
				drawImage(redo, ctx, f);
				break;

			case 'FShape':
				if (f._0.ctor === 'Line')
				{
					f._1.closed = true;
					drawLine(ctx, f._0._0, f._1);
				}
				else
				{
					drawShape(redo, ctx, f._0._0, f._1);
				}
				break;

			case 'FText':
				fillText(redo, ctx, f._0);
				break;

			case 'FOutlinedText':
				strokeText(redo, ctx, f._0, f._1);
				break;
		}
		ctx.restore();
	}

	function formToMatrix(form)
	{
	   var scale = form.scale;
	   var matrix = A6( Transform.matrix, scale, 0, 0, scale, form.x, form.y );

	   var theta = form.theta;
	   if (theta !== 0)
	   {
		   matrix = A2( Transform.multiply, matrix, Transform.rotation(theta) );
	   }

	   return matrix;
	}

	function str(n)
	{
		if (n < 0.00001 && n > -0.00001)
		{
			return 0;
		}
		return n;
	}

	function makeTransform(w, h, form, matrices)
	{
		var props = form.form._0._0.props;
		var m = A6( Transform.matrix, 1, 0, 0, -1,
					(w - props.width ) / 2,
					(h - props.height) / 2 );
		var len = matrices.length;
		for (var i = 0; i < len; ++i)
		{
			m = A2( Transform.multiply, m, matrices[i] );
		}
		m = A2( Transform.multiply, m, formToMatrix(form) );

		return 'matrix(' +
			str( m[0]) + ', ' + str( m[3]) + ', ' +
			str(-m[1]) + ', ' + str(-m[4]) + ', ' +
			str( m[2]) + ', ' + str( m[5]) + ')';
	}

	function stepperHelp(list)
	{
		var arr = List.toArray(list);
		var i = 0;
		function peekNext()
		{
			return i < arr.length ? arr[i]._0.form.ctor : '';
		}
		// assumes that there is a next element
		function next()
		{
			var out = arr[i]._0;
			++i;
			return out;
		}
		return {
			peekNext: peekNext,
			next: next
		};
	}

	function formStepper(forms)
	{
		var ps = [stepperHelp(forms)];
		var matrices = [];
		var alphas = [];
		function peekNext()
		{
			var len = ps.length;
			var formType = '';
			for (var i = 0; i < len; ++i )
			{
				if (formType = ps[i].peekNext()) return formType;
			}
			return '';
		}
		// assumes that there is a next element
		function next(ctx)
		{
			while (!ps[0].peekNext())
			{
				ps.shift();
				matrices.pop();
				alphas.shift();
				if (ctx)
				{
					ctx.restore();
				}
			}
			var out = ps[0].next();
			var f = out.form;
			if (f.ctor === 'FGroup')
			{
				ps.unshift(stepperHelp(f._1));
				var m = A2(Transform.multiply, f._0, formToMatrix(out));
				ctx.save();
				ctx.transform(m[0], m[3], m[1], m[4], m[2], m[5]);
				matrices.push(m);

				var alpha = (alphas[0] || 1) * out.alpha;
				alphas.unshift(alpha);
				ctx.globalAlpha = alpha;
			}
			return out;
		}
		function transforms()
		{
			return matrices;
		}
		function alpha()
		{
			return alphas[0] || 1;
		}
		return {
			peekNext: peekNext,
			next: next,
			transforms: transforms,
			alpha: alpha
		};
	}

	function makeCanvas(w, h)
	{
		var canvas = NativeElement.createNode('canvas');
		canvas.style.width  = w + 'px';
		canvas.style.height = h + 'px';
		canvas.style.display = 'block';
		canvas.style.position = 'absolute';
		var ratio = window.devicePixelRatio || 1;
		canvas.width  = w * ratio;
		canvas.height = h * ratio;
		return canvas;
	}

	function render(model)
	{
		var div = NativeElement.createNode('div');
		div.style.overflow = 'hidden';
		div.style.position = 'relative';
		update(div, model, model);
		return div;
	}

	function nodeStepper(w, h, div)
	{
		var kids = div.childNodes;
		var i = 0;
		var ratio = window.devicePixelRatio || 1;

		function transform(transforms, ctx)
		{
			ctx.translate( w / 2 * ratio, h / 2 * ratio );
			ctx.scale( ratio, -ratio );
			var len = transforms.length;
			for (var i = 0; i < len; ++i)
			{
				var m = transforms[i];
				ctx.save();
				ctx.transform(m[0], m[3], m[1], m[4], m[2], m[5]);
			}
			return ctx;
		}
		function nextContext(transforms)
		{
			while (i < kids.length)
			{
				var node = kids[i];
				if (node.getContext)
				{
					node.width = w * ratio;
					node.height = h * ratio;
					node.style.width = w + 'px';
					node.style.height = h + 'px';
					++i;
					return transform(transforms, node.getContext('2d'));
				}
				div.removeChild(node);
			}
			var canvas = makeCanvas(w, h);
			div.appendChild(canvas);
			// we have added a new node, so we must step our position
			++i;
			return transform(transforms, canvas.getContext('2d'));
		}
		function addElement(matrices, alpha, form)
		{
			var kid = kids[i];
			var elem = form.form._0;

			var node = (!kid || kid.getContext)
				? NativeElement.render(elem)
				: NativeElement.update(kid, kid.oldElement, elem);

			node.style.position = 'absolute';
			node.style.opacity = alpha * form.alpha * elem._0.props.opacity;
			NativeElement.addTransform(node.style, makeTransform(w, h, form, matrices));
			node.oldElement = elem;
			++i;
			if (!kid)
			{
				div.appendChild(node);
			}
			else
			{
				div.insertBefore(node, kid);
			}
		}
		function clearRest()
		{
			while (i < kids.length)
			{
				div.removeChild(kids[i]);
			}
		}
		return {
			nextContext: nextContext,
			addElement: addElement,
			clearRest: clearRest
		};
	}


	function update(div, _, model)
	{
		var w = model.w;
		var h = model.h;

		var forms = formStepper(model.forms);
		var nodes = nodeStepper(w, h, div);
		var ctx = null;
		var formType = '';

		while (formType = forms.peekNext())
		{
			// make sure we have context if we need it
			if (ctx === null && formType !== 'FElement')
			{
				ctx = nodes.nextContext(forms.transforms());
				ctx.globalAlpha = forms.alpha();
			}

			var form = forms.next(ctx);
			// if it is FGroup, all updates are made within formStepper when next is called.
			if (formType === 'FElement')
			{
				// update or insert an element, get a new context
				nodes.addElement(forms.transforms(), forms.alpha(), form);
				ctx = null;
			}
			else if (formType !== 'FGroup')
			{
				renderForm(function() { update(div, model, model); }, ctx, form);
			}
		}
		nodes.clearRest();
		return div;
	}


	function collage(w, h, forms)
	{
		return A3(NativeElement.newElement, w, h, {
			ctor: 'Custom',
			type: 'Collage',
			render: render,
			update: update,
			model: {w: w, h: h, forms: forms}
		});
	}

	return localRuntime.Native.Graphics.Collage.values = {
		collage: F3(collage)
	};
};

Elm.Native.Color = {};
Elm.Native.Color.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Color = localRuntime.Native.Color || {};
	if (localRuntime.Native.Color.values)
	{
		return localRuntime.Native.Color.values;
	}

	function toCss(c)
	{
		var format = '';
		var colors = '';
		if (c.ctor === 'RGBA')
		{
			format = 'rgb';
			colors = c._0 + ', ' + c._1 + ', ' + c._2;
		}
		else
		{
			format = 'hsl';
			colors = (c._0 * 180 / Math.PI) + ', ' +
					 (c._1 * 100) + '%, ' +
					 (c._2 * 100) + '%';
		}
		if (c._3 === 1)
		{
			return format + '(' + colors + ')';
		}
		else
		{
			return format + 'a(' + colors + ', ' + c._3 + ')';
		}
	}

	return localRuntime.Native.Color.values = {
		toCss: toCss
	};
};

Elm.Color = Elm.Color || {};
Elm.Color.make = function (_elm) {
   "use strict";
   _elm.Color = _elm.Color || {};
   if (_elm.Color.values) return _elm.Color.values;
   var _U = Elm.Native.Utils.make(_elm),$Basics = Elm.Basics.make(_elm);
   var _op = {};
   var Radial = F5(function (a,b,c,d,e) {    return {ctor: "Radial",_0: a,_1: b,_2: c,_3: d,_4: e};});
   var radial = Radial;
   var Linear = F3(function (a,b,c) {    return {ctor: "Linear",_0: a,_1: b,_2: c};});
   var linear = Linear;
   var fmod = F2(function (f,n) {    var integer = $Basics.floor(f);return $Basics.toFloat(A2($Basics._op["%"],integer,n)) + f - $Basics.toFloat(integer);});
   var rgbToHsl = F3(function (red,green,blue) {
      var b = $Basics.toFloat(blue) / 255;
      var g = $Basics.toFloat(green) / 255;
      var r = $Basics.toFloat(red) / 255;
      var cMax = A2($Basics.max,A2($Basics.max,r,g),b);
      var cMin = A2($Basics.min,A2($Basics.min,r,g),b);
      var c = cMax - cMin;
      var lightness = (cMax + cMin) / 2;
      var saturation = _U.eq(lightness,0) ? 0 : c / (1 - $Basics.abs(2 * lightness - 1));
      var hue = $Basics.degrees(60) * (_U.eq(cMax,r) ? A2(fmod,(g - b) / c,6) : _U.eq(cMax,g) ? (b - r) / c + 2 : (r - g) / c + 4);
      return {ctor: "_Tuple3",_0: hue,_1: saturation,_2: lightness};
   });
   var hslToRgb = F3(function (hue,saturation,lightness) {
      var hue$ = hue / $Basics.degrees(60);
      var chroma = (1 - $Basics.abs(2 * lightness - 1)) * saturation;
      var x = chroma * (1 - $Basics.abs(A2(fmod,hue$,2) - 1));
      var _p0 = _U.cmp(hue$,0) < 0 ? {ctor: "_Tuple3",_0: 0,_1: 0,_2: 0} : _U.cmp(hue$,1) < 0 ? {ctor: "_Tuple3",_0: chroma,_1: x,_2: 0} : _U.cmp(hue$,
      2) < 0 ? {ctor: "_Tuple3",_0: x,_1: chroma,_2: 0} : _U.cmp(hue$,3) < 0 ? {ctor: "_Tuple3",_0: 0,_1: chroma,_2: x} : _U.cmp(hue$,4) < 0 ? {ctor: "_Tuple3"
                                                                                                                                               ,_0: 0
                                                                                                                                               ,_1: x
                                                                                                                                               ,_2: chroma} : _U.cmp(hue$,
      5) < 0 ? {ctor: "_Tuple3",_0: x,_1: 0,_2: chroma} : _U.cmp(hue$,6) < 0 ? {ctor: "_Tuple3",_0: chroma,_1: 0,_2: x} : {ctor: "_Tuple3",_0: 0,_1: 0,_2: 0};
      var r = _p0._0;
      var g = _p0._1;
      var b = _p0._2;
      var m = lightness - chroma / 2;
      return {ctor: "_Tuple3",_0: r + m,_1: g + m,_2: b + m};
   });
   var toRgb = function (color) {
      var _p1 = color;
      if (_p1.ctor === "RGBA") {
            return {red: _p1._0,green: _p1._1,blue: _p1._2,alpha: _p1._3};
         } else {
            var _p2 = A3(hslToRgb,_p1._0,_p1._1,_p1._2);
            var r = _p2._0;
            var g = _p2._1;
            var b = _p2._2;
            return {red: $Basics.round(255 * r),green: $Basics.round(255 * g),blue: $Basics.round(255 * b),alpha: _p1._3};
         }
   };
   var toHsl = function (color) {
      var _p3 = color;
      if (_p3.ctor === "HSLA") {
            return {hue: _p3._0,saturation: _p3._1,lightness: _p3._2,alpha: _p3._3};
         } else {
            var _p4 = A3(rgbToHsl,_p3._0,_p3._1,_p3._2);
            var h = _p4._0;
            var s = _p4._1;
            var l = _p4._2;
            return {hue: h,saturation: s,lightness: l,alpha: _p3._3};
         }
   };
   var HSLA = F4(function (a,b,c,d) {    return {ctor: "HSLA",_0: a,_1: b,_2: c,_3: d};});
   var hsla = F4(function (hue,saturation,lightness,alpha) {
      return A4(HSLA,hue - $Basics.turns($Basics.toFloat($Basics.floor(hue / (2 * $Basics.pi)))),saturation,lightness,alpha);
   });
   var hsl = F3(function (hue,saturation,lightness) {    return A4(hsla,hue,saturation,lightness,1);});
   var complement = function (color) {
      var _p5 = color;
      if (_p5.ctor === "HSLA") {
            return A4(hsla,_p5._0 + $Basics.degrees(180),_p5._1,_p5._2,_p5._3);
         } else {
            var _p6 = A3(rgbToHsl,_p5._0,_p5._1,_p5._2);
            var h = _p6._0;
            var s = _p6._1;
            var l = _p6._2;
            return A4(hsla,h + $Basics.degrees(180),s,l,_p5._3);
         }
   };
   var grayscale = function (p) {    return A4(HSLA,0,0,1 - p,1);};
   var greyscale = function (p) {    return A4(HSLA,0,0,1 - p,1);};
   var RGBA = F4(function (a,b,c,d) {    return {ctor: "RGBA",_0: a,_1: b,_2: c,_3: d};});
   var rgba = RGBA;
   var rgb = F3(function (r,g,b) {    return A4(RGBA,r,g,b,1);});
   var lightRed = A4(RGBA,239,41,41,1);
   var red = A4(RGBA,204,0,0,1);
   var darkRed = A4(RGBA,164,0,0,1);
   var lightOrange = A4(RGBA,252,175,62,1);
   var orange = A4(RGBA,245,121,0,1);
   var darkOrange = A4(RGBA,206,92,0,1);
   var lightYellow = A4(RGBA,255,233,79,1);
   var yellow = A4(RGBA,237,212,0,1);
   var darkYellow = A4(RGBA,196,160,0,1);
   var lightGreen = A4(RGBA,138,226,52,1);
   var green = A4(RGBA,115,210,22,1);
   var darkGreen = A4(RGBA,78,154,6,1);
   var lightBlue = A4(RGBA,114,159,207,1);
   var blue = A4(RGBA,52,101,164,1);
   var darkBlue = A4(RGBA,32,74,135,1);
   var lightPurple = A4(RGBA,173,127,168,1);
   var purple = A4(RGBA,117,80,123,1);
   var darkPurple = A4(RGBA,92,53,102,1);
   var lightBrown = A4(RGBA,233,185,110,1);
   var brown = A4(RGBA,193,125,17,1);
   var darkBrown = A4(RGBA,143,89,2,1);
   var black = A4(RGBA,0,0,0,1);
   var white = A4(RGBA,255,255,255,1);
   var lightGrey = A4(RGBA,238,238,236,1);
   var grey = A4(RGBA,211,215,207,1);
   var darkGrey = A4(RGBA,186,189,182,1);
   var lightGray = A4(RGBA,238,238,236,1);
   var gray = A4(RGBA,211,215,207,1);
   var darkGray = A4(RGBA,186,189,182,1);
   var lightCharcoal = A4(RGBA,136,138,133,1);
   var charcoal = A4(RGBA,85,87,83,1);
   var darkCharcoal = A4(RGBA,46,52,54,1);
   return _elm.Color.values = {_op: _op
                              ,rgb: rgb
                              ,rgba: rgba
                              ,hsl: hsl
                              ,hsla: hsla
                              ,greyscale: greyscale
                              ,grayscale: grayscale
                              ,complement: complement
                              ,linear: linear
                              ,radial: radial
                              ,toRgb: toRgb
                              ,toHsl: toHsl
                              ,red: red
                              ,orange: orange
                              ,yellow: yellow
                              ,green: green
                              ,blue: blue
                              ,purple: purple
                              ,brown: brown
                              ,lightRed: lightRed
                              ,lightOrange: lightOrange
                              ,lightYellow: lightYellow
                              ,lightGreen: lightGreen
                              ,lightBlue: lightBlue
                              ,lightPurple: lightPurple
                              ,lightBrown: lightBrown
                              ,darkRed: darkRed
                              ,darkOrange: darkOrange
                              ,darkYellow: darkYellow
                              ,darkGreen: darkGreen
                              ,darkBlue: darkBlue
                              ,darkPurple: darkPurple
                              ,darkBrown: darkBrown
                              ,white: white
                              ,lightGrey: lightGrey
                              ,grey: grey
                              ,darkGrey: darkGrey
                              ,lightCharcoal: lightCharcoal
                              ,charcoal: charcoal
                              ,darkCharcoal: darkCharcoal
                              ,black: black
                              ,lightGray: lightGray
                              ,gray: gray
                              ,darkGray: darkGray};
};

// setup
Elm.Native = Elm.Native || {};
Elm.Native.Graphics = Elm.Native.Graphics || {};
Elm.Native.Graphics.Element = Elm.Native.Graphics.Element || {};

// definition
Elm.Native.Graphics.Element.make = function(localRuntime) {
	'use strict';

	// attempt to short-circuit
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Graphics = localRuntime.Native.Graphics || {};
	localRuntime.Native.Graphics.Element = localRuntime.Native.Graphics.Element || {};
	if ('values' in localRuntime.Native.Graphics.Element)
	{
		return localRuntime.Native.Graphics.Element.values;
	}

	var Color = Elm.Native.Color.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);
	var Text = Elm.Native.Text.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);


	// CREATION

	var createNode =
		typeof document === 'undefined'
			?
				function(_)
				{
					return {
						style: {},
						appendChild: function() {}
					};
				}
			:
				function(elementType)
				{
					var node = document.createElement(elementType);
					node.style.padding = '0';
					node.style.margin = '0';
					return node;
				}
			;


	function newElement(width, height, elementPrim)
	{
		return {
			ctor: 'Element_elm_builtin',
			_0: {
				element: elementPrim,
				props: {
					id: Utils.guid(),
					width: width,
					height: height,
					opacity: 1,
					color: Maybe.Nothing,
					href: '',
					tag: '',
					hover: Utils.Tuple0,
					click: Utils.Tuple0
				}
			}
		};
	}


	// PROPERTIES

	function setProps(elem, node)
	{
		var props = elem.props;

		var element = elem.element;
		var width = props.width - (element.adjustWidth || 0);
		var height = props.height - (element.adjustHeight || 0);
		node.style.width  = (width | 0) + 'px';
		node.style.height = (height | 0) + 'px';

		if (props.opacity !== 1)
		{
			node.style.opacity = props.opacity;
		}

		if (props.color.ctor === 'Just')
		{
			node.style.backgroundColor = Color.toCss(props.color._0);
		}

		if (props.tag !== '')
		{
			node.id = props.tag;
		}

		if (props.hover.ctor !== '_Tuple0')
		{
			addHover(node, props.hover);
		}

		if (props.click.ctor !== '_Tuple0')
		{
			addClick(node, props.click);
		}

		if (props.href !== '')
		{
			var anchor = createNode('a');
			anchor.href = props.href;
			anchor.style.display = 'block';
			anchor.style.pointerEvents = 'auto';
			anchor.appendChild(node);
			node = anchor;
		}

		return node;
	}

	function addClick(e, handler)
	{
		e.style.pointerEvents = 'auto';
		e.elm_click_handler = handler;
		function trigger(ev)
		{
			e.elm_click_handler(Utils.Tuple0);
			ev.stopPropagation();
		}
		e.elm_click_trigger = trigger;
		e.addEventListener('click', trigger);
	}

	function removeClick(e, handler)
	{
		if (e.elm_click_trigger)
		{
			e.removeEventListener('click', e.elm_click_trigger);
			e.elm_click_trigger = null;
			e.elm_click_handler = null;
		}
	}

	function addHover(e, handler)
	{
		e.style.pointerEvents = 'auto';
		e.elm_hover_handler = handler;
		e.elm_hover_count = 0;

		function over(evt)
		{
			if (e.elm_hover_count++ > 0) return;
			e.elm_hover_handler(true);
			evt.stopPropagation();
		}
		function out(evt)
		{
			if (e.contains(evt.toElement || evt.relatedTarget)) return;
			e.elm_hover_count = 0;
			e.elm_hover_handler(false);
			evt.stopPropagation();
		}
		e.elm_hover_over = over;
		e.elm_hover_out = out;
		e.addEventListener('mouseover', over);
		e.addEventListener('mouseout', out);
	}

	function removeHover(e)
	{
		e.elm_hover_handler = null;
		if (e.elm_hover_over)
		{
			e.removeEventListener('mouseover', e.elm_hover_over);
			e.elm_hover_over = null;
		}
		if (e.elm_hover_out)
		{
			e.removeEventListener('mouseout', e.elm_hover_out);
			e.elm_hover_out = null;
		}
	}


	// IMAGES

	function image(props, img)
	{
		switch (img._0.ctor)
		{
			case 'Plain':
				return plainImage(img._3);

			case 'Fitted':
				return fittedImage(props.width, props.height, img._3);

			case 'Cropped':
				return croppedImage(img, props.width, props.height, img._3);

			case 'Tiled':
				return tiledImage(img._3);
		}
	}

	function plainImage(src)
	{
		var img = createNode('img');
		img.src = src;
		img.name = src;
		img.style.display = 'block';
		return img;
	}

	function tiledImage(src)
	{
		var div = createNode('div');
		div.style.backgroundImage = 'url(' + src + ')';
		return div;
	}

	function fittedImage(w, h, src)
	{
		var div = createNode('div');
		div.style.background = 'url(' + src + ') no-repeat center';
		div.style.webkitBackgroundSize = 'cover';
		div.style.MozBackgroundSize = 'cover';
		div.style.OBackgroundSize = 'cover';
		div.style.backgroundSize = 'cover';
		return div;
	}

	function croppedImage(elem, w, h, src)
	{
		var pos = elem._0._0;
		var e = createNode('div');
		e.style.overflow = 'hidden';

		var img = createNode('img');
		img.onload = function() {
			var sw = w / elem._1, sh = h / elem._2;
			img.style.width = ((this.width * sw) | 0) + 'px';
			img.style.height = ((this.height * sh) | 0) + 'px';
			img.style.marginLeft = ((- pos._0 * sw) | 0) + 'px';
			img.style.marginTop = ((- pos._1 * sh) | 0) + 'px';
		};
		img.src = src;
		img.name = src;
		e.appendChild(img);
		return e;
	}


	// FLOW

	function goOut(node)
	{
		node.style.position = 'absolute';
		return node;
	}
	function goDown(node)
	{
		return node;
	}
	function goRight(node)
	{
		node.style.styleFloat = 'left';
		node.style.cssFloat = 'left';
		return node;
	}

	var directionTable = {
		DUp: goDown,
		DDown: goDown,
		DLeft: goRight,
		DRight: goRight,
		DIn: goOut,
		DOut: goOut
	};
	function needsReversal(dir)
	{
		return dir === 'DUp' || dir === 'DLeft' || dir === 'DIn';
	}

	function flow(dir, elist)
	{
		var array = List.toArray(elist);
		var container = createNode('div');
		var goDir = directionTable[dir];
		if (goDir === goOut)
		{
			container.style.pointerEvents = 'none';
		}
		if (needsReversal(dir))
		{
			array.reverse();
		}
		var len = array.length;
		for (var i = 0; i < len; ++i)
		{
			container.appendChild(goDir(render(array[i])));
		}
		return container;
	}


	// CONTAINER

	function toPos(pos)
	{
		return pos.ctor === 'Absolute'
			? pos._0 + 'px'
			: (pos._0 * 100) + '%';
	}

	// must clear right, left, top, bottom, and transform
	// before calling this function
	function setPos(pos, wrappedElement, e)
	{
		var elem = wrappedElement._0;
		var element = elem.element;
		var props = elem.props;
		var w = props.width + (element.adjustWidth ? element.adjustWidth : 0);
		var h = props.height + (element.adjustHeight ? element.adjustHeight : 0);

		e.style.position = 'absolute';
		e.style.margin = 'auto';
		var transform = '';

		switch (pos.horizontal.ctor)
		{
			case 'P':
				e.style.right = toPos(pos.x);
				e.style.removeProperty('left');
				break;

			case 'Z':
				transform = 'translateX(' + ((-w / 2) | 0) + 'px) ';

			case 'N':
				e.style.left = toPos(pos.x);
				e.style.removeProperty('right');
				break;
		}
		switch (pos.vertical.ctor)
		{
			case 'N':
				e.style.bottom = toPos(pos.y);
				e.style.removeProperty('top');
				break;

			case 'Z':
				transform += 'translateY(' + ((-h / 2) | 0) + 'px)';

			case 'P':
				e.style.top = toPos(pos.y);
				e.style.removeProperty('bottom');
				break;
		}
		if (transform !== '')
		{
			addTransform(e.style, transform);
		}
		return e;
	}

	function addTransform(style, transform)
	{
		style.transform       = transform;
		style.msTransform     = transform;
		style.MozTransform    = transform;
		style.webkitTransform = transform;
		style.OTransform      = transform;
	}

	function container(pos, elem)
	{
		var e = render(elem);
		setPos(pos, elem, e);
		var div = createNode('div');
		div.style.position = 'relative';
		div.style.overflow = 'hidden';
		div.appendChild(e);
		return div;
	}


	function rawHtml(elem)
	{
		var html = elem.html;
		var align = elem.align;

		var div = createNode('div');
		div.innerHTML = html;
		div.style.visibility = 'hidden';
		if (align)
		{
			div.style.textAlign = align;
		}
		div.style.visibility = 'visible';
		div.style.pointerEvents = 'auto';
		return div;
	}


	// RENDER

	function render(wrappedElement)
	{
		var elem = wrappedElement._0;
		return setProps(elem, makeElement(elem));
	}

	function makeElement(e)
	{
		var elem = e.element;
		switch (elem.ctor)
		{
			case 'Image':
				return image(e.props, elem);

			case 'Flow':
				return flow(elem._0.ctor, elem._1);

			case 'Container':
				return container(elem._0, elem._1);

			case 'Spacer':
				return createNode('div');

			case 'RawHtml':
				return rawHtml(elem);

			case 'Custom':
				return elem.render(elem.model);
		}
	}

	function updateAndReplace(node, curr, next)
	{
		var newNode = update(node, curr, next);
		if (newNode !== node)
		{
			node.parentNode.replaceChild(newNode, node);
		}
		return newNode;
	}


	// UPDATE

	function update(node, wrappedCurrent, wrappedNext)
	{
		var curr = wrappedCurrent._0;
		var next = wrappedNext._0;
		var rootNode = node;
		if (node.tagName === 'A')
		{
			node = node.firstChild;
		}
		if (curr.props.id === next.props.id)
		{
			updateProps(node, curr, next);
			return rootNode;
		}
		if (curr.element.ctor !== next.element.ctor)
		{
			return render(wrappedNext);
		}
		var nextE = next.element;
		var currE = curr.element;
		switch (nextE.ctor)
		{
			case 'Spacer':
				updateProps(node, curr, next);
				return rootNode;

			case 'RawHtml':
				if(currE.html.valueOf() !== nextE.html.valueOf())
				{
					node.innerHTML = nextE.html;
				}
				updateProps(node, curr, next);
				return rootNode;

			case 'Image':
				if (nextE._0.ctor === 'Plain')
				{
					if (nextE._3 !== currE._3)
					{
						node.src = nextE._3;
					}
				}
				else if (!Utils.eq(nextE, currE)
					|| next.props.width !== curr.props.width
					|| next.props.height !== curr.props.height)
				{
					return render(wrappedNext);
				}
				updateProps(node, curr, next);
				return rootNode;

			case 'Flow':
				var arr = List.toArray(nextE._1);
				for (var i = arr.length; i--; )
				{
					arr[i] = arr[i]._0.element.ctor;
				}
				if (nextE._0.ctor !== currE._0.ctor)
				{
					return render(wrappedNext);
				}
				var nexts = List.toArray(nextE._1);
				var kids = node.childNodes;
				if (nexts.length !== kids.length)
				{
					return render(wrappedNext);
				}
				var currs = List.toArray(currE._1);
				var dir = nextE._0.ctor;
				var goDir = directionTable[dir];
				var toReverse = needsReversal(dir);
				var len = kids.length;
				for (var i = len; i--; )
				{
					var subNode = kids[toReverse ? len - i - 1 : i];
					goDir(updateAndReplace(subNode, currs[i], nexts[i]));
				}
				updateProps(node, curr, next);
				return rootNode;

			case 'Container':
				var subNode = node.firstChild;
				var newSubNode = updateAndReplace(subNode, currE._1, nextE._1);
				setPos(nextE._0, nextE._1, newSubNode);
				updateProps(node, curr, next);
				return rootNode;

			case 'Custom':
				if (currE.type === nextE.type)
				{
					var updatedNode = nextE.update(node, currE.model, nextE.model);
					updateProps(updatedNode, curr, next);
					return updatedNode;
				}
				return render(wrappedNext);
		}
	}

	function updateProps(node, curr, next)
	{
		var nextProps = next.props;
		var currProps = curr.props;

		var element = next.element;
		var width = nextProps.width - (element.adjustWidth || 0);
		var height = nextProps.height - (element.adjustHeight || 0);
		if (width !== currProps.width)
		{
			node.style.width = (width | 0) + 'px';
		}
		if (height !== currProps.height)
		{
			node.style.height = (height | 0) + 'px';
		}

		if (nextProps.opacity !== currProps.opacity)
		{
			node.style.opacity = nextProps.opacity;
		}

		var nextColor = nextProps.color.ctor === 'Just'
			? Color.toCss(nextProps.color._0)
			: '';
		if (node.style.backgroundColor !== nextColor)
		{
			node.style.backgroundColor = nextColor;
		}

		if (nextProps.tag !== currProps.tag)
		{
			node.id = nextProps.tag;
		}

		if (nextProps.href !== currProps.href)
		{
			if (currProps.href === '')
			{
				// add a surrounding href
				var anchor = createNode('a');
				anchor.href = nextProps.href;
				anchor.style.display = 'block';
				anchor.style.pointerEvents = 'auto';

				node.parentNode.replaceChild(anchor, node);
				anchor.appendChild(node);
			}
			else if (nextProps.href === '')
			{
				// remove the surrounding href
				var anchor = node.parentNode;
				anchor.parentNode.replaceChild(node, anchor);
			}
			else
			{
				// just update the link
				node.parentNode.href = nextProps.href;
			}
		}

		// update click and hover handlers
		var removed = false;

		// update hover handlers
		if (currProps.hover.ctor === '_Tuple0')
		{
			if (nextProps.hover.ctor !== '_Tuple0')
			{
				addHover(node, nextProps.hover);
			}
		}
		else
		{
			if (nextProps.hover.ctor === '_Tuple0')
			{
				removed = true;
				removeHover(node);
			}
			else
			{
				node.elm_hover_handler = nextProps.hover;
			}
		}

		// update click handlers
		if (currProps.click.ctor === '_Tuple0')
		{
			if (nextProps.click.ctor !== '_Tuple0')
			{
				addClick(node, nextProps.click);
			}
		}
		else
		{
			if (nextProps.click.ctor === '_Tuple0')
			{
				removed = true;
				removeClick(node);
			}
			else
			{
				node.elm_click_handler = nextProps.click;
			}
		}

		// stop capturing clicks if
		if (removed
			&& nextProps.hover.ctor === '_Tuple0'
			&& nextProps.click.ctor === '_Tuple0')
		{
			node.style.pointerEvents = 'none';
		}
	}


	// TEXT

	function block(align)
	{
		return function(text)
		{
			var raw = {
				ctor: 'RawHtml',
				html: Text.renderHtml(text),
				align: align
			};
			var pos = htmlHeight(0, raw);
			return newElement(pos._0, pos._1, raw);
		};
	}

	function markdown(text)
	{
		var raw = {
			ctor: 'RawHtml',
			html: text,
			align: null
		};
		var pos = htmlHeight(0, raw);
		return newElement(pos._0, pos._1, raw);
	}

	var htmlHeight =
		typeof document !== 'undefined'
			? realHtmlHeight
			: function(a, b) { return Utils.Tuple2(0, 0); };

	function realHtmlHeight(width, rawHtml)
	{
		// create dummy node
		var temp = document.createElement('div');
		temp.innerHTML = rawHtml.html;
		if (width > 0)
		{
			temp.style.width = width + 'px';
		}
		temp.style.visibility = 'hidden';
		temp.style.styleFloat = 'left';
		temp.style.cssFloat = 'left';

		document.body.appendChild(temp);

		// get dimensions
		var style = window.getComputedStyle(temp, null);
		var w = Math.ceil(style.getPropertyValue('width').slice(0, -2) - 0);
		var h = Math.ceil(style.getPropertyValue('height').slice(0, -2) - 0);
		document.body.removeChild(temp);
		return Utils.Tuple2(w, h);
	}


	return localRuntime.Native.Graphics.Element.values = {
		render: render,
		update: update,
		updateAndReplace: updateAndReplace,

		createNode: createNode,
		newElement: F3(newElement),
		addTransform: addTransform,
		htmlHeight: F2(htmlHeight),
		guid: Utils.guid,

		block: block,
		markdown: markdown
	};
};

Elm.Native.Text = {};
Elm.Native.Text.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Text = localRuntime.Native.Text || {};
	if (localRuntime.Native.Text.values)
	{
		return localRuntime.Native.Text.values;
	}

	var toCss = Elm.Native.Color.make(localRuntime).toCss;
	var List = Elm.Native.List.make(localRuntime);


	// CONSTRUCTORS

	function fromString(str)
	{
		return {
			ctor: 'Text:Text',
			_0: str
		};
	}

	function append(a, b)
	{
		return {
			ctor: 'Text:Append',
			_0: a,
			_1: b
		};
	}

	function addMeta(field, value, text)
	{
		var newProps = {};
		var newText = {
			ctor: 'Text:Meta',
			_0: newProps,
			_1: text
		};

		if (text.ctor === 'Text:Meta')
		{
			newText._1 = text._1;
			var props = text._0;
			for (var i = metaKeys.length; i--; )
			{
				var key = metaKeys[i];
				var val = props[key];
				if (val)
				{
					newProps[key] = val;
				}
			}
		}
		newProps[field] = value;
		return newText;
	}

	var metaKeys = [
		'font-size',
		'font-family',
		'font-style',
		'font-weight',
		'href',
		'text-decoration',
		'color'
	];


	// conversions from Elm values to CSS

	function toTypefaces(list)
	{
		var typefaces = List.toArray(list);
		for (var i = typefaces.length; i--; )
		{
			var typeface = typefaces[i];
			if (typeface.indexOf(' ') > -1)
			{
				typefaces[i] = "'" + typeface + "'";
			}
		}
		return typefaces.join(',');
	}

	function toLine(line)
	{
		var ctor = line.ctor;
		return ctor === 'Under'
			? 'underline'
			: ctor === 'Over'
				? 'overline'
				: 'line-through';
	}

	// setting styles of Text

	function style(style, text)
	{
		var newText = addMeta('color', toCss(style.color), text);
		var props = newText._0;

		if (style.typeface.ctor !== '[]')
		{
			props['font-family'] = toTypefaces(style.typeface);
		}
		if (style.height.ctor !== 'Nothing')
		{
			props['font-size'] = style.height._0 + 'px';
		}
		if (style.bold)
		{
			props['font-weight'] = 'bold';
		}
		if (style.italic)
		{
			props['font-style'] = 'italic';
		}
		if (style.line.ctor !== 'Nothing')
		{
			props['text-decoration'] = toLine(style.line._0);
		}
		return newText;
	}

	function height(px, text)
	{
		return addMeta('font-size', px + 'px', text);
	}

	function typeface(names, text)
	{
		return addMeta('font-family', toTypefaces(names), text);
	}

	function monospace(text)
	{
		return addMeta('font-family', 'monospace', text);
	}

	function italic(text)
	{
		return addMeta('font-style', 'italic', text);
	}

	function bold(text)
	{
		return addMeta('font-weight', 'bold', text);
	}

	function link(href, text)
	{
		return addMeta('href', href, text);
	}

	function line(line, text)
	{
		return addMeta('text-decoration', toLine(line), text);
	}

	function color(color, text)
	{
		return addMeta('color', toCss(color), text);
	}


	// RENDER

	function renderHtml(text)
	{
		var tag = text.ctor;
		if (tag === 'Text:Append')
		{
			return renderHtml(text._0) + renderHtml(text._1);
		}
		if (tag === 'Text:Text')
		{
			return properEscape(text._0);
		}
		if (tag === 'Text:Meta')
		{
			return renderMeta(text._0, renderHtml(text._1));
		}
	}

	function renderMeta(metas, string)
	{
		var href = metas.href;
		if (href)
		{
			string = '<a href="' + href + '">' + string + '</a>';
		}
		var styles = '';
		for (var key in metas)
		{
			if (key === 'href')
			{
				continue;
			}
			styles += key + ':' + metas[key] + ';';
		}
		if (styles)
		{
			string = '<span style="' + styles + '">' + string + '</span>';
		}
		return string;
	}

	function properEscape(str)
	{
		if (str.length === 0)
		{
			return str;
		}
		str = str //.replace(/&/g,  '&#38;')
			.replace(/"/g,  '&#34;')
			.replace(/'/g,  '&#39;')
			.replace(/</g,  '&#60;')
			.replace(/>/g,  '&#62;');
		var arr = str.split('\n');
		for (var i = arr.length; i--; )
		{
			arr[i] = makeSpaces(arr[i]);
		}
		return arr.join('<br/>');
	}

	function makeSpaces(s)
	{
		if (s.length === 0)
		{
			return s;
		}
		var arr = s.split('');
		if (arr[0] === ' ')
		{
			arr[0] = '&nbsp;';
		}
		for (var i = arr.length; --i; )
		{
			if (arr[i][0] === ' ' && arr[i - 1] === ' ')
			{
				arr[i - 1] = arr[i - 1] + arr[i];
				arr[i] = '';
			}
		}
		for (var i = arr.length; i--; )
		{
			if (arr[i].length > 1 && arr[i][0] === ' ')
			{
				var spaces = arr[i].split('');
				for (var j = spaces.length - 2; j >= 0; j -= 2)
				{
					spaces[j] = '&nbsp;';
				}
				arr[i] = spaces.join('');
			}
		}
		arr = arr.join('');
		if (arr[arr.length - 1] === ' ')
		{
			return arr.slice(0, -1) + '&nbsp;';
		}
		return arr;
	}


	return localRuntime.Native.Text.values = {
		fromString: fromString,
		append: F2(append),

		height: F2(height),
		italic: italic,
		bold: bold,
		line: F2(line),
		monospace: monospace,
		typeface: F2(typeface),
		color: F2(color),
		link: F2(link),
		style: F2(style),

		toTypefaces: toTypefaces,
		toLine: toLine,
		renderHtml: renderHtml
	};
};

Elm.Text = Elm.Text || {};
Elm.Text.make = function (_elm) {
   "use strict";
   _elm.Text = _elm.Text || {};
   if (_elm.Text.values) return _elm.Text.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Color = Elm.Color.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Text = Elm.Native.Text.make(_elm);
   var _op = {};
   var line = $Native$Text.line;
   var italic = $Native$Text.italic;
   var bold = $Native$Text.bold;
   var color = $Native$Text.color;
   var height = $Native$Text.height;
   var link = $Native$Text.link;
   var monospace = $Native$Text.monospace;
   var typeface = $Native$Text.typeface;
   var style = $Native$Text.style;
   var append = $Native$Text.append;
   var fromString = $Native$Text.fromString;
   var empty = fromString("");
   var concat = function (texts) {    return A3($List.foldr,append,empty,texts);};
   var join = F2(function (seperator,texts) {    return concat(A2($List.intersperse,seperator,texts));});
   var defaultStyle = {typeface: _U.list([]),height: $Maybe.Nothing,color: $Color.black,bold: false,italic: false,line: $Maybe.Nothing};
   var Style = F6(function (a,b,c,d,e,f) {    return {typeface: a,height: b,color: c,bold: d,italic: e,line: f};});
   var Through = {ctor: "Through"};
   var Over = {ctor: "Over"};
   var Under = {ctor: "Under"};
   var Text = {ctor: "Text"};
   return _elm.Text.values = {_op: _op
                             ,fromString: fromString
                             ,empty: empty
                             ,append: append
                             ,concat: concat
                             ,join: join
                             ,link: link
                             ,style: style
                             ,defaultStyle: defaultStyle
                             ,typeface: typeface
                             ,monospace: monospace
                             ,height: height
                             ,color: color
                             ,bold: bold
                             ,italic: italic
                             ,line: line
                             ,Style: Style
                             ,Under: Under
                             ,Over: Over
                             ,Through: Through};
};
Elm.Graphics = Elm.Graphics || {};
Elm.Graphics.Element = Elm.Graphics.Element || {};
Elm.Graphics.Element.make = function (_elm) {
   "use strict";
   _elm.Graphics = _elm.Graphics || {};
   _elm.Graphics.Element = _elm.Graphics.Element || {};
   if (_elm.Graphics.Element.values) return _elm.Graphics.Element.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Color = Elm.Color.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Graphics$Element = Elm.Native.Graphics.Element.make(_elm),
   $Text = Elm.Text.make(_elm);
   var _op = {};
   var DOut = {ctor: "DOut"};
   var outward = DOut;
   var DIn = {ctor: "DIn"};
   var inward = DIn;
   var DRight = {ctor: "DRight"};
   var right = DRight;
   var DLeft = {ctor: "DLeft"};
   var left = DLeft;
   var DDown = {ctor: "DDown"};
   var down = DDown;
   var DUp = {ctor: "DUp"};
   var up = DUp;
   var RawPosition = F4(function (a,b,c,d) {    return {horizontal: a,vertical: b,x: c,y: d};});
   var Position = function (a) {    return {ctor: "Position",_0: a};};
   var Relative = function (a) {    return {ctor: "Relative",_0: a};};
   var relative = Relative;
   var Absolute = function (a) {    return {ctor: "Absolute",_0: a};};
   var absolute = Absolute;
   var N = {ctor: "N"};
   var bottomLeft = Position({horizontal: N,vertical: N,x: Absolute(0),y: Absolute(0)});
   var bottomLeftAt = F2(function (x,y) {    return Position({horizontal: N,vertical: N,x: x,y: y});});
   var Z = {ctor: "Z"};
   var middle = Position({horizontal: Z,vertical: Z,x: Relative(0.5),y: Relative(0.5)});
   var midLeft = Position({horizontal: N,vertical: Z,x: Absolute(0),y: Relative(0.5)});
   var midBottom = Position({horizontal: Z,vertical: N,x: Relative(0.5),y: Absolute(0)});
   var middleAt = F2(function (x,y) {    return Position({horizontal: Z,vertical: Z,x: x,y: y});});
   var midLeftAt = F2(function (x,y) {    return Position({horizontal: N,vertical: Z,x: x,y: y});});
   var midBottomAt = F2(function (x,y) {    return Position({horizontal: Z,vertical: N,x: x,y: y});});
   var P = {ctor: "P"};
   var topLeft = Position({horizontal: N,vertical: P,x: Absolute(0),y: Absolute(0)});
   var topRight = Position({horizontal: P,vertical: P,x: Absolute(0),y: Absolute(0)});
   var bottomRight = Position({horizontal: P,vertical: N,x: Absolute(0),y: Absolute(0)});
   var midRight = Position({horizontal: P,vertical: Z,x: Absolute(0),y: Relative(0.5)});
   var midTop = Position({horizontal: Z,vertical: P,x: Relative(0.5),y: Absolute(0)});
   var topLeftAt = F2(function (x,y) {    return Position({horizontal: N,vertical: P,x: x,y: y});});
   var topRightAt = F2(function (x,y) {    return Position({horizontal: P,vertical: P,x: x,y: y});});
   var bottomRightAt = F2(function (x,y) {    return Position({horizontal: P,vertical: N,x: x,y: y});});
   var midRightAt = F2(function (x,y) {    return Position({horizontal: P,vertical: Z,x: x,y: y});});
   var midTopAt = F2(function (x,y) {    return Position({horizontal: Z,vertical: P,x: x,y: y});});
   var justified = $Native$Graphics$Element.block("justify");
   var centered = $Native$Graphics$Element.block("center");
   var rightAligned = $Native$Graphics$Element.block("right");
   var leftAligned = $Native$Graphics$Element.block("left");
   var show = function (value) {    return leftAligned($Text.monospace($Text.fromString($Basics.toString(value))));};
   var Tiled = {ctor: "Tiled"};
   var Cropped = function (a) {    return {ctor: "Cropped",_0: a};};
   var Fitted = {ctor: "Fitted"};
   var Plain = {ctor: "Plain"};
   var Custom = {ctor: "Custom"};
   var RawHtml = {ctor: "RawHtml"};
   var Spacer = {ctor: "Spacer"};
   var Flow = F2(function (a,b) {    return {ctor: "Flow",_0: a,_1: b};});
   var Container = F2(function (a,b) {    return {ctor: "Container",_0: a,_1: b};});
   var Image = F4(function (a,b,c,d) {    return {ctor: "Image",_0: a,_1: b,_2: c,_3: d};});
   var newElement = $Native$Graphics$Element.newElement;
   var image = F3(function (w,h,src) {    return A3(newElement,w,h,A4(Image,Plain,w,h,src));});
   var fittedImage = F3(function (w,h,src) {    return A3(newElement,w,h,A4(Image,Fitted,w,h,src));});
   var croppedImage = F4(function (pos,w,h,src) {    return A3(newElement,w,h,A4(Image,Cropped(pos),w,h,src));});
   var tiledImage = F3(function (w,h,src) {    return A3(newElement,w,h,A4(Image,Tiled,w,h,src));});
   var container = F4(function (w,h,_p0,e) {    var _p1 = _p0;return A3(newElement,w,h,A2(Container,_p1._0,e));});
   var spacer = F2(function (w,h) {    return A3(newElement,w,h,Spacer);});
   var sizeOf = function (_p2) {    var _p3 = _p2;var _p4 = _p3._0;return {ctor: "_Tuple2",_0: _p4.props.width,_1: _p4.props.height};};
   var heightOf = function (_p5) {    var _p6 = _p5;return _p6._0.props.height;};
   var widthOf = function (_p7) {    var _p8 = _p7;return _p8._0.props.width;};
   var above = F2(function (hi,lo) {
      return A3(newElement,A2($Basics.max,widthOf(hi),widthOf(lo)),heightOf(hi) + heightOf(lo),A2(Flow,DDown,_U.list([hi,lo])));
   });
   var below = F2(function (lo,hi) {
      return A3(newElement,A2($Basics.max,widthOf(hi),widthOf(lo)),heightOf(hi) + heightOf(lo),A2(Flow,DDown,_U.list([hi,lo])));
   });
   var beside = F2(function (lft,rht) {
      return A3(newElement,widthOf(lft) + widthOf(rht),A2($Basics.max,heightOf(lft),heightOf(rht)),A2(Flow,right,_U.list([lft,rht])));
   });
   var layers = function (es) {
      var hs = A2($List.map,heightOf,es);
      var ws = A2($List.map,widthOf,es);
      return A3(newElement,A2($Maybe.withDefault,0,$List.maximum(ws)),A2($Maybe.withDefault,0,$List.maximum(hs)),A2(Flow,DOut,es));
   };
   var empty = A2(spacer,0,0);
   var flow = F2(function (dir,es) {
      var newFlow = F2(function (w,h) {    return A3(newElement,w,h,A2(Flow,dir,es));});
      var maxOrZero = function (list) {    return A2($Maybe.withDefault,0,$List.maximum(list));};
      var hs = A2($List.map,heightOf,es);
      var ws = A2($List.map,widthOf,es);
      if (_U.eq(es,_U.list([]))) return empty; else {
            var _p9 = dir;
            switch (_p9.ctor)
            {case "DUp": return A2(newFlow,maxOrZero(ws),$List.sum(hs));
               case "DDown": return A2(newFlow,maxOrZero(ws),$List.sum(hs));
               case "DLeft": return A2(newFlow,$List.sum(ws),maxOrZero(hs));
               case "DRight": return A2(newFlow,$List.sum(ws),maxOrZero(hs));
               case "DIn": return A2(newFlow,maxOrZero(ws),maxOrZero(hs));
               default: return A2(newFlow,maxOrZero(ws),maxOrZero(hs));}
         }
   });
   var Properties = F9(function (a,b,c,d,e,f,g,h,i) {    return {id: a,width: b,height: c,opacity: d,color: e,href: f,tag: g,hover: h,click: i};});
   var Element_elm_builtin = function (a) {    return {ctor: "Element_elm_builtin",_0: a};};
   var width = F2(function (newWidth,_p10) {
      var _p11 = _p10;
      var _p14 = _p11._0.props;
      var _p13 = _p11._0.element;
      var newHeight = function () {
         var _p12 = _p13;
         switch (_p12.ctor)
         {case "Image": return $Basics.round($Basics.toFloat(_p12._2) / $Basics.toFloat(_p12._1) * $Basics.toFloat(newWidth));
            case "RawHtml": return $Basics.snd(A2($Native$Graphics$Element.htmlHeight,newWidth,_p13));
            default: return _p14.height;}
      }();
      return Element_elm_builtin({element: _p13,props: _U.update(_p14,{width: newWidth,height: newHeight})});
   });
   var height = F2(function (newHeight,_p15) {
      var _p16 = _p15;
      return Element_elm_builtin({element: _p16._0.element,props: _U.update(_p16._0.props,{height: newHeight})});
   });
   var size = F3(function (w,h,e) {    return A2(height,h,A2(width,w,e));});
   var opacity = F2(function (givenOpacity,_p17) {
      var _p18 = _p17;
      return Element_elm_builtin({element: _p18._0.element,props: _U.update(_p18._0.props,{opacity: givenOpacity})});
   });
   var color = F2(function (clr,_p19) {
      var _p20 = _p19;
      return Element_elm_builtin({element: _p20._0.element,props: _U.update(_p20._0.props,{color: $Maybe.Just(clr)})});
   });
   var tag = F2(function (name,_p21) {    var _p22 = _p21;return Element_elm_builtin({element: _p22._0.element,props: _U.update(_p22._0.props,{tag: name})});});
   var link = F2(function (href,_p23) {
      var _p24 = _p23;
      return Element_elm_builtin({element: _p24._0.element,props: _U.update(_p24._0.props,{href: href})});
   });
   return _elm.Graphics.Element.values = {_op: _op
                                         ,image: image
                                         ,fittedImage: fittedImage
                                         ,croppedImage: croppedImage
                                         ,tiledImage: tiledImage
                                         ,leftAligned: leftAligned
                                         ,rightAligned: rightAligned
                                         ,centered: centered
                                         ,justified: justified
                                         ,show: show
                                         ,width: width
                                         ,height: height
                                         ,size: size
                                         ,color: color
                                         ,opacity: opacity
                                         ,link: link
                                         ,tag: tag
                                         ,widthOf: widthOf
                                         ,heightOf: heightOf
                                         ,sizeOf: sizeOf
                                         ,flow: flow
                                         ,up: up
                                         ,down: down
                                         ,left: left
                                         ,right: right
                                         ,inward: inward
                                         ,outward: outward
                                         ,layers: layers
                                         ,above: above
                                         ,below: below
                                         ,beside: beside
                                         ,empty: empty
                                         ,spacer: spacer
                                         ,container: container
                                         ,middle: middle
                                         ,midTop: midTop
                                         ,midBottom: midBottom
                                         ,midLeft: midLeft
                                         ,midRight: midRight
                                         ,topLeft: topLeft
                                         ,topRight: topRight
                                         ,bottomLeft: bottomLeft
                                         ,bottomRight: bottomRight
                                         ,absolute: absolute
                                         ,relative: relative
                                         ,middleAt: middleAt
                                         ,midTopAt: midTopAt
                                         ,midBottomAt: midBottomAt
                                         ,midLeftAt: midLeftAt
                                         ,midRightAt: midRightAt
                                         ,topLeftAt: topLeftAt
                                         ,topRightAt: topRightAt
                                         ,bottomLeftAt: bottomLeftAt
                                         ,bottomRightAt: bottomRightAt};
};
Elm.Graphics = Elm.Graphics || {};
Elm.Graphics.Collage = Elm.Graphics.Collage || {};
Elm.Graphics.Collage.make = function (_elm) {
   "use strict";
   _elm.Graphics = _elm.Graphics || {};
   _elm.Graphics.Collage = _elm.Graphics.Collage || {};
   if (_elm.Graphics.Collage.values) return _elm.Graphics.Collage.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Color = Elm.Color.make(_elm),
   $Graphics$Element = Elm.Graphics.Element.make(_elm),
   $List = Elm.List.make(_elm),
   $Native$Graphics$Collage = Elm.Native.Graphics.Collage.make(_elm),
   $Text = Elm.Text.make(_elm),
   $Transform2D = Elm.Transform2D.make(_elm);
   var _op = {};
   var Shape = function (a) {    return {ctor: "Shape",_0: a};};
   var polygon = function (points) {    return Shape(points);};
   var rect = F2(function (w,h) {
      var hh = h / 2;
      var hw = w / 2;
      return Shape(_U.list([{ctor: "_Tuple2",_0: 0 - hw,_1: 0 - hh}
                           ,{ctor: "_Tuple2",_0: 0 - hw,_1: hh}
                           ,{ctor: "_Tuple2",_0: hw,_1: hh}
                           ,{ctor: "_Tuple2",_0: hw,_1: 0 - hh}]));
   });
   var square = function (n) {    return A2(rect,n,n);};
   var oval = F2(function (w,h) {
      var hh = h / 2;
      var hw = w / 2;
      var n = 50;
      var t = 2 * $Basics.pi / n;
      var f = function (i) {    return {ctor: "_Tuple2",_0: hw * $Basics.cos(t * i),_1: hh * $Basics.sin(t * i)};};
      return Shape(A2($List.map,f,_U.range(0,n - 1)));
   });
   var circle = function (r) {    return A2(oval,2 * r,2 * r);};
   var ngon = F2(function (n,r) {
      var m = $Basics.toFloat(n);
      var t = 2 * $Basics.pi / m;
      var f = function (i) {    return {ctor: "_Tuple2",_0: r * $Basics.cos(t * i),_1: r * $Basics.sin(t * i)};};
      return Shape(A2($List.map,f,_U.range(0,m - 1)));
   });
   var Path = function (a) {    return {ctor: "Path",_0: a};};
   var path = function (ps) {    return Path(ps);};
   var segment = F2(function (p1,p2) {    return Path(_U.list([p1,p2]));});
   var collage = $Native$Graphics$Collage.collage;
   var Fill = function (a) {    return {ctor: "Fill",_0: a};};
   var Line = function (a) {    return {ctor: "Line",_0: a};};
   var FGroup = F2(function (a,b) {    return {ctor: "FGroup",_0: a,_1: b};});
   var FElement = function (a) {    return {ctor: "FElement",_0: a};};
   var FImage = F4(function (a,b,c,d) {    return {ctor: "FImage",_0: a,_1: b,_2: c,_3: d};});
   var FText = function (a) {    return {ctor: "FText",_0: a};};
   var FOutlinedText = F2(function (a,b) {    return {ctor: "FOutlinedText",_0: a,_1: b};});
   var FShape = F2(function (a,b) {    return {ctor: "FShape",_0: a,_1: b};});
   var FPath = F2(function (a,b) {    return {ctor: "FPath",_0: a,_1: b};});
   var LineStyle = F6(function (a,b,c,d,e,f) {    return {color: a,width: b,cap: c,join: d,dashing: e,dashOffset: f};});
   var Clipped = {ctor: "Clipped"};
   var Sharp = function (a) {    return {ctor: "Sharp",_0: a};};
   var Smooth = {ctor: "Smooth"};
   var Padded = {ctor: "Padded"};
   var Round = {ctor: "Round"};
   var Flat = {ctor: "Flat"};
   var defaultLine = {color: $Color.black,width: 1,cap: Flat,join: Sharp(10),dashing: _U.list([]),dashOffset: 0};
   var solid = function (clr) {    return _U.update(defaultLine,{color: clr});};
   var dashed = function (clr) {    return _U.update(defaultLine,{color: clr,dashing: _U.list([8,4])});};
   var dotted = function (clr) {    return _U.update(defaultLine,{color: clr,dashing: _U.list([3,3])});};
   var Grad = function (a) {    return {ctor: "Grad",_0: a};};
   var Texture = function (a) {    return {ctor: "Texture",_0: a};};
   var Solid = function (a) {    return {ctor: "Solid",_0: a};};
   var Form_elm_builtin = function (a) {    return {ctor: "Form_elm_builtin",_0: a};};
   var form = function (f) {    return Form_elm_builtin({theta: 0,scale: 1,x: 0,y: 0,alpha: 1,form: f});};
   var fill = F2(function (style,_p0) {    var _p1 = _p0;return form(A2(FShape,Fill(style),_p1._0));});
   var filled = F2(function (color,shape) {    return A2(fill,Solid(color),shape);});
   var textured = F2(function (src,shape) {    return A2(fill,Texture(src),shape);});
   var gradient = F2(function (grad,shape) {    return A2(fill,Grad(grad),shape);});
   var outlined = F2(function (style,_p2) {    var _p3 = _p2;return form(A2(FShape,Line(style),_p3._0));});
   var traced = F2(function (style,_p4) {    var _p5 = _p4;return form(A2(FPath,style,_p5._0));});
   var sprite = F4(function (w,h,pos,src) {    return form(A4(FImage,w,h,pos,src));});
   var toForm = function (e) {    return form(FElement(e));};
   var group = function (fs) {    return form(A2(FGroup,$Transform2D.identity,fs));};
   var groupTransform = F2(function (matrix,fs) {    return form(A2(FGroup,matrix,fs));});
   var text = function (t) {    return form(FText(t));};
   var outlinedText = F2(function (ls,t) {    return form(A2(FOutlinedText,ls,t));});
   var move = F2(function (_p7,_p6) {
      var _p8 = _p7;
      var _p9 = _p6;
      var _p10 = _p9._0;
      return Form_elm_builtin(_U.update(_p10,{x: _p10.x + _p8._0,y: _p10.y + _p8._1}));
   });
   var moveX = F2(function (x,_p11) {    var _p12 = _p11;var _p13 = _p12._0;return Form_elm_builtin(_U.update(_p13,{x: _p13.x + x}));});
   var moveY = F2(function (y,_p14) {    var _p15 = _p14;var _p16 = _p15._0;return Form_elm_builtin(_U.update(_p16,{y: _p16.y + y}));});
   var scale = F2(function (s,_p17) {    var _p18 = _p17;var _p19 = _p18._0;return Form_elm_builtin(_U.update(_p19,{scale: _p19.scale * s}));});
   var rotate = F2(function (t,_p20) {    var _p21 = _p20;var _p22 = _p21._0;return Form_elm_builtin(_U.update(_p22,{theta: _p22.theta + t}));});
   var alpha = F2(function (a,_p23) {    var _p24 = _p23;return Form_elm_builtin(_U.update(_p24._0,{alpha: a}));});
   return _elm.Graphics.Collage.values = {_op: _op
                                         ,collage: collage
                                         ,toForm: toForm
                                         ,filled: filled
                                         ,textured: textured
                                         ,gradient: gradient
                                         ,outlined: outlined
                                         ,traced: traced
                                         ,text: text
                                         ,outlinedText: outlinedText
                                         ,move: move
                                         ,moveX: moveX
                                         ,moveY: moveY
                                         ,scale: scale
                                         ,rotate: rotate
                                         ,alpha: alpha
                                         ,group: group
                                         ,groupTransform: groupTransform
                                         ,rect: rect
                                         ,oval: oval
                                         ,square: square
                                         ,circle: circle
                                         ,ngon: ngon
                                         ,polygon: polygon
                                         ,segment: segment
                                         ,path: path
                                         ,solid: solid
                                         ,dashed: dashed
                                         ,dotted: dotted
                                         ,defaultLine: defaultLine
                                         ,LineStyle: LineStyle
                                         ,Flat: Flat
                                         ,Round: Round
                                         ,Padded: Padded
                                         ,Smooth: Smooth
                                         ,Sharp: Sharp
                                         ,Clipped: Clipped};
};
Elm.Native.Debug = {};
Elm.Native.Debug.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Debug = localRuntime.Native.Debug || {};
	if (localRuntime.Native.Debug.values)
	{
		return localRuntime.Native.Debug.values;
	}

	var toString = Elm.Native.Utils.make(localRuntime).toString;

	function log(tag, value)
	{
		var msg = tag + ': ' + toString(value);
		var process = process || {};
		if (process.stdout)
		{
			process.stdout.write(msg);
		}
		else
		{
			console.log(msg);
		}
		return value;
	}

	function crash(message)
	{
		throw new Error(message);
	}

	function tracePath(tag, form)
	{
		if (localRuntime.debug)
		{
			return localRuntime.debug.trace(tag, form);
		}
		return form;
	}

	function watch(tag, value)
	{
		if (localRuntime.debug)
		{
			localRuntime.debug.watch(tag, value);
		}
		return value;
	}

	function watchSummary(tag, summarize, value)
	{
		if (localRuntime.debug)
		{
			localRuntime.debug.watch(tag, summarize(value));
		}
		return value;
	}

	return localRuntime.Native.Debug.values = {
		crash: crash,
		tracePath: F2(tracePath),
		log: F2(log),
		watch: F2(watch),
		watchSummary: F3(watchSummary)
	};
};

Elm.Debug = Elm.Debug || {};
Elm.Debug.make = function (_elm) {
   "use strict";
   _elm.Debug = _elm.Debug || {};
   if (_elm.Debug.values) return _elm.Debug.values;
   var _U = Elm.Native.Utils.make(_elm),$Graphics$Collage = Elm.Graphics.Collage.make(_elm),$Native$Debug = Elm.Native.Debug.make(_elm);
   var _op = {};
   var trace = $Native$Debug.tracePath;
   var watchSummary = $Native$Debug.watchSummary;
   var watch = $Native$Debug.watch;
   var crash = $Native$Debug.crash;
   var log = $Native$Debug.log;
   return _elm.Debug.values = {_op: _op,log: log,crash: crash,watch: watch,watchSummary: watchSummary,trace: trace};
};
Elm.Result = Elm.Result || {};
Elm.Result.make = function (_elm) {
   "use strict";
   _elm.Result = _elm.Result || {};
   if (_elm.Result.values) return _elm.Result.values;
   var _U = Elm.Native.Utils.make(_elm),$Maybe = Elm.Maybe.make(_elm);
   var _op = {};
   var toMaybe = function (result) {    var _p0 = result;if (_p0.ctor === "Ok") {    return $Maybe.Just(_p0._0);} else {    return $Maybe.Nothing;}};
   var withDefault = F2(function (def,result) {    var _p1 = result;if (_p1.ctor === "Ok") {    return _p1._0;} else {    return def;}});
   var Err = function (a) {    return {ctor: "Err",_0: a};};
   var andThen = F2(function (result,callback) {    var _p2 = result;if (_p2.ctor === "Ok") {    return callback(_p2._0);} else {    return Err(_p2._0);}});
   var Ok = function (a) {    return {ctor: "Ok",_0: a};};
   var map = F2(function (func,ra) {    var _p3 = ra;if (_p3.ctor === "Ok") {    return Ok(func(_p3._0));} else {    return Err(_p3._0);}});
   var map2 = F3(function (func,ra,rb) {
      var _p4 = {ctor: "_Tuple2",_0: ra,_1: rb};
      if (_p4._0.ctor === "Ok") {
            if (_p4._1.ctor === "Ok") {
                  return Ok(A2(func,_p4._0._0,_p4._1._0));
               } else {
                  return Err(_p4._1._0);
               }
         } else {
            return Err(_p4._0._0);
         }
   });
   var map3 = F4(function (func,ra,rb,rc) {
      var _p5 = {ctor: "_Tuple3",_0: ra,_1: rb,_2: rc};
      if (_p5._0.ctor === "Ok") {
            if (_p5._1.ctor === "Ok") {
                  if (_p5._2.ctor === "Ok") {
                        return Ok(A3(func,_p5._0._0,_p5._1._0,_p5._2._0));
                     } else {
                        return Err(_p5._2._0);
                     }
               } else {
                  return Err(_p5._1._0);
               }
         } else {
            return Err(_p5._0._0);
         }
   });
   var map4 = F5(function (func,ra,rb,rc,rd) {
      var _p6 = {ctor: "_Tuple4",_0: ra,_1: rb,_2: rc,_3: rd};
      if (_p6._0.ctor === "Ok") {
            if (_p6._1.ctor === "Ok") {
                  if (_p6._2.ctor === "Ok") {
                        if (_p6._3.ctor === "Ok") {
                              return Ok(A4(func,_p6._0._0,_p6._1._0,_p6._2._0,_p6._3._0));
                           } else {
                              return Err(_p6._3._0);
                           }
                     } else {
                        return Err(_p6._2._0);
                     }
               } else {
                  return Err(_p6._1._0);
               }
         } else {
            return Err(_p6._0._0);
         }
   });
   var map5 = F6(function (func,ra,rb,rc,rd,re) {
      var _p7 = {ctor: "_Tuple5",_0: ra,_1: rb,_2: rc,_3: rd,_4: re};
      if (_p7._0.ctor === "Ok") {
            if (_p7._1.ctor === "Ok") {
                  if (_p7._2.ctor === "Ok") {
                        if (_p7._3.ctor === "Ok") {
                              if (_p7._4.ctor === "Ok") {
                                    return Ok(A5(func,_p7._0._0,_p7._1._0,_p7._2._0,_p7._3._0,_p7._4._0));
                                 } else {
                                    return Err(_p7._4._0);
                                 }
                           } else {
                              return Err(_p7._3._0);
                           }
                     } else {
                        return Err(_p7._2._0);
                     }
               } else {
                  return Err(_p7._1._0);
               }
         } else {
            return Err(_p7._0._0);
         }
   });
   var formatError = F2(function (f,result) {    var _p8 = result;if (_p8.ctor === "Ok") {    return Ok(_p8._0);} else {    return Err(f(_p8._0));}});
   var fromMaybe = F2(function (err,maybe) {    var _p9 = maybe;if (_p9.ctor === "Just") {    return Ok(_p9._0);} else {    return Err(err);}});
   return _elm.Result.values = {_op: _op
                               ,withDefault: withDefault
                               ,map: map
                               ,map2: map2
                               ,map3: map3
                               ,map4: map4
                               ,map5: map5
                               ,andThen: andThen
                               ,toMaybe: toMaybe
                               ,fromMaybe: fromMaybe
                               ,formatError: formatError
                               ,Ok: Ok
                               ,Err: Err};
};
Elm.Native.Signal = {};

Elm.Native.Signal.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Signal = localRuntime.Native.Signal || {};
	if (localRuntime.Native.Signal.values)
	{
		return localRuntime.Native.Signal.values;
	}


	var Task = Elm.Native.Task.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);


	function broadcastToKids(node, timestamp, update)
	{
		var kids = node.kids;
		for (var i = kids.length; i--; )
		{
			kids[i].notify(timestamp, update, node.id);
		}
	}


	// INPUT

	function input(name, base)
	{
		var node = {
			id: Utils.guid(),
			name: 'input-' + name,
			value: base,
			parents: [],
			kids: []
		};

		node.notify = function(timestamp, targetId, value) {
			var update = targetId === node.id;
			if (update)
			{
				node.value = value;
			}
			broadcastToKids(node, timestamp, update);
			return update;
		};

		localRuntime.inputs.push(node);

		return node;
	}

	function constant(value)
	{
		return input('constant', value);
	}


	// MAILBOX

	function mailbox(base)
	{
		var signal = input('mailbox', base);

		function send(value) {
			return Task.asyncFunction(function(callback) {
				localRuntime.setTimeout(function() {
					localRuntime.notify(signal.id, value);
				}, 0);
				callback(Task.succeed(Utils.Tuple0));
			});
		}

		return {
			signal: signal,
			address: {
				ctor: 'Address',
				_0: send
			}
		};
	}

	function sendMessage(message)
	{
		Task.perform(message._0);
	}


	// OUTPUT

	function output(name, handler, parent)
	{
		var node = {
			id: Utils.guid(),
			name: 'output-' + name,
			parents: [parent],
			isOutput: true
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentUpdate)
			{
				handler(parent.value);
			}
		};

		parent.kids.push(node);

		return node;
	}


	// MAP

	function mapMany(refreshValue, args)
	{
		var node = {
			id: Utils.guid(),
			name: 'map' + args.length,
			value: refreshValue(),
			parents: args,
			kids: []
		};

		var numberOfParents = args.length;
		var count = 0;
		var update = false;

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			++count;

			update = update || parentUpdate;

			if (count === numberOfParents)
			{
				if (update)
				{
					node.value = refreshValue();
				}
				broadcastToKids(node, timestamp, update);
				update = false;
				count = 0;
			}
		};

		for (var i = numberOfParents; i--; )
		{
			args[i].kids.push(node);
		}

		return node;
	}


	function map(func, a)
	{
		function refreshValue()
		{
			return func(a.value);
		}
		return mapMany(refreshValue, [a]);
	}


	function map2(func, a, b)
	{
		function refreshValue()
		{
			return A2( func, a.value, b.value );
		}
		return mapMany(refreshValue, [a, b]);
	}


	function map3(func, a, b, c)
	{
		function refreshValue()
		{
			return A3( func, a.value, b.value, c.value );
		}
		return mapMany(refreshValue, [a, b, c]);
	}


	function map4(func, a, b, c, d)
	{
		function refreshValue()
		{
			return A4( func, a.value, b.value, c.value, d.value );
		}
		return mapMany(refreshValue, [a, b, c, d]);
	}


	function map5(func, a, b, c, d, e)
	{
		function refreshValue()
		{
			return A5( func, a.value, b.value, c.value, d.value, e.value );
		}
		return mapMany(refreshValue, [a, b, c, d, e]);
	}


	// FOLD

	function foldp(update, state, signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'foldp',
			parents: [signal],
			kids: [],
			value: state
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentUpdate)
			{
				node.value = A2( update, signal.value, node.value );
			}
			broadcastToKids(node, timestamp, parentUpdate);
		};

		signal.kids.push(node);

		return node;
	}


	// TIME

	function timestamp(signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'timestamp',
			value: Utils.Tuple2(localRuntime.timer.programStart, signal.value),
			parents: [signal],
			kids: []
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentUpdate)
			{
				node.value = Utils.Tuple2(timestamp, signal.value);
			}
			broadcastToKids(node, timestamp, parentUpdate);
		};

		signal.kids.push(node);

		return node;
	}


	function delay(time, signal)
	{
		var delayed = input('delay-input-' + time, signal.value);

		function handler(value)
		{
			setTimeout(function() {
				localRuntime.notify(delayed.id, value);
			}, time);
		}

		output('delay-output-' + time, handler, signal);

		return delayed;
	}


	// MERGING

	function genericMerge(tieBreaker, leftStream, rightStream)
	{
		var node = {
			id: Utils.guid(),
			name: 'merge',
			value: A2(tieBreaker, leftStream.value, rightStream.value),
			parents: [leftStream, rightStream],
			kids: []
		};

		var left = { touched: false, update: false, value: null };
		var right = { touched: false, update: false, value: null };

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentID === leftStream.id)
			{
				left.touched = true;
				left.update = parentUpdate;
				left.value = leftStream.value;
			}
			if (parentID === rightStream.id)
			{
				right.touched = true;
				right.update = parentUpdate;
				right.value = rightStream.value;
			}

			if (left.touched && right.touched)
			{
				var update = false;
				if (left.update && right.update)
				{
					node.value = A2(tieBreaker, left.value, right.value);
					update = true;
				}
				else if (left.update)
				{
					node.value = left.value;
					update = true;
				}
				else if (right.update)
				{
					node.value = right.value;
					update = true;
				}
				left.touched = false;
				right.touched = false;

				broadcastToKids(node, timestamp, update);
			}
		};

		leftStream.kids.push(node);
		rightStream.kids.push(node);

		return node;
	}


	// FILTERING

	function filterMap(toMaybe, base, signal)
	{
		var maybe = toMaybe(signal.value);
		var node = {
			id: Utils.guid(),
			name: 'filterMap',
			value: maybe.ctor === 'Nothing' ? base : maybe._0,
			parents: [signal],
			kids: []
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			var update = false;
			if (parentUpdate)
			{
				var maybe = toMaybe(signal.value);
				if (maybe.ctor === 'Just')
				{
					update = true;
					node.value = maybe._0;
				}
			}
			broadcastToKids(node, timestamp, update);
		};

		signal.kids.push(node);

		return node;
	}


	// SAMPLING

	function sampleOn(ticker, signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'sampleOn',
			value: signal.value,
			parents: [ticker, signal],
			kids: []
		};

		var signalTouch = false;
		var tickerTouch = false;
		var tickerUpdate = false;

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentID === ticker.id)
			{
				tickerTouch = true;
				tickerUpdate = parentUpdate;
			}
			if (parentID === signal.id)
			{
				signalTouch = true;
			}

			if (tickerTouch && signalTouch)
			{
				if (tickerUpdate)
				{
					node.value = signal.value;
				}
				tickerTouch = false;
				signalTouch = false;

				broadcastToKids(node, timestamp, tickerUpdate);
			}
		};

		ticker.kids.push(node);
		signal.kids.push(node);

		return node;
	}


	// DROP REPEATS

	function dropRepeats(signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'dropRepeats',
			value: signal.value,
			parents: [signal],
			kids: []
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			var update = false;
			if (parentUpdate && !Utils.eq(node.value, signal.value))
			{
				node.value = signal.value;
				update = true;
			}
			broadcastToKids(node, timestamp, update);
		};

		signal.kids.push(node);

		return node;
	}


	return localRuntime.Native.Signal.values = {
		input: input,
		constant: constant,
		mailbox: mailbox,
		sendMessage: sendMessage,
		output: output,
		map: F2(map),
		map2: F3(map2),
		map3: F4(map3),
		map4: F5(map4),
		map5: F6(map5),
		foldp: F3(foldp),
		genericMerge: F3(genericMerge),
		filterMap: F3(filterMap),
		sampleOn: F2(sampleOn),
		dropRepeats: dropRepeats,
		timestamp: timestamp,
		delay: F2(delay)
	};
};

Elm.Native.Task = {};

Elm.Native.Task.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Task = localRuntime.Native.Task || {};
	if (localRuntime.Native.Task.values)
	{
		return localRuntime.Native.Task.values;
	}

	var Result = Elm.Result.make(localRuntime);
	var Signal;
	var Utils = Elm.Native.Utils.make(localRuntime);


	// CONSTRUCTORS

	function succeed(value)
	{
		return {
			tag: 'Succeed',
			value: value
		};
	}

	function fail(error)
	{
		return {
			tag: 'Fail',
			value: error
		};
	}

	function asyncFunction(func)
	{
		return {
			tag: 'Async',
			asyncFunction: func
		};
	}

	function andThen(task, callback)
	{
		return {
			tag: 'AndThen',
			task: task,
			callback: callback
		};
	}

	function catch_(task, callback)
	{
		return {
			tag: 'Catch',
			task: task,
			callback: callback
		};
	}


	// RUNNER

	function perform(task) {
		runTask({ task: task }, function() {});
	}

	function performSignal(name, signal)
	{
		var workQueue = [];

		function onComplete()
		{
			workQueue.shift();

			if (workQueue.length > 0)
			{
				var task = workQueue[0];

				setTimeout(function() {
					runTask(task, onComplete);
				}, 0);
			}
		}

		function register(task)
		{
			var root = { task: task };
			workQueue.push(root);
			if (workQueue.length === 1)
			{
				runTask(root, onComplete);
			}
		}

		if (!Signal)
		{
			Signal = Elm.Native.Signal.make(localRuntime);
		}
		Signal.output('perform-tasks-' + name, register, signal);

		register(signal.value);

		return signal;
	}

	function mark(status, task)
	{
		return { status: status, task: task };
	}

	function runTask(root, onComplete)
	{
		var result = mark('runnable', root.task);
		while (result.status === 'runnable')
		{
			result = stepTask(onComplete, root, result.task);
		}

		if (result.status === 'done')
		{
			root.task = result.task;
			onComplete();
		}

		if (result.status === 'blocked')
		{
			root.task = result.task;
		}
	}

	function stepTask(onComplete, root, task)
	{
		var tag = task.tag;

		if (tag === 'Succeed' || tag === 'Fail')
		{
			return mark('done', task);
		}

		if (tag === 'Async')
		{
			var placeHolder = {};
			var couldBeSync = true;
			var wasSync = false;

			task.asyncFunction(function(result) {
				placeHolder.tag = result.tag;
				placeHolder.value = result.value;
				if (couldBeSync)
				{
					wasSync = true;
				}
				else
				{
					runTask(root, onComplete);
				}
			});
			couldBeSync = false;
			return mark(wasSync ? 'done' : 'blocked', placeHolder);
		}

		if (tag === 'AndThen' || tag === 'Catch')
		{
			var result = mark('runnable', task.task);
			while (result.status === 'runnable')
			{
				result = stepTask(onComplete, root, result.task);
			}

			if (result.status === 'done')
			{
				var activeTask = result.task;
				var activeTag = activeTask.tag;

				var succeedChain = activeTag === 'Succeed' && tag === 'AndThen';
				var failChain = activeTag === 'Fail' && tag === 'Catch';

				return (succeedChain || failChain)
					? mark('runnable', task.callback(activeTask.value))
					: mark('runnable', activeTask);
			}
			if (result.status === 'blocked')
			{
				return mark('blocked', {
					tag: tag,
					task: result.task,
					callback: task.callback
				});
			}
		}
	}


	// THREADS

	function sleep(time) {
		return asyncFunction(function(callback) {
			setTimeout(function() {
				callback(succeed(Utils.Tuple0));
			}, time);
		});
	}

	function spawn(task) {
		return asyncFunction(function(callback) {
			var id = setTimeout(function() {
				perform(task);
			}, 0);
			callback(succeed(id));
		});
	}


	return localRuntime.Native.Task.values = {
		succeed: succeed,
		fail: fail,
		asyncFunction: asyncFunction,
		andThen: F2(andThen),
		catch_: F2(catch_),
		perform: perform,
		performSignal: performSignal,
		spawn: spawn,
		sleep: sleep
	};
};

Elm.Task = Elm.Task || {};
Elm.Task.make = function (_elm) {
   "use strict";
   _elm.Task = _elm.Task || {};
   if (_elm.Task.values) return _elm.Task.values;
   var _U = Elm.Native.Utils.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Task = Elm.Native.Task.make(_elm),
   $Result = Elm.Result.make(_elm);
   var _op = {};
   var sleep = $Native$Task.sleep;
   var spawn = $Native$Task.spawn;
   var ThreadID = function (a) {    return {ctor: "ThreadID",_0: a};};
   var onError = $Native$Task.catch_;
   var andThen = $Native$Task.andThen;
   var fail = $Native$Task.fail;
   var mapError = F2(function (f,task) {    return A2(onError,task,function (err) {    return fail(f(err));});});
   var succeed = $Native$Task.succeed;
   var map = F2(function (func,taskA) {    return A2(andThen,taskA,function (a) {    return succeed(func(a));});});
   var map2 = F3(function (func,taskA,taskB) {
      return A2(andThen,taskA,function (a) {    return A2(andThen,taskB,function (b) {    return succeed(A2(func,a,b));});});
   });
   var map3 = F4(function (func,taskA,taskB,taskC) {
      return A2(andThen,
      taskA,
      function (a) {
         return A2(andThen,taskB,function (b) {    return A2(andThen,taskC,function (c) {    return succeed(A3(func,a,b,c));});});
      });
   });
   var map4 = F5(function (func,taskA,taskB,taskC,taskD) {
      return A2(andThen,
      taskA,
      function (a) {
         return A2(andThen,
         taskB,
         function (b) {
            return A2(andThen,taskC,function (c) {    return A2(andThen,taskD,function (d) {    return succeed(A4(func,a,b,c,d));});});
         });
      });
   });
   var map5 = F6(function (func,taskA,taskB,taskC,taskD,taskE) {
      return A2(andThen,
      taskA,
      function (a) {
         return A2(andThen,
         taskB,
         function (b) {
            return A2(andThen,
            taskC,
            function (c) {
               return A2(andThen,taskD,function (d) {    return A2(andThen,taskE,function (e) {    return succeed(A5(func,a,b,c,d,e));});});
            });
         });
      });
   });
   var andMap = F2(function (taskFunc,taskValue) {
      return A2(andThen,taskFunc,function (func) {    return A2(andThen,taskValue,function (value) {    return succeed(func(value));});});
   });
   var sequence = function (tasks) {
      var _p0 = tasks;
      if (_p0.ctor === "[]") {
            return succeed(_U.list([]));
         } else {
            return A3(map2,F2(function (x,y) {    return A2($List._op["::"],x,y);}),_p0._0,sequence(_p0._1));
         }
   };
   var toMaybe = function (task) {    return A2(onError,A2(map,$Maybe.Just,task),function (_p1) {    return succeed($Maybe.Nothing);});};
   var fromMaybe = F2(function ($default,maybe) {    var _p2 = maybe;if (_p2.ctor === "Just") {    return succeed(_p2._0);} else {    return fail($default);}});
   var toResult = function (task) {    return A2(onError,A2(map,$Result.Ok,task),function (msg) {    return succeed($Result.Err(msg));});};
   var fromResult = function (result) {    var _p3 = result;if (_p3.ctor === "Ok") {    return succeed(_p3._0);} else {    return fail(_p3._0);}};
   var Task = {ctor: "Task"};
   return _elm.Task.values = {_op: _op
                             ,succeed: succeed
                             ,fail: fail
                             ,map: map
                             ,map2: map2
                             ,map3: map3
                             ,map4: map4
                             ,map5: map5
                             ,andMap: andMap
                             ,sequence: sequence
                             ,andThen: andThen
                             ,onError: onError
                             ,mapError: mapError
                             ,toMaybe: toMaybe
                             ,fromMaybe: fromMaybe
                             ,toResult: toResult
                             ,fromResult: fromResult
                             ,spawn: spawn
                             ,sleep: sleep};
};
Elm.Signal = Elm.Signal || {};
Elm.Signal.make = function (_elm) {
   "use strict";
   _elm.Signal = _elm.Signal || {};
   if (_elm.Signal.values) return _elm.Signal.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Signal = Elm.Native.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var send = F2(function (_p0,value) {
      var _p1 = _p0;
      return A2($Task.onError,_p1._0(value),function (_p2) {    return $Task.succeed({ctor: "_Tuple0"});});
   });
   var Message = function (a) {    return {ctor: "Message",_0: a};};
   var message = F2(function (_p3,value) {    var _p4 = _p3;return Message(_p4._0(value));});
   var mailbox = $Native$Signal.mailbox;
   var Address = function (a) {    return {ctor: "Address",_0: a};};
   var forwardTo = F2(function (_p5,f) {    var _p6 = _p5;return Address(function (x) {    return _p6._0(f(x));});});
   var Mailbox = F2(function (a,b) {    return {address: a,signal: b};});
   var sampleOn = $Native$Signal.sampleOn;
   var dropRepeats = $Native$Signal.dropRepeats;
   var filterMap = $Native$Signal.filterMap;
   var filter = F3(function (isOk,base,signal) {
      return A3(filterMap,function (value) {    return isOk(value) ? $Maybe.Just(value) : $Maybe.Nothing;},base,signal);
   });
   var merge = F2(function (left,right) {    return A3($Native$Signal.genericMerge,$Basics.always,left,right);});
   var mergeMany = function (signalList) {
      var _p7 = $List.reverse(signalList);
      if (_p7.ctor === "[]") {
            return _U.crashCase("Signal",{start: {line: 184,column: 3},end: {line: 189,column: 40}},_p7)("mergeMany was given an empty list!");
         } else {
            return A3($List.foldl,merge,_p7._0,_p7._1);
         }
   };
   var foldp = $Native$Signal.foldp;
   var map5 = $Native$Signal.map5;
   var map4 = $Native$Signal.map4;
   var map3 = $Native$Signal.map3;
   var map2 = $Native$Signal.map2;
   var map = $Native$Signal.map;
   var constant = $Native$Signal.constant;
   var Signal = {ctor: "Signal"};
   return _elm.Signal.values = {_op: _op
                               ,merge: merge
                               ,mergeMany: mergeMany
                               ,map: map
                               ,map2: map2
                               ,map3: map3
                               ,map4: map4
                               ,map5: map5
                               ,constant: constant
                               ,dropRepeats: dropRepeats
                               ,filter: filter
                               ,filterMap: filterMap
                               ,sampleOn: sampleOn
                               ,foldp: foldp
                               ,mailbox: mailbox
                               ,send: send
                               ,message: message
                               ,forwardTo: forwardTo
                               ,Mailbox: Mailbox};
};
Elm.Signal = Elm.Signal || {};
Elm.Signal.Extra = Elm.Signal.Extra || {};
Elm.Signal.Extra.make = function (_elm) {
   "use strict";
   _elm.Signal = _elm.Signal || {};
   _elm.Signal.Extra = _elm.Signal.Extra || {};
   if (_elm.Signal.Extra.values) return _elm.Signal.Extra.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var unsafeFromJust = function (maybe) {
      var _p0 = maybe;
      if (_p0.ctor === "Just") {
            return _p0._0;
         } else {
            return _U.crashCase("Signal.Extra",{start: {line: 510,column: 3},end: {line: 515,column: 59}},_p0)("This case should have been unreachable");
         }
   };
   var passiveMap2 = F2(function (func,a) {    return function (_p2) {    return A3($Signal.map2,func,a,A2($Signal.sampleOn,a,_p2));};});
   var withPassive = passiveMap2(F2(function (x,y) {    return x(y);}));
   var combine = A2($List.foldr,$Signal.map2(F2(function (x,y) {    return A2($List._op["::"],x,y);})),$Signal.constant(_U.list([])));
   var mergeMany = F2(function (original,others) {    return A3($List.foldl,$Signal.merge,original,others);});
   var filter = function (initial) {    return A2($Signal.filterMap,$Basics.identity,initial);};
   var keepIf = $Signal.filter;
   var runBuffer$ = F3(function (l,n,input) {
      var f = F2(function (inp,prev) {
         var l = $List.length(prev);
         return _U.cmp(l,n) < 0 ? A2($Basics._op["++"],prev,_U.list([inp])) : A2($Basics._op["++"],A2($List.drop,l - n + 1,prev),_U.list([inp]));
      });
      return A3($Signal.foldp,f,l,input);
   });
   var runBuffer = runBuffer$(_U.list([]));
   var initSignal = function (s) {    return A2($Signal.sampleOn,$Signal.constant({ctor: "_Tuple0"}),s);};
   var zip4 = $Signal.map4(F4(function (v0,v1,v2,v3) {    return {ctor: "_Tuple4",_0: v0,_1: v1,_2: v2,_3: v3};}));
   var zip3 = $Signal.map3(F3(function (v0,v1,v2) {    return {ctor: "_Tuple3",_0: v0,_1: v1,_2: v2};}));
   var zip = $Signal.map2(F2(function (v0,v1) {    return {ctor: "_Tuple2",_0: v0,_1: v1};}));
   var keepWhen = F3(function (boolSig,a,aSig) {
      return A2($Signal.map,$Basics.snd,A3(keepIf,$Basics.fst,{ctor: "_Tuple2",_0: true,_1: a},A2($Signal.sampleOn,aSig,A2(zip,boolSig,aSig))));
   });
   var sampleWhen = F3(function (bs,def,sig) {
      return A2($Signal.map,$Basics.snd,A3(keepIf,$Basics.fst,{ctor: "_Tuple2",_0: true,_1: def},A2(zip,bs,sig)));
   });
   var andMap = $Signal.map2(F2(function (x,y) {    return x(y);}));
   _op["~"] = andMap;
   var applyMany = F2(function (fs,l) {    return A2(_op["~"],fs,combine(l));});
   _op["~>"] = $Basics.flip($Signal.map);
   var foldpWith = F4(function (unpack,step,init,input) {
      var step$ = F2(function (a,_p3) {    var _p4 = _p3;return unpack(A2(step,a,_p4._1));});
      return A2(_op["~>"],A3($Signal.foldp,step$,init,input),$Basics.fst);
   });
   _op["<~"] = $Signal.map;
   var unzip = function (pairS) {    return {ctor: "_Tuple2",_0: A2(_op["<~"],$Basics.fst,pairS),_1: A2(_op["<~"],$Basics.snd,pairS)};};
   var unzip3 = function (pairS) {
      return {ctor: "_Tuple3"
             ,_0: A2(_op["<~"],function (_p5) {    var _p6 = _p5;return _p6._0;},pairS)
             ,_1: A2(_op["<~"],function (_p7) {    var _p8 = _p7;return _p8._1;},pairS)
             ,_2: A2(_op["<~"],function (_p9) {    var _p10 = _p9;return _p10._2;},pairS)};
   };
   var unzip4 = function (pairS) {
      return {ctor: "_Tuple4"
             ,_0: A2(_op["<~"],function (_p11) {    var _p12 = _p11;return _p12._0;},pairS)
             ,_1: A2(_op["<~"],function (_p13) {    var _p14 = _p13;return _p14._1;},pairS)
             ,_2: A2(_op["<~"],function (_p15) {    var _p16 = _p15;return _p16._2;},pairS)
             ,_3: A2(_op["<~"],function (_p17) {    var _p18 = _p17;return _p18._3;},pairS)};
   };
   var foldp$ = F3(function (fun,initFun,input) {
      var fun$ = F2(function (_p19,mb) {    var _p20 = _p19;return $Maybe.Just(A2(fun,_p20._0,A2($Maybe.withDefault,_p20._1,mb)));});
      var initial = A2(_op["~>"],initSignal(input),initFun);
      var rest = A3($Signal.foldp,fun$,$Maybe.Nothing,A2(zip,input,initial));
      return A2(_op["<~"],unsafeFromJust,A2($Signal.merge,A2(_op["<~"],$Maybe.Just,initial),rest));
   });
   var deltas = function (signal) {
      var initial = function (value) {    return {ctor: "_Tuple2",_0: value,_1: value};};
      var step = F2(function (value,delta) {    return {ctor: "_Tuple2",_0: $Basics.snd(delta),_1: value};});
      return A3(foldp$,step,initial,signal);
   };
   var foldps = F3(function (f,bs,aS) {
      return A2(_op["<~"],$Basics.fst,A3($Signal.foldp,F2(function (a,_p21) {    var _p22 = _p21;return A2(f,a,_p22._1);}),bs,aS));
   });
   var delayRound = F2(function (b,bS) {
      return A3(foldps,F2(function ($new,old) {    return {ctor: "_Tuple2",_0: old,_1: $new};}),{ctor: "_Tuple2",_0: b,_1: b},bS);
   });
   var filterFold = F2(function (f,initial) {
      var f$ = F2(function (a,s) {    var res = A2(f,a,s);return {ctor: "_Tuple2",_0: res,_1: A2($Maybe.withDefault,s,res)};});
      return function (_p23) {
         return A2(filter,initial,A3(foldps,f$,{ctor: "_Tuple2",_0: $Maybe.Just(initial),_1: initial},_p23));
      };
   });
   var foldps$ = F3(function (f,iF,aS) {
      return A2(_op["<~"],$Basics.fst,A3(foldp$,F2(function (a,_p24) {    var _p25 = _p24;return A2(f,a,_p25._1);}),iF,aS));
   });
   var switchHelper = F4(function (filter,b,l,r) {
      var lAndR = A2($Signal.merge,
      A3(filter,b,$Maybe.Nothing,A2(_op["<~"],$Maybe.Just,l)),
      A3(filter,A2(_op["<~"],$Basics.not,b),$Maybe.Nothing,A2(_op["<~"],$Maybe.Just,r)));
      var base = A2(_op["~"],
      A2(_op["~"],A2(_op["<~"],F3(function (bi,li,ri) {    return $Maybe.Just(bi ? li : ri);}),initSignal(b)),initSignal(l)),
      initSignal(r));
      return A2(_op["<~"],unsafeFromJust,A2($Signal.merge,base,lAndR));
   });
   var switchWhen = F3(function (b,l,r) {    return A4(switchHelper,keepWhen,b,l,r);});
   var switchSample = F3(function (b,l,r) {    return A4(switchHelper,sampleWhen,b,l,r);});
   var keepThen = F3(function (choice,base,signal) {    return A3(switchSample,choice,signal,$Signal.constant(base));});
   var keepWhenI = F2(function (fs,s) {
      return A2(_op["~>"],A3(keepWhen,A2($Signal.merge,$Signal.constant(true),fs),$Maybe.Nothing,A2(_op["<~"],$Maybe.Just,s)),unsafeFromJust);
   });
   var fairMerge = F3(function (resolve,left,right) {
      var merged = A2($Signal.merge,left,right);
      var boolRight = A2(_op["<~"],$Basics.always(false),right);
      var boolLeft = A2(_op["<~"],$Basics.always(true),left);
      var bothUpdated = A2(_op["~"],
      A2(_op["<~"],F2(function (x,y) {    return !_U.eq(x,y);}),A2($Signal.merge,boolLeft,boolRight)),
      A2($Signal.merge,boolRight,boolLeft));
      var keep = keepWhenI(bothUpdated);
      var resolved = A2(_op["~"],A2(_op["<~"],resolve,keep(left)),keep(right));
      return A2($Signal.merge,resolved,merged);
   });
   var mapMany = F2(function (f,l) {    return A2(_op["<~"],f,combine(l));});
   return _elm.Signal.Extra.values = {_op: _op
                                     ,andMap: andMap
                                     ,zip: zip
                                     ,zip3: zip3
                                     ,zip4: zip4
                                     ,unzip: unzip
                                     ,unzip3: unzip3
                                     ,unzip4: unzip4
                                     ,foldp$: foldp$
                                     ,foldps: foldps
                                     ,foldps$: foldps$
                                     ,runBuffer: runBuffer
                                     ,runBuffer$: runBuffer$
                                     ,deltas: deltas
                                     ,delayRound: delayRound
                                     ,keepIf: keepIf
                                     ,keepWhen: keepWhen
                                     ,sampleWhen: sampleWhen
                                     ,switchWhen: switchWhen
                                     ,keepWhenI: keepWhenI
                                     ,switchSample: switchSample
                                     ,keepThen: keepThen
                                     ,filter: filter
                                     ,filterFold: filterFold
                                     ,fairMerge: fairMerge
                                     ,mergeMany: mergeMany
                                     ,combine: combine
                                     ,mapMany: mapMany
                                     ,applyMany: applyMany
                                     ,passiveMap2: passiveMap2
                                     ,withPassive: withPassive};
};
Elm.Native.Time = {};

Elm.Native.Time.make = function(localRuntime)
{
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Time = localRuntime.Native.Time || {};
	if (localRuntime.Native.Time.values)
	{
		return localRuntime.Native.Time.values;
	}

	var NS = Elm.Native.Signal.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);


	// FRAMES PER SECOND

	function fpsWhen(desiredFPS, isOn)
	{
		var msPerFrame = 1000 / desiredFPS;
		var ticker = NS.input('fps-' + desiredFPS, null);

		function notifyTicker()
		{
			localRuntime.notify(ticker.id, null);
		}

		function firstArg(x, y)
		{
			return x;
		}

		// input fires either when isOn changes, or when ticker fires.
		// Its value is a tuple with the current timestamp, and the state of isOn
		var input = NS.timestamp(A3(NS.map2, F2(firstArg), NS.dropRepeats(isOn), ticker));

		var initialState = {
			isOn: false,
			time: localRuntime.timer.programStart,
			delta: 0
		};

		var timeoutId;

		function update(input, state)
		{
			var currentTime = input._0;
			var isOn = input._1;
			var wasOn = state.isOn;
			var previousTime = state.time;

			if (isOn)
			{
				timeoutId = localRuntime.setTimeout(notifyTicker, msPerFrame);
			}
			else if (wasOn)
			{
				clearTimeout(timeoutId);
			}

			return {
				isOn: isOn,
				time: currentTime,
				delta: (isOn && !wasOn) ? 0 : currentTime - previousTime
			};
		}

		return A2(
			NS.map,
			function(state) { return state.delta; },
			A3(NS.foldp, F2(update), update(input.value, initialState), input)
		);
	}


	// EVERY

	function every(t)
	{
		var ticker = NS.input('every-' + t, null);
		function tellTime()
		{
			localRuntime.notify(ticker.id, null);
		}
		var clock = A2(NS.map, fst, NS.timestamp(ticker));
		setInterval(tellTime, t);
		return clock;
	}


	function fst(pair)
	{
		return pair._0;
	}


	function read(s)
	{
		var t = Date.parse(s);
		return isNaN(t) ? Maybe.Nothing : Maybe.Just(t);
	}

	return localRuntime.Native.Time.values = {
		fpsWhen: F2(fpsWhen),
		every: every,
		toDate: function(t) { return new Date(t); },
		read: read
	};
};

Elm.Time = Elm.Time || {};
Elm.Time.make = function (_elm) {
   "use strict";
   _elm.Time = _elm.Time || {};
   if (_elm.Time.values) return _elm.Time.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Native$Signal = Elm.Native.Signal.make(_elm),
   $Native$Time = Elm.Native.Time.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var delay = $Native$Signal.delay;
   var since = F2(function (time,signal) {
      var stop = A2($Signal.map,$Basics.always(-1),A2(delay,time,signal));
      var start = A2($Signal.map,$Basics.always(1),signal);
      var delaydiff = A3($Signal.foldp,F2(function (x,y) {    return x + y;}),0,A2($Signal.merge,start,stop));
      return A2($Signal.map,F2(function (x,y) {    return !_U.eq(x,y);})(0),delaydiff);
   });
   var timestamp = $Native$Signal.timestamp;
   var every = $Native$Time.every;
   var fpsWhen = $Native$Time.fpsWhen;
   var fps = function (targetFrames) {    return A2(fpsWhen,targetFrames,$Signal.constant(true));};
   var inMilliseconds = function (t) {    return t;};
   var millisecond = 1;
   var second = 1000 * millisecond;
   var minute = 60 * second;
   var hour = 60 * minute;
   var inHours = function (t) {    return t / hour;};
   var inMinutes = function (t) {    return t / minute;};
   var inSeconds = function (t) {    return t / second;};
   return _elm.Time.values = {_op: _op
                             ,millisecond: millisecond
                             ,second: second
                             ,minute: minute
                             ,hour: hour
                             ,inMilliseconds: inMilliseconds
                             ,inSeconds: inSeconds
                             ,inMinutes: inMinutes
                             ,inHours: inHours
                             ,fps: fps
                             ,fpsWhen: fpsWhen
                             ,every: every
                             ,timestamp: timestamp
                             ,delay: delay
                             ,since: since};
};
Elm.Native.String = {};

Elm.Native.String.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.String = localRuntime.Native.String || {};
	if (localRuntime.Native.String.values)
	{
		return localRuntime.Native.String.values;
	}
	if ('values' in Elm.Native.String)
	{
		return localRuntime.Native.String.values = Elm.Native.String.values;
	}


	var Char = Elm.Char.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);
	var Result = Elm.Result.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);

	function isEmpty(str)
	{
		return str.length === 0;
	}
	function cons(chr, str)
	{
		return chr + str;
	}
	function uncons(str)
	{
		var hd = str[0];
		if (hd)
		{
			return Maybe.Just(Utils.Tuple2(Utils.chr(hd), str.slice(1)));
		}
		return Maybe.Nothing;
	}
	function append(a, b)
	{
		return a + b;
	}
	function concat(strs)
	{
		return List.toArray(strs).join('');
	}
	function length(str)
	{
		return str.length;
	}
	function map(f, str)
	{
		var out = str.split('');
		for (var i = out.length; i--; )
		{
			out[i] = f(Utils.chr(out[i]));
		}
		return out.join('');
	}
	function filter(pred, str)
	{
		return str.split('').map(Utils.chr).filter(pred).join('');
	}
	function reverse(str)
	{
		return str.split('').reverse().join('');
	}
	function foldl(f, b, str)
	{
		var len = str.length;
		for (var i = 0; i < len; ++i)
		{
			b = A2(f, Utils.chr(str[i]), b);
		}
		return b;
	}
	function foldr(f, b, str)
	{
		for (var i = str.length; i--; )
		{
			b = A2(f, Utils.chr(str[i]), b);
		}
		return b;
	}
	function split(sep, str)
	{
		return List.fromArray(str.split(sep));
	}
	function join(sep, strs)
	{
		return List.toArray(strs).join(sep);
	}
	function repeat(n, str)
	{
		var result = '';
		while (n > 0)
		{
			if (n & 1)
			{
				result += str;
			}
			n >>= 1, str += str;
		}
		return result;
	}
	function slice(start, end, str)
	{
		return str.slice(start, end);
	}
	function left(n, str)
	{
		return n < 1 ? '' : str.slice(0, n);
	}
	function right(n, str)
	{
		return n < 1 ? '' : str.slice(-n);
	}
	function dropLeft(n, str)
	{
		return n < 1 ? str : str.slice(n);
	}
	function dropRight(n, str)
	{
		return n < 1 ? str : str.slice(0, -n);
	}
	function pad(n, chr, str)
	{
		var half = (n - str.length) / 2;
		return repeat(Math.ceil(half), chr) + str + repeat(half | 0, chr);
	}
	function padRight(n, chr, str)
	{
		return str + repeat(n - str.length, chr);
	}
	function padLeft(n, chr, str)
	{
		return repeat(n - str.length, chr) + str;
	}

	function trim(str)
	{
		return str.trim();
	}
	function trimLeft(str)
	{
		return str.replace(/^\s+/, '');
	}
	function trimRight(str)
	{
		return str.replace(/\s+$/, '');
	}

	function words(str)
	{
		return List.fromArray(str.trim().split(/\s+/g));
	}
	function lines(str)
	{
		return List.fromArray(str.split(/\r\n|\r|\n/g));
	}

	function toUpper(str)
	{
		return str.toUpperCase();
	}
	function toLower(str)
	{
		return str.toLowerCase();
	}

	function any(pred, str)
	{
		for (var i = str.length; i--; )
		{
			if (pred(Utils.chr(str[i])))
			{
				return true;
			}
		}
		return false;
	}
	function all(pred, str)
	{
		for (var i = str.length; i--; )
		{
			if (!pred(Utils.chr(str[i])))
			{
				return false;
			}
		}
		return true;
	}

	function contains(sub, str)
	{
		return str.indexOf(sub) > -1;
	}
	function startsWith(sub, str)
	{
		return str.indexOf(sub) === 0;
	}
	function endsWith(sub, str)
	{
		return str.length >= sub.length &&
			str.lastIndexOf(sub) === str.length - sub.length;
	}
	function indexes(sub, str)
	{
		var subLen = sub.length;
		var i = 0;
		var is = [];
		while ((i = str.indexOf(sub, i)) > -1)
		{
			is.push(i);
			i = i + subLen;
		}
		return List.fromArray(is);
	}

	function toInt(s)
	{
		var len = s.length;
		if (len === 0)
		{
			return Result.Err("could not convert string '" + s + "' to an Int" );
		}
		var start = 0;
		if (s[0] === '-')
		{
			if (len === 1)
			{
				return Result.Err("could not convert string '" + s + "' to an Int" );
			}
			start = 1;
		}
		for (var i = start; i < len; ++i)
		{
			if (!Char.isDigit(s[i]))
			{
				return Result.Err("could not convert string '" + s + "' to an Int" );
			}
		}
		return Result.Ok(parseInt(s, 10));
	}

	function toFloat(s)
	{
		var len = s.length;
		if (len === 0)
		{
			return Result.Err("could not convert string '" + s + "' to a Float" );
		}
		var start = 0;
		if (s[0] === '-')
		{
			if (len === 1)
			{
				return Result.Err("could not convert string '" + s + "' to a Float" );
			}
			start = 1;
		}
		var dotCount = 0;
		for (var i = start; i < len; ++i)
		{
			if (Char.isDigit(s[i]))
			{
				continue;
			}
			if (s[i] === '.')
			{
				dotCount += 1;
				if (dotCount <= 1)
				{
					continue;
				}
			}
			return Result.Err("could not convert string '" + s + "' to a Float" );
		}
		return Result.Ok(parseFloat(s));
	}

	function toList(str)
	{
		return List.fromArray(str.split('').map(Utils.chr));
	}
	function fromList(chars)
	{
		return List.toArray(chars).join('');
	}

	return Elm.Native.String.values = {
		isEmpty: isEmpty,
		cons: F2(cons),
		uncons: uncons,
		append: F2(append),
		concat: concat,
		length: length,
		map: F2(map),
		filter: F2(filter),
		reverse: reverse,
		foldl: F3(foldl),
		foldr: F3(foldr),

		split: F2(split),
		join: F2(join),
		repeat: F2(repeat),

		slice: F3(slice),
		left: F2(left),
		right: F2(right),
		dropLeft: F2(dropLeft),
		dropRight: F2(dropRight),

		pad: F3(pad),
		padLeft: F3(padLeft),
		padRight: F3(padRight),

		trim: trim,
		trimLeft: trimLeft,
		trimRight: trimRight,

		words: words,
		lines: lines,

		toUpper: toUpper,
		toLower: toLower,

		any: F2(any),
		all: F2(all),

		contains: F2(contains),
		startsWith: F2(startsWith),
		endsWith: F2(endsWith),
		indexes: F2(indexes),

		toInt: toInt,
		toFloat: toFloat,
		toList: toList,
		fromList: fromList
	};
};

Elm.Native.Char = {};
Elm.Native.Char.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Char = localRuntime.Native.Char || {};
	if (localRuntime.Native.Char.values)
	{
		return localRuntime.Native.Char.values;
	}

	var Utils = Elm.Native.Utils.make(localRuntime);

	return localRuntime.Native.Char.values = {
		fromCode: function(c) { return Utils.chr(String.fromCharCode(c)); },
		toCode: function(c) { return c.charCodeAt(0); },
		toUpper: function(c) { return Utils.chr(c.toUpperCase()); },
		toLower: function(c) { return Utils.chr(c.toLowerCase()); },
		toLocaleUpper: function(c) { return Utils.chr(c.toLocaleUpperCase()); },
		toLocaleLower: function(c) { return Utils.chr(c.toLocaleLowerCase()); }
	};
};

Elm.Char = Elm.Char || {};
Elm.Char.make = function (_elm) {
   "use strict";
   _elm.Char = _elm.Char || {};
   if (_elm.Char.values) return _elm.Char.values;
   var _U = Elm.Native.Utils.make(_elm),$Basics = Elm.Basics.make(_elm),$Native$Char = Elm.Native.Char.make(_elm);
   var _op = {};
   var fromCode = $Native$Char.fromCode;
   var toCode = $Native$Char.toCode;
   var toLocaleLower = $Native$Char.toLocaleLower;
   var toLocaleUpper = $Native$Char.toLocaleUpper;
   var toLower = $Native$Char.toLower;
   var toUpper = $Native$Char.toUpper;
   var isBetween = F3(function (low,high,$char) {    var code = toCode($char);return _U.cmp(code,toCode(low)) > -1 && _U.cmp(code,toCode(high)) < 1;});
   var isUpper = A2(isBetween,_U.chr("A"),_U.chr("Z"));
   var isLower = A2(isBetween,_U.chr("a"),_U.chr("z"));
   var isDigit = A2(isBetween,_U.chr("0"),_U.chr("9"));
   var isOctDigit = A2(isBetween,_U.chr("0"),_U.chr("7"));
   var isHexDigit = function ($char) {
      return isDigit($char) || (A3(isBetween,_U.chr("a"),_U.chr("f"),$char) || A3(isBetween,_U.chr("A"),_U.chr("F"),$char));
   };
   return _elm.Char.values = {_op: _op
                             ,isUpper: isUpper
                             ,isLower: isLower
                             ,isDigit: isDigit
                             ,isOctDigit: isOctDigit
                             ,isHexDigit: isHexDigit
                             ,toUpper: toUpper
                             ,toLower: toLower
                             ,toLocaleUpper: toLocaleUpper
                             ,toLocaleLower: toLocaleLower
                             ,toCode: toCode
                             ,fromCode: fromCode};
};
Elm.String = Elm.String || {};
Elm.String.make = function (_elm) {
   "use strict";
   _elm.String = _elm.String || {};
   if (_elm.String.values) return _elm.String.values;
   var _U = Elm.Native.Utils.make(_elm),$Maybe = Elm.Maybe.make(_elm),$Native$String = Elm.Native.String.make(_elm),$Result = Elm.Result.make(_elm);
   var _op = {};
   var fromList = $Native$String.fromList;
   var toList = $Native$String.toList;
   var toFloat = $Native$String.toFloat;
   var toInt = $Native$String.toInt;
   var indices = $Native$String.indexes;
   var indexes = $Native$String.indexes;
   var endsWith = $Native$String.endsWith;
   var startsWith = $Native$String.startsWith;
   var contains = $Native$String.contains;
   var all = $Native$String.all;
   var any = $Native$String.any;
   var toLower = $Native$String.toLower;
   var toUpper = $Native$String.toUpper;
   var lines = $Native$String.lines;
   var words = $Native$String.words;
   var trimRight = $Native$String.trimRight;
   var trimLeft = $Native$String.trimLeft;
   var trim = $Native$String.trim;
   var padRight = $Native$String.padRight;
   var padLeft = $Native$String.padLeft;
   var pad = $Native$String.pad;
   var dropRight = $Native$String.dropRight;
   var dropLeft = $Native$String.dropLeft;
   var right = $Native$String.right;
   var left = $Native$String.left;
   var slice = $Native$String.slice;
   var repeat = $Native$String.repeat;
   var join = $Native$String.join;
   var split = $Native$String.split;
   var foldr = $Native$String.foldr;
   var foldl = $Native$String.foldl;
   var reverse = $Native$String.reverse;
   var filter = $Native$String.filter;
   var map = $Native$String.map;
   var length = $Native$String.length;
   var concat = $Native$String.concat;
   var append = $Native$String.append;
   var uncons = $Native$String.uncons;
   var cons = $Native$String.cons;
   var fromChar = function ($char) {    return A2(cons,$char,"");};
   var isEmpty = $Native$String.isEmpty;
   return _elm.String.values = {_op: _op
                               ,isEmpty: isEmpty
                               ,length: length
                               ,reverse: reverse
                               ,repeat: repeat
                               ,cons: cons
                               ,uncons: uncons
                               ,fromChar: fromChar
                               ,append: append
                               ,concat: concat
                               ,split: split
                               ,join: join
                               ,words: words
                               ,lines: lines
                               ,slice: slice
                               ,left: left
                               ,right: right
                               ,dropLeft: dropLeft
                               ,dropRight: dropRight
                               ,contains: contains
                               ,startsWith: startsWith
                               ,endsWith: endsWith
                               ,indexes: indexes
                               ,indices: indices
                               ,toInt: toInt
                               ,toFloat: toFloat
                               ,toList: toList
                               ,fromList: fromList
                               ,toUpper: toUpper
                               ,toLower: toLower
                               ,pad: pad
                               ,padLeft: padLeft
                               ,padRight: padRight
                               ,trim: trim
                               ,trimLeft: trimLeft
                               ,trimRight: trimRight
                               ,map: map
                               ,filter: filter
                               ,foldl: foldl
                               ,foldr: foldr
                               ,any: any
                               ,all: all};
};
Elm.Dict = Elm.Dict || {};
Elm.Dict.make = function (_elm) {
   "use strict";
   _elm.Dict = _elm.Dict || {};
   if (_elm.Dict.values) return _elm.Dict.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Debug = Elm.Native.Debug.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   var foldr = F3(function (f,acc,t) {
      foldr: while (true) {
         var _p0 = t;
         if (_p0.ctor === "RBEmpty_elm_builtin") {
               return acc;
            } else {
               var _v1 = f,_v2 = A3(f,_p0._1,_p0._2,A3(foldr,f,acc,_p0._4)),_v3 = _p0._3;
               f = _v1;
               acc = _v2;
               t = _v3;
               continue foldr;
            }
      }
   });
   var keys = function (dict) {    return A3(foldr,F3(function (key,value,keyList) {    return A2($List._op["::"],key,keyList);}),_U.list([]),dict);};
   var values = function (dict) {    return A3(foldr,F3(function (key,value,valueList) {    return A2($List._op["::"],value,valueList);}),_U.list([]),dict);};
   var toList = function (dict) {
      return A3(foldr,F3(function (key,value,list) {    return A2($List._op["::"],{ctor: "_Tuple2",_0: key,_1: value},list);}),_U.list([]),dict);
   };
   var foldl = F3(function (f,acc,dict) {
      foldl: while (true) {
         var _p1 = dict;
         if (_p1.ctor === "RBEmpty_elm_builtin") {
               return acc;
            } else {
               var _v5 = f,_v6 = A3(f,_p1._1,_p1._2,A3(foldl,f,acc,_p1._3)),_v7 = _p1._4;
               f = _v5;
               acc = _v6;
               dict = _v7;
               continue foldl;
            }
      }
   });
   var reportRemBug = F4(function (msg,c,lgot,rgot) {
      return $Native$Debug.crash($String.concat(_U.list(["Internal red-black tree invariant violated, expected "
                                                        ,msg
                                                        ," and got "
                                                        ,$Basics.toString(c)
                                                        ,"/"
                                                        ,lgot
                                                        ,"/"
                                                        ,rgot
                                                        ,"\nPlease report this bug to <https://github.com/elm-lang/core/issues>"])));
   });
   var isBBlack = function (dict) {
      var _p2 = dict;
      _v8_2: do {
         if (_p2.ctor === "RBNode_elm_builtin") {
               if (_p2._0.ctor === "BBlack") {
                     return true;
                  } else {
                     break _v8_2;
                  }
            } else {
               if (_p2._0.ctor === "LBBlack") {
                     return true;
                  } else {
                     break _v8_2;
                  }
            }
      } while (false);
      return false;
   };
   var Same = {ctor: "Same"};
   var Remove = {ctor: "Remove"};
   var Insert = {ctor: "Insert"};
   var sizeHelp = F2(function (n,dict) {
      sizeHelp: while (true) {
         var _p3 = dict;
         if (_p3.ctor === "RBEmpty_elm_builtin") {
               return n;
            } else {
               var _v10 = A2(sizeHelp,n + 1,_p3._4),_v11 = _p3._3;
               n = _v10;
               dict = _v11;
               continue sizeHelp;
            }
      }
   });
   var size = function (dict) {    return A2(sizeHelp,0,dict);};
   var get = F2(function (targetKey,dict) {
      get: while (true) {
         var _p4 = dict;
         if (_p4.ctor === "RBEmpty_elm_builtin") {
               return $Maybe.Nothing;
            } else {
               var _p5 = A2($Basics.compare,targetKey,_p4._1);
               switch (_p5.ctor)
               {case "LT": var _v14 = targetKey,_v15 = _p4._3;
                    targetKey = _v14;
                    dict = _v15;
                    continue get;
                  case "EQ": return $Maybe.Just(_p4._2);
                  default: var _v16 = targetKey,_v17 = _p4._4;
                    targetKey = _v16;
                    dict = _v17;
                    continue get;}
            }
      }
   });
   var member = F2(function (key,dict) {    var _p6 = A2(get,key,dict);if (_p6.ctor === "Just") {    return true;} else {    return false;}});
   var maxWithDefault = F3(function (k,v,r) {
      maxWithDefault: while (true) {
         var _p7 = r;
         if (_p7.ctor === "RBEmpty_elm_builtin") {
               return {ctor: "_Tuple2",_0: k,_1: v};
            } else {
               var _v20 = _p7._1,_v21 = _p7._2,_v22 = _p7._4;
               k = _v20;
               v = _v21;
               r = _v22;
               continue maxWithDefault;
            }
      }
   });
   var RBEmpty_elm_builtin = function (a) {    return {ctor: "RBEmpty_elm_builtin",_0: a};};
   var RBNode_elm_builtin = F5(function (a,b,c,d,e) {    return {ctor: "RBNode_elm_builtin",_0: a,_1: b,_2: c,_3: d,_4: e};});
   var LBBlack = {ctor: "LBBlack"};
   var LBlack = {ctor: "LBlack"};
   var empty = RBEmpty_elm_builtin(LBlack);
   var isEmpty = function (dict) {    return _U.eq(dict,empty);};
   var map = F2(function (f,dict) {
      var _p8 = dict;
      if (_p8.ctor === "RBEmpty_elm_builtin") {
            return RBEmpty_elm_builtin(LBlack);
         } else {
            var _p9 = _p8._1;
            return A5(RBNode_elm_builtin,_p8._0,_p9,A2(f,_p9,_p8._2),A2(map,f,_p8._3),A2(map,f,_p8._4));
         }
   });
   var NBlack = {ctor: "NBlack"};
   var BBlack = {ctor: "BBlack"};
   var Black = {ctor: "Black"};
   var ensureBlackRoot = function (dict) {
      var _p10 = dict;
      if (_p10.ctor === "RBNode_elm_builtin" && _p10._0.ctor === "Red") {
            return A5(RBNode_elm_builtin,Black,_p10._1,_p10._2,_p10._3,_p10._4);
         } else {
            return dict;
         }
   };
   var blackish = function (t) {
      var _p11 = t;
      if (_p11.ctor === "RBNode_elm_builtin") {
            var _p12 = _p11._0;
            return _U.eq(_p12,Black) || _U.eq(_p12,BBlack);
         } else {
            return true;
         }
   };
   var blacken = function (t) {
      var _p13 = t;
      if (_p13.ctor === "RBEmpty_elm_builtin") {
            return RBEmpty_elm_builtin(LBlack);
         } else {
            return A5(RBNode_elm_builtin,Black,_p13._1,_p13._2,_p13._3,_p13._4);
         }
   };
   var Red = {ctor: "Red"};
   var moreBlack = function (color) {
      var _p14 = color;
      switch (_p14.ctor)
      {case "Black": return BBlack;
         case "Red": return Black;
         case "NBlack": return Red;
         default: return $Native$Debug.crash("Can\'t make a double black node more black!");}
   };
   var lessBlack = function (color) {
      var _p15 = color;
      switch (_p15.ctor)
      {case "BBlack": return Black;
         case "Black": return Red;
         case "Red": return NBlack;
         default: return $Native$Debug.crash("Can\'t make a negative black node less black!");}
   };
   var lessBlackTree = function (dict) {
      var _p16 = dict;
      if (_p16.ctor === "RBNode_elm_builtin") {
            return A5(RBNode_elm_builtin,lessBlack(_p16._0),_p16._1,_p16._2,_p16._3,_p16._4);
         } else {
            return RBEmpty_elm_builtin(LBlack);
         }
   };
   var balancedTree = function (col) {
      return function (xk) {
         return function (xv) {
            return function (yk) {
               return function (yv) {
                  return function (zk) {
                     return function (zv) {
                        return function (a) {
                           return function (b) {
                              return function (c) {
                                 return function (d) {
                                    return A5(RBNode_elm_builtin,
                                    lessBlack(col),
                                    yk,
                                    yv,
                                    A5(RBNode_elm_builtin,Black,xk,xv,a,b),
                                    A5(RBNode_elm_builtin,Black,zk,zv,c,d));
                                 };
                              };
                           };
                        };
                     };
                  };
               };
            };
         };
      };
   };
   var redden = function (t) {
      var _p17 = t;
      if (_p17.ctor === "RBEmpty_elm_builtin") {
            return $Native$Debug.crash("can\'t make a Leaf red");
         } else {
            return A5(RBNode_elm_builtin,Red,_p17._1,_p17._2,_p17._3,_p17._4);
         }
   };
   var balanceHelp = function (tree) {
      var _p18 = tree;
      _v31_6: do {
         _v31_5: do {
            _v31_4: do {
               _v31_3: do {
                  _v31_2: do {
                     _v31_1: do {
                        _v31_0: do {
                           if (_p18.ctor === "RBNode_elm_builtin") {
                                 if (_p18._3.ctor === "RBNode_elm_builtin") {
                                       if (_p18._4.ctor === "RBNode_elm_builtin") {
                                             switch (_p18._3._0.ctor)
                                             {case "Red": switch (_p18._4._0.ctor)
                                                  {case "Red": if (_p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Red") {
                                                             break _v31_0;
                                                          } else {
                                                             if (_p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Red") {
                                                                   break _v31_1;
                                                                } else {
                                                                   if (_p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Red") {
                                                                         break _v31_2;
                                                                      } else {
                                                                         if (_p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Red") {
                                                                               break _v31_3;
                                                                            } else {
                                                                               break _v31_6;
                                                                            }
                                                                      }
                                                                }
                                                          }
                                                     case "NBlack": if (_p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Red") {
                                                             break _v31_0;
                                                          } else {
                                                             if (_p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Red") {
                                                                   break _v31_1;
                                                                } else {
                                                                   if (_p18._0.ctor === "BBlack" && _p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Black" && _p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Black")
                                                                   {
                                                                         break _v31_4;
                                                                      } else {
                                                                         break _v31_6;
                                                                      }
                                                                }
                                                          }
                                                     default: if (_p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Red") {
                                                             break _v31_0;
                                                          } else {
                                                             if (_p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Red") {
                                                                   break _v31_1;
                                                                } else {
                                                                   break _v31_6;
                                                                }
                                                          }}
                                                case "NBlack": switch (_p18._4._0.ctor)
                                                  {case "Red": if (_p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Red") {
                                                             break _v31_2;
                                                          } else {
                                                             if (_p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Red") {
                                                                   break _v31_3;
                                                                } else {
                                                                   if (_p18._0.ctor === "BBlack" && _p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Black" && _p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Black")
                                                                   {
                                                                         break _v31_5;
                                                                      } else {
                                                                         break _v31_6;
                                                                      }
                                                                }
                                                          }
                                                     case "NBlack": if (_p18._0.ctor === "BBlack") {
                                                             if (_p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Black" && _p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Black")
                                                             {
                                                                   break _v31_4;
                                                                } else {
                                                                   if (_p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Black" && _p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Black")
                                                                   {
                                                                         break _v31_5;
                                                                      } else {
                                                                         break _v31_6;
                                                                      }
                                                                }
                                                          } else {
                                                             break _v31_6;
                                                          }
                                                     default:
                                                     if (_p18._0.ctor === "BBlack" && _p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Black" && _p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Black")
                                                       {
                                                             break _v31_5;
                                                          } else {
                                                             break _v31_6;
                                                          }}
                                                default: switch (_p18._4._0.ctor)
                                                  {case "Red": if (_p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Red") {
                                                             break _v31_2;
                                                          } else {
                                                             if (_p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Red") {
                                                                   break _v31_3;
                                                                } else {
                                                                   break _v31_6;
                                                                }
                                                          }
                                                     case "NBlack":
                                                     if (_p18._0.ctor === "BBlack" && _p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Black" && _p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Black")
                                                       {
                                                             break _v31_4;
                                                          } else {
                                                             break _v31_6;
                                                          }
                                                     default: break _v31_6;}}
                                          } else {
                                             switch (_p18._3._0.ctor)
                                             {case "Red": if (_p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Red") {
                                                        break _v31_0;
                                                     } else {
                                                        if (_p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Red") {
                                                              break _v31_1;
                                                           } else {
                                                              break _v31_6;
                                                           }
                                                     }
                                                case "NBlack":
                                                if (_p18._0.ctor === "BBlack" && _p18._3._3.ctor === "RBNode_elm_builtin" && _p18._3._3._0.ctor === "Black" && _p18._3._4.ctor === "RBNode_elm_builtin" && _p18._3._4._0.ctor === "Black")
                                                  {
                                                        break _v31_5;
                                                     } else {
                                                        break _v31_6;
                                                     }
                                                default: break _v31_6;}
                                          }
                                    } else {
                                       if (_p18._4.ctor === "RBNode_elm_builtin") {
                                             switch (_p18._4._0.ctor)
                                             {case "Red": if (_p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Red") {
                                                        break _v31_2;
                                                     } else {
                                                        if (_p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Red") {
                                                              break _v31_3;
                                                           } else {
                                                              break _v31_6;
                                                           }
                                                     }
                                                case "NBlack":
                                                if (_p18._0.ctor === "BBlack" && _p18._4._3.ctor === "RBNode_elm_builtin" && _p18._4._3._0.ctor === "Black" && _p18._4._4.ctor === "RBNode_elm_builtin" && _p18._4._4._0.ctor === "Black")
                                                  {
                                                        break _v31_4;
                                                     } else {
                                                        break _v31_6;
                                                     }
                                                default: break _v31_6;}
                                          } else {
                                             break _v31_6;
                                          }
                                    }
                              } else {
                                 break _v31_6;
                              }
                        } while (false);
                        return balancedTree(_p18._0)(_p18._3._3._1)(_p18._3._3._2)(_p18._3._1)(_p18._3._2)(_p18._1)(_p18._2)(_p18._3._3._3)(_p18._3._3._4)(_p18._3._4)(_p18._4);
                     } while (false);
                     return balancedTree(_p18._0)(_p18._3._1)(_p18._3._2)(_p18._3._4._1)(_p18._3._4._2)(_p18._1)(_p18._2)(_p18._3._3)(_p18._3._4._3)(_p18._3._4._4)(_p18._4);
                  } while (false);
                  return balancedTree(_p18._0)(_p18._1)(_p18._2)(_p18._4._3._1)(_p18._4._3._2)(_p18._4._1)(_p18._4._2)(_p18._3)(_p18._4._3._3)(_p18._4._3._4)(_p18._4._4);
               } while (false);
               return balancedTree(_p18._0)(_p18._1)(_p18._2)(_p18._4._1)(_p18._4._2)(_p18._4._4._1)(_p18._4._4._2)(_p18._3)(_p18._4._3)(_p18._4._4._3)(_p18._4._4._4);
            } while (false);
            return A5(RBNode_elm_builtin,
            Black,
            _p18._4._3._1,
            _p18._4._3._2,
            A5(RBNode_elm_builtin,Black,_p18._1,_p18._2,_p18._3,_p18._4._3._3),
            A5(balance,Black,_p18._4._1,_p18._4._2,_p18._4._3._4,redden(_p18._4._4)));
         } while (false);
         return A5(RBNode_elm_builtin,
         Black,
         _p18._3._4._1,
         _p18._3._4._2,
         A5(balance,Black,_p18._3._1,_p18._3._2,redden(_p18._3._3),_p18._3._4._3),
         A5(RBNode_elm_builtin,Black,_p18._1,_p18._2,_p18._3._4._4,_p18._4));
      } while (false);
      return tree;
   };
   var balance = F5(function (c,k,v,l,r) {    var tree = A5(RBNode_elm_builtin,c,k,v,l,r);return blackish(tree) ? balanceHelp(tree) : tree;});
   var bubble = F5(function (c,k,v,l,r) {
      return isBBlack(l) || isBBlack(r) ? A5(balance,moreBlack(c),k,v,lessBlackTree(l),lessBlackTree(r)) : A5(RBNode_elm_builtin,c,k,v,l,r);
   });
   var removeMax = F5(function (c,k,v,l,r) {
      var _p19 = r;
      if (_p19.ctor === "RBEmpty_elm_builtin") {
            return A3(rem,c,l,r);
         } else {
            return A5(bubble,c,k,v,l,A5(removeMax,_p19._0,_p19._1,_p19._2,_p19._3,_p19._4));
         }
   });
   var rem = F3(function (c,l,r) {
      var _p20 = {ctor: "_Tuple2",_0: l,_1: r};
      if (_p20._0.ctor === "RBEmpty_elm_builtin") {
            if (_p20._1.ctor === "RBEmpty_elm_builtin") {
                  var _p21 = c;
                  switch (_p21.ctor)
                  {case "Red": return RBEmpty_elm_builtin(LBlack);
                     case "Black": return RBEmpty_elm_builtin(LBBlack);
                     default: return $Native$Debug.crash("cannot have bblack or nblack nodes at this point");}
               } else {
                  var _p24 = _p20._1._0;
                  var _p23 = _p20._0._0;
                  var _p22 = {ctor: "_Tuple3",_0: c,_1: _p23,_2: _p24};
                  if (_p22.ctor === "_Tuple3" && _p22._0.ctor === "Black" && _p22._1.ctor === "LBlack" && _p22._2.ctor === "Red") {
                        return A5(RBNode_elm_builtin,Black,_p20._1._1,_p20._1._2,_p20._1._3,_p20._1._4);
                     } else {
                        return A4(reportRemBug,"Black/LBlack/Red",c,$Basics.toString(_p23),$Basics.toString(_p24));
                     }
               }
         } else {
            if (_p20._1.ctor === "RBEmpty_elm_builtin") {
                  var _p27 = _p20._1._0;
                  var _p26 = _p20._0._0;
                  var _p25 = {ctor: "_Tuple3",_0: c,_1: _p26,_2: _p27};
                  if (_p25.ctor === "_Tuple3" && _p25._0.ctor === "Black" && _p25._1.ctor === "Red" && _p25._2.ctor === "LBlack") {
                        return A5(RBNode_elm_builtin,Black,_p20._0._1,_p20._0._2,_p20._0._3,_p20._0._4);
                     } else {
                        return A4(reportRemBug,"Black/Red/LBlack",c,$Basics.toString(_p26),$Basics.toString(_p27));
                     }
               } else {
                  var _p31 = _p20._0._2;
                  var _p30 = _p20._0._4;
                  var _p29 = _p20._0._1;
                  var l$ = A5(removeMax,_p20._0._0,_p29,_p31,_p20._0._3,_p30);
                  var _p28 = A3(maxWithDefault,_p29,_p31,_p30);
                  var k = _p28._0;
                  var v = _p28._1;
                  return A5(bubble,c,k,v,l$,r);
               }
         }
   });
   var update = F3(function (k,alter,dict) {
      var up = function (dict) {
         var _p32 = dict;
         if (_p32.ctor === "RBEmpty_elm_builtin") {
               var _p33 = alter($Maybe.Nothing);
               if (_p33.ctor === "Nothing") {
                     return {ctor: "_Tuple2",_0: Same,_1: empty};
                  } else {
                     return {ctor: "_Tuple2",_0: Insert,_1: A5(RBNode_elm_builtin,Red,k,_p33._0,empty,empty)};
                  }
            } else {
               var _p44 = _p32._2;
               var _p43 = _p32._4;
               var _p42 = _p32._3;
               var _p41 = _p32._1;
               var _p40 = _p32._0;
               var _p34 = A2($Basics.compare,k,_p41);
               switch (_p34.ctor)
               {case "EQ": var _p35 = alter($Maybe.Just(_p44));
                    if (_p35.ctor === "Nothing") {
                          return {ctor: "_Tuple2",_0: Remove,_1: A3(rem,_p40,_p42,_p43)};
                       } else {
                          return {ctor: "_Tuple2",_0: Same,_1: A5(RBNode_elm_builtin,_p40,_p41,_p35._0,_p42,_p43)};
                       }
                  case "LT": var _p36 = up(_p42);
                    var flag = _p36._0;
                    var newLeft = _p36._1;
                    var _p37 = flag;
                    switch (_p37.ctor)
                    {case "Same": return {ctor: "_Tuple2",_0: Same,_1: A5(RBNode_elm_builtin,_p40,_p41,_p44,newLeft,_p43)};
                       case "Insert": return {ctor: "_Tuple2",_0: Insert,_1: A5(balance,_p40,_p41,_p44,newLeft,_p43)};
                       default: return {ctor: "_Tuple2",_0: Remove,_1: A5(bubble,_p40,_p41,_p44,newLeft,_p43)};}
                  default: var _p38 = up(_p43);
                    var flag = _p38._0;
                    var newRight = _p38._1;
                    var _p39 = flag;
                    switch (_p39.ctor)
                    {case "Same": return {ctor: "_Tuple2",_0: Same,_1: A5(RBNode_elm_builtin,_p40,_p41,_p44,_p42,newRight)};
                       case "Insert": return {ctor: "_Tuple2",_0: Insert,_1: A5(balance,_p40,_p41,_p44,_p42,newRight)};
                       default: return {ctor: "_Tuple2",_0: Remove,_1: A5(bubble,_p40,_p41,_p44,_p42,newRight)};}}
            }
      };
      var _p45 = up(dict);
      var flag = _p45._0;
      var updatedDict = _p45._1;
      var _p46 = flag;
      switch (_p46.ctor)
      {case "Same": return updatedDict;
         case "Insert": return ensureBlackRoot(updatedDict);
         default: return blacken(updatedDict);}
   });
   var insert = F3(function (key,value,dict) {    return A3(update,key,$Basics.always($Maybe.Just(value)),dict);});
   var singleton = F2(function (key,value) {    return A3(insert,key,value,empty);});
   var union = F2(function (t1,t2) {    return A3(foldl,insert,t2,t1);});
   var fromList = function (assocs) {
      return A3($List.foldl,F2(function (_p47,dict) {    var _p48 = _p47;return A3(insert,_p48._0,_p48._1,dict);}),empty,assocs);
   };
   var filter = F2(function (predicate,dictionary) {
      var add = F3(function (key,value,dict) {    return A2(predicate,key,value) ? A3(insert,key,value,dict) : dict;});
      return A3(foldl,add,empty,dictionary);
   });
   var intersect = F2(function (t1,t2) {    return A2(filter,F2(function (k,_p49) {    return A2(member,k,t2);}),t1);});
   var partition = F2(function (predicate,dict) {
      var add = F3(function (key,value,_p50) {
         var _p51 = _p50;
         var _p53 = _p51._1;
         var _p52 = _p51._0;
         return A2(predicate,key,value) ? {ctor: "_Tuple2",_0: A3(insert,key,value,_p52),_1: _p53} : {ctor: "_Tuple2",_0: _p52,_1: A3(insert,key,value,_p53)};
      });
      return A3(foldl,add,{ctor: "_Tuple2",_0: empty,_1: empty},dict);
   });
   var remove = F2(function (key,dict) {    return A3(update,key,$Basics.always($Maybe.Nothing),dict);});
   var diff = F2(function (t1,t2) {    return A3(foldl,F3(function (k,v,t) {    return A2(remove,k,t);}),t1,t2);});
   return _elm.Dict.values = {_op: _op
                             ,empty: empty
                             ,singleton: singleton
                             ,insert: insert
                             ,update: update
                             ,isEmpty: isEmpty
                             ,get: get
                             ,remove: remove
                             ,member: member
                             ,size: size
                             ,filter: filter
                             ,partition: partition
                             ,foldl: foldl
                             ,foldr: foldr
                             ,map: map
                             ,union: union
                             ,intersect: intersect
                             ,diff: diff
                             ,keys: keys
                             ,values: values
                             ,toList: toList
                             ,fromList: fromList};
};
Elm.Native.Json = {};

Elm.Native.Json.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Json = localRuntime.Native.Json || {};
	if (localRuntime.Native.Json.values) {
		return localRuntime.Native.Json.values;
	}

	var ElmArray = Elm.Native.Array.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);
	var Result = Elm.Result.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);


	function crash(expected, actual) {
		throw new Error(
			'expecting ' + expected + ' but got ' + JSON.stringify(actual)
		);
	}


	// PRIMITIVE VALUES

	function decodeNull(successValue) {
		return function(value) {
			if (value === null) {
				return successValue;
			}
			crash('null', value);
		};
	}


	function decodeString(value) {
		if (typeof value === 'string' || value instanceof String) {
			return value;
		}
		crash('a String', value);
	}


	function decodeFloat(value) {
		if (typeof value === 'number') {
			return value;
		}
		crash('a Float', value);
	}


	function decodeInt(value) {
		if (typeof value !== 'number') {
			crash('an Int', value);
		}

		if (value < 2147483647 && value > -2147483647 && (value | 0) === value) {
			return value;
		}

		if (isFinite(value) && !(value % 1)) {
			return value;
		}

		crash('an Int', value);
	}


	function decodeBool(value) {
		if (typeof value === 'boolean') {
			return value;
		}
		crash('a Bool', value);
	}


	// ARRAY

	function decodeArray(decoder) {
		return function(value) {
			if (value instanceof Array) {
				var len = value.length;
				var array = new Array(len);
				for (var i = len; i--; ) {
					array[i] = decoder(value[i]);
				}
				return ElmArray.fromJSArray(array);
			}
			crash('an Array', value);
		};
	}


	// LIST

	function decodeList(decoder) {
		return function(value) {
			if (value instanceof Array) {
				var len = value.length;
				var list = List.Nil;
				for (var i = len; i--; ) {
					list = List.Cons( decoder(value[i]), list );
				}
				return list;
			}
			crash('a List', value);
		};
	}


	// MAYBE

	function decodeMaybe(decoder) {
		return function(value) {
			try {
				return Maybe.Just(decoder(value));
			} catch(e) {
				return Maybe.Nothing;
			}
		};
	}


	// FIELDS

	function decodeField(field, decoder) {
		return function(value) {
			var subValue = value[field];
			if (subValue !== undefined) {
				return decoder(subValue);
			}
			crash("an object with field '" + field + "'", value);
		};
	}


	// OBJECTS

	function decodeKeyValuePairs(decoder) {
		return function(value) {
			var isObject =
				typeof value === 'object'
					&& value !== null
					&& !(value instanceof Array);

			if (isObject) {
				var keyValuePairs = List.Nil;
				for (var key in value)
				{
					var elmValue = decoder(value[key]);
					var pair = Utils.Tuple2(key, elmValue);
					keyValuePairs = List.Cons(pair, keyValuePairs);
				}
				return keyValuePairs;
			}

			crash('an object', value);
		};
	}

	function decodeObject1(f, d1) {
		return function(value) {
			return f(d1(value));
		};
	}

	function decodeObject2(f, d1, d2) {
		return function(value) {
			return A2( f, d1(value), d2(value) );
		};
	}

	function decodeObject3(f, d1, d2, d3) {
		return function(value) {
			return A3( f, d1(value), d2(value), d3(value) );
		};
	}

	function decodeObject4(f, d1, d2, d3, d4) {
		return function(value) {
			return A4( f, d1(value), d2(value), d3(value), d4(value) );
		};
	}

	function decodeObject5(f, d1, d2, d3, d4, d5) {
		return function(value) {
			return A5( f, d1(value), d2(value), d3(value), d4(value), d5(value) );
		};
	}

	function decodeObject6(f, d1, d2, d3, d4, d5, d6) {
		return function(value) {
			return A6( f,
				d1(value),
				d2(value),
				d3(value),
				d4(value),
				d5(value),
				d6(value)
			);
		};
	}

	function decodeObject7(f, d1, d2, d3, d4, d5, d6, d7) {
		return function(value) {
			return A7( f,
				d1(value),
				d2(value),
				d3(value),
				d4(value),
				d5(value),
				d6(value),
				d7(value)
			);
		};
	}

	function decodeObject8(f, d1, d2, d3, d4, d5, d6, d7, d8) {
		return function(value) {
			return A8( f,
				d1(value),
				d2(value),
				d3(value),
				d4(value),
				d5(value),
				d6(value),
				d7(value),
				d8(value)
			);
		};
	}


	// TUPLES

	function decodeTuple1(f, d1) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 1 ) {
				crash('a Tuple of length 1', value);
			}
			return f( d1(value[0]) );
		};
	}

	function decodeTuple2(f, d1, d2) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 2 ) {
				crash('a Tuple of length 2', value);
			}
			return A2( f, d1(value[0]), d2(value[1]) );
		};
	}

	function decodeTuple3(f, d1, d2, d3) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 3 ) {
				crash('a Tuple of length 3', value);
			}
			return A3( f, d1(value[0]), d2(value[1]), d3(value[2]) );
		};
	}


	function decodeTuple4(f, d1, d2, d3, d4) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 4 ) {
				crash('a Tuple of length 4', value);
			}
			return A4( f, d1(value[0]), d2(value[1]), d3(value[2]), d4(value[3]) );
		};
	}


	function decodeTuple5(f, d1, d2, d3, d4, d5) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 5 ) {
				crash('a Tuple of length 5', value);
			}
			return A5( f,
				d1(value[0]),
				d2(value[1]),
				d3(value[2]),
				d4(value[3]),
				d5(value[4])
			);
		};
	}


	function decodeTuple6(f, d1, d2, d3, d4, d5, d6) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 6 ) {
				crash('a Tuple of length 6', value);
			}
			return A6( f,
				d1(value[0]),
				d2(value[1]),
				d3(value[2]),
				d4(value[3]),
				d5(value[4]),
				d6(value[5])
			);
		};
	}

	function decodeTuple7(f, d1, d2, d3, d4, d5, d6, d7) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 7 ) {
				crash('a Tuple of length 7', value);
			}
			return A7( f,
				d1(value[0]),
				d2(value[1]),
				d3(value[2]),
				d4(value[3]),
				d5(value[4]),
				d6(value[5]),
				d7(value[6])
			);
		};
	}


	function decodeTuple8(f, d1, d2, d3, d4, d5, d6, d7, d8) {
		return function(value) {
			if ( !(value instanceof Array) || value.length !== 8 ) {
				crash('a Tuple of length 8', value);
			}
			return A8( f,
				d1(value[0]),
				d2(value[1]),
				d3(value[2]),
				d4(value[3]),
				d5(value[4]),
				d6(value[5]),
				d7(value[6]),
				d8(value[7])
			);
		};
	}


	// CUSTOM DECODERS

	function decodeValue(value) {
		return value;
	}

	function runDecoderValue(decoder, value) {
		try {
			return Result.Ok(decoder(value));
		} catch(e) {
			return Result.Err(e.message);
		}
	}

	function customDecoder(decoder, callback) {
		return function(value) {
			var result = callback(decoder(value));
			if (result.ctor === 'Err') {
				throw new Error('custom decoder failed: ' + result._0);
			}
			return result._0;
		};
	}

	function andThen(decode, callback) {
		return function(value) {
			var result = decode(value);
			return callback(result)(value);
		};
	}

	function fail(msg) {
		return function(value) {
			throw new Error(msg);
		};
	}

	function succeed(successValue) {
		return function(value) {
			return successValue;
		};
	}


	// ONE OF MANY

	function oneOf(decoders) {
		return function(value) {
			var errors = [];
			var temp = decoders;
			while (temp.ctor !== '[]') {
				try {
					return temp._0(value);
				} catch(e) {
					errors.push(e.message);
				}
				temp = temp._1;
			}
			throw new Error('expecting one of the following:\n    ' + errors.join('\n    '));
		};
	}

	function get(decoder, value) {
		try {
			return Result.Ok(decoder(value));
		} catch(e) {
			return Result.Err(e.message);
		}
	}


	// ENCODE / DECODE

	function runDecoderString(decoder, string) {
		try {
			return Result.Ok(decoder(JSON.parse(string)));
		} catch(e) {
			return Result.Err(e.message);
		}
	}

	function encode(indentLevel, value) {
		return JSON.stringify(value, null, indentLevel);
	}

	function identity(value) {
		return value;
	}

	function encodeObject(keyValuePairs) {
		var obj = {};
		while (keyValuePairs.ctor !== '[]') {
			var pair = keyValuePairs._0;
			obj[pair._0] = pair._1;
			keyValuePairs = keyValuePairs._1;
		}
		return obj;
	}

	return localRuntime.Native.Json.values = {
		encode: F2(encode),
		runDecoderString: F2(runDecoderString),
		runDecoderValue: F2(runDecoderValue),

		get: F2(get),
		oneOf: oneOf,

		decodeNull: decodeNull,
		decodeInt: decodeInt,
		decodeFloat: decodeFloat,
		decodeString: decodeString,
		decodeBool: decodeBool,

		decodeMaybe: decodeMaybe,

		decodeList: decodeList,
		decodeArray: decodeArray,

		decodeField: F2(decodeField),

		decodeObject1: F2(decodeObject1),
		decodeObject2: F3(decodeObject2),
		decodeObject3: F4(decodeObject3),
		decodeObject4: F5(decodeObject4),
		decodeObject5: F6(decodeObject5),
		decodeObject6: F7(decodeObject6),
		decodeObject7: F8(decodeObject7),
		decodeObject8: F9(decodeObject8),
		decodeKeyValuePairs: decodeKeyValuePairs,

		decodeTuple1: F2(decodeTuple1),
		decodeTuple2: F3(decodeTuple2),
		decodeTuple3: F4(decodeTuple3),
		decodeTuple4: F5(decodeTuple4),
		decodeTuple5: F6(decodeTuple5),
		decodeTuple6: F7(decodeTuple6),
		decodeTuple7: F8(decodeTuple7),
		decodeTuple8: F9(decodeTuple8),

		andThen: F2(andThen),
		decodeValue: decodeValue,
		customDecoder: F2(customDecoder),
		fail: fail,
		succeed: succeed,

		identity: identity,
		encodeNull: null,
		encodeArray: ElmArray.toJSArray,
		encodeList: List.toArray,
		encodeObject: encodeObject

	};
};

Elm.Native.Array = {};
Elm.Native.Array.make = function(localRuntime) {

	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Array = localRuntime.Native.Array || {};
	if (localRuntime.Native.Array.values)
	{
		return localRuntime.Native.Array.values;
	}
	if ('values' in Elm.Native.Array)
	{
		return localRuntime.Native.Array.values = Elm.Native.Array.values;
	}

	var List = Elm.Native.List.make(localRuntime);

	// A RRB-Tree has two distinct data types.
	// Leaf -> "height"  is always 0
	//         "table"   is an array of elements
	// Node -> "height"  is always greater than 0
	//         "table"   is an array of child nodes
	//         "lengths" is an array of accumulated lengths of the child nodes

	// M is the maximal table size. 32 seems fast. E is the allowed increase
	// of search steps when concatting to find an index. Lower values will
	// decrease balancing, but will increase search steps.
	var M = 32;
	var E = 2;

	// An empty array.
	var empty = {
		ctor: '_Array',
		height: 0,
		table: []
	};


	function get(i, array)
	{
		if (i < 0 || i >= length(array))
		{
			throw new Error(
				'Index ' + i + ' is out of range. Check the length of ' +
				'your array first or use getMaybe or getWithDefault.');
		}
		return unsafeGet(i, array);
	}


	function unsafeGet(i, array)
	{
		for (var x = array.height; x > 0; x--)
		{
			var slot = i >> (x * 5);
			while (array.lengths[slot] <= i)
			{
				slot++;
			}
			if (slot > 0)
			{
				i -= array.lengths[slot - 1];
			}
			array = array.table[slot];
		}
		return array.table[i];
	}


	// Sets the value at the index i. Only the nodes leading to i will get
	// copied and updated.
	function set(i, item, array)
	{
		if (i < 0 || length(array) <= i)
		{
			return array;
		}
		return unsafeSet(i, item, array);
	}


	function unsafeSet(i, item, array)
	{
		array = nodeCopy(array);

		if (array.height === 0)
		{
			array.table[i] = item;
		}
		else
		{
			var slot = getSlot(i, array);
			if (slot > 0)
			{
				i -= array.lengths[slot - 1];
			}
			array.table[slot] = unsafeSet(i, item, array.table[slot]);
		}
		return array;
	}


	function initialize(len, f)
	{
		if (len <= 0)
		{
			return empty;
		}
		var h = Math.floor( Math.log(len) / Math.log(M) );
		return initialize_(f, h, 0, len);
	}

	function initialize_(f, h, from, to)
	{
		if (h === 0)
		{
			var table = new Array((to - from) % (M + 1));
			for (var i = 0; i < table.length; i++)
			{
			  table[i] = f(from + i);
			}
			return {
				ctor: '_Array',
				height: 0,
				table: table
			};
		}

		var step = Math.pow(M, h);
		var table = new Array(Math.ceil((to - from) / step));
		var lengths = new Array(table.length);
		for (var i = 0; i < table.length; i++)
		{
			table[i] = initialize_(f, h - 1, from + (i * step), Math.min(from + ((i + 1) * step), to));
			lengths[i] = length(table[i]) + (i > 0 ? lengths[i-1] : 0);
		}
		return {
			ctor: '_Array',
			height: h,
			table: table,
			lengths: lengths
		};
	}

	function fromList(list)
	{
		if (list === List.Nil)
		{
			return empty;
		}

		// Allocate M sized blocks (table) and write list elements to it.
		var table = new Array(M);
		var nodes = [];
		var i = 0;

		while (list.ctor !== '[]')
		{
			table[i] = list._0;
			list = list._1;
			i++;

			// table is full, so we can push a leaf containing it into the
			// next node.
			if (i === M)
			{
				var leaf = {
					ctor: '_Array',
					height: 0,
					table: table
				};
				fromListPush(leaf, nodes);
				table = new Array(M);
				i = 0;
			}
		}

		// Maybe there is something left on the table.
		if (i > 0)
		{
			var leaf = {
				ctor: '_Array',
				height: 0,
				table: table.splice(0, i)
			};
			fromListPush(leaf, nodes);
		}

		// Go through all of the nodes and eventually push them into higher nodes.
		for (var h = 0; h < nodes.length - 1; h++)
		{
			if (nodes[h].table.length > 0)
			{
				fromListPush(nodes[h], nodes);
			}
		}

		var head = nodes[nodes.length - 1];
		if (head.height > 0 && head.table.length === 1)
		{
			return head.table[0];
		}
		else
		{
			return head;
		}
	}

	// Push a node into a higher node as a child.
	function fromListPush(toPush, nodes)
	{
		var h = toPush.height;

		// Maybe the node on this height does not exist.
		if (nodes.length === h)
		{
			var node = {
				ctor: '_Array',
				height: h + 1,
				table: [],
				lengths: []
			};
			nodes.push(node);
		}

		nodes[h].table.push(toPush);
		var len = length(toPush);
		if (nodes[h].lengths.length > 0)
		{
			len += nodes[h].lengths[nodes[h].lengths.length - 1];
		}
		nodes[h].lengths.push(len);

		if (nodes[h].table.length === M)
		{
			fromListPush(nodes[h], nodes);
			nodes[h] = {
				ctor: '_Array',
				height: h + 1,
				table: [],
				lengths: []
			};
		}
	}

	// Pushes an item via push_ to the bottom right of a tree.
	function push(item, a)
	{
		var pushed = push_(item, a);
		if (pushed !== null)
		{
			return pushed;
		}

		var newTree = create(item, a.height);
		return siblise(a, newTree);
	}

	// Recursively tries to push an item to the bottom-right most
	// tree possible. If there is no space left for the item,
	// null will be returned.
	function push_(item, a)
	{
		// Handle resursion stop at leaf level.
		if (a.height === 0)
		{
			if (a.table.length < M)
			{
				var newA = {
					ctor: '_Array',
					height: 0,
					table: a.table.slice()
				};
				newA.table.push(item);
				return newA;
			}
			else
			{
			  return null;
			}
		}

		// Recursively push
		var pushed = push_(item, botRight(a));

		// There was space in the bottom right tree, so the slot will
		// be updated.
		if (pushed !== null)
		{
			var newA = nodeCopy(a);
			newA.table[newA.table.length - 1] = pushed;
			newA.lengths[newA.lengths.length - 1]++;
			return newA;
		}

		// When there was no space left, check if there is space left
		// for a new slot with a tree which contains only the item
		// at the bottom.
		if (a.table.length < M)
		{
			var newSlot = create(item, a.height - 1);
			var newA = nodeCopy(a);
			newA.table.push(newSlot);
			newA.lengths.push(newA.lengths[newA.lengths.length - 1] + length(newSlot));
			return newA;
		}
		else
		{
			return null;
		}
	}

	// Converts an array into a list of elements.
	function toList(a)
	{
		return toList_(List.Nil, a);
	}

	function toList_(list, a)
	{
		for (var i = a.table.length - 1; i >= 0; i--)
		{
			list =
				a.height === 0
					? List.Cons(a.table[i], list)
					: toList_(list, a.table[i]);
		}
		return list;
	}

	// Maps a function over the elements of an array.
	function map(f, a)
	{
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: new Array(a.table.length)
		};
		if (a.height > 0)
		{
			newA.lengths = a.lengths;
		}
		for (var i = 0; i < a.table.length; i++)
		{
			newA.table[i] =
				a.height === 0
					? f(a.table[i])
					: map(f, a.table[i]);
		}
		return newA;
	}

	// Maps a function over the elements with their index as first argument.
	function indexedMap(f, a)
	{
		return indexedMap_(f, a, 0);
	}

	function indexedMap_(f, a, from)
	{
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: new Array(a.table.length)
		};
		if (a.height > 0)
		{
			newA.lengths = a.lengths;
		}
		for (var i = 0; i < a.table.length; i++)
		{
			newA.table[i] =
				a.height === 0
					? A2(f, from + i, a.table[i])
					: indexedMap_(f, a.table[i], i == 0 ? from : from + a.lengths[i - 1]);
		}
		return newA;
	}

	function foldl(f, b, a)
	{
		if (a.height === 0)
		{
			for (var i = 0; i < a.table.length; i++)
			{
				b = A2(f, a.table[i], b);
			}
		}
		else
		{
			for (var i = 0; i < a.table.length; i++)
			{
				b = foldl(f, b, a.table[i]);
			}
		}
		return b;
	}

	function foldr(f, b, a)
	{
		if (a.height === 0)
		{
			for (var i = a.table.length; i--; )
			{
				b = A2(f, a.table[i], b);
			}
		}
		else
		{
			for (var i = a.table.length; i--; )
			{
				b = foldr(f, b, a.table[i]);
			}
		}
		return b;
	}

	// TODO: currently, it slices the right, then the left. This can be
	// optimized.
	function slice(from, to, a)
	{
		if (from < 0)
		{
			from += length(a);
		}
		if (to < 0)
		{
			to += length(a);
		}
		return sliceLeft(from, sliceRight(to, a));
	}

	function sliceRight(to, a)
	{
		if (to === length(a))
		{
			return a;
		}

		// Handle leaf level.
		if (a.height === 0)
		{
			var newA = { ctor:'_Array', height:0 };
			newA.table = a.table.slice(0, to);
			return newA;
		}

		// Slice the right recursively.
		var right = getSlot(to, a);
		var sliced = sliceRight(to - (right > 0 ? a.lengths[right - 1] : 0), a.table[right]);

		// Maybe the a node is not even needed, as sliced contains the whole slice.
		if (right === 0)
		{
			return sliced;
		}

		// Create new node.
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: a.table.slice(0, right),
			lengths: a.lengths.slice(0, right)
		};
		if (sliced.table.length > 0)
		{
			newA.table[right] = sliced;
			newA.lengths[right] = length(sliced) + (right > 0 ? newA.lengths[right - 1] : 0);
		}
		return newA;
	}

	function sliceLeft(from, a)
	{
		if (from === 0)
		{
			return a;
		}

		// Handle leaf level.
		if (a.height === 0)
		{
			var newA = { ctor:'_Array', height:0 };
			newA.table = a.table.slice(from, a.table.length + 1);
			return newA;
		}

		// Slice the left recursively.
		var left = getSlot(from, a);
		var sliced = sliceLeft(from - (left > 0 ? a.lengths[left - 1] : 0), a.table[left]);

		// Maybe the a node is not even needed, as sliced contains the whole slice.
		if (left === a.table.length - 1)
		{
			return sliced;
		}

		// Create new node.
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: a.table.slice(left, a.table.length + 1),
			lengths: new Array(a.table.length - left)
		};
		newA.table[0] = sliced;
		var len = 0;
		for (var i = 0; i < newA.table.length; i++)
		{
			len += length(newA.table[i]);
			newA.lengths[i] = len;
		}

		return newA;
	}

	// Appends two trees.
	function append(a,b)
	{
		if (a.table.length === 0)
		{
			return b;
		}
		if (b.table.length === 0)
		{
			return a;
		}

		var c = append_(a, b);

		// Check if both nodes can be crunshed together.
		if (c[0].table.length + c[1].table.length <= M)
		{
			if (c[0].table.length === 0)
			{
				return c[1];
			}
			if (c[1].table.length === 0)
			{
				return c[0];
			}

			// Adjust .table and .lengths
			c[0].table = c[0].table.concat(c[1].table);
			if (c[0].height > 0)
			{
				var len = length(c[0]);
				for (var i = 0; i < c[1].lengths.length; i++)
				{
					c[1].lengths[i] += len;
				}
				c[0].lengths = c[0].lengths.concat(c[1].lengths);
			}

			return c[0];
		}

		if (c[0].height > 0)
		{
			var toRemove = calcToRemove(a, b);
			if (toRemove > E)
			{
				c = shuffle(c[0], c[1], toRemove);
			}
		}

		return siblise(c[0], c[1]);
	}

	// Returns an array of two nodes; right and left. One node _may_ be empty.
	function append_(a, b)
	{
		if (a.height === 0 && b.height === 0)
		{
			return [a, b];
		}

		if (a.height !== 1 || b.height !== 1)
		{
			if (a.height === b.height)
			{
				a = nodeCopy(a);
				b = nodeCopy(b);
				var appended = append_(botRight(a), botLeft(b));

				insertRight(a, appended[1]);
				insertLeft(b, appended[0]);
			}
			else if (a.height > b.height)
			{
				a = nodeCopy(a);
				var appended = append_(botRight(a), b);

				insertRight(a, appended[0]);
				b = parentise(appended[1], appended[1].height + 1);
			}
			else
			{
				b = nodeCopy(b);
				var appended = append_(a, botLeft(b));

				var left = appended[0].table.length === 0 ? 0 : 1;
				var right = left === 0 ? 1 : 0;
				insertLeft(b, appended[left]);
				a = parentise(appended[right], appended[right].height + 1);
			}
		}

		// Check if balancing is needed and return based on that.
		if (a.table.length === 0 || b.table.length === 0)
		{
			return [a, b];
		}

		var toRemove = calcToRemove(a, b);
		if (toRemove <= E)
		{
			return [a, b];
		}
		return shuffle(a, b, toRemove);
	}

	// Helperfunctions for append_. Replaces a child node at the side of the parent.
	function insertRight(parent, node)
	{
		var index = parent.table.length - 1;
		parent.table[index] = node;
		parent.lengths[index] = length(node);
		parent.lengths[index] += index > 0 ? parent.lengths[index - 1] : 0;
	}

	function insertLeft(parent, node)
	{
		if (node.table.length > 0)
		{
			parent.table[0] = node;
			parent.lengths[0] = length(node);

			var len = length(parent.table[0]);
			for (var i = 1; i < parent.lengths.length; i++)
			{
				len += length(parent.table[i]);
				parent.lengths[i] = len;
			}
		}
		else
		{
			parent.table.shift();
			for (var i = 1; i < parent.lengths.length; i++)
			{
				parent.lengths[i] = parent.lengths[i] - parent.lengths[0];
			}
			parent.lengths.shift();
		}
	}

	// Returns the extra search steps for E. Refer to the paper.
	function calcToRemove(a, b)
	{
		var subLengths = 0;
		for (var i = 0; i < a.table.length; i++)
		{
			subLengths += a.table[i].table.length;
		}
		for (var i = 0; i < b.table.length; i++)
		{
			subLengths += b.table[i].table.length;
		}

		var toRemove = a.table.length + b.table.length;
		return toRemove - (Math.floor((subLengths - 1) / M) + 1);
	}

	// get2, set2 and saveSlot are helpers for accessing elements over two arrays.
	function get2(a, b, index)
	{
		return index < a.length
			? a[index]
			: b[index - a.length];
	}

	function set2(a, b, index, value)
	{
		if (index < a.length)
		{
			a[index] = value;
		}
		else
		{
			b[index - a.length] = value;
		}
	}

	function saveSlot(a, b, index, slot)
	{
		set2(a.table, b.table, index, slot);

		var l = (index === 0 || index === a.lengths.length)
			? 0
			: get2(a.lengths, a.lengths, index - 1);

		set2(a.lengths, b.lengths, index, l + length(slot));
	}

	// Creates a node or leaf with a given length at their arrays for perfomance.
	// Is only used by shuffle.
	function createNode(h, length)
	{
		if (length < 0)
		{
			length = 0;
		}
		var a = {
			ctor: '_Array',
			height: h,
			table: new Array(length)
		};
		if (h > 0)
		{
			a.lengths = new Array(length);
		}
		return a;
	}

	// Returns an array of two balanced nodes.
	function shuffle(a, b, toRemove)
	{
		var newA = createNode(a.height, Math.min(M, a.table.length + b.table.length - toRemove));
		var newB = createNode(a.height, newA.table.length - (a.table.length + b.table.length - toRemove));

		// Skip the slots with size M. More precise: copy the slot references
		// to the new node
		var read = 0;
		while (get2(a.table, b.table, read).table.length % M === 0)
		{
			set2(newA.table, newB.table, read, get2(a.table, b.table, read));
			set2(newA.lengths, newB.lengths, read, get2(a.lengths, b.lengths, read));
			read++;
		}

		// Pulling items from left to right, caching in a slot before writing
		// it into the new nodes.
		var write = read;
		var slot = new createNode(a.height - 1, 0);
		var from = 0;

		// If the current slot is still containing data, then there will be at
		// least one more write, so we do not break this loop yet.
		while (read - write - (slot.table.length > 0 ? 1 : 0) < toRemove)
		{
			// Find out the max possible items for copying.
			var source = get2(a.table, b.table, read);
			var to = Math.min(M - slot.table.length, source.table.length);

			// Copy and adjust size table.
			slot.table = slot.table.concat(source.table.slice(from, to));
			if (slot.height > 0)
			{
				var len = slot.lengths.length;
				for (var i = len; i < len + to - from; i++)
				{
					slot.lengths[i] = length(slot.table[i]);
					slot.lengths[i] += (i > 0 ? slot.lengths[i - 1] : 0);
				}
			}

			from += to;

			// Only proceed to next slots[i] if the current one was
			// fully copied.
			if (source.table.length <= to)
			{
				read++; from = 0;
			}

			// Only create a new slot if the current one is filled up.
			if (slot.table.length === M)
			{
				saveSlot(newA, newB, write, slot);
				slot = createNode(a.height - 1, 0);
				write++;
			}
		}

		// Cleanup after the loop. Copy the last slot into the new nodes.
		if (slot.table.length > 0)
		{
			saveSlot(newA, newB, write, slot);
			write++;
		}

		// Shift the untouched slots to the left
		while (read < a.table.length + b.table.length )
		{
			saveSlot(newA, newB, write, get2(a.table, b.table, read));
			read++;
			write++;
		}

		return [newA, newB];
	}

	// Navigation functions
	function botRight(a)
	{
		return a.table[a.table.length - 1];
	}
	function botLeft(a)
	{
		return a.table[0];
	}

	// Copies a node for updating. Note that you should not use this if
	// only updating only one of "table" or "lengths" for performance reasons.
	function nodeCopy(a)
	{
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: a.table.slice()
		};
		if (a.height > 0)
		{
			newA.lengths = a.lengths.slice();
		}
		return newA;
	}

	// Returns how many items are in the tree.
	function length(array)
	{
		if (array.height === 0)
		{
			return array.table.length;
		}
		else
		{
			return array.lengths[array.lengths.length - 1];
		}
	}

	// Calculates in which slot of "table" the item probably is, then
	// find the exact slot via forward searching in  "lengths". Returns the index.
	function getSlot(i, a)
	{
		var slot = i >> (5 * a.height);
		while (a.lengths[slot] <= i)
		{
			slot++;
		}
		return slot;
	}

	// Recursively creates a tree with a given height containing
	// only the given item.
	function create(item, h)
	{
		if (h === 0)
		{
			return {
				ctor: '_Array',
				height: 0,
				table: [item]
			};
		}
		return {
			ctor: '_Array',
			height: h,
			table: [create(item, h - 1)],
			lengths: [1]
		};
	}

	// Recursively creates a tree that contains the given tree.
	function parentise(tree, h)
	{
		if (h === tree.height)
		{
			return tree;
		}

		return {
			ctor: '_Array',
			height: h,
			table: [parentise(tree, h - 1)],
			lengths: [length(tree)]
		};
	}

	// Emphasizes blood brotherhood beneath two trees.
	function siblise(a, b)
	{
		return {
			ctor: '_Array',
			height: a.height + 1,
			table: [a, b],
			lengths: [length(a), length(a) + length(b)]
		};
	}

	function toJSArray(a)
	{
		var jsArray = new Array(length(a));
		toJSArray_(jsArray, 0, a);
		return jsArray;
	}

	function toJSArray_(jsArray, i, a)
	{
		for (var t = 0; t < a.table.length; t++)
		{
			if (a.height === 0)
			{
				jsArray[i + t] = a.table[t];
			}
			else
			{
				var inc = t === 0 ? 0 : a.lengths[t - 1];
				toJSArray_(jsArray, i + inc, a.table[t]);
			}
		}
	}

	function fromJSArray(jsArray)
	{
		if (jsArray.length === 0)
		{
			return empty;
		}
		var h = Math.floor(Math.log(jsArray.length) / Math.log(M));
		return fromJSArray_(jsArray, h, 0, jsArray.length);
	}

	function fromJSArray_(jsArray, h, from, to)
	{
		if (h === 0)
		{
			return {
				ctor: '_Array',
				height: 0,
				table: jsArray.slice(from, to)
			};
		}

		var step = Math.pow(M, h);
		var table = new Array(Math.ceil((to - from) / step));
		var lengths = new Array(table.length);
		for (var i = 0; i < table.length; i++)
		{
			table[i] = fromJSArray_(jsArray, h - 1, from + (i * step), Math.min(from + ((i + 1) * step), to));
			lengths[i] = length(table[i]) + (i > 0 ? lengths[i - 1] : 0);
		}
		return {
			ctor: '_Array',
			height: h,
			table: table,
			lengths: lengths
		};
	}

	Elm.Native.Array.values = {
		empty: empty,
		fromList: fromList,
		toList: toList,
		initialize: F2(initialize),
		append: F2(append),
		push: F2(push),
		slice: F3(slice),
		get: F2(get),
		set: F3(set),
		map: F2(map),
		indexedMap: F2(indexedMap),
		foldl: F3(foldl),
		foldr: F3(foldr),
		length: length,

		toJSArray: toJSArray,
		fromJSArray: fromJSArray
	};

	return localRuntime.Native.Array.values = Elm.Native.Array.values;
};

Elm.Array = Elm.Array || {};
Elm.Array.make = function (_elm) {
   "use strict";
   _elm.Array = _elm.Array || {};
   if (_elm.Array.values) return _elm.Array.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Array = Elm.Native.Array.make(_elm);
   var _op = {};
   var append = $Native$Array.append;
   var length = $Native$Array.length;
   var isEmpty = function (array) {    return _U.eq(length(array),0);};
   var slice = $Native$Array.slice;
   var set = $Native$Array.set;
   var get = F2(function (i,array) {
      return _U.cmp(0,i) < 1 && _U.cmp(i,$Native$Array.length(array)) < 0 ? $Maybe.Just(A2($Native$Array.get,i,array)) : $Maybe.Nothing;
   });
   var push = $Native$Array.push;
   var empty = $Native$Array.empty;
   var filter = F2(function (isOkay,arr) {
      var update = F2(function (x,xs) {    return isOkay(x) ? A2($Native$Array.push,x,xs) : xs;});
      return A3($Native$Array.foldl,update,$Native$Array.empty,arr);
   });
   var foldr = $Native$Array.foldr;
   var foldl = $Native$Array.foldl;
   var indexedMap = $Native$Array.indexedMap;
   var map = $Native$Array.map;
   var toIndexedList = function (array) {
      return A3($List.map2,
      F2(function (v0,v1) {    return {ctor: "_Tuple2",_0: v0,_1: v1};}),
      _U.range(0,$Native$Array.length(array) - 1),
      $Native$Array.toList(array));
   };
   var toList = $Native$Array.toList;
   var fromList = $Native$Array.fromList;
   var initialize = $Native$Array.initialize;
   var repeat = F2(function (n,e) {    return A2(initialize,n,$Basics.always(e));});
   var Array = {ctor: "Array"};
   return _elm.Array.values = {_op: _op
                              ,empty: empty
                              ,repeat: repeat
                              ,initialize: initialize
                              ,fromList: fromList
                              ,isEmpty: isEmpty
                              ,length: length
                              ,push: push
                              ,append: append
                              ,get: get
                              ,set: set
                              ,slice: slice
                              ,toList: toList
                              ,toIndexedList: toIndexedList
                              ,map: map
                              ,indexedMap: indexedMap
                              ,filter: filter
                              ,foldl: foldl
                              ,foldr: foldr};
};
Elm.Json = Elm.Json || {};
Elm.Json.Encode = Elm.Json.Encode || {};
Elm.Json.Encode.make = function (_elm) {
   "use strict";
   _elm.Json = _elm.Json || {};
   _elm.Json.Encode = _elm.Json.Encode || {};
   if (_elm.Json.Encode.values) return _elm.Json.Encode.values;
   var _U = Elm.Native.Utils.make(_elm),$Array = Elm.Array.make(_elm),$Native$Json = Elm.Native.Json.make(_elm);
   var _op = {};
   var list = $Native$Json.encodeList;
   var array = $Native$Json.encodeArray;
   var object = $Native$Json.encodeObject;
   var $null = $Native$Json.encodeNull;
   var bool = $Native$Json.identity;
   var $float = $Native$Json.identity;
   var $int = $Native$Json.identity;
   var string = $Native$Json.identity;
   var encode = $Native$Json.encode;
   var Value = {ctor: "Value"};
   return _elm.Json.Encode.values = {_op: _op
                                    ,encode: encode
                                    ,string: string
                                    ,$int: $int
                                    ,$float: $float
                                    ,bool: bool
                                    ,$null: $null
                                    ,list: list
                                    ,array: array
                                    ,object: object};
};
Elm.Json = Elm.Json || {};
Elm.Json.Decode = Elm.Json.Decode || {};
Elm.Json.Decode.make = function (_elm) {
   "use strict";
   _elm.Json = _elm.Json || {};
   _elm.Json.Decode = _elm.Json.Decode || {};
   if (_elm.Json.Decode.values) return _elm.Json.Decode.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Array = Elm.Array.make(_elm),
   $Dict = Elm.Dict.make(_elm),
   $Json$Encode = Elm.Json.Encode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Json = Elm.Native.Json.make(_elm),
   $Result = Elm.Result.make(_elm);
   var _op = {};
   var tuple8 = $Native$Json.decodeTuple8;
   var tuple7 = $Native$Json.decodeTuple7;
   var tuple6 = $Native$Json.decodeTuple6;
   var tuple5 = $Native$Json.decodeTuple5;
   var tuple4 = $Native$Json.decodeTuple4;
   var tuple3 = $Native$Json.decodeTuple3;
   var tuple2 = $Native$Json.decodeTuple2;
   var tuple1 = $Native$Json.decodeTuple1;
   var succeed = $Native$Json.succeed;
   var fail = $Native$Json.fail;
   var andThen = $Native$Json.andThen;
   var customDecoder = $Native$Json.customDecoder;
   var decodeValue = $Native$Json.runDecoderValue;
   var value = $Native$Json.decodeValue;
   var maybe = $Native$Json.decodeMaybe;
   var $null = $Native$Json.decodeNull;
   var array = $Native$Json.decodeArray;
   var list = $Native$Json.decodeList;
   var bool = $Native$Json.decodeBool;
   var $int = $Native$Json.decodeInt;
   var $float = $Native$Json.decodeFloat;
   var string = $Native$Json.decodeString;
   var oneOf = $Native$Json.oneOf;
   var keyValuePairs = $Native$Json.decodeKeyValuePairs;
   var object8 = $Native$Json.decodeObject8;
   var object7 = $Native$Json.decodeObject7;
   var object6 = $Native$Json.decodeObject6;
   var object5 = $Native$Json.decodeObject5;
   var object4 = $Native$Json.decodeObject4;
   var object3 = $Native$Json.decodeObject3;
   var object2 = $Native$Json.decodeObject2;
   var object1 = $Native$Json.decodeObject1;
   _op[":="] = $Native$Json.decodeField;
   var at = F2(function (fields,decoder) {    return A3($List.foldr,F2(function (x,y) {    return A2(_op[":="],x,y);}),decoder,fields);});
   var decodeString = $Native$Json.runDecoderString;
   var map = $Native$Json.decodeObject1;
   var dict = function (decoder) {    return A2(map,$Dict.fromList,keyValuePairs(decoder));};
   var Decoder = {ctor: "Decoder"};
   return _elm.Json.Decode.values = {_op: _op
                                    ,decodeString: decodeString
                                    ,decodeValue: decodeValue
                                    ,string: string
                                    ,$int: $int
                                    ,$float: $float
                                    ,bool: bool
                                    ,$null: $null
                                    ,list: list
                                    ,array: array
                                    ,tuple1: tuple1
                                    ,tuple2: tuple2
                                    ,tuple3: tuple3
                                    ,tuple4: tuple4
                                    ,tuple5: tuple5
                                    ,tuple6: tuple6
                                    ,tuple7: tuple7
                                    ,tuple8: tuple8
                                    ,at: at
                                    ,object1: object1
                                    ,object2: object2
                                    ,object3: object3
                                    ,object4: object4
                                    ,object5: object5
                                    ,object6: object6
                                    ,object7: object7
                                    ,object8: object8
                                    ,keyValuePairs: keyValuePairs
                                    ,dict: dict
                                    ,maybe: maybe
                                    ,oneOf: oneOf
                                    ,map: map
                                    ,fail: fail
                                    ,succeed: succeed
                                    ,andThen: andThen
                                    ,value: value
                                    ,customDecoder: customDecoder};
};
Elm.Native = Elm.Native || {};
Elm.Native.History = {};
Elm.Native.History.make = function(localRuntime){

  localRuntime.Native = localRuntime.Native || {};
  localRuntime.Native.History = localRuntime.Native.History || {};

  if (localRuntime.Native.History.values){
    return localRuntime.Native.History.values;
  }

  var NS = Elm.Native.Signal.make(localRuntime);
  var Task = Elm.Native.Task.make(localRuntime);
  var Utils = Elm.Native.Utils.make(localRuntime);
  var node = window;

  // path : Signal String
  var path = NS.input('History.path', window.location.pathname);

  // length : Signal Int
  var length = NS.input('History.length', window.history.length);

  // hash : Signal String
  var hash = NS.input('History.hash', window.location.hash);

  localRuntime.addListener([path.id, length.id], node, 'popstate', function getPath(event){
    localRuntime.notify(path.id, window.location.pathname);
    localRuntime.notify(length.id, window.history.length);
    localRuntime.notify(hash.id, window.location.hash);
  });

  localRuntime.addListener([hash.id], node, 'hashchange', function getHash(event){
    localRuntime.notify(hash.id, window.location.hash);
  });

  // setPath : String -> Task error ()
  var setPath = function(urlpath){
    return Task.asyncFunction(function(callback){
      setTimeout(function(){
        localRuntime.notify(path.id, urlpath);
        window.history.pushState({}, "", urlpath);
        localRuntime.notify(hash.id, window.location.hash);
        localRuntime.notify(length.id, window.history.length);

      },0);
      return callback(Task.succeed(Utils.Tuple0));
    });
  };

  // replacePath : String -> Task error ()
  var replacePath = function(urlpath){
    return Task.asyncFunction(function(callback){
      setTimeout(function(){
        localRuntime.notify(path.id, urlpath);
        window.history.replaceState({}, "", urlpath);
        localRuntime.notify(hash.id, window.location.hash);
        localRuntime.notify(length.id, window.history.length);
      },0);
      return callback(Task.succeed(Utils.Tuple0));
    });
  };

  // go : Int -> Task error ()
  var go = function(n){
    return Task.asyncFunction(function(callback){
      setTimeout(function(){
        window.history.go(n);
        localRuntime.notify(length.id, window.history.length);
        localRuntime.notify(hash.id, window.location.hash);
      }, 0);
      return callback(Task.succeed(Utils.Tuple0));
    });
  };

  // back : Task error ()
  var back = Task.asyncFunction(function(callback){
    setTimeout(function(){
      localRuntime.notify(hash.id, window.location.hash);
      window.history.back();
      localRuntime.notify(length.id, window.history.length);

    }, 0);
    return callback(Task.succeed(Utils.Tuple0));
  });

  // forward : Task error ()
  var forward = Task.asyncFunction(function(callback){
    setTimeout(function(){
      window.history.forward();
      localRuntime.notify(length.id, window.history.length);
      localRuntime.notify(hash.id, window.location.hash);
    }, 0);
    return callback(Task.succeed(Utils.Tuple0));
  });



  return {
    path        : path,
    setPath     : setPath,
    replacePath : replacePath,
    go          : go,
    back        : back,
    forward     : forward,
    length      : length,
    hash        : hash
  };

};

Elm.History = Elm.History || {};
Elm.History.make = function (_elm) {
   "use strict";
   _elm.History = _elm.History || {};
   if (_elm.History.values) return _elm.History.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$History = Elm.Native.History.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var path = $Native$History.path;
   var hash = $Native$History.hash;
   var length = $Native$History.length;
   var forward = $Native$History.forward;
   var back = $Native$History.back;
   var go = $Native$History.go;
   var replacePath = $Native$History.replacePath;
   var setPath = $Native$History.setPath;
   return _elm.History.values = {_op: _op,setPath: setPath,replacePath: replacePath,go: go,back: back,forward: forward,length: length,hash: hash,path: path};
};
Elm.Native.Effects = {};
Elm.Native.Effects.make = function(localRuntime) {

	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Effects = localRuntime.Native.Effects || {};
	if (localRuntime.Native.Effects.values)
	{
		return localRuntime.Native.Effects.values;
	}

	var Task = Elm.Native.Task.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);
	var Signal = Elm.Signal.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);


	// polyfill so things will work even if rAF is not available for some reason
	var _requestAnimationFrame =
		typeof requestAnimationFrame !== 'undefined'
			? requestAnimationFrame
			: function(cb) { setTimeout(cb, 1000 / 60); }
			;


	// batchedSending and sendCallback implement a small state machine in order
	// to schedule only one send(time) call per animation frame.
	//
	// Invariants:
	// 1. In the NO_REQUEST state, there is never a scheduled sendCallback.
	// 2. In the PENDING_REQUEST and EXTRA_REQUEST states, there is always exactly
	//    one scheduled sendCallback.
	var NO_REQUEST = 0;
	var PENDING_REQUEST = 1;
	var EXTRA_REQUEST = 2;
	var state = NO_REQUEST;
	var messageArray = [];


	function batchedSending(address, tickMessages)
	{
		// insert ticks into the messageArray
		var foundAddress = false;

		for (var i = messageArray.length; i--; )
		{
			if (messageArray[i].address === address)
			{
				foundAddress = true;
				messageArray[i].tickMessages = A3(List.foldl, List.cons, messageArray[i].tickMessages, tickMessages);
				break;
			}
		}

		if (!foundAddress)
		{
			messageArray.push({ address: address, tickMessages: tickMessages });
		}

		// do the appropriate state transition
		switch (state)
		{
			case NO_REQUEST:
				_requestAnimationFrame(sendCallback);
				state = PENDING_REQUEST;
				break;
			case PENDING_REQUEST:
				state = PENDING_REQUEST;
				break;
			case EXTRA_REQUEST:
				state = PENDING_REQUEST;
				break;
		}
	}


	function sendCallback(time)
	{
		switch (state)
		{
			case NO_REQUEST:
				// This state should not be possible. How can there be no
				// request, yet somehow we are actively fulfilling a
				// request?
				throw new Error(
					'Unexpected send callback.\n' +
					'Please report this to <https://github.com/evancz/elm-effects/issues>.'
				);

			case PENDING_REQUEST:
				// At this point, we do not *know* that another frame is
				// needed, but we make an extra request to rAF just in
				// case. It's possible to drop a frame if rAF is called
				// too late, so we just do it preemptively.
				_requestAnimationFrame(sendCallback);
				state = EXTRA_REQUEST;

				// There's also stuff we definitely need to send.
				send(time);
				return;

			case EXTRA_REQUEST:
				// Turns out the extra request was not needed, so we will
				// stop calling rAF. No reason to call it all the time if
				// no one needs it.
				state = NO_REQUEST;
				return;
		}
	}


	function send(time)
	{
		for (var i = messageArray.length; i--; )
		{
			var messages = A3(
				List.foldl,
				F2( function(toAction, list) { return List.Cons(toAction(time), list); } ),
				List.Nil,
				messageArray[i].tickMessages
			);
			Task.perform( A2(Signal.send, messageArray[i].address, messages) );
		}
		messageArray = [];
	}


	function requestTickSending(address, tickMessages)
	{
		return Task.asyncFunction(function(callback) {
			batchedSending(address, tickMessages);
			callback(Task.succeed(Utils.Tuple0));
		});
	}


	return localRuntime.Native.Effects.values = {
		requestTickSending: F2(requestTickSending)
	};

};

Elm.Effects = Elm.Effects || {};
Elm.Effects.make = function (_elm) {
   "use strict";
   _elm.Effects = _elm.Effects || {};
   if (_elm.Effects.values) return _elm.Effects.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Effects = Elm.Native.Effects.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   var ignore = function (task) {    return A2($Task.map,$Basics.always({ctor: "_Tuple0"}),task);};
   var requestTickSending = $Native$Effects.requestTickSending;
   var toTaskHelp = F3(function (address,effect,_p0) {
      var _p1 = _p0;
      var _p5 = _p1._1;
      var _p4 = _p1;
      var _p3 = _p1._0;
      var _p2 = effect;
      switch (_p2.ctor)
      {case "Task": var reporter = A2($Task.andThen,_p2._0,function (answer) {    return A2($Signal.send,address,_U.list([answer]));});
           return {ctor: "_Tuple2",_0: A2($Task.andThen,_p3,$Basics.always(ignore($Task.spawn(reporter)))),_1: _p5};
         case "Tick": return {ctor: "_Tuple2",_0: _p3,_1: A2($List._op["::"],_p2._0,_p5)};
         case "None": return _p4;
         default: return A3($List.foldl,toTaskHelp(address),_p4,_p2._0);}
   });
   var toTask = F2(function (address,effect) {
      var _p6 = A3(toTaskHelp,address,effect,{ctor: "_Tuple2",_0: $Task.succeed({ctor: "_Tuple0"}),_1: _U.list([])});
      var combinedTask = _p6._0;
      var tickMessages = _p6._1;
      return $List.isEmpty(tickMessages) ? combinedTask : A2($Task.andThen,combinedTask,$Basics.always(A2(requestTickSending,address,tickMessages)));
   });
   var Never = function (a) {    return {ctor: "Never",_0: a};};
   var Batch = function (a) {    return {ctor: "Batch",_0: a};};
   var batch = Batch;
   var None = {ctor: "None"};
   var none = None;
   var Tick = function (a) {    return {ctor: "Tick",_0: a};};
   var tick = Tick;
   var Task = function (a) {    return {ctor: "Task",_0: a};};
   var task = Task;
   var map = F2(function (func,effect) {
      var _p7 = effect;
      switch (_p7.ctor)
      {case "Task": return Task(A2($Task.map,func,_p7._0));
         case "Tick": return Tick(function (_p8) {    return func(_p7._0(_p8));});
         case "None": return None;
         default: return Batch(A2($List.map,map(func),_p7._0));}
   });
   return _elm.Effects.values = {_op: _op,none: none,task: task,tick: tick,map: map,batch: batch,toTask: toTask};
};
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":1}],3:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],4:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],5:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":13,"is-object":3}],6:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":11,"../vnode/is-vnode.js":14,"../vnode/is-vtext.js":15,"../vnode/is-widget.js":16,"./apply-properties":5,"global/document":2}],7:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],8:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var render = require("./create-element")
var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":16,"../vnode/vpatch.js":19,"./apply-properties":5,"./create-element":6,"./update-widget":10}],9:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches) {
    return patchRecursive(rootNode, patches)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions) {
        renderOptions = { patch: patchRecursive }
        if (ownerDocument !== document) {
            renderOptions.document = ownerDocument
        }
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./dom-index":7,"./patch-op":8,"global/document":2,"x-is-array":4}],10:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":16}],11:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":12,"./is-vnode":14,"./is-vtext":15,"./is-widget":16}],12:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],13:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],14:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":17}],15:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":17}],16:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],17:[function(require,module,exports){
module.exports = "2"

},{}],18:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":12,"./is-vhook":13,"./is-vnode":14,"./is-widget":16,"./version":17}],19:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":17}],20:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":17}],21:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":13,"is-object":3}],22:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free,     // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":11,"../vnode/is-thunk":12,"../vnode/is-vnode":14,"../vnode/is-vtext":15,"../vnode/is-widget":16,"../vnode/vpatch":19,"./diff-props":21,"x-is-array":4}],23:[function(require,module,exports){
var VNode = require('virtual-dom/vnode/vnode');
var VText = require('virtual-dom/vnode/vtext');
var diff = require('virtual-dom/vtree/diff');
var patch = require('virtual-dom/vdom/patch');
var createElement = require('virtual-dom/vdom/create-element');
var isHook = require("virtual-dom/vnode/is-vhook");


Elm.Native.VirtualDom = {};
Elm.Native.VirtualDom.make = function(elm)
{
	elm.Native = elm.Native || {};
	elm.Native.VirtualDom = elm.Native.VirtualDom || {};
	if (elm.Native.VirtualDom.values)
	{
		return elm.Native.VirtualDom.values;
	}

	var Element = Elm.Native.Graphics.Element.make(elm);
	var Json = Elm.Native.Json.make(elm);
	var List = Elm.Native.List.make(elm);
	var Signal = Elm.Native.Signal.make(elm);
	var Utils = Elm.Native.Utils.make(elm);

	var ATTRIBUTE_KEY = 'UniqueNameThatOthersAreVeryUnlikelyToUse';



	// VIRTUAL DOM NODES


	function text(string)
	{
		return new VText(string);
	}

	function node(name)
	{
		return F2(function(propertyList, contents) {
			return makeNode(name, propertyList, contents);
		});
	}


	// BUILD VIRTUAL DOME NODES


	function makeNode(name, propertyList, contents)
	{
		var props = listToProperties(propertyList);

		var key, namespace;
		// support keys
		if (props.key !== undefined)
		{
			key = props.key;
			props.key = undefined;
		}

		// support namespace
		if (props.namespace !== undefined)
		{
			namespace = props.namespace;
			props.namespace = undefined;
		}

		// ensure that setting text of an input does not move the cursor
		var useSoftSet =
			(name === 'input' || name === 'textarea')
			&& props.value !== undefined
			&& !isHook(props.value);

		if (useSoftSet)
		{
			props.value = SoftSetHook(props.value);
		}

		return new VNode(name, props, List.toArray(contents), key, namespace);
	}

	function listToProperties(list)
	{
		var object = {};
		while (list.ctor !== '[]')
		{
			var entry = list._0;
			if (entry.key === ATTRIBUTE_KEY)
			{
				object.attributes = object.attributes || {};
				object.attributes[entry.value.attrKey] = entry.value.attrValue;
			}
			else
			{
				object[entry.key] = entry.value;
			}
			list = list._1;
		}
		return object;
	}



	// PROPERTIES AND ATTRIBUTES


	function property(key, value)
	{
		return {
			key: key,
			value: value
		};
	}

	function attribute(key, value)
	{
		return {
			key: ATTRIBUTE_KEY,
			value: {
				attrKey: key,
				attrValue: value
			}
		};
	}



	// NAMESPACED ATTRIBUTES


	function attributeNS(namespace, key, value)
	{
		return {
			key: key,
			value: new AttributeHook(namespace, key, value)
		};
	}

	function AttributeHook(namespace, key, value)
	{
		if (!(this instanceof AttributeHook))
		{
			return new AttributeHook(namespace, key, value);
		}

		this.namespace = namespace;
		this.key = key;
		this.value = value;
	}

	AttributeHook.prototype.hook = function (node, prop, prev)
	{
		if (prev
			&& prev.type === 'AttributeHook'
			&& prev.value === this.value
			&& prev.namespace === this.namespace)
		{
			return;
		}

		node.setAttributeNS(this.namespace, prop, this.value);
	};

	AttributeHook.prototype.unhook = function (node, prop, next)
	{
		if (next
			&& next.type === 'AttributeHook'
			&& next.namespace === this.namespace)
		{
			return;
		}

		node.removeAttributeNS(this.namespace, this.key);
	};

	AttributeHook.prototype.type = 'AttributeHook';



	// EVENTS


	function on(name, options, decoder, createMessage)
	{
		function eventHandler(event)
		{
			var value = A2(Json.runDecoderValue, decoder, event);
			if (value.ctor === 'Ok')
			{
				if (options.stopPropagation)
				{
					event.stopPropagation();
				}
				if (options.preventDefault)
				{
					event.preventDefault();
				}
				Signal.sendMessage(createMessage(value._0));
			}
		}
		return property('on' + name, eventHandler);
	}

	function SoftSetHook(value)
	{
		if (!(this instanceof SoftSetHook))
		{
			return new SoftSetHook(value);
		}

		this.value = value;
	}

	SoftSetHook.prototype.hook = function (node, propertyName)
	{
		if (node[propertyName] !== this.value)
		{
			node[propertyName] = this.value;
		}
	};



	// INTEGRATION WITH ELEMENTS


	function ElementWidget(element)
	{
		this.element = element;
	}

	ElementWidget.prototype.type = "Widget";

	ElementWidget.prototype.init = function init()
	{
		return Element.render(this.element);
	};

	ElementWidget.prototype.update = function update(previous, node)
	{
		return Element.update(node, previous.element, this.element);
	};

	function fromElement(element)
	{
		return new ElementWidget(element);
	}

	function toElement(width, height, html)
	{
		return A3(Element.newElement, width, height, {
			ctor: 'Custom',
			type: 'evancz/elm-html',
			render: render,
			update: update,
			model: html
		});
	}



	// RENDER AND UPDATE


	function render(model)
	{
		var element = Element.createNode('div');
		element.appendChild(createElement(model));
		return element;
	}

	function update(node, oldModel, newModel)
	{
		updateAndReplace(node.firstChild, oldModel, newModel);
		return node;
	}

	function updateAndReplace(node, oldModel, newModel)
	{
		var patches = diff(oldModel, newModel);
		var newNode = patch(node, patches);
		return newNode;
	}



	// LAZINESS


	function lazyRef(fn, a)
	{
		function thunk()
		{
			return fn(a);
		}
		return new Thunk(fn, [a], thunk);
	}

	function lazyRef2(fn, a, b)
	{
		function thunk()
		{
			return A2(fn, a, b);
		}
		return new Thunk(fn, [a,b], thunk);
	}

	function lazyRef3(fn, a, b, c)
	{
		function thunk()
		{
			return A3(fn, a, b, c);
		}
		return new Thunk(fn, [a,b,c], thunk);
	}

	function Thunk(fn, args, thunk)
	{
		/* public (used by VirtualDom.js) */
		this.vnode = null;
		this.key = undefined;

		/* private */
		this.fn = fn;
		this.args = args;
		this.thunk = thunk;
	}

	Thunk.prototype.type = "Thunk";
	Thunk.prototype.render = renderThunk;

	function shouldUpdate(current, previous)
	{
		if (current.fn !== previous.fn)
		{
			return true;
		}

		// if it's the same function, we know the number of args must match
		var cargs = current.args;
		var pargs = previous.args;

		for (var i = cargs.length; i--; )
		{
			if (cargs[i] !== pargs[i])
			{
				return true;
			}
		}

		return false;
	}

	function renderThunk(previous)
	{
		if (previous == null || shouldUpdate(this, previous))
		{
			return this.thunk();
		}
		else
		{
			return previous.vnode;
		}
	}


	return elm.Native.VirtualDom.values = Elm.Native.VirtualDom.values = {
		node: node,
		text: text,
		on: F4(on),

		property: F2(property),
		attribute: F2(attribute),
		attributeNS: F3(attributeNS),

		lazy: F2(lazyRef),
		lazy2: F3(lazyRef2),
		lazy3: F4(lazyRef3),

		toElement: F3(toElement),
		fromElement: fromElement,

		render: createElement,
		updateAndReplace: updateAndReplace
	};
};

},{"virtual-dom/vdom/create-element":6,"virtual-dom/vdom/patch":9,"virtual-dom/vnode/is-vhook":13,"virtual-dom/vnode/vnode":18,"virtual-dom/vnode/vtext":20,"virtual-dom/vtree/diff":22}]},{},[23]);

Elm.VirtualDom = Elm.VirtualDom || {};
Elm.VirtualDom.make = function (_elm) {
   "use strict";
   _elm.VirtualDom = _elm.VirtualDom || {};
   if (_elm.VirtualDom.values) return _elm.VirtualDom.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Graphics$Element = Elm.Graphics.Element.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$VirtualDom = Elm.Native.VirtualDom.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var lazy3 = $Native$VirtualDom.lazy3;
   var lazy2 = $Native$VirtualDom.lazy2;
   var lazy = $Native$VirtualDom.lazy;
   var defaultOptions = {stopPropagation: false,preventDefault: false};
   var Options = F2(function (a,b) {    return {stopPropagation: a,preventDefault: b};});
   var onWithOptions = $Native$VirtualDom.on;
   var on = F3(function (eventName,decoder,toMessage) {    return A4($Native$VirtualDom.on,eventName,defaultOptions,decoder,toMessage);});
   var attributeNS = $Native$VirtualDom.attributeNS;
   var attribute = $Native$VirtualDom.attribute;
   var property = $Native$VirtualDom.property;
   var Property = {ctor: "Property"};
   var fromElement = $Native$VirtualDom.fromElement;
   var toElement = $Native$VirtualDom.toElement;
   var text = $Native$VirtualDom.text;
   var node = $Native$VirtualDom.node;
   var Node = {ctor: "Node"};
   return _elm.VirtualDom.values = {_op: _op
                                   ,text: text
                                   ,node: node
                                   ,toElement: toElement
                                   ,fromElement: fromElement
                                   ,property: property
                                   ,attribute: attribute
                                   ,attributeNS: attributeNS
                                   ,on: on
                                   ,onWithOptions: onWithOptions
                                   ,defaultOptions: defaultOptions
                                   ,lazy: lazy
                                   ,lazy2: lazy2
                                   ,lazy3: lazy3
                                   ,Options: Options};
};
Elm.Html = Elm.Html || {};
Elm.Html.make = function (_elm) {
   "use strict";
   _elm.Html = _elm.Html || {};
   if (_elm.Html.values) return _elm.Html.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Graphics$Element = Elm.Graphics.Element.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $VirtualDom = Elm.VirtualDom.make(_elm);
   var _op = {};
   var fromElement = $VirtualDom.fromElement;
   var toElement = $VirtualDom.toElement;
   var text = $VirtualDom.text;
   var node = $VirtualDom.node;
   var body = node("body");
   var section = node("section");
   var nav = node("nav");
   var article = node("article");
   var aside = node("aside");
   var h1 = node("h1");
   var h2 = node("h2");
   var h3 = node("h3");
   var h4 = node("h4");
   var h5 = node("h5");
   var h6 = node("h6");
   var header = node("header");
   var footer = node("footer");
   var address = node("address");
   var main$ = node("main");
   var p = node("p");
   var hr = node("hr");
   var pre = node("pre");
   var blockquote = node("blockquote");
   var ol = node("ol");
   var ul = node("ul");
   var li = node("li");
   var dl = node("dl");
   var dt = node("dt");
   var dd = node("dd");
   var figure = node("figure");
   var figcaption = node("figcaption");
   var div = node("div");
   var a = node("a");
   var em = node("em");
   var strong = node("strong");
   var small = node("small");
   var s = node("s");
   var cite = node("cite");
   var q = node("q");
   var dfn = node("dfn");
   var abbr = node("abbr");
   var time = node("time");
   var code = node("code");
   var $var = node("var");
   var samp = node("samp");
   var kbd = node("kbd");
   var sub = node("sub");
   var sup = node("sup");
   var i = node("i");
   var b = node("b");
   var u = node("u");
   var mark = node("mark");
   var ruby = node("ruby");
   var rt = node("rt");
   var rp = node("rp");
   var bdi = node("bdi");
   var bdo = node("bdo");
   var span = node("span");
   var br = node("br");
   var wbr = node("wbr");
   var ins = node("ins");
   var del = node("del");
   var img = node("img");
   var iframe = node("iframe");
   var embed = node("embed");
   var object = node("object");
   var param = node("param");
   var video = node("video");
   var audio = node("audio");
   var source = node("source");
   var track = node("track");
   var canvas = node("canvas");
   var svg = node("svg");
   var math = node("math");
   var table = node("table");
   var caption = node("caption");
   var colgroup = node("colgroup");
   var col = node("col");
   var tbody = node("tbody");
   var thead = node("thead");
   var tfoot = node("tfoot");
   var tr = node("tr");
   var td = node("td");
   var th = node("th");
   var form = node("form");
   var fieldset = node("fieldset");
   var legend = node("legend");
   var label = node("label");
   var input = node("input");
   var button = node("button");
   var select = node("select");
   var datalist = node("datalist");
   var optgroup = node("optgroup");
   var option = node("option");
   var textarea = node("textarea");
   var keygen = node("keygen");
   var output = node("output");
   var progress = node("progress");
   var meter = node("meter");
   var details = node("details");
   var summary = node("summary");
   var menuitem = node("menuitem");
   var menu = node("menu");
   return _elm.Html.values = {_op: _op
                             ,node: node
                             ,text: text
                             ,toElement: toElement
                             ,fromElement: fromElement
                             ,body: body
                             ,section: section
                             ,nav: nav
                             ,article: article
                             ,aside: aside
                             ,h1: h1
                             ,h2: h2
                             ,h3: h3
                             ,h4: h4
                             ,h5: h5
                             ,h6: h6
                             ,header: header
                             ,footer: footer
                             ,address: address
                             ,main$: main$
                             ,p: p
                             ,hr: hr
                             ,pre: pre
                             ,blockquote: blockquote
                             ,ol: ol
                             ,ul: ul
                             ,li: li
                             ,dl: dl
                             ,dt: dt
                             ,dd: dd
                             ,figure: figure
                             ,figcaption: figcaption
                             ,div: div
                             ,a: a
                             ,em: em
                             ,strong: strong
                             ,small: small
                             ,s: s
                             ,cite: cite
                             ,q: q
                             ,dfn: dfn
                             ,abbr: abbr
                             ,time: time
                             ,code: code
                             ,$var: $var
                             ,samp: samp
                             ,kbd: kbd
                             ,sub: sub
                             ,sup: sup
                             ,i: i
                             ,b: b
                             ,u: u
                             ,mark: mark
                             ,ruby: ruby
                             ,rt: rt
                             ,rp: rp
                             ,bdi: bdi
                             ,bdo: bdo
                             ,span: span
                             ,br: br
                             ,wbr: wbr
                             ,ins: ins
                             ,del: del
                             ,img: img
                             ,iframe: iframe
                             ,embed: embed
                             ,object: object
                             ,param: param
                             ,video: video
                             ,audio: audio
                             ,source: source
                             ,track: track
                             ,canvas: canvas
                             ,svg: svg
                             ,math: math
                             ,table: table
                             ,caption: caption
                             ,colgroup: colgroup
                             ,col: col
                             ,tbody: tbody
                             ,thead: thead
                             ,tfoot: tfoot
                             ,tr: tr
                             ,td: td
                             ,th: th
                             ,form: form
                             ,fieldset: fieldset
                             ,legend: legend
                             ,label: label
                             ,input: input
                             ,button: button
                             ,select: select
                             ,datalist: datalist
                             ,optgroup: optgroup
                             ,option: option
                             ,textarea: textarea
                             ,keygen: keygen
                             ,output: output
                             ,progress: progress
                             ,meter: meter
                             ,details: details
                             ,summary: summary
                             ,menuitem: menuitem
                             ,menu: menu};
};
Elm.Html = Elm.Html || {};
Elm.Html.Attributes = Elm.Html.Attributes || {};
Elm.Html.Attributes.make = function (_elm) {
   "use strict";
   _elm.Html = _elm.Html || {};
   _elm.Html.Attributes = _elm.Html.Attributes || {};
   if (_elm.Html.Attributes.values) return _elm.Html.Attributes.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Json$Encode = Elm.Json.Encode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm),
   $VirtualDom = Elm.VirtualDom.make(_elm);
   var _op = {};
   var attribute = $VirtualDom.attribute;
   var contextmenu = function (value) {    return A2(attribute,"contextmenu",value);};
   var property = $VirtualDom.property;
   var stringProperty = F2(function (name,string) {    return A2(property,name,$Json$Encode.string(string));});
   var $class = function (name) {    return A2(stringProperty,"className",name);};
   var id = function (name) {    return A2(stringProperty,"id",name);};
   var title = function (name) {    return A2(stringProperty,"title",name);};
   var accesskey = function ($char) {    return A2(stringProperty,"accessKey",$String.fromChar($char));};
   var dir = function (value) {    return A2(stringProperty,"dir",value);};
   var draggable = function (value) {    return A2(stringProperty,"draggable",value);};
   var dropzone = function (value) {    return A2(stringProperty,"dropzone",value);};
   var itemprop = function (value) {    return A2(stringProperty,"itemprop",value);};
   var lang = function (value) {    return A2(stringProperty,"lang",value);};
   var tabindex = function (n) {    return A2(stringProperty,"tabIndex",$Basics.toString(n));};
   var charset = function (value) {    return A2(stringProperty,"charset",value);};
   var content = function (value) {    return A2(stringProperty,"content",value);};
   var httpEquiv = function (value) {    return A2(stringProperty,"httpEquiv",value);};
   var language = function (value) {    return A2(stringProperty,"language",value);};
   var src = function (value) {    return A2(stringProperty,"src",value);};
   var height = function (value) {    return A2(stringProperty,"height",$Basics.toString(value));};
   var width = function (value) {    return A2(stringProperty,"width",$Basics.toString(value));};
   var alt = function (value) {    return A2(stringProperty,"alt",value);};
   var preload = function (value) {    return A2(stringProperty,"preload",value);};
   var poster = function (value) {    return A2(stringProperty,"poster",value);};
   var kind = function (value) {    return A2(stringProperty,"kind",value);};
   var srclang = function (value) {    return A2(stringProperty,"srclang",value);};
   var sandbox = function (value) {    return A2(stringProperty,"sandbox",value);};
   var srcdoc = function (value) {    return A2(stringProperty,"srcdoc",value);};
   var type$ = function (value) {    return A2(stringProperty,"type",value);};
   var value = function (value) {    return A2(stringProperty,"value",value);};
   var placeholder = function (value) {    return A2(stringProperty,"placeholder",value);};
   var accept = function (value) {    return A2(stringProperty,"accept",value);};
   var acceptCharset = function (value) {    return A2(stringProperty,"acceptCharset",value);};
   var action = function (value) {    return A2(stringProperty,"action",value);};
   var autocomplete = function (bool) {    return A2(stringProperty,"autocomplete",bool ? "on" : "off");};
   var autosave = function (value) {    return A2(stringProperty,"autosave",value);};
   var enctype = function (value) {    return A2(stringProperty,"enctype",value);};
   var formaction = function (value) {    return A2(stringProperty,"formAction",value);};
   var list = function (value) {    return A2(stringProperty,"list",value);};
   var minlength = function (n) {    return A2(stringProperty,"minLength",$Basics.toString(n));};
   var maxlength = function (n) {    return A2(stringProperty,"maxLength",$Basics.toString(n));};
   var method = function (value) {    return A2(stringProperty,"method",value);};
   var name = function (value) {    return A2(stringProperty,"name",value);};
   var pattern = function (value) {    return A2(stringProperty,"pattern",value);};
   var size = function (n) {    return A2(stringProperty,"size",$Basics.toString(n));};
   var $for = function (value) {    return A2(stringProperty,"htmlFor",value);};
   var form = function (value) {    return A2(stringProperty,"form",value);};
   var max = function (value) {    return A2(stringProperty,"max",value);};
   var min = function (value) {    return A2(stringProperty,"min",value);};
   var step = function (n) {    return A2(stringProperty,"step",n);};
   var cols = function (n) {    return A2(stringProperty,"cols",$Basics.toString(n));};
   var rows = function (n) {    return A2(stringProperty,"rows",$Basics.toString(n));};
   var wrap = function (value) {    return A2(stringProperty,"wrap",value);};
   var usemap = function (value) {    return A2(stringProperty,"useMap",value);};
   var shape = function (value) {    return A2(stringProperty,"shape",value);};
   var coords = function (value) {    return A2(stringProperty,"coords",value);};
   var challenge = function (value) {    return A2(stringProperty,"challenge",value);};
   var keytype = function (value) {    return A2(stringProperty,"keytype",value);};
   var align = function (value) {    return A2(stringProperty,"align",value);};
   var cite = function (value) {    return A2(stringProperty,"cite",value);};
   var href = function (value) {    return A2(stringProperty,"href",value);};
   var target = function (value) {    return A2(stringProperty,"target",value);};
   var downloadAs = function (value) {    return A2(stringProperty,"download",value);};
   var hreflang = function (value) {    return A2(stringProperty,"hreflang",value);};
   var media = function (value) {    return A2(stringProperty,"media",value);};
   var ping = function (value) {    return A2(stringProperty,"ping",value);};
   var rel = function (value) {    return A2(stringProperty,"rel",value);};
   var datetime = function (value) {    return A2(stringProperty,"datetime",value);};
   var pubdate = function (value) {    return A2(stringProperty,"pubdate",value);};
   var start = function (n) {    return A2(stringProperty,"start",$Basics.toString(n));};
   var colspan = function (n) {    return A2(stringProperty,"colSpan",$Basics.toString(n));};
   var headers = function (value) {    return A2(stringProperty,"headers",value);};
   var rowspan = function (n) {    return A2(stringProperty,"rowSpan",$Basics.toString(n));};
   var scope = function (value) {    return A2(stringProperty,"scope",value);};
   var manifest = function (value) {    return A2(stringProperty,"manifest",value);};
   var boolProperty = F2(function (name,bool) {    return A2(property,name,$Json$Encode.bool(bool));});
   var hidden = function (bool) {    return A2(boolProperty,"hidden",bool);};
   var contenteditable = function (bool) {    return A2(boolProperty,"contentEditable",bool);};
   var spellcheck = function (bool) {    return A2(boolProperty,"spellcheck",bool);};
   var async = function (bool) {    return A2(boolProperty,"async",bool);};
   var defer = function (bool) {    return A2(boolProperty,"defer",bool);};
   var scoped = function (bool) {    return A2(boolProperty,"scoped",bool);};
   var autoplay = function (bool) {    return A2(boolProperty,"autoplay",bool);};
   var controls = function (bool) {    return A2(boolProperty,"controls",bool);};
   var loop = function (bool) {    return A2(boolProperty,"loop",bool);};
   var $default = function (bool) {    return A2(boolProperty,"default",bool);};
   var seamless = function (bool) {    return A2(boolProperty,"seamless",bool);};
   var checked = function (bool) {    return A2(boolProperty,"checked",bool);};
   var selected = function (bool) {    return A2(boolProperty,"selected",bool);};
   var autofocus = function (bool) {    return A2(boolProperty,"autofocus",bool);};
   var disabled = function (bool) {    return A2(boolProperty,"disabled",bool);};
   var multiple = function (bool) {    return A2(boolProperty,"multiple",bool);};
   var novalidate = function (bool) {    return A2(boolProperty,"noValidate",bool);};
   var readonly = function (bool) {    return A2(boolProperty,"readOnly",bool);};
   var required = function (bool) {    return A2(boolProperty,"required",bool);};
   var ismap = function (value) {    return A2(boolProperty,"isMap",value);};
   var download = function (bool) {    return A2(boolProperty,"download",bool);};
   var reversed = function (bool) {    return A2(boolProperty,"reversed",bool);};
   var classList = function (list) {    return $class(A2($String.join," ",A2($List.map,$Basics.fst,A2($List.filter,$Basics.snd,list))));};
   var style = function (props) {
      return A2(property,
      "style",
      $Json$Encode.object(A2($List.map,function (_p0) {    var _p1 = _p0;return {ctor: "_Tuple2",_0: _p1._0,_1: $Json$Encode.string(_p1._1)};},props)));
   };
   var key = function (k) {    return A2(stringProperty,"key",k);};
   return _elm.Html.Attributes.values = {_op: _op
                                        ,key: key
                                        ,style: style
                                        ,$class: $class
                                        ,classList: classList
                                        ,id: id
                                        ,title: title
                                        ,hidden: hidden
                                        ,type$: type$
                                        ,value: value
                                        ,checked: checked
                                        ,placeholder: placeholder
                                        ,selected: selected
                                        ,accept: accept
                                        ,acceptCharset: acceptCharset
                                        ,action: action
                                        ,autocomplete: autocomplete
                                        ,autofocus: autofocus
                                        ,autosave: autosave
                                        ,disabled: disabled
                                        ,enctype: enctype
                                        ,formaction: formaction
                                        ,list: list
                                        ,maxlength: maxlength
                                        ,minlength: minlength
                                        ,method: method
                                        ,multiple: multiple
                                        ,name: name
                                        ,novalidate: novalidate
                                        ,pattern: pattern
                                        ,readonly: readonly
                                        ,required: required
                                        ,size: size
                                        ,$for: $for
                                        ,form: form
                                        ,max: max
                                        ,min: min
                                        ,step: step
                                        ,cols: cols
                                        ,rows: rows
                                        ,wrap: wrap
                                        ,href: href
                                        ,target: target
                                        ,download: download
                                        ,downloadAs: downloadAs
                                        ,hreflang: hreflang
                                        ,media: media
                                        ,ping: ping
                                        ,rel: rel
                                        ,ismap: ismap
                                        ,usemap: usemap
                                        ,shape: shape
                                        ,coords: coords
                                        ,src: src
                                        ,height: height
                                        ,width: width
                                        ,alt: alt
                                        ,autoplay: autoplay
                                        ,controls: controls
                                        ,loop: loop
                                        ,preload: preload
                                        ,poster: poster
                                        ,$default: $default
                                        ,kind: kind
                                        ,srclang: srclang
                                        ,sandbox: sandbox
                                        ,seamless: seamless
                                        ,srcdoc: srcdoc
                                        ,reversed: reversed
                                        ,start: start
                                        ,align: align
                                        ,colspan: colspan
                                        ,rowspan: rowspan
                                        ,headers: headers
                                        ,scope: scope
                                        ,async: async
                                        ,charset: charset
                                        ,content: content
                                        ,defer: defer
                                        ,httpEquiv: httpEquiv
                                        ,language: language
                                        ,scoped: scoped
                                        ,accesskey: accesskey
                                        ,contenteditable: contenteditable
                                        ,contextmenu: contextmenu
                                        ,dir: dir
                                        ,draggable: draggable
                                        ,dropzone: dropzone
                                        ,itemprop: itemprop
                                        ,lang: lang
                                        ,spellcheck: spellcheck
                                        ,tabindex: tabindex
                                        ,challenge: challenge
                                        ,keytype: keytype
                                        ,cite: cite
                                        ,datetime: datetime
                                        ,pubdate: pubdate
                                        ,manifest: manifest
                                        ,property: property
                                        ,attribute: attribute};
};
Elm.Html = Elm.Html || {};
Elm.Html.Events = Elm.Html.Events || {};
Elm.Html.Events.make = function (_elm) {
   "use strict";
   _elm.Html = _elm.Html || {};
   _elm.Html.Events = _elm.Html.Events || {};
   if (_elm.Html.Events.values) return _elm.Html.Events.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $VirtualDom = Elm.VirtualDom.make(_elm);
   var _op = {};
   var keyCode = A2($Json$Decode._op[":="],"keyCode",$Json$Decode.$int);
   var targetChecked = A2($Json$Decode.at,_U.list(["target","checked"]),$Json$Decode.bool);
   var targetValue = A2($Json$Decode.at,_U.list(["target","value"]),$Json$Decode.string);
   var defaultOptions = $VirtualDom.defaultOptions;
   var Options = F2(function (a,b) {    return {stopPropagation: a,preventDefault: b};});
   var onWithOptions = $VirtualDom.onWithOptions;
   var on = $VirtualDom.on;
   var messageOn = F3(function (name,addr,msg) {    return A3(on,name,$Json$Decode.value,function (_p0) {    return A2($Signal.message,addr,msg);});});
   var onClick = messageOn("click");
   var onDoubleClick = messageOn("dblclick");
   var onMouseMove = messageOn("mousemove");
   var onMouseDown = messageOn("mousedown");
   var onMouseUp = messageOn("mouseup");
   var onMouseEnter = messageOn("mouseenter");
   var onMouseLeave = messageOn("mouseleave");
   var onMouseOver = messageOn("mouseover");
   var onMouseOut = messageOn("mouseout");
   var onBlur = messageOn("blur");
   var onFocus = messageOn("focus");
   var onSubmit = messageOn("submit");
   var onKey = F3(function (name,addr,handler) {    return A3(on,name,keyCode,function (code) {    return A2($Signal.message,addr,handler(code));});});
   var onKeyUp = onKey("keyup");
   var onKeyDown = onKey("keydown");
   var onKeyPress = onKey("keypress");
   return _elm.Html.Events.values = {_op: _op
                                    ,onBlur: onBlur
                                    ,onFocus: onFocus
                                    ,onSubmit: onSubmit
                                    ,onKeyUp: onKeyUp
                                    ,onKeyDown: onKeyDown
                                    ,onKeyPress: onKeyPress
                                    ,onClick: onClick
                                    ,onDoubleClick: onDoubleClick
                                    ,onMouseMove: onMouseMove
                                    ,onMouseDown: onMouseDown
                                    ,onMouseUp: onMouseUp
                                    ,onMouseEnter: onMouseEnter
                                    ,onMouseLeave: onMouseLeave
                                    ,onMouseOver: onMouseOver
                                    ,onMouseOut: onMouseOut
                                    ,on: on
                                    ,onWithOptions: onWithOptions
                                    ,defaultOptions: defaultOptions
                                    ,targetValue: targetValue
                                    ,targetChecked: targetChecked
                                    ,keyCode: keyCode
                                    ,Options: Options};
};
Elm.Native.Http = {};
Elm.Native.Http.make = function(localRuntime) {

	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Http = localRuntime.Native.Http || {};
	if (localRuntime.Native.Http.values)
	{
		return localRuntime.Native.Http.values;
	}

	var Dict = Elm.Dict.make(localRuntime);
	var List = Elm.List.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);
	var Task = Elm.Native.Task.make(localRuntime);


	function send(settings, request)
	{
		return Task.asyncFunction(function(callback) {
			var req = new XMLHttpRequest();

			// start
			if (settings.onStart.ctor === 'Just')
			{
				req.addEventListener('loadStart', function() {
					var task = settings.onStart._0;
					Task.spawn(task);
				});
			}

			// progress
			if (settings.onProgress.ctor === 'Just')
			{
				req.addEventListener('progress', function(event) {
					var progress = !event.lengthComputable
						? Maybe.Nothing
						: Maybe.Just({
							_: {},
							loaded: event.loaded,
							total: event.total
						});
					var task = settings.onProgress._0(progress);
					Task.spawn(task);
				});
			}

			// end
			req.addEventListener('error', function() {
				return callback(Task.fail({ ctor: 'RawNetworkError' }));
			});

			req.addEventListener('timeout', function() {
				return callback(Task.fail({ ctor: 'RawTimeout' }));
			});

			req.addEventListener('load', function() {
				return callback(Task.succeed(toResponse(req)));
			});

			req.open(request.verb, request.url, true);

			// set all the headers
			function setHeader(pair) {
				req.setRequestHeader(pair._0, pair._1);
			}
			A2(List.map, setHeader, request.headers);

			// set the timeout
			req.timeout = settings.timeout;

			// enable this withCredentials thing
			req.withCredentials = settings.withCredentials;

			// ask for a specific MIME type for the response
			if (settings.desiredResponseType.ctor === 'Just')
			{
				req.overrideMimeType(settings.desiredResponseType._0);
			}

			// actuall send the request
			if(request.body.ctor === "BodyFormData")
			{
				req.send(request.body.formData)
			}
			else
			{
				req.send(request.body._0);
			}
		});
	}


	// deal with responses

	function toResponse(req)
	{
		var tag = req.responseType === 'blob' ? 'Blob' : 'Text'
		var response = tag === 'Blob' ? req.response : req.responseText;
		return {
			_: {},
			status: req.status,
			statusText: req.statusText,
			headers: parseHeaders(req.getAllResponseHeaders()),
			url: req.responseURL,
			value: { ctor: tag, _0: response }
		};
	}


	function parseHeaders(rawHeaders)
	{
		var headers = Dict.empty;

		if (!rawHeaders)
		{
			return headers;
		}

		var headerPairs = rawHeaders.split('\u000d\u000a');
		for (var i = headerPairs.length; i--; )
		{
			var headerPair = headerPairs[i];
			var index = headerPair.indexOf('\u003a\u0020');
			if (index > 0)
			{
				var key = headerPair.substring(0, index);
				var value = headerPair.substring(index + 2);

				headers = A3(Dict.update, key, function(oldValue) {
					if (oldValue.ctor === 'Just')
					{
						return Maybe.Just(value + ', ' + oldValue._0);
					}
					return Maybe.Just(value);
				}, headers);
			}
		}

		return headers;
	}


	function multipart(dataList)
	{
		var formData = new FormData();

		while (dataList.ctor !== '[]')
		{
			var data = dataList._0;
			if (data.ctor === 'StringData')
			{
				formData.append(data._0, data._1);
			}
			else
			{
				var fileName = data._1.ctor === 'Nothing'
					? undefined
					: data._1._0;
				formData.append(data._0, data._2, fileName);
			}
			dataList = dataList._1;
		}

		return { ctor: 'BodyFormData', formData: formData };
	}


	function uriEncode(string)
	{
		return encodeURIComponent(string);
	}

	function uriDecode(string)
	{
		return decodeURIComponent(string);
	}

	return localRuntime.Native.Http.values = {
		send: F2(send),
		multipart: multipart,
		uriEncode: uriEncode,
		uriDecode: uriDecode
	};
};

Elm.Http = Elm.Http || {};
Elm.Http.make = function (_elm) {
   "use strict";
   _elm.Http = _elm.Http || {};
   if (_elm.Http.values) return _elm.Http.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Dict = Elm.Dict.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Http = Elm.Native.Http.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm),
   $Task = Elm.Task.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   var send = $Native$Http.send;
   var BadResponse = F2(function (a,b) {    return {ctor: "BadResponse",_0: a,_1: b};});
   var UnexpectedPayload = function (a) {    return {ctor: "UnexpectedPayload",_0: a};};
   var handleResponse = F2(function (handle,response) {
      if (_U.cmp(200,response.status) < 1 && _U.cmp(response.status,300) < 0) {
            var _p0 = response.value;
            if (_p0.ctor === "Text") {
                  return handle(_p0._0);
               } else {
                  return $Task.fail(UnexpectedPayload("Response body is a blob, expecting a string."));
               }
         } else return $Task.fail(A2(BadResponse,response.status,response.statusText));
   });
   var NetworkError = {ctor: "NetworkError"};
   var Timeout = {ctor: "Timeout"};
   var promoteError = function (rawError) {    var _p1 = rawError;if (_p1.ctor === "RawTimeout") {    return Timeout;} else {    return NetworkError;}};
   var fromJson = F2(function (decoder,response) {
      var decode = function (str) {
         var _p2 = A2($Json$Decode.decodeString,decoder,str);
         if (_p2.ctor === "Ok") {
               return $Task.succeed(_p2._0);
            } else {
               return $Task.fail(UnexpectedPayload(_p2._0));
            }
      };
      return A2($Task.andThen,A2($Task.mapError,promoteError,response),handleResponse(decode));
   });
   var RawNetworkError = {ctor: "RawNetworkError"};
   var RawTimeout = {ctor: "RawTimeout"};
   var Blob = function (a) {    return {ctor: "Blob",_0: a};};
   var Text = function (a) {    return {ctor: "Text",_0: a};};
   var Response = F5(function (a,b,c,d,e) {    return {status: a,statusText: b,headers: c,url: d,value: e};});
   var defaultSettings = {timeout: 0,onStart: $Maybe.Nothing,onProgress: $Maybe.Nothing,desiredResponseType: $Maybe.Nothing,withCredentials: false};
   var post = F3(function (decoder,url,body) {
      var request = {verb: "POST",headers: _U.list([]),url: url,body: body};
      return A2(fromJson,decoder,A2(send,defaultSettings,request));
   });
   var Settings = F5(function (a,b,c,d,e) {    return {timeout: a,onStart: b,onProgress: c,desiredResponseType: d,withCredentials: e};});
   var multipart = $Native$Http.multipart;
   var FileData = F3(function (a,b,c) {    return {ctor: "FileData",_0: a,_1: b,_2: c};});
   var BlobData = F3(function (a,b,c) {    return {ctor: "BlobData",_0: a,_1: b,_2: c};});
   var blobData = BlobData;
   var StringData = F2(function (a,b) {    return {ctor: "StringData",_0: a,_1: b};});
   var stringData = StringData;
   var BodyBlob = function (a) {    return {ctor: "BodyBlob",_0: a};};
   var BodyFormData = {ctor: "BodyFormData"};
   var ArrayBuffer = {ctor: "ArrayBuffer"};
   var BodyString = function (a) {    return {ctor: "BodyString",_0: a};};
   var string = BodyString;
   var Empty = {ctor: "Empty"};
   var empty = Empty;
   var getString = function (url) {
      var request = {verb: "GET",headers: _U.list([]),url: url,body: empty};
      return A2($Task.andThen,A2($Task.mapError,promoteError,A2(send,defaultSettings,request)),handleResponse($Task.succeed));
   };
   var get = F2(function (decoder,url) {
      var request = {verb: "GET",headers: _U.list([]),url: url,body: empty};
      return A2(fromJson,decoder,A2(send,defaultSettings,request));
   });
   var Request = F4(function (a,b,c,d) {    return {verb: a,headers: b,url: c,body: d};});
   var uriDecode = $Native$Http.uriDecode;
   var uriEncode = $Native$Http.uriEncode;
   var queryEscape = function (string) {    return A2($String.join,"+",A2($String.split,"%20",uriEncode(string)));};
   var queryPair = function (_p3) {    var _p4 = _p3;return A2($Basics._op["++"],queryEscape(_p4._0),A2($Basics._op["++"],"=",queryEscape(_p4._1)));};
   var url = F2(function (baseUrl,args) {
      var _p5 = args;
      if (_p5.ctor === "[]") {
            return baseUrl;
         } else {
            return A2($Basics._op["++"],baseUrl,A2($Basics._op["++"],"?",A2($String.join,"&",A2($List.map,queryPair,args))));
         }
   });
   var TODO_implement_file_in_another_library = {ctor: "TODO_implement_file_in_another_library"};
   var TODO_implement_blob_in_another_library = {ctor: "TODO_implement_blob_in_another_library"};
   return _elm.Http.values = {_op: _op
                             ,getString: getString
                             ,get: get
                             ,post: post
                             ,send: send
                             ,url: url
                             ,uriEncode: uriEncode
                             ,uriDecode: uriDecode
                             ,empty: empty
                             ,string: string
                             ,multipart: multipart
                             ,stringData: stringData
                             ,defaultSettings: defaultSettings
                             ,fromJson: fromJson
                             ,Request: Request
                             ,Settings: Settings
                             ,Response: Response
                             ,Text: Text
                             ,Blob: Blob
                             ,Timeout: Timeout
                             ,NetworkError: NetworkError
                             ,UnexpectedPayload: UnexpectedPayload
                             ,BadResponse: BadResponse
                             ,RawTimeout: RawTimeout
                             ,RawNetworkError: RawNetworkError};
};
Elm.StartApp = Elm.StartApp || {};
Elm.StartApp.make = function (_elm) {
   "use strict";
   _elm.StartApp = _elm.StartApp || {};
   if (_elm.StartApp.values) return _elm.StartApp.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Html = Elm.Html.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var start = function (config) {
      var updateStep = F2(function (action,_p0) {
         var _p1 = _p0;
         var _p2 = A2(config.update,action,_p1._0);
         var newModel = _p2._0;
         var additionalEffects = _p2._1;
         return {ctor: "_Tuple2",_0: newModel,_1: $Effects.batch(_U.list([_p1._1,additionalEffects]))};
      });
      var update = F2(function (actions,_p3) {    var _p4 = _p3;return A3($List.foldl,updateStep,{ctor: "_Tuple2",_0: _p4._0,_1: $Effects.none},actions);});
      var messages = $Signal.mailbox(_U.list([]));
      var singleton = function (action) {    return _U.list([action]);};
      var address = A2($Signal.forwardTo,messages.address,singleton);
      var inputs = $Signal.mergeMany(A2($List._op["::"],messages.signal,A2($List.map,$Signal.map(singleton),config.inputs)));
      var effectsAndModel = A3($Signal.foldp,update,config.init,inputs);
      var model = A2($Signal.map,$Basics.fst,effectsAndModel);
      return {html: A2($Signal.map,config.view(address),model)
             ,model: model
             ,tasks: A2($Signal.map,function (_p5) {    return A2($Effects.toTask,messages.address,$Basics.snd(_p5));},effectsAndModel)};
   };
   var App = F3(function (a,b,c) {    return {html: a,model: b,tasks: c};});
   var Config = F4(function (a,b,c,d) {    return {init: a,update: b,view: c,inputs: d};});
   return _elm.StartApp.values = {_op: _op,start: start,Config: Config,App: App};
};
Elm.Native.TaskTutorial = {};
Elm.Native.TaskTutorial.make = function(localRuntime) {

	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.TaskTutorial = localRuntime.Native.TaskTutorial || {};
	if (localRuntime.Native.TaskTutorial.values)
	{
		return localRuntime.Native.TaskTutorial.values;
	}

	var Task = Elm.Native.Task.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);


	function log(string)
	{
		return Task.asyncFunction(function(callback) {
			console.log(string);
			return callback(Task.succeed(Utils.Tuple0));
		});
	}


	var getCurrentTime = Task.asyncFunction(function(callback) {
		return callback(Task.succeed(Date.now()));
	});


	return localRuntime.Native.TaskTutorial.values = {
		log: log,
		getCurrentTime: getCurrentTime
	};
};

Elm.TaskTutorial = Elm.TaskTutorial || {};
Elm.TaskTutorial.make = function (_elm) {
   "use strict";
   _elm.TaskTutorial = _elm.TaskTutorial || {};
   if (_elm.TaskTutorial.values) return _elm.TaskTutorial.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$TaskTutorial = Elm.Native.TaskTutorial.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   var getCurrentTime = $Native$TaskTutorial.getCurrentTime;
   var print = function (value) {    return $Native$TaskTutorial.log($Basics.toString(value));};
   return _elm.TaskTutorial.values = {_op: _op,print: print,getCurrentTime: getCurrentTime};
};
Elm.Config = Elm.Config || {};
Elm.Config.Model = Elm.Config.Model || {};
Elm.Config.Model.make = function (_elm) {
   "use strict";
   _elm.Config = _elm.Config || {};
   _elm.Config.Model = _elm.Config.Model || {};
   if (_elm.Config.Model.values) return _elm.Config.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var Model = F2(function (a,b) {    return {backendConfig: a,error: b};});
   var initialBackendConfig = {backendUrl: "",githubClientId: "",name: "",hostname: ""};
   var initialModel = {backendConfig: initialBackendConfig,error: false};
   var BackendConfig = F4(function (a,b,c,d) {    return {backendUrl: a,githubClientId: b,name: c,hostname: d};});
   return _elm.Config.Model.values = {_op: _op,BackendConfig: BackendConfig,initialBackendConfig: initialBackendConfig,Model: Model,initialModel: initialModel};
};
Elm.Company = Elm.Company || {};
Elm.Company.Model = Elm.Company.Model || {};
Elm.Company.Model.make = function (_elm) {
   "use strict";
   _elm.Company = _elm.Company || {};
   _elm.Company.Model = _elm.Company.Model || {};
   if (_elm.Company.Model.values) return _elm.Company.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var Model = F2(function (a,b) {    return {id: a,label: b};});
   var initialModel = A2(Model,0,"");
   return _elm.Company.Model.values = {_op: _op,Model: Model,initialModel: initialModel};
};
Elm.Config = Elm.Config || {};
Elm.Config.make = function (_elm) {
   "use strict";
   _elm.Config = _elm.Config || {};
   if (_elm.Config.values) return _elm.Config.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   var cacheTtl = 5 * $Time.second;
   var prodBackend = {backendUrl: "https://live-hedley-elm.pantheon.io",githubClientId: "4aef0ced83d72bd48d00",name: "gh-pages",hostname: "gizra.github.io"};
   var localBackend = {backendUrl: "https://dev-hedley-elm.pantheon.io",githubClientId: "e5661c832ed931ae176c",name: "local",hostname: "localhost"};
   var backends = _U.list([localBackend,prodBackend]);
   return _elm.Config.values = {_op: _op,localBackend: localBackend,prodBackend: prodBackend,backends: backends,cacheTtl: cacheTtl};
};
Elm.Leaflet = Elm.Leaflet || {};
Elm.Leaflet.Model = Elm.Leaflet.Model || {};
Elm.Leaflet.Model.make = function (_elm) {
   "use strict";
   _elm.Leaflet = _elm.Leaflet || {};
   _elm.Leaflet.Model = _elm.Leaflet.Model || {};
   if (_elm.Leaflet.Model.values) return _elm.Leaflet.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var initialModel = {markers: _U.list([]),selectedMarker: $Maybe.Nothing,showMap: false};
   var Model = F3(function (a,b,c) {    return {markers: a,selectedMarker: b,showMap: c};});
   var Marker = F3(function (a,b,c) {    return {id: a,lat: b,lng: c};});
   return _elm.Leaflet.Model.values = {_op: _op,Marker: Marker,Model: Model,initialModel: initialModel};
};
Elm.Leaflet = Elm.Leaflet || {};
Elm.Leaflet.Update = Elm.Leaflet.Update || {};
Elm.Leaflet.Update.make = function (_elm) {
   "use strict";
   _elm.Leaflet = _elm.Leaflet || {};
   _elm.Leaflet.Update = _elm.Leaflet.Update || {};
   if (_elm.Leaflet.Update.values) return _elm.Leaflet.Update.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Leaflet$Model = Elm.Leaflet.Model.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var update = F2(function (action,model) {
      var _p0 = action;
      switch (_p0.ctor)
      {case "ToggleMap": return {ctor: "_Tuple2",_0: _U.update(model,{showMap: $Basics.not(model.showMap)}),_1: $Effects.none};
         case "SelectMarker": return {ctor: "_Tuple2",_0: _U.update(model,{selectedMarker: _p0._0}),_1: $Effects.none};
         default: return {ctor: "_Tuple2",_0: _U.update(model,{selectedMarker: $Maybe.Nothing}),_1: $Effects.none};}
   });
   var UnselectMarker = {ctor: "UnselectMarker"};
   var SelectMarker = function (a) {    return {ctor: "SelectMarker",_0: a};};
   var ToggleMap = {ctor: "ToggleMap"};
   var init = {ctor: "_Tuple2",_0: $Leaflet$Model.initialModel,_1: $Effects.none};
   return _elm.Leaflet.Update.values = {_op: _op,init: init,ToggleMap: ToggleMap,SelectMarker: SelectMarker,UnselectMarker: UnselectMarker,update: update};
};
Elm.RouteHash = Elm.RouteHash || {};
Elm.RouteHash.make = function (_elm) {
   "use strict";
   _elm.RouteHash = _elm.RouteHash || {};
   if (_elm.RouteHash.values) return _elm.RouteHash.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $History = Elm.History.make(_elm),
   $Http = Elm.Http.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Signal$Extra = Elm.Signal.Extra.make(_elm),
   $String = Elm.String.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var list2hash = F2(function (prefix,list) {    return A2($Basics._op["++"],prefix,A2($String.join,"/",A2($List.map,$Http.uriEncode,list)));});
   var removeInitial = F2(function (initial,original) {
      var _p0 = $String.uncons(original);
      if (_p0.ctor === "Just" && _p0._0.ctor === "_Tuple2") {
            return _U.eq(_p0._0._0,initial) ? _p0._0._1 : original;
         } else {
            return original;
         }
   });
   var removeInitialSequence = F2(function (initial,original) {    return A3($String.foldl,removeInitial,original,initial);});
   var hash2list = function (prefix) {
      return function (_p1) {
         return A2($List.map,$Http.uriDecode,A2($String.split,"/",A2(removeInitialSequence,prefix,_p1)));
      };
   };
   var defaultPrefix = "#!/";
   var Config = F5(function (a,b,c,d,e) {    return {prefix: a,models: b,delta2update: c,location2action: d,address: e};});
   var extract = function (action) {    var _p2 = action;if (_p2.ctor === "SetPath") {    return _p2._0;} else {    return _p2._0;}};
   var dropIfCurrent = F2(function (update,current) {
      return A2($Maybe.andThen,update,function (u) {    return _U.eq(extract(u),current) ? $Maybe.Nothing : update;});
   });
   var start = function (config) {
      var route = F2(function (location,update) {
         var _p3 = update;
         if (_p3.ctor === "Just") {
               if (_p3._0.ctor === "SetPath") {
                     return _U.eq(_p3._0._0,location) ? _U.list([]) : config.location2action(location);
                  } else {
                     return _U.eq(_p3._0._0,location) ? _U.list([]) : config.location2action(location);
                  }
            } else {
               return config.location2action(location);
            }
      });
      var update2task = function (update) {
         return function () {
            var _p4 = update;
            if (_p4.ctor === "SetPath") {
                  return $History.setPath;
               } else {
                  return $History.replacePath;
               }
         }()(A2(list2hash,config.prefix,extract(update)));
      };
      var computeUpdate = function (maybeChange) {    return A2($Maybe.andThen,maybeChange,$Basics.uncurry(config.delta2update));};
      var locations = A2($Signal.map,hash2list(config.prefix),$History.hash);
      var processingActions = $Signal.mailbox(false);
      var action2task = function (actions) {
         var _p5 = actions;
         if (_p5.ctor === "[]") {
               return $Maybe.Nothing;
            } else {
               return $Maybe.Just(A2($Task.map,
               $Basics.always({ctor: "_Tuple0"}),
               $Task.sequence(A2($Basics._op["++"],
               _U.list([A2($Signal.send,processingActions.address,true)]),
               A2($Basics._op["++"],A2($List.map,$Signal.send(config.address),actions),_U.list([A2($Signal.send,processingActions.address,false)]))))));
            }
      };
      var changes = $Signal$Extra.deltas(config.models);
      var externalChanges = A2($Signal.map,
      function (zipped) {
         return $Basics.snd(zipped) ? $Maybe.Nothing : $Maybe.Just($Basics.fst(zipped));
      },
      A2($Signal.sampleOn,changes,A2($Signal$Extra.zip,changes,processingActions.signal)));
      var possibleUpdates = A2($Signal.map,computeUpdate,externalChanges);
      var actualUpdates = A3($Signal$Extra.passiveMap2,dropIfCurrent,possibleUpdates,locations);
      var updateTasks = A3($Signal.filterMap,$Maybe.map(update2task),$Task.succeed({ctor: "_Tuple0"}),actualUpdates);
      var actions = A3($Signal$Extra.passiveMap2,route,locations,actualUpdates);
      var actionTasks = A3($Signal.filterMap,action2task,$Task.succeed({ctor: "_Tuple0"}),actions);
      return A2($Signal.merge,actionTasks,updateTasks);
   };
   var ReplacePath = function (a) {    return {ctor: "ReplacePath",_0: a};};
   var replace = ReplacePath;
   var SetPath = function (a) {    return {ctor: "SetPath",_0: a};};
   var set = SetPath;
   var apply = F2(function (func,update) {
      var _p6 = update;
      if (_p6.ctor === "SetPath") {
            return SetPath(func(_p6._0));
         } else {
            return ReplacePath(func(_p6._0));
         }
   });
   var map = F2(function (func,update) {    return A2($Maybe.map,apply(func),update);});
   return _elm.RouteHash.values = {_op: _op
                                  ,set: set
                                  ,replace: replace
                                  ,apply: apply
                                  ,map: map
                                  ,extract: extract
                                  ,defaultPrefix: defaultPrefix
                                  ,start: start
                                  ,Config: Config};
};
Elm.Event = Elm.Event || {};
Elm.Event.make = function (_elm) {
   "use strict";
   _elm.Event = _elm.Event || {};
   if (_elm.Event.values) return _elm.Event.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Company$Model = Elm.Company.Model.make(_elm),
   $Config = Elm.Config.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Dict = Elm.Dict.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $Html$Events = Elm.Html.Events.make(_elm),
   $Http = Elm.Http.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $Leaflet$Model = Elm.Leaflet.Model.make(_elm),
   $Leaflet$Update = Elm.Leaflet.Update.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $RouteHash = Elm.RouteHash.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm),
   $Task = Elm.Task.make(_elm),
   $TaskTutorial = Elm.TaskTutorial.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   var location2company = function (list) {
      var _p0 = $List.head(list);
      if (_p0.ctor === "Just") {
            var _p1 = $String.toInt(_p0._0);
            if (_p1.ctor === "Ok") {
                  return $Maybe.Just(_p1._0);
               } else {
                  return $Maybe.Nothing;
               }
         } else {
            return $Maybe.Nothing;
         }
   };
   var delta2update = F2(function (previous,current) {
      var url = function () {
         var _p2 = current.selectedCompany;
         if (_p2.ctor === "Just") {
               return _U.list([$Basics.toString(_p2._0)]);
            } else {
               return _U.list([]);
            }
      }();
      return $Maybe.Just($RouteHash.set(url));
   });
   var isFetched = function (status) {    var _p3 = status;if (_p3.ctor === "Fetched") {    return true;} else {    return false;}};
   var viewEventInfo = function (model) {
      var _p4 = model.selectedEvent;
      if (_p4.ctor === "Just") {
            var selectedEvent = A2($List.filter,function (event) {    return _U.eq(event.id,_p4._0);},model.events);
            return A2($Html.div,
            _U.list([]),
            A2($List.map,
            function (event) {
               return $Html.text(A2($Basics._op["++"],
               $Basics.toString(event.id),
               A2($Basics._op["++"],") ",A2($Basics._op["++"],event.label,A2($Basics._op["++"]," by ",event.author.name)))));
            },
            selectedEvent));
         } else {
            return A2($Html.div,_U.list([]),_U.list([]));
         }
   };
   var filterListEvents = function (model) {
      var stringFilter = function (events) {
         return _U.cmp($String.length($String.trim(model.filterString)),0) > 0 ? A2($List.filter,
         function (event) {
            return A2($String.contains,$String.trim($String.toLower(model.filterString)),$String.toLower(event.label));
         },
         events) : events;
      };
      var authorFilter = function (events) {
         var _p5 = model.selectedAuthor;
         if (_p5.ctor === "Just") {
               return A2($List.filter,function (event) {    return _U.eq(event.author.id,_p5._0);},events);
            } else {
               return events;
            }
      };
      return stringFilter(authorFilter(model.events));
   };
   var groupEventsByAuthors = function (events) {
      var handleEvent = F2(function (event,dict) {
         var currentValue = A2($Maybe.withDefault,{ctor: "_Tuple2",_0: event.author,_1: 0},A2($Dict.get,event.author.id,dict));
         var newValue = function () {    var _p6 = currentValue;return {ctor: "_Tuple2",_0: _p6._0,_1: _p6._1 + 1};}();
         return A3($Dict.insert,event.author.id,newValue,dict);
      });
      return A3($List.foldl,handleEvent,$Dict.empty,events);
   };
   var mapStyle = _U.list([{ctor: "_Tuple2",_0: "width",_1: "600px"},{ctor: "_Tuple2",_0: "height",_1: "400px"}]);
   var leafletMarkers = function (model) {
      return A2($List.map,function (event) {    return A3($Leaflet$Model.Marker,event.id,event.marker.lat,event.marker.lng);},filterListEvents(model));
   };
   var ViewContext = function (a) {    return {companies: a};};
   var UpdateContext = F3(function (a,b,c) {    return {accessToken: a,backendConfig: b,companies: c};});
   var Deactivate = {ctor: "Deactivate"};
   var Activate = function (a) {    return {ctor: "Activate",_0: a};};
   var ChildLeafletAction = function (a) {    return {ctor: "ChildLeafletAction",_0: a};};
   var FilterEvents = function (a) {    return {ctor: "FilterEvents",_0: a};};
   var viewFilterString = F2(function (address,model) {
      return A2($Html.div,
      _U.list([]),
      _U.list([A2($Html.input,
      _U.list([$Html$Attributes.placeholder("Filter events")
              ,$Html$Attributes.value(model.filterString)
              ,A3($Html$Events.on,"input",$Html$Events.targetValue,function (_p7) {    return A2($Signal.message,address,FilterEvents(_p7));})]),
      _U.list([]))]));
   });
   var UnSelectAuthor = {ctor: "UnSelectAuthor"};
   var SelectAuthor = function (a) {    return {ctor: "SelectAuthor",_0: a};};
   var viewEventsByAuthors = F3(function (address,events,selectedAuthor) {
      var getText = F2(function (author,count) {
         var authorRaw = $Html.text(A2($Basics._op["++"],author.name,A2($Basics._op["++"]," (",A2($Basics._op["++"],$Basics.toString(count),")"))));
         var authorSelect = A2($Html.a,
         _U.list([$Html$Attributes.href("javascript:void(0);"),A2($Html$Events.onClick,address,SelectAuthor(author.id))]),
         _U.list([authorRaw]));
         var authorUnselect = A2($Html.span,
         _U.list([]),
         _U.list([A2($Html.a,
                 _U.list([$Html$Attributes.href("javascript:void(0);"),A2($Html$Events.onClick,address,UnSelectAuthor)]),
                 _U.list([$Html.text("x ")]))
                 ,authorRaw]));
         var _p8 = selectedAuthor;
         if (_p8.ctor === "Just") {
               return _U.eq(author.id,_p8._0) ? authorUnselect : authorSelect;
            } else {
               return authorSelect;
            }
      });
      var viewAuthor = function (_p9) {    var _p10 = _p9;return A2($Html.li,_U.list([]),_U.list([A2(getText,_p10._0,_p10._1)]));};
      return A2($List.map,viewAuthor,$Dict.values(groupEventsByAuthors(events)));
   });
   var UnSelectEvent = {ctor: "UnSelectEvent"};
   var SelectEvent = function (a) {    return {ctor: "SelectEvent",_0: a};};
   var viewListEvents = F2(function (address,model) {
      var eventUnselect = function (event) {
         return A2($Html.li,
         _U.list([]),
         _U.list([A2($Html.span,
         _U.list([]),
         _U.list([A2($Html.a,_U.list([$Html$Attributes.href("javascript:void(0);"),A2($Html$Events.onClick,address,UnSelectEvent)]),_U.list([$Html.text("x ")]))
                 ,$Html.text(event.label)]))]));
      };
      var hrefVoid = $Html$Attributes.href("javascript:void(0);");
      var eventSelect = function (event) {
         return A2($Html.li,
         _U.list([]),
         _U.list([A2($Html.a,_U.list([hrefVoid,A2($Html$Events.onClick,address,SelectEvent($Maybe.Just(event.id)))]),_U.list([$Html.text(event.label)]))]));
      };
      var getListItem = function (event) {
         var _p11 = model.selectedEvent;
         if (_p11.ctor === "Just") {
               return _U.eq(event.id,_p11._0) ? eventUnselect(event) : eventSelect(event);
            } else {
               return eventSelect(event);
            }
      };
      var filteredEvents = filterListEvents(model);
      return $Basics.not($List.isEmpty(filteredEvents)) ? A2($Html.ul,_U.list([]),A2($List.map,getListItem,filteredEvents)) : A2($Html.div,
      _U.list([]),
      _U.list([$Html.text("No results found")]));
   });
   var SelectCompany = function (a) {    return {ctor: "SelectCompany",_0: a};};
   var companyListForSelect = F3(function (address,companies,selectedCompany) {
      var selectedId = function () {    var _p12 = selectedCompany;if (_p12.ctor === "Just") {    return _p12._0;} else {    return 0;}}();
      var getOption = function (company) {
         return A2($Html.option,
         _U.list([$Html$Attributes.value($Basics.toString(company.id)),$Html$Attributes.selected(_U.eq(company.id,selectedId))]),
         _U.list([$Html.text(company.label)]));
      };
      var companies$ = A2($List._op["::"],A2($Company$Model.Model,0,"-- All companies --"),companies);
      var textToMaybe = function (string) {
         if (_U.eq(string,"0")) return $Maybe.Nothing; else {
               var _p13 = $String.toInt(string);
               if (_p13.ctor === "Ok") {
                     return $Maybe.Just(_p13._0);
                  } else {
                     return $Maybe.Nothing;
                  }
            }
      };
      var selectedText = function () {    var _p14 = selectedCompany;if (_p14.ctor === "Just") {    return $Basics.toString(_p14._0);} else {    return "";}}();
      return A2($Html.select,
      _U.list([$Html$Attributes.value(selectedText)
              ,A3($Html$Events.on,"change",$Html$Events.targetValue,function (str) {    return A2($Signal.message,address,SelectCompany(textToMaybe(str)));})]),
      A2($List.map,getOption,companies$));
   });
   var view = F3(function (context,address,model) {
      return A2($Html.div,
      _U.list([$Html$Attributes.$class("container")]),
      _U.list([A2($Html.div,
      _U.list([$Html$Attributes.$class("row")]),
      _U.list([A2($Html.div,
              _U.list([$Html$Attributes.$class("col-md-3")]),
              _U.list([A2($Html.div,
                      _U.list([]),
                      _U.list([A2($Html.div,_U.list([$Html$Attributes.$class("h2")]),_U.list([$Html.text("Companies")]))
                              ,A3(companyListForSelect,address,context.companies,model.selectedCompany)]))
                      ,A2($Html.div,
                      _U.list([]),
                      _U.list([A2($Html.div,_U.list([$Html$Attributes.$class("h2")]),_U.list([$Html.text("Event Authors")]))
                              ,A2($Html.ul,_U.list([]),A3(viewEventsByAuthors,address,model.events,model.selectedAuthor))
                              ,A2($Html.div,_U.list([$Html$Attributes.hidden(isFetched(model.status))]),_U.list([$Html.text("Loading...")]))]))
                      ,A2($Html.div,
                      _U.list([]),
                      _U.list([A2($Html.div,_U.list([$Html$Attributes.$class("h2")]),_U.list([$Html.text("Event list")]))
                              ,A2(viewFilterString,address,model)
                              ,A2(viewListEvents,address,model)]))]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.$class("col-md-9")]),
              _U.list([A2($Html.div,_U.list([$Html$Attributes.$class("h2")]),_U.list([$Html.text("Map")]))
                      ,A2($Html.div,_U.list([$Html$Attributes.style(mapStyle),$Html$Attributes.id("map")]),_U.list([]))
                      ,viewEventInfo(model)]))]))]));
   });
   var UpdateDataFromServer = F3(function (a,b,c) {    return {ctor: "UpdateDataFromServer",_0: a,_1: b,_2: c};});
   var GetDataFromServer = function (a) {    return {ctor: "GetDataFromServer",_0: a};};
   var GetData = function (a) {    return {ctor: "GetData",_0: a};};
   var NoOp = {ctor: "NoOp"};
   var getDataFromCache = F2(function (status,maybeCompanyId) {
      var getFx = $Task.succeed(GetDataFromServer(maybeCompanyId));
      var actionTask = function () {
         var _p15 = status;
         if (_p15.ctor === "Fetched") {
               return _U.eq(_p15._0,maybeCompanyId) ? A2($Task.map,
               function (currentTime) {
                  return _U.cmp(_p15._1 + $Config.cacheTtl,currentTime) > 0 ? NoOp : GetDataFromServer(maybeCompanyId);
               },
               $TaskTutorial.getCurrentTime) : getFx;
            } else {
               return getFx;
            }
      }();
      return $Effects.task(actionTask);
   });
   var Model = F7(function (a,b,c,d,e,f,g) {
      return {events: a,status: b,selectedCompany: c,selectedEvent: d,selectedAuthor: e,filterString: f,leaflet: g};
   });
   var Event = F4(function (a,b,c,d) {    return {id: a,label: b,marker: c,author: d};});
   var Author = F2(function (a,b) {    return {id: a,name: b};});
   var Marker = F2(function (a,b) {    return {lat: a,lng: b};});
   var decodeData = function () {
      var numberFloat = $Json$Decode.oneOf(_U.list([$Json$Decode.$float,A2($Json$Decode.customDecoder,$Json$Decode.string,$String.toFloat)]));
      var marker = A3($Json$Decode.object2,Marker,A2($Json$Decode._op[":="],"lat",numberFloat),A2($Json$Decode._op[":="],"lng",numberFloat));
      var number = $Json$Decode.oneOf(_U.list([$Json$Decode.$int,A2($Json$Decode.customDecoder,$Json$Decode.string,$String.toInt)]));
      var author = A3($Json$Decode.object2,Author,A2($Json$Decode._op[":="],"id",number),A2($Json$Decode._op[":="],"label",$Json$Decode.string));
      return A2($Json$Decode.at,
      _U.list(["data"]),
      $Json$Decode.list(A5($Json$Decode.object4,
      Event,
      A2($Json$Decode._op[":="],"id",number),
      A2($Json$Decode._op[":="],"label",$Json$Decode.string),
      A2($Json$Decode._op[":="],"location",marker),
      A2($Json$Decode._op[":="],"user",author))));
   }();
   var getJson = F3(function (url,maybeCompanyId,accessToken) {
      var params = _U.list([{ctor: "_Tuple2",_0: "access_token",_1: accessToken}]);
      var params$ = function () {
         var _p16 = maybeCompanyId;
         if (_p16.ctor === "Just") {
               return A2($List._op["::"],{ctor: "_Tuple2",_0: "filter[company]",_1: $Basics.toString(_p16._0)},params);
            } else {
               return params;
            }
      }();
      var encodedUrl = A2($Http.url,url,params$);
      var httpTask = $Task.toResult(A2($Http.get,decodeData,encodedUrl));
      var actionTask = A2($Task.andThen,
      httpTask,
      function (result) {
         return A2($Task.map,function (timestamp) {    return A3(UpdateDataFromServer,result,maybeCompanyId,timestamp);},$TaskTutorial.getCurrentTime);
      });
      return $Effects.task(actionTask);
   });
   var HttpError = function (a) {    return {ctor: "HttpError",_0: a};};
   var Fetched = F2(function (a,b) {    return {ctor: "Fetched",_0: a,_1: b};});
   var Fetching = function (a) {    return {ctor: "Fetching",_0: a};};
   var update = F3(function (context,action,model) {
      var _p17 = action;
      switch (_p17.ctor)
      {case "NoOp": return {ctor: "_Tuple2",_0: model,_1: $Effects.none};
         case "GetData": var _p19 = _p17._0;
           var getFx = {ctor: "_Tuple2",_0: model,_1: A2(getDataFromCache,model.status,_p19)};
           var noFx = {ctor: "_Tuple2",_0: model,_1: $Effects.none};
           var _p18 = model.status;
           if (_p18.ctor === "Fetching") {
                 return _U.eq(_p18._0,_p19) ? noFx : getFx;
              } else {
                 return getFx;
              }
         case "GetDataFromServer": var _p21 = _p17._0;
           var backendUrl = function (_p20) {    return function (_) {    return _.backendUrl;}(function (_) {    return _.backendConfig;}(_p20));}(context);
           var url = A2($Basics._op["++"],backendUrl,"/api/v1.0/events");
           return {ctor: "_Tuple2",_0: _U.update(model,{status: Fetching(_p21)}),_1: A3(getJson,url,_p21,context.accessToken)};
         case "UpdateDataFromServer": var _p22 = _p17._0;
           if (_p22.ctor === "Ok") {
                 return {ctor: "_Tuple2"
                        ,_0: _U.update(model,{events: _p22._0,status: A2(Fetched,_p17._1,_p17._2)})
                        ,_1: $Effects.task($Task.succeed(FilterEvents(model.filterString)))};
              } else {
                 return {ctor: "_Tuple2",_0: _U.update(model,{status: HttpError(_p22._0)}),_1: $Effects.none};
              }
         case "SelectCompany": var isValidCompany = function (val) {
              return $List.length(A2($List.filter,function (company) {    return _U.eq(company.id,val);},context.companies));
           };
           var selectedCompany = function () {
              var _p23 = _p17._0;
              if (_p23.ctor === "Just") {
                    var _p24 = _p23._0;
                    return _U.cmp(isValidCompany(_p24),0) > 0 ? $Maybe.Just(_p24) : $Maybe.Nothing;
                 } else {
                    return $Maybe.Nothing;
                 }
           }();
           return {ctor: "_Tuple2",_0: _U.update(model,{selectedCompany: selectedCompany}),_1: $Effects.task($Task.succeed(GetData(selectedCompany)))};
         case "SelectEvent": var _p25 = _p17._0;
           if (_p25.ctor === "Just") {
                 var _p26 = _p25._0;
                 return {ctor: "_Tuple2"
                        ,_0: _U.update(model,{selectedEvent: $Maybe.Just(_p26)})
                        ,_1: $Effects.task($Task.succeed(ChildLeafletAction($Leaflet$Update.SelectMarker($Maybe.Just(_p26)))))};
              } else {
                 return {ctor: "_Tuple2",_0: model,_1: $Effects.task($Task.succeed(UnSelectEvent))};
              }
         case "UnSelectEvent": return {ctor: "_Tuple2"
                                      ,_0: _U.update(model,{selectedEvent: $Maybe.Nothing})
                                      ,_1: $Effects.task($Task.succeed(ChildLeafletAction($Leaflet$Update.SelectMarker($Maybe.Nothing))))};
         case "SelectAuthor": return {ctor: "_Tuple2"
                                     ,_0: _U.update(model,{selectedAuthor: $Maybe.Just(_p17._0)})
                                     ,_1: $Effects.batch(_U.list([$Effects.task($Task.succeed(UnSelectEvent))
                                                                 ,$Effects.task($Task.succeed(FilterEvents(model.filterString)))]))};
         case "UnSelectAuthor": return {ctor: "_Tuple2"
                                       ,_0: _U.update(model,{selectedAuthor: $Maybe.Nothing})
                                       ,_1: $Effects.batch(_U.list([$Effects.task($Task.succeed(UnSelectEvent))
                                                                   ,$Effects.task($Task.succeed(FilterEvents(model.filterString)))]))};
         case "FilterEvents": var _p28 = _p17._0;
           var leaflet = model.leaflet;
           var model$ = _U.update(model,{filterString: _p28});
           var leaflet$ = _U.update(leaflet,{markers: leafletMarkers(model$)});
           var effects = function () {
              var _p27 = model.selectedEvent;
              if (_p27.ctor === "Just") {
                    var isSelectedEvent = $List.length(A2($List.filter,function (event) {    return _U.eq(event.id,_p27._0);},filterListEvents(model$)));
                    return _U.cmp(isSelectedEvent,0) > 0 ? $Effects.none : $Effects.task($Task.succeed(UnSelectEvent));
                 } else {
                    return $Effects.none;
                 }
           }();
           return {ctor: "_Tuple2",_0: _U.update(model,{filterString: _p28,leaflet: leaflet$}),_1: effects};
         case "ChildLeafletAction": var _p29 = A2($Leaflet$Update.update,_p17._0,model.leaflet);
           var childModel = _p29._0;
           var childEffects = _p29._1;
           return {ctor: "_Tuple2",_0: _U.update(model,{leaflet: childModel}),_1: A2($Effects.map,ChildLeafletAction,childEffects)};
         case "Activate": var _p30 = A2($Leaflet$Update.update,$Leaflet$Update.ToggleMap,model.leaflet);
           var childModel = _p30._0;
           var childEffects = _p30._1;
           return {ctor: "_Tuple2"
                  ,_0: _U.update(model,{leaflet: childModel})
                  ,_1: $Effects.batch(_U.list([$Effects.task($Task.succeed(SelectCompany(_p17._0))),A2($Effects.map,ChildLeafletAction,childEffects)]))};
         default: var _p31 = A2($Leaflet$Update.update,$Leaflet$Update.ToggleMap,model.leaflet);
           var childModel = _p31._0;
           var childEffects = _p31._1;
           return {ctor: "_Tuple2",_0: _U.update(model,{leaflet: childModel}),_1: A2($Effects.map,ChildLeafletAction,childEffects)};}
   });
   var Init = {ctor: "Init"};
   var initialModel = {events: _U.list([])
                      ,status: Init
                      ,selectedCompany: $Maybe.Nothing
                      ,selectedEvent: $Maybe.Nothing
                      ,selectedAuthor: $Maybe.Nothing
                      ,filterString: ""
                      ,leaflet: $Leaflet$Model.initialModel};
   var init = {ctor: "_Tuple2",_0: initialModel,_1: $Effects.none};
   return _elm.Event.values = {_op: _op
                              ,Init: Init
                              ,Fetching: Fetching
                              ,Fetched: Fetched
                              ,HttpError: HttpError
                              ,Marker: Marker
                              ,Author: Author
                              ,Event: Event
                              ,Model: Model
                              ,initialModel: initialModel
                              ,init: init
                              ,NoOp: NoOp
                              ,GetData: GetData
                              ,GetDataFromServer: GetDataFromServer
                              ,UpdateDataFromServer: UpdateDataFromServer
                              ,SelectCompany: SelectCompany
                              ,SelectEvent: SelectEvent
                              ,UnSelectEvent: UnSelectEvent
                              ,SelectAuthor: SelectAuthor
                              ,UnSelectAuthor: UnSelectAuthor
                              ,FilterEvents: FilterEvents
                              ,ChildLeafletAction: ChildLeafletAction
                              ,Activate: Activate
                              ,Deactivate: Deactivate
                              ,UpdateContext: UpdateContext
                              ,ViewContext: ViewContext
                              ,update: update
                              ,leafletMarkers: leafletMarkers
                              ,view: view
                              ,companyListForSelect: companyListForSelect
                              ,mapStyle: mapStyle
                              ,groupEventsByAuthors: groupEventsByAuthors
                              ,viewEventsByAuthors: viewEventsByAuthors
                              ,filterListEvents: filterListEvents
                              ,viewFilterString: viewFilterString
                              ,viewListEvents: viewListEvents
                              ,viewEventInfo: viewEventInfo
                              ,isFetched: isFetched
                              ,getDataFromCache: getDataFromCache
                              ,getJson: getJson
                              ,decodeData: decodeData
                              ,delta2update: delta2update
                              ,location2company: location2company};
};
Elm.ArticleForm = Elm.ArticleForm || {};
Elm.ArticleForm.Model = Elm.ArticleForm.Model || {};
Elm.ArticleForm.Model.make = function (_elm) {
   "use strict";
   _elm.ArticleForm = _elm.ArticleForm || {};
   _elm.ArticleForm.Model = _elm.ArticleForm.Model || {};
   if (_elm.ArticleForm.Model.values) return _elm.ArticleForm.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var initialArticleForm = {label: "",body: "",image: $Maybe.Nothing,show: true};
   var Model = F3(function (a,b,c) {    return {articleForm: a,postStatus: b,userMessage: c};});
   var Error = function (a) {    return {ctor: "Error",_0: a};};
   var None = {ctor: "None"};
   var ArticleForm = F4(function (a,b,c,d) {    return {label: a,body: b,image: c,show: d};});
   var Ready = {ctor: "Ready"};
   var initialModel = {articleForm: initialArticleForm,postStatus: Ready,userMessage: None};
   var Done = {ctor: "Done"};
   var Busy = {ctor: "Busy"};
   return _elm.ArticleForm.Model.values = {_op: _op
                                          ,Busy: Busy
                                          ,Done: Done
                                          ,Ready: Ready
                                          ,ArticleForm: ArticleForm
                                          ,None: None
                                          ,Error: Error
                                          ,Model: Model
                                          ,initialArticleForm: initialArticleForm
                                          ,initialModel: initialModel};
};
Elm.Article = Elm.Article || {};
Elm.Article.Model = Elm.Article.Model || {};
Elm.Article.Model.make = function (_elm) {
   "use strict";
   _elm.Article = _elm.Article || {};
   _elm.Article.Model = _elm.Article.Model || {};
   if (_elm.Article.Model.values) return _elm.Article.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var Author = F2(function (a,b) {    return {id: a,name: b};});
   var Model = F5(function (a,b,c,d,e) {    return {author: a,body: b,id: c,image: d,label: e};});
   return _elm.Article.Model.values = {_op: _op,Model: Model,Author: Author};
};
Elm.ArticleList = Elm.ArticleList || {};
Elm.ArticleList.Model = Elm.ArticleList.Model || {};
Elm.ArticleList.Model.make = function (_elm) {
   "use strict";
   _elm.ArticleList = _elm.ArticleList || {};
   _elm.ArticleList.Model = _elm.ArticleList.Model || {};
   if (_elm.ArticleList.Model.values) return _elm.ArticleList.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Article$Model = Elm.Article.Model.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Http = Elm.Http.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   var Model = F2(function (a,b) {    return {articles: a,status: b};});
   var HttpError = function (a) {    return {ctor: "HttpError",_0: a};};
   var Fetched = function (a) {    return {ctor: "Fetched",_0: a};};
   var Fetching = {ctor: "Fetching"};
   var Init = {ctor: "Init"};
   var initialModel = {articles: _U.list([]),status: Init};
   return _elm.ArticleList.Model.values = {_op: _op
                                          ,Init: Init
                                          ,Fetching: Fetching
                                          ,Fetched: Fetched
                                          ,HttpError: HttpError
                                          ,Model: Model
                                          ,initialModel: initialModel};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.Article = Elm.Pages.Article || {};
Elm.Pages.Article.Model = Elm.Pages.Article.Model || {};
Elm.Pages.Article.Model.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.Article = _elm.Pages.Article || {};
   _elm.Pages.Article.Model = _elm.Pages.Article.Model || {};
   if (_elm.Pages.Article.Model.values) return _elm.Pages.Article.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $ArticleForm$Model = Elm.ArticleForm.Model.make(_elm),
   $ArticleList$Model = Elm.ArticleList.Model.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var initialModel = {articleForm: $ArticleForm$Model.initialModel,articleList: $ArticleList$Model.initialModel};
   var Model = F2(function (a,b) {    return {articleForm: a,articleList: b};});
   return _elm.Pages.Article.Model.values = {_op: _op,Model: Model,initialModel: initialModel};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.GithubAuth = Elm.Pages.GithubAuth || {};
Elm.Pages.GithubAuth.Model = Elm.Pages.GithubAuth.Model || {};
Elm.Pages.GithubAuth.Model.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.GithubAuth = _elm.Pages.GithubAuth || {};
   _elm.Pages.GithubAuth.Model = _elm.Pages.GithubAuth.Model || {};
   if (_elm.Pages.GithubAuth.Model.values) return _elm.Pages.GithubAuth.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Http = Elm.Http.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var Model = F3(function (a,b,c) {    return {accessToken: a,status: b,code: c};});
   var HttpError = function (a) {    return {ctor: "HttpError",_0: a};};
   var Fetched = {ctor: "Fetched"};
   var Fetching = {ctor: "Fetching"};
   var Error = function (a) {    return {ctor: "Error",_0: a};};
   var Init = {ctor: "Init"};
   var initialModel = {accessToken: "",status: Init,code: $Maybe.Nothing};
   return _elm.Pages.GithubAuth.Model.values = {_op: _op
                                               ,Init: Init
                                               ,Error: Error
                                               ,Fetching: Fetching
                                               ,Fetched: Fetched
                                               ,HttpError: HttpError
                                               ,Model: Model
                                               ,initialModel: initialModel};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.Login = Elm.Pages.Login || {};
Elm.Pages.Login.Model = Elm.Pages.Login.Model || {};
Elm.Pages.Login.Model.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.Login = _elm.Pages.Login || {};
   _elm.Pages.Login.Model = _elm.Pages.Login.Model || {};
   if (_elm.Pages.Login.Model.values) return _elm.Pages.Login.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Http = Elm.Http.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var Model = F5(function (a,b,c,d,e) {    return {accessToken: a,hasAccessTokenInStorage: b,loginForm: c,status: d,userMessage: e};});
   var HttpError = function (a) {    return {ctor: "HttpError",_0: a};};
   var Fetched = {ctor: "Fetched"};
   var Fetching = {ctor: "Fetching"};
   var Init = {ctor: "Init"};
   var Error = function (a) {    return {ctor: "Error",_0: a};};
   var None = {ctor: "None"};
   var LoginForm = F2(function (a,b) {    return {name: a,pass: b};});
   var initialModel = {accessToken: "",hasAccessTokenInStorage: true,loginForm: A2(LoginForm,"demo","1234"),status: Init,userMessage: None};
   return _elm.Pages.Login.Model.values = {_op: _op
                                          ,LoginForm: LoginForm
                                          ,None: None
                                          ,Error: Error
                                          ,Init: Init
                                          ,Fetching: Fetching
                                          ,Fetched: Fetched
                                          ,HttpError: HttpError
                                          ,Model: Model
                                          ,initialModel: initialModel};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.User = Elm.Pages.User || {};
Elm.Pages.User.Model = Elm.Pages.User.Model || {};
Elm.Pages.User.Model.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.User = _elm.Pages.User || {};
   _elm.Pages.User.Model = _elm.Pages.User.Model || {};
   if (_elm.Pages.User.Model.values) return _elm.Pages.User.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Company$Model = Elm.Company.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Http = Elm.Http.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var Model = F5(function (a,b,c,d,e) {    return {name: a,id: b,status: c,accessToken: d,companies: e};});
   var HttpError = function (a) {    return {ctor: "HttpError",_0: a};};
   var Fetched = {ctor: "Fetched"};
   var Fetching = {ctor: "Fetching"};
   var Init = {ctor: "Init"};
   var LoggedIn = function (a) {    return {ctor: "LoggedIn",_0: a};};
   var Anonymous = {ctor: "Anonymous"};
   var initialModel = {name: Anonymous,id: 0,status: Init,accessToken: "",companies: _U.list([$Company$Model.initialModel])};
   return _elm.Pages.User.Model.values = {_op: _op
                                         ,Anonymous: Anonymous
                                         ,LoggedIn: LoggedIn
                                         ,Init: Init
                                         ,Fetching: Fetching
                                         ,Fetched: Fetched
                                         ,HttpError: HttpError
                                         ,Model: Model
                                         ,initialModel: initialModel};
};
Elm.App = Elm.App || {};
Elm.App.Model = Elm.App.Model || {};
Elm.App.Model.make = function (_elm) {
   "use strict";
   _elm.App = _elm.App || {};
   _elm.App.Model = _elm.App.Model || {};
   if (_elm.App.Model.values) return _elm.App.Model.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Company$Model = Elm.Company.Model.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Event = Elm.Event.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$Article$Model = Elm.Pages.Article.Model.make(_elm),
   $Pages$GithubAuth$Model = Elm.Pages.GithubAuth.Model.make(_elm),
   $Pages$Login$Model = Elm.Pages.Login.Model.make(_elm),
   $Pages$User$Model = Elm.Pages.User.Model.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var Model = function (a) {
      return function (b) {
         return function (c) {
            return function (d) {
               return function (e) {
                  return function (f) {
                     return function (g) {
                        return function (h) {
                           return function (i) {
                              return function (j) {
                                 return function (k) {
                                    return {accessToken: a
                                           ,activePage: b
                                           ,article: c
                                           ,config: d
                                           ,configError: e
                                           ,companies: f
                                           ,events: g
                                           ,githubAuth: h
                                           ,login: i
                                           ,nextPage: j
                                           ,user: k};
                                 };
                              };
                           };
                        };
                     };
                  };
               };
            };
         };
      };
   };
   var User = {ctor: "User"};
   var PageNotFound = {ctor: "PageNotFound"};
   var Login = {ctor: "Login"};
   var initialModel = {accessToken: ""
                      ,activePage: Login
                      ,article: $Pages$Article$Model.initialModel
                      ,config: $Config$Model.initialModel
                      ,configError: false
                      ,companies: _U.list([])
                      ,events: $Event.initialModel
                      ,githubAuth: $Pages$GithubAuth$Model.initialModel
                      ,login: $Pages$Login$Model.initialModel
                      ,nextPage: $Maybe.Nothing
                      ,user: $Pages$User$Model.initialModel};
   var GithubAuth = {ctor: "GithubAuth"};
   var Event = function (a) {    return {ctor: "Event",_0: a};};
   var Article = {ctor: "Article"};
   return _elm.App.Model.values = {_op: _op
                                  ,Article: Article
                                  ,Event: Event
                                  ,GithubAuth: GithubAuth
                                  ,Login: Login
                                  ,PageNotFound: PageNotFound
                                  ,User: User
                                  ,Model: Model
                                  ,initialModel: initialModel};
};
Elm.Native = Elm.Native || {};
Elm.Native.WebAPI = Elm.Native.WebAPI || {};
Elm.Native.WebAPI.Location = Elm.Native.WebAPI.Location || {};

Elm.Native.WebAPI.Location.make = function (localRuntime) {
    localRuntime.Native = localRuntime.Native || {};
    localRuntime.Native.WebAPI = localRuntime.Native.WebAPI || {};
    localRuntime.Native.WebAPI.Location = localRuntime.Native.WebAPI.Location || {};

    if (!localRuntime.Native.WebAPI.Location.values) {
        var Task = Elm.Native.Task.make(localRuntime);
        var Utils = Elm.Native.Utils.make(localRuntime);

        // In core before 3.0.0
        var copy = Utils.copy;

        if (!copy) {
            // In core from 3.0.0
            copy = function (value) {
                return Utils.update(value, {});
            };
        }

        localRuntime.Native.WebAPI.Location.values = {
            location: Task.asyncFunction(function (callback) {
                var location = copy(window.location);

                // Deal with Elm reserved word
                location["port$"] = location.port;

                // Polyfill for IE
                if (!location.origin) {
                    location.origin = 
                        location.protocol + "//" +
                        location.hostname + 
                        (location.port ? ':' + location.port: '');
                }

                callback(Task.succeed(location));
            }),

            reload: function (forceServer) {
                return Task.asyncFunction(function (callback) {
                    window.location.reload(forceServer);

                    // Now, I suppose this won't really accomplish anything,
                    // but let's do it anyway.
                    try {
                        callback(
                            Task.succeed(Utils.Tuple0)
                        );
                    } catch (ex) {
                        callback(
                            Task.fail(ex.message)
                        );
                    }
                });
            }
        };
    }

    return localRuntime.Native.WebAPI.Location.values;
};

Elm.WebAPI = Elm.WebAPI || {};
Elm.WebAPI.Location = Elm.WebAPI.Location || {};
Elm.WebAPI.Location.make = function (_elm) {
   "use strict";
   _elm.WebAPI = _elm.WebAPI || {};
   _elm.WebAPI.Location = _elm.WebAPI.Location || {};
   if (_elm.WebAPI.Location.values) return _elm.WebAPI.Location.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$WebAPI$Location = Elm.Native.WebAPI.Location.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var AllowCache = {ctor: "AllowCache"};
   var ForceServer = {ctor: "ForceServer"};
   var nativeReload = $Native$WebAPI$Location.reload;
   var reload = function (source) {
      return nativeReload(function () {    var _p0 = source;if (_p0.ctor === "ForceServer") {    return true;} else {    return false;}}());
   };
   var location = $Native$WebAPI$Location.location;
   var Location = F9(function (a,b,c,d,e,f,g,h,i) {    return {href: a,protocol: b,host: c,hostname: d,port$: e,pathname: f,search: g,hash: h,origin: i};});
   return _elm.WebAPI.Location.values = {_op: _op,location: location,reload: reload,Location: Location,ForceServer: ForceServer,AllowCache: AllowCache};
};
Elm.Config = Elm.Config || {};
Elm.Config.Update = Elm.Config.Update || {};
Elm.Config.Update.make = function (_elm) {
   "use strict";
   _elm.Config = _elm.Config || {};
   _elm.Config.Update = _elm.Config.Update || {};
   if (_elm.Config.Update.values) return _elm.Config.Update.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Config = Elm.Config.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm),
   $WebAPI$Location = Elm.WebAPI.Location.make(_elm);
   var _op = {};
   var update = F2(function (action,model) {
      var _p0 = action;
      if (_p0.ctor === "SetConfig") {
            return {ctor: "_Tuple2",_0: _U.update(model,{backendConfig: _p0._0}),_1: $Effects.none};
         } else {
            return {ctor: "_Tuple2",_0: _U.update(model,{error: true}),_1: $Effects.none};
         }
   });
   var SetError = {ctor: "SetError"};
   var SetConfig = function (a) {    return {ctor: "SetConfig",_0: a};};
   var getConfigFromUrl = function () {
      var getAction = function (location) {
         var config = $List.head(A2($List.filter,function (backend) {    return _U.eq(backend.hostname,location.hostname);},$Config.backends));
         var _p1 = config;
         if (_p1.ctor === "Just") {
               return SetConfig(_p1._0);
            } else {
               return SetError;
            }
      };
      var actionTask = A2($Task.map,getAction,$WebAPI$Location.location);
      return $Effects.task(actionTask);
   }();
   var init = {ctor: "_Tuple2",_0: $Config$Model.initialModel,_1: getConfigFromUrl};
   return _elm.Config.Update.values = {_op: _op,init: init,SetConfig: SetConfig,SetError: SetError,update: update,getConfigFromUrl: getConfigFromUrl};
};
/*!
    localForage -- Offline Storage, Improved
    Version 1.2.2
    https://mozilla.github.io/localForage
    (c) 2013-2015 Mozilla, Apache License 2.0
*/
(function() {
var define, requireModule, require, requirejs;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requirejs = require = requireModule = function(name) {
  requirejs._eak_seen = registry;

    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    if (!registry[name]) {
      throw new Error("Could not find module " + name);
    }

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(resolve(deps[i])));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;

    function resolve(child) {
      if (child.charAt(0) !== '.') { return child; }
      var parts = child.split("/");
      var parentBase = name.split("/").slice(0, -1);

      for (var i=0, l=parts.length; i<l; i++) {
        var part = parts[i];

        if (part === '..') { parentBase.pop(); }
        else if (part === '.') { continue; }
        else { parentBase.push(part); }
      }

      return parentBase.join("/");
    }
  };
})();

define("promise/all",
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global toString */

    var isArray = __dependency1__.isArray;
    var isFunction = __dependency1__.isFunction;

    /**
      Returns a promise that is fulfilled when all the given promises have been
      fulfilled, or rejected if any of them become rejected. The return promise
      is fulfilled with an array that gives all the values in the order they were
      passed in the `promises` array argument.

      Example:

      ```javascript
      var promise1 = RSVP.resolve(1);
      var promise2 = RSVP.resolve(2);
      var promise3 = RSVP.resolve(3);
      var promises = [ promise1, promise2, promise3 ];

      RSVP.all(promises).then(function(array){
        // The array here would be [ 1, 2, 3 ];
      });
      ```

      If any of the `promises` given to `RSVP.all` are rejected, the first promise
      that is rejected will be given as an argument to the returned promises's
      rejection handler. For example:

      Example:

      ```javascript
      var promise1 = RSVP.resolve(1);
      var promise2 = RSVP.reject(new Error("2"));
      var promise3 = RSVP.reject(new Error("3"));
      var promises = [ promise1, promise2, promise3 ];

      RSVP.all(promises).then(function(array){
        // Code here never runs because there are rejected promises!
      }, function(error) {
        // error.message === "2"
      });
      ```

      @method all
      @for RSVP
      @param {Array} promises
      @param {String} label
      @return {Promise} promise that is fulfilled when all `promises` have been
      fulfilled, or rejected if any of them become rejected.
    */
    function all(promises) {
      /*jshint validthis:true */
      var Promise = this;

      if (!isArray(promises)) {
        throw new TypeError('You must pass an array to all.');
      }

      return new Promise(function(resolve, reject) {
        var results = [], remaining = promises.length,
        promise;

        if (remaining === 0) {
          resolve([]);
        }

        function resolver(index) {
          return function(value) {
            resolveAll(index, value);
          };
        }

        function resolveAll(index, value) {
          results[index] = value;
          if (--remaining === 0) {
            resolve(results);
          }
        }

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && isFunction(promise.then)) {
            promise.then(resolver(i), reject);
          } else {
            resolveAll(i, promise);
          }
        }
      });
    }

    __exports__.all = all;
  });
define("promise/asap",
  ["exports"],
  function(__exports__) {
    "use strict";
    var browserGlobal = (typeof window !== 'undefined') ? window : {};
    var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
    var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

    // node
    function useNextTick() {
      return function() {
        process.nextTick(flush);
      };
    }

    function useMutationObserver() {
      var iterations = 0;
      var observer = new BrowserMutationObserver(flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    function useSetTimeout() {
      return function() {
        local.setTimeout(flush, 1);
      };
    }

    var queue = [];
    function flush() {
      for (var i = 0; i < queue.length; i++) {
        var tuple = queue[i];
        var callback = tuple[0], arg = tuple[1];
        callback(arg);
      }
      queue = [];
    }

    var scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      scheduleFlush = useNextTick();
    } else if (BrowserMutationObserver) {
      scheduleFlush = useMutationObserver();
    } else {
      scheduleFlush = useSetTimeout();
    }

    function asap(callback, arg) {
      var length = queue.push([callback, arg]);
      if (length === 1) {
        // If length is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        scheduleFlush();
      }
    }

    __exports__.asap = asap;
  });
define("promise/config",
  ["exports"],
  function(__exports__) {
    "use strict";
    var config = {
      instrument: false
    };

    function configure(name, value) {
      if (arguments.length === 2) {
        config[name] = value;
      } else {
        return config[name];
      }
    }

    __exports__.config = config;
    __exports__.configure = configure;
  });
define("promise/polyfill",
  ["./promise","./utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*global self*/
    var RSVPPromise = __dependency1__.Promise;
    var isFunction = __dependency2__.isFunction;

    function polyfill() {
      var local;

      if (typeof global !== 'undefined') {
        local = global;
      } else if (typeof window !== 'undefined' && window.document) {
        local = window;
      } else {
        local = self;
      }

      var es6PromiseSupport =
        "Promise" in local &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        "resolve" in local.Promise &&
        "reject" in local.Promise &&
        "all" in local.Promise &&
        "race" in local.Promise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function() {
          var resolve;
          new local.Promise(function(r) { resolve = r; });
          return isFunction(resolve);
        }());

      if (!es6PromiseSupport) {
        local.Promise = RSVPPromise;
      }
    }

    __exports__.polyfill = polyfill;
  });
define("promise/promise",
  ["./config","./utils","./all","./race","./resolve","./reject","./asap","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var configure = __dependency1__.configure;
    var objectOrFunction = __dependency2__.objectOrFunction;
    var isFunction = __dependency2__.isFunction;
    var now = __dependency2__.now;
    var all = __dependency3__.all;
    var race = __dependency4__.race;
    var staticResolve = __dependency5__.resolve;
    var staticReject = __dependency6__.reject;
    var asap = __dependency7__.asap;

    var counter = 0;

    config.async = asap; // default async is asap;

    function Promise(resolver) {
      if (!isFunction(resolver)) {
        throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
      }

      if (!(this instanceof Promise)) {
        throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
      }

      this._subscribers = [];

      invokeResolver(resolver, this);
    }

    function invokeResolver(resolver, promise) {
      function resolvePromise(value) {
        resolve(promise, value);
      }

      function rejectPromise(reason) {
        reject(promise, reason);
      }

      try {
        resolver(resolvePromise, rejectPromise);
      } catch(e) {
        rejectPromise(e);
      }
    }

    function invokeCallback(settled, promise, callback, detail) {
      var hasCallback = isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        try {
          value = callback(detail);
          succeeded = true;
        } catch(e) {
          failed = true;
          error = e;
        }
      } else {
        value = detail;
        succeeded = true;
      }

      if (handleThenable(promise, value)) {
        return;
      } else if (hasCallback && succeeded) {
        resolve(promise, value);
      } else if (failed) {
        reject(promise, error);
      } else if (settled === FULFILLED) {
        resolve(promise, value);
      } else if (settled === REJECTED) {
        reject(promise, value);
      }
    }

    var PENDING   = void 0;
    var SEALED    = 0;
    var FULFILLED = 1;
    var REJECTED  = 2;

    function subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      subscribers[length] = child;
      subscribers[length + FULFILLED] = onFulfillment;
      subscribers[length + REJECTED]  = onRejection;
    }

    function publish(promise, settled) {
      var child, callback, subscribers = promise._subscribers, detail = promise._detail;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        invokeCallback(settled, child, callback, detail);
      }

      promise._subscribers = null;
    }

    Promise.prototype = {
      constructor: Promise,

      _state: undefined,
      _detail: undefined,
      _subscribers: undefined,

      then: function(onFulfillment, onRejection) {
        var promise = this;

        var thenPromise = new this.constructor(function() {});

        if (this._state) {
          var callbacks = arguments;
          config.async(function invokePromiseCallback() {
            invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
          });
        } else {
          subscribe(this, thenPromise, onFulfillment, onRejection);
        }

        return thenPromise;
      },

      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };

    Promise.all = all;
    Promise.race = race;
    Promise.resolve = staticResolve;
    Promise.reject = staticReject;

    function handleThenable(promise, value) {
      var then = null,
      resolved;

      try {
        if (promise === value) {
          throw new TypeError("A promises callback cannot return that same promise.");
        }

        if (objectOrFunction(value)) {
          then = value.then;

          if (isFunction(then)) {
            then.call(value, function(val) {
              if (resolved) { return true; }
              resolved = true;

              if (value !== val) {
                resolve(promise, val);
              } else {
                fulfill(promise, val);
              }
            }, function(val) {
              if (resolved) { return true; }
              resolved = true;

              reject(promise, val);
            });

            return true;
          }
        }
      } catch (error) {
        if (resolved) { return true; }
        reject(promise, error);
        return true;
      }

      return false;
    }

    function resolve(promise, value) {
      if (promise === value) {
        fulfill(promise, value);
      } else if (!handleThenable(promise, value)) {
        fulfill(promise, value);
      }
    }

    function fulfill(promise, value) {
      if (promise._state !== PENDING) { return; }
      promise._state = SEALED;
      promise._detail = value;

      config.async(publishFulfillment, promise);
    }

    function reject(promise, reason) {
      if (promise._state !== PENDING) { return; }
      promise._state = SEALED;
      promise._detail = reason;

      config.async(publishRejection, promise);
    }

    function publishFulfillment(promise) {
      publish(promise, promise._state = FULFILLED);
    }

    function publishRejection(promise) {
      publish(promise, promise._state = REJECTED);
    }

    __exports__.Promise = Promise;
  });
define("promise/race",
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global toString */
    var isArray = __dependency1__.isArray;

    /**
      `RSVP.race` allows you to watch a series of promises and act as soon as the
      first promise given to the `promises` argument fulfills or rejects.

      Example:

      ```javascript
      var promise1 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 1");
        }, 200);
      });

      var promise2 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 2");
        }, 100);
      });

      RSVP.race([promise1, promise2]).then(function(result){
        // result === "promise 2" because it was resolved before promise1
        // was resolved.
      });
      ```

      `RSVP.race` is deterministic in that only the state of the first completed
      promise matters. For example, even if other promises given to the `promises`
      array argument are resolved, but the first completed promise has become
      rejected before the other promises became fulfilled, the returned promise
      will become rejected:

      ```javascript
      var promise1 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 1");
        }, 200);
      });

      var promise2 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          reject(new Error("promise 2"));
        }, 100);
      });

      RSVP.race([promise1, promise2]).then(function(result){
        // Code here never runs because there are rejected promises!
      }, function(reason){
        // reason.message === "promise2" because promise 2 became rejected before
        // promise 1 became fulfilled
      });
      ```

      @method race
      @for RSVP
      @param {Array} promises array of promises to observe
      @param {String} label optional string for describing the promise returned.
      Useful for tooling.
      @return {Promise} a promise that becomes fulfilled with the value the first
      completed promises is resolved with if the first completed promise was
      fulfilled, or rejected with the reason that the first completed promise
      was rejected with.
    */
    function race(promises) {
      /*jshint validthis:true */
      var Promise = this;

      if (!isArray(promises)) {
        throw new TypeError('You must pass an array to race.');
      }
      return new Promise(function(resolve, reject) {
        var results = [], promise;

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && typeof promise.then === 'function') {
            promise.then(resolve, reject);
          } else {
            resolve(promise);
          }
        }
      });
    }

    __exports__.race = race;
  });
define("promise/reject",
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      `RSVP.reject` returns a promise that will become rejected with the passed
      `reason`. `RSVP.reject` is essentially shorthand for the following:

      ```javascript
      var promise = new RSVP.Promise(function(resolve, reject){
        reject(new Error('WHOOPS'));
      });

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      Instead of writing the above, your code now simply becomes the following:

      ```javascript
      var promise = RSVP.reject(new Error('WHOOPS'));

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      @method reject
      @for RSVP
      @param {Any} reason value that the returned promise will be rejected with.
      @param {String} label optional string for identifying the returned promise.
      Useful for tooling.
      @return {Promise} a promise that will become rejected with the given
      `reason`.
    */
    function reject(reason) {
      /*jshint validthis:true */
      var Promise = this;

      return new Promise(function (resolve, reject) {
        reject(reason);
      });
    }

    __exports__.reject = reject;
  });
define("promise/resolve",
  ["exports"],
  function(__exports__) {
    "use strict";
    function resolve(value) {
      /*jshint validthis:true */
      if (value && typeof value === 'object' && value.constructor === this) {
        return value;
      }

      var Promise = this;

      return new Promise(function(resolve) {
        resolve(value);
      });
    }

    __exports__.resolve = resolve;
  });
define("promise/utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    function objectOrFunction(x) {
      return isFunction(x) || (typeof x === "object" && x !== null);
    }

    function isFunction(x) {
      return typeof x === "function";
    }

    function isArray(x) {
      return Object.prototype.toString.call(x) === "[object Array]";
    }

    // Date.now is not available in browsers < IE9
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
    var now = Date.now || function() { return new Date().getTime(); };


    __exports__.objectOrFunction = objectOrFunction;
    __exports__.isFunction = isFunction;
    __exports__.isArray = isArray;
    __exports__.now = now;
  });
requireModule('promise/polyfill').polyfill();
}());(function() {
    'use strict';

    // Sadly, the best way to save binary data in WebSQL/localStorage is serializing
    // it to Base64, so this is how we store it to prevent very strange errors with less
    // verbose ways of binary => string data storage.
    var BASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    var SERIALIZED_MARKER = '__lfsc__:';
    var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

    // OMG the serializations!
    var TYPE_ARRAYBUFFER = 'arbf';
    var TYPE_BLOB = 'blob';
    var TYPE_INT8ARRAY = 'si08';
    var TYPE_UINT8ARRAY = 'ui08';
    var TYPE_UINT8CLAMPEDARRAY = 'uic8';
    var TYPE_INT16ARRAY = 'si16';
    var TYPE_INT32ARRAY = 'si32';
    var TYPE_UINT16ARRAY = 'ur16';
    var TYPE_UINT32ARRAY = 'ui32';
    var TYPE_FLOAT32ARRAY = 'fl32';
    var TYPE_FLOAT64ARRAY = 'fl64';
    var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH +
                                        TYPE_ARRAYBUFFER.length;

    // Serialize a value, afterwards executing a callback (which usually
    // instructs the `setItem()` callback/promise to be executed). This is how
    // we store binary data with localStorage.
    function serialize(value, callback) {
        var valueString = '';
        if (value) {
            valueString = value.toString();
        }

        // Cannot use `value instanceof ArrayBuffer` or such here, as these
        // checks fail when running the tests using casper.js...
        //
        // TODO: See why those tests fail and use a better solution.
        if (value && (value.toString() === '[object ArrayBuffer]' ||
                      value.buffer &&
                      value.buffer.toString() === '[object ArrayBuffer]')) {
            // Convert binary arrays to a string and prefix the string with
            // a special marker.
            var buffer;
            var marker = SERIALIZED_MARKER;

            if (value instanceof ArrayBuffer) {
                buffer = value;
                marker += TYPE_ARRAYBUFFER;
            } else {
                buffer = value.buffer;

                if (valueString === '[object Int8Array]') {
                    marker += TYPE_INT8ARRAY;
                } else if (valueString === '[object Uint8Array]') {
                    marker += TYPE_UINT8ARRAY;
                } else if (valueString === '[object Uint8ClampedArray]') {
                    marker += TYPE_UINT8CLAMPEDARRAY;
                } else if (valueString === '[object Int16Array]') {
                    marker += TYPE_INT16ARRAY;
                } else if (valueString === '[object Uint16Array]') {
                    marker += TYPE_UINT16ARRAY;
                } else if (valueString === '[object Int32Array]') {
                    marker += TYPE_INT32ARRAY;
                } else if (valueString === '[object Uint32Array]') {
                    marker += TYPE_UINT32ARRAY;
                } else if (valueString === '[object Float32Array]') {
                    marker += TYPE_FLOAT32ARRAY;
                } else if (valueString === '[object Float64Array]') {
                    marker += TYPE_FLOAT64ARRAY;
                } else {
                    callback(new Error('Failed to get type for BinaryArray'));
                }
            }

            callback(marker + bufferToString(buffer));
        } else if (valueString === '[object Blob]') {
            // Conver the blob to a binaryArray and then to a string.
            var fileReader = new FileReader();

            fileReader.onload = function() {
                var str = bufferToString(this.result);

                callback(SERIALIZED_MARKER + TYPE_BLOB + str);
            };

            fileReader.readAsArrayBuffer(value);
        } else {
            try {
                callback(JSON.stringify(value));
            } catch (e) {
                window.console.error("Couldn't convert value into a JSON " +
                                     'string: ', value);

                callback(null, e);
            }
        }
    }

    // Deserialize data we've inserted into a value column/field. We place
    // special markers into our strings to mark them as encoded; this isn't
    // as nice as a meta field, but it's the only sane thing we can do whilst
    // keeping localStorage support intact.
    //
    // Oftentimes this will just deserialize JSON content, but if we have a
    // special marker (SERIALIZED_MARKER, defined above), we will extract
    // some kind of arraybuffer/binary data/typed array out of the string.
    function deserialize(value) {
        // If we haven't marked this string as being specially serialized (i.e.
        // something other than serialized JSON), we can just return it and be
        // done with it.
        if (value.substring(0,
            SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
            return JSON.parse(value);
        }

        // The following code deals with deserializing some kind of Blob or
        // TypedArray. First we separate out the type of data we're dealing
        // with from the data itself.
        var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
        var type = value.substring(SERIALIZED_MARKER_LENGTH,
                                   TYPE_SERIALIZED_MARKER_LENGTH);

        var buffer = stringToBuffer(serializedString);

        // Return the right type based on the code/type set during
        // serialization.
        switch (type) {
            case TYPE_ARRAYBUFFER:
                return buffer;
            case TYPE_BLOB:
                return new Blob([buffer]);
            case TYPE_INT8ARRAY:
                return new Int8Array(buffer);
            case TYPE_UINT8ARRAY:
                return new Uint8Array(buffer);
            case TYPE_UINT8CLAMPEDARRAY:
                return new Uint8ClampedArray(buffer);
            case TYPE_INT16ARRAY:
                return new Int16Array(buffer);
            case TYPE_UINT16ARRAY:
                return new Uint16Array(buffer);
            case TYPE_INT32ARRAY:
                return new Int32Array(buffer);
            case TYPE_UINT32ARRAY:
                return new Uint32Array(buffer);
            case TYPE_FLOAT32ARRAY:
                return new Float32Array(buffer);
            case TYPE_FLOAT64ARRAY:
                return new Float64Array(buffer);
            default:
                throw new Error('Unkown type: ' + type);
        }
    }

    function stringToBuffer(serializedString) {
        // Fill the string into a ArrayBuffer.
        var bufferLength = serializedString.length * 0.75;
        var len = serializedString.length;
        var i;
        var p = 0;
        var encoded1, encoded2, encoded3, encoded4;

        if (serializedString[serializedString.length - 1] === '=') {
            bufferLength--;
            if (serializedString[serializedString.length - 2] === '=') {
                bufferLength--;
            }
        }

        var buffer = new ArrayBuffer(bufferLength);
        var bytes = new Uint8Array(buffer);

        for (i = 0; i < len; i+=4) {
            encoded1 = BASE_CHARS.indexOf(serializedString[i]);
            encoded2 = BASE_CHARS.indexOf(serializedString[i+1]);
            encoded3 = BASE_CHARS.indexOf(serializedString[i+2]);
            encoded4 = BASE_CHARS.indexOf(serializedString[i+3]);

            /*jslint bitwise: true */
            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }
        return buffer;
    }

    // Converts a buffer to a string to store, serialized, in the backend
    // storage library.
    function bufferToString(buffer) {
        // base64-arraybuffer
        var bytes = new Uint8Array(buffer);
        var base64String = '';
        var i;

        for (i = 0; i < bytes.length; i += 3) {
            /*jslint bitwise: true */
            base64String += BASE_CHARS[bytes[i] >> 2];
            base64String += BASE_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64String += BASE_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64String += BASE_CHARS[bytes[i + 2] & 63];
        }

        if ((bytes.length % 3) === 2) {
            base64String = base64String.substring(0, base64String.length - 1) + '=';
        } else if (bytes.length % 3 === 1) {
            base64String = base64String.substring(0, base64String.length - 2) + '==';
        }

        return base64String;
    }

    var localforageSerializer = {
        serialize: serialize,
        deserialize: deserialize,
        stringToBuffer: stringToBuffer,
        bufferToString: bufferToString
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = localforageSerializer;
    } else if (typeof define === 'function' && define.amd) {
        define('localforageSerializer', function() {
            return localforageSerializer;
        });
    } else {
        this.localforageSerializer = localforageSerializer;
    }
}).call(window);
// Some code originally from async_storage.js in
// [Gaia](https://github.com/mozilla-b2g/gaia).
(function() {
    'use strict';

    // Originally found in https://github.com/mozilla-b2g/gaia/blob/e8f624e4cc9ea945727278039b3bc9bcb9f8667a/shared/js/async_storage.js

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    // Initialize IndexedDB; fall back to vendor-prefixed versions if needed.
    var indexedDB = indexedDB || this.indexedDB || this.webkitIndexedDB ||
                    this.mozIndexedDB || this.OIndexedDB ||
                    this.msIndexedDB;

    // If IndexedDB isn't available, we get outta here!
    if (!indexedDB) {
        return;
    }

    // Open the IndexedDB database (automatically creates one if one didn't
    // previously exist), using any options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {
            db: null
        };

        if (options) {
            for (var i in options) {
                dbInfo[i] = options[i];
            }
        }

        return new Promise(function(resolve, reject) {
            var openreq = indexedDB.open(dbInfo.name, dbInfo.version);
            openreq.onerror = function() {
                reject(openreq.error);
            };
            openreq.onupgradeneeded = function() {
                // First time setup: create an empty object store
                openreq.result.createObjectStore(dbInfo.storeName);
            };
            openreq.onsuccess = function() {
                dbInfo.db = openreq.result;
                self._dbInfo = dbInfo;
                resolve();
            };
        });
    }

    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                    .objectStore(dbInfo.storeName);
                var req = store.get(key);

                req.onsuccess = function() {
                    var value = req.result;
                    if (value === undefined) {
                        value = null;
                    }

                    resolve(value);
                };

                req.onerror = function() {
                    reject(req.error);
                };
            })["catch"](reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    // Iterate over all items stored in database.
    function iterate(iterator, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                                     .objectStore(dbInfo.storeName);

                var req = store.openCursor();
                var iterationNumber = 1;

                req.onsuccess = function() {
                    var cursor = req.result;

                    if (cursor) {
                        var result = iterator(cursor.value, cursor.key, iterationNumber++);

                        if (result !== void(0)) {
                            resolve(result);
                        } else {
                            cursor["continue"]();
                        }
                    } else {
                        resolve();
                    }
                };

                req.onerror = function() {
                    reject(req.error);
                };
            })["catch"](reject);
        });

        executeDeferedCallback(promise, callback);

        return promise;
    }

    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
                var store = transaction.objectStore(dbInfo.storeName);

                // The reason we don't _save_ null is because IE 10 does
                // not support saving the `null` type in IndexedDB. How
                // ironic, given the bug below!
                // See: https://github.com/mozilla/localForage/issues/161
                if (value === null) {
                    value = undefined;
                }

                var req = store.put(value, key);
                transaction.oncomplete = function() {
                    // Cast to undefined so the value passed to
                    // callback/promise is the same as what one would get out
                    // of `getItem()` later. This leads to some weirdness
                    // (setItem('foo', undefined) will return `null`), but
                    // it's not my fault localStorage is our baseline and that
                    // it's weird.
                    if (value === undefined) {
                        value = null;
                    }

                    resolve(value);
                };
                transaction.onabort = transaction.onerror = function() {
                    reject(req.error);
                };
            })["catch"](reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
                var store = transaction.objectStore(dbInfo.storeName);

                // We use a Grunt task to make this safe for IE and some
                // versions of Android (including those used by Cordova).
                // Normally IE won't like `.delete()` and will insist on
                // using `['delete']()`, but we have a build step that
                // fixes this for us now.
                var req = store["delete"](key);
                transaction.oncomplete = function() {
                    resolve();
                };

                transaction.onerror = function() {
                    reject(req.error);
                };

                // The request will be aborted if we've exceeded our storage
                // space. In this case, we will reject with a specific
                // "QuotaExceededError".
                transaction.onabort = function(event) {
                    var error = event.target.error;
                    if (error === 'QuotaExceededError') {
                        reject(error);
                    }
                };
            })["catch"](reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function clear(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
                var store = transaction.objectStore(dbInfo.storeName);
                var req = store.clear();

                transaction.oncomplete = function() {
                    resolve();
                };

                transaction.onabort = transaction.onerror = function() {
                    reject(req.error);
                };
            })["catch"](reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function length(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);
                var req = store.count();

                req.onsuccess = function() {
                    resolve(req.result);
                };

                req.onerror = function() {
                    reject(req.error);
                };
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function key(n, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            if (n < 0) {
                resolve(null);

                return;
            }

            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);

                var advanced = false;
                var req = store.openCursor();
                req.onsuccess = function() {
                    var cursor = req.result;
                    if (!cursor) {
                        // this means there weren't enough keys
                        resolve(null);

                        return;
                    }

                    if (n === 0) {
                        // We have the first key, return it if that's what they
                        // wanted.
                        resolve(cursor.key);
                    } else {
                        if (!advanced) {
                            // Otherwise, ask the cursor to skip ahead n
                            // records.
                            advanced = true;
                            cursor.advance(n);
                        } else {
                            // When we get here, we've got the nth key.
                            resolve(cursor.key);
                        }
                    }
                };

                req.onerror = function() {
                    reject(req.error);
                };
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);

                var req = store.openCursor();
                var keys = [];

                req.onsuccess = function() {
                    var cursor = req.result;

                    if (!cursor) {
                        resolve(keys);
                        return;
                    }

                    keys.push(cursor.key);
                    cursor["continue"]();
                };

                req.onerror = function() {
                    reject(req.error);
                };
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    function executeDeferedCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                deferCallback(callback, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    // Under Chrome the callback is called before the changes (save, clear)
    // are actually made. So we use a defer function which wait that the
    // call stack to be empty.
    // For more info : https://github.com/mozilla/localForage/issues/175
    // Pull request : https://github.com/mozilla/localForage/pull/178
    function deferCallback(callback, result) {
        if (callback) {
            return setTimeout(function() {
                return callback(null, result);
            }, 0);
        }
    }

    var asyncStorage = {
        _driver: 'asyncStorage',
        _initStorage: _initStorage,
        iterate: iterate,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = asyncStorage;
    } else if (typeof define === 'function' && define.amd) {
        define('asyncStorage', function() {
            return asyncStorage;
        });
    } else {
        this.asyncStorage = asyncStorage;
    }
}).call(window);
// If IndexedDB isn't available, we'll fall back to localStorage.
// Note that this will have considerable performance and storage
// side-effects (all data will be serialized on save and only data that
// can be converted to a string via `JSON.stringify()` will be saved).
(function() {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    var globalObject = this;
    var serializer = null;
    var localStorage = null;

    // If the app is running inside a Google Chrome packaged webapp, or some
    // other context where localStorage isn't available, we don't use
    // localStorage. This feature detection is preferred over the old
    // `if (window.chrome && window.chrome.runtime)` code.
    // See: https://github.com/mozilla/localForage/issues/68
    try {
        // If localStorage isn't available, we get outta here!
        // This should be inside a try catch
        if (!this.localStorage || !('setItem' in this.localStorage)) {
            return;
        }
        // Initialize localStorage and create a variable to use throughout
        // the code.
        localStorage = this.localStorage;
    } catch (e) {
        return;
    }

    var ModuleType = {
        DEFINE: 1,
        EXPORT: 2,
        WINDOW: 3
    };

    // Attaching to window (i.e. no module loader) is the assumed,
    // simple default.
    var moduleType = ModuleType.WINDOW;

    // Find out what kind of module setup we have; if none, we'll just attach
    // localForage to the main window.
    if (typeof module !== 'undefined' && module.exports) {
        moduleType = ModuleType.EXPORT;
    } else if (typeof define === 'function' && define.amd) {
        moduleType = ModuleType.DEFINE;
    }

    // Config the localStorage backend, using options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {};
        if (options) {
            for (var i in options) {
                dbInfo[i] = options[i];
            }
        }

        dbInfo.keyPrefix = dbInfo.name + '/';

        self._dbInfo = dbInfo;

        var serializerPromise = new Promise(function(resolve/*, reject*/) {
            // We allow localForage to be declared as a module or as a
            // library available without AMD/require.js.
            if (moduleType === ModuleType.DEFINE) {
                require(['localforageSerializer'], resolve);
            } else if (moduleType === ModuleType.EXPORT) {
                // Making it browserify friendly
                resolve(require('./../utils/serializer'));
            } else {
                resolve(globalObject.localforageSerializer);
            }
        });

        return serializerPromise.then(function(lib) {
            serializer = lib;
            return Promise.resolve();
        });
    }

    // Remove all keys from the datastore, effectively destroying all data in
    // the app's key/value store!
    function clear(callback) {
        var self = this;
        var promise = self.ready().then(function() {
            var keyPrefix = self._dbInfo.keyPrefix;

            for (var i = localStorage.length - 1; i >= 0; i--) {
                var key = localStorage.key(i);

                if (key.indexOf(keyPrefix) === 0) {
                    localStorage.removeItem(key);
                }
            }
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Retrieve an item from the store. Unlike the original async_storage
    // library in Gaia, we don't modify return values at all. If a key's value
    // is `undefined`, we pass that value to the callback function.
    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = self.ready().then(function() {
            var dbInfo = self._dbInfo;
            var result = localStorage.getItem(dbInfo.keyPrefix + key);

            // If a result was found, parse it from the serialized
            // string into a JS object. If result isn't truthy, the key
            // is likely undefined and we'll pass it straight to the
            // callback.
            if (result) {
                result = serializer.deserialize(result);
            }

            return result;
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Iterate over all items in the store.
    function iterate(iterator, callback) {
        var self = this;

        var promise = self.ready().then(function() {
            var keyPrefix = self._dbInfo.keyPrefix;
            var keyPrefixLength = keyPrefix.length;
            var length = localStorage.length;

            for (var i = 0; i < length; i++) {
                var key = localStorage.key(i);
                var value = localStorage.getItem(key);

                // If a result was found, parse it from the serialized
                // string into a JS object. If result isn't truthy, the
                // key is likely undefined and we'll pass it straight
                // to the iterator.
                if (value) {
                    value = serializer.deserialize(value);
                }

                value = iterator(value, key.substring(keyPrefixLength), i + 1);

                if (value !== void(0)) {
                    return value;
                }
            }
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Same as localStorage's key() method, except takes a callback.
    function key(n, callback) {
        var self = this;
        var promise = self.ready().then(function() {
            var dbInfo = self._dbInfo;
            var result;
            try {
                result = localStorage.key(n);
            } catch (error) {
                result = null;
            }

            // Remove the prefix from the key, if a key is found.
            if (result) {
                result = result.substring(dbInfo.keyPrefix.length);
            }

            return result;
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;
        var promise = self.ready().then(function() {
            var dbInfo = self._dbInfo;
            var length = localStorage.length;
            var keys = [];

            for (var i = 0; i < length; i++) {
                if (localStorage.key(i).indexOf(dbInfo.keyPrefix) === 0) {
                    keys.push(localStorage.key(i).substring(dbInfo.keyPrefix.length));
                }
            }

            return keys;
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Supply the number of keys in the datastore to the callback function.
    function length(callback) {
        var self = this;
        var promise = self.keys().then(function(keys) {
            return keys.length;
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Remove an item from the store, nice and simple.
    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = self.ready().then(function() {
            var dbInfo = self._dbInfo;
            localStorage.removeItem(dbInfo.keyPrefix + key);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Set a key's value and run an optional callback once the value is set.
    // Unlike Gaia's implementation, the callback function is passed the value,
    // in case you want to operate on that value only after you're sure it
    // saved, or something like that.
    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = self.ready().then(function() {
            // Convert undefined values to null.
            // https://github.com/mozilla/localForage/pull/42
            if (value === undefined) {
                value = null;
            }

            // Save the original value to pass to the callback.
            var originalValue = value;

            return new Promise(function(resolve, reject) {
                serializer.serialize(value, function(value, error) {
                    if (error) {
                        reject(error);
                    } else {
                        try {
                            var dbInfo = self._dbInfo;
                            localStorage.setItem(dbInfo.keyPrefix + key, value);
                            resolve(originalValue);
                        } catch (e) {
                            // localStorage capacity exceeded.
                            // TODO: Make this a specific error/event.
                            if (e.name === 'QuotaExceededError' ||
                                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                                reject(e);
                            }
                            reject(e);
                        }
                    }
                });
            });
        });

        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    var localStorageWrapper = {
        _driver: 'localStorageWrapper',
        _initStorage: _initStorage,
        // Default API, from Gaia/localStorage.
        iterate: iterate,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (moduleType === ModuleType.EXPORT) {
        module.exports = localStorageWrapper;
    } else if (moduleType === ModuleType.DEFINE) {
        define('localStorageWrapper', function() {
            return localStorageWrapper;
        });
    } else {
        this.localStorageWrapper = localStorageWrapper;
    }
}).call(window);
/*
 * Includes code from:
 *
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
(function() {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    var globalObject = this;
    var serializer = null;
    var openDatabase = this.openDatabase;

    // If WebSQL methods aren't available, we can stop now.
    if (!openDatabase) {
        return;
    }

    var ModuleType = {
        DEFINE: 1,
        EXPORT: 2,
        WINDOW: 3
    };

    // Attaching to window (i.e. no module loader) is the assumed,
    // simple default.
    var moduleType = ModuleType.WINDOW;

    // Find out what kind of module setup we have; if none, we'll just attach
    // localForage to the main window.
    if (typeof module !== 'undefined' && module.exports) {
        moduleType = ModuleType.EXPORT;
    } else if (typeof define === 'function' && define.amd) {
        moduleType = ModuleType.DEFINE;
    }

    // Open the WebSQL database (automatically creates one if one didn't
    // previously exist), using any options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {
            db: null
        };

        if (options) {
            for (var i in options) {
                dbInfo[i] = typeof(options[i]) !== 'string' ?
                            options[i].toString() : options[i];
            }
        }

        var serializerPromise = new Promise(function(resolve/*, reject*/) {
            // We allow localForage to be declared as a module or as a
            // library available without AMD/require.js.
            if (moduleType === ModuleType.DEFINE) {
                require(['localforageSerializer'], resolve);
            } else if (moduleType === ModuleType.EXPORT) {
                // Making it browserify friendly
                resolve(require('./../utils/serializer'));
            } else {
                resolve(globalObject.localforageSerializer);
            }
        });

        var dbInfoPromise = new Promise(function(resolve, reject) {
            // Open the database; the openDatabase API will automatically
            // create it for us if it doesn't exist.
            try {
                dbInfo.db = openDatabase(dbInfo.name, String(dbInfo.version),
                                         dbInfo.description, dbInfo.size);
            } catch (e) {
                return self.setDriver(self.LOCALSTORAGE).then(function() {
    return self._initStorage(options);
}).then(resolve)["catch"](reject);
            }

            // Create our key/value table if it doesn't exist.
            dbInfo.db.transaction(function(t) {
                t.executeSql('CREATE TABLE IF NOT EXISTS ' + dbInfo.storeName +
                             ' (id INTEGER PRIMARY KEY, key unique, value)', [],
                             function() {
                    self._dbInfo = dbInfo;
                    resolve();
                }, function(t, error) {
                    reject(error);
                });
            });
        });

        return serializerPromise.then(function(lib) {
            serializer = lib;
            return dbInfoPromise;
        });
    }

    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT * FROM ' + dbInfo.storeName +
                                 ' WHERE key = ? LIMIT 1', [key],
                                 function(t, results) {
                        var result = results.rows.length ?
                                     results.rows.item(0).value : null;

                        // Check to see if this is serialized content we need to
                        // unpack.
                        if (result) {
                            result = serializer.deserialize(result);
                        }

                        resolve(result);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function iterate(iterator, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;

                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT * FROM ' + dbInfo.storeName, [],
                        function(t, results) {
                            var rows = results.rows;
                            var length = rows.length;

                            for (var i = 0; i < length; i++) {
                                var item = rows.item(i);
                                var result = item.value;

                                // Check to see if this is serialized content
                                // we need to unpack.
                                if (result) {
                                    result = serializer.deserialize(result);
                                }

                                result = iterator(result, item.key, i + 1);

                                // void(0) prevents problems with redefinition
                                // of `undefined`.
                                if (result !== void(0)) {
                                    resolve(result);
                                    return;
                                }
                            }

                            resolve();
                        }, function(t, error) {
                            reject(error);
                        });
                });
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                // The localStorage API doesn't return undefined values in an
                // "expected" way, so undefined is always cast to null in all
                // drivers. See: https://github.com/mozilla/localForage/pull/42
                if (value === undefined) {
                    value = null;
                }

                // Save the original value to pass to the callback.
                var originalValue = value;

                serializer.serialize(value, function(value, error) {
                    if (error) {
                        reject(error);
                    } else {
                        var dbInfo = self._dbInfo;
                        dbInfo.db.transaction(function(t) {
                            t.executeSql('INSERT OR REPLACE INTO ' +
                                         dbInfo.storeName +
                                         ' (key, value) VALUES (?, ?)',
                                         [key, value], function() {
                                resolve(originalValue);
                            }, function(t, error) {
                                reject(error);
                            });
                        }, function(sqlError) { // The transaction failed; check
                                                // to see if it's a quota error.
                            if (sqlError.code === sqlError.QUOTA_ERR) {
                                // We reject the callback outright for now, but
                                // it's worth trying to re-run the transaction.
                                // Even if the user accepts the prompt to use
                                // more storage on Safari, this error will
                                // be called.
                                //
                                // TODO: Try to re-run the transaction.
                                reject(sqlError);
                            }
                        });
                    }
                });
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('DELETE FROM ' + dbInfo.storeName +
                                 ' WHERE key = ?', [key], function() {

                        resolve();
                    }, function(t, error) {

                        reject(error);
                    });
                });
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Deletes every item in the table.
    // TODO: Find out if this resets the AUTO_INCREMENT number.
    function clear(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('DELETE FROM ' + dbInfo.storeName, [],
                                 function() {
                        resolve();
                    }, function(t, error) {
                        reject(error);
                    });
                });
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Does a simple `COUNT(key)` to get the number of items stored in
    // localForage.
    function length(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    // Ahhh, SQL makes this one soooooo easy.
                    t.executeSql('SELECT COUNT(key) as c FROM ' +
                                 dbInfo.storeName, [], function(t, results) {
                        var result = results.rows.item(0).c;

                        resolve(result);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Return the key located at key index X; essentially gets the key from a
    // `WHERE id = ?`. This is the most efficient way I can think to implement
    // this rarely-used (in my experience) part of the API, but it can seem
    // inconsistent, because we do `INSERT OR REPLACE INTO` on `setItem()`, so
    // the ID of each key will change every time it's updated. Perhaps a stored
    // procedure for the `setItem()` SQL would solve this problem?
    // TODO: Don't change ID on `setItem()`.
    function key(n, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT key FROM ' + dbInfo.storeName +
                                 ' WHERE id = ? LIMIT 1', [n + 1],
                                 function(t, results) {
                        var result = results.rows.length ?
                                     results.rows.item(0).key : null;
                        resolve(result);
                    }, function(t, error) {
                        reject(error);
                    });
                });
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT key FROM ' + dbInfo.storeName, [],
                                 function(t, results) {
                        var keys = [];

                        for (var i = 0; i < results.rows.length; i++) {
                            keys.push(results.rows.item(i).key);
                        }

                        resolve(keys);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            })["catch"](reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    var webSQLStorage = {
        _driver: 'webSQLStorage',
        _initStorage: _initStorage,
        iterate: iterate,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (moduleType === ModuleType.DEFINE) {
        define('webSQLStorage', function() {
            return webSQLStorage;
        });
    } else if (moduleType === ModuleType.EXPORT) {
        module.exports = webSQLStorage;
    } else {
        this.webSQLStorage = webSQLStorage;
    }
}).call(window);
(function() {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    // Custom drivers are stored here when `defineDriver()` is called.
    // They are shared across all instances of localForage.
    var CustomDrivers = {};

    var DriverType = {
        INDEXEDDB: 'asyncStorage',
        LOCALSTORAGE: 'localStorageWrapper',
        WEBSQL: 'webSQLStorage'
    };

    var DefaultDriverOrder = [
        DriverType.INDEXEDDB,
        DriverType.WEBSQL,
        DriverType.LOCALSTORAGE
    ];

    var LibraryMethods = [
        'clear',
        'getItem',
        'iterate',
        'key',
        'keys',
        'length',
        'removeItem',
        'setItem'
    ];

    var ModuleType = {
        DEFINE: 1,
        EXPORT: 2,
        WINDOW: 3
    };

    var DefaultConfig = {
        description: '',
        driver: DefaultDriverOrder.slice(),
        name: 'localforage',
        // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
        // we can use without a prompt.
        size: 4980736,
        storeName: 'keyvaluepairs',
        version: 1.0
    };

    // Attaching to window (i.e. no module loader) is the assumed,
    // simple default.
    var moduleType = ModuleType.WINDOW;

    // Find out what kind of module setup we have; if none, we'll just attach
    // localForage to the main window.
    if (typeof module !== 'undefined' && module.exports) {
        moduleType = ModuleType.EXPORT;
    } else if (typeof define === 'function' && define.amd) {
        moduleType = ModuleType.DEFINE;
    }

    // Check to see if IndexedDB is available and if it is the latest
    // implementation; it's our preferred backend library. We use "_spec_test"
    // as the name of the database because it's not the one we'll operate on,
    // but it's useful to make sure its using the right spec.
    // See: https://github.com/mozilla/localForage/issues/128
    var driverSupport = (function(self) {
        // Initialize IndexedDB; fall back to vendor-prefixed versions
        // if needed.
        var indexedDB = indexedDB || self.indexedDB || self.webkitIndexedDB ||
                        self.mozIndexedDB || self.OIndexedDB ||
                        self.msIndexedDB;

        var result = {};

        result[DriverType.WEBSQL] = !!self.openDatabase;
        result[DriverType.INDEXEDDB] = !!(function() {
            // We mimic PouchDB here; just UA test for Safari (which, as of
            // iOS 8/Yosemite, doesn't properly support IndexedDB).
            // IndexedDB support is broken and different from Blink's.
            // This is faster than the test case (and it's sync), so we just
            // do this. *SIGH*
            // http://bl.ocks.org/nolanlawson/raw/c83e9039edf2278047e9/
            //
            // We test for openDatabase because IE Mobile identifies itself
            // as Safari. Oh the lulz...
            if (typeof self.openDatabase !== 'undefined' && self.navigator &&
                self.navigator.userAgent &&
                /Safari/.test(self.navigator.userAgent) &&
                !/Chrome/.test(self.navigator.userAgent)) {
                return false;
            }
            try {
                return indexedDB &&
                       typeof indexedDB.open === 'function' &&
                       // Some Samsung/HTC Android 4.0-4.3 devices
                       // have older IndexedDB specs; if this isn't available
                       // their IndexedDB is too old for us to use.
                       // (Replaces the onupgradeneeded test.)
                       typeof self.IDBKeyRange !== 'undefined';
            } catch (e) {
                return false;
            }
        })();

        result[DriverType.LOCALSTORAGE] = !!(function() {
            try {
                return (self.localStorage &&
                        ('setItem' in self.localStorage) &&
                        (self.localStorage.setItem));
            } catch (e) {
                return false;
            }
        })();

        return result;
    })(this);

    var isArray = Array.isArray || function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };

    function callWhenReady(localForageInstance, libraryMethod) {
        localForageInstance[libraryMethod] = function() {
            var _args = arguments;
            return localForageInstance.ready().then(function() {
                return localForageInstance[libraryMethod].apply(localForageInstance, _args);
            });
        };
    }

    function extend() {
        for (var i = 1; i < arguments.length; i++) {
            var arg = arguments[i];

            if (arg) {
                for (var key in arg) {
                    if (arg.hasOwnProperty(key)) {
                        if (isArray(arg[key])) {
                            arguments[0][key] = arg[key].slice();
                        } else {
                            arguments[0][key] = arg[key];
                        }
                    }
                }
            }
        }

        return arguments[0];
    }

    function isLibraryDriver(driverName) {
        for (var driver in DriverType) {
            if (DriverType.hasOwnProperty(driver) &&
                DriverType[driver] === driverName) {
                return true;
            }
        }

        return false;
    }

    var globalObject = this;

    function LocalForage(options) {
        this._config = extend({}, DefaultConfig, options);
        this._driverSet = null;
        this._ready = false;
        this._dbInfo = null;

        // Add a stub for each driver API method that delays the call to the
        // corresponding driver method until localForage is ready. These stubs
        // will be replaced by the driver methods as soon as the driver is
        // loaded, so there is no performance impact.
        for (var i = 0; i < LibraryMethods.length; i++) {
            callWhenReady(this, LibraryMethods[i]);
        }

        this.setDriver(this._config.driver);
    }

    LocalForage.prototype.INDEXEDDB = DriverType.INDEXEDDB;
    LocalForage.prototype.LOCALSTORAGE = DriverType.LOCALSTORAGE;
    LocalForage.prototype.WEBSQL = DriverType.WEBSQL;

    // Set any config values for localForage; can be called anytime before
    // the first API call (e.g. `getItem`, `setItem`).
    // We loop through options so we don't overwrite existing config
    // values.
    LocalForage.prototype.config = function(options) {
        // If the options argument is an object, we use it to set values.
        // Otherwise, we return either a specified config value or all
        // config values.
        if (typeof(options) === 'object') {
            // If localforage is ready and fully initialized, we can't set
            // any new configuration values. Instead, we return an error.
            if (this._ready) {
                return new Error("Can't call config() after localforage " +
                                 'has been used.');
            }

            for (var i in options) {
                if (i === 'storeName') {
                    options[i] = options[i].replace(/\W/g, '_');
                }

                this._config[i] = options[i];
            }

            // after all config options are set and
            // the driver option is used, try setting it
            if ('driver' in options && options.driver) {
                this.setDriver(this._config.driver);
            }

            return true;
        } else if (typeof(options) === 'string') {
            return this._config[options];
        } else {
            return this._config;
        }
    };

    // Used to define a custom driver, shared across all instances of
    // localForage.
    LocalForage.prototype.defineDriver = function(driverObject, callback,
                                                  errorCallback) {
        var defineDriver = new Promise(function(resolve, reject) {
            try {
                var driverName = driverObject._driver;
                var complianceError = new Error(
                    'Custom driver not compliant; see ' +
                    'https://mozilla.github.io/localForage/#definedriver'
                );
                var namingError = new Error(
                    'Custom driver name already in use: ' + driverObject._driver
                );

                // A driver name should be defined and not overlap with the
                // library-defined, default drivers.
                if (!driverObject._driver) {
                    reject(complianceError);
                    return;
                }
                if (isLibraryDriver(driverObject._driver)) {
                    reject(namingError);
                    return;
                }

                var customDriverMethods = LibraryMethods.concat('_initStorage');
                for (var i = 0; i < customDriverMethods.length; i++) {
                    var customDriverMethod = customDriverMethods[i];
                    if (!customDriverMethod ||
                        !driverObject[customDriverMethod] ||
                        typeof driverObject[customDriverMethod] !== 'function') {
                        reject(complianceError);
                        return;
                    }
                }

                var supportPromise = Promise.resolve(true);
                if ('_support'  in driverObject) {
                    if (driverObject._support && typeof driverObject._support === 'function') {
                        supportPromise = driverObject._support();
                    } else {
                        supportPromise = Promise.resolve(!!driverObject._support);
                    }
                }

                supportPromise.then(function(supportResult) {
                    driverSupport[driverName] = supportResult;
                    CustomDrivers[driverName] = driverObject;
                    resolve();
                }, reject);
            } catch (e) {
                reject(e);
            }
        });

        defineDriver.then(callback, errorCallback);
        return defineDriver;
    };

    LocalForage.prototype.driver = function() {
        return this._driver || null;
    };

    LocalForage.prototype.ready = function(callback) {
        var self = this;

        var ready = new Promise(function(resolve, reject) {
            self._driverSet.then(function() {
                if (self._ready === null) {
                    self._ready = self._initStorage(self._config);
                }

                self._ready.then(resolve, reject);
            })["catch"](reject);
        });

        ready.then(callback, callback);
        return ready;
    };

    LocalForage.prototype.setDriver = function(drivers, callback,
                                               errorCallback) {
        var self = this;

        if (typeof drivers === 'string') {
            drivers = [drivers];
        }

        this._driverSet = new Promise(function(resolve, reject) {
            var driverName = self._getFirstSupportedDriver(drivers);
            var error = new Error('No available storage method found.');

            if (!driverName) {
                self._driverSet = Promise.reject(error);
                reject(error);
                return;
            }

            self._dbInfo = null;
            self._ready = null;

            if (isLibraryDriver(driverName)) {
                // We allow localForage to be declared as a module or as a
                // library available without AMD/require.js.
                if (moduleType === ModuleType.DEFINE) {
                    require([driverName], function(lib) {
                        self._extend(lib);

                        resolve();
                    });

                    return;
                } else if (moduleType === ModuleType.EXPORT) {
                    // Making it browserify friendly
                    var driver;
                    switch (driverName) {
                        case self.INDEXEDDB:
                            driver = require('./drivers/indexeddb');
                            break;
                        case self.LOCALSTORAGE:
                            driver = require('./drivers/localstorage');
                            break;
                        case self.WEBSQL:
                            driver = require('./drivers/websql');
                    }

                    self._extend(driver);
                } else {
                    self._extend(globalObject[driverName]);
                }
            } else if (CustomDrivers[driverName]) {
                self._extend(CustomDrivers[driverName]);
            } else {
                self._driverSet = Promise.reject(error);
                reject(error);
                return;
            }

            resolve();
        });

        function setDriverToConfig() {
            self._config.driver = self.driver();
        }
        this._driverSet.then(setDriverToConfig, setDriverToConfig);

        this._driverSet.then(callback, errorCallback);
        return this._driverSet;
    };

    LocalForage.prototype.supports = function(driverName) {
        return !!driverSupport[driverName];
    };

    LocalForage.prototype._extend = function(libraryMethodsAndProperties) {
        extend(this, libraryMethodsAndProperties);
    };

    // Used to determine which driver we should use as the backend for this
    // instance of localForage.
    LocalForage.prototype._getFirstSupportedDriver = function(drivers) {
        if (drivers && isArray(drivers)) {
            for (var i = 0; i < drivers.length; i++) {
                var driver = drivers[i];

                if (this.supports(driver)) {
                    return driver;
                }
            }
        }

        return null;
    };

    LocalForage.prototype.createInstance = function(options) {
        return new LocalForage(options);
    };

    // The actual localForage object that we expose as a module or via a
    // global. It's extended by pulling in one of our other libraries.
    var localForage = new LocalForage();

    // We allow localForage to be declared as a module or as a library
    // available without AMD/require.js.
    if (moduleType === ModuleType.DEFINE) {
        define('localforage', function() {
            return localForage;
        });
    } else if (moduleType === ModuleType.EXPORT) {
        module.exports = localForage;
    } else {
        this.localforage = localForage;
    }
}).call(window);




/////////////////////////////////
/// NATIVE MODULE STARTS HERE ///
/////////////////////////////////

Elm.Native = Elm.Native || {};
Elm.Native.Storage = {};
Elm.Native.Storage.make = function(localRuntime){

  localRuntime.Native = localRuntime.Native || {};
  localRuntime.Native.Storage = localRuntime.Native.Storage || {};

  if (localRuntime.Native.Storage.values){
    return localRuntime.Native.Storage.values;
  }

  var Task = Elm.Native.Task.make(localRuntime);
  var Utils = Elm.Native.Utils.make(localRuntime);
  var List = Elm.Native.List.make(localRuntime);

  // getItemAsJson : String -> Task error Value
  var getItemAsJson = function(key){
    return Task.asyncFunction(function(callback){
      localforage.getItem(key).then(function(value){
        callback(Task.succeed(value));
      }).catch(function(err){
        console.log("Storage Call: getItemAsJson has failed with key: " + key);
        callback(Task.fail("Storage Call: getItemAsJson has failed with key: " + key));
      });
    });
  };

  // setItem : String -> Value -> Task error ()
  var setItem = function(key, value){
    return Task.asyncFunction(function(callback){
      localforage.setItem(key, value).then(function(){
        callback(Task.succeed(Utils.Tuple0));
      }).catch(function(){
        console.log("Storage Call: setItem has failed with key: " + key + " and value: " + value);
        callback(Task.fail("Storage Call: setItem has failed with key: " + key + " and value: " + value));
      });
    });
  };

  // removeItem : String -> Task error ()
  var removeItem = function(key){
    return Task.asyncFunction(function(callback){
      localforage.removeItem(key).then(function(){
        callback(Task.succeed(Utils.Tuple0));
      }).catch(function(){
        callback(Task.fail("Storage Call: removeItem has failed with key: " + key));
      });
    });
  };

  // clear : Task error ()
  var clear = Task.asyncFunction(function(callback){
    localforage.clear().then(function(){
      callback(Task.succeed(Utils.Tuple0));
    }).catch(function(){
      callback(Task.fail("Storage Call: clear has failed"));
    });
  });


  // keys : Task error (List String)
  var keys = Task.asyncFunction(function(callback){
    localforage.keys().then(function(keys){
      callback(Task.succeed(List.fromArray(keys)));
    }).catch(function(){
      callback(Task.fail("Storage Call: keys has failed"));
    });
  });

  // length : Task error Int
  var length = Task.asyncFunction(function(callback){
    localforage.length().then(function(numberOfKeys){
      callback(Task.succeed(numberOfKeys));
    }).catch(function(){
      callback(Task.fail("Storage Call: length has failed"));
    });
  });


  return {
    getItemAsJson : getItemAsJson,
    setItem       : F2(setItem),
    removeItem    : removeItem,
    clear         : clear,
    keys          : keys,
    length        : length
  };


};

Elm.Storage = Elm.Storage || {};
Elm.Storage.make = function (_elm) {
   "use strict";
   _elm.Storage = _elm.Storage || {};
   if (_elm.Storage.values) return _elm.Storage.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $Json$Encode = Elm.Json.Encode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Storage = Elm.Native.Storage.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var length = $Native$Storage.length;
   var keys = $Native$Storage.keys;
   var clear = $Native$Storage.clear;
   var removeItem = $Native$Storage.removeItem;
   var setItem = $Native$Storage.setItem;
   var getItemAsJson = $Native$Storage.getItemAsJson;
   var getItem = F2(function (key,decoder) {
      var decode = function (value) {
         var _p0 = A2($Json$Decode.decodeValue,decoder,value);
         if (_p0.ctor === "Ok") {
               return $Task.succeed(_p0._0);
            } else {
               return $Task.fail("Failed");
            }
      };
      return A2($Task.andThen,getItemAsJson(key),decode);
   });
   return _elm.Storage.values = {_op: _op
                                ,getItemAsJson: getItemAsJson
                                ,getItem: getItem
                                ,setItem: setItem
                                ,removeItem: removeItem
                                ,clear: clear
                                ,keys: keys
                                ,length: length};
};
Elm.Article = Elm.Article || {};
Elm.Article.Decoder = Elm.Article.Decoder || {};
Elm.Article.Decoder.make = function (_elm) {
   "use strict";
   _elm.Article = _elm.Article || {};
   _elm.Article.Decoder = _elm.Article.Decoder || {};
   if (_elm.Article.Decoder.values) return _elm.Article.Decoder.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Article$Model = Elm.Article.Model.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   var decode = function () {
      var decodeImage = A2($Json$Decode.at,_U.list(["styles"]),A2($Json$Decode._op[":="],"thumbnail",$Json$Decode.string));
      var numberFloat = $Json$Decode.oneOf(_U.list([$Json$Decode.$float,A2($Json$Decode.customDecoder,$Json$Decode.string,$String.toFloat)]));
      var number = $Json$Decode.oneOf(_U.list([$Json$Decode.$int,A2($Json$Decode.customDecoder,$Json$Decode.string,$String.toInt)]));
      var decodeAuthor = A3($Json$Decode.object2,
      $Article$Model.Author,
      A2($Json$Decode._op[":="],"id",number),
      A2($Json$Decode._op[":="],"label",$Json$Decode.string));
      return A6($Json$Decode.object5,
      $Article$Model.Model,
      A2($Json$Decode._op[":="],"user",decodeAuthor),
      $Json$Decode.oneOf(_U.list([A2($Json$Decode._op[":="],"body",$Json$Decode.string),$Json$Decode.succeed("")])),
      A2($Json$Decode._op[":="],"id",number),
      $Json$Decode.maybe(A2($Json$Decode._op[":="],"image",decodeImage)),
      A2($Json$Decode._op[":="],"label",$Json$Decode.string));
   }();
   return _elm.Article.Decoder.values = {_op: _op,decode: decode};
};
Elm.Utils = Elm.Utils || {};
Elm.Utils.Http = Elm.Utils.Http || {};
Elm.Utils.Http.make = function (_elm) {
   "use strict";
   _elm.Utils = _elm.Utils || {};
   _elm.Utils.Http = _elm.Utils.Http || {};
   if (_elm.Utils.Http.values) return _elm.Utils.Http.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Http = Elm.Http.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var getErrorMessageFromHttpResponse = function (err) {
      var _p0 = err;
      switch (_p0.ctor)
      {case "Timeout": return "Connection has timed out";
         case "BadResponse": var _p1 = _p0._0;
           return _U.eq(_p1,401) ? "Wrong username or password" : _U.eq(_p1,
           429) ? "Too many login requests with the wrong username or password. Wait a few hours before trying again" : _U.cmp(_p1,
           500) > -1 ? "Some error has occured on the server" : "Unknow error has occured";
         case "NetworkError": return "A network error has occured";
         default: return A2($Basics._op["++"],"Unknow error has occured: ",_p0._0);}
   };
   return _elm.Utils.Http.values = {_op: _op,getErrorMessageFromHttpResponse: getErrorMessageFromHttpResponse};
};
Elm.ArticleForm = Elm.ArticleForm || {};
Elm.ArticleForm.Update = Elm.ArticleForm.Update || {};
Elm.ArticleForm.Update.make = function (_elm) {
   "use strict";
   _elm.ArticleForm = _elm.ArticleForm || {};
   _elm.ArticleForm.Update = _elm.ArticleForm.Update || {};
   if (_elm.ArticleForm.Update.values) return _elm.ArticleForm.Update.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Article$Decoder = Elm.Article.Decoder.make(_elm),
   $Article$Model = Elm.Article.Model.make(_elm),
   $ArticleForm$Model = Elm.ArticleForm.Model.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Http = Elm.Http.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $Json$Encode = Elm.Json.Encode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm),
   $Utils$Http = Elm.Utils.Http.make(_elm);
   var _op = {};
   var decodePostArticle = A2($Json$Decode.at,_U.list(["data","0"]),$Article$Decoder.decode);
   var dataToJson = function (data) {
      var intOrNull = function (maybeVal) {
         var _p0 = maybeVal;
         if (_p0.ctor === "Just") {
               return $Json$Encode.$int(_p0._0);
            } else {
               return $Json$Encode.$null;
            }
      };
      return A2($Json$Encode.encode,
      0,
      $Json$Encode.object(_U.list([{ctor: "_Tuple2",_0: "label",_1: $Json$Encode.string(data.label)}
                                  ,{ctor: "_Tuple2",_0: "body",_1: $Json$Encode.string(data.body)}
                                  ,{ctor: "_Tuple2",_0: "image",_1: intOrNull(data.image)}])));
   };
   var Context = F2(function (a,b) {    return {accessToken: a,backendConfig: b};});
   var UpdatePostArticle = function (a) {    return {ctor: "UpdatePostArticle",_0: a};};
   var postArticle = F3(function (url,accessToken,data) {
      var params = _U.list([{ctor: "_Tuple2",_0: "access_token",_1: accessToken}]);
      var encodedUrl = A2($Http.url,url,params);
      return $Effects.task(A2($Task.map,UpdatePostArticle,$Task.toResult(A3($Http.post,decodePostArticle,encodedUrl,$Http.string(dataToJson(data))))));
   });
   var UpdateLabel = function (a) {    return {ctor: "UpdateLabel",_0: a};};
   var UpdateBody = function (a) {    return {ctor: "UpdateBody",_0: a};};
   var SetUserMessage = function (a) {    return {ctor: "SetUserMessage",_0: a};};
   var SetImageId = function (a) {    return {ctor: "SetImageId",_0: a};};
   var SubmitForm = {ctor: "SubmitForm"};
   var ResetForm = {ctor: "ResetForm"};
   var update = F3(function (context,action,model) {
      var _p1 = action;
      switch (_p1.ctor)
      {case "ResetForm": return {ctor: "_Tuple3"
                                ,_0: _U.update(model,{articleForm: $ArticleForm$Model.initialArticleForm,postStatus: $ArticleForm$Model.Ready})
                                ,_1: $Effects.none
                                ,_2: $Maybe.Nothing};
         case "SetImageId": var articleForm = model.articleForm;
           var articleForm$ = _U.update(articleForm,{image: _p1._0});
           return {ctor: "_Tuple3",_0: _U.update(model,{articleForm: articleForm$}),_1: $Effects.none,_2: $Maybe.Nothing};
         case "SetUserMessage": return {ctor: "_Tuple3",_0: _U.update(model,{userMessage: _p1._0}),_1: $Effects.none,_2: $Maybe.Nothing};
         case "SubmitForm": var backendUrl = function (_p2) {
              return function (_) {
                 return _.backendUrl;
              }(function (_) {    return _.backendConfig;}(_p2));
           }(context);
           var url = A2($Basics._op["++"],backendUrl,"/api/v1.0/articles");
           return _U.eq(model.postStatus,$ArticleForm$Model.Ready) ? {ctor: "_Tuple3"
                                                                     ,_0: _U.update(model,{postStatus: $ArticleForm$Model.Busy})
                                                                     ,_1: A3(postArticle,url,context.accessToken,model.articleForm)
                                                                     ,_2: $Maybe.Nothing} : {ctor: "_Tuple3",_0: model,_1: $Effects.none,_2: $Maybe.Nothing};
         case "UpdateBody": var articleForm = model.articleForm;
           var articleForm$ = _U.update(articleForm,{body: _p1._0});
           return {ctor: "_Tuple3",_0: _U.update(model,{articleForm: articleForm$}),_1: $Effects.none,_2: $Maybe.Nothing};
         case "UpdateLabel": var articleForm = model.articleForm;
           var articleForm$ = _U.update(articleForm,{label: _p1._0});
           return {ctor: "_Tuple3",_0: _U.update(model,{articleForm: articleForm$}),_1: $Effects.none,_2: $Maybe.Nothing};
         default: var _p3 = _p1._0;
           if (_p3.ctor === "Ok") {
                 return {ctor: "_Tuple3"
                        ,_0: _U.update(model,{postStatus: $ArticleForm$Model.Done})
                        ,_1: $Effects.task($Task.succeed(ResetForm))
                        ,_2: $Maybe.Just(_p3._0)};
              } else {
                 return {ctor: "_Tuple3"
                        ,_0: model
                        ,_1: $Effects.task($Task.succeed(SetUserMessage($ArticleForm$Model.Error($Utils$Http.getErrorMessageFromHttpResponse(_p3._0)))))
                        ,_2: $Maybe.Nothing};
              }}
   });
   var init = {ctor: "_Tuple2",_0: $ArticleForm$Model.initialModel,_1: $Effects.none};
   return _elm.ArticleForm.Update.values = {_op: _op
                                           ,init: init
                                           ,ResetForm: ResetForm
                                           ,SubmitForm: SubmitForm
                                           ,SetImageId: SetImageId
                                           ,SetUserMessage: SetUserMessage
                                           ,UpdateBody: UpdateBody
                                           ,UpdateLabel: UpdateLabel
                                           ,UpdatePostArticle: UpdatePostArticle
                                           ,Context: Context
                                           ,update: update
                                           ,postArticle: postArticle
                                           ,dataToJson: dataToJson
                                           ,decodePostArticle: decodePostArticle};
};
Elm.ArticleList = Elm.ArticleList || {};
Elm.ArticleList.Update = Elm.ArticleList.Update || {};
Elm.ArticleList.Update.make = function (_elm) {
   "use strict";
   _elm.ArticleList = _elm.ArticleList || {};
   _elm.ArticleList.Update = _elm.ArticleList.Update || {};
   if (_elm.ArticleList.Update.values) return _elm.ArticleList.Update.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Article$Decoder = Elm.Article.Decoder.make(_elm),
   $Article$Model = Elm.Article.Model.make(_elm),
   $ArticleList$Model = Elm.ArticleList.Model.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Config = Elm.Config.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Http = Elm.Http.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm),
   $TaskTutorial = Elm.TaskTutorial.make(_elm),
   $Time = Elm.Time.make(_elm);
   var _op = {};
   var decodeData = A2($Json$Decode.at,_U.list(["data"]),$Json$Decode.list($Article$Decoder.decode));
   var UpdateContext = F2(function (a,b) {    return {accessToken: a,backendConfig: b};});
   var UpdateDataFromServer = F2(function (a,b) {    return {ctor: "UpdateDataFromServer",_0: a,_1: b};});
   var getJson = F2(function (url,accessToken) {
      var params = _U.list([{ctor: "_Tuple2",_0: "access_token",_1: accessToken},{ctor: "_Tuple2",_0: "sort",_1: "-id"}]);
      var encodedUrl = A2($Http.url,url,params);
      var httpTask = $Task.toResult(A2($Http.get,decodeData,encodedUrl));
      var actionTask = A2($Task.andThen,
      httpTask,
      function (result) {
         return A2($Task.map,function (timestamp$) {    return A2(UpdateDataFromServer,result,timestamp$);},$TaskTutorial.getCurrentTime);
      });
      return $Effects.task(actionTask);
   });
   var NoOp = {ctor: "NoOp"};
   var GetDataFromServer = {ctor: "GetDataFromServer"};
   var getDataFromCache = function (status) {
      var actionTask = function () {
         var _p0 = status;
         if (_p0.ctor === "Fetched") {
               return A2($Task.map,
               function (currentTime) {
                  return _U.cmp(_p0._0 + $Config.cacheTtl,currentTime) > 0 ? NoOp : GetDataFromServer;
               },
               $TaskTutorial.getCurrentTime);
            } else {
               return $Task.succeed(GetDataFromServer);
            }
      }();
      return $Effects.task(actionTask);
   };
   var update = F3(function (context,action,model) {
      var _p1 = action;
      switch (_p1.ctor)
      {case "AppendArticle": return {ctor: "_Tuple2",_0: _U.update(model,{articles: A2($List._op["::"],_p1._0,model.articles)}),_1: $Effects.none};
         case "GetData": var effects = function () {
              var _p2 = model.status;
              if (_p2.ctor === "Fetching") {
                    return $Effects.none;
                 } else {
                    return getDataFromCache(model.status);
                 }
           }();
           return {ctor: "_Tuple2",_0: model,_1: effects};
         case "GetDataFromServer": var backendUrl = function (_p3) {
              return function (_) {
                 return _.backendUrl;
              }(function (_) {    return _.backendConfig;}(_p3));
           }(context);
           var url = A2($Basics._op["++"],backendUrl,"/api/v1.0/articles");
           return {ctor: "_Tuple2",_0: _U.update(model,{status: $ArticleList$Model.Fetching}),_1: A2(getJson,url,context.accessToken)};
         case "UpdateDataFromServer": var _p4 = _p1._0;
           if (_p4.ctor === "Ok") {
                 return {ctor: "_Tuple2",_0: _U.update(model,{articles: _p4._0,status: $ArticleList$Model.Fetched(_p1._1)}),_1: $Effects.none};
              } else {
                 return {ctor: "_Tuple2",_0: _U.update(model,{status: $ArticleList$Model.HttpError(_p4._0)}),_1: $Effects.none};
              }
         default: return {ctor: "_Tuple2",_0: model,_1: $Effects.none};}
   });
   var GetData = {ctor: "GetData"};
   var AppendArticle = function (a) {    return {ctor: "AppendArticle",_0: a};};
   var init = {ctor: "_Tuple2",_0: $ArticleList$Model.initialModel,_1: $Effects.none};
   return _elm.ArticleList.Update.values = {_op: _op
                                           ,init: init
                                           ,AppendArticle: AppendArticle
                                           ,GetData: GetData
                                           ,GetDataFromServer: GetDataFromServer
                                           ,NoOp: NoOp
                                           ,UpdateDataFromServer: UpdateDataFromServer
                                           ,UpdateContext: UpdateContext
                                           ,update: update
                                           ,getDataFromCache: getDataFromCache
                                           ,getJson: getJson
                                           ,decodeData: decodeData};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.Article = Elm.Pages.Article || {};
Elm.Pages.Article.Update = Elm.Pages.Article.Update || {};
Elm.Pages.Article.Update.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.Article = _elm.Pages.Article || {};
   _elm.Pages.Article.Update = _elm.Pages.Article.Update || {};
   if (_elm.Pages.Article.Update.values) return _elm.Pages.Article.Update.values;
   var _U = Elm.Native.Utils.make(_elm),
   $ArticleForm$Update = Elm.ArticleForm.Update.make(_elm),
   $ArticleList$Update = Elm.ArticleList.Update.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$Article$Model = Elm.Pages.Article.Model.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var init = {ctor: "_Tuple2",_0: $Pages$Article$Model.initialModel,_1: $Effects.none};
   var UpdateContext = F2(function (a,b) {    return {accessToken: a,backendConfig: b};});
   var ChildArticleListAction = function (a) {    return {ctor: "ChildArticleListAction",_0: a};};
   var ChildArticleFormAction = function (a) {    return {ctor: "ChildArticleFormAction",_0: a};};
   var update = F3(function (context,action,model) {
      var _p0 = action;
      switch (_p0.ctor)
      {case "Activate": return {ctor: "_Tuple2",_0: model,_1: $Effects.task($Task.succeed(ChildArticleListAction($ArticleList$Update.GetData)))};
         case "ChildArticleFormAction": var _p1 = A3($ArticleForm$Update.update,context,_p0._0,model.articleForm);
           var childModel = _p1._0;
           var childEffects = _p1._1;
           var maybeArticle = _p1._2;
           var defaultEffects = _U.list([A2($Effects.map,ChildArticleFormAction,childEffects)]);
           var effects$ = function () {
              var _p2 = maybeArticle;
              if (_p2.ctor === "Just") {
                    return A2($List._op["::"],$Effects.task($Task.succeed(ChildArticleListAction($ArticleList$Update.AppendArticle(_p2._0)))),defaultEffects);
                 } else {
                    return defaultEffects;
                 }
           }();
           return {ctor: "_Tuple2",_0: _U.update(model,{articleForm: childModel}),_1: $Effects.batch(effects$)};
         default: var _p3 = A3($ArticleList$Update.update,context,_p0._0,model.articleList);
           var childModel = _p3._0;
           var childEffects = _p3._1;
           return {ctor: "_Tuple2",_0: _U.update(model,{articleList: childModel}),_1: A2($Effects.map,ChildArticleListAction,childEffects)};}
   });
   var Activate = {ctor: "Activate"};
   return _elm.Pages.Article.Update.values = {_op: _op
                                             ,Activate: Activate
                                             ,ChildArticleFormAction: ChildArticleFormAction
                                             ,ChildArticleListAction: ChildArticleListAction
                                             ,UpdateContext: UpdateContext
                                             ,init: init
                                             ,update: update};
};
Elm.UrlParseUtil = Elm.UrlParseUtil || {};
Elm.UrlParseUtil.make = function (_elm) {
   "use strict";
   _elm.UrlParseUtil = _elm.UrlParseUtil || {};
   if (_elm.UrlParseUtil.values) return _elm.UrlParseUtil.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   var firstOccurrence = F2(function (c,s) {
      var _p0 = A2($String.indexes,$String.fromChar(c),s);
      if (_p0.ctor === "[]") {
            return $Maybe.Nothing;
         } else {
            return $Maybe.Just(_p0._0);
         }
   });
   var splitAtFirst = F2(function (c,s) {
      var _p1 = A2(firstOccurrence,c,s);
      if (_p1.ctor === "Nothing") {
            return {ctor: "_Tuple2",_0: s,_1: ""};
         } else {
            var _p2 = _p1._0;
            return {ctor: "_Tuple2",_0: A2($String.left,_p2,s),_1: A2($String.dropLeft,_p2 + 1,s)};
         }
   });
   return _elm.UrlParseUtil.values = {_op: _op,splitAtFirst: splitAtFirst,firstOccurrence: firstOccurrence};
};
Elm.UrlParameterParser = Elm.UrlParameterParser || {};
Elm.UrlParameterParser.make = function (_elm) {
   "use strict";
   _elm.UrlParameterParser = _elm.UrlParameterParser || {};
   if (_elm.UrlParameterParser.values) return _elm.UrlParameterParser.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Dict = Elm.Dict.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm),
   $UrlParseUtil = Elm.UrlParseUtil.make(_elm);
   var _op = {};
   var UrlParams = function (a) {    return {ctor: "UrlParams",_0: a};};
   var parseParams = function (stringWithAmpersands) {
      var eachParam = A2($String.split,"&",stringWithAmpersands);
      var eachPair = A2($List.map,$UrlParseUtil.splitAtFirst(_U.chr("=")),eachParam);
      return UrlParams($Dict.fromList(eachPair));
   };
   var Error = function (a) {    return {ctor: "Error",_0: a};};
   var parseSearchString = function (startsWithQuestionMarkThenParams) {
      var _p0 = $String.uncons(startsWithQuestionMarkThenParams);
      if (_p0.ctor === "Nothing") {
            return Error("No URL params");
         } else {
            if (_p0._0.ctor === "_Tuple2" && _p0._0._0.valueOf() === "?") {
                  return parseParams(_p0._0._1);
               } else {
                  return Error("No URL params");
               }
         }
   };
   return _elm.UrlParameterParser.values = {_op: _op,parseSearchString: parseSearchString,Error: Error,UrlParams: UrlParams};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.GithubAuth = Elm.Pages.GithubAuth || {};
Elm.Pages.GithubAuth.Update = Elm.Pages.GithubAuth.Update || {};
Elm.Pages.GithubAuth.Update.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.GithubAuth = _elm.Pages.GithubAuth || {};
   _elm.Pages.GithubAuth.Update = _elm.Pages.GithubAuth.Update || {};
   if (_elm.Pages.GithubAuth.Update.values) return _elm.Pages.GithubAuth.Update.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Dict = Elm.Dict.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Http = Elm.Http.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $Json$Encode = Elm.Json.Encode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$GithubAuth$Model = Elm.Pages.GithubAuth.Model.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm),
   $UrlParameterParser = Elm.UrlParameterParser.make(_elm),
   $WebAPI$Location = Elm.WebAPI.Location.make(_elm);
   var _op = {};
   var decodeAccessToken = A2($Json$Decode.at,_U.list(["access_token"]),$Json$Decode.string);
   var dataToJson = function (code) {
      return A2($Json$Encode.encode,0,$Json$Encode.object(_U.list([{ctor: "_Tuple2",_0: "code",_1: $Json$Encode.string(code)}])));
   };
   var UpdateContext = function (a) {    return {backendConfig: a};};
   var UpdateAccessTokenFromServer = function (a) {    return {ctor: "UpdateAccessTokenFromServer",_0: a};};
   var getJson = F2(function (backendUrl,code) {
      return $Effects.task(A2($Task.map,
      UpdateAccessTokenFromServer,
      $Task.toResult(A3($Http.post,decodeAccessToken,A2($Basics._op["++"],backendUrl,"/auth/github"),$Http.string(dataToJson(code))))));
   });
   var SetAccessToken = function (a) {    return {ctor: "SetAccessToken",_0: a};};
   var SetError = function (a) {    return {ctor: "SetError",_0: a};};
   var AuthorizeUser = function (a) {    return {ctor: "AuthorizeUser",_0: a};};
   var getCodeFromUrl = function () {
      var errAction = SetError("code property is missing form URL.");
      var getAction = function (location) {
         var _p0 = $UrlParameterParser.parseSearchString(location.search);
         if (_p0.ctor === "UrlParams") {
               var _p1 = A2($Dict.get,"code",_p0._0);
               if (_p1.ctor === "Just") {
                     return AuthorizeUser(_p1._0);
                  } else {
                     return errAction;
                  }
            } else {
               return errAction;
            }
      };
      var actionTask = A2($Task.map,getAction,$WebAPI$Location.location);
      return $Effects.task(actionTask);
   }();
   var update = F3(function (context,action,model) {
      var _p2 = action;
      switch (_p2.ctor)
      {case "Activate": return {ctor: "_Tuple2",_0: model,_1: getCodeFromUrl};
         case "AuthorizeUser": var backendUrl = function (_p3) {
              return function (_) {
                 return _.backendUrl;
              }(function (_) {    return _.backendConfig;}(_p3));
           }(context);
           return {ctor: "_Tuple2",_0: model,_1: A2(getJson,backendUrl,_p2._0)};
         case "SetError": return {ctor: "_Tuple2",_0: _U.update(model,{status: $Pages$GithubAuth$Model.Error(_p2._0)}),_1: $Effects.none};
         case "SetAccessToken": return {ctor: "_Tuple2",_0: _U.update(model,{accessToken: _p2._0}),_1: $Effects.none};
         default: var _p4 = _p2._0;
           if (_p4.ctor === "Ok") {
                 return {ctor: "_Tuple2"
                        ,_0: _U.update(model,{status: $Pages$GithubAuth$Model.Fetched})
                        ,_1: $Effects.task($Task.succeed(SetAccessToken(_p4._0)))};
              } else {
                 return {ctor: "_Tuple2"
                        ,_0: _U.update(model,{status: $Pages$GithubAuth$Model.HttpError(_p4._0)})
                        ,_1: $Effects.task($Task.succeed(SetError("HTTP error")))};
              }}
   });
   var Activate = {ctor: "Activate"};
   var init = {ctor: "_Tuple2",_0: $Pages$GithubAuth$Model.initialModel,_1: $Effects.none};
   return _elm.Pages.GithubAuth.Update.values = {_op: _op
                                                ,init: init
                                                ,Activate: Activate
                                                ,AuthorizeUser: AuthorizeUser
                                                ,SetError: SetError
                                                ,SetAccessToken: SetAccessToken
                                                ,UpdateAccessTokenFromServer: UpdateAccessTokenFromServer
                                                ,UpdateContext: UpdateContext
                                                ,update: update
                                                ,getCodeFromUrl: getCodeFromUrl
                                                ,getJson: getJson
                                                ,dataToJson: dataToJson
                                                ,decodeAccessToken: decodeAccessToken};
};
Elm.BitList = Elm.BitList || {};
Elm.BitList.make = function (_elm) {
   "use strict";
   _elm.BitList = _elm.BitList || {};
   if (_elm.BitList.values) return _elm.BitList.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var partition = F2(function (size,list) {
      return _U.cmp($List.length(list),size) < 1 ? _U.list([list]) : A2($List._op["::"],A2($List.take,size,list),A2(partition,size,A2($List.drop,size,list)));
   });
   var toByteReverse = function (bitList) {
      var _p0 = bitList;
      if (_p0.ctor === "[]") {
            return 0;
         } else {
            if (_p0._0.ctor === "Off") {
                  return 2 * toByteReverse(_p0._1);
               } else {
                  return 1 + 2 * toByteReverse(_p0._1);
               }
         }
   };
   var toByte = function (bitList) {    return toByteReverse($List.reverse(bitList));};
   var Off = {ctor: "Off"};
   var On = {ctor: "On"};
   var fromNumber = function ($int) {
      return _U.eq($int,0) ? _U.list([]) : _U.eq(A2($Basics._op["%"],$int,2),1) ? A2($List.append,
      fromNumber($int / 2 | 0),
      _U.list([On])) : _U.eq(A2($Basics._op["%"],$int,2),0) ? A2($List.append,fromNumber($int / 2 | 0),_U.list([Off])) : _U.list([]);
   };
   var fromNumberWithSize = F2(function (number,size) {
      var bitList = fromNumber(number);
      var paddingSize = size - $List.length(bitList);
      return A2($List.append,A2($List.repeat,paddingSize,Off),bitList);
   });
   var fromByte = function ($byte) {    return A2(fromNumberWithSize,$byte,8);};
   return _elm.BitList.values = {_op: _op
                                ,On: On
                                ,Off: Off
                                ,fromNumber: fromNumber
                                ,fromNumberWithSize: fromNumberWithSize
                                ,fromByte: fromByte
                                ,toByte: toByte
                                ,toByteReverse: toByteReverse
                                ,partition: partition};
};
Elm.Ascii = Elm.Ascii || {};
Elm.Ascii.make = function (_elm) {
   "use strict";
   _elm.Ascii = _elm.Ascii || {};
   if (_elm.Ascii.values) return _elm.Ascii.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Array = Elm.Array.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Dict = Elm.Dict.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   var asciiCharsList = $String.toList(" !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
   var asciiCharsMap = function () {
      var addToDict = F2(function (_p0,dict) {    var _p1 = _p0;return A3($Dict.insert,_p1._0,_p1._1,dict);});
      var pairs = A3($List.map2,F2(function (v0,v1) {    return {ctor: "_Tuple2",_0: v0,_1: v1};}),asciiCharsList,_U.range(32,126));
      return A3($List.foldl,addToDict,$Dict.empty,pairs);
   }();
   var isValid = function (string) {
      var isAsciiChar = function ($char) {    return A2($Dict.member,$char,asciiCharsMap);};
      return A2($List.all,isAsciiChar,$String.toList(string));
   };
   var toInt = function ($char) {    return A2($Result.fromMaybe,"char is not a supported ascii character",A2($Dict.get,$char,asciiCharsMap));};
   var fromInt = function ($int) {
      var array = $Array.fromList(asciiCharsList);
      return A2($Result.fromMaybe,"integer has no corresponding ascii char",A2($Array.get,$int - 32,array));
   };
   return _elm.Ascii.values = {_op: _op,fromInt: fromInt,toInt: toInt,isValid: isValid};
};
Elm.Base64 = Elm.Base64 || {};
Elm.Base64.make = function (_elm) {
   "use strict";
   _elm.Base64 = _elm.Base64 || {};
   if (_elm.Base64.values) return _elm.Base64.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Array = Elm.Array.make(_elm),
   $Ascii = Elm.Ascii.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $BitList = Elm.BitList.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Dict = Elm.Dict.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   var resultUnfold = function (list) {
      var _p0 = list;
      if (_p0.ctor === "[]") {
            return _U.list([]);
         } else {
            if (_p0._0.ctor === "Ok") {
                  return A2($List._op["::"],_p0._0._0,resultUnfold(_p0._1));
               } else {
                  return _U.list([]);
               }
         }
   };
   var dropLast = F2(function (number,list) {    return $List.reverse(A2($List.drop,number,$List.reverse(list)));});
   var partitionBits = function (list) {
      var list$ = A3($List.foldr,$List.append,_U.list([]),A2($List.map,$BitList.fromByte,list));
      return A2($List.map,$BitList.toByte,A2($BitList.partition,6,list$));
   };
   var base64CharsList = $String.toList("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
   var base64Map = function () {
      var insert = F2(function (_p1,dict) {    var _p2 = _p1;return A3($Dict.insert,_p2._1,_p2._0,dict);});
      return A3($List.foldl,insert,$Dict.empty,A2($List.indexedMap,F2(function (v0,v1) {    return {ctor: "_Tuple2",_0: v0,_1: v1};}),base64CharsList));
   }();
   var isValid = function (string) {
      var string$ = A2($String.endsWith,"==",string) ? A2($String.dropRight,2,string) : A2($String.endsWith,"=",string) ? A2($String.dropRight,
      1,
      string) : string;
      var isBase64Char = function ($char) {    return A2($Dict.member,$char,base64Map);};
      return A2($String.all,isBase64Char,string$);
   };
   var toBase64BitList = function (string) {
      var endingEquals = A2($String.endsWith,"==",string) ? 2 : A2($String.endsWith,"=",string) ? 1 : 0;
      var stripped = $String.toList(A2($String.dropRight,endingEquals,string));
      var base64ToInt = function ($char) {    var _p3 = A2($Dict.get,$char,base64Map);if (_p3.ctor === "Just") {    return _p3._0;} else {    return -1;}};
      var numberList = A2($List.map,base64ToInt,stripped);
      return A2(dropLast,endingEquals * 2,A2($List.concatMap,A2($Basics.flip,$BitList.fromNumberWithSize,6),numberList));
   };
   var toCharList = function (bitList) {
      var array = $Array.fromList(base64CharsList);
      var toBase64Char = function (index) {    return A2($Maybe.withDefault,_U.chr("!"),A2($Array.get,index,array));};
      var toChars = function (_p4) {
         var _p5 = _p4;
         var _p6 = {ctor: "_Tuple3",_0: _p5._0,_1: _p5._1,_2: _p5._2};
         if (_p6._2 === -1) {
               if (_p6._1 === -1) {
                     return A2($List.append,A2(dropLast,2,A2($List.map,toBase64Char,partitionBits(_U.list([_p6._0,0,0])))),_U.list([_U.chr("="),_U.chr("=")]));
                  } else {
                     return A2($List.append,A2(dropLast,1,A2($List.map,toBase64Char,partitionBits(_U.list([_p6._0,_p6._1,0])))),_U.list([_U.chr("=")]));
                  }
            } else {
               return A2($List.map,toBase64Char,partitionBits(_U.list([_p6._0,_p6._1,_p6._2])));
            }
      };
      return A2($List.concatMap,toChars,bitList);
   };
   var toTupleList = function (list) {
      var _p7 = list;
      if (_p7.ctor === "::") {
            if (_p7._1.ctor === "::") {
                  if (_p7._1._1.ctor === "::") {
                        return A2($List._op["::"],{ctor: "_Tuple3",_0: _p7._0,_1: _p7._1._0,_2: _p7._1._1._0},toTupleList(_p7._1._1._1));
                     } else {
                        return _U.list([{ctor: "_Tuple3",_0: _p7._0,_1: _p7._1._0,_2: -1}]);
                     }
               } else {
                  return _U.list([{ctor: "_Tuple3",_0: _p7._0,_1: -1,_2: -1}]);
               }
         } else {
            return _U.list([]);
         }
   };
   var toAsciiList = function (string) {
      var toInt = function ($char) {    var _p8 = $Ascii.toInt($char);if (_p8.ctor === "Ok") {    return _p8._0;} else {    return -1;}};
      return A2($List.map,toInt,$String.toList(string));
   };
   var decode = function (s) {
      if ($Basics.not(isValid(s))) return $Result.Err("Error while decoding"); else {
            var bitList = A2($List.map,$BitList.toByte,A2($BitList.partition,8,toBase64BitList(s)));
            var charList = resultUnfold(A2($List.map,$Ascii.fromInt,bitList));
            return $Result.Ok($String.fromList(charList));
         }
   };
   var encode = function (s) {
      return $Basics.not($Ascii.isValid(s)) ? $Result.Err("Error while encoding") : $Result.Ok($String.fromList(toCharList(toTupleList(toAsciiList(s)))));
   };
   return _elm.Base64.values = {_op: _op,encode: encode,decode: decode};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.Login = Elm.Pages.Login || {};
Elm.Pages.Login.Update = Elm.Pages.Login.Update || {};
Elm.Pages.Login.Update.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.Login = _elm.Pages.Login || {};
   _elm.Pages.Login.Update = _elm.Pages.Login.Update || {};
   if (_elm.Pages.Login.Update.values) return _elm.Pages.Login.Update.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Base64 = Elm.Base64.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Http = Elm.Http.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$Login$Model = Elm.Pages.Login.Model.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Storage = Elm.Storage.make(_elm),
   $Task = Elm.Task.make(_elm),
   $Utils$Http = Elm.Utils.Http.make(_elm);
   var _op = {};
   var decodeAccessToken = A2($Json$Decode.at,_U.list(["access_token"]),$Json$Decode.string);
   var encodeCredentials = function (_p0) {
      var _p1 = _p0;
      var base64 = $Base64.encode(A2($Basics._op["++"],_p1._0,A2($Basics._op["++"],":",_p1._1)));
      var _p2 = base64;
      if (_p2.ctor === "Ok") {
            return _p2._0;
         } else {
            return "";
         }
   };
   var Context = function (a) {    return {backendConfig: a};};
   var SubmitForm = {ctor: "SubmitForm"};
   var SetUserMessage = function (a) {    return {ctor: "SetUserMessage",_0: a};};
   var SetAccessToken = function (a) {    return {ctor: "SetAccessToken",_0: a};};
   var UpdatePass = function (a) {    return {ctor: "UpdatePass",_0: a};};
   var UpdateName = function (a) {    return {ctor: "UpdateName",_0: a};};
   var UpdateAccessTokenFromStorage = function (a) {    return {ctor: "UpdateAccessTokenFromStorage",_0: a};};
   var getInputFromStorage = $Effects.task(A2($Task.map,UpdateAccessTokenFromStorage,$Task.toResult(A2($Storage.getItem,"access_token",$Json$Decode.string))));
   var UpdateAccessTokenFromServer = function (a) {    return {ctor: "UpdateAccessTokenFromServer",_0: a};};
   var getJson = F2(function (url,credentials) {
      return $Effects.task(A2($Task.map,
      UpdateAccessTokenFromServer,
      $Task.toResult(A2($Http.fromJson,
      decodeAccessToken,
      A2($Http.send,
      $Http.defaultSettings,
      {verb: "GET",headers: _U.list([{ctor: "_Tuple2",_0: "Authorization",_1: A2($Basics._op["++"],"Basic ",credentials)}]),url: url,body: $Http.empty})))));
   });
   var update = F3(function (context,action,model) {
      var _p3 = action;
      switch (_p3.ctor)
      {case "UpdateName": var loginForm = model.loginForm;
           var updatedLoginForm = _U.update(loginForm,{name: _p3._0});
           return {ctor: "_Tuple2",_0: _U.update(model,{loginForm: updatedLoginForm}),_1: $Effects.none};
         case "UpdatePass": var loginForm = model.loginForm;
           var updatedLoginForm = _U.update(loginForm,{pass: _p3._0});
           return {ctor: "_Tuple2",_0: _U.update(model,{loginForm: updatedLoginForm}),_1: $Effects.none};
         case "SubmitForm": var credentials = encodeCredentials({ctor: "_Tuple2",_0: model.loginForm.name,_1: model.loginForm.pass});
           var backendUrl = function (_p4) {    return function (_) {    return _.backendUrl;}(function (_) {    return _.backendConfig;}(_p4));}(context);
           var url = A2($Basics._op["++"],backendUrl,"/api/login-token");
           return _U.eq(model.status,$Pages$Login$Model.Fetching) || _U.eq(model.status,$Pages$Login$Model.Fetched) ? {ctor: "_Tuple2"
                                                                                                                      ,_0: model
                                                                                                                      ,_1: $Effects.none} : {ctor: "_Tuple2"
                                                                                                                                            ,_0: _U.update(model,
                                                                                                                                            {status: $Pages$Login$Model.Fetching})
                                                                                                                                            ,_1: $Effects.batch(_U.list([$Effects.task($Task.succeed(SetUserMessage($Pages$Login$Model.None)))
                                                                                                                                                                        ,A2(getJson,
                                                                                                                                                                        url,
                                                                                                                                                                        credentials)]))};
         case "SetAccessToken": return {ctor: "_Tuple2"
                                       ,_0: _U.update(model,{accessToken: _p3._0,loginForm: A2($Pages$Login$Model.LoginForm,model.loginForm.name,"")})
                                       ,_1: $Effects.none};
         case "SetUserMessage": return {ctor: "_Tuple2",_0: _U.update(model,{userMessage: _p3._0}),_1: $Effects.none};
         case "UpdateAccessTokenFromServer": var _p5 = _p3._0;
           if (_p5.ctor === "Ok") {
                 return {ctor: "_Tuple2",_0: _U.update(model,{status: $Pages$Login$Model.Fetched}),_1: $Effects.task($Task.succeed(SetAccessToken(_p5._0)))};
              } else {
                 var _p6 = _p5._0;
                 var message = $Utils$Http.getErrorMessageFromHttpResponse(_p6);
                 return {ctor: "_Tuple2"
                        ,_0: _U.update(model,{status: $Pages$Login$Model.HttpError(_p6)})
                        ,_1: $Effects.task($Task.succeed(SetUserMessage($Pages$Login$Model.Error(message))))};
              }
         default: var _p7 = _p3._0;
           if (_p7.ctor === "Ok") {
                 return {ctor: "_Tuple2",_0: model,_1: $Effects.task($Task.succeed(SetAccessToken(_p7._0)))};
              } else {
                 return {ctor: "_Tuple2",_0: _U.update(model,{hasAccessTokenInStorage: false}),_1: $Effects.none};
              }}
   });
   var init = {ctor: "_Tuple2",_0: $Pages$Login$Model.initialModel,_1: getInputFromStorage};
   return _elm.Pages.Login.Update.values = {_op: _op
                                           ,init: init
                                           ,UpdateAccessTokenFromServer: UpdateAccessTokenFromServer
                                           ,UpdateAccessTokenFromStorage: UpdateAccessTokenFromStorage
                                           ,UpdateName: UpdateName
                                           ,UpdatePass: UpdatePass
                                           ,SetAccessToken: SetAccessToken
                                           ,SetUserMessage: SetUserMessage
                                           ,SubmitForm: SubmitForm
                                           ,Context: Context
                                           ,update: update
                                           ,getInputFromStorage: getInputFromStorage
                                           ,encodeCredentials: encodeCredentials
                                           ,getJson: getJson
                                           ,decodeAccessToken: decodeAccessToken};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.User = Elm.Pages.User || {};
Elm.Pages.User.Decoder = Elm.Pages.User.Decoder || {};
Elm.Pages.User.Decoder.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.User = _elm.Pages.User || {};
   _elm.Pages.User.Decoder = _elm.Pages.User.Decoder || {};
   if (_elm.Pages.User.Decoder.values) return _elm.Pages.User.Decoder.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Company$Model = Elm.Company.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Json$Decode = Elm.Json.Decode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$User$Model = Elm.Pages.User.Model.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   var decode = function () {
      var number = $Json$Decode.oneOf(_U.list([$Json$Decode.$int,A2($Json$Decode.customDecoder,$Json$Decode.string,$String.toInt)]));
      var company = A3($Json$Decode.object2,$Company$Model.Model,A2($Json$Decode._op[":="],"id",number),A2($Json$Decode._op[":="],"label",$Json$Decode.string));
      return A2($Json$Decode.at,
      _U.list(["data","0"]),
      A4($Json$Decode.object3,
      F3(function (v0,v1,v2) {    return {ctor: "_Tuple3",_0: v0,_1: v1,_2: v2};}),
      A2($Json$Decode._op[":="],"id",number),
      A2($Json$Decode._op[":="],"label",$Json$Decode.string),
      A2($Json$Decode._op[":="],"companies",$Json$Decode.list(company))));
   }();
   return _elm.Pages.User.Decoder.values = {_op: _op,decode: decode};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.User = Elm.Pages.User || {};
Elm.Pages.User.Update = Elm.Pages.User.Update || {};
Elm.Pages.User.Update.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.User = _elm.Pages.User || {};
   _elm.Pages.User.Update = _elm.Pages.User.Update || {};
   if (_elm.Pages.User.Update.values) return _elm.Pages.User.Update.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Company$Model = Elm.Company.Model.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Http = Elm.Http.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$User$Decoder = Elm.Pages.User.Decoder.make(_elm),
   $Pages$User$Model = Elm.Pages.User.Model.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var init = {ctor: "_Tuple2",_0: $Pages$User$Model.initialModel,_1: $Effects.none};
   var UpdateDataFromServer = function (a) {    return {ctor: "UpdateDataFromServer",_0: a};};
   var getJson = F2(function (url,accessToken) {
      var encodedUrl = A2($Http.url,url,_U.list([{ctor: "_Tuple2",_0: "access_token",_1: accessToken}]));
      return $Effects.task(A2($Task.map,UpdateDataFromServer,$Task.toResult(A2($Http.get,$Pages$User$Decoder.decode,encodedUrl))));
   });
   var SetAccessToken = function (a) {    return {ctor: "SetAccessToken",_0: a};};
   var update = F3(function (context,action,model) {
      var _p0 = action;
      switch (_p0.ctor)
      {case "NoOp": return {ctor: "_Tuple2",_0: model,_1: $Effects.none};
         case "GetDataFromServer": var backendUrl = function (_p1) {
              return function (_) {
                 return _.backendUrl;
              }(function (_) {    return _.backendConfig;}(_p1));
           }(context);
           var url = A2($Basics._op["++"],backendUrl,"/api/v1.0/me");
           return _U.eq(model.status,$Pages$User$Model.Fetching) || _U.eq(model.status,$Pages$User$Model.Fetched) ? {ctor: "_Tuple2"
                                                                                                                    ,_0: model
                                                                                                                    ,_1: $Effects.none} : {ctor: "_Tuple2"
                                                                                                                                          ,_0: _U.update(model,
                                                                                                                                          {status: $Pages$User$Model.Fetching})
                                                                                                                                          ,_1: A2(getJson,
                                                                                                                                          url,
                                                                                                                                          context.accessToken)};
         case "UpdateDataFromServer": var model$ = _U.update(model,{status: $Pages$User$Model.Fetched});
           var _p2 = _p0._0;
           if (_p2.ctor === "Ok") {
                 return {ctor: "_Tuple2"
                        ,_0: _U.update(model$,{id: _p2._0._0,name: $Pages$User$Model.LoggedIn(_p2._0._1),companies: _p2._0._2})
                        ,_1: $Effects.none};
              } else {
                 var _p4 = _p2._0;
                 var effects = function () {
                    var _p3 = _p4;
                    if (_p3.ctor === "BadResponse") {
                          return _U.eq(_p3._0,401) ? $Effects.task($Task.succeed(SetAccessToken(""))) : $Effects.none;
                       } else {
                          return $Effects.none;
                       }
                 }();
                 return {ctor: "_Tuple2",_0: _U.update(model$,{status: $Pages$User$Model.HttpError(_p4)}),_1: effects};
              }
         default: return {ctor: "_Tuple2",_0: _U.update(model,{accessToken: _p0._0}),_1: $Effects.none};}
   });
   var NoOp = function (a) {    return {ctor: "NoOp",_0: a};};
   var GetDataFromServer = {ctor: "GetDataFromServer"};
   var UpdateContext = F2(function (a,b) {    return {accessToken: a,backendConfig: b};});
   return _elm.Pages.User.Update.values = {_op: _op
                                          ,UpdateContext: UpdateContext
                                          ,GetDataFromServer: GetDataFromServer
                                          ,NoOp: NoOp
                                          ,SetAccessToken: SetAccessToken
                                          ,UpdateDataFromServer: UpdateDataFromServer
                                          ,init: init
                                          ,update: update
                                          ,getJson: getJson};
};
Elm.App = Elm.App || {};
Elm.App.Update = Elm.App.Update || {};
Elm.App.Update.make = function (_elm) {
   "use strict";
   _elm.App = _elm.App || {};
   _elm.App.Update = _elm.App.Update || {};
   if (_elm.App.Update.values) return _elm.App.Update.values;
   var _U = Elm.Native.Utils.make(_elm),
   $App$Model = Elm.App.Model.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Company$Model = Elm.Company.Model.make(_elm),
   $Config$Update = Elm.Config.Update.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Event = Elm.Event.make(_elm),
   $Json$Encode = Elm.Json.Encode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$Article$Update = Elm.Pages.Article.Update.make(_elm),
   $Pages$GithubAuth$Update = Elm.Pages.GithubAuth.Update.make(_elm),
   $Pages$Login$Update = Elm.Pages.Login.Update.make(_elm),
   $Pages$User$Model = Elm.Pages.User.Model.make(_elm),
   $Pages$User$Update = Elm.Pages.User.Update.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Storage = Elm.Storage.make(_elm),
   $String = Elm.String.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var NoOpSetAccessToken = function (a) {    return {ctor: "NoOpSetAccessToken",_0: a};};
   var sendInputToStorage = function (val) {
      return $Effects.task(A2($Task.map,NoOpSetAccessToken,$Task.toResult(A2($Storage.setItem,"access_token",$Json$Encode.string(val)))));
   };
   var NoOpLogout = function (a) {    return {ctor: "NoOpLogout",_0: a};};
   var removeStorageItem = $Effects.task(A2($Task.map,NoOpLogout,$Task.toMaybe($Storage.removeItem("access_token"))));
   var NoOp = {ctor: "NoOp"};
   var UpdateCompanies = function (a) {    return {ctor: "UpdateCompanies",_0: a};};
   var SetConfigError = {ctor: "SetConfigError"};
   var SetActivePage = function (a) {    return {ctor: "SetActivePage",_0: a};};
   var SetAccessToken = function (a) {    return {ctor: "SetAccessToken",_0: a};};
   var Logout = {ctor: "Logout"};
   var ChildUserAction = function (a) {    return {ctor: "ChildUserAction",_0: a};};
   var ChildLoginAction = function (a) {    return {ctor: "ChildLoginAction",_0: a};};
   var ChildGithubAuthAction = function (a) {    return {ctor: "ChildGithubAuthAction",_0: a};};
   var ChildEventAction = function (a) {    return {ctor: "ChildEventAction",_0: a};};
   var ChildConfigAction = function (a) {    return {ctor: "ChildConfigAction",_0: a};};
   var ChildArticleAction = function (a) {    return {ctor: "ChildArticleAction",_0: a};};
   var initialEffects = _U.list([A2($Effects.map,ChildConfigAction,$Basics.snd($Config$Update.init))
                                ,A2($Effects.map,ChildLoginAction,$Basics.snd($Pages$Login$Update.init))]);
   var init = {ctor: "_Tuple2",_0: $App$Model.initialModel,_1: $Effects.batch(initialEffects)};
   var update = F2(function (action,model) {
      var _p0 = action;
      switch (_p0.ctor)
      {case "ChildArticleAction": var context = {accessToken: model.accessToken
                                                ,backendConfig: function (_p1) {
                                                   return function (_) {
                                                      return _.backendConfig;
                                                   }(function (_) {    return _.config;}(_p1));
                                                }(model)};
           var _p2 = A3($Pages$Article$Update.update,context,_p0._0,model.article);
           var childModel = _p2._0;
           var childEffects = _p2._1;
           return {ctor: "_Tuple2",_0: _U.update(model,{article: childModel}),_1: A2($Effects.map,ChildArticleAction,childEffects)};
         case "ChildConfigAction": var _p5 = _p0._0;
           var _p3 = A2($Config$Update.update,_p5,model.config);
           var childModel = _p3._0;
           var childEffects = _p3._1;
           var defaultEffects = _U.list([A2($Effects.map,ChildConfigAction,childEffects)]);
           var effects$ = function () {
              var _p4 = _p5;
              if (_p4.ctor === "SetError") {
                    return A2($List._op["::"],$Effects.task($Task.succeed(SetConfigError)),defaultEffects);
                 } else {
                    return defaultEffects;
                 }
           }();
           return {ctor: "_Tuple2",_0: _U.update(model,{config: childModel}),_1: $Effects.batch(effects$)};
         case "ChildEventAction": var context = {accessToken: model.accessToken
                                                ,backendConfig: function (_p6) {
                                                   return function (_) {
                                                      return _.backendConfig;
                                                   }(function (_) {    return _.config;}(_p6));
                                                }(model)
                                                ,companies: model.companies};
           var _p7 = A3($Event.update,context,_p0._0,model.events);
           var childModel = _p7._0;
           var childEffects = _p7._1;
           return {ctor: "_Tuple2",_0: _U.update(model,{events: childModel}),_1: A2($Effects.map,ChildEventAction,childEffects)};
         case "ChildGithubAuthAction": var _p11 = _p0._0;
           var context = {backendConfig: function (_p8) {
              return function (_) {
                 return _.backendConfig;
              }(function (_) {    return _.config;}(_p8));
           }(model)};
           var _p9 = A3($Pages$GithubAuth$Update.update,context,_p11,model.githubAuth);
           var childModel = _p9._0;
           var childEffects = _p9._1;
           var defaultEffect = A2($Effects.map,ChildGithubAuthAction,childEffects);
           var defaultEffects = _U.list([defaultEffect]);
           var effects$ = function () {
              var _p10 = _p11;
              if (_p10.ctor === "SetAccessToken") {
                    return A2($List._op["::"],$Effects.task($Task.succeed(SetAccessToken(_p10._0))),defaultEffects);
                 } else {
                    return defaultEffects;
                 }
           }();
           return {ctor: "_Tuple2",_0: _U.update(model,{githubAuth: childModel}),_1: $Effects.batch(effects$)};
         case "ChildLoginAction": var _p15 = _p0._0;
           var context = {backendConfig: function (_p12) {
              return function (_) {
                 return _.backendConfig;
              }(function (_) {    return _.config;}(_p12));
           }(model)};
           var _p13 = A3($Pages$Login$Update.update,context,_p15,model.login);
           var childModel = _p13._0;
           var childEffects = _p13._1;
           var defaultEffect = A2($Effects.map,ChildLoginAction,childEffects);
           var defaultEffects = _U.list([defaultEffect]);
           var effects$ = function () {
              var _p14 = _p15;
              if (_p14.ctor === "SetAccessToken") {
                    return A2($List._op["::"],
                    $Effects.task($Task.succeed(SetAccessToken(_p14._0))),
                    A2($List._op["::"],$Effects.task($Task.succeed(ChildUserAction($Pages$User$Update.GetDataFromServer))),defaultEffects));
                 } else {
                    return defaultEffects;
                 }
           }();
           return {ctor: "_Tuple2",_0: _U.update(model,{login: childModel}),_1: $Effects.batch(effects$)};
         case "ChildUserAction": var _p22 = _p0._0;
           var context = {accessToken: model.accessToken
                         ,backendConfig: function (_p16) {
                            return function (_) {
                               return _.backendConfig;
                            }(function (_) {    return _.config;}(_p16));
                         }(model)};
           var _p17 = A3($Pages$User$Update.update,context,_p22,model.user);
           var childModel = _p17._0;
           var childEffects = _p17._1;
           var defaultEffect = A2($Effects.map,ChildUserAction,childEffects);
           var defaultEffects = _U.list([defaultEffect]);
           var model$ = _U.update(model,{user: childModel});
           var _p18 = function () {
              var _p19 = _p22;
              switch (_p19.ctor)
              {case "SetAccessToken": return {ctor: "_Tuple2"
                                             ,_0: model$
                                             ,_1: A2($List._op["::"],$Effects.task($Task.succeed(SetAccessToken(_p19._0))),defaultEffects)};
                 case "UpdateDataFromServer": var _p20 = _p19._0;
                   if (_p20.ctor === "Ok") {
                         var nextPage = function () {
                            var _p21 = model.nextPage;
                            if (_p21.ctor === "Just") {
                                  return _p21._0;
                               } else {
                                  return $App$Model.Event($Maybe.Nothing);
                               }
                         }();
                         return {ctor: "_Tuple2"
                                ,_0: _U.update(model$,{nextPage: $Maybe.Nothing})
                                ,_1: A2($List._op["::"],
                                $Effects.task($Task.succeed(UpdateCompanies(_p20._0._2))),
                                A2($List._op["::"],$Effects.task($Task.succeed(SetActivePage(nextPage))),defaultEffects))};
                      } else {
                         return {ctor: "_Tuple2",_0: model$,_1: defaultEffects};
                      }
                 default: return {ctor: "_Tuple2",_0: model$,_1: defaultEffects};}
           }();
           var model$$ = _p18._0;
           var effects$ = _p18._1;
           return {ctor: "_Tuple2",_0: model$$,_1: $Effects.batch(effects$)};
         case "Logout": return {ctor: "_Tuple2",_0: $App$Model.initialModel,_1: $Effects.batch(A2($List._op["::"],removeStorageItem,initialEffects))};
         case "SetAccessToken": var _p23 = _p0._0;
           var defaultEffects = _U.list([sendInputToStorage(_p23)]);
           var effects$ = $String.isEmpty(_p23) ? A2($List._op["::"],$Effects.task($Task.succeed(Logout)),defaultEffects) : A2($List._op["::"],
           $Effects.task($Task.succeed(ChildUserAction($Pages$User$Update.GetDataFromServer))),
           defaultEffects);
           return {ctor: "_Tuple2",_0: _U.update(model,{accessToken: _p23}),_1: $Effects.batch(effects$)};
         case "SetActivePage": var _p28 = _p0._0;
           var currentPageEffects = function () {
              var _p24 = model.activePage;
              if (_p24.ctor === "Event") {
                    return $Effects.task($Task.succeed(ChildEventAction($Event.Deactivate)));
                 } else {
                    return $Effects.none;
                 }
           }();
           var _p25 = function () {
              if (_U.eq(model.user.name,$Pages$User$Model.Anonymous)) {
                    var _p26 = _p28;
                    switch (_p26.ctor)
                    {case "GithubAuth": return {ctor: "_Tuple2",_0: $App$Model.GithubAuth,_1: model.nextPage};
                       case "Login": return {ctor: "_Tuple2",_0: $App$Model.Login,_1: model.nextPage};
                       case "PageNotFound": return {ctor: "_Tuple2",_0: _p28,_1: $Maybe.Just(_p28)};
                       default: return {ctor: "_Tuple2",_0: $App$Model.Login,_1: $Maybe.Just(_p28)};}
                 } else return {ctor: "_Tuple2",_0: _p28,_1: $Maybe.Nothing};
           }();
           var page$ = _p25._0;
           var nextPage = _p25._1;
           var newPageEffects = function () {
              var _p27 = page$;
              switch (_p27.ctor)
              {case "Article": return $Effects.task($Task.succeed(ChildArticleAction($Pages$Article$Update.Activate)));
                 case "Event": return $Effects.task($Task.succeed(ChildEventAction($Event.Activate(_p27._0))));
                 case "GithubAuth": return $Effects.task($Task.succeed(ChildGithubAuthAction($Pages$GithubAuth$Update.Activate)));
                 default: return $Effects.none;}
           }();
           return _U.eq(model.activePage,page$) ? {ctor: "_Tuple2",_0: _U.update(model,{nextPage: nextPage}),_1: $Effects.none} : {ctor: "_Tuple2"
                                                                                                                                  ,_0: _U.update(model,
                                                                                                                                  {activePage: page$
                                                                                                                                  ,nextPage: nextPage})
                                                                                                                                  ,_1: $Effects.batch(_U.list([currentPageEffects
                                                                                                                                                              ,newPageEffects]))};
         case "SetConfigError": return {ctor: "_Tuple2",_0: _U.update(model,{configError: true}),_1: $Effects.none};
         case "UpdateCompanies": return {ctor: "_Tuple2",_0: _U.update(model,{companies: _p0._0}),_1: $Effects.none};
         default: return {ctor: "_Tuple2",_0: model,_1: $Effects.none};}
   });
   return _elm.App.Update.values = {_op: _op
                                   ,initialEffects: initialEffects
                                   ,init: init
                                   ,ChildArticleAction: ChildArticleAction
                                   ,ChildConfigAction: ChildConfigAction
                                   ,ChildEventAction: ChildEventAction
                                   ,ChildGithubAuthAction: ChildGithubAuthAction
                                   ,ChildLoginAction: ChildLoginAction
                                   ,ChildUserAction: ChildUserAction
                                   ,Logout: Logout
                                   ,SetAccessToken: SetAccessToken
                                   ,SetActivePage: SetActivePage
                                   ,SetConfigError: SetConfigError
                                   ,UpdateCompanies: UpdateCompanies
                                   ,NoOp: NoOp
                                   ,NoOpLogout: NoOpLogout
                                   ,NoOpSetAccessToken: NoOpSetAccessToken
                                   ,update: update
                                   ,sendInputToStorage: sendInputToStorage
                                   ,removeStorageItem: removeStorageItem};
};
Elm.App = Elm.App || {};
Elm.App.Router = Elm.App.Router || {};
Elm.App.Router.make = function (_elm) {
   "use strict";
   _elm.App = _elm.App || {};
   _elm.App.Router = _elm.App.Router || {};
   if (_elm.App.Router.values) return _elm.App.Router.values;
   var _U = Elm.Native.Utils.make(_elm),
   $App$Model = Elm.App.Model.make(_elm),
   $App$Update = Elm.App.Update.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Event = Elm.Event.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $RouteHash = Elm.RouteHash.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var location2action = function (list) {
      var _p0 = list;
      _v0_6: do {
         if (_p0.ctor === "::") {
               switch (_p0._0)
               {case "auth": if (_p0._1.ctor === "::" && _p0._1._0 === "github" && _p0._1._1.ctor === "[]") {
                          return A2($List._op["::"],$App$Update.SetActivePage($App$Model.GithubAuth),_U.list([]));
                       } else {
                          break _v0_6;
                       }
                  case "articles": return A2($List._op["::"],$App$Update.SetActivePage($App$Model.Article),_U.list([]));
                  case "login": return A2($List._op["::"],$App$Update.SetActivePage($App$Model.Login),_U.list([]));
                  case "my-account": return A2($List._op["::"],$App$Update.SetActivePage($App$Model.User),_U.list([]));
                  case "events": return A2($List._op["::"],$App$Update.SetActivePage($App$Model.Event($Event.location2company(_p0._1))),_U.list([]));
                  case "": return A2($List._op["::"],$App$Update.SetActivePage($App$Model.Event($Maybe.Nothing)),_U.list([]));
                  default: break _v0_6;}
            } else {
               break _v0_6;
            }
      } while (false);
      return A2($List._op["::"],$App$Update.SetActivePage($App$Model.PageNotFound),_U.list([]));
   };
   var delta2update = F2(function (previous,current) {
      var _p1 = current.activePage;
      switch (_p1.ctor)
      {case "Article": return $Maybe.Just($RouteHash.set(_U.list(["articles"])));
         case "Event": return A2($RouteHash.map,
           F2(function (x,y) {    return A2($List._op["::"],x,y);})("events"),
           A2($Event.delta2update,previous.events,current.events));
         case "GithubAuth": return A2($RouteHash.map,function (_p2) {    return _U.list(["auth","github"]);},$Maybe.Nothing);
         case "Login": return current.login.hasAccessTokenInStorage ? $Maybe.Nothing : $Maybe.Just($RouteHash.set(_U.list(["login"])));
         case "PageNotFound": return $Maybe.Nothing;
         default: return $Maybe.Just($RouteHash.set(_U.list(["my-account"])));}
   });
   return _elm.App.Router.values = {_op: _op,delta2update: delta2update,location2action: location2action};
};
Elm.Config = Elm.Config || {};
Elm.Config.View = Elm.Config.View || {};
Elm.Config.View.make = function (_elm) {
   "use strict";
   _elm.Config = _elm.Config || {};
   _elm.Config.View = _elm.Config.View || {};
   if (_elm.Config.View.values) return _elm.Config.View.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var view = A2($Html.div,
   _U.list([$Html$Attributes.$class("config-error")]),
   _U.list([A2($Html.h2,_U.list([]),_U.list([$Html.text("Configuration error")]))
           ,A2($Html.div,_U.list([]),_U.list([$Html.text("Check your Config.elm file and make sure you have defined the enviorement properly")]))]));
   return _elm.Config.View.values = {_op: _op,view: view};
};
Elm.ArticleForm = Elm.ArticleForm || {};
Elm.ArticleForm.View = Elm.ArticleForm.View || {};
Elm.ArticleForm.View.make = function (_elm) {
   "use strict";
   _elm.ArticleForm = _elm.ArticleForm || {};
   _elm.ArticleForm.View = _elm.ArticleForm.View || {};
   if (_elm.ArticleForm.View.values) return _elm.ArticleForm.View.values;
   var _U = Elm.Native.Utils.make(_elm),
   $ArticleForm$Model = Elm.ArticleForm.Model.make(_elm),
   $ArticleForm$Update = Elm.ArticleForm.Update.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $Html$Events = Elm.Html.Events.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   var viewForm = F2(function (address,model) {
      return A2($Html.form,
      _U.list([A2($Html$Events.onSubmit,address,$ArticleForm$Update.SubmitForm),$Html$Attributes.action("javascript:void(0);")]),
      _U.list([A2($Html.h3,
              _U.list([$Html$Attributes.$class("title")]),
              _U.list([A2($Html.i,_U.list([$Html$Attributes.$class("fa fa-pencil")]),_U.list([])),$Html.text(" Add new article")]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.$class("input-group")]),
              _U.list([A2($Html.label,_U.list([]),_U.list([$Html.text("Label")]))
                      ,A2($Html.input,
                      _U.list([$Html$Attributes.type$("text")
                              ,$Html$Attributes.$class("form-control")
                              ,$Html$Attributes.value(model.articleForm.label)
                              ,A3($Html$Events.on,
                              "input",
                              $Html$Events.targetValue,
                              function (_p0) {
                                 return A2($Signal.message,address,$ArticleForm$Update.UpdateLabel(_p0));
                              })
                              ,$Html$Attributes.required(true)]),
                      _U.list([]))]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.$class("input-group")]),
              _U.list([A2($Html.label,_U.list([]),_U.list([$Html.text("Body")]))
                      ,A2($Html.textarea,
                      _U.list([$Html$Attributes.$class("form-control")
                              ,$Html$Attributes.name("body")
                              ,$Html$Attributes.placeholder("Body")
                              ,$Html$Attributes.value(model.articleForm.body)
                              ,A3($Html$Events.on,
                              "input",
                              $Html$Events.targetValue,
                              function (_p1) {
                                 return A2($Signal.message,address,$ArticleForm$Update.UpdateBody(_p1));
                              })]),
                      _U.list([]))]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.$class("input-group ")]),
              _U.list([A2($Html.label,_U.list([]),_U.list([$Html.text("Upload File")]))
                      ,A2($Html.div,_U.list([$Html$Attributes.$class("dropzone")]),_U.list([]))]))
              ,A2($Html.button,
              _U.list([A2($Html$Events.onClick,address,$ArticleForm$Update.SubmitForm)
                      ,$Html$Attributes.$class("btn btn-lg btn-primary")
                      ,$Html$Attributes.disabled($String.isEmpty(model.articleForm.label))]),
              _U.list([$Html.text("Submit")]))]));
   });
   var viewUserMessage = function (userMessage) {
      var _p2 = userMessage;
      if (_p2.ctor === "None") {
            return A2($Html.div,_U.list([]),_U.list([]));
         } else {
            return A2($Html.div,_U.list([$Html$Attributes.style(_U.list([{ctor: "_Tuple2",_0: "text-align",_1: "center"}]))]),_U.list([$Html.text(_p2._0)]));
         }
   };
   var view = F2(function (address,model) {
      return A2($Html.div,_U.list([$Html$Attributes.$class("wrapper -suffix")]),_U.list([viewUserMessage(model.userMessage),A2(viewForm,address,model)]));
   });
   return _elm.ArticleForm.View.values = {_op: _op,view: view,viewUserMessage: viewUserMessage,viewForm: viewForm};
};
Elm.ArticleList = Elm.ArticleList || {};
Elm.ArticleList.View = Elm.ArticleList.View || {};
Elm.ArticleList.View.make = function (_elm) {
   "use strict";
   _elm.ArticleList = _elm.ArticleList || {};
   _elm.ArticleList.View = _elm.ArticleList.View || {};
   if (_elm.ArticleList.View.values) return _elm.ArticleList.View.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Article$Model = Elm.Article.Model.make(_elm),
   $ArticleList$Model = Elm.ArticleList.Model.make(_elm),
   $ArticleList$Update = Elm.ArticleList.Update.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $Json$Encode = Elm.Json.Encode.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var viewArticles = function (article) {
      var image = function () {
         var _p0 = article.image;
         if (_p0.ctor === "Just") {
               return A2($Html.img,_U.list([$Html$Attributes.src(_p0._0)]),_U.list([]));
            } else {
               return A2($Html.div,_U.list([]),_U.list([]));
            }
      }();
      return A2($Html.li,
      _U.list([]),
      _U.list([A2($Html.div,_U.list([$Html$Attributes.$class("title")]),_U.list([$Html.text(article.label)]))
              ,A2($Html.div,_U.list([A2($Html$Attributes.property,"innerHTML",$Json$Encode.string(article.body))]),_U.list([]))
              ,image]));
   };
   var viewRecentArticles = function (articles) {
      return A2($Html.div,
      _U.list([$Html$Attributes.$class("wrapper -suffix")]),
      _U.list([A2($Html.h3,
              _U.list([$Html$Attributes.$class("title")]),
              _U.list([A2($Html.i,_U.list([$Html$Attributes.$class("fa fa-file-o icon")]),_U.list([])),$Html.text("Recent articles")]))
              ,A2($Html.ul,_U.list([$Html$Attributes.$class("articles")]),A2($List.map,viewArticles,articles))]));
   };
   var view = F2(function (address,model) {    return viewRecentArticles(model.articles);});
   return _elm.ArticleList.View.values = {_op: _op,view: view,viewRecentArticles: viewRecentArticles,viewArticles: viewArticles};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.Article = Elm.Pages.Article || {};
Elm.Pages.Article.View = Elm.Pages.Article.View || {};
Elm.Pages.Article.View.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.Article = _elm.Pages.Article || {};
   _elm.Pages.Article.View = _elm.Pages.Article.View || {};
   if (_elm.Pages.Article.View.values) return _elm.Pages.Article.View.values;
   var _U = Elm.Native.Utils.make(_elm),
   $ArticleForm$View = Elm.ArticleForm.View.make(_elm),
   $ArticleList$View = Elm.ArticleList.View.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$Article$Model = Elm.Pages.Article.Model.make(_elm),
   $Pages$Article$Update = Elm.Pages.Article.Update.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var view = F2(function (address,model) {
      var childArticleListAddress = A2($Signal.forwardTo,address,$Pages$Article$Update.ChildArticleListAction);
      var childArticleFormAddress = A2($Signal.forwardTo,address,$Pages$Article$Update.ChildArticleFormAction);
      return A2($Html.div,
      _U.list([$Html$Attributes.id("article-page"),$Html$Attributes.$class("container")]),
      _U.list([A2($ArticleForm$View.view,childArticleFormAddress,model.articleForm),A2($ArticleList$View.view,childArticleListAddress,model.articleList)]));
   });
   return _elm.Pages.Article.View.values = {_op: _op,view: view};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.GithubAuth = Elm.Pages.GithubAuth || {};
Elm.Pages.GithubAuth.View = Elm.Pages.GithubAuth.View || {};
Elm.Pages.GithubAuth.View.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.GithubAuth = _elm.Pages.GithubAuth || {};
   _elm.Pages.GithubAuth.View = _elm.Pages.GithubAuth.View || {};
   if (_elm.Pages.GithubAuth.View.values) return _elm.Pages.GithubAuth.View.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$GithubAuth$Model = Elm.Pages.GithubAuth.Model.make(_elm),
   $Pages$GithubAuth$Update = Elm.Pages.GithubAuth.Update.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var view = F2(function (address,model) {
      var spinner = A2($Html.i,_U.list([$Html$Attributes.$class("fa fa-spinner fa-spin")]),_U.list([]));
      var content = function () {
         var _p0 = model.status;
         if (_p0.ctor === "Error") {
               return A2($Html.div,
               _U.list([]),
               _U.list([$Html.text(A2($Basics._op["++"],"Error:",_p0._0))
                       ,A2($Html.a,_U.list([$Html$Attributes.href("#!/login")]),_U.list([$Html.text("Back to Login")]))]));
            } else {
               return spinner;
            }
      }();
      return A2($Html.div,
      _U.list([$Html$Attributes.id("github-auth-page")]),
      _U.list([A2($Html.div,_U.list([$Html$Attributes.$class("container")]),_U.list([content]))]));
   });
   return _elm.Pages.GithubAuth.View.values = {_op: _op,view: view};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.Login = Elm.Pages.Login || {};
Elm.Pages.Login.View = Elm.Pages.Login.View || {};
Elm.Pages.Login.View.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.Login = _elm.Pages.Login || {};
   _elm.Pages.Login.View = _elm.Pages.Login.View || {};
   if (_elm.Pages.Login.View.values) return _elm.Pages.Login.View.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Config$Model = Elm.Config.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $Html$Events = Elm.Html.Events.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$Login$Model = Elm.Pages.Login.Model.make(_elm),
   $Pages$Login$Update = Elm.Pages.Login.Update.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $String = Elm.String.make(_elm);
   var _op = {};
   var view = F3(function (context,address,model) {
      var userMessage = function () {
         var _p0 = model.userMessage;
         if (_p0.ctor === "None") {
               return A2($Html.div,_U.list([]),_U.list([]));
            } else {
               return A2($Html.div,_U.list([$Html$Attributes.style(_U.list([{ctor: "_Tuple2",_0: "text-align",_1: "center"}]))]),_U.list([$Html.text(_p0._0)]));
            }
      }();
      var spinner = A2($Html.i,_U.list([$Html$Attributes.$class("fa fa-spinner fa-spin")]),_U.list([]));
      var githubClientId = function (_p1) {    return function (_) {    return _.githubClientId;}(function (_) {    return _.backendConfig;}(_p1));}(context);
      var githubUrl = A2($Basics._op["++"],"https://github.com/login/oauth/authorize?client_id=",A2($Basics._op["++"],githubClientId,"&scope=user:email"));
      var githubLogin = A2($Html.div,
      _U.list([$Html$Attributes.$class("btn btn-lg btn-primary btn-block")]),
      _U.list([A2($Html.a,
      _U.list([$Html$Attributes.href(githubUrl)]),
      _U.list([A2($Html.i,
              _U.list([$Html$Attributes.$class("fa fa-github"),$Html$Attributes.style(_U.list([{ctor: "_Tuple2",_0: "margin-right",_1: "10px"}]))]),
              _U.list([]))
              ,A2($Html.span,_U.list([]),_U.list([$Html.text("Login with GitHub")]))]))]));
      var isFetchStatus = _U.eq(model.status,$Pages$Login$Model.Fetching) || _U.eq(model.status,$Pages$Login$Model.Fetched);
      var modelForm = model.loginForm;
      var isFormEmpty = $String.isEmpty(modelForm.name) || $String.isEmpty(modelForm.pass);
      var loginForm = A2($Html.form,
      _U.list([A2($Html$Events.onSubmit,address,$Pages$Login$Update.SubmitForm)
              ,$Html$Attributes.action("javascript:void(0);")
              ,$Html$Attributes.$class("form-signin")
              ,$Html$Attributes.hidden(model.hasAccessTokenInStorage)]),
      _U.list([A2($Html.h2,_U.list([]),_U.list([$Html.text("Please login")]))
              ,githubLogin
              ,A2($Html.div,
              _U.list([$Html$Attributes.style(_U.list([{ctor: "_Tuple2",_0: "margin-bottom",_1: "20px"}
                                                      ,{ctor: "_Tuple2",_0: "margin-top",_1: "20px"}
                                                      ,{ctor: "_Tuple2",_0: "text-align",_1: "center"}]))]),
              _U.list([$Html.text("OR")]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.$class("input-group")]),
              _U.list([A2($Html.span,
                      _U.list([$Html$Attributes.$class("input-group-addon")]),
                      _U.list([A2($Html.i,_U.list([$Html$Attributes.$class("glyphicon glyphicon-user")]),_U.list([]))]))
                      ,A2($Html.input,
                      _U.list([$Html$Attributes.type$("text")
                              ,$Html$Attributes.$class("form-control")
                              ,$Html$Attributes.placeholder("Name")
                              ,$Html$Attributes.value(model.loginForm.name)
                              ,A3($Html$Events.on,
                              "input",
                              $Html$Events.targetValue,
                              function (_p2) {
                                 return A2($Signal.message,address,$Pages$Login$Update.UpdateName(_p2));
                              })
                              ,$Html$Attributes.size(40)
                              ,$Html$Attributes.required(true)
                              ,$Html$Attributes.disabled(isFetchStatus)]),
                      _U.list([]))]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.$class("input-group")]),
              _U.list([A2($Html.span,
                      _U.list([$Html$Attributes.$class("input-group-addon")]),
                      _U.list([A2($Html.i,_U.list([$Html$Attributes.$class("fa fa-lock fa-lg")]),_U.list([]))]))
                      ,A2($Html.input,
                      _U.list([$Html$Attributes.type$("password")
                              ,$Html$Attributes.$class("form-control")
                              ,$Html$Attributes.placeholder("Password")
                              ,$Html$Attributes.value(modelForm.pass)
                              ,A3($Html$Events.on,
                              "input",
                              $Html$Events.targetValue,
                              function (_p3) {
                                 return A2($Signal.message,address,$Pages$Login$Update.UpdatePass(_p3));
                              })
                              ,$Html$Attributes.size(40)
                              ,$Html$Attributes.required(true)
                              ,$Html$Attributes.disabled(isFetchStatus)]),
                      _U.list([]))]))
              ,A2($Html.button,
              _U.list([A2($Html$Events.onClick,address,$Pages$Login$Update.SubmitForm)
                      ,$Html$Attributes.$class("btn btn-lg btn-primary btn-block")
                      ,$Html$Attributes.disabled(isFetchStatus || isFormEmpty)]),
              _U.list([A2($Html.span,_U.list([$Html$Attributes.hidden($Basics.not(isFetchStatus))]),_U.list([spinner]))
                      ,A2($Html.span,_U.list([$Html$Attributes.hidden(isFetchStatus)]),_U.list([$Html.text("Login")]))]))]));
      return A2($Html.div,
      _U.list([$Html$Attributes.id("login-page")]),
      _U.list([A2($Html.hr,_U.list([]),_U.list([]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.$class("container")]),
              _U.list([userMessage
                      ,A2($Html.div,
                      _U.list([$Html$Attributes.$class("wrapper")]),
                      _U.list([loginForm
                              ,A2($Html.div,
                              _U.list([$Html$Attributes.$class("text-center")
                                      ,$Html$Attributes.hidden($Basics.not(_U.eq(model.status,
                                      $Pages$Login$Model.Fetching)) && $Basics.not(model.hasAccessTokenInStorage))]),
                              _U.list([$Html.text("Loading ...")]))]))]))
              ,A2($Html.hr,_U.list([]),_U.list([]))]));
   });
   var ViewContext = function (a) {    return {backendConfig: a};};
   return _elm.Pages.Login.View.values = {_op: _op,ViewContext: ViewContext,view: view};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.PageNotFound = Elm.Pages.PageNotFound || {};
Elm.Pages.PageNotFound.View = Elm.Pages.PageNotFound.View || {};
Elm.Pages.PageNotFound.View.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.PageNotFound = _elm.Pages.PageNotFound || {};
   _elm.Pages.PageNotFound.View = _elm.Pages.PageNotFound.View || {};
   if (_elm.Pages.PageNotFound.View.values) return _elm.Pages.PageNotFound.View.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var view = A2($Html.div,
   _U.list([$Html$Attributes.id("page-not-found"),$Html$Attributes.$class("container")]),
   _U.list([A2($Html.div,
   _U.list([$Html$Attributes.$class("wrapper text-center")]),
   _U.list([A2($Html.div,
   _U.list([$Html$Attributes.$class("box")]),
   _U.list([A2($Html.h2,_U.list([]),_U.list([$Html.text("This is a 404 page!")]))
           ,A2($Html.a,_U.list([$Html$Attributes.href("#!/")]),_U.list([$Html.text("Back to safety")]))]))]))]));
   return _elm.Pages.PageNotFound.View.values = {_op: _op,view: view};
};
Elm.Pages = Elm.Pages || {};
Elm.Pages.User = Elm.Pages.User || {};
Elm.Pages.User.View = Elm.Pages.User.View || {};
Elm.Pages.User.View.make = function (_elm) {
   "use strict";
   _elm.Pages = _elm.Pages || {};
   _elm.Pages.User = _elm.Pages.User || {};
   _elm.Pages.User.View = _elm.Pages.User.View || {};
   if (_elm.Pages.User.View.values) return _elm.Pages.User.View.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Company$Model = Elm.Company.Model.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$User$Model = Elm.Pages.User.Model.make(_elm),
   $Pages$User$Update = Elm.Pages.User.Update.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var viewCompanies = function (company) {    return A2($Html.li,_U.list([]),_U.list([$Html.text(company.label)]));};
   var view = F2(function (address,model) {
      var _p0 = model.name;
      if (_p0.ctor === "Anonymous") {
            return A2($Html.div,_U.list([]),_U.list([$Html.text("This is wrong - anon user cannot reach this!")]));
         } else {
            var mainTitle = A2($Html.h3,
            _U.list([$Html$Attributes.$class("title")]),
            _U.list([A2($Html.i,_U.list([$Html$Attributes.$class("glyphicon glyphicon-user")]),_U.list([])),$Html.text(" My account")]));
            return A2($Html.div,
            _U.list([$Html$Attributes.id("my-account"),$Html$Attributes.$class("container")]),
            _U.list([A2($Html.div,
            _U.list([$Html$Attributes.$class("wrapper -suffix")]),
            _U.list([mainTitle
                    ,A2($Html.h4,_U.list([$Html$Attributes.$class("name")]),_U.list([$Html.text(A2($Basics._op["++"],"Welcome ",_p0._0))]))
                    ,A2($Html.h4,_U.list([$Html$Attributes.$class("company-title")]),_U.list([$Html.text("Your companies are:")]))
                    ,A2($Html.ul,_U.list([$Html$Attributes.$class("companies")]),A2($List.map,viewCompanies,model.companies))]))]));
         }
   });
   return _elm.Pages.User.View.values = {_op: _op,view: view,viewCompanies: viewCompanies};
};
Elm.App = Elm.App || {};
Elm.App.View = Elm.App.View || {};
Elm.App.View.make = function (_elm) {
   "use strict";
   _elm.App = _elm.App || {};
   _elm.App.View = _elm.App.View || {};
   if (_elm.App.View.values) return _elm.App.View.values;
   var _U = Elm.Native.Utils.make(_elm),
   $App$Model = Elm.App.Model.make(_elm),
   $App$Update = Elm.App.Update.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Config$View = Elm.Config.View.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Event = Elm.Event.make(_elm),
   $Html = Elm.Html.make(_elm),
   $Html$Attributes = Elm.Html.Attributes.make(_elm),
   $Html$Events = Elm.Html.Events.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$Article$View = Elm.Pages.Article.View.make(_elm),
   $Pages$GithubAuth$View = Elm.Pages.GithubAuth.View.make(_elm),
   $Pages$Login$View = Elm.Pages.Login.View.make(_elm),
   $Pages$PageNotFound$View = Elm.Pages.PageNotFound.View.make(_elm),
   $Pages$User$Model = Elm.Pages.User.Model.make(_elm),
   $Pages$User$View = Elm.Pages.User.View.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm);
   var _op = {};
   var myStyle = _U.list([{ctor: "_Tuple2",_0: "font-size",_1: "1.2em"}]);
   var footer = A2($Html.div,
   _U.list([$Html$Attributes.$class("main-footer")]),
   _U.list([A2($Html.div,
   _U.list([$Html$Attributes.$class("container")]),
   _U.list([A2($Html.span,
   _U.list([]),
   _U.list([$Html.text("With ")
           ,A2($Html.i,_U.list([$Html$Attributes.$class("fa fa-heart")]),_U.list([]))
           ,$Html.text(" from ")
           ,A2($Html.a,
           _U.list([$Html$Attributes.href("http://gizra.com"),$Html$Attributes.target("_blank"),$Html$Attributes.$class("gizra-logo")]),
           _U.list([$Html.text("gizra")]))
           ,A2($Html.span,_U.list([$Html$Attributes.$class("divider")]),_U.list([$Html.text("|")]))
           ,$Html.text("Fork me on ")
           ,A2($Html.a,
           _U.list([$Html$Attributes.href("https://github.com/Gizra/elm-hedley"),$Html$Attributes.target("_blank")]),
           _U.list([$Html.text("Github")]))]))]))]));
   var mainContent = F2(function (address,model) {
      var _p0 = model.activePage;
      switch (_p0.ctor)
      {case "Article": var childAddress = A2($Signal.forwardTo,address,$App$Update.ChildArticleAction);
           return A2($Html.div,_U.list([$Html$Attributes.style(myStyle)]),_U.list([A2($Pages$Article$View.view,childAddress,model.article)]));
         case "Event": var context = {companies: model.companies};
           var childAddress = A2($Signal.forwardTo,address,$App$Update.ChildEventAction);
           return A2($Html.div,_U.list([$Html$Attributes.style(myStyle)]),_U.list([A3($Event.view,context,childAddress,model.events)]));
         case "GithubAuth": var childAddress = A2($Signal.forwardTo,address,$App$Update.ChildGithubAuthAction);
           return A2($Html.div,_U.list([$Html$Attributes.style(myStyle)]),_U.list([A2($Pages$GithubAuth$View.view,childAddress,model.githubAuth)]));
         case "Login": var context = {backendConfig: function (_p1) {
              return function (_) {
                 return _.backendConfig;
              }(function (_) {    return _.config;}(_p1));
           }(model)};
           var childAddress = A2($Signal.forwardTo,address,$App$Update.ChildLoginAction);
           return A2($Html.div,_U.list([$Html$Attributes.style(myStyle)]),_U.list([A3($Pages$Login$View.view,context,childAddress,model.login)]));
         case "PageNotFound": return A2($Html.div,_U.list([]),_U.list([$Pages$PageNotFound$View.view]));
         default: var childAddress = A2($Signal.forwardTo,address,$App$Update.ChildUserAction);
           return A2($Html.div,_U.list([$Html$Attributes.style(myStyle)]),_U.list([A2($Pages$User$View.view,childAddress,model.user)]));}
   });
   var isActivePage = F2(function (activePage,page) {
      var _p2 = activePage;
      if (_p2.ctor === "Event") {
            return _U.eq(page,$App$Model.Event($Maybe.Nothing));
         } else {
            return _U.eq(activePage,page);
         }
   });
   var navbarLoggedIn = F2(function (address,model) {
      var navCollapseButton = function () {
         var iconBar = function (index) {    return A2($Html.span,_U.list([$Html$Attributes.$class("icon-bar")]),_U.list([]));};
         return A2($Html.button,
         _U.list([$Html$Attributes.$class("navbar-toggle")
                 ,A2($Html$Attributes.attribute,"data-toggle","collapse")
                 ,A2($Html$Attributes.attribute,"data-target",".main-nav")]),
         _U.list([A2($Html.span,_U.list([$Html$Attributes.$class("sr-only")]),_U.list([$Html.text("Menu")]))
                 ,A2($Html.span,_U.list([]),A2($List.map,iconBar,_U.range(0,2)))]));
      }();
      var hrefVoid = $Html$Attributes.href("javascript:void(0);");
      var childAddress = A2($Signal.forwardTo,address,$App$Update.ChildUserAction);
      var activeClass = function (page) {    return _U.list([{ctor: "_Tuple2",_0: "active",_1: A2(isActivePage,model.activePage,page)}]);};
      return A3($Html.node,
      "nav",
      _U.list([$Html$Attributes.id("main-header"),$Html$Attributes.$class("navbar navbar-default")]),
      _U.list([A2($Html.div,
      _U.list([$Html$Attributes.$class("container")]),
      _U.list([A2($Html.div,
              _U.list([$Html$Attributes.$class("navbar-header")]),
              _U.list([A2($Html.a,_U.list([$Html$Attributes.$class("brand visible-xs pull-left"),$Html$Attributes.href("#!/")]),_U.list([$Html.text("Hedley")]))
                      ,navCollapseButton]))
              ,A2($Html.div,
              _U.list([$Html$Attributes.$class("collapse navbar-collapse main-nav")]),
              _U.list([A2($Html.ul,
              _U.list([$Html$Attributes.$class("nav navbar-nav")]),
              _U.list([A2($Html.li,
                      _U.list([]),
                      _U.list([A2($Html.a,_U.list([$Html$Attributes.$class("brand hidden-xs"),$Html$Attributes.href("#!/")]),_U.list([$Html.text("Hedley")]))]))
                      ,A2($Html.li,
                      _U.list([$Html$Attributes.classList(activeClass($App$Model.User))]),
                      _U.list([A2($Html.i,_U.list([$Html$Attributes.$class("glyphicon glyphicon-user")]),_U.list([]))
                              ,A2($Html.a,
                              _U.list([hrefVoid,A2($Html$Events.onClick,address,$App$Update.SetActivePage($App$Model.User))]),
                              _U.list([$Html.text("My account")]))]))
                      ,A2($Html.li,
                      _U.list([$Html$Attributes.classList(activeClass($App$Model.Event($Maybe.Nothing)))]),
                      _U.list([A2($Html.i,_U.list([$Html$Attributes.$class("fa fa-map-marker")]),_U.list([]))
                              ,A2($Html.a,
                              _U.list([hrefVoid,A2($Html$Events.onClick,address,$App$Update.SetActivePage($App$Model.Event($Maybe.Nothing)))]),
                              _U.list([$Html.text("Events")]))]))
                      ,A2($Html.li,
                      _U.list([$Html$Attributes.classList(activeClass($App$Model.Article))]),
                      _U.list([A2($Html.i,_U.list([$Html$Attributes.$class("fa fa-file-o")]),_U.list([]))
                              ,A2($Html.a,
                              _U.list([hrefVoid,A2($Html$Events.onClick,address,$App$Update.SetActivePage($App$Model.Article))]),
                              _U.list([$Html.text("Articles")]))]))
                      ,A2($Html.li,
                      _U.list([$Html$Attributes.classList(activeClass($App$Model.PageNotFound))]),
                      _U.list([A2($Html.i,_U.list([$Html$Attributes.$class("fa fa-exclamation-circle")]),_U.list([]))
                              ,A2($Html.a,_U.list([$Html$Attributes.href("#!/error-page")]),_U.list([$Html.text("PageNotFound (404)")]))]))
                      ,A2($Html.li,
                      _U.list([]),
                      _U.list([A2($Html.i,_U.list([$Html$Attributes.$class("fa fa-sign-out")]),_U.list([]))
                              ,A2($Html.a,
                              _U.list([hrefVoid,A2($Html$Events.onClick,address,$App$Update.Logout)]),
                              _U.list([$Html.text("Logout")]))]))]))]))]))]));
   });
   var navbar = F2(function (address,model) {
      var _p3 = model.user.name;
      if (_p3.ctor === "Anonymous") {
            return A2($Html.div,_U.list([]),_U.list([]));
         } else {
            return A2(navbarLoggedIn,address,model);
         }
   });
   var view = F2(function (address,model) {
      return _U.eq(model.configError,true) ? $Config$View.view : A2($Html.div,
      _U.list([]),
      _U.list([A2(navbar,address,model),A2(mainContent,address,model),footer]));
   });
   return _elm.App.View.values = {_op: _op
                                 ,isActivePage: isActivePage
                                 ,view: view
                                 ,mainContent: mainContent
                                 ,navbar: navbar
                                 ,footer: footer
                                 ,navbarLoggedIn: navbarLoggedIn
                                 ,myStyle: myStyle};
};
Elm.Main = Elm.Main || {};
Elm.Main.make = function (_elm) {
   "use strict";
   _elm.Main = _elm.Main || {};
   if (_elm.Main.values) return _elm.Main.values;
   var _U = Elm.Native.Utils.make(_elm),
   $App$Model = Elm.App.Model.make(_elm),
   $App$Router = Elm.App.Router.make(_elm),
   $App$Update = Elm.App.Update.make(_elm),
   $App$View = Elm.App.View.make(_elm),
   $ArticleForm$Model = Elm.ArticleForm.Model.make(_elm),
   $ArticleForm$Update = Elm.ArticleForm.Update.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Effects = Elm.Effects.make(_elm),
   $Event = Elm.Event.make(_elm),
   $Leaflet$Model = Elm.Leaflet.Model.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Pages$Article$Update = Elm.Pages.Article.Update.make(_elm),
   $Result = Elm.Result.make(_elm),
   $RouteHash = Elm.RouteHash.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $StartApp = Elm.StartApp.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var ckeditor = Elm.Native.Port.make(_elm).inboundSignal("ckeditor",
   "String",
   function (v) {
      return typeof v === "string" || typeof v === "object" && v instanceof String ? v : _U.badPort("a string",v);
   });
   var dropzoneUploadedFile = Elm.Native.Port.make(_elm).inboundSignal("dropzoneUploadedFile",
   "Maybe.Maybe Int",
   function (v) {
      return v === null ? Elm.Maybe.make(_elm).Nothing : Elm.Maybe.make(_elm).Just(typeof v === "number" && isFinite(v) && Math.floor(v) === v ? v : _U.badPort("an integer",
      v));
   });
   var ActivePagePort = F4(function (a,b,c,d) {    return {accessToken: a,activePage: b,backendUrl: c,postStatus: d};});
   var selectEvent = Elm.Native.Port.make(_elm).inboundSignal("selectEvent",
   "Maybe.Maybe Int",
   function (v) {
      return v === null ? Elm.Maybe.make(_elm).Nothing : Elm.Maybe.make(_elm).Just(typeof v === "number" && isFinite(v) && Math.floor(v) === v ? v : _U.badPort("an integer",
      v));
   });
   var LeafletPort = F2(function (a,b) {    return {leaflet: a,events: b};});
   var messages = $Signal.mailbox($App$Update.NoOp);
   var app = $StartApp.start({init: $App$Update.init
                             ,update: $App$Update.update
                             ,view: $App$View.view
                             ,inputs: _U.list([messages.signal
                                              ,A2($Signal.map,
                                              function (_p0) {
                                                 return $App$Update.ChildArticleAction($Pages$Article$Update.ChildArticleFormAction($ArticleForm$Update.SetImageId(_p0)));
                                              },
                                              dropzoneUploadedFile)
                                              ,A2($Signal.map,
                                              function (_p1) {
                                                 return $App$Update.ChildArticleAction($Pages$Article$Update.ChildArticleFormAction($ArticleForm$Update.UpdateBody(_p1)));
                                              },
                                              ckeditor)
                                              ,A2($Signal.map,
                                              function (_p2) {
                                                 return $App$Update.ChildEventAction($Event.SelectEvent(_p2));
                                              },
                                              selectEvent)])});
   var main = app.html;
   var tasks = Elm.Native.Task.make(_elm).performSignal("tasks",app.tasks);
   var routeTasks = Elm.Native.Task.make(_elm).performSignal("routeTasks",
   $RouteHash.start({prefix: $RouteHash.defaultPrefix
                    ,address: messages.address
                    ,models: app.model
                    ,delta2update: $App$Router.delta2update
                    ,location2action: $App$Router.location2action}));
   var mapManager = Elm.Native.Port.make(_elm).outboundSignal("mapManager",
   function (v) {
      return {leaflet: {markers: Elm.Native.List.make(_elm).toArray(v.leaflet.markers).map(function (v) {    return {id: v.id,lat: v.lat,lng: v.lng};})
                       ,selectedMarker: v.leaflet.selectedMarker.ctor === "Nothing" ? null : v.leaflet.selectedMarker._0
                       ,showMap: v.leaflet.showMap}
             ,events: Elm.Native.List.make(_elm).toArray(v.events).map(function (v) {    return v;})};
   },
   function () {
      var getLeaflet = function (model) {
         return function (_p3) {
            return function (_) {
               return _.leaflet;
            }(function (_) {    return _.events;}(_p3));
         }(model);
      };
      var getEvents = function (model) {
         return function (_p4) {
            return function (_) {
               return _.events;
            }(function (_) {    return _.events;}(_p4));
         }(model);
      };
      var getLeafletPort = function (model) {    return {events: A2($List.map,function (_) {    return _.id;},getEvents(model)),leaflet: getLeaflet(model)};};
      return A2($Signal.map,getLeafletPort,app.model);
   }());
   var activePage = Elm.Native.Port.make(_elm).outboundSignal("activePage",
   function (v) {
      return {accessToken: v.accessToken,activePage: v.activePage,backendUrl: v.backendUrl,postStatus: v.postStatus};
   },
   function () {
      var postStatusAsString = function (status) {
         var _p5 = status;
         switch (_p5.ctor)
         {case "Busy": return "Busy";
            case "Done": return "Done";
            default: return "Ready";}
      };
      var pageAsString = function (page) {
         var _p6 = page;
         switch (_p6.ctor)
         {case "Article": return "Article";
            case "Event": return "Event";
            case "GithubAuth": return "GithubAuth";
            case "Login": return "Login";
            case "PageNotFound": return "PageNotFound";
            default: return "User";}
      };
      var getPortData = function (model) {
         return {accessToken: model.accessToken
                ,activePage: pageAsString(model.activePage)
                ,backendUrl: function (_p7) {
                   return function (_) {
                      return _.backendUrl;
                   }(function (_) {    return _.backendConfig;}(function (_) {    return _.config;}(_p7)));
                }(model)
                ,postStatus: postStatusAsString(model.article.articleForm.postStatus)};
      };
      return A2($Signal.map,getPortData,app.model);
   }());
   return _elm.Main.values = {_op: _op,app: app,main: main,messages: messages,LeafletPort: LeafletPort,ActivePagePort: ActivePagePort};
};
