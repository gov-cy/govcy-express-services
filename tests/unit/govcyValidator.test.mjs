import { expect } from 'chai';
import { validateFormElements } from '../../src/utils/govcyValidator.mjs';
import * as govcyResources from '../../src/resources/govcyResources.mjs';

describe('govcyValidator', () => {
    // define a conditional radio element for testing
    let contElements = [
        {
            element: 'radios',
            params: {
                name: 'contField1',
                id: 'contField1',
                items: [
                    {
                        value: 'yes',
                        conditionalElements: []
                    }
                ]
            },
        },
    ];
    //----------- required validation --------------------
    it('1. should validate `required` fields correctly', () => {
        // Test with required field
        const elements = [
            {
                element: 'textInput',
                params: {
                    name: 'field1',
                    id: 'field1'
                },
                validations: [
                    {
                        check: 'required',
                        params: {
                            checkValue: "",
                            message: 'Field is required'
                        }
                    }
                ]
            },
        ];
        const formData = { contField1: 'yes', field1: '' };

        //test without conditional
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: {
                id: 'field1',
                message: 'Field is required',
                pageUrl: 'page1',
            },
        });
        //test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: {
                id: 'field1',
                message: 'Field is required',
                pageUrl: 'page1',
            },
        });
    });

    it('2. should pass `required` validation for valid fields', () => {
        const elements = [
            {
                element: 'textInput',
                params: {
                    name: 'field1',
                    id: 'field1'
                },
                validations: [
                    {
                        check: 'required',
                        params: {
                            checkValue: "",
                            message: 'Field is required'
                        }
                    }
                ]
            },
        ];
        const formData = { contField1: 'yes', field1: 'value' };

        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
        //test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });
    //------------- valid validation ---------------------
    it('3. should validate `valid` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: {
                    name: 'field1',
                    id: 'field1',
                },
                validations: [
                    {
                        check: 'valid',
                        params: {
                            checkValue: 'numeric',
                            message: 'Must be numeric',
                        },
                    },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '123' };

        // Test without conditional
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid numeric
        formData.field1 = 'abc';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: {
                id: 'field1',
                message: 'Must be numeric',
                pageUrl: 'page1',
            },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: {
                id: 'field1',
                message: 'Must be numeric',
                pageUrl: 'page1',
            },
        });
    });

    //------------- valid alpha validation ---------------------
    it('4. should validate `alpha` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: {
                    name: 'field1',
                    id: 'field1',
                },
                validations: [
                    {
                        check: 'valid',
                        params: {
                            checkValue: 'alpha',
                            message: 'Must contain only alphabetic characters',
                        },
                    },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: 'Hello' };

        // Test without conditional
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid alpha
        formData.field1 = '123';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: {
                id: 'field1',
                message: 'Must contain only alphabetic characters',
                pageUrl: 'page1',
            },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: {
                id: 'field1',
                message: 'Must contain only alphabetic characters',
                pageUrl: 'page1',
            },
        });
    });

    //------------- valid alphaNum validation ---------------------
    it('5. should validate `alphaNum` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: {
                    name: 'field1',
                    id: 'field1',
                },
                validations: [
                    {
                        check: 'valid',
                        params: {
                            checkValue: 'alphaNum',
                            message: 'Must contain only alphanumeric characters',
                        },
                    },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: 'Hello123' };

        // Test without conditional
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid alphaNum
        formData.field1 = 'Hello@123';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: {
                id: 'field1',
                message: 'Must contain only alphanumeric characters',
                pageUrl: 'page1',
            },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: {
                id: 'field1',
                message: 'Must contain only alphanumeric characters',
                pageUrl: 'page1',
            },
        });
    });

    //------------- valid numDecimal validation ---------------------
    it('6. should validate `numDecimal` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'numDecimal', message: 'Must be a valid decimal number' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '123,45' };

        // Test valid numDecimal
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid numDecimal
        formData.field1 = '123.45';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid decimal number', pageUrl: 'page1' },
        });
        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: {
                id: 'field1',
                message: 'Must be a valid decimal number',
                pageUrl: 'page1',
            },
        });
    });

    //------------- valid currency validation ---------------------
    it('7. should validate `currency` fields correctly with conditionals', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'currency', message: 'Must be a valid currency format' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '123,45' };

        // Test valid currency without conditional
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid currency without conditional
        formData.field1 = '123,456';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid currency format', pageUrl: 'page1' },
        });

        // Test valid currency with conditional
        formData.field1 = '123,45';
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid currency with conditional
        formData.field1 = '123,456';
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid currency format', pageUrl: 'page1' },
        });
    });

    //------------- valid noSpecialChars validation ---------------------
    it('8. should validate `noSpecialChars` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'noSpecialChars', message: 'Contains invalid characters' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: 'Hello, world!' };

        // Test valid noSpecialChars
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid noSpecialChars
        formData.field1 = 'Hello@world';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Contains invalid characters', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Contains invalid characters', pageUrl: 'page1' },
        });
    });

    //------------- valid name validation ---------------------
    it('9. should validate `name` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'name', message: 'Must be a valid name' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: "O'Connor" };

        // Test valid name
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid name
        formData.field1 = '123';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid name', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid name', pageUrl: 'page1' },
        });
    });

    //------------- valid tel validation ---------------------
    it('10. should validate `tel` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'tel', message: 'Must be a valid phone number' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '(123) 456-7890' };

        // Test valid tel
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid tel
        formData.field1 = '123';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid phone number', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid phone number', pageUrl: 'page1' },
        });
    });

    //------------- valid mobile validation ---------------------
    it('11. should validate `mobile` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'mobile', message: 'Must be a valid mobile number' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '12345678' };

        // Test valid mobile
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid mobile
        formData.field1 = '123';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid mobile number', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid mobile number', pageUrl: 'page1' },
        });
    });

    //------------- valid telCY validation ---------------------
    it('12. should validate `telCY` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'telCY', message: 'Must be a valid Cypriot phone number' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '+357 22 123456' };

        // Test valid telCY
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid telCY
        formData.field1 = '+357 12 123456';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid Cypriot phone number', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid Cypriot phone number', pageUrl: 'page1' },
        });
    });

    //------------- valid mobileCY validation ---------------------
    it('13. should validate `mobileCY` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'mobileCY', message: 'Must be a valid Cypriot mobile number' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '+357 99 123456' };

        // Test valid mobileCY
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid mobileCY
        formData.field1 = '+357 22 123456';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid Cypriot mobile number', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid Cypriot mobile number', pageUrl: 'page1' },
        });
    });

    //------------- valid iban validation ---------------------
    it('14. should validate `iban` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'iban', message: 'Must be a valid IBAN' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: 'CY17002001280000001200527600' };

        // Test valid iban
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid iban
        formData.field1 = 'CY17002001280000001200527601';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid IBAN', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid IBAN', pageUrl: 'page1' },
        });

        const IBANList = [
            "CY83007116100000000030071776",
            "CY31007116100000000040036843",
            "CY20005001080001080107738801",
            "CY62002001110000000010012700",
            "CY15009002020002021010017791",
            "CY61005000100000100103440201",
            "CY65005001210001210139761001",
            "CY83002001990000001100550900",
            "CY23002003390000000101685800",
            "CY70002004440000000101605500",
            "CY16002001940000001200653700",
            "CY25005001210001210101392401",
            "CY15002001950000357021195044",
            "CY14007044300000000043021187",
            "CY16002001950000357020009298",
            "CY17002001950000357013502132",
            "CY980050012500012510E0086801",
            "CY980050018100018110E1700801",
            "CY300050014700014710E2883201",
            "CY37007028400000000040074232",
            "CY17009006510006511000410215",
            "CY30007116100000000021049014",
            "CY77007028400000000027248075",
            "CY51002001950000357003852348",
            "CY57002001950000357023016627",
            "CY87002005950000000100727100",
            "CY26002001950000357016021836",
            "CY64007030200000000022259303",
            "CY18002003890000000101355900",
            "CY85002001770000000106387200",
            "CY22007101100000000020350832",
            "CY09002001950000357020150365",
            "CY56002003600000000100749600",
            "CY63007028400000000027080420",
            "CY02007055300000000024054402",
            "CY28002001360000000101682000",
            "CY06002001450000000100658100",
            "CY23007028400000000027360403",
            "CY25002003590000000100463100",
            "CY91007049300000000020605566",
            "CY38005001210001210171486501",
            "CY62007047100000000021221613",
            "CY69007056200000000040147967",
            "CY63007056200000000020935770",
            "CY72007116100000000020139853",
            "CY74005002510002511047311001",
            "CY46002001780000000100856900",
            "CY24002004560000000000505200",
            "CY29002001950000357016579047",
            "CY75002001950000357023508384",
            "CY50007062100000000024018556",
            "CY66002006630000000100621800",
            "CY76007030200000000021042707",
            "CY96005004780004781061143701",
            "CY51007028400000000027362421",
            "CY86007030200000000021989150",
            "CY52005002550002551028139000",
            "GB33BUKB20201555555555",
            "RU 0204 4525 60 0407 0281041 2345678901",
            "LC14BOSL123456789012345678901234",
            "UA903052992990004149123456789",
            "AE460090000000123456789",
            "YE09CBKU0000000000001234560101",
            "BR1500000000000010932840814P2",
            "FR7630006000011234567890189",
            "DE75512108001245126199",
            "FI1410093000123458",
            "CR23015108410026012345",
            "CY16001000010000000006001010"
        ]

        IBANList.forEach(iban => {
            formData.field1 = iban;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({});
        });
    });

    //------------- valid email validation ---------------------
    it('15. should validate `email` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'email', message: 'Must be a valid email address' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: 'test@example.com' };

        // Test valid email
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid email
        formData.field1 = 'invalid-email';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid email address', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid email address', pageUrl: 'page1' },
        });
    });

    it('16. should validate `date` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'date', message: 'Must be a valid date' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '2023-04-15' };

        // Test valid date
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid date
        formData.field1 = 'invalid-date';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid date', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid date', pageUrl: 'page1' },
        });
    });

    //------------- valid dateISO validation ---------------------
    it('17. should validate `dateISO` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'dateISO', message: 'Must be a valid ISO date' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '2023-04-15' };

        // Test valid dateISO
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid dateISO
        formData.field1 = '15/04/2023';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid ISO date', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid ISO date', pageUrl: 'page1' },
        });
    });

    //------------- valid dateDMY validation ---------------------
    it('18. should validate `dateDMY` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'dateDMY', message: 'Must be a valid DMY date' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '15/04/2023' };

        // Test valid dateDMY
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid dateDMY
        formData.field1 = '2023-04-15';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid DMY date', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a valid DMY date', pageUrl: 'page1' },
        });
    });

    //------------- valid numeric validation ---------------------
    it('19. should validate `numeric` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'numeric', message: 'Must be a numeric value' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '12345' };

        // Test valid numeric
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid numeric
        formData.field1 = 'abc123';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a numeric value', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be a numeric value', pageUrl: 'page1' },
        });
    });

    //------------- valid currency validation ---------------------
    it('20. should validate `currency` fields correctly with standard rules', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'currency', message: 'Must be a valid currency format' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '123456' };

        // Test valid currency inputs
        const validInputs = ['123456', '123456,12', '1234567', '12', '123,2', '125'];
        validInputs.forEach(input => {
            formData.field1 = input;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({});
        });

        // Test invalid currency inputs
        const invalidInputs = ['123,123', '123,1234', '123.45', 'abc'];
        invalidInputs.forEach(input => {
            formData.field1 = input;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({
                page1field1: { id: 'field1', message: 'Must be a valid currency format', pageUrl: 'page1' },
            });
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        formData.field1 = '123456,12';
        const validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });

    //------------- valid tel validation ---------------------
    it('21. should validate `tel` fields correctly with normalization', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'tel', message: 'Must be a valid phone number' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '99 123456' };

        // Test valid tel inputs
        const validInputs = ['99 123456', '+44-1234 567', '001 1234 567', '00357 99123456'];
        validInputs.forEach(input => {
            formData.field1 = input;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({});
        });

        // Test invalid tel inputs
        const invalidInputs = ['123', 'abc', '+123456789012345678901']; // Too short, non-numeric, too long
        invalidInputs.forEach(input => {
            formData.field1 = input;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({
                page1field1: { id: 'field1', message: 'Must be a valid phone number', pageUrl: 'page1' },
            });
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        formData.field1 = '+44-1234 567';
        const validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });

    //------------- valid mobile validation ---------------------
    it('22. should validate `mobile` fields correctly with normalization', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'mobile', message: 'Must be a valid mobile number' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '00357 99123456' };

        // Test valid mobile inputs
        const validInputs = ['99 123456', '+44-1234 567', '00357 99123456'];
        validInputs.forEach(input => {
            formData.field1 = input;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({});
        });

        // Test invalid mobile inputs
        const invalidInputs = ['123', 'abc', '+123456789012345678901']; // Too short, non-numeric, too long
        invalidInputs.forEach(input => {
            formData.field1 = input;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({
                page1field1: { id: 'field1', message: 'Must be a valid mobile number', pageUrl: 'page1' },
            });
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        formData.field1 = '00357 99123456';
        const validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });

    //------------- valid telCY validation ---------------------
    it('23. should validate `telCY` fields correctly with normalization', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'telCY', message: 'Must be a valid Cypriot phone number' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '00357 22 123456' };

        // Test valid telCY inputs
        const validInputs = ['00357 22 123456', '+357 22 123456', '22 123456', '+(357)-99-123456'];
        validInputs.forEach(input => {
            formData.field1 = input;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({});
        });

        // Test invalid telCY inputs
        const invalidInputs = ['123', 'abc', '+1234567890123456', ' 22 1234561', '+357 22 1234561', '+358 22 123456']; // Too short, non-numeric, too long
        invalidInputs.forEach(input => {
            formData.field1 = input;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({
                page1field1: { id: 'field1', message: 'Must be a valid Cypriot phone number', pageUrl: 'page1' },
            });
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        formData.field1 = '00357 22 123456';
        const validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });

    //------------- valid mobileCY validation ---------------------
    it('24. should validate `mobileCY` fields correctly with normalization', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'valid', params: { checkValue: 'mobileCY', message: 'Must be a valid Cypriot mobile number' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '00357 99 123456' };

        // Test valid mobileCY inputs
        const validInputs = ['00357 99 123456', '+357 99 123456', '99 123456', '+(357)-99-123456'];
        validInputs.forEach(input => {
            formData.field1 = input;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({});
        });

        // Test invalid mobileCY inputs
        const invalidInputs = ['123', 'abc', '+1234567890123456', ' 99 1234561', '+357 99 1234561', '+358 99 123456']; // Too short, non-numeric, too long
        invalidInputs.forEach(input => {
            formData.field1 = input;
            const validationErrors = validateFormElements(elements, formData, 'page1');
            expect(validationErrors).to.deep.equal({
                page1field1: { id: 'field1', message: 'Must be a valid Cypriot mobile number', pageUrl: 'page1' },
            });
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        formData.field1 = '00357 99 123456';
        const validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });

    //------------- length validation ---------------------
    it('25. should validate `length` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'length', params: { checkValue: 5, message: 'Input is too long' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '12345' };

        // Test valid length
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid length (too long)
        formData.field1 = '123456';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Input is too long', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        formData.field1 = '12345';
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid length with conditional
        formData.field1 = '123456';
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Input is too long', pageUrl: 'page1' },
        });
    });

    //------------- minLength validation ---------------------
    it('26. should validate `minLength` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'minLength', params: { checkValue: 5, message: 'Input is too short' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '12345' };

        // Test valid minLength
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid minLength (too short)
        formData.field1 = '1234';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Input is too short', pageUrl: 'page1' },
        });

        // Test conditional
        contElements[0].params.items[0].conditionalElements = elements;
        formData.field1 = '12345';
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid minLength with conditional
        formData.field1 = '1234';
        validationErrors = validateFormElements(contElements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Input is too short', pageUrl: 'page1' },
        });
    });

    //------------- range validation ---------------------
    it('27. should validate `minValue` and `maxValue` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'minValue', params: { checkValue: 10, message: 'Value is too small' } },
                    { check: 'maxValue', params: { checkValue: 100, message: 'Value is too large' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '50' };

        // Test valid range
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test below minValue
        formData.field1 = '5';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Value is too small', pageUrl: 'page1' },
        });

        // Test above maxValue
        formData.field1 = '150';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Value is too large', pageUrl: 'page1' },
        });
    });

    //------------- regex validation ---------------------
    it('28. should validate `regCheck` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'regCheck', params: { checkValue: '^[A-Z]{3}\\d{3}$', message: 'Invalid format' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: 'ABC123' };

        // Test valid regex
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test invalid regex
        formData.field1 = 'abc123';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Invalid format', pageUrl: 'page1' },
        });
    });

    //------------- date validation ---------------------
    it('29. should validate `minValueDate` and `maxValueDate` fields correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'minValueDate', params: { checkValue: '2023-01-01', message: 'Date is too early' } },
                    { check: 'maxValueDate', params: { checkValue: '2023-12-31', message: 'Date is too late' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '2023-06-15' };

        // Test valid date range
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test below minValueDate
        formData.field1 = '2022-12-31';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Date is too early', pageUrl: 'page1' },
        });

        // Test valid dd/mm/yyyy format
        formData.field1 = '15/6/2023';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test below minValueDate with dd/mm/yyyy format
        formData.field1 = '31/12/2022';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Date is too early', pageUrl: 'page1' },
        });

        // Test above maxValueDate
        formData.field1 = '2024-01-01';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Date is too late', pageUrl: 'page1' },
        });

        // Test above maxValueDate with dd/mm/yyyy format
        formData.field1 = '1/1/2024';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Date is too late', pageUrl: 'page1' },
        });
    });

    //------------- multiple rules validation ---------------------
    it('31. should validate fields with multiple rules correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    { check: 'required', params: { checkValue: '', message: 'Field is required' } },
                    { check: 'minLength', params: { checkValue: 5, message: 'Input is too short' } },
                    { check: 'length', params: { checkValue: 10, message: 'Input is too long' } },
                ],
            },
        ];

        const formData = { contField1: 'yes', field1: '12345' };

        // Test valid input
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // Test missing input
        formData.field1 = '';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Field is required', pageUrl: 'page1' },
        });

        // Test too short
        formData.field1 = '1234';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Input is too short', pageUrl: 'page1' },
        });

        // Test too long
        formData.field1 = '12345678901';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1field1: { id: 'field1', message: 'Input is too long', pageUrl: 'page1' },
        });
    });

    it('32. should fail `required` validation for missing fileInput', () => {
        const elements = [
            {
                element: 'fileInput',
                params: { name: 'myUpload', id: 'myUpload' },
                validations: [
                    {
                        check: 'required',
                        params: {
                            checkValue: '',
                            message: 'You must upload a file'
                        }
                    }
                ]
            }
        ];

        const formData = {
            // no myUploadAttachment provided
        };

        const result = validateFormElements(elements, formData, 'page1');

        expect(result).to.deep.equal({
            page1myUpload: {
                id: 'myUpload',
                message: 'You must upload a file',
                pageUrl: 'page1'
            }
        });
    });

    it('33. should pass `required` validation for existing fileInput metadata', () => {
        const elements = [
            {
                element: 'fileInput',
                params: { name: 'myUpload', id: 'myUpload' },
                validations: [
                    {
                        check: 'required',
                        params: {
                            checkValue: '',
                            message: 'You must upload a file'
                        }
                    }
                ]
            }
        ];

        const formData = {
            // unneeded handle of `Attachment` at the end
            // myUploadAttachment: {
            myUpload: {
                fileId: 'abc123',
                sha256: 'xyz456'
            }
        };

        const result = validateFormElements(elements, formData, 'page1');

        expect(result).to.deep.equal({});
    });

    it('34. should fail `required` validation for conditional fileInput when selected but no file uploaded', () => {
        const elements = [
            {
                element: 'radios',
                params: {
                    name: 'fileChoice',
                    id: 'fileChoice',
                    items: [
                        {
                            value: 'yes',
                            conditionalElements: [
                                {
                                    element: 'fileInput',
                                    params: { name: 'supportingDoc', id: 'supportingDoc' },
                                    validations: [
                                        {
                                            check: 'required',
                                            params: {
                                                checkValue: '',
                                                message: 'Please upload a supporting document'
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        { value: 'no' }
                    ]
                }
            }
        ];

        const formData = {
            fileChoice: 'yes'
            // supportingDocAttachment missing
        };

        const result = validateFormElements(elements, formData, 'page1');

        expect(result).to.deep.equal({
            page1supportingDoc: {
                id: 'supportingDoc',
                message: 'Please upload a supporting document',
                pageUrl: 'page1'
            }
        });
    });

    it('35. should pass `required` validation for conditional fileInput when file is uploaded', () => {
        const elements = [
            {
                element: 'radios',
                params: {
                    name: 'fileChoice',
                    id: 'fileChoice',
                    items: [
                        {
                            value: 'yes',
                            conditionalElements: [
                                {
                                    element: 'fileInput',
                                    params: { name: 'supportingDoc', id: 'supportingDoc' },
                                    validations: [
                                        {
                                            check: 'required',
                                            params: {
                                                checkValue: '',
                                                message: 'Please upload a supporting document'
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        { value: 'no' }
                    ]
                }
            }
        ];

        const formData = {
            fileChoice: 'yes',
            // unneeded handle of `Attachment` at the end
            // supportingDocAttachment: {
            supportingDoc: {
                fileId: 'abc123',
                sha256: 'def456'
            }
        };

        const result = validateFormElements(elements, formData, 'page1');

        expect(result).to.deep.equal({});
    });

    it('36. should skip `valid` check when value is empty and no `required`', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    {
                        check: 'valid',
                        params: { checkValue: 'numeric', message: 'Must be numeric' }
                    }
                ]
            }
        ];

        // Empty field should pass because it's not required
        const formData = { field1: '' };
        const result = validateFormElements(elements, formData, 'page1');
        expect(result).to.deep.equal({});
    });

    it('37. should still enforce both `required` and `valid` when present', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'field1', id: 'field1' },
                validations: [
                    {
                        check: 'required',
                        params: { checkValue: '', message: 'Field is required' }
                    },
                    {
                        check: 'valid',
                        params: { checkValue: 'numeric', message: 'Must be numeric' }
                    }
                ]
            }
        ];

        // Empty field → required fails
        let formData = { field1: '' };
        let result = validateFormElements(elements, formData, 'page1');
        expect(result).to.deep.equal({
            page1field1: { id: 'field1', message: 'Field is required', pageUrl: 'page1' }
        });

        // Non-numeric value → valid fails
        formData = { field1: 'abc' };
        result = validateFormElements(elements, formData, 'page1');
        expect(result).to.deep.equal({
            page1field1: { id: 'field1', message: 'Must be numeric', pageUrl: 'page1' }
        });

        // Numeric value → passes
        formData = { field1: '123' };
        result = validateFormElements(elements, formData, 'page1');
        expect(result).to.deep.equal({});
    });

    //------------- maxCurrentYear validation ---------------------
    it('38. should validate `maxCurrentYear` correctly', () => {
        const currentYear = new Date().getFullYear();

        const elements = [
            {
                element: 'textInput',
                params: { name: 'yearField', id: 'yearField' },
                validations: [
                    {
                        check: 'valid',
                        params: {
                            checkValue: 'maxCurrentYear',
                            message: 'Year must not be in the future'
                        }
                    }
                ],
            },
        ];

        const formData = { yearField: String(currentYear) };

        // ✅ current year passes
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // ✅ past year passes
        formData.yearField = String(currentYear - 1);
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // ❌ future year fails
        formData.yearField = String(currentYear + 1);
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1yearField: {
                id: 'yearField',
                message: 'Year must not be in the future',
                pageUrl: 'page1',
            },
        });

        // ❌ non-numeric fails
        formData.yearField = 'abcd';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1yearField: {
                id: 'yearField',
                message: 'Year must not be in the future',
                pageUrl: 'page1',
            },
        });

        // ✅ empty value should pass (since not required)
        formData.yearField = '';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });

    it('39. should validate `maxCurrentYear` inside conditional elements', () => {
        const currentYear = new Date().getFullYear();

        const elements = [
            {
                element: 'radios',
                params: {
                    name: 'choice',
                    id: 'choice',
                    items: [
                        {
                            value: 'yes',
                            conditionalElements: [
                                {
                                    element: 'textInput',
                                    params: { name: 'yearField', id: 'yearField' },
                                    validations: [
                                        {
                                            check: 'valid',
                                            params: {
                                                checkValue: 'maxCurrentYear',
                                                message: 'Year must not be in the future'
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        { value: 'no' }
                    ]
                }
            }
        ];

        // ✅ valid case when selected "yes" with current year
        let formData = { choice: 'yes', yearField: String(currentYear) };
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // ❌ invalid case when selected "yes" with future year
        formData = { choice: 'yes', yearField: String(currentYear + 1) };
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1yearField: {
                id: 'yearField',
                message: 'Year must not be in the future',
                pageUrl: 'page1',
            },
        });

        // ✅ no validation triggered when "no" is chosen
        formData = { choice: 'no' };
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });

    it('40. should normalize European-style numbers correctly', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'amount', id: 'amount' },
                validations: [
                    { check: 'minValue', params: { checkValue: 1000, message: 'Below minimum' } },
                ],
            },
        ];
        const formData = { amount: '1.234,56' }; // → 1234.56
        const result = validateFormElements(elements, formData, 'page1');
        expect(result).to.deep.equal({});
    });

    it('41. should reject impossible dates like 31/02/2024', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'dateField', id: 'dateField' },
                validations: [
                    { check: 'valid', params: { checkValue: 'dateDMY', message: 'Invalid date' } },
                ],
            },
        ];
        const formData = { dateField: '31/02/2024' };
        const result = validateFormElements(elements, formData, 'page1');
        expect(result).to.deep.equal({
            page1dateField: { id: 'dateField', message: 'Invalid date', pageUrl: 'page1' },
        });
    });

    it('42. should fail IBAN validation when checksum is invalid', () => {
        const elements = [
            {
                element: 'textInput',
                params: { name: 'ibanField', id: 'ibanField' },
                validations: [
                    { check: 'valid', params: { checkValue: 'iban', message: 'Invalid IBAN' } },
                ],
            },
        ];
        const formData = { ibanField: 'CY17002001280000001200527601' }; // Fails checksum
        const result = validateFormElements(elements, formData, 'page1');
        expect(result).to.deep.equal({
            page1ibanField: { id: 'ibanField', message: 'Invalid IBAN', pageUrl: 'page1' },
        });
    });

    it('43. should return valueNotOnList error for radios with invalid value', () => {
        const elements = [
            {
                element: 'radios',
                params: {
                    name: 'colorChoice',
                    id: 'colorChoice',
                    items: [
                        { value: 'red' },
                        { value: 'blue' },
                    ],
                },
            },
        ];
        const formData = { colorChoice: 'green' }; // not in items
        const result = validateFormElements(elements, formData, 'page1');
        expect(Object.values(result)[0].message).to.equal(
            govcyResources.staticResources.text.valueNotOnList
        );
    });

    //------------- minCurrentYear validation ---------------------
    it('44. should validate `minCurrentYear` correctly', () => {
        const currentYear = new Date().getFullYear();

        const elements = [
            {
                element: 'textInput',
                params: { name: 'yearField', id: 'yearField' },
                validations: [
                    {
                        check: 'valid',
                        params: {
                            checkValue: 'minCurrentYear',
                            message: 'Year must not be before the current year'
                        }
                    }
                ],
            },
        ];

        const formData = { yearField: String(currentYear) };

        // ✅ current year passes
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // ✅ future year passes
        formData.yearField = String(currentYear + 1);
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // ❌ past year fails
        formData.yearField = String(currentYear - 1);
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1yearField: {
                id: 'yearField',
                message: 'Year must not be before the current year',
                pageUrl: 'page1',
            },
        });

        // ❌ non-numeric fails
        formData.yearField = 'abcd';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1yearField: {
                id: 'yearField',
                message: 'Year must not be before the current year',
                pageUrl: 'page1',
            },
        });

        // ✅ empty value passes (not required)
        formData.yearField = '';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });

    //------------- maxCurrentDate validation ---------------------
    it('45. should validate `maxCurrentDate` correctly', () => {
        const today = new Date();
        const todayISO = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const elements = [
            {
                element: 'textInput',
                params: { name: 'dateField', id: 'dateField' },
                validations: [
                    {
                        check: 'valid',
                        params: {
                            checkValue: 'maxCurrentDate',
                            message: 'Date cannot be in the future'
                        }
                    }
                ],
            },
        ];

        const formData = { dateField: todayISO };

        // ✅ today passes
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // ✅ past date passes
        formData.dateField = yesterday.toISOString().split('T')[0];
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // ❌ future date fails
        formData.dateField = tomorrow.toISOString().split('T')[0];
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1dateField: {
                id: 'dateField',
                message: 'Date cannot be in the future',
                pageUrl: 'page1',
            },
        });

        // ❌ invalid format fails
        formData.dateField = 'not-a-date';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1dateField: {
                id: 'dateField',
                message: 'Date cannot be in the future',
                pageUrl: 'page1',
            },
        });

        // ✅ empty passes
        formData.dateField = '';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });

    //------------- minCurrentDate validation ---------------------
    it('46. should validate `minCurrentDate` correctly', () => {
        const today = new Date();
        const todayISO = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const elements = [
            {
                element: 'textInput',
                params: { name: 'dateField', id: 'dateField' },
                validations: [
                    {
                        check: 'valid',
                        params: {
                            checkValue: 'minCurrentDate',
                            message: 'Date cannot be in the past'
                        }
                    }
                ],
            },
        ];

        const formData = { dateField: todayISO };

        // ✅ today passes
        let validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // ✅ future passes
        formData.dateField = tomorrow.toISOString().split('T')[0];
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});

        // ❌ past fails
        formData.dateField = yesterday.toISOString().split('T')[0];
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1dateField: {
                id: 'dateField',
                message: 'Date cannot be in the past',
                pageUrl: 'page1',
            },
        });

        // ❌ invalid format fails
        formData.dateField = 'not-a-date';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({
            page1dateField: {
                id: 'dateField',
                message: 'Date cannot be in the past',
                pageUrl: 'page1',
            },
        });

        // ✅ empty passes
        formData.dateField = '';
        validationErrors = validateFormElements(elements, formData, 'page1');
        expect(validationErrors).to.deep.equal({});
    });


    //TODO: test more validation rules
});