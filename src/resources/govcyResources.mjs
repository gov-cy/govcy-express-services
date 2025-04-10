export const staticResources = {
    //text content
    text: {
        submit: { 
            en: "Submit", 
            el: "Υποβολή", 
            tr: "Gönder" 
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
            tr: "<p>Access is only allowed to individuals with a confirmed profile.<a href=\"/logout\">Giriş yapmadan</a> sonra tekrar deneyiniz.</p>"
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
            el: "Έχουμε εσταλει email επιβεβαιωσης.",
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
                    en: `<script src="/js/govcyForms.js"></script>`,
                    el: `<script src="/js/govcyForms.js"></script>`,
                    tr: `<script src="/js/govcyForms.js"></script>`
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
                en: "govcy Express Services", 
                el: "govcy Express Services",
                tr: "govcy Express Services"
            },
            description: { 
                en: "govcy Express Services", 
                el: "govcy Express Services",
                tr: "govcy Express Services" 
            },
            url: "https://gov.cy",
            cdn: {
                dist: "https://cdn.jsdelivr.net/gh/gov-cy/govcy-design-system@3.1.0/dist",
                cssIntegrity: "sha384-Py9pPShU3OUzcQ3dAfZLkJI0Fgyv9fWKmAdK8f7dS9caBKuKs5z/ZpyERuh0ujm0",
                jsIntegrity: "sha384-g1c/YT97MWPoo9pbyFgQcxvB2MYLdsOgI2+ldxkEXAbhTzKfyYXCEjk9EVkOP5hp"
            }
        },
        pageData: {
            title: { 
                en: "Page title", 
                el: "Τιτλός σελιδας",
                tr: "Sayfa başlığı"
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
 * Error page template
 * @param {object} title the title text element 
 * @param {object} body the body html element 
 * @returns {object} error page template
 */
export function errorPageTemplate(title, body) {
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
        `<p><a class="govcy-d-print-none govcy-d-flex govcy-align-items-center" href="/${siteId}/success/pdf">
            <img alt="" aria-hidden="true" src="/img/Certificate_A4.svg" style="width:30px; margin-right:10px; margin-bottom:0px;aspect-ratio: auto !important;">
            Λήψη αίτησης
        </a></p>`,
        `<p><a class="govcy-d-print-none govcy-d-flex govcy-align-items-center" href="/${siteId}/success/pdf">
            <img alt="" aria-hidden="true" src="/img/Certificate_A4.svg" style="width:30px; margin-right:10px; margin-bottom:0px;aspect-ratio: auto !important;">
            Download application
        </a></p>`,
        `<p><a class="govcy-d-print-none govcy-d-flex govcy-align-items-center" href="/${siteId}/success/pdf">
            <img alt="" aria-hidden="true" src="/img/Certificate_A4.svg" style="width:30px; margin-right:10px; margin-bottom:0px;aspect-ratio: auto !important;">
            Download application
        </a></p>`
    )
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