(function () {
  "use strict";

  const shell = document.getElementById("site-shell");
  const factoryMap = document.getElementById("factory-map");
  const altModeButton = document.getElementById("alt-mode-button");
  const motionButton = document.getElementById("motion-button");
  const copyEmailButton = document.getElementById("copy-email-button");
  const toast = document.getElementById("site-toast");
  const routeAnnouncer = document.getElementById("route-announcer");
  const ecosystemLoader = document.getElementById("ecosystem-loader");
  const cpuLoader = document.getElementById("cpu-loader");
  const views = new Map();
  const navigationLinks = Array.from(
    document.querySelectorAll("[data-nav-route]"),
  );
  const machines = Array.from(document.querySelectorAll("[data-machine]"));
  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  const routes = {
    home: {
      title: "Michael Kahen | Computer Engineer",
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

  let activeRoute = null;
  let ecosystemLoadPromise = null;
  let cpuLoadPromise = null;
  let toastTimer = 0;
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
      showToast(motionPaused ? "Ambient motion paused" : "Ambient motion resumed");
    }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove("is-visible");
    void toast.offsetWidth;
    toast.classList.add("is-visible");
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

    if (activeRoute === "ecosystem" && route !== "ecosystem" && window.ECOSYSTEM) {
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

    if (route === "ecosystem") {
      loadEcosystem();
    }

    if (route === "cpu") {
      loadCpu();
    }

    if (moveFocus) {
      window.requestAnimationFrame(function () {
        focusViewHeading(nextView);
      });
    }

    routeAnnouncer.textContent = routes[route].announcement + " opened";
  }

  function loadEcosystem() {
    if (window.ECOSYSTEM) {
      ecosystemLoader.hidden = true;
      window.ECOSYSTEM.setActive(!motionPaused);
      return Promise.resolve(window.ECOSYSTEM);
    }

    if (ecosystemLoadPromise) {
      return ecosystemLoadPromise;
    }

    ecosystemLoader.hidden = false;
    ecosystemLoadPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = shell.dataset.ecosystemScript;
      script.async = true;

      script.addEventListener("load", function () {
        if (!window.ECOSYSTEM) {
          reject(new Error("The ecosystem lifecycle API did not initialize."));
          return;
        }

        ecosystemLoader.hidden = true;
        window.ECOSYSTEM.setActive(
          activeRoute === "ecosystem" && !motionPaused,
        );
        resolve(window.ECOSYSTEM);
      });

      script.addEventListener("error", function () {
        reject(new Error("The ecosystem script could not be loaded."));
      });

      document.body.appendChild(script);
    }).catch(function (error) {
      ecosystemLoader.innerHTML = "";
      const title = document.createElement("strong");
      const detail = document.createElement("small");
      title.textContent = "BIOSPHERE FAILED TO INITIALIZE";
      detail.textContent = error.message;
      ecosystemLoader.append(title, detail);
      showToast("Unable to load the ecosystem");
      return null;
    });

    return ecosystemLoadPromise;
  }

  function loadCpu() {
    if (window.CPU_LAB) {
      cpuLoader.hidden = true;
      window.CPU_LAB.setActive(true);
      return Promise.resolve(window.CPU_LAB);
    }

    if (cpuLoadPromise) {
      return cpuLoadPromise;
    }

    cpuLoader.hidden = false;
    cpuLoadPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = shell.dataset.cpuScript;
      script.async = true;

      script.addEventListener("load", function () {
        if (!window.CPU_LAB) {
          reject(new Error("The CPU lab lifecycle API did not initialize."));
          return;
        }

        cpuLoader.hidden = true;
        window.CPU_LAB.setActive(activeRoute === "cpu");
        resolve(window.CPU_LAB);
      });

      script.addEventListener("error", function () {
        reject(new Error("The CPU lab script could not be loaded."));
      });

      document.body.appendChild(script);
    }).catch(function (error) {
      cpuLoader.innerHTML = "";
      const content = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("small");
      content.className = "cpu-loader__content";
      title.textContent = "CPU LAB FAILED TO INITIALIZE";
      detail.textContent = error.message;
      content.append(title, detail);
      cpuLoader.appendChild(content);
      showToast("Unable to load the CPU lab");
      return null;
    });

    return cpuLoadPromise;
  }

  function setFactoryRoute(machineName) {
    factoryMap.dataset.activeMachine = machineName || "";
  }

  function machineLostFocus(machine) {
    window.requestAnimationFrame(function () {
      if (!machine.matches(":hover") && !machine.contains(document.activeElement)) {
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
      const focusedMachine = target instanceof Element && target.closest(".machine");
      if (focusedMachine) {
        focusedMachine.blur();
        setFactoryRoute("");
        return;
      }

      if (!targetIsEditable && activeRoute !== "home") {
        event.preventDefault();
        window.location.hash = ["ecosystem", "cpu"].includes(activeRoute) ? "projects" : "home";
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
