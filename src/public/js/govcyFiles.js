// 🔍 Select all file inputs that have the .govcy-file-upload class
var fileInputs = document.querySelectorAll('input[type="file"].govcy-file-upload');

// select overlay and app root elements
var _govcyOverlay = document.getElementById("govcy--loadingOverlay");
var _govcyAppRoot = document.getElementById("govcy--body");

// Accessibility: Keep track of previously focused element and disabled elements
var _govcyPrevFocus = null;
var _govcyDisabledEls = [];

// 🔁 Loop over each file input and attach a change event listener
fileInputs.forEach(function(input) {
  input.addEventListener('change', _uploadFileEventHandler);
});

/**
 * Disables all focusable elements within a given root element
 * @param {*} root  The root element whose focusable children will be disabled
 */
function disableFocusables(root) {
    var sel = 'a[href],area[href],button,input,select,textarea,iframe,summary,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
    var nodes = root.querySelectorAll(sel);
    _govcyDisabledEls = [];
    for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (_govcyOverlay.contains(el)) continue;                 // don’t disable overlay itself
        var prev = el.getAttribute('tabindex');
        el.setAttribute('data-prev-tabindex', prev === null ? '' : prev);
        el.setAttribute('tabindex', '-1');
        _govcyDisabledEls.push(el);
    }
    root.setAttribute('aria-hidden', 'true');              // hide from AT on fallback
    root.setAttribute('aria-busy', 'true');
}

/**
 * Restores all focusable elements within a given root element
 * @param {*} root  The root element whose focusable children will be restored
 */
function restoreFocusables(root) {
    for (var i = 0; i < _govcyDisabledEls.length; i++) {
        var el = _govcyDisabledEls[i];
        var prev = el.getAttribute('data-prev-tabindex');
        if (prev === '') el.removeAttribute('tabindex'); else el.setAttribute('tabindex', prev);
        el.removeAttribute('data-prev-tabindex');
    }
    _govcyDisabledEls = [];
    root.removeAttribute('aria-hidden');
    root.removeAttribute('aria-busy');
}

/**
 * Traps tab key navigation within the overlay
 * @param {*} e The event
 * @returns 
 */
function trapTab(e) {
    if (e.key !== 'Tab') return;
    var focusables = _govcyOverlay.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) { e.preventDefault(); _govcyOverlay.focus(); return; }
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/**
 * Shows the loading spinner overlay and traps focus within it
 */
function showLoadingSpinner() {
    _govcyPrevFocus = document.activeElement;
    _govcyOverlay.setAttribute('aria-hidden', 'false');
    _govcyOverlay.setAttribute('tabindex', '-1');
    _govcyOverlay.style.display = 'flex';
    document.documentElement.style.overflow = 'hidden';

    if ('inert' in HTMLElement.prototype) {               // progressive enhancement
        _govcyAppRoot.inert = true;
    } else {
        disableFocusables(_govcyAppRoot);
        document.addEventListener('keydown', trapTab, true);
    }
    _govcyOverlay.focus();
}

/**
 * Hides the loading spinner overlay and restores focus to the previously focused element
 */
function hideLoadingSpinner() {
    _govcyOverlay.style.display = 'none';
    _govcyOverlay.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';

    if ('inert' in HTMLElement.prototype) {
        _govcyAppRoot.inert = false;
    } else {
        restoreFocusables(_govcyAppRoot);
        document.removeEventListener('keydown', trapTab, true);
    }
    if (_govcyPrevFocus && _govcyPrevFocus.focus) _govcyPrevFocus.focus();
}


/**
 * Handles the upload of a file event
 *
 * @param {object} event The event
 */
