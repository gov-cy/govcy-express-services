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