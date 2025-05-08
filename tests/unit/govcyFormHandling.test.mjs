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
});