(function () {
	"use strict";

	const shell = document.getElementById("site-shell");
	const factoryMap = document.getElementById("factory-map");
	const altModeButton = document.getElementById("alt-mode-button");
	const motionButton = document.getElementById("motion-button");
	const copyEmailButton = document.getElementById("copy-email-button");
	const toast = document.getElementById("site-toast");
	const routeAnnouncer = document.getElementById("route-announcer");
	const views = new Map();
	const navigationLinks = Array.from(
		document.querySelectorAll("[data-nav-route]"),
	);
	const machines = Array.from(document.querySelectorAll("[data-machine]"));
	const projectSelectors = Array.from(
		document.querySelectorAll("[data-project-selector]"),
	);
	const projectDetails = Array.from(
		document.querySelectorAll("[data-project-detail]"),
	);
	const projectReadoutName = document.querySelector(
		"[data-project-readout-name]",
	);
	const projectReadoutSource = document.querySelector(
		"[data-project-readout-source]",
	);
	const reducedMotionQuery = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	);

	const routes = {
		home: {
			title: "Michael Kahen | Computer Engineer & Software Developer",
			announcement: "Factory floor",
			navigationRoute: "home",
		},
		projects: {
			title: "Projects | Michael Kahen",
			announcement: "Projects",
			navigationRoute: "projects",
		},
		ecosystem: {
			title: "Autonomous Ecosystem | Michael Kahen",
			announcement: "Autonomous ecosystem simulation",
			navigationRoute: "projects",
		},
		cpu: {
			title: "RISC-V Pipeline Lab | Michael Kahen",
			announcement: "RISC-V pipeline lab",
			navigationRoute: "projects",
		},
		resume: {
			title: "Resume | Michael Kahen",
			announcement: "Resume",
			navigationRoute: "resume",
		},
		contact: {
			title: "Contact | Michael Kahen",
			announcement: "Contact",
			navigationRoute: "contact",
		},
	};
	const featureModules = {
		ecosystem: {
			apiName: "ECOSYSTEM",
			loader: document.getElementById("ecosystem-loader"),
			scriptUrl: shell.dataset.ecosystemScript,
			stylesheetUrl: shell.dataset.ecosystemStyle,
			failureTitle: "BIOSPHERE FAILED TO INITIALIZE",
			failureToast: "Unable to load the ecosystem",
			respectsMotionPreference: true,
		},
		cpu: {
			apiName: "CPU_LAB",
			loader: document.getElementById("cpu-loader"),
			scriptUrl: shell.dataset.cpuScript,
			stylesheetUrl: shell.dataset.cpuStyle,
			failureTitle: "CPU LAB FAILED TO INITIALIZE",
			failureToast: "Unable to load the CPU lab",
			respectsMotionPreference: false,
		},
	};
	const featureLoadPromises = new Map();

	let activeRoute = null;
	let toastTimer = 0;
	let toastFrame = 0;
	let altModeEnabled = readPreference("mk-alt-mode") === "enabled";
	let motionPaused =
		reducedMotionQuery.matches || readPreference("mk-motion") === "paused";

	document.querySelectorAll("[data-view]").forEach(function (view) {
		views.set(view.dataset.view, view);
	});

	function readPreference(key) {
		try {
			return window.localStorage.getItem(key);
		} catch (_error) {
			return null;
		}
	}

	function writePreference(key, value) {
		try {
			window.localStorage.setItem(key, value);
		} catch (_error) {
			// Preferences are optional when storage is unavailable.
		}
	}

	function routeFromHash() {
		const requestedRoute = window.location.hash.slice(1).toLowerCase();
		return Object.prototype.hasOwnProperty.call(routes, requestedRoute)
			? requestedRoute
			: "home";
	}

	function setAltMode(enabled, announce) {
		altModeEnabled = Boolean(enabled);
		shell.classList.toggle("is-alt-mode", altModeEnabled);
		altModeButton.setAttribute("aria-pressed", String(altModeEnabled));
		altModeButton.querySelector(".utility-button__label").textContent =
			altModeEnabled ? "ALT MODE ON" : "ALT MODE";
		writePreference("mk-alt-mode", altModeEnabled ? "enabled" : "disabled");

		if (announce) {
			showToast(altModeEnabled ? "Alt mode enabled" : "Alt mode disabled");
		}
	}

	function setMotionPaused(paused, announce) {
		motionPaused = Boolean(paused);
		shell.classList.toggle("is-motion-paused", motionPaused);
		motionButton.setAttribute("aria-pressed", String(motionPaused));
		motionButton.querySelector(".utility-button__label").textContent =
			motionPaused ? "MOTION OFF" : "MOTION ON";
		writePreference("mk-motion", motionPaused ? "paused" : "running");

		if (window.ECOSYSTEM && activeRoute === "ecosystem") {
			window.ECOSYSTEM.setActive(!motionPaused);
		}

		if (announce) {
			showToast(
				motionPaused ? "Ambient motion paused" : "Ambient motion resumed",
			);
		}
	}

	function showToast(message) {
		window.clearTimeout(toastTimer);
		window.cancelAnimationFrame(toastFrame);
		toast.textContent = message;
		toast.hidden = false;
		toast.classList.remove("is-visible");
		toastFrame = window.requestAnimationFrame(function () {
			toast.classList.add("is-visible");
			toastFrame = 0;
		});
		toastTimer = window.setTimeout(function () {
			toast.hidden = true;
			toast.classList.remove("is-visible");
		}, 2200);
	}

	function updateNavigation(route) {
		const currentNavigationRoute = routes[route].navigationRoute;
		navigationLinks.forEach(function (link) {
			if (link.dataset.navRoute === currentNavigationRoute) {
				link.setAttribute("aria-current", "page");
			} else {
				link.removeAttribute("aria-current");
			}
		});
	}

	function focusViewHeading(view) {
		const heading = view.querySelector("h1, h2");
		if (!heading) {
			return;
		}

		heading.setAttribute("tabindex", "-1");
		heading.focus({ preventScroll: true });
		heading.addEventListener(
			"blur",
			function () {
				heading.removeAttribute("tabindex");
			},
			{ once: true },
		);
	}

	function revealView(route, moveFocus) {
		const nextView = views.get(route);
		if (!nextView) {
			return;
		}

		if (
			activeRoute === "ecosystem" &&
			route !== "ecosystem" &&
			window.ECOSYSTEM
		) {
			window.ECOSYSTEM.setActive(false);
		}

		if (activeRoute === "cpu" && route !== "cpu" && window.CPU_LAB) {
			window.CPU_LAB.setActive(false);
		}

		views.forEach(function (view, viewRoute) {
			const isCurrent = viewRoute === route;
			view.hidden = !isCurrent;
			view.setAttribute("aria-hidden", String(!isCurrent));
		});

		activeRoute = route;
		shell.dataset.route = route;
		document.title = routes[route].title;
		updateNavigation(route);
		nextView.scrollTop = 0;

		nextView.classList.remove("is-entering");
		window.requestAnimationFrame(function () {
			nextView.classList.add("is-entering");
			window.setTimeout(function () {
				nextView.classList.remove("is-entering");
			}, 280);
		});

		if (featureModules[route]) {
			loadFeatureModule(route);
		}

		if (moveFocus) {
			window.requestAnimationFrame(function () {
				focusViewHeading(nextView);
			});
		}

		routeAnnouncer.textContent = routes[route].announcement + " opened";
	}

	function loadStylesheet(url) {
		return new Promise(function (resolve, reject) {
			const link = document.createElement("link");
			link.rel = "stylesheet";
			link.href = url;
			link.addEventListener("load", function () {
				resolve(link);
			}, { once: true });
			link.addEventListener("error", function () {
				link.remove();
				reject(new Error("Unable to load " + url + "."));
			}, { once: true });
			document.head.appendChild(link);
		});
	}

	function loadScript(url) {
		return new Promise(function (resolve, reject) {
			const script = document.createElement("script");
			script.src = url;
			script.async = true;
			script.addEventListener("load", function () {
				resolve(script);
			}, { once: true });
			script.addEventListener("error", function () {
				script.remove();
				reject(new Error("Unable to load " + url + "."));
			}, { once: true });
			document.body.appendChild(script);
		});
	}

	function featureShouldBeActive(route, feature) {
		return (
			activeRoute === route &&
			(!feature.respectsMotionPreference || !motionPaused)
		);
	}

	function showFeatureError(feature, error) {
		const content = document.createElement("div");
		const title = document.createElement("strong");
		const detail = document.createElement("small");
		content.className = "feature-loader__error";
		title.textContent = feature.failureTitle;
		detail.textContent = error.message;
		content.append(title, detail);
		feature.loader.replaceChildren(content);
		feature.loader.setAttribute("role", "alert");
		showToast(feature.failureToast);
	}

	function loadFeatureModule(route) {
		const feature = featureModules[route];
		const view = views.get(route);
		const existingApi = window[feature.apiName];
		const pendingLoad = featureLoadPromises.get(route);

		if (pendingLoad) {
			return pendingLoad.then(function (api) {
				if (api) {
					api.setActive(featureShouldBeActive(route, feature));
				}
				return api;
			});
		}

		if (existingApi) {
			feature.loader.hidden = true;
			existingApi.setActive(featureShouldBeActive(route, feature));
			return Promise.resolve(existingApi);
		}

		feature.loader.hidden = false;
		feature.loader.setAttribute("role", "status");
		view.setAttribute("aria-busy", "true");
		const loadPromise = Promise.all([
			loadStylesheet(feature.stylesheetUrl),
			loadScript(feature.scriptUrl),
		])
			.then(function () {
				const api = window[feature.apiName];
				if (!api || typeof api.setActive !== "function") {
					throw new Error("The feature lifecycle API did not initialize.");
				}

				feature.loader.hidden = true;
				view.removeAttribute("aria-busy");
				api.setActive(featureShouldBeActive(route, feature));
				return api;
			})
			.catch(function (error) {
				const api = window[feature.apiName];
				if (api && typeof api.setActive === "function") {
					api.setActive(false);
				}
				view.removeAttribute("aria-busy");
				showFeatureError(feature, error);
				return null;
			});

		featureLoadPromises.set(route, loadPromise);
		return loadPromise;
	}

	function setFactoryRoute(machineName) {
		factoryMap.dataset.activeMachine = machineName || "";
	}

	function selectProject(selector) {
		const projectName = selector.dataset.projectName;
		const selectedProject = selector.dataset.projectSelector;

		projectSelectors.forEach(function (projectSelector) {
			const isSelected = projectSelector === selector;
			projectSelector.classList.toggle("is-selected", isSelected);
			projectSelector.setAttribute("aria-pressed", String(isSelected));
		});

		projectDetails.forEach(function (detail) {
			detail.hidden = detail.dataset.projectDetail !== selectedProject;
		});

		projectReadoutName.textContent = selector.dataset.projectCode;
		projectReadoutSource.textContent =
			"SOURCE: " + selector.dataset.projectSource;
		routeAnnouncer.textContent = projectName + " details selected";
	}

	function machineLostFocus(machine) {
		window.requestAnimationFrame(function () {
			if (
				!machine.matches(":hover") &&
				!machine.contains(document.activeElement)
			) {
				setFactoryRoute("");
			}
		});
	}

	function copyEmailAddress() {
		const email = copyEmailButton.dataset.email;
		const fallbackCopy = function () {
			const field = document.createElement("textarea");
			field.value = email;
			field.setAttribute("readonly", "");
			field.style.position = "fixed";
			field.style.opacity = "0";
			document.body.appendChild(field);
			field.select();
			const copied = document.execCommand("copy");
			field.remove();
			return copied;
		};

		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(email).then(
				function () {
					showToast("Email address copied");
				},
				function () {
					showToast(fallbackCopy() ? "Email address copied" : email);
				},
			);
			return;
		}

		showToast(fallbackCopy() ? "Email address copied" : email);
	}

	machines.forEach(function (machine) {
		const machineName = machine.dataset.machine;
		machine.addEventListener("pointerenter", function () {
			setFactoryRoute(machineName);
		});
		machine.addEventListener("pointerleave", function () {
			machineLostFocus(machine);
		});
		machine.addEventListener("focus", function () {
			setFactoryRoute(machineName);
		});
		machine.addEventListener("blur", function () {
			machineLostFocus(machine);
		});
	});

	projectSelectors.forEach(function (selector) {
		selector.addEventListener("click", function () {
			selectProject(selector);
		});
	});

	altModeButton.addEventListener("click", function () {
		setAltMode(!altModeEnabled, true);
	});

	motionButton.addEventListener("click", function () {
		setMotionPaused(!motionPaused, true);
	});

	copyEmailButton.addEventListener("click", copyEmailAddress);

	document.addEventListener("keydown", function (event) {
		const target = event.target;
		const targetIsEditable =
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));

		if (event.key === "Escape") {
			const focusedMachine =
				target instanceof Element && target.closest(".machine");
			if (focusedMachine) {
				focusedMachine.blur();
				setFactoryRoute("");
				return;
			}

			if (!targetIsEditable && activeRoute !== "home") {
				event.preventDefault();
				window.location.hash = ["ecosystem", "cpu"].includes(activeRoute)
					? "projects"
					: "home";
			}
			return;
		}

		if (targetIsEditable || event.repeat || !event.altKey) {
			return;
		}

		if (event.key.toLowerCase() === "a") {
			event.preventDefault();
			setAltMode(!altModeEnabled, true);
		} else if (event.key.toLowerCase() === "m") {
			event.preventDefault();
			setMotionPaused(!motionPaused, true);
		}
	});

	window.addEventListener("hashchange", function () {
		revealView(routeFromHash(), true);
	});

	reducedMotionQuery.addEventListener("change", function (event) {
		if (event.matches) {
			setMotionPaused(true, true);
		}
	});

	setAltMode(altModeEnabled, false);
	setMotionPaused(motionPaused, false);
	revealView(routeFromHash(), false);
})();
