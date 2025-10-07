import { expect } from 'chai';
import { populateFormData, getFormData } from '../../src/utils/govcyFormHandling.mjs';

describe('govcyFormHandling', () => {
    it('1. should populate basic input elements with session data', () => {
        const formElements = [
            { element: 'textInput', params: { name: 'field1', id: 'field1' } },
            { element: 'textArea', params: { name: 'field2', id: 'field2' } },
        ];
        const theData = { field1: 'value1', field2: 'value2' };

        populateFormData(formElements, theData, { errors: {}, errorSummary: [] });

        expect(formElements[0].params.value).to.equal('value1');
        expect(formElements[1].params.value).to.equal('value2');
    });

    it('2. should populate dateInput fields with day, month, and year values', () => {
        const formElements = [
            { element: 'dateInput', params: { name: 'birthDate', id: 'birthDate' } },
        ];
        const theData = { birthDate_day: '15', birthDate_month: '08', birthDate_year: '1990' };

        populateFormData(formElements, theData, { errors: {}, errorSummary: [] });

        expect(formElements[0].params.dayValue).to.equal('15');
        expect(formElements[0].params.monthValue).to.equal('08');
        expect(formElements[0].params.yearValue).to.equal('1990');
    });

    it('3. should populate datePicker fields with valid dates', () => {
        const formElements = [
            { element: 'datePicker', params: { name: 'appointmentDate', id: 'appointmentDate' } },
        ];
        const theData = { appointmentDate: '15/08/1990' };

        populateFormData(formElements, theData, { errors: {}, errorSummary: [] });

        expect(formElements[0].params.value).to.equal('1990-08-15'); // YYYY-MM-DD format
    });

    it('4. should clear datePicker fields with invalid dates', () => {
        const formElements = [
            { element: 'datePicker', params: { name: 'appointmentDate', id: 'appointmentDate' } },
        ];
        const theData = { appointmentDate: '31/02/2020' }; // Invalid date

        populateFormData(formElements, theData, { errors: {}, errorSummary: [] });

        expect(formElements[0].params.value).to.equal('');
    });

    it('5. should populate validation errors for form elements', () => {
        const formElements = [
            { element: 'textInput', params: { name: 'field1', id: 'field1' } },
        ];
        const validationErrors = {
            errors: { field1: { message: 'This field is required' } },
            errorSummary: [],
        };

        populateFormData(formElements, {}, validationErrors);

        expect(formElements[0].params.error).to.equal('This field is required');
        expect(validationErrors.errorSummary).to.deep.include({
            link: '#field1',
            text: 'This field is required',
        });
    });

    it('6. should populate conditional elements inside radios', () => {
        const formElements = [
            {
                element: 'radios',
                params: {
                    items: [
                        {
                            conditionalElements: [
                                { element: 'textInput', params: { name: 'conditionalField', id: 'conditionalField' } },
                            ],
                        },
                    ],
                },
            },
        ];
        const theData = { conditionalField: 'conditionalValue' };

        populateFormData(formElements, theData, { errors: {}, errorSummary: [] });

        expect(formElements[0].params.items[0].conditionalElements[0].params.value).to.equal('conditionalValue');
    });

    it('7. should propagate errors in conditional elements to the parent radios', () => {
        const formElements = [
            {
                element: 'radios',
                params: {
                    items: [
                        {
                            conditionalElements: [
                                { element: 'textInput', params: { name: 'conditionalField', id: 'conditionalField' } },
                            ],
                        },
                    ],
                },
            },
        ];
        const validationErrors = {
            errors: { conditionalField: { message: 'Invalid value' } },
            errorSummary: [],
        };

        populateFormData(formElements, {}, validationErrors);

        expect(formElements[0].params.items[0].conditionalElements[0].params.error).to.equal('Invalid value');
        expect(formElements[0].params.items[0].conditionalHasErrors).to.be.true;
    });


});

