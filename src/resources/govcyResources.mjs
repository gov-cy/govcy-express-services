export const staticResources = {
    //text content
    text: {
        submit: { 
            en: "Submit", 
            el: "Υποβολή", 
            tr: "Gönder" 
        },
        continue: { 
            en: "Continue", 
            el: "Συνέχεια", 
            tr: "Continue" 
        },
        cancel: { 
            en: "Cancel", 
            el: "Ακύρωση", 
            tr: "İptal" 
        },
        back: { 
            en: "Back", 
            el: "Πίσω", 
            tr: "Geri" 
        },
        change: { 
            en: "Change", 
            el: "Αλλαγή", 
            tr: "Değişiklik" 
        },
        formSuccess: { 
            en: "Your form has been submitted!", 
            el: "Η φόρμα σας έχει υποβληθεί!" ,
            tr: "Formunuz gönderild"
        },
        errorOccurred: { 
            en: "An error occurred. Please try again.", 
            el: "Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά.",
            tr: "Bir hata oluştu. Lutfen tekrar deneyiniz." 
        },
        errorPage404Title: {
            el: "Δεν βρέθηκε η σελίδα",
            en: "Page not found",
            tr: "Sayfa bulunamadı"
        },
        errorPage404Body: {
            el: "<p>Αν πληκτρολογήσατε την ηλεκτρονική διεύθυνση, ελέγξετε ότι είναι σωστή.</p><p>Αν αντιγράψατε την ηλεκτρονική διεύθυνση, ελέγξετε ότι επικολλήσατε ολόκληρη τη διεύθυνση.</p>",
            en: "<p>If you typed the web address, check it is correct.</p><p>If you copied and pasted the web address, check that you copied the entire address.</p>",
            tr: "<p>Web adresini yazdıysanız, doğru olduğunu kontrol edin.</p><p>Web adresini kopyalayıp yapıştırdıysanız, adresin tamamını kopyaladığınızdan emin olun.</p>"
        },
        errorPage403Title: {
            el: "Απαγορευμένη προσβαση",
            en: "Forbidden access",
            tr: "Yasaklı erişim"
        },
        errorPage403Body: {
            el: "<p><a href=\"/logout\">Αποσυνδεθείτε</a> και δοκιμάστε ξανά αργότερα.</p>",
            en: "<p><a href=\"/logout\">Sign out</a> and try again later.</p>",
            tr: "<p><a href=\"/logout\">Giriş yapmadan</a> sonra tekrar deneyiniz.</p>"
        },
        errorPage403NaturalOnlyPolicyBody: {
            el: "<p>Η πρόσβαση επιτρέπεται μόνο σε φυσικά πρόσωπα με επιβεβαιωμένο προφίλ. <a href=\"/logout\">Αποσυνδεθείτε</a> και δοκιμάστε ξανά αργότερα.</p>",
            en: "<p>Access is only allowed to individuals with a verified profile.<a href=\"/logout\">Sign out</a> and try again later.</p>",
            tr: "<p>Access is only allowed to individuals with a verified profile.<a href=\"/logout\">Giriş yapmadan</a> sonra tekrar deneyiniz.</p>"
        },
        errorPage500Title: {
            el: "Λυπούμαστε, υπάρχει πρόβλημα με την υπηρεσία",
            en: "Sorry, there is a problem with the service",
            tr: "Üzgünüz, serviste bir sorun var"
        },
        errorPage500Body: {
            el: "<p>Αποσυνδεθείτε και δοκιμάστε ξανά αργότερα.</p>",
            en: "<p>Sign out and try again later.</p>",
            tr: "<p>Giriş yapmadan sonra tekrar deneyiniz.</p>"
        },
        checkYourAnswersTitle : {
            en: "Check your answers",
            el: "Ελέγξτε τις απαντήσεις σας",
            tr: "Cevaplarınızı kontrol edin"
        },
        valueNotOnList : {
            en: "Select one of the available options",
            el: "Επιλέξτε μία από τις διαθέσιμες επιλογές",
            tr: "Mevcut seçeneklerden birini seçin"
        },
        submissionSuccessTitle : {
            en: "We have received your request",
            el: "Έχουμε λάβει την αίτησή σας",
            tr: "We have received your request"
        },
        yourSubmissionId : {
            en: "Your reference number: ",
            el: "Ο αριθμός αναφοράς: ",
            tr: "Your reference number: "
        },
        weHaveSendYouAnEmail : {
            en: "We have sent you a confirmation email.",
            el: "Έχουμε στείλει email επιβεβαιωσης.",
            tr: "We have sent you a confirmation email."
        },
        theDataFromYourRequest : {
            en: "The data from your request: ",
            el: "Τα δεδομένα της αίτησής σας: ",
            tr: "The data from your request: "
        },
        emailSubmissionPreHeader : {
            en: "We have received your request. ",
            el: "Έχουμε λάβει την αίτησή σας. ",
            tr: "We have received your request. "
        },
        fileUploaded : {
            en: "File uploaded",
            el: "Το αρχείο ανεβάστηκε",
            tr: "File uploaded"
        },
        fileNotUploaded : {
            en: "File has not been uploaded. ",
            el: "Το αρχείο δεν ανεβάστηκε. ",
            tr: "File has not been uploaded. "
        },
        fileYouHaveUploaded : {
            en: "You have uploaded the file for \"{{file}}\"",
            el: "Έχετε ανεβάσει το αρχείο \"{{file}}\"",
            tr: "You have uploaded the file for \"{{file}}\""
        },
        deleteFileTitle : {
            en: "Are you sure you want to delete the file \"{{file}}\"? ",
            el: "Είστε σίγουροι ότι θέλετε να διαγράψετε το αρχείο \"{{file}}\";",
            tr: "Are you sure you want to delete the file \"{{file}}\"? "
        },
        deleteYesOption: {
            el:"Ναι, θέλω να διαγράψω το αρχείο",
            en:"Yes, I want to delete this file",
            tr:"Yes, I want to delete this file"
        },
        deleteNoOption: {
            el:"Όχι, δεν θέλω να διαγράψω το αρχείο",
            en:"No, I don't want to delete this file",
            tr:"No, I don't want to delete this file"
        },
        deleteFileValidationError: {
            en: "Select if you want to delete the file",
            el: "Επιλέξτε αν θέλετε να διαγράψετε το αρχείο",
            tr: "Select if you want to delete the file"
        },
        viewFile: {
            en: "View file",
            el: "Προβολή αρχείου",
            tr: "View file"
        }
    },
    //remderer sections
    sections: {
        beforeMain : {name: "beforeMain", elements: []},
        main : {name: "main", elements: []}
    },
    //renderer elements
    elements: {
        govcyFormsJs: {
            element: "htmlElement",
            params: {
                text: {
                    en: `<script src="https://cdn.jsdelivr.net/gh/gov-cy/govcy-frontend-renderer@v1.22.0/dist/govcyCompiledTemplates.browser.js"></script><script src="https://cdn.jsdelivr.net/gh/gov-cy/govcy-frontend-renderer@v1.22.0/dist/govcyFrontendRenderer.browser.js"></script><script type="module" src="/js/govcyForms.js"></script><script type="module" src="/js/govcyFiles.js"></script>`,
                    el: `<script src="https://cdn.jsdelivr.net/gh/gov-cy/govcy-frontend-renderer@v1.22.0/dist/govcyCompiledTemplates.browser.js"></script><script src="https://cdn.jsdelivr.net/gh/gov-cy/govcy-frontend-renderer@v1.22.0/dist/govcyFrontendRenderer.browser.js"></script><script type="module" src="/js/govcyForms.js"></script><script type="module" src="/js/govcyFiles.js"></script>`,
                    tr: `<script src="https://cdn.jsdelivr.net/gh/gov-cy/govcy-frontend-renderer@v1.22.0/dist/govcyCompiledTemplates.browser.js"></script><script src="https://cdn.jsdelivr.net/gh/gov-cy/govcy-frontend-renderer@v1.22.0/dist/govcyFrontendRenderer.browser.js"></script><script type="module" src="/js/govcyForms.js"></script><script type="module" src="/js/govcyFiles.js"></script>`
                }
            }
        },
        govcyLoadingOverlay: {
            element: "htmlElement",
            params: {
                text: {
                    en: `<style>.govcy-loadingOverlay{position:fixed;top:0;right:0;bottom:0;left:0;display:none;justify-content:center;align-items:center;background:rgba(255,255,255,.7);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);z-index:1050}.govcy-loadingOverlay[aria-hidden="false"]{display:flex}</style><div id="govcy--loadingOverlay" class="govcy-loadingOverlay" aria-hidden="true" role="dialog" aria-modal="true" tabindex="-1"><div class="govcy-loadingOverlay__content" role="status" aria-live="polite"><div class="spinner-border govcy-text-primary" role="status"><span class="govcy-visually-hidden">Loading...</span></div></div></div>`,
                    el: `<style>.govcy-loadingOverlay{position:fixed;top:0;right:0;bottom:0;left:0;display:none;justify-content:center;align-items:center;background:rgba(255,255,255,.7);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);z-index:1050}.govcy-loadingOverlay[aria-hidden="false"]{display:flex}</style><div id="govcy--loadingOverlay" class="govcy-loadingOverlay" aria-hidden="true" role="dialog" aria-modal="true" tabindex="-1"><div class="govcy-loadingOverlay__content" role="status" aria-live="polite"><div class="spinner-border govcy-text-primary" role="status"><span class="govcy-visually-hidden">Φόρτωση...</span></div></div></div>`,
                    tr: `<style>.govcy-loadingOverlay{position:fixed;top:0;right:0;bottom:0;left:0;display:none;justify-content:center;align-items:center;background:rgba(255,255,255,.7);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);z-index:1050}.govcy-loadingOverlay[aria-hidden="false"]{display:flex}</style><div id="govcy--loadingOverlay" class="govcy-loadingOverlay" aria-hidden="true" role="dialog" aria-modal="true" tabindex="-1"><div class="govcy-loadingOverlay__content" role="status" aria-live="polite"><div class="spinner-border govcy-text-primary" role="status"><span class="govcy-visually-hidden">Loading...</span></div></div></div>`
                }
            }
        },
        backLink: { element: "backLink", params: {} }
    },
    //renderer page data template
    rendererPageData : 
    {
        site: {
            lang: "el",
            title: { 
                en: "govcy Express Services", 
                el: "govcy Express Services",
                tr: "govcy Express Services" 
            },
            headerTitle: { 
                en: "", 
                el: "",
                tr: ""
            },
            description: { 
                en: "govcy Express Services", 
                el: "govcy Express Services",
                tr: "govcy Express Services" 
            },
            copyrightText :{
                en:"Republic of Cyprus, 2025", 
                el:"Κυπριακή Δημοκρατία, 2025",
                tr:"Kıbrıs Cumhuriyeti, 2025"
            },
            url: "https://gov.cy",
            cdn: {
                dist: "https://cdn.jsdelivr.net/gh/gov-cy/govcy-design-system@3.2.0/dist",
                cssIntegrity: "sha384-qjx16YXHG+Vq/NVtwU2aDTc7DoLOyaVNuOHrwA3aTrckpM/ycxZoR5dx7ezNJ/Lv",
                jsIntegrity: "sha384-tqEyCdi3GS4uDXctplAd7ODjiK5fo2Xlqv65e8w/cVvrcBf89tsxXFHXXNiUDyM7"
            }
        },
        pageData: {
            title: { 
                en: "govcy Express Services", 
                el: "govcy Express Services",
                tr: "govcy Express Services"
            },
            layout: "layouts/govcyBase.njk",
            mainLayout: "two-thirds"
        }
    },
    //renderer page template
    emptySections: {
        sections : []
    }, 
    //all other
    other : {
        noPrintClass: "govcy-d-print-none"
    }
};

