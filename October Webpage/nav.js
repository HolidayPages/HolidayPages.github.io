const siteHeader = document.querySelector("header");

if (siteHeader) {
    const navMenu = siteHeader.querySelector(".nav-menu");
    const navToggle = siteHeader.querySelector(".nav-toggle");
    const menuIcon = navToggle?.querySelector("i");
    const mobileNav = window.matchMedia("(max-width: 1100px)");
    let previousScrollY = window.scrollY;
    let scrollDirection = "up";
    let pointerNearTop = false;

    const showHeader = () => siteHeader.classList.remove("nav-hidden");
    const setMenuOpen = (isOpen, restoreFocus = false) => {
        navMenu.classList.toggle("is-open", isOpen);
        navToggle.setAttribute("aria-expanded", String(isOpen));
        navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
        menuIcon.classList.toggle("fa-bars", !isOpen);
        menuIcon.classList.toggle("fa-xmark", isOpen);

        if (isOpen) {
            showHeader();
        } else if (restoreFocus) {
            navToggle.focus();
        }
    };
    const hideHeader = () => {
        if (!navMenu?.classList.contains("is-open") && !pointerNearTop && !siteHeader.matches(":hover, :focus-within")) {
            siteHeader.classList.add("nav-hidden");
        }
    };

    if (navMenu && navToggle && menuIcon) {
        navToggle.addEventListener("click", () => {
            setMenuOpen(!navMenu.classList.contains("is-open"));
        });

        navMenu.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => setMenuOpen(false));
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && navMenu.classList.contains("is-open")) {
                setMenuOpen(false, true);
            }
        });

        document.addEventListener("pointerdown", (event) => {
            if (mobileNav.matches && navMenu.classList.contains("is-open") && !siteHeader.contains(event.target)) {
                setMenuOpen(false);
            }
        });

        mobileNav.addEventListener("change", (event) => {
            if (!event.matches) {
                setMenuOpen(false);
            }
        });
    }

    document.addEventListener("pointermove", (event) => {
        pointerNearTop = event.clientY <= 12;

        if (pointerNearTop) {
            showHeader();
        } else if (scrollDirection === "down") {
            hideHeader();
        }
    });

    window.addEventListener("scroll", () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY <= 8) {
            scrollDirection = "up";
            showHeader();
        } else if (currentScrollY < previousScrollY) {
            scrollDirection = "up";
            showHeader();
        } else if (currentScrollY > previousScrollY) {
            scrollDirection = "down";
            hideHeader();
        }

        previousScrollY = currentScrollY;
    }, { passive: true });

    siteHeader.addEventListener("pointerenter", showHeader);
    siteHeader.addEventListener("pointerleave", () => {
        if (scrollDirection === "down" && !pointerNearTop) {
            hideHeader();
        }
    });
    siteHeader.addEventListener("focusin", showHeader);

    if (window.scrollY > 8) {
        siteHeader.classList.add("nav-hidden");
    }
}