describe('getFormData', () => {
    it('1. should filter basic input elements', () => {
        const elements = [
            { element: 'textInput', params: { name: 'field1' } },
            { element: 'textArea', params: { name: 'field2' } },
        ];
        const formData = { field1: 'value1', field2: 'value2', extraField: 'unexpected' };

        const result = getFormData(elements, formData);

        expect(result).to.deep.equal({
            field1: 'value1',
            field2: 'value2',
        });
    });

    it('2. should handle missing or undefined values', () => {
        const elements = [
            { element: 'textInput', params: { name: 'field1' } },
            { element: 'textArea', params: { name: 'field2' } },
        ];
        const formData = { field1: undefined };

        const result = getFormData(elements, formData);

        expect(result).to.deep.equal({
            field1: '',
            field2: '',
        });
    });

    it('3. should handle dateInput elements', () => {
        const elements = [
            { element: 'dateInput', params: { name: 'birthDate' } },
        ];
        const formData = { birthDate_day: '15', birthDate_month: '08', birthDate_year: '1990' };

        const result = getFormData(elements, formData);

        expect(result).to.deep.equal({
            birthDate_day: '15',
            birthDate_month: '08',
            birthDate_year: '1990',
        });
    });

    it('4. should assign empty strings for incomplete dateInput fields', () => {
        const elements = [
            { element: 'dateInput', params: { name: 'birthDate' } },
        ];
        const formData = { birthDate_day: '15', birthDate_month: '08' };

        const result = getFormData(elements, formData);

        expect(result).to.deep.equal({
            birthDate_day: '15',
            birthDate_month: '08',
            birthDate_year: '',
        });
    });

    it('5. should handle conditional elements inside radios', () => {
        const elements = [
            {
                element: 'radios',
                params: {
                    name: 'gender',
                    items: [
                        {
                            value: 'male',
                            conditionalElements: [
                                { element: 'textInput', params: { name: 'maleDetails' } },
                            ],
                        },
                        {
                            value: 'female',
                            conditionalElements: [
                                { element: 'textInput', params: { name: 'femaleDetails' } },
                            ],
                        },
                    ],
                },
            },
        ];
        const formData = { gender: 'male', maleDetails: 'Some details' };

        const result = getFormData(elements, formData);

        expect(result).to.deep.equal({
            gender: 'male',
            maleDetails: 'Some details',
            femaleDetails: '', // Included but empty since "female" is not selected
        });
    });

    it('6. should process all conditional elements regardless of selection', () => {
        const elements = [
            {
                element: 'radios',
                params: {
                    name: 'gender',
                    items: [
                        {
                            value: 'male',
                            conditionalElements: [
                                { element: 'textInput', params: { name: 'maleDetails' } },
                            ],
                        },
                        {
                            value: 'female',
                            conditionalElements: [
                                { element: 'textInput', params: { name: 'femaleDetails' } },
                            ],
                        },
                    ],
                },
            },
        ];
        const formData = { gender: 'female', femaleDetails: 'Some details' };

        const result = getFormData(elements, formData);

        expect(result).to.deep.equal({
            gender: 'female',
            maleDetails: '', // Included but empty since "male" is not selected
            femaleDetails: 'Some details',
        });
    });

    it('7. should handle checkboxes with array values', () => {
        const elements = [
            {
                element: 'checkboxes',
                params: {
                    name: 'preferences',
                    items: [
                        {
                            value: 'email',
                        },
                        {
                            value: 'sms',
                        },
                    ],
                },
            },
        ];
        const formData = { preferences: ['email', 'sms'], emailDetails: 'example@example.com', smsDetails: '1234567890' };

        const result = getFormData(elements, formData);

        expect(result).to.deep.equal({
            preferences: ['email', 'sms']
        });
    });
    // Edge Case Tests
    it('8. should ignore extra fields not defined in the form', () => {
        const elements = [
            { element: 'textInput', params: { name: 'field1' } },
        ];
        const formData = { field1: 'value1', extraField: 'unexpected' };

        const result = getFormData(elements, formData);

        expect(result).to.deep.equal({
            field1: 'value1',
        });
    });

    it('9. should include all defined fields even if missing in formData', () => {
        const elements = [
            { element: 'textInput', params: { name: 'field1' } },
            { element: 'textInput', params: { name: 'field2' } },
        ];
        const formData = { field1: 'value1' };

        const result = getFormData(elements, formData);

        expect(result).to.deep.equal({
            field1: 'value1',
            field2: '', // Missing field is included with an empty string
        });
    });

    it('10. should handle empty formData gracefully', () => {
        const elements = [
            { element: 'textInput', params: { name: 'field1' } },
            { element: 'textInput', params: { name: 'field2' } },
        ];
        const formData = {};

        const result = getFormData(elements, formData);

        expect(result).to.deep.equal({
            field1: '',
            field2: '',
        });
    });

    it('11. should transform fileInput to fileView with session data', () => {
        const formElements = [
            {
                element: 'fileInput',
                params: {
                    name: 'uploadDoc',
                    label: { el: 'Αποστολή', en: 'Upload' },
                    id: 'uploadDoc'
                }
            }
        ];
        const fileData = {
            fileId: 'file123',
            sha256: 'sha256hash'
        };
        const store = {
            siteData: {
                'mySite': {
                    inputData: {
                        'uploadPage': {
                            formData: {
                                // unneeded handle of `Attachment` at the end
                                // uploadDocAttachment: fileData
                                uploadDoc: fileData
                            }
                        }
                    }
                }
            }
        };

        populateFormData(formElements, {}, { errors: {}, errorSummary: [] }, store, 'mySite', 'uploadPage');

        const fileView = formElements[0];
        expect(fileView.element).to.equal('fileView');
        expect(fileView.params.fileId).to.equal(fileData.fileId);
        expect(fileView.params.sha256).to.equal(fileData.sha256);
        expect(fileView.params.viewHref).to.equal('/mySite/uploadPage/view-file/uploadDoc');
        expect(fileView.params.deleteHref).to.equal('/mySite/uploadPage/delete-file/uploadDoc');
    });

    it('12. should inject JS config and ARIA live regions when fileInput is present', () => {
        const formElements = [
            {
                element: 'fileInput',
                params: {
                    name: 'uploadDoc',
                    label: { el: 'Αποστολή', en: 'Upload' },
                    id: 'uploadDoc'
                }
            }
        ];
        const fileData = {
            fileId: 'file123',
            sha256: 'sha256hash'
        };
        const store = {
            siteData: {
                'mySite': {
                    inputData: {
                        'uploadPage': {
                            formData: {
                                // unneeded handle of `Attachment` at the end
                                // uploadDocAttachment: fileData
                                uploadDoc: fileData
                            }
                        }
                    }
                }
            }
        };

        const validationErrors = { errors: {}, errorSummary: [] };

        populateFormData(formElements, {}, validationErrors, store, 'mySite', 'uploadPage', 'en');

        const injected = formElements.find(el => el.element === 'htmlElement');
        expect(injected).to.exist;
        expect(injected.params?.text?.en).to.include('window._govcyFileInputs');
        expect(injected.params?.text?.en).to.include('window._govcySiteId');
        expect(injected.params?.text?.en).to.include('govcy-upload-status');
        expect(injected.params?.text?.en).to.include('govcy-upload-error');
    });

    it('13. should leave fileInput as is if no session data exists', () => {
        const formElements = [
            {
                element: 'fileInput',
                params: {
                    name: 'uploadDoc',
                    label: 'Upload document',
                    id: 'uploadDoc'
                }
            }
        ];

        const store = {}; // no data
        const validationErrors = { errors: {}, errorSummary: [] };

        populateFormData(formElements, {}, validationErrors, store, 'site123', 'page1');

        expect(formElements[0].element).to.equal('fileInput');
        expect(formElements[0].params.value).to.equal('');
    });


    it('14. should populate conditional input inside radios correctly', () => {
        const formElements = [
            {
                element: 'radios',
                params: {
                    id: 'mobile_select',
                    name: 'mobile_select',
                    legend: {
                        el: "Σε ποιο κινητό μπορούμε να επικοινωνήσουμε μαζί σας;",
                        en: "What mobile number can we use to contact you?"
                    },
                    isPageHeading: true,
                    items: [
                        {
                            value: 'mobile',
                            text: {
                                el: "Στο [99 123456]",
                                en: "You can use [99 123456]",
                            }
                        },
                        {
                            value: 'other',
                            text: {
                                el: "Θα δώσω άλλο αριθμό",
                                en: "I will give a different number"
                            },
                            conditionalElements: [
                                {
                                    element: 'textInput',
                                    params: {
                                        id: 'mobileTxt',
                                        name: 'mobileTxt',
                                        label: {
                                            el: 'Αριθμός τηλεφώνου',
                                            en: 'Telephone number'
                                        },
                                        isPageHeading: false,
                                        fixedWidth: '20',
                                        type: 'tel'
                                    }
                                }
                            ]
                        }
                    ]
                }
            }
        ];

        const sessionData = {
            mobile_select: 'other',
            mobileTxt: '99123456'
        };

        const validationErrors = {
            errors: {},
            errorSummary: []
        };

        // Call the function
        populateFormData(formElements, sessionData, validationErrors);

        // Assertions
        const radios = formElements[0];
        const conditionalInput = radios.params.items[1].conditionalElements[0];

        expect(conditionalInput.params.value).to.equal('99123456');
    });

    it('15. should set conditionalHasErrors when nested conditional has error', () => {
        const formElements = [
            {
                element: 'radios',
                params: {
                    name: 'mobile_select',
                    items: [
                        {
                            value: 'other',
                            conditionalElements: [
                                {
                                    element: 'textInput',
                                    params: {
                                        name: 'mobileTxt',
                                        id: 'mobileTxt'
                                    }
                                }
                            ]
                        }
                    ]
                }
            }
        ];

        const validationErrors = {
            errors: {
                mobileTxt: { message: 'Enter your mobile phone number' }
            },
            errorSummary: []
        };

        populateFormData(formElements, {}, validationErrors);

        const conditionalInput = formElements[0].params.items[0].conditionalElements[0];
        expect(conditionalInput.params.error).to.equal('Enter your mobile phone number');
        expect(formElements[0].params.items[0].conditionalHasErrors).to.be.true;
    });

    it('16. should retrieve file metadata from session store for fileInput', () => {
        const elements = [
            {
                element: 'fileInput',
                params: { name: 'myUpload' }
            }
        ];
        const formData = {}; // ignored for fileInput

        const store = {
            siteData: {
                site1: {
                    inputData: {
                        'page-1': {
                            formData: {
                                // unneeded handle of `Attachment` at the end
                                // myUploadAttachment: {
                                myUpload: {
                                    fileId: 'abc123',
                                    sha256: 'def456'
                                }
                            }
                        }
                    }
                }
            }
        };

        const result = getFormData(elements, formData, store, 'site1', 'page-1');

        expect(result).to.deep.equal({
            // unneeded handle of `Attachment` at the end
            // myUploadAttachment: {
            myUpload: {
                fileId: 'abc123',
                sha256: 'def456'
            }
        });
    });

    it('17. should return empty string if fileInput metadata is missing in store', () => {
        const elements = [
            {
                element: 'fileInput',
                params: { name: 'myUpload' }
            }
        ];
        const formData = {}; // doesn't matter

        const store = {
            siteData: {
                site1: {
                    inputData: {
                        'page-1': {
                            formData: {
                                // myUploadAttachment missing
                            }
                        }
                    }
                }
            }
        };

        const result = getFormData(elements, formData, store, 'site1', 'page-1');

        expect(result).to.deep.equal({
            // unneeded handle of `Attachment` at the end
            // myUploadAttachment: ''
            myUpload: ''
        });
    });

    // -------------------------------------------------------------------------
    // Additional tests for getFormData in multiple-items (edit) scenarios
    // -------------------------------------------------------------------------
    it('18. should fetch indexed file data correctly in edit mode', () => {
        const elements = [
            { element: 'fileInput', params: { name: 'proof', id: 'proof' } }
        ];

        // Simulate a store where multiple entries are saved under a repeating structure
        const store = {
            siteData: {
                site1: {
                    inputData: {
                        'page-1': {
                            formData: [
                                // Simulate multiple entries as an array
                                   {proof: { fileId: 'fileA', sha256: 'shaA' }},
                                   {proof: { fileId: 'fileB', sha256: 'shaB' }},
                                   {proof: { fileId: 'fileC', sha256: 'shaC' }}
                            ]
                        }
                    }
                }
            }
        };

        // Test fetching the file for index 1 (second item)
        const result = getFormData(elements, {}, store, 'site1', 'page-1', 1);

        expect(result).to.deep.equal({
            proof: { fileId: 'fileB', sha256: 'shaB' },
        });

    });

    it('19. should return empty string if indexed file data missing', () => {
        const elements = [
            { element: 'fileInput', params: { name: 'uploadDoc' } }
        ];

        const store = {
            siteData: {
                site1: {
                    inputData: {
                        'page-1': {
                            formData: {
                                uploadDoc: [] // No entries in array
                            }
                        }
                    }
                }
            }
        };

        // Try to get index 0 (nothing there)
        const result = getFormData(elements, {}, store, 'site1', 'page-1', 0);

        expect(result).to.deep.equal({
            uploadDoc: ''
        });
    });

    it('20. should not break when store or site data is missing entirely', () => {
        const elements = [
            { element: 'fileInput', params: { name: 'uploadDoc' } }
        ];

        // Completely missing store data
        const store = {};

        const result = getFormData(elements, {}, store, 'nosite', 'nopage', 0);

        expect(result).to.deep.equal({
            uploadDoc: ''
        });
    });


});

