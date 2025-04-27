import { expect } from 'chai';
import { populateFormData } from '../../src/utils/govcyFormHandling.mjs';

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