/**
 * Get the csrf token input element 
 * @param {string} csrfToken 
 * @returns {object} htmlElement with csrf token
 */
export function csrfTokenInput(csrfToken) {
    const csrfTokenInput = `<input type="hidden" name="_csrf" value="${csrfToken}">`;
    return {
        element: "htmlElement",
        params: {
            text: {
                en: csrfTokenInput,
                el: csrfTokenInput,
                tr: csrfTokenInput
            }
        }
    };
}

/**
 * Get the site and page input elements 
 * @param {string} siteId The site id
 * @param {string} pageUrl The page url
 * @param {string} lang The page language
 * @returns {object} htmlElement with the site and page inputs
 */
export function siteAndPageInput(siteId, pageUrl, lang = "el") {
    const siteAndPageInputs = `<input type="hidden" name="_siteId" value="${siteId}"><input type="hidden" name="_pageUrl" value="${pageUrl}"><input type="hidden" name="_lang" value="${lang}">`;
    return {
        element: "htmlElement",
        params: {
            text: {
                en: siteAndPageInputs,
                el: siteAndPageInputs,
                tr: siteAndPageInputs
            }
        }
    };
}

/**
 * Error page template
 * @param {object} title the title text element 
 * @param {object} body the body html element 
 * @returns {object} error page template
 */
