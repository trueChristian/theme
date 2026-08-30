(function initializeTrueChristianHeaders() {
  const mobileQuery = window.matchMedia("(max-width: 959px)");
  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  document.querySelectorAll("[data-tcc-global-header]").forEach((header) => {
    const toggle = header.querySelector(".tcc-header__toggle");
    const navigation = header.querySelector(".tcc-header__navigation");
    const closeButton = header.querySelector(".tcc-header__close");
    const scrim = header.querySelector(".tcc-header__scrim");
    const submenuButtons = header.querySelectorAll(".has-submenu > button");
    let returnFocusTo = null;

    if (!toggle || !navigation || !closeButton || !scrim) return;

    const collapseSubmenus = (except) => {
      submenuButtons.forEach((button) => {
        if (button === except) return;
        button.setAttribute("aria-expanded", "false");
        button.closest(".has-submenu")?.removeAttribute("data-submenu-open");
      });
    };

    const setMenuOpen = (open, restoreFocus = true) => {
      const nextOpen = Boolean(open && mobileQuery.matches);
      header.dataset.menuOpen = String(nextOpen);
      toggle.setAttribute("aria-expanded", String(nextOpen));
      navigation.toggleAttribute("inert", mobileQuery.matches && !nextOpen);
      if (mobileQuery.matches) navigation.setAttribute("aria-hidden", String(!nextOpen));
      else navigation.removeAttribute("aria-hidden");
      document.documentElement.classList.toggle("tcc-menu-open", nextOpen);

      if (nextOpen) {
        returnFocusTo = document.activeElement;
        closeButton.focus();
      } else {
        collapseSubmenus();
        if (restoreFocus && returnFocusTo instanceof HTMLElement) returnFocusTo.focus();
        returnFocusTo = null;
      }
    };

    toggle.addEventListener("click", () => setMenuOpen(header.dataset.menuOpen !== "true"));
    closeButton.addEventListener("click", () => setMenuOpen(false));
    scrim.addEventListener("click", () => setMenuOpen(false));

    submenuButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const open = button.getAttribute("aria-expanded") !== "true";
        collapseSubmenus(button);
        button.setAttribute("aria-expanded", String(open));
        button.closest(".has-submenu")?.toggleAttribute("data-submenu-open", open);
      });
    });

    navigation.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (mobileQuery.matches && header.dataset.menuOpen === "true") {
          setMenuOpen(false);
        } else {
          const owningItem = document.activeElement?.closest?.(".has-submenu");
          const owningTrigger = owningItem?.querySelector(":scope > button");
          const expandedTrigger = [...submenuButtons].find(
            (button) => button.getAttribute("aria-expanded") === "true"
          );
          collapseSubmenus();
          (owningTrigger || expandedTrigger)?.focus();
        }
        return;
      }
      if (event.key !== "Tab" || header.dataset.menuOpen !== "true") return;

      const focusable = [...navigation.querySelectorAll(focusableSelector)].filter(
        (element) => !element.closest("[inert]") && element.getClientRects().length > 0
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && header.dataset.menuOpen === "true") setMenuOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) collapseSubmenus();
    });

    const syncBreakpoint = () => setMenuOpen(false, false);
    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", syncBreakpoint);
    else mobileQuery.addListener?.(syncBreakpoint);
    syncBreakpoint();
  });
})();
