const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const zlib = require("node:zlib");

const projectRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const siteScript = fs.readFileSync(
	path.join(projectRoot, "assets/js/site.js"),
	"utf8",
);
const motionStyles = ["site.css", "cpu.css", "ecosystem.css"]
	.map((file) =>
		fs.readFileSync(path.join(projectRoot, "assets/css", file), "utf8"),
	)
	.join("\n");

function tags(name) {
	return Array.from(
		html.matchAll(new RegExp("<" + name + "\\b[^>]*>", "gi")),
		(match) => match[0],
	);
}

function attribute(tag, name) {
	const match = tag.match(new RegExp("\\s" + name + '="([^"]*)"', "i"));
	return match ? match[1] : null;
}

test("the critical path loads only the shared stylesheet and boot controller", () => {
	const stylesheetUrls = tags("link")
		.filter((tag) => attribute(tag, "rel") === "stylesheet")
		.map((tag) => attribute(tag, "href"));
	const scriptUrls = tags("script")
		.map((tag) => attribute(tag, "src"))
		.filter(Boolean);

	assert.deepEqual(stylesheetUrls, ["assets/css/site.css?v=20260907"]);
	assert.deepEqual(scriptUrls, ["assets/js/site.js?v=20260907"]);
	assert.match(
		tags("script").find(
			(tag) => attribute(tag, "src") === "assets/js/site.js?v=20260907",
		),
		/\sdefer(?:\s|>)/i,
	);
});

test("motion respects system preferences and persists an explicit choice", () => {
	assert.match(
		siteScript,
		/matchMedia\(\s*"\(prefers-reduced-motion: reduce\)",?\s*\)/,
	);
	assert.match(siteScript, /readPreference\("mk-motion"\)/);
	assert.match(siteScript, /writePreference\("mk-motion"/);
	assert.match(siteScript, /motionPreference\.addEventListener\("change"/);
	assert.match(motionStyles, /prefers-reduced-motion: reduce/);
});

test("the skip link targets a focusable main landmark", () => {
	const main = tags("main").find(
		(tag) => attribute(tag, "id") === "site-content",
	);
	assert.equal(attribute(main, "tabindex"), "-1");
	assert.match(siteScript, /querySelector\("\.skip-link"\)/);
});

test("search and social descriptions identify the owner and featured work", () => {
	const descriptions = tags("meta").filter((tag) =>
		["description", "og:description", "twitter:description"].includes(
			attribute(tag, "name") || attribute(tag, "property"),
		),
	);
	assert.equal(descriptions.length, 3);
	for (const tag of descriptions) {
		assert.match(attribute(tag, "content"), /Michael Kahen/);
		assert.match(attribute(tag, "content"), /RISC-V/);
	}
	const schema = JSON.parse(
		html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],
	);
	assert.ok(schema["@graph"].some((entry) => entry["@type"] === "ProfilePage"));
});

test("resume references retain a single cache version and the real filename", () => {
	const urls = [...html.matchAll(/Michael_Kahen_Resume\.pdf\?v=([^"\s<]+)/g)];
	assert.equal(urls.length, 5);
	assert.equal(new Set(urls.map((match) => match[1])).size, 1);
	assert.match(html, /download="Michael_Kahen_Resume\.pdf"/);
});

test("the compressed critical path stays within its 30 KiB budget", () => {
	const criticalFiles = [
		"index.html",
		"assets/css/site.css",
		"assets/js/site.js",
	];
	const compressedBytes = criticalFiles.reduce((total, file) => {
		const source = fs.readFileSync(path.join(projectRoot, file));
		return total + zlib.gzipSync(source, { level: 9 }).byteLength;
	}, 0);

	assert.ok(
		compressedBytes <= 30 * 1024,
		"critical path is " + compressedBytes + " bytes gzip",
	);
});

test("heavy feature assets are declared as lazy route entry points", () => {
	const shell = tags("div").find(
		(tag) => attribute(tag, "id") === "site-shell",
	);

	assert.ok(shell, "site shell is present");
	assert.equal(
		attribute(shell, "data-cpu-script"),
		"assets/js/cpu.js?v=20260907",
	);
	assert.equal(
		attribute(shell, "data-cpu-style"),
		"assets/css/cpu.css?v=20260907",
	);
	assert.equal(
		attribute(shell, "data-ecosystem-script"),
		"assets/js/ecosystem.js?v=20260907",
	);
	assert.equal(
		attribute(shell, "data-ecosystem-style"),
		"assets/css/ecosystem.css?v=20260907",
	);
});

test("local asset references resolve inside the repository", () => {
	const references = ["link", "script", "img", "a"]
		.flatMap((name) =>
			tags(name).flatMap((tag) => [
				attribute(tag, "href"),
				attribute(tag, "src"),
			]),
		)
		.filter((reference) => reference && reference.startsWith("assets/"));

	references.forEach((reference) => {
		const assetPath = reference.split(/[?#]/, 1)[0];
		assert.ok(fs.existsSync(path.join(projectRoot, assetPath)), assetPath);
	});
});

test("CPU scroll panes remain keyboard accessible", () => {
	for (const id of [
		"cpu-listing",
		"cpu-registers",
		"cpu-memory",
		"cpu-cache",
		"cpu-predictor-table",
	]) {
		const tag = [...tags("div"), ...tags("section")].find(
			(node) => attribute(node, "id") === id,
		);
		assert.equal(attribute(tag, "tabindex"), "0", id);
	}
});

test("third-person search descriptions do not leak into visible portfolio copy", () => {
	const body = html.split("<body>")[1];
	assert.doesNotMatch(body, /Michael Kahen is|Explore his/);
	assert.match(body, /I build software, developer/);
});

test("document IDs remain unique", () => {
	const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
	const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

	assert.equal(duplicates.length, 0, "duplicate IDs: " + duplicates.join(", "));
});

test("images reserve layout space and lazy images decode asynchronously", () => {
	tags("img").forEach((image) => {
		const source = attribute(image, "src");
		assert.ok(attribute(image, "width"), source + " is missing width");
		assert.ok(attribute(image, "height"), source + " is missing height");
		if (attribute(image, "loading") === "lazy") {
			assert.equal(attribute(image, "decoding"), "async", source);
		}
	});
});

test("new-tab links prevent opener access", () => {
	tags("a").forEach((anchor) => {
		if (attribute(anchor, "target") === "_blank") {
			const rel = (attribute(anchor, "rel") || "").split(/\s+/);
			assert.ok(rel.includes("noopener"), attribute(anchor, "href"));
		}
	});
});