export function simpleHtmlPageTemplate(title, body) {
    return {
        sections: [
            {
                name: "main",
                elements: [
                    {
                        element: "textElement",
                        params: {
                          id: "title",
                          type: "h1",
                          text: title
                        }
                      },
                      {
                        element: "htmlElement",
                        params: {
                          id: "instructions",
                          text: body
                        }
                      }
                ]
            }
        ]
    };
}

/**
 * Generate a page url
 * 
 * @param {string} siteId The site id 
 * @param {string} pageUrl The page url
 * @param {string} route Whether it comes from the `review` route
 * @returns The page url
 */
export function constructPageUrl(siteId, pageUrl, route) {
    return `/${siteId}${pageUrl ? `/${pageUrl}` : ""}${route ? `?route=${route}` : ""}`;
}

/**
 * Create an error summary element
 * 
 * @param {array} errors The array of errors 
 * @returns The error summary element
 */
export function errorSummary(errors) {
    return {
        element: "errorSummary",
        params: {
            id: "errorSummary",
            errors: errors
        }
    };
}

export function constructErrorSummaryUrl(url) {
    return `${url}#errorSummary-title`;
}

/**
 * Create the user name section 
 * 
 * @param {string} userName the user name
 * @returns The user name section with the username and logout link
 */
export function userNameSection(userName) {
    return {
        name: "userName", 
        elements: [
            {
                "element": "userName",
                "params": {
                    "name":{"en":userName,"el":userName, "tr":userName}
                    ,"signOutLink":"/logout"
                }
            }
        ]
    };
}

