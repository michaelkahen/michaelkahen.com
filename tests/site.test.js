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

	assert.deepEqual(stylesheetUrls, ["assets/css/site.css"]);
	assert.deepEqual(scriptUrls, ["assets/js/site.js"]);
	assert.match(
		tags("script").find((tag) => attribute(tag, "src") === "assets/js/site.js"),
		/\sdefer(?:\s|>)/i,
	);
});

test("motion is on by default and remains controlled by the site toggle", () => {
	assert.match(siteScript, /let motionPaused = false;/);
	assert.doesNotMatch(siteScript, /prefers-reduced-motion/);
	assert.doesNotMatch(motionStyles, /prefers-reduced-motion/);
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
	assert.equal(attribute(shell, "data-cpu-script"), "assets/js/cpu.js");
	assert.equal(attribute(shell, "data-cpu-style"), "assets/css/cpu.css");
	assert.equal(
		attribute(shell, "data-ecosystem-script"),
		"assets/js/ecosystem.js",
	);
	assert.equal(
		attribute(shell, "data-ecosystem-style"),
		"assets/css/ecosystem.css",
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