// -----------------------------------------------------------------------------
// New tests for multiple items mode (add/edit) support — using theData directly
// -----------------------------------------------------------------------------
describe('govcyFormHandling - multiple items mode', () => {

    it('1. should populate fileInput correctly in "add" mode with proper URLs', () => {
        const formElements = [
            {
                element: 'fileInput',
                params: {
                    id: 'uploadDoc',
                    name: 'uploadDoc',
                    label: { el: 'Αποστολή', en: 'Upload' }
                }
            }
        ];

        // Simulate direct data object provided to populateFormData
        const theData = {
            uploadDoc: { fileId: 'abc123', sha256: 'def456' }
        };

        const validationErrors = { errors: {}, errorSummary: [] };
        const store = {}; // not used in this case

        populateFormData(formElements, theData, validationErrors, store, 'site1', 'page-1', 'en', null, '', 'add');

        const el = formElements[0];
        expect(el.element).to.equal('fileView');
        expect(el.params.fileId).to.equal('abc123');
        expect(el.params.sha256).to.equal('def456');
        expect(el.params.viewHref).to.equal('/site1/page-1/multiple/add/view-file/uploadDoc');
        expect(el.params.deleteHref).to.equal('/site1/page-1/multiple/add/delete-file/uploadDoc');
    });

    it('2. should populate fileInput correctly in "edit" mode with index and proper URLs', () => {
        const formElements = [
            {
                element: 'fileInput',
                params: {
                    id: 'uploadDoc',
                    name: 'uploadDoc',
                    label: { el: 'Αποστολή', en: 'Upload' }
                }
            }
        ];

        // Simulate theData that represents the selected item being edited
        const theData = {
            uploadDoc: { fileId: 'xyz999', sha256: 'hash123' }
        };

        const validationErrors = { errors: {}, errorSummary: [] };
        const store = {}; // not needed since we provide theData directly

        populateFormData(formElements, theData, validationErrors, store, 'site1', 'page-1', 'en', null, '', 'edit', 2);

        const el = formElements[0];
        expect(el.element).to.equal('fileView');
        expect(el.params.fileId).to.equal('xyz999');
        expect(el.params.viewHref).to.equal('/site1/page-1/multiple/edit/2/view-file/uploadDoc');
        expect(el.params.deleteHref).to.equal('/site1/page-1/multiple/edit/2/delete-file/uploadDoc');
    });

    it('3. should leave fileInput unchanged in "edit" mode when file data missing in theData', () => {
        const formElements = [
            {
                element: 'fileInput',
                params: {
                    id: 'uploadDoc',
                    name: 'uploadDoc',
                    label: { el: 'Αποστολή', en: 'Upload' }
                }
            }
        ];

        // Simulate missing file data
        const theData = {};

        const validationErrors = { errors: {}, errorSummary: [] };
        const store = {};

        populateFormData(formElements, theData, validationErrors, store, 'site1', 'page-1', 'en', null, '', 'edit', 1);

        const el = formElements[0];
        expect(el.element).to.equal('fileInput');
        expect(el.params.value).to.equal('');
    });

    it('4. should include routeParam in deleteHref when provided', () => {
        const formElements = [
            {
                element: 'fileInput',
                params: {
                    id: 'uploadDoc',
                    name: 'uploadDoc',
                    label: { el: 'Αποστολή', en: 'Upload' }
                }
            }
        ];

        const theData = {
            uploadDoc: { fileId: 'file555', sha256: 'sha555' }
        };

        const validationErrors = { errors: {}, errorSummary: [] };
        const store = {};

        populateFormData(formElements, theData, validationErrors, store, 'mysite', 'mypage', 'el', null, 'review', 'edit', 1);

        const el = formElements[0];
        expect(el.params.deleteHref).to.equal('/mysite/mypage/multiple/edit/1/delete-file/uploadDoc?route=review');
    });

});