/**
 * Get the localized content for a given language
 * 
 * @param {object} content The contnent object. For example `{"en": "Hello", "el": "Γειά σας"}`
 * @param {string} lang The desired language code. For example `en`, `el`, `tr`
 * @returns {string|undefined} Localized string or empty string if nothing available.
 */
export function getLocalizeContent(content,lang){
    if (!content || typeof content !== 'object') return "";

    return content[lang] || content["el"] || content["en"] || content["tr"] || "";
}

/**
 * Get the html for the submission pdf link
 * 
 * @param {string} siteId 
 * @returns The html for the submission pdf link
 */
export function getSubmissionPDFLinkHtml (siteId = "") {
    return getMultilingualObject(
        `<p><a class="govcy-d-print-none govcy-d-flex govcy-align-items-center" href="javascript:window.print()">
            <img alt="" aria-hidden="true" src="/img/Certificate_A4.svg" style="width:30px; margin-right:10px; margin-bottom:0px;aspect-ratio: auto !important;">
            Εκτύπωση αίτησης
        </a></p>`,
        `<p><a class="govcy-d-print-none govcy-d-flex govcy-align-items-center" href="javascript:window.print()">
            <img alt="" aria-hidden="true" src="/img/Certificate_A4.svg" style="width:30px; margin-right:10px; margin-bottom:0px;aspect-ratio: auto !important;">
            Print application
        </a></p>`,
        `<p><a class="govcy-d-print-none govcy-d-flex govcy-align-items-center" href="javascript:window.print()">
            <img alt="" aria-hidden="true" src="/img/Certificate_A4.svg" style="width:30px; margin-right:10px; margin-bottom:0px;aspect-ratio: auto !important;">
            Print application
        </a></p>`
    )
}

/**
 * Generate a localized page template listing available services.
 * @param {Array} listOfAvailableSites - Array of site objects with filename and title.
 * @param {string} lang - Language code ('el', 'en', 'tr').
 * @returns {object} Page template object.
 */
