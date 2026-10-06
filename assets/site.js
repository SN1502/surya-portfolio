/* Surya Narayanan K S — portfolio
   Behaviours, in page order:
     theme      light / dark switch, remembered on this device
     dock       section bar that appears below the header, with the current section marked
     board      the service board in the header: watch it start, then stop and start services
     explore    pick a skill, see only the work and projects that used it
     demos      small working slices of two projects
     copy       "Copy address"
     duration   time in the current role, counted to this month
   The page is complete without this file: everything interactive is hidden
   in the HTML and switched on here. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  function plural(count, word) {
    return count + " " + word + (count === 1 ? "" : "s");
  }

  /* ------------------------------------------------------------- theme */

  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  var themeButtons = document.querySelectorAll("[data-theme-toggle]");

  function currentTheme() {
    var set = root.getAttribute("data-theme");
    if (set === "light" || set === "dark") return set;
    return darkQuery.matches ? "dark" : "light";
  }

  function labelThemeButtons() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    each(themeButtons, function (button) {
      button.setAttribute("aria-label", "Switch to " + next + " theme");
      button.title = "Switch to " + next + " theme";
    });
  }

  each(themeButtons, function (button) {
    button.hidden = false;
    button.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        window.localStorage.setItem("theme", next);
      } catch (error) {
        /* Private mode or blocked storage: the choice lasts for this visit only. */
      }
      labelThemeButtons();
    });
  });

  if (darkQuery.addEventListener) darkQuery.addEventListener("change", labelThemeButtons);
  labelThemeButtons();

  /* -------------------------------------------------------------- dock */

  var dock = document.getElementById("dock");
  var hero = document.querySelector(".hero");

  if (dock && hero) {
    var dockNav = dock.querySelector(".dock__nav");
    var dockLinks = dock.querySelectorAll(".dock__nav a");
    var spied = [];

    each(dockLinks, function (link) {
      var target = document.getElementById(link.getAttribute("href").slice(1));
      if (target) spied.push({ link: link, target: target });
    });

    var showDock = function (shown) {
      dock.setAttribute("data-shown", shown ? "true" : "false");
    };

    var markCurrent = function () {
      /* The current section is the one crossing a line a third of the way
         down the window. Sections without a link here mark nothing. */
      var line = window.innerHeight * 0.35;
      var current = null;
      spied.forEach(function (entry) {
        if (entry.target.hidden) return;
        var box = entry.target.getBoundingClientRect();
        if (box.top <= line && box.bottom > line) current = entry;
      });
      /* At the very bottom the last section may be too short to reach the line. */
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 && spied.length) {
        current = spied[spied.length - 1];
      }
      spied.forEach(function (entry) {
        if (entry === current) {
          if (entry.link.getAttribute("aria-current") !== "true") {
            entry.link.setAttribute("aria-current", "true");
            /* Keep the marked link in view when the bar scrolls sideways on a phone. */
            var left = entry.link.offsetLeft - (dockNav.clientWidth - entry.link.offsetWidth) / 2;
            if (dockNav.scrollTo) dockNav.scrollTo({ left: Math.max(0, left), behavior: reducedMotion.matches ? "auto" : "smooth" });
          }
        } else {
          entry.link.removeAttribute("aria-current");
        }
      });
    };

    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        showDock(hero.getBoundingClientRect().bottom <= 0);
        markCurrent();
      });
    };

    dock.hidden = false;
    showDock(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  /* ------------------------------------------------------------- board */

  var grid = document.getElementById("board-grid");
  var statusLine = document.getElementById("board-status");
  var controls = document.getElementById("board-controls");
  var restartButton = document.getElementById("board-restart");
  var stopButton = document.getElementById("board-stop");

  if (grid && statusLine && controls && restartButton && stopButton) {
    var COLUMNS = Number(grid.getAttribute("data-columns")) || 7;
    var STEP = 150; // ms between one service and the next beginning to start
    var BOOT = 520; // ms a service spends in "starting"
    var LEAD = 350; // ms pause before the first one

    /* Start order: a fixed scatter, so it reads as services with dependencies
       coming up, not a left-to-right wipe. */
    var ORDER = [0, 7, 14, 1, 9, 3, 16, 5, 11, 18, 2, 8, 13, 6, 19, 4, 10, 15, 12, 17];

    var tiles = [];
    var tileTimers = [];
    var sequenceTimers = [];

    /* The HTML ships plain boxes in their end state. Swap each for a button. */
    each(grid.querySelectorAll(".tile:not(.tile--more)"), function (box, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "tile";
      button.setAttribute("data-state", "healthy");
      button.tabIndex = index === 0 ? 0 : -1;
      grid.replaceChild(button, box);
      tiles.push(button);
      tileTimers.push(0);
    });

    var total = tiles.length;

    var describe = function (index) {
      var state = tiles[index].getAttribute("data-state");
      var action = state === "stopped" ? " Press to start it." : state === "healthy" ? " Press to stop it." : "";
      tiles[index].setAttribute("aria-label", "Service " + (index + 1) + ", " + state + "." + action);
    };

    var report = function () {
      var healthy = 0;
      var starting = 0;
      tiles.forEach(function (tile) {
        var state = tile.getAttribute("data-state");
        if (state === "healthy") healthy += 1;
        if (state === "starting") starting += 1;
      });
      var text;
      if (healthy === total) text = "All services healthy";
      else if (starting > 0) text = "Starting: " + healthy + " of " + total + "+ healthy";
      else if (healthy === 0) text = "All services stopped";
      else text = healthy + " of " + total + "+ healthy, " + (total - healthy) + " stopped";
      statusLine.textContent = text;
    };

    var setState = function (index, state) {
      tiles[index].setAttribute("data-state", state);
      describe(index);
    };

    var stopOne = function (index) {
      window.clearTimeout(tileTimers[index]);
      setState(index, "stopped");
    };

    var startOne = function (index, bootTime) {
      window.clearTimeout(tileTimers[index]);
      setState(index, "starting");
      tileTimers[index] = window.setTimeout(function () {
        setState(index, "healthy");
        report();
      }, bootTime);
    };

    var clearSequence = function () {
      sequenceTimers.forEach(function (id) {
        window.clearTimeout(id);
      });
      sequenceTimers = [];
    };

    var stopAll = function () {
      clearSequence();
      tiles.forEach(function (tile, index) {
        stopOne(index);
      });
      report();
    };

    var restartAll = function () {
      stopAll();
      ORDER.forEach(function (tileIndex, position) {
        if (!tiles[tileIndex]) return;
        sequenceTimers.push(
          window.setTimeout(function () {
            startOne(tileIndex, BOOT + (position % 3) * 90);
            report();
          }, LEAD + position * STEP)
        );
      });
    };

    var focusTile = function (index) {
      if (index < 0 || index >= total) return;
      tiles.forEach(function (tile, i) {
        tile.tabIndex = i === index ? 0 : -1;
      });
      tiles[index].focus();
    };

    tiles.forEach(function (tile, index) {
      describe(index);

      tile.addEventListener("click", function () {
        var state = tile.getAttribute("data-state");
        if (state === "stopped") startOne(index, BOOT);
        else stopOne(index);
        report();
      });

      /* One tab stop for the whole grid; arrow keys move within it. */
      tile.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowRight") next = index + 1;
        else if (event.key === "ArrowLeft") next = index - 1;
        else if (event.key === "ArrowDown") next = index + COLUMNS;
        else if (event.key === "ArrowUp") next = index - COLUMNS;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = total - 1;
        if (next === null) return;
        event.preventDefault();
        focusTile(Math.max(0, Math.min(total - 1, next)));
      });

      tile.addEventListener("focus", function () {
        tiles.forEach(function (other, i) {
          other.tabIndex = i === index ? 0 : -1;
        });
      });
    });

    grid.removeAttribute("aria-hidden");
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "Services. Arrow keys move between them; Enter or Space stops or starts one.");
    controls.hidden = false;
    restartButton.addEventListener("click", restartAll);
    stopButton.addEventListener("click", stopAll);
    report();

    /* Play the start-up once on arrival, unless the visitor asked for less motion. */
    if (!reducedMotion.matches) {
      if (document.visibilityState === "visible") {
        restartAll();
      } else {
        document.addEventListener("visibilitychange", function onVisible() {
          if (document.visibilityState === "visible") {
            document.removeEventListener("visibilitychange", onVisible);
            restartAll();
          }
        });
      }
    }
  }

  /* ----------------------------------------------------------- explore */

  var explore = document.getElementById("explore");
  var chipGroup = document.getElementById("skill-chips");
  var skillResult = document.getElementById("skill-result");
  var filterbar = document.getElementById("filterbar");
  var filterbarText = document.getElementById("filterbar-text");
  var filterbarClear = document.getElementById("filterbar-clear");
  var workEmpty = document.getElementById("work-empty");
  var projectsEmpty = document.getElementById("projects-empty");

  if (explore && chipGroup && skillResult) {
    var chips = chipGroup.querySelectorAll(".chip");
    var roles = document.querySelectorAll("#work .role");
    var projects = document.querySelectorAll("#projects .project");
    var labels = {};
    var activeSkill = "";

    each(chips, function (chip) {
      labels[chip.getAttribute("data-skill")] = chip.textContent.trim();
    });

    var uses = function (node, skill) {
      return (" " + (node.getAttribute("data-skills") || "") + " ").indexOf(" " + skill + " ") !== -1;
    };

    var writeAddress = function (skill) {
      if (!window.history || !window.history.replaceState || !window.URL) return;
      try {
        var address = new URL(window.location.href);
        if (skill) address.searchParams.set("skill", skill);
        else address.searchParams.delete("skill");
        window.history.replaceState(null, "", address.pathname + address.search + address.hash);
      } catch (error) {
        /* A file:// preview or an old browser: the filter still works, the address just stays put. */
      }
    };

    var applySkill = function (skill, options) {
      if (skill && !labels[skill]) skill = "";
      activeSkill = skill;
      var workCount = 0;
      var projectCount = 0;

      each(chips, function (chip) {
        chip.setAttribute("aria-pressed", chip.getAttribute("data-skill") === skill ? "true" : "false");
      });

      each(roles, function (role) {
        var shownInRole = 0;
        each(role.querySelectorAll("li[data-skills]"), function (point) {
          var show = !skill || uses(point, skill);
          point.hidden = !show;
          if (show) shownInRole += 1;
        });
        role.hidden = shownInRole === 0;
        if (skill) workCount += shownInRole;
      });

      each(projects, function (project) {
        var show = !skill || uses(project, skill);
        project.hidden = !show;
        if (show && skill) projectCount += 1;
      });

      if (!skill) {
        skillResult.textContent = "Showing everything.";
        if (workEmpty) workEmpty.hidden = true;
        if (projectsEmpty) projectsEmpty.hidden = true;
        if (filterbar) filterbar.hidden = true;
      } else {
        var name = labels[skill];
        var atWork = workCount === 0 ? "nothing at work" : workCount === 1 ? "1 thing at work" : workCount + " things at work";
        var inProjects = projectCount === 0 ? "no projects" : plural(projectCount, "project");
        skillResult.textContent = name + ": " + atWork + " and " + inProjects + ". Press it again to show everything.";

        if (workEmpty) {
          workEmpty.hidden = workCount !== 0;
          workEmpty.textContent = "I haven’t used " + name + " at work. It’s in the projects below.";
        }
        if (projectsEmpty) {
          projectsEmpty.hidden = projectCount !== 0;
          projectsEmpty.textContent = "None of these projects use " + name + ". It’s in my work above.";
        }
        if (filterbar && filterbarText) {
          filterbarText.textContent = "Showing " + name + " only";
          filterbar.hidden = false;
        }
      }

      if (!options || options.address !== false) writeAddress(skill);
    };

    each(chips, function (chip) {
      chip.addEventListener("click", function () {
        var skill = chip.getAttribute("data-skill");
        applySkill(skill === activeSkill ? "" : skill);
      });
    });

    if (filterbarClear) {
      filterbarClear.addEventListener("click", function () {
        applySkill("");
        explore.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
      });
    }

    explore.hidden = false;

    /* A shared link such as …/?skill=docker opens with that skill picked. */
    var asked = "";
    try {
      asked = new URL(window.location.href).searchParams.get("skill") || "";
    } catch (error) {
      asked = "";
    }
    applySkill(asked.toLowerCase(), { address: false });
  }

  /* ------------------------------------------------------------- demos */

  /* Numbers the Indian way: 1,00,000. */
  var groupedWhole = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  var groupedTwo = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var groupedFour = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 });
  var significant = new Intl.NumberFormat("en-IN", { maximumSignificantDigits: 4 });

  /* "1,00,000", "₹ 5,250.50", "7.5%" → number, or NaN. */
  function toNumber(text) {
    var cleaned = String(text === null || text === undefined ? "" : text)
      .trim()
      .replace(/₹|rs\.?|inr|%|,|\s/gi, "");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
    return parseFloat(cleaned);
  }

  /* --- Nila Alavai: every unit is defined by its size in square feet,
         so any conversion is value × (from, in sq ft) ÷ (to, in sq ft). */

  var landDemo = document.getElementById("demo-land");
  var landValue = document.getElementById("land-value");
  var landUnit = document.getElementById("land-unit");
  var landRows = document.getElementById("land-rows");
  var landError = document.getElementById("land-error");

  if (landDemo && landValue && landUnit && landRows && landError) {
    var SQFT_PER_SQM = 1 / 0.09290304; // from the exact international foot, 0.3048 m
    var UNITS = [
      { id: "cent", sqft: 435.6, en: "Cent", ta: "சென்ட்", abbr: "cent" },
      { id: "ground", sqft: 2400, en: "Ground", ta: "கிரவுண்ட்", abbr: "ground" },
      { id: "acre", sqft: 43560, en: "Acre", ta: "ஏக்கர்", abbr: "ac" },
      { id: "sqft", sqft: 1, en: "Square foot", ta: "சதுர அடி", abbr: "sq ft" },
      { id: "sqm", sqft: SQFT_PER_SQM, en: "Square metre", ta: "சதுர மீட்டர்", abbr: "sq m" },
      { id: "hectare", sqft: 10000 * SQFT_PER_SQM, en: "Hectare", ta: "ஹெக்டேர்", abbr: "ha" },
      { id: "kuzhi", sqft: 144, en: "Kuzhi", ta: "குழி", abbr: "kuzhi" },
      { id: "ma", sqft: 14400, en: "Ma", ta: "மா", abbr: "ma" }
    ];

    var formatArea = function (value) {
      if (!isFinite(value)) return "–";
      if (value === 0) return "0";
      if (Math.abs(value) >= 1e15) return value.toExponential(4);
      if (Math.abs(value) < 0.0001) return significant.format(value);
      return groupedFour.format(value);
    };

    UNITS.forEach(function (unit) {
      var option = document.createElement("option");
      option.value = unit.id;
      option.textContent = unit.en + " (" + unit.ta + ")";
      landUnit.appendChild(option);
    });
    landUnit.value = "cent";

    var renderLand = function () {
      var amount = toNumber(landValue.value);
      var from = null;
      UNITS.forEach(function (unit) {
        if (unit.id === landUnit.value) from = unit;
      });
      var valid = isFinite(amount) && amount >= 0 && from;
      landError.hidden = !!valid;
      landValue.setAttribute("aria-invalid", valid ? "false" : "true");
      landRows.textContent = "";
      landRows.parentNode.hidden = !valid;
      if (!valid) return;

      var squareFeet = amount * from.sqft;
      UNITS.forEach(function (unit) {
        if (unit === from) return;
        var row = document.createElement("tr");
        var name = document.createElement("th");
        name.scope = "row";
        name.appendChild(document.createTextNode(unit.en + " "));
        var tamil = document.createElement("span");
        tamil.lang = "ta";
        tamil.textContent = unit.ta;
        name.appendChild(tamil);
        var figure = document.createElement("td");
        figure.textContent = formatArea(squareFeet / unit.sqft) + " " + unit.abbr;
        row.appendChild(name);
        row.appendChild(figure);
        landRows.appendChild(row);
      });
    };

    landValue.addEventListener("input", renderLand);
    landUnit.addEventListener("change", renderLand);
    landDemo.hidden = false;
    renderLand();
  }

  /* --- Deposit Manager: the app's own rules.
         Mature date = deposit date + days.
         Months = days × 12 ÷ 365, rounded (180 days = 6, 365 = 12).
         Interest = value × rate × months ÷ 12; under one month, by days ÷ 365.
         Status = Matured once the date has passed, Maturing soon within 30 days. */

  var depositDemo = document.getElementById("demo-deposit");
  var depValue = document.getElementById("dep-value");
  var depRate = document.getElementById("dep-rate");
  var depDays = document.getElementById("dep-days");
  var depDate = document.getElementById("dep-date");
  var depError = document.getElementById("dep-error");
  var depMature = document.getElementById("dep-mature");
  var depMonths = document.getElementById("dep-months");
  var depInterest = document.getElementById("dep-interest");
  var depPosition = document.getElementById("dep-position");

  if (depositDemo && depValue && depRate && depDays && depDate && depError && depMature && depMonths && depInterest && depPosition) {
    var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var DAY = 86400000;
    var MATURING_SOON_DAYS = 30;

    var pad = function (n) {
      return (n < 10 ? "0" : "") + n;
    };

    /* Dates are handled as calendar days in UTC so daylight saving can't shift them. */
    var parseDay = function (text) {
      var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || "");
      if (!parts) return NaN;
      var ms = Date.UTC(+parts[1], +parts[2] - 1, +parts[3]);
      var check = new Date(ms);
      if (check.getUTCMonth() !== +parts[2] - 1 || check.getUTCDate() !== +parts[3]) return NaN;
      return ms;
    };

    var todayUTC = function () {
      var now = new Date();
      return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    };

    var showDay = function (ms) {
      var d = new Date(ms);
      return d.getUTCDate() + " " + MONTH_NAMES[d.getUTCMonth()] + " " + d.getUTCFullYear();
    };

    var round2 = function (n) {
      return Math.round((+n + Number.EPSILON) * 100) / 100;
    };

    var money = function (n) {
      n = round2(n);
      return "₹" + (n % 1 === 0 ? groupedWhole.format(n) : groupedTwo.format(n));
    };

    var today = todayUTC();
    var todayDate = new Date(today);
    depDate.value = todayDate.getUTCFullYear() + "-" + pad(todayDate.getUTCMonth() + 1) + "-" + pad(todayDate.getUTCDate());

    var renderDeposit = function () {
      var amount = toNumber(depValue.value);
      var rate = toNumber(depRate.value);
      var days = toNumber(depDays.value);
      var start = parseDay(depDate.value);
      var valid = amount > 0 && rate > 0 && days > 0 && days <= 36500 && isFinite(start);

      depError.hidden = valid;
      if (!valid) {
        depMature.textContent = depMonths.textContent = depInterest.textContent = depPosition.textContent = "–";
        return;
      }

      days = Math.round(days);
      var mature = start + days * DAY;
      var months = Math.round((days * 12) / 365);
      var years = months >= 1 ? months / 12 : days / 365;
      var interest = round2(((amount * rate) / 100) * years);
      var now = todayUTC();
      var position = mature < now ? "Matured" : mature <= now + MATURING_SOON_DAYS * DAY ? "Maturing soon" : "Active";

      depMature.textContent = showDay(mature);
      depMonths.textContent = months >= 1 ? plural(months, "month") : plural(days, "day");
      depInterest.textContent = money(interest);
      depPosition.textContent = position;
    };

    [depValue, depRate, depDays, depDate].forEach(function (field) {
      field.addEventListener("input", renderDeposit);
      field.addEventListener("change", renderDeposit);
    });
    depositDemo.hidden = false;
    renderDeposit();
  }

  /* -------------------------------------------------------------- copy */

  var copyButton = document.getElementById("copy-email");
  var copyStatus = document.getElementById("copy-status");
  var emailLink = document.getElementById("email");

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  if (copyButton && emailLink) {
    var address = emailLink.textContent.trim();
    var resetTimer;

    var showResult = function (ok) {
      copyButton.textContent = ok ? "Copied" : "Copy address";
      if (copyStatus) {
        copyStatus.textContent = ok ? "" : "Couldn’t copy. Select the address and copy it by hand.";
      }
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(function () {
        copyButton.textContent = "Copy address";
        if (copyStatus) copyStatus.textContent = "";
      }, ok ? 2200 : 6000);
    };

    copyButton.hidden = false;
    copyButton.addEventListener("click", function () {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(address).then(
          function () {
            showResult(true);
          },
          function () {
            showResult(fallbackCopy(address));
          }
        );
      } else {
        showResult(fallbackCopy(address));
      }
    });
  }

  /* ---------------------------------------------------------- duration */

  /* Time in a current role, counted to this month: <span data-since="2024-09">.
     The text already in the page is the fallback if this never runs. */
  each(document.querySelectorAll("[data-since]"), function (node) {
    var parts = /^(\d{4})-(\d{2})$/.exec(node.getAttribute("data-since") || "");
    if (!parts) return;
    var now = new Date();
    var months = (now.getFullYear() - Number(parts[1])) * 12 + (now.getMonth() + 1 - Number(parts[2]));
    if (!(months > 0)) return;
    var years = Math.floor(months / 12);
    var rest = months % 12;
    var text = [];
    if (years) text.push(plural(years, "year"));
    if (rest) text.push(plural(rest, "month"));
    node.textContent = text.join(" ");
  });

  /* -------------------------------------------------------------- year */

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
