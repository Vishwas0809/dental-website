(function () {
    var whatsappNumber = "919760867857";

    function trackEvent(name, payload) {
        if (typeof window.gtag === "function") {
            window.gtag("event", name, payload || {});
        }
        try {
            var events = JSON.parse(localStorage.getItem("clinic_events") || "[]");
            events.push({ name: name, payload: payload || {}, createdAt: new Date().toISOString() });
            localStorage.setItem("clinic_events", JSON.stringify(events.slice(-300)));
        } catch (error) {
            console.warn("Unable to store analytics event", error);
        }
    }

    function saveLead(data) {
        try {
            var leads = JSON.parse(localStorage.getItem("clinic_leads") || "[]");
            leads.push({ id: Date.now(), createdAt: new Date().toISOString(), source: window.location.pathname, status: "new", data: data });
            localStorage.setItem("clinic_leads", JSON.stringify(leads.slice(-500)));
        } catch (error) {
            console.warn("Unable to store lead", error);
        }
    }

    function formatDate(dateValue) {
        if (!dateValue) return "Flexible";
        var date = new Date(dateValue + "T00:00:00");
        if (Number.isNaN(date.getTime())) return dateValue;
        return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    }

    function sanitizeValue(value) {
        return (value || "").trim() || "Not provided";
    }

    function normalizePhone(value) {
        return (value || "").replace(/\D/g, "").replace(/^91(?=[6-9]\d{9}$)/, "");
    }

    function isValidIndianMobile(value) {
        return /^[6-9]\d{9}$/.test(normalizePhone(value));
    }

    function getLocalDateValue(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, "0");
        var day = String(date.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    function getLocalTimeValue(date) {
        var hours = String(date.getHours()).padStart(2, "0");
        var minutes = String(date.getMinutes()).padStart(2, "0");
        return hours + ":" + minutes;
    }

    function reportFieldError(field, message, status) {
        if (!field) return false;
        field.setCustomValidity(message || "");
        if (message && status) status.textContent = message;
        field.scrollIntoView({ behavior: "smooth", block: "center" });
        field.focus({ preventScroll: true });
        field.reportValidity();
        return !message;
    }

    function syncTimeMinimum(dateInput, timeInput) {
        if (!dateInput || !timeInput) return;
        var now = new Date();
        if (dateInput.value === getLocalDateValue(now)) {
            timeInput.min = getLocalTimeValue(now);
        } else {
            timeInput.removeAttribute("min");
        }
    }

    function updatePreferredDateTimeValidity(dateInput, timeInput) {
        var now = new Date();
        var today = getLocalDateValue(now);
        if (dateInput) dateInput.setCustomValidity("");
        if (timeInput) timeInput.setCustomValidity("");
        if (dateInput && dateInput.value && dateInput.value < today) {
            dateInput.setCustomValidity("Please choose today or a future date.");
        }
        if (timeInput && dateInput && dateInput.value === today && timeInput.value && timeInput.value < getLocalTimeValue(now)) {
            timeInput.setCustomValidity("Please choose a future time for today's appointment.");
        }
    }

    function validatePreferredDateTime(dateInput, timeInput, status) {
        var now = new Date();
        var today = getLocalDateValue(now);
        if (dateInput) {
            dateInput.setCustomValidity("");
            if (dateInput.value && dateInput.value < today) {
                return reportFieldError(dateInput, "Please choose today or a future date.", status);
            }
        }
        if (timeInput) {
            timeInput.setCustomValidity("");
            if (dateInput && dateInput.value === today && timeInput.value && timeInput.value < getLocalTimeValue(now)) {
                return reportFieldError(timeInput, "Please choose a future time for today's appointment.", status);
            }
        }
        return true;
    }

    function openWhatsApp(message) {
        var url = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message);
        window.open(url, "_blank", "noopener");
    }

    function buildLeadMessage(form, data) {
        var type = form.getAttribute("data-form-type") || "appointment";
        var title = {
            appointment: "*Clinic Appointment Request*",
            implants: "*Dental Implant Consultation Request*",
            consultation: "*Online Consultation Request*"
        }[type] || "*Dental Appointment Request*";
        var lines = [
            title,
            "Name: " + sanitizeValue(data.name),
            "Phone: " + sanitizeValue(data.phone),
            "Treatment: " + sanitizeValue(data.treatment),
            "Preferred Date: " + formatDate(data.date),
            "Preferred Time: " + sanitizeValue(data.time)
        ];
        if ((data.mode || "").trim()) lines.push("Consultation Mode: " + sanitizeValue(data.mode));
        if ((data.concern || "").trim()) lines.push("Concern: " + sanitizeValue(data.concern));
        lines.push("Source Page: " + window.location.pathname);
        return lines.join("\n");
    }

    function setupMobileNav() {
        var toggle = document.querySelector("[data-menu-toggle]");
        var nav = document.querySelector("[data-mobile-nav]");
        var overlay = document.querySelector("[data-mobile-overlay]");
        if (!toggle || !nav || !overlay) return;
        var navHome = { parent: nav.parentNode, nextSibling: nav.nextSibling };

        function syncNavHost() {
            var shouldUseBody = window.innerWidth <= 900;
            if (shouldUseBody && nav.parentNode !== document.body) {
                document.body.appendChild(nav);
            }
            if (!shouldUseBody && nav.parentNode === document.body && navHome.parent) {
                navHome.parent.insertBefore(nav, navHome.nextSibling);
            }
        }

        function setState(open) {
            syncNavHost();
            nav.classList.toggle("open", open);
            overlay.classList.toggle("show", open);
            document.body.classList.toggle("menu-open", open);
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
            if (open) {
                var firstLink = nav.querySelector("a");
                if (firstLink) firstLink.focus({ preventScroll: true });
            } else {
                toggle.focus({ preventScroll: true });
            }
        }

        toggle.addEventListener("click", function () { setState(!nav.classList.contains("open")); });
        overlay.addEventListener("click", function () { setState(false); });
        document.addEventListener("keydown", function (event) { if (event.key === "Escape") setState(false); });
        nav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", function () { setState(false); }); });
        window.addEventListener("resize", function () { syncNavHost(); if (window.innerWidth > 900) setState(false); });
        syncNavHost();
    }

    function setupActiveNav() {
        var links = document.querySelectorAll("nav a");
        if (!links.length) return;

        function normalizePath(value) {
            return (value || "/").replace(/\/+$/, "").replace(/\.html$/, "") || "/";
        }
        var path = normalizePath(window.location.pathname || "/");
        var pathTail = path.split("/").pop() || "";
        links.forEach(function (link) {
            var href = normalizePath(link.getAttribute("href") || "/");
            var hrefTail = href.split("/").pop() || "";
            if (href === path || (hrefTail && hrefTail === pathTail)) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            }
        });
    }

    function setupBackToTop() {
        var button = document.getElementById("backToTop");
        if (!button) {
            button = document.createElement("button");
            button.id = "backToTop";
            button.className = "back-to-top";
            button.type = "button";
            button.setAttribute("aria-label", "Back to top");
            button.innerHTML = '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';
            document.body.appendChild(button);
        }

        function sync() { button.classList.toggle("show", window.scrollY > 480); }
        window.addEventListener("scroll", sync, { passive: true });
        button.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
        sync();
    }

    function setupReveal() {
        var springItems = document.querySelectorAll(".reveal-spring");
        var clipItems = document.querySelectorAll(".reveal-clip");
        var allItems = document.querySelectorAll(".reveal, .reveal-spring, .reveal-clip");
        if ("IntersectionObserver" in window) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            if (springItems.length) {
                springItems.forEach(function (item, i) {
                    item.style.setProperty("--reveal-delay", (i % 4) * 80 + "ms");
                    if (item.getBoundingClientRect().top < window.innerHeight) {
                        item.classList.add("visible");
                    } else {
                        observer.observe(item);
                    }
                });
            }
            if (clipItems.length) {
                clipItems.forEach(function (item, i) {
                    item.style.setProperty("--reveal-delay", (i % 3) * 100 + "ms");
                    if (item.getBoundingClientRect().top < window.innerHeight) {
                        item.classList.add("visible");
                    } else {
                        observer.observe(item);
                    }
                });
            }
            var revealItems = document.querySelectorAll(".reveal:not(.reveal-spring):not(.reveal-clip)");
            if (revealItems.length) {
                revealItems.forEach(function (item, i) {
                    item.style.setProperty("--reveal-delay", (i % 4) * 70 + "ms");
                    if (item.getBoundingClientRect().top < window.innerHeight * 1.05) {
                        item.classList.add("visible");
                    } else {
                        observer.observe(item);
                    }
                });
            }
        } else {
            allItems.forEach(function (item) { item.classList.add("visible"); });
        }
    }

    function setupHeaderState() {
        var header = document.querySelector(".site-header");
        if (!header) return;

        function sync() {
            var y = window.scrollY;
            header.classList.toggle("is-scrolled", y > 12);
            header.classList.toggle("is-compact", y > 120);
        }
        window.addEventListener("scroll", sync, { passive: true });
        sync();
    }

    function setupSkipLink() {
        var main = document.querySelector("main");
        if (!main) return;
        if (!main.id) main.id = "main-content";
        if (document.querySelector(".skip-link")) return;
        var link = document.createElement("a");
        link.className = "skip-link";
        link.href = "#" + main.id;
        link.textContent = "Skip to main content";
        document.body.insertBefore(link, document.body.firstChild);
    }

    function setupTrackables() {
        document.querySelectorAll("[data-track]").forEach(function (element) {
            element.addEventListener("click", function () {
                trackEvent(element.getAttribute("data-track"), {
                    href: element.getAttribute("href") || null,
                    page: window.location.pathname
                });
            });
        });
    }

    function setupLeadForms() {
        var forms = document.querySelectorAll("[data-lead-form]");
        if (!forms.length) return;
        var today = getLocalDateValue(new Date());
        forms.forEach(function (form) {
            var dateInput = form.querySelector('input[type="date"]');
            var timeInput = form.querySelector('input[type="time"]');
            var status = form.querySelector("[data-form-status]");
            var firstInvalidHandled = false;
            if (dateInput) dateInput.min = today;
            syncTimeMinimum(dateInput, timeInput);
            form.querySelectorAll('[type="submit"], button:not([type]), button[type="submit"]').forEach(function (button) {
                button.addEventListener("click", function () { firstInvalidHandled = false; });
            });
            form.addEventListener("keydown", function (event) { if (event.key === "Enter") firstInvalidHandled = false; });
            form.querySelectorAll("input, select, textarea").forEach(function (field) {
                field.addEventListener("invalid", function () {
                    if (firstInvalidHandled) return;
                    firstInvalidHandled = true;
                    if (status) status.textContent = field.validationMessage || "Please check the highlighted field before submitting.";
                    field.scrollIntoView({ behavior: "smooth", block: "center" });
                    field.focus({ preventScroll: true });
                });
                field.addEventListener("input", function () { firstInvalidHandled = false; field.setCustomValidity(""); });
                field.addEventListener("change", function () { firstInvalidHandled = false; field.setCustomValidity(""); });
            });
            if (dateInput) {
                dateInput.addEventListener("change", function () {
                    dateInput.setCustomValidity("");
                    syncTimeMinimum(dateInput, timeInput);
                    updatePreferredDateTimeValidity(dateInput, timeInput);
                });
            }
            if (timeInput) {
                timeInput.addEventListener("input", function () {
                    timeInput.setCustomValidity("");
                    syncTimeMinimum(dateInput, timeInput);
                    updatePreferredDateTimeValidity(dateInput, timeInput);
                });
                timeInput.addEventListener("change", function () {
                    timeInput.setCustomValidity("");
                    syncTimeMinimum(dateInput, timeInput);
                    updatePreferredDateTimeValidity(dateInput, timeInput);
                });
            }
            form.querySelectorAll('input[type="tel"]').forEach(function (phoneInput) {
                phoneInput.addEventListener("input", function () {
                    phoneInput.value = normalizePhone(phoneInput.value).slice(0, 10);
                    phoneInput.setCustomValidity("");
                });
            });
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                firstInvalidHandled = false;
                var consent = form.querySelector('[name="consent"]');
                if (consent && !consent.checked) {
                    reportFieldError(consent, "Please consent so we can contact you about your appointment.", status);
                    return;
                }
                if (!validatePreferredDateTime(dateInput, timeInput, status)) return;
                var formData = new FormData(form);
                var phone = normalizePhone(formData.get("phone"));
                if (!isValidIndianMobile(phone)) {
                    var phoneInput = form.querySelector('input[type="tel"]');
                    if (phoneInput) {
                        phoneInput.setCustomValidity("Enter a valid 10-digit Indian mobile number.");
                        reportFieldError(phoneInput, "Enter a valid 10-digit Indian mobile number.", status);
                    }
                    if (status) status.textContent = "Please enter a valid 10-digit Indian mobile number.";
                    return;
                }
                var data = {
                    name: sanitizeValue(formData.get("name")),
                    phone: phone,
                    treatment: sanitizeValue(formData.get("treatment")),
                    date: sanitizeValue(formData.get("date")),
                    time: sanitizeValue(formData.get("time")),
                    mode: formData.get("mode") || "",
                    concern: formData.get("concern") || ""
                };
                saveLead(data);
                trackEvent("lead_form_submitted", { type: form.getAttribute("data-form-type"), page: window.location.pathname, treatment: data.treatment });
                if (status) status.textContent = "Opening WhatsApp so the clinic can confirm your request quickly.";
                openWhatsApp(buildLeadMessage(form, data));
                form.reset();
            });
        });
    }

    function setCurrentYear() {
        document.querySelectorAll("[data-current-year]").forEach(function (node) {
            node.textContent = String(new Date().getFullYear());
        });
    }

    window.clinicMarketing = { trackEvent: trackEvent };

    function setupWhatsAppLinks() {
        var message = "Hi, I would like to book an appointment at Bhuvneshwari Dental Clinic, Haridwar.";
        var encoded = encodeURIComponent(message);
        document.querySelectorAll('a[href*="wa.me/919760867857"]').forEach(function (link) {
            var href = link.getAttribute("href") || "";
            if (href.indexOf("text=") !== -1) return;
            link.setAttribute("href", href + (href.indexOf("?") === -1 ? "?" : "&") + "text=" + encoded);
        });
    }

    /* ===== NEW ANIMATIONS ===== */

    function setupScrollProgress() {
        var bar = document.createElement("div");
        bar.className = "scroll-progress";
        document.body.prepend(bar);

        function sync() {
            var scrollTop = window.scrollY;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var progress = docHeight > 0 ? scrollTop / docHeight : 0;
            bar.style.transform = "scaleX(" + Math.min(progress, 1) + ")";
        }
        window.addEventListener("scroll", sync, { passive: true });
        sync();
    }

    function setupParallax() {
        var targets = document.querySelectorAll(".hero-parallax");
        if (!targets.length) return;
        var ticking = false;

        function update() {
            if (window.innerWidth < 768) return;
            var scrollY = window.scrollY;
            targets.forEach(function (el) {
                var rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    var offset = scrollY * 0.15;
                    var move = Math.max(-40, offset * -0.3);
                    el.style.transform = "translateY(" + move + "px)";
                }
            });
            ticking = false;
        }

        window.addEventListener("scroll", function () {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    }

    function setupCounters() {
        var counters = document.querySelectorAll("[data-counter]");
        if (!counters.length) return;

        if (!("IntersectionObserver" in window)) {
            counters.forEach(function (el) { el.classList.add("visible"); el.textContent = el.getAttribute("data-counter"); });
            return;
        }

        counters.forEach(function (el) {
            el.classList.add("visible");
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                el.textContent = el.getAttribute("data-counter");
                return;
            }
            var target = parseFloat(el.getAttribute("data-counter"));
            var isDecimal = target % 1 !== 0;
            var duration = 1200;
            var startTime = null;

            function animate(now) {
                if (!startTime) startTime = now;
                var elapsed = now - startTime;
                var progress = Math.min(elapsed / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                var current = eased * target;
                el.textContent = isDecimal ? current.toFixed(1) : Math.round(current).toString();
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    el.textContent = el.getAttribute("data-counter");
                }
            }

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        startTime = null;
                        requestAnimationFrame(animate);
                        observer.unobserve(el);
                    }
                });
            }, { threshold: 0.3 });
            observer.observe(el);
        });
    }

    function setupMagneticButtons() {
        var buttons = document.querySelectorAll(".btn");
        if (!buttons.length || !window.matchMedia("(hover: hover)").matches) return;
        var bound = new WeakMap();

        buttons.forEach(function (btn) {
            var state = { x: 0, y: 0, raf: null, animating: false };

            function applyTransform() {
                btn.style.transform = "translate(" + state.x + "px, " + (state.y - 2) + "px)";
                state.animating = false;
            }

            function scheduleTransform() {
                if (!state.animating) {
                    state.animating = true;
                    state.raf = requestAnimationFrame(applyTransform);
                }
            }

            btn.addEventListener("mousemove", function (e) {
                var rect = btn.getBoundingClientRect();
                var cx = rect.left + rect.width / 2;
                var cy = rect.top + rect.height / 2;
                var dx = (e.clientX - cx) / rect.width;
                var dy = (e.clientY - cy) / rect.height;
                state.x = dx * 6;
                state.y = dy * 6;
                scheduleTransform();
            });

            btn.addEventListener("mouseleave", function () {
                state.x = 0;
                state.y = 0;
                scheduleTransform();
                btn.style.transition = "transform .4s cubic-bezier(.34,1.56,.64,1)";
                setTimeout(function () { btn.style.transition = ""; }, 400);
            });
        });
    }

    function setupRipple() {
        document.querySelectorAll(".btn").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                var ripple = document.createElement("span");
                ripple.className = "ripple";
                var rect = btn.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                ripple.style.left = x + "px";
                ripple.style.top = y + "px";
                btn.appendChild(ripple);
                setTimeout(function () { ripple.remove(); }, 600);
            });
        });
    }

    /* ===== INIT ===== */
    document.documentElement.classList.add("is-loaded");
    setupSkipLink();
    setupHeaderState();
    setupMobileNav();
    setupActiveNav();
    setupBackToTop();
    setupReveal();
    setupTrackables();
    setupLeadForms();
    setupWhatsAppLinks();
    setCurrentYear();
    setupScrollProgress();
    setupParallax();
    setupCounters();
    setupMagneticButtons();
    setupRipple();
})();