export function availableServicesPageTemplate(listOfAvailableSites, lang = "el") {
    // Supported languages
    const supportedLangs = ["el", "en", "tr"];
    const usedLang = supportedLangs.includes(lang) ? lang : "el";
    
    // Localized titles
    const titles = {
        el: "Διαθέσιμες Υπηρεσίες",
        en: "Available Services",
        tr: "Available Services"
    };

    // Localized intro text
    const intros = {
        el: "<p>Από εδώ μπορείτε να επισκεφτείτε τις πιο κάτω υπηρεσίες:</p>",
        en: "<p>From here you can visit the following services:</p>",
        tr: "<p>From here you can visit the following services:</p>",
    };

    let siteLinks = "";
    if (Array.isArray(listOfAvailableSites) && listOfAvailableSites.length > 0) {
        siteLinks = `<ul>` + listOfAvailableSites.map(site =>
        `<li><a href="/${site.filename}">${site.title?.[usedLang] || site.filename}</a></li>`
        ).join('') + `</ul>`;
    } else {
        // No services available
        siteLinks = {
            el: `<div class="govcy-warning-text"><span class="govcy-warning-text-icon" aria-hidden="true">!</span><span class="govcy-warning-text-message">Δεν υπάρχουν διαθέσιμες υπηρεσίες αυτή τη στιγμή.</span></div>`,
            en: `<div class="govcy-warning-text"><span class="govcy-warning-text-icon" aria-hidden="true">!</span><span class="govcy-warning-text-message"><p>No services are currently available.</span></div>`,
            tr: `<div class="govcy-warning-text"><span class="govcy-warning-text-icon" aria-hidden="true">!</span><span class="govcy-warning-text-message"><p>Şu anda mevcut hizmet yok.</span></div>`
        }[usedLang];
    }
    
    // Localized footer
    const footers = {
        el: `<p>Για περισσότερες υπηρεσίες επισκεφτείτε το <a href="https://gov.cy">gov.cy</a></p>`,
        en: `<p>For more services visit <a href="https://gov.cy">gov.cy</a></p>`,
        tr: `<p>For more services visit <a href="https://gov.cy">gov.cy</a></p>`
    };

    // Compose the body
    const body = `${intros[lang] || intros.el}
${siteLinks}
${footers[lang] || footers.el}`;

    // Use your existing simpleHtmlPageTemplate
    return simpleHtmlPageTemplate(
        { el: titles.el, en: titles.en, tr: titles.tr },
        { el: body, en: body, tr: body }
    );
}


/**
 * Returns a multilingual object with the text in all languages
 * 
 * @param {string} el The Greek text
 * @param {string} en The English text
 * @param {string} tr The Turkish text
 * @returns {object} The multilingual object with the text in all languages 
 */
export function getMultilingualObject(el, en, tr) {
    return {el: el || "", en: en || "", tr: tr || ""};
}

/**
 * Returns a multilingual object with the same text in all languages 
 * 
 * @param {array} languages The site's language object 
 * @param {string} value The value to be set for all languages. If not provided, it will be set to an empty string. 
 * @returns {object} The multilingual object with the value set for all languages
 */
export function getSameMultilingualObject(languages, value) {
    const obj = {};
    for (const lang of languages) {
        obj[lang.code] = value || "";
    }
    return obj;
}

/**
 * Get the email object with the subject, preHeader, header, username and footer in the desired language
 * 
 * @param {object} subject The subject object. For example `{"en": "Hello", "el": "Γειά σας"}`
 * @param {object} preHeader The preHeader object. For example `{"en": "Hello", "el": "Γειά σας"}`
 * @param {object} header The header object. For example `{"en": "Hello", "el": "Γειά σας"}`
 * @param {string} username The username. For example `"User1"`
 * @param {array} body The body array. 
 * @param {object} footer The footer object. For example `{"en": "Hello", "el": "Γειά σας"}`
 * @param {string} lang The desired language code. For example `en`, `el`, `tr`
 * @returns {object} The email object with the subject, preHeader, header, username and footer in the desired language 
 */
export function getEmailObject( subject, preHeader, header, username, body, footer, lang) {

    const usedLang = lang || "el";

    return {
        lang: usedLang,
        subject: getLocalizeContent(subject, usedLang),
        pre: getLocalizeContent(preHeader, usedLang),
        header: {
            serviceName: getLocalizeContent(header, usedLang), 
            name: username || ""
        },
        body: body || [],
        footer: {
            footerText: getLocalizeContent(footer, usedLang)
        }
    }
}