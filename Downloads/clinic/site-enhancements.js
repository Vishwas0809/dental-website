(function () {
    var whatsappNumber = "919760867857";

    function trackEvent(name, payload) {
        if (typeof window.gtag === "function") {
            window.gtag("event", name, payload || {});
        }

        try {
            var events = JSON.parse(localStorage.getItem("clinic_events") || "[]");
            events.push({
                name: name,
                payload: payload || {},
                createdAt: new Date().toISOString()
            });
            localStorage.setItem("clinic_events", JSON.stringify(events.slice(-300)));
        } catch (error) {
            console.warn("Unable to store analytics event", error);
        }
    }

    function saveLead(data) {
        try {
            var leads = JSON.parse(localStorage.getItem("clinic_leads") || "[]");
            leads.push({
                id: Date.now(),
                createdAt: new Date().toISOString(),
                source: window.location.pathname,
                status: "new",
                data: data
            });
            localStorage.setItem("clinic_leads", JSON.stringify(leads.slice(-500)));
        } catch (error) {
            console.warn("Unable to store lead", error);
        }
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "Flexible";
        }

        var date = new Date(dateValue + "T00:00:00");
        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
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

        if ((data.mode || "").trim()) {
            lines.push("Consultation Mode: " + sanitizeValue(data.mode));
        }

        if ((data.concern || "").trim()) {
            lines.push("Concern: " + sanitizeValue(data.concern));
        }

        lines.push("Source Page: " + window.location.pathname);
        return lines.join("\n");
    }

    function setupMobileNav() {
        var toggle = document.querySelector("[data-menu-toggle]");
        var nav = document.querySelector("[data-mobile-nav]");
        var overlay = document.querySelector("[data-mobile-overlay]");

        if (!toggle || !nav || !overlay) {
            return;
        }

        function setState(open) {
            nav.classList.toggle("open", open);
            overlay.classList.toggle("show", open);
            document.body.classList.toggle("menu-open", open);
            toggle.setAttribute("aria-expanded", String(open));
        }

        toggle.addEventListener("click", function () {
            setState(!nav.classList.contains("open"));
        });

        overlay.addEventListener("click", function () {
            setState(false);
        });

        nav.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                setState(false);
            });
        });
    }

    function setupBackToTop() {
        var button = document.getElementById("backToTop");
        if (!button) {
            return;
        }

        function sync() {
            button.classList.toggle("show", window.scrollY > 480);
        }

        window.addEventListener("scroll", sync, { passive: true });
        button.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
        sync();
    }

    function setupReveal() {
        var items = document.querySelectorAll(".reveal");
        if (!items.length || !("IntersectionObserver" in window)) {
            items.forEach(function (item) {
                item.classList.add("visible");
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.14 });

        items.forEach(function (item) {
            observer.observe(item);
        });
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
        if (!forms.length) {
            return;
        }

        var today = new Date().toISOString().split("T")[0];

        forms.forEach(function (form) {
            var dateInput = form.querySelector('input[type="date"]');
            var status = form.querySelector("[data-form-status]");

            if (dateInput) {
                dateInput.min = today;
            }

            form.querySelectorAll("input, select, textarea").forEach(function (field) {
                field.addEventListener("invalid", function () {
                    if (status) {
                        status.textContent = "Please check the highlighted field before submitting.";
                    }
                });
            });

            form.querySelectorAll('input[type="tel"]').forEach(function (phoneInput) {
                phoneInput.addEventListener("input", function () {
                    phoneInput.value = normalizePhone(phoneInput.value).slice(0, 10);
                    phoneInput.setCustomValidity("");
                });
            });

            form.addEventListener("submit", function (event) {
                event.preventDefault();

                var consent = form.querySelector('[name="consent"]');
                if (consent && !consent.checked) {
                    if (status) {
                        status.textContent = "Please consent so we can contact you about your appointment.";
                    }
                    return;
                }

                var formData = new FormData(form);
                var phone = normalizePhone(formData.get("phone"));

                if (!isValidIndianMobile(phone)) {
                    var phoneInput = form.querySelector('input[type="tel"]');
                    if (phoneInput) {
                        phoneInput.setCustomValidity("Enter a valid 10-digit Indian mobile number.");
                        phoneInput.reportValidity();
                    }
                    if (status) {
                        status.textContent = "Please enter a valid 10-digit Indian mobile number.";
                    }
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
                trackEvent("lead_form_submitted", {
                    type: form.getAttribute("data-form-type"),
                    page: window.location.pathname,
                    treatment: data.treatment
                });

                if (status) {
                    status.textContent = "Opening WhatsApp so the clinic can confirm your request quickly.";
                }

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

    window.clinicMarketing = {
        trackEvent: trackEvent
    };

    setupMobileNav();
    setupBackToTop();
    setupReveal();
    setupTrackables();
    setupLeadForms();
    setCurrentYear();
})();