// -----------------------------------------------------------------------------
// Tests for _global validation errors in populateFormData
// -----------------------------------------------------------------------------
describe('populateFormData - _global validation errors', () => {

    it('1. should append a _global error to the error summary with default link', () => {
        const formElements = [
            {
                element: 'textInput',
                params: { id: 'firstName', name: 'firstName' }
            },
            {
                element: 'textInput',
                params: { id: 'lastName', name: 'lastName' }
            }
        ];

        // Simulate _global error
        const validationErrors = {
            errors: {
                _global: { message: 'You must complete all items' }
            },
            errorSummary: []
        };

        populateFormData(formElements, {}, validationErrors);

        // Expect the errorSummary to include the message
        expect(validationErrors.errorSummary).to.have.lengthOf(1);
        expect(validationErrors.errorSummary[0].text).to.equal('You must complete all items');
        // Default link should point to the first field’s id
        expect(validationErrors.errorSummary[0].link).to.equal('#firstName');
    });

    it('2. should use provided pageUrl as the link target when available', () => {
        const formElements = [
            {
                element: 'textInput',
                params: { id: 'field1', name: 'field1' }
            }
        ];

        // Simulate _global error with pageUrl (e.g. redirect to hub)
        const validationErrors = {
            errors: {
                _global: {
                    message: 'You cannot add more items',
                    pageUrl: '/mysite/hub-page'
                }
            },
            errorSummary: []
        };

        populateFormData(formElements, {}, validationErrors);

        expect(validationErrors.errorSummary).to.have.lengthOf(1);
        const summaryItem = validationErrors.errorSummary[0];
        expect(summaryItem.text).to.equal('You cannot add more items');
        expect(summaryItem.link).to.equal('/mysite/hub-page');
    });


});