function _uploadFileEventHandler(event) {
  var input = event.target;
  var messages = {
    "uploadSuccesful": {
      "el": "Το αρχείο ανεβαστηκε",
      "en": "File uploaded successfully",
      "tr": "File uploaded successfully"
    },
    "uploadFailed": {
      "el": "Αποτυχια ανεβασης",
      "en": "File upload failed",
      "tr": "File upload failed"
    },
    "uploadFailed406": {
      "el": "Το επιλεγμένο αρχείο είναι κενό",
      "en": "The selected file is empty",
      "tr": "The selected file is empty"
    },
    "uploadFailed407": {
      "el": "Το επιλεγμένο αρχείο πρέπει να είναι JPG, JPEG, PNG ή PDF",
      "en": "The selected file must be a JPG, JPEG, PNG or PDF",
      "tr": "The selected file must be a JPG, JPEG, PNG or PDF"
    },
    "uploadFailed408": {
      "el": "Το επιλεγμένο αρχείο πρέπει να είναι JPG, JPEG, PNG ή PDF",
      "en": "The selected file must be a JPG, JPEG, PNG or PDF",
      "tr": "The selected file must be a JPG, JPEG, PNG or PDF"
    },
    "uploadFailed409": {
      "el": "Το επιλεγμένο αρχείο πρέπει να είναι μικρότερο από 4MB",
      "en": "The selected file must be smaller than 4MB",
      "tr": "The selected file must be smaller than 4MB"
    }
  };

  // 🔐 Get the CSRF token from a hidden input field (generated by your backend)
  var csrfEl = document.querySelector('input[type="hidden"][name="_csrf"]');
  var csrfToken = csrfEl ? csrfEl.value : '';

  // 🔧 Define siteId and pageUrl (you can dynamically extract these later)
  var siteId = window._govcySiteId || "";
  var pageUrl = window._govcyPageUrl || "";
  var lang = window._govcyLang || "el";

  // 📦 Grab the selected file
  var file = event.target.files[0];
  var elementName = input.name; // Form field's `name` attribute
  var elementId = input.id;     // Form field's `id` attribute

  if (!file) return; // Exit if no file was selected

  // Show loading spinner
  showLoadingSpinner();

  // 🧵 Prepare form-data payload for the API
  var formData = new FormData();
  formData.append('file', file);               // Attach the actual file
  formData.append('elementName', elementName); // Attach the field name for backend lookup

  // 🚀 CHANGED: using fetch instead of axios.post
  fetch(`/apis/${siteId}/${pageUrl}/upload`, {
    method: "POST",
    headers: {
      "X-CSRF-Token": csrfToken // 🔐 Pass CSRF token in custom header
    },
    body: formData
  })
    .then(function(response) {
      // 🚀 CHANGED: fetch does not auto-throw on error codes → check manually
      if (!response.ok) {
        return response.json().then(function(errData) {
          throw { response: { data: errData } };
        });
      }
      return response.json();
    })
    .then(function(data) {
      // ✅ Success response
      var sha256 = data.Data.sha256;
      var fileId = data.Data.fileId;

      // 📝 Store returned metadata in hidden fields if needed
      // document.querySelector('[name="' + elementName + 'Attachment[fileId]"]').value = fileId;
      // document.querySelector('[name="' + elementName + 'Attachment[sha256]"]').value = sha256;
      
      // Hide loading spinner
      hideLoadingSpinner();

      // Render the file view
      _renderFileElement("fileView", elementId, elementName, fileId, sha256, null);

      // Accessibility: Update ARIA live region with success message
      var statusRegion = document.getElementById('_govcy-upload-status');
      if (statusRegion) {
        setTimeout(function() {
          statusRegion.textContent = messages.uploadSuccesful[lang];
        }, 200);
        setTimeout(function() {
          statusRegion.textContent = '';
        }, 5000);
      }
    })
    .catch(function(err) {
      // ⚠️ Show an error message if upload fails
      var errorMessage = messages.uploadFailed;
      var errorCode = err && err.response && err.response.data && err.response.data.ErrorCode;

      if (errorCode === 406 || errorCode === 407 || errorCode === 408 || errorCode === 409) {
        errorMessage = messages["uploadFailed" + errorCode];
      }

      // Hide loading spinner
      hideLoadingSpinner();
      // Render the file input with error
      _renderFileElement("fileInput", elementId, elementName, "", "", errorMessage);

      // Re-bind the file input's change handler
      var newInput = document.getElementById(elementId);
      if (newInput) {
        newInput.addEventListener('change', _uploadFileEventHandler);
      }

      // Accessibility: Focus on the form field
      document.getElementById(elementId)?.focus();
    });
}


/**
 * Renders a file element in the DOM
 * 
 * @param {string} elementState The element state. Can be "fileInput" or "fileView" 
 * @param {string} elementId The element id
 * @param {string} elementName The element name 
 * @param {string} fileId The file id 
 * @param {string} sha256 The sha256 
 * @param {object} errorMessage The error message in all supported languages 
 */
function _renderFileElement(elementState, elementId, elementName, fileId, sha256, errorMessage) {
  
  // Grab the query string part (?foo=bar&route=something)
  var queryString = window.location.search;
  // Parse it
  var params = new URLSearchParams(queryString);
  // Get the "route" value (null if not present)
  var route = params.get("route");

  // Create an instance of GovcyFrontendRendererBrowser
  var renderer = new GovcyFrontendRendererBrowser();
  var lang = window._govcyLang || "el";
  // Define the input data
  var inputData =
  {
    "site": {
      "lang": lang
    }
  };
  var fileInputMap =  JSON.parse(JSON.stringify(window._govcyFileInputs));
  var fileElement = fileInputMap[elementName];
  fileElement.element = elementState;
  if (errorMessage != null) fileElement.params.error = errorMessage;
  if (fileId != null) fileElement.params.fileId = fileId;
  if (sha256 != null) fileElement.params.sha256 = sha256;
  if (elementState == "fileView") {
    fileElement.params.visuallyHiddenText = fileElement.params.label;
    // TODO: Also need to set the `view` and `download` URLs 
    fileElement.params.viewHref = "/" + window._govcySiteId + "/" + window._govcyPageUrl + "/view-file/" + elementName;
    fileElement.params.viewTarget = "_blank";
    fileElement.params.deleteHref  = "/" + window._govcySiteId + "/" + window._govcyPageUrl + "/delete-file/" + elementName 
      + (route !== null ? "?route=" + encodeURIComponent(route) : "");
  }
  // Construct the JSONTemplate
  var JSONTemplate = {
    "elements": [fileElement]
  };
  
  //render HTML into string
  var renderedHtml = renderer.renderFromJSON(JSONTemplate,inputData);
  var outerElement = document.getElementById(`${elementId}-outer-control`) 
        || document.getElementById(`${elementId}-input-control`) 
        || document.getElementById(`${elementId}-view-control`);

  if (outerElement) {
    //remove all classes from outerElement
    outerElement.className = "";
    //set the id of the outerElement to `${elementId}-outer-control`
    outerElement.id = `${elementId}-outer-control`;
    //update DOM and initialize the JS components
    renderer.updateDOMAndInitialize(`${elementId}-outer-control`, renderedHtml);
  }
}