import * as chai from "chai";
import { Type, verify, VerifiedType, adjust, constrain, Constraint, ValidationError } from "..";


describe("type", () => {

    describe("null", () => {

        it("accepts null", () => {
            const myNullValue: null = verify(Type.null, null).value();
            chai.expect(myNullValue).to.equal(null);
        });

        it("rejects non-null values", () => {
            chai.expect(verify(Type.null, 0).err).to.be.instanceof(ValidationError);
            chai.expect(verify(Type.null, false).err).to.be.instanceof(ValidationError);
            chai.expect(verify(Type.null, undefined).err).to.be.instanceof(ValidationError);
            chai.expect(verify(Type.null, []).err).to.be.instanceof(ValidationError);
            chai.expect(verify(Type.null, {}).err).to.be.instanceof(ValidationError);
        });

    });

    describe("number", () => {

        it("accepts a number", () => {
            const myNumber = 123;
            chai.expect(verify(Type.number, myNumber).value()).to.equal(myNumber);
        });

        it("rejects non-numbers", () => {
            chai.expect(verify(Type.number, "456").err).to.be.instanceof(ValidationError);
        });

    });

    describe("string", () => {

        it("accepts a string", () => {
            const myString = "this is a string obviously";
            chai.expect(verify(Type.string, myString).value()).to.equal(myString);
        });

        it("rejects non-strings", () => {
            chai.expect(verify(Type.string, { not: "a string" }).err).to.be.instanceof(ValidationError);
        });

    });

    describe("boolean", () => {

        it("accepts true", () => {
            chai.expect(verify(Type.boolean, true).value()).to.equal(true);
        });

        it("accepts false", () => {
            chai.expect(verify(Type.boolean, false).value()).to.equal(false);
        });

        it("rejects non-booleans", () => {
            chai.expect(verify(Type.boolean, 1).err).to.be.instanceof(ValidationError);
        });

    });

    describe("literal", () => {

        it("accepts the literal value", () => {
            chai.expect(verify(Type.literal({ xyz: 1 }), "xyz").value()).to.equal("xyz");
        });

        it("accepts multiple literal values", () => {
            const value1or2 = Type.literal({ value1: 1, value2: 1 });
            chai.expect(verify(value1or2, "value1").value()).to.equal("value1");
            chai.expect(verify(value1or2, "value2").value()).to.equal("value2");
        });

        it("rejects values not in the literal list", () => {
            const value1or2 = Type.literal({ value1: 1, value2: 1 });
            chai.expect(verify(value1or2, "value3").err).to.be.instanceof(ValidationError);
        });

        it("rejects non-string values", () => {
            const value1or2 = Type.literal({ 123: 1, 456: 1 });
            chai.expect(verify(value1or2, 123).err).to.be.instanceof(ValidationError);
        });

    });

    describe("instance", () => {
        class MyClass {}
        const myClassSpec = Type.instance(MyClass);

        it("accepts a value of the specified instance", () => {
            const myClassInstance = new MyClass();
            chai.expect(verify(myClassSpec, myClassInstance).value()).to.equal(myClassInstance);
        });

        it("rejects instances of other classes", () => {
            class MyOtherClass {}
            chai.expect(verify(myClassSpec, new MyOtherClass()).err).to.be.instanceof(ValidationError);
        });

        it("rejects non-class objects", () => {
            chai.expect(verify(myClassSpec, {}).err).to.be.instanceof(ValidationError);
        });

    });

    describe("numeric", () => {

        it("accepts a number", () => {
            const myNumber = 123;
            chai.expect(verify(Type.numeric, myNumber).value()).to.equal(myNumber);
        });

        it("accepts a numeric string", () => {
            const myNumericString = "456";
            chai.expect(verify(Type.numeric, myNumericString).value()).to.equal(parseInt(myNumericString));
        });

        it("accepts a boolean", () => {
            chai.expect(verify(Type.numeric, true).value()).to.equal(1);
            chai.expect(verify(Type.numeric, false).value()).to.equal(0);
        });

        it("rejects non-numbers", () => {
            chai.expect(verify(Type.numeric, "abc").err).to.be.instanceof(ValidationError);
        });

    });

    describe("dateString", () => {

        it("accepts a date string", () => {
            const myDateString = "2019-02-09T15:44:38.020Z";
            chai.expect(verify(Type.dateString, myDateString).value().getTime()).to.equal(new Date(myDateString).getTime());
        });

        it("rejects non-date-strings", () => {
            chai.expect(verify(Type.dateString, "abc").err).to.be.instanceof(ValidationError);
        });

    });

    describe("object", () => {

        describe("flat", () => {
            const personSpec = Type.object({
                name: Type.string,
                age: Type.number
            });

            it("accepts valid data", () => {
                const data = {
                    name: "dave",
                    age: 36
                };
                const myModel: { name: string, age: number } = verify(personSpec, data).value();
                chai.expect(myModel).to.not.be.an.instanceof(ValidationError);
                chai.expect(myModel).to.have.property("name").that.equals("dave");
                chai.expect(myModel).to.have.property("age").that.equals(36);
            });

            it("rejects data with an invalid type", () => {
                const data = {
                    name: "dave",
                    age: "36"
                };
                const result = verify(personSpec, data);
                chai.expect(result.err).to.be.instanceof(ValidationError);
                chai.expect(result.err && result.err.generateReportJson()).to.eql({
                    msg: "Object validation failed.",
                    nested: [
                        {
                            key: "age",
                            msg: "Evaluation of attribute \"age\" failed.",
                            nested: [{ msg: "Not a number." }]
                        }
                    ]
                });
            });

            it("rejects incomplete data", () => {
                const data = {
                    age: 36
                };
                const result = verify(personSpec, data);
                chai.expect(result.err).to.be.instanceof(ValidationError);
                chai.expect(result.err && result.err.generateReportJson()).to.eql({
                    msg: "Object validation failed.",
                    nested: [
                        {
                            key: "name",
                            msg: "Attribute not present: \"name\"."
                        }
                    ]
                });
            });
        });

        describe("nested", () => {
            const addressSpec = Type.object({
                street: Type.string,
                houseNr: Type.number
            });
            const testSpec = Type.object({
                name: Type.string,
                address: addressSpec
            });
            type TestModel = VerifiedType<typeof testSpec>;

            it("accepts valid nested data", () => {
                const data = {
                    name: "dave",
                    address: {
                        street: "mainstreet",
                        houseNr: 123
                    }
                };
                const myModel: TestModel = verify(testSpec, data).value();
                chai.expect(myModel).to.have.property("name").that.equals("dave");
                chai.expect(myModel).to.have.property("address").that.has.property("street").that.equals("mainstreet");
                chai.expect(myModel).to.have.property("address").that.has.property("houseNr").that.equals(123);
            });
        });

        describe("strict", () => {
            const person = Type.object({
                name: Type.string
            });
            const strictPerson = adjust(person, { strict: true });
            const nonStrictPerson = adjust(person, { strict: false });

            it("rejects additional attributes by default", () => {
                const result = verify(person, { name: "dave", height: 187 });
                chai.expect(result.err && result.err.generateReportJson()).to.eql({
                    msg: "Data has attributes that are not part of the schema: \"height\"."
                });
            });

            it("rejects additional attributes in strict objects", () => {
                const result = verify(strictPerson, { name: "dave", height: 187 });
                chai.expect(result.err && result.err.generateReportJson()).to.eql({
                    msg: "Data has attributes that are not part of the schema: \"height\"."
                });
            });

            it("accepts additional attributes in non-strict objects", () => {
                const person = verify(nonStrictPerson, { name: "dave", height: 187 }).value();
                chai.expect(person.name).to.equal("dave");
            });

        });

        describe("failEarly", () => {
            const personSpec = Type.object({
                name: Type.string,
                age: Type.number
            });

            it("does not fail early by default", () => {
                const result = verify(personSpec, {});
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

            it("fails early when global option tells it to do so", () => {
                const result = verify(personSpec, {}, { failEarly: true });
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(1);
            });

            it("fails early when local option tells it to do so", () => {
                const result = verify(adjust(personSpec, { failEarly: true }), {});
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(1);
            });

            it("does not fail early when global option tells it to do so", () => {
                const result = verify(personSpec, {}, { failEarly: false });
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

            it("does not fail early when local option tells it to do so", () => {
                const result = verify(adjust(personSpec, { failEarly: false }), {});
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

            it("gives local option on fail early precendence over global option", () => {
                const result1 = verify(adjust(personSpec, { failEarly: true }), {}, { failEarly: false });
                chai.expect(result1.err && result1.err.generateReportJson()).to.have.property("nested").that.has.length(1);

                const result2 = verify(adjust(personSpec, { failEarly: false }), {}, { failEarly: true });
                chai.expect(result2.err && result2.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

        });

        describe("non-ValidationError", () => {
            const errorMessage = "Not a validation error.";
            const errorConstraint = {
                tag: "error-constraint",
                eval: (_value: number) => {
                    throw new Error(errorMessage);
                }
            };
            const errorObjectSpec = Type.object({ a: constrain(Type.number, [errorConstraint]) });

            it("throws the original error", () => {
                chai.expect(() => verify(errorObjectSpec, { a: 123 })).to.throw(Error).that.has.property("message").to.equal(errorMessage);
            });

        });

    });

    describe("array", () => {
        const testSpec = Type.object({
            name: Type.string,
            orders: Type.array(Type.object({
                id: Type.number,
                items: Type.array(Type.object({
                    description: Type.string,
                    price: Type.number
                }))
            }))
        });

        it("accepts valid array data", () => {
            const data = {
                name: "dave",
                orders: [
                    {
                        id: 1,
                        items: [
                            { description: "something", price: 99.95 },
                            { description: "something else", price: 148.75 }
                        ]
                    },
                    {
                        id: 2,
                        items: []
                    }
                ]
            };
            const result = verify(testSpec, data);
            chai.expect(result.err).to.not.be.instanceof(ValidationError);
            const myModel: {
                name: string,
                orders: Array<{
                    id: number,
                    items: {
                        description: string,
                        price: number
                    }[]
                }>
            } = result.value();
            chai.expect(myModel.name).to.equal("dave");
            chai.expect(myModel.orders).to.eql(data.orders);
        });

        it("rejects non array data", () => {
            const data = {
                name: "dave",
                orders: "notAnArray"
            };
            const result = verify(testSpec, data);
            chai.expect(result.err).to.be.instanceof(ValidationError);
            chai.expect(result.err && result.err.generateReportJson()).to.eql({
                msg: "Object validation failed.",
                nested: [
                    {
                        key: "orders",
                        msg: "Evaluation of attribute \"orders\" failed.",
                        nested: [{ msg: "Not an array." }]
                    }
                ]
            });
        });

        it("rejects invalid array data", () => {
            const data = {
                name: "dave",
                orders: [
                    { id: 123, invalidKey: "x" }
                ]
            };
            const result = verify(testSpec, data);
            chai.expect(result.err).to.be.instanceof(ValidationError);
            chai.expect(result.err && result.err.generateReportJson()).to.eql({
                msg: "Object validation failed.",
                nested: [
                    {
                        key: "orders",
                        msg: "Evaluation of attribute \"orders\" failed.",
                        nested: [
                            {
                                msg: "Array validation failed.",
                                nested: [
                                    {
                                        key: 0,
                                        msg: "Evaluation of array element at index \"0\" failed.",
                                        nested: [
                                            { msg: "Data has attributes that are not part of the schema: \"invalidKey\"."}
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
        });

        describe("failEarly", () => {
            const numberArraySpec = Type.array(Type.number);

            it("does not fail early by default", () => {
                const result = verify(numberArraySpec, ["x", "y"]);
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

            it("fails early when global option tells it to do so", () => {
                const result = verify(numberArraySpec, ["x", "y"], { failEarly: true });
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(1);
            });

            it("fails early when local option tells it to do so", () => {
                const result = verify(adjust(numberArraySpec, { failEarly: true }), ["x", "y"]);
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(1);
            });

            it("does not fail early when global option tells it to do so", () => {
                const result = verify(numberArraySpec, ["x", "y"], { failEarly: false });
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

            it("does not fail early when local option tells it to do so", () => {
                const result = verify(adjust(numberArraySpec, { failEarly: false }), ["x", "y"]);
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

            it("gives local option on fail early precendence over global option", () => {
                const result1 = verify(adjust(numberArraySpec, { failEarly: true }), ["x", "y"], { failEarly: false });
                chai.expect(result1.err && result1.err.generateReportJson()).to.have.property("nested").that.has.length(1);

                const result2 = verify(adjust(numberArraySpec, { failEarly: false }), ["x", "y"], { failEarly: true });
                chai.expect(result2.err && result2.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

        });

        describe("skipInvalid", () => {
            const numberArraySpec = Type.array(Type.number);

            it("does not skip invalid elements by default", () => {
                const result = verify(numberArraySpec, [1, "x", "y", 4]);
                chai.expect(result.err).to.be.instanceof(ValidationError);
            });

            it("does not skip invalid elements when local option tells it to do so", () => {
                const result = verify(adjust(numberArraySpec, { skipInvalid: false }), [1, "x", "y", 4]);
                chai.expect(result.err).to.be.instanceof(ValidationError);
            });

            it("skips invalid elements when local option tells it to do so", () => {
                const value = verify(adjust(numberArraySpec, { skipInvalid: true }), [1, "x", "y", 4]).value();
                chai.expect(value).to.eql([1, 4]);
            });

        });

        describe("non-ValidationError", () => {
            const errorMessage = "Not a validation error.";
            const errorConstraint = {
                tag: "error-constraint",
                eval: (_value: number) => {
                    throw new Error(errorMessage);
                }
            };
            const errorArraySpec = Type.array(constrain(Type.number, [errorConstraint]));

            it("throws the original error", () => {
                chai.expect(() => verify(errorArraySpec, [123])).to.throw(Error).that.has.property("message").to.equal(errorMessage);
            });

        });

    });

    describe("map", () => {
        const keySpec = constrain(Type.string, [Constraint.string.regex(/^[a-z]+$/)]);
        const testSpec = Type.map(keySpec, Type.array(Type.number));

        it("accepts valid keys and values", () => {
            const data = {
                abc: [1, 2],
                def: [3]
            };
            const myModel = verify(testSpec, data).value();
            chai.expect(myModel).to.have.property("abc").to.eql([1, 2]);
        });

        it("rejects invalid keys", () => {
            const data = {
                abc: [1, 2],
                NotValid: [4, 5],
                AlsoNotValid: [6],
                def: [3]
            };
            const result = verify(testSpec, data);
            chai.expect(result.err).to.be.instanceof(ValidationError);
            chai.expect(result.err && result.err.generateReportJson()).to.eql({
                msg: "Map validation failed.",
                nested: [
                    {
                        key: "NotValid",
                        msg: "Evaluation of map key \"NotValid\" failed.",
                        nested: [{ msg: "String does not match /^[a-z]+$/ regex" }]
                    },
                    {
                        key: "AlsoNotValid",
                        msg: "Evaluation of map key \"AlsoNotValid\" failed.",
                        nested: [{ msg: "String does not match /^[a-z]+$/ regex" }]
                    }
                ]
            });
        });

        it("rejects invalid values", () => {
            const data = {
                abc: "notAnArray",
                def: [3],
                ghi: "alsoNotAnArray"
            };
            const result = verify(testSpec, data);
            chai.expect(result.err).to.be.instanceof(ValidationError);
            chai.expect(result.err && result.err.generateReportJson()).to.eql({
                msg: "Map validation failed.",
                nested: [
                    {
                        key: "abc",
                        msg: "Evaluation of map value for key \"abc\" failed.",
                        nested: [{ msg: "Not an array." }]
                    },
                    {
                        key: "ghi",
                        msg: "Evaluation of map value for key \"ghi\" failed.",
                        nested: [{ msg: "Not an array." }]
                    }
                ]
            });
        });

        describe("failEarly", () => {
            it("does not fail early by default", () => {
                const result = verify(testSpec, { NotValidKey: [1], invalidvalue: "x" });
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

            it("fails early when global option tells it to do so", () => {
                const result = verify(testSpec, { NotValidKey: [1], invalidvalue: "x" }, { failEarly: true });
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(1);
            });

            it("fails early when local option tells it to do so", () => {
                const result = verify(adjust(testSpec, { failEarly: true }), { NotValidKey: [1], invalidvalue: "x" });
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(1);
            });

            it("does not fail early when global option tells it to do so", () => {
                const result = verify(testSpec, { NotValidKey: [1], invalidvalue: "x" }, { failEarly: false });
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

            it("does not fail early when local option tells it to do so", () => {
                const result = verify(adjust(testSpec, { failEarly: false }), { NotValidKey: [1], invalidvalue: "x" });
                chai.expect(result.err && result.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

            it("gives local option on fail early precendence over global option", () => {
                const result1 = verify(adjust(testSpec, { failEarly: true }), { NotValidKey: [1], invalidvalue: "x" }, { failEarly: false });
                chai.expect(result1.err && result1.err.generateReportJson()).to.have.property("nested").that.has.length(1);

                const result2 = verify(adjust(testSpec, { failEarly: false }), { NotValidKey: [1], invalidvalue: "x" }, { failEarly: true });
                chai.expect(result2.err && result2.err.generateReportJson()).to.have.property("nested").that.has.length(2);
            });

        });

        describe("skipInvalidKeys", () => {
            const charSpec = constrain(Type.string, [Constraint.string.length({ min: 1, max: 1})]);
            const charToNumberMapSpec = Type.map(charSpec, Type.number);

            it("does not skip invalid keys by default", () => {
                const result = verify(charToNumberMapSpec, { abc: 123 });
                chai.expect(result.err).to.be.instanceof(ValidationError);
            });

            it("does not skip invalid keys when local option tells it to do so", () => {
                const result = verify(adjust(charToNumberMapSpec, { skipInvalidKeys: false }), { def: 456 });
                chai.expect(result.err).to.be.instanceof(ValidationError);
            });

            it("skips invalid keys when local option tells it to do so", () => {
                const value = verify(adjust(charToNumberMapSpec, { skipInvalidKeys: true }), { a: 7, bbb: 8, c: 9 }).value();
                chai.expect(value).to.eql({ a: 7, c: 9 });
            });

        });

        describe("skipInvalidValues", () => {
            const stringToNumberMapSpec = Type.map(Type.string, Type.number);

            it("does not skip invalid values by default", () => {
                const result = verify(stringToNumberMapSpec, { a: "not_a_number" });
                chai.expect(result.err).to.be.instanceof(ValidationError);
            });

            it("does not skip invalid values when local option tells it to do so", () => {
                const result = verify(adjust(stringToNumberMapSpec, { skipInvalidValues: false }), { a: "Not a number" });
                chai.expect(result.err).to.be.instanceof(ValidationError);
            });

            it("skips invalid keys when local option tells it to do so", () => {
                const value = verify(adjust(stringToNumberMapSpec, { skipInvalidValues: true }), { a: 123, b: "Not A Number", c: 456 }).value();
                chai.expect(value).to.eql({ a: 123, c: 456 });
            });

        });

        describe("non-ValidationError", () => {
            const errorMessage = "Not a validation error.";
            const errorConstraint = {
                tag: "error-constraint",
                eval: (_value: string) => {
                    throw new Error(errorMessage);
                }
            };

            it("throws the original error when error occurs in key validation", () => {
                const errorMapSpec = Type.map(constrain(Type.string, [errorConstraint]), Type.number);
                chai.expect(() => verify(errorMapSpec, { a: 123 })).to.throw(Error).that.has.property("message").to.equal(errorMessage);
            });

            it("throws the original error when error occurs in value validation", () => {
                const errorMapSpec = Type.map(Type.string, constrain(Type.string, [errorConstraint]));
                chai.expect(() => verify(errorMapSpec, { a: "xyz" })).to.throw(Error).that.has.property("message").to.equal(errorMessage);
            });

        });

    });
});

