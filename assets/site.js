/* Surya Narayanan K S — portfolio
   Two small behaviours: the service board in the hero, and "Copy address".
   The page is complete without this file; the board simply shows its end state. */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ------------------------------------------------------------- board */

  var grid = document.getElementById("board-grid");
  var statusLine = document.getElementById("board-status");
  var replay = document.getElementById("board-replay");

  if (grid && statusLine && replay) {
    var tiles = Array.prototype.slice.call(grid.querySelectorAll(".tile:not(.tile--more)"));
    var total = tiles.length;
    var timers = [];

    /* Start order: a few "infrastructure" tiles first, then the rest in a
       fixed scatter so it reads as services with dependencies, not a wipe. */
    var order = [0, 7, 14, 1, 9, 3, 16, 5, 11, 18, 2, 8, 13, 6, 19, 4, 10, 15, 12, 17];
    var STEP = 150; // ms between one service and the next beginning to start
    var BOOT = 520; // ms a service spends in "starting"
    var LEAD = 350; // ms pause before the first one

    function clearTimers() {
      timers.forEach(function (id) {
        window.clearTimeout(id);
      });
      timers = [];
    }

    function later(fn, ms) {
      timers.push(window.setTimeout(fn, ms));
    }

    function report(healthy) {
      statusLine.textContent =
        healthy >= total ? "All services healthy" : "Starting: " + healthy + " of " + total + "+ healthy";
    }

    function finish() {
      tiles.forEach(function (tile) {
        tile.dataset.state = "healthy";
      });
      report(total);
      replay.disabled = false;
    }

    function run() {
      var healthy = 0;
      clearTimers();
      replay.disabled = true;
      tiles.forEach(function (tile) {
        tile.dataset.state = "waiting";
      });
      report(0);

      order.forEach(function (tileIndex, position) {
        var tile = tiles[tileIndex];
        if (!tile) return;
        var startAt = LEAD + position * STEP;
        later(function () {
          tile.dataset.state = "starting";
        }, startAt);
        later(function () {
          tile.dataset.state = "healthy";
          healthy += 1;
          report(healthy);
          if (healthy >= total) replay.disabled = false;
        }, startAt + BOOT + (position % 3) * 90);
      });

      /* Safety net: whatever happens to the timers, end in the healthy state. */
      later(finish, LEAD + order.length * STEP + BOOT + 1200);
    }

    replay.hidden = false;
    replay.addEventListener("click", run);

    /* Play once on arrival, unless the visitor has asked for less motion. */
    if (!reducedMotion.matches) {
      if (document.visibilityState === "visible") {
        run();
      } else {
        document.addEventListener("visibilitychange", function onVisible() {
          if (document.visibilityState === "visible") {
            document.removeEventListener("visibilitychange", onVisible);
            run();
          }
        });
      }
    }
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
  function plural(count, word) {
    return count + " " + word + (count === 1 ? "" : "s");
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-since]"), function (node) {
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
