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
        expect(fileView.params.viewHref).to.equal('#viewHref');
        expect(fileView.params.deleteHref).to.equal('#deleteHref');
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


});