const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(
	path.join(__dirname, "../assets/js/site.js"),
	"utf8",
);

// Minimal DOM fixture: exercise the real controller without browser dependencies.
function boot({
	reduced = false,
	storedMotion = null,
	hash = "",
	blockedStorage = false,
} = {}) {
	class Element {
		constructor() {
			this.dataset = {};
			this.attributes = new Map();
			this.listeners = new Map();
			this.classes = new Set();
			this.classList = {
				add: (value) => this.classes.add(value),
				remove: (value) => this.classes.delete(value),
				toggle: (value, enabled) =>
					enabled ? this.classes.add(value) : this.classes.delete(value),
			};
		}
		addEventListener(type, callback) {
			const callbacks = this.listeners.get(type) || [];
			callbacks.push(callback);
			this.listeners.set(type, callbacks);
		}
		emit(type, event = {}) {
			for (const callback of this.listeners.get(type) || []) callback(event);
		}
		setAttribute(key, value) {
			this.attributes.set(key, value);
		}
		removeAttribute(key) {
			this.attributes.delete(key);
		}
		querySelector() {
			return this.child || (this.child = new Element());
		}
		focus() {
			document.activeElement = this;
		}
	}
	const elements = new Map();
	const get = (id) => {
		if (!elements.has(id)) elements.set(id, new Element());
		return elements.get(id);
	};
	const views = [
		"home",
		"projects",
		"resume",
		"contact",
		"cpu",
		"ecosystem",
	].map((route) => {
		const view = get(route);
		view.dataset.view = route;
		return view;
	});
	const links = views.map((view) => {
		const link = new Element();
		link.dataset.navRoute = view.dataset.view;
		return link;
	});
	const document = new Element();
	document.hidden = false;
	document.getElementById = get;
	document.querySelector = get;
	document.querySelectorAll = (selector) =>
		({
			"[data-view]": views,
			"[data-nav-route]": links,
		})[selector] || [];
	const storage = new Map(storedMotion ? [["mk-motion", storedMotion]] : []);
	const preference = new Element();
	preference.matches = reduced;
	const window = new Element();
	window.location = { hash };
	window.matchMedia = () => preference;
	window.localStorage = {
		getItem(key) {
			if (blockedStorage) throw new Error("Storage blocked");
			return storage.get(key) || null;
		},
		setItem(key, value) {
			if (blockedStorage) throw new Error("Storage blocked");
			storage.set(key, value);
		},
	};
	window.requestAnimationFrame = (callback) => {
		callback();
		return 1;
	};
	window.cancelAnimationFrame = () => {};
	window.setTimeout = () => 1;
	window.clearTimeout = () => {};
	const featureCalls = [];
	window.ECOSYSTEM = {
		setActive: (value) => featureCalls.push(["active", value]),
		setPaused: (value) => featureCalls.push(["paused", value]),
	};
	vm.runInNewContext(source, {
		window,
		document,
		navigator: {},
		Element,
		HTMLElement: Element,
	});
	return { get, document, window, storage, preference, featureCalls, links };
}

test("reduced motion pauses the interface and demo without disabling its controls", () => {
	const app = boot({ reduced: true, hash: "#ecosystem" });
	assert.equal(app.get("motion-button").attributes.get("aria-pressed"), "true");
	assert.deepEqual(app.featureCalls, [
		["paused", true],
		["active", true],
	]);
	assert.equal(app.get("ecosystem").hidden, false);
});

test("explicit motion choice overrides the system and is persisted", () => {
	const app = boot({ reduced: true, storedMotion: "running" });
	assert.equal(
		app.get("motion-button").attributes.get("aria-pressed"),
		"false",
	);
	app.get("motion-button").emit("click");
	assert.equal(app.storage.get("mk-motion"), "paused");
	app.preference.matches = false;
	app.preference.emit("change");
	assert.equal(app.get("motion-button").attributes.get("aria-pressed"), "true");
});

test("system motion changes are followed until the visitor makes a choice", () => {
	const app = boot();
	app.preference.matches = true;
	app.preference.emit("change");
	assert.equal(app.get("motion-button").attributes.get("aria-pressed"), "true");
	assert.equal(app.storage.has("mk-motion"), false);
});

test("blocked browser storage does not break routing or display controls", () => {
	const app = boot({ blockedStorage: true, hash: "#contact" });
	app.get("motion-button").emit("click");
	assert.equal(app.get("contact").hidden, false);
	assert.equal(app.document.title, "Contact | Michael Kahen");
});

test("skip link focuses the current route without changing its URL", () => {
	const app = boot({ hash: "#resume" });
	let prevented = false;
	app.get(".skip-link").emit("click", {
		preventDefault: () => {
			prevented = true;
		},
	});
	assert.equal(prevented, true);
	assert.equal(app.window.location.hash, "#resume");
	assert.equal(app.document.activeElement, app.get("resume").child);
});

test("route changes update focus and stop the outgoing demo", () => {
	const app = boot({ hash: "#ecosystem" });
	app.window.location.hash = "#contact";
	app.window.emit("hashchange");
	assert.deepEqual(app.featureCalls.at(-1), ["active", false]);
	assert.equal(app.get("ecosystem").hidden, true);
	assert.equal(app.get("contact").hidden, false);
	assert.equal(app.document.activeElement, app.get("contact").child);
	assert.equal(
		app.links
			.find((link) => link.dataset.navRoute === "contact")
			.attributes.get("aria-current"),
		"page",
	);
});

test("background tabs suspend demos and restore only the current route", () => {
	const app = boot({ hash: "#ecosystem" });
	app.document.hidden = true;
	app.document.emit("visibilitychange");
	assert.deepEqual(app.featureCalls.at(-1), ["active", false]);
	app.document.hidden = false;
	app.document.emit("visibilitychange");
	assert.deepEqual(app.featureCalls.at(-1), ["active", true]);
});

test("unknown routes fall back to home", () => {
	const app = boot({ hash: "#not-a-route" });
	assert.equal(app.get("home").hidden, false);
	assert.equal(app.get("site-shell").dataset.route, "home");
});
