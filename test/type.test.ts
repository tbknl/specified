import * as chai from "chai";
import { Type, verify, VerifiedType, optional, adjust, definitionOf, constrain, Constraint } from "..";
import { staticAssertIsNotAny, staticAssertUndefinedNotAllowed, staticAssertIsArray } from "./static-assert";


describe("type", () => {

    describe("unknown", () => {

        it("accepts anything", () => {
            chai.expect(verify(Type.unknown, null).value()).to.equal(null);
            chai.expect(verify(Type.unknown, undefined).value()).to.equal(undefined);
            chai.expect(verify(Type.unknown, 123).value()).to.equal(123);
            chai.expect(verify(Type.unknown, "A string is welcome too").value()).to.equal("A string is welcome too");
            chai.expect(verify(Type.unknown, { a: 1, b: "x" }).value()).to.eql({ a: 1, b: "x" });
            chai.expect(verify(Type.unknown, [1, "x", {}]).value()).to.eql([1, "x", {}]);
        });

        it("has the correct definition type", () => {
            chai.expect(definitionOf(Type.unknown)).to.eql({ type: "unknown" });
        });

    });

    describe("null", () => {

        it("accepts null", () => {
            const myNullValue: null = verify(Type.null, null).value();
            chai.expect(myNullValue).to.equal(null);
        });

        it("rejects non-null values", () => {
            chai.expect(verify(Type.null, 0).err).to.have.property("code", "type.null.not_null");
            chai.expect(verify(Type.null, false).err).to.have.property("code", "type.null.not_null");
            chai.expect(verify(Type.null, undefined).err).to.have.property("code", "type.null.not_null");
            chai.expect(verify(Type.null, []).err).to.have.property("code", "type.null.not_null");
            chai.expect(verify(Type.null, {}).err).to.have.property("code", "type.null.not_null");
        });

        it("has the correct definition type", () => {
            chai.expect(definitionOf(Type.null)).to.eql({ type: "null" });
        });

    });

    describe("number", () => {

        it("accepts a number", () => {
            const myNumber = 123;
            chai.expect(verify(Type.number, myNumber).value()).to.equal(myNumber);
        });

        it("rejects non-numbers", () => {
            chai.expect(verify(Type.number, "456").err).to.have.property("code", "type.number.not_a_number");
        });

        it("has the correct definition type", () => {
            chai.expect(definitionOf(Type.number)).to.eql({ type: "number" });
        });

    });

    describe("string", () => {

        it("accepts a string", () => {
            const myString = "this is a string obviously";
            chai.expect(verify(Type.string, myString).value()).to.equal(myString);
        });

        it("rejects non-strings", () => {
            chai.expect(verify(Type.string, { not: "a string" }).err).to.have.property("code", "type.string.not_a_string");
        });

        it("has the correct definition type", () => {
            chai.expect(definitionOf(Type.string)).to.eql({ type: "string" });
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
            chai.expect(verify(Type.boolean, 1).err).to.have.property("code", "type.boolean.not_a_boolean");
        });

        it("has the correct definition type", () => {
            chai.expect(definitionOf(Type.boolean)).to.eql({ type: "boolean" });
        });

    });

	describe("symbol", () => {
        const mySymbol = Symbol("my");
        const lookalike = Symbol("my");

        it("accepts symbols", () => {
            chai.expect(verify(Type.symbol, Symbol()).err).to.equal(null);
        });

        it("results in the same symbol", () => {
            chai.expect(verify(Type.symbol, mySymbol).value()).to.equal(mySymbol);
            chai.expect(verify(Type.symbol, mySymbol).value()).to.not.equal(lookalike);
        });

        it("rejects non-symbols", () => {
            chai.expect(verify(Type.symbol, "not-a-symbol").err).to.have.property("code", "type.symbol.not_a_symbol");
        });

        it("has the correct definition type", () => {
            chai.expect(definitionOf(Type.symbol)).to.eql({ type: "symbol" });
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
            chai.expect(verify(value1or2, "value3").err).to.have.property("code", "type.literal.incorrect_literal");
        });

        it("rejects non-string values", () => {
            const value1or2 = Type.literal({ 123: 1, 456: 1 });
            chai.expect(verify(value1or2, 123).err).to.have.property("code", "type.literal.incorrect_literal");
        });

        it("has the correct definition type", () => {
            chai.expect(definitionOf(Type.literal({ a: 1, b: 1 }))).to.eql({
                type: "literal",
                settings: { values: ["a", "b"] }
            });
        });

    });

    describe("literalValue", () => {
        const literalValueSpec = Type.literalValue(123 as 123, "abc" as "abc", true as true);
        const value = verify(literalValueSpec, "abc").value();
        staticAssertIsNotAny(value);
        staticAssertUndefinedNotAllowed(value);

        it("accepts the single literal value", () => {
            chai.expect(verify(Type.literalValue(123 as 123), 123).value()).to.equal(123);
        });

        it("accepts multiple literal values", () => {
            const multiliteral = Type.literalValue(123 as 123, "abc" as "abc");
            chai.expect(verify(multiliteral, 123).value()).to.equal(123);
            chai.expect(verify(multiliteral, "abc").value()).to.equal("abc");
        });

        it("rejects values not in the literal list", () => {
            const multiliteral = Type.literalValue(123 as 123, "abc" as "abc", true as true);
            chai.expect(verify(multiliteral, 456).err).to.have.property("code", "type.literalValue.incorrect_literal_value");
            chai.expect(verify(multiliteral, false).err).to.have.property("code", "type.literalValue.incorrect_literal_value");
        });

        it("has the correct definition type", () => {
            chai.expect(definitionOf(Type.literalValue(123 as 123, "abc" as "abc", true as true))).to.eql({
                type: "literalValue",
                settings: { values: [123, "abc", true] }
            });
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
            chai.expect(verify(myClassSpec, new MyOtherClass()).err).to.have.property("code", "type.instance.not_an_instance_of");
        });

        it("rejects non-class objects", () => {
            chai.expect(verify(myClassSpec, {}).err).to.have.property("code", "type.instance.not_an_instance_of");
        });

        it("has the correct definition type", () => {
            chai.expect(definitionOf(myClassSpec)).to.eql({
                type: "instance",
                settings: { className: MyClass.name }
            });
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
            chai.expect(verify(Type.numeric, "abc").err).to.have.property("code", "type.numeric.not_a_finite_number");
        });

    });

    describe("booleanKey", () => {
        const onlyTruthyBooleanKeySpec = Type.booleanKey({ truthy: ["Yes", "1", "true", "ON"] });
        const truthyAndFalsyBooleanKeySpec = Type.booleanKey({ truthy: ["Yes", "1", "true", "ON"], falsy: ["No", "0", ""] });

        it("accepts a truthy value", () => {
            chai.expect(verify(onlyTruthyBooleanKeySpec, "Yes").value()).to.equal(true);
            chai.expect(verify(onlyTruthyBooleanKeySpec, 1).value()).to.equal(true);
        });

        it("accepts a falsy value", () => {
            chai.expect(verify(truthyAndFalsyBooleanKeySpec, "No").value()).to.equal(false);
            chai.expect(verify(truthyAndFalsyBooleanKeySpec, 0).value()).to.equal(false);
            chai.expect(verify(truthyAndFalsyBooleanKeySpec, "").value()).to.equal(false);
        });

        it("accepts any value as false if no falsy keys are set", () => {
            chai.expect(verify(onlyTruthyBooleanKeySpec, "FALSY").value()).to.equal(false);
            chai.expect(verify(onlyTruthyBooleanKeySpec, "").value()).to.equal(false);
            chai.expect(verify(onlyTruthyBooleanKeySpec, 1234).value()).to.equal(false);
        });

        it("rejects a value if it is not set as truthy or falsy while other falsy keys are set", () => {
            chai.expect(verify(truthyAndFalsyBooleanKeySpec, "InvalidKey").err).to.have.property("code", "type.booleanKey.invalid_key");
        });

        it("matches case-different strings if caseInsensitive option is true", () => {
            const caseInsensitiveBooleanKeySpec = Type.booleanKey({ truthy: ["Yes", "1", "true", "ON"], falsy: ["No", "0", ""] }, { caseInsensitive: true });
            chai.expect(verify(caseInsensitiveBooleanKeySpec, "yes").value()).to.equal(true);
            chai.expect(verify(caseInsensitiveBooleanKeySpec, "TRUE").value()).to.equal(true);
            chai.expect(verify(caseInsensitiveBooleanKeySpec, "on").value()).to.equal(true);
            chai.expect(verify(caseInsensitiveBooleanKeySpec, "nO").value()).to.equal(false);
            chai.expect(verify(caseInsensitiveBooleanKeySpec, 0).value()).to.equal(false);
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
                chai.expect(myModel).to.have.property("name").that.equals("dave");
                chai.expect(myModel).to.have.property("age").that.equals(36);
            });

            it("rejects data with an invalid type", () => {
                const data = {
                    name: "dave",
                    age: "36"
                };
                const result = verify(personSpec, data);
                chai.expect(result.err).to.have.property("code", "type.object.invalid_attribute_data");
                chai.expect(result.err).to.have.property("nestedErrors").to.have.length(1);
                const nestedError = result.err && result.err.nestedErrors && result.err.nestedErrors[0];
                chai.expect(nestedError).to.have.property("code", "type.object.invalid_attribute");
                chai.expect(nestedError).to.have.property("key", "age");
                chai.expect(nestedError).to.have.property("value", "36");
            });

            it("rejects incomplete data", () => {
                const data = {
                    age: 36
                };
                const result = verify(personSpec, data);
                chai.expect(result.err).to.have.property("code", "type.object.invalid_attribute_data");
                chai.expect(result.err).to.have.property("nestedErrors").to.have.length(1);
                const nestedError = result.err && result.err.nestedErrors && result.err.nestedErrors[0];
                chai.expect(nestedError).to.have.property("code", "type.object.missing_attribute");
                chai.expect(nestedError).to.have.property("key", "name");
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
            const personSpec = Type.object({
                name: Type.string
            });
            const strictPerson = adjust(personSpec, { strict: true });
            const nonStrictPerson = adjust(personSpec, { strict: false });

            it("rejects additional attributes by default", () => {
                const result = verify(personSpec, { name: "dave", height: 187, age: 36 });
                chai.expect(result.err).to.have.property("code", "type.object.invalid_attribute_data");
                chai.expect(result.err).to.have.property("nestedErrors").to.have.length(2);
                const nestedError0 = result.err && result.err.nestedErrors && result.err.nestedErrors[0];
                chai.expect(nestedError0).to.have.property("code", "type.object.extra_attribute");
                chai.expect(nestedError0).to.have.property("key", "height");
                const nestedError1 = result.err && result.err.nestedErrors && result.err.nestedErrors[1];
                chai.expect(nestedError1).to.have.property("code", "type.object.extra_attribute");
                chai.expect(nestedError1).to.have.property("key", "age");
            });

            it("rejects additional attributes in strict objects", () => {
                const result = verify(strictPerson, { name: "dave", height: 187, age: 36 });
                chai.expect(result.err).to.have.property("code", "type.object.invalid_attribute_data");
                chai.expect(result.err).to.have.property("nestedErrors").to.have.length(2);
                const nestedError0 = result.err && result.err.nestedErrors && result.err.nestedErrors[0];
                chai.expect(nestedError0).to.have.property("code", "type.object.extra_attribute");
                chai.expect(nestedError0).to.have.property("key", "height");
                const nestedError1 = result.err && result.err.nestedErrors && result.err.nestedErrors[1];
                chai.expect(nestedError1).to.have.property("code", "type.object.extra_attribute");
                chai.expect(nestedError1).to.have.property("key", "age");
            });

            it("accepts additional attributes in non-strict objects", () => {
                const person = verify(nonStrictPerson, { name: "dave", height: 187, age: 36 }).value();
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
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("fails early when global option tells it to do so", () => {
                const result = verify(personSpec, {}, { failEarly: true });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(1);
            });

            it("fails early when local option tells it to do so", () => {
                const result = verify(adjust(personSpec, { failEarly: true }), {});
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(1);
            });

            it("does not fail early when global option tells it to do so", () => {
                const result = verify(personSpec, {}, { failEarly: false });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("does not fail early when local option tells it to do so", () => {
                const result = verify(adjust(personSpec, { failEarly: false }), {});
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("gives local option on fail early precendence over global option", () => {
                const result1 = verify(adjust(personSpec, { failEarly: true }), {}, { failEarly: false });
                chai.expect(result1.err).to.have.property("nestedErrors").that.has.length(1);

                const result2 = verify(adjust(personSpec, { failEarly: false }), {}, { failEarly: true });
                chai.expect(result2.err).to.have.property("nestedErrors").that.has.length(2);
            });

        });

        describe("non-ValidationError", () => {
            const errorMessage = "Not a validation error.";
            const errorConstraint = {
                definition: { name: "error-constraint" },
                eval: (_value: number) => {
                    throw new Error(errorMessage);
                }
            };
            const errorObjectSpec = Type.object({ a: constrain(Type.number, [errorConstraint]) });

            it("throws the original error", () => {
                chai.expect(() => verify(errorObjectSpec, { a: 123 })).to.throw(Error).that.has.property("message").to.equal(errorMessage);
            });

        });

        describe("definition", () => {
            const aSpec = Type.number;
            const bSpec = optional(Type.string);
            const objSpec = Type.object({
                a: aSpec,
                b: bSpec
            });

            it("has the correct definition type", () => {
                chai.expect(definitionOf(objSpec).type).to.equal("object");
            });

            it("uses the schema attributes and their specs definitions for the nested types", () => {
                chai.expect(definitionOf(objSpec).nested).to.eql({
                    a: definitionOf(aSpec),
                    b: definitionOf(bSpec)
                });
            });

            it("includes the optional attribute descriptions from the schema", () => {
                const schemaWithDescriptions = {
                    attrA: { ...Type.string, description: "This describes attribute A."},
                    attrB: Type.number,
                    attrC: { ...Type.boolean, description: "This describes attribute C."},
                };
                const objSpecWithDescriptions = Type.object(schemaWithDescriptions);
                chai.expect(definitionOf(objSpecWithDescriptions).descriptions).to.eql({
                    attrA: schemaWithDescriptions.attrA.description,
                    attrC: schemaWithDescriptions.attrC.description
                });
            });

        });

    });

    describe("interface", () => {
        // NOTE: Type.interface shares the implementation with Type.object . More thorough tests can be found for "object".

        describe("strict", () => {
            const personSpec = Type.interface({
                name: Type.string
            });

            it("accepts additional attributes by default", () => {
                const person = verify(personSpec, { name: "dave", height: 187 }).value();
                chai.expect(person.name).to.equal("dave");
            });

        });

        describe("definition", () => {
            const aSpec = Type.number;
            const bSpec = optional(Type.string);
            const ifaceSpec = Type.interface({
                a: aSpec,
                b: bSpec
            });

            it("has the correct definition type", () => {
                chai.expect(definitionOf(ifaceSpec).type).to.equal("interface");
            });

            it("uses the schema attributes and their specs definitions for the nested types", () => {
                chai.expect(definitionOf(ifaceSpec).nested).to.eql({
                    a: definitionOf(aSpec),
                    b: definitionOf(bSpec)
                });
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
            chai.expect(result.err).to.be.null;
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
            chai.expect(result.err).to.be.an("object");
            chai.expect(result.err).to.have.property("code", "type.object.invalid_attribute_data");
            chai.expect(result.err).to.have.property("nestedErrors").to.have.length(1);
            const nestedError0 = result.err && result.err.nestedErrors && result.err.nestedErrors[0];
            chai.expect(nestedError0).to.have.property("code", "type.object.invalid_attribute");
            chai.expect(nestedError0).to.have.property("key", "orders");
            const nestedError1 = nestedError0 && nestedError0.nestedErrors && nestedError0.nestedErrors[0];
            chai.expect(nestedError1).to.have.property("code", "type.array.not_an_array");
        });

        it("rejects invalid array data", () => {
            const data = {
                name: "dave",
                orders: [
                    { id: 123, invalidKey: "x" }
                ]
            };
            const result = verify(testSpec, data);
            chai.expect(result.err).to.be.an("object");
            chai.expect(result.err).to.have.property("code", "type.object.invalid_attribute_data");
            chai.expect(result.err).to.have.property("nestedErrors").to.have.length(1);
            const nestedError0 = result.err && result.err.nestedErrors && result.err.nestedErrors[0];
            chai.expect(nestedError0).to.have.property("code", "type.object.invalid_attribute");
            chai.expect(nestedError0).to.have.property("key", "orders");
            chai.expect(nestedError0).to.have.property("nestedErrors").to.have.length(1);
            const nestedError1 = nestedError0 && nestedError0.nestedErrors && nestedError0.nestedErrors[0];
            chai.expect(nestedError1).to.have.property("code", "type.array.invalid_elements");
            chai.expect(nestedError1).to.have.property("nestedErrors").to.have.length(1);
            const nestedError2 = nestedError1 && nestedError1.nestedErrors && nestedError1.nestedErrors[0];
            chai.expect(nestedError2).to.have.property("code", "type.array.invalid_element");
            chai.expect(nestedError2).to.have.property("key", 0);
            chai.expect(nestedError2).to.have.property("nestedErrors").to.have.length(1);
        });

        describe("failEarly", () => {
            const numberArraySpec = Type.array(Type.number);

            it("does not fail early by default", () => {
                const result = verify(numberArraySpec, ["x", "y"]);
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("fails early when global option tells it to do so", () => {
                const result = verify(numberArraySpec, ["x", "y"], { failEarly: true });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(1);
            });

            it("fails early when local option tells it to do so", () => {
                const result = verify(adjust(numberArraySpec, { failEarly: true }), ["x", "y"]);
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(1);
            });

            it("does not fail early when global option tells it to do so", () => {
                const result = verify(numberArraySpec, ["x", "y"], { failEarly: false });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("does not fail early when local option tells it to do so", () => {
                const result = verify(adjust(numberArraySpec, { failEarly: false }), ["x", "y"]);
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("gives local option on fail early precendence over global option", () => {
                const result1 = verify(adjust(numberArraySpec, { failEarly: true }), ["x", "y"], { failEarly: false });
                chai.expect(result1.err).to.have.property("nestedErrors").that.has.length(1);

                const result2 = verify(adjust(numberArraySpec, { failEarly: false }), ["x", "y"], { failEarly: true });
                chai.expect(result2.err).to.have.property("nestedErrors").that.has.length(2);
            });

        });

        describe("skipInvalid", () => {
            const numberArraySpec = Type.array(Type.number);

            it("does not skip invalid elements by default", () => {
                const result = verify(numberArraySpec, [1, "x", "y", 4]);
                chai.expect(result.err).to.be.an("object");
            });

            it("does not skip invalid elements when local option tells it to do so", () => {
                const result = verify(adjust(numberArraySpec, { skipInvalid: false }), [1, "x", "y", 4]);
                chai.expect(result.err).to.be.an("object");
            });

            it("skips invalid elements when local option tells it to do so", () => {
                const value = verify(adjust(numberArraySpec, { skipInvalid: true }), [1, "x", "y", 4]).value();
                chai.expect(value).to.eql([1, 4]);
            });

        });

        describe("non-ValidationError", () => {
            const errorMessage = "Not a validation error.";
            const errorConstraint = {
                definition: { name: "error-constraint" },
                eval: (_value: number) => {
                    throw new Error(errorMessage);
                }
            };
            const errorArraySpec = Type.array(constrain(Type.number, [errorConstraint]));

            it("throws the original error", () => {
                chai.expect(() => verify(errorArraySpec, [123])).to.throw(Error).that.has.property("message").to.equal(errorMessage);
            });

        });

        describe("definition", () => {
            const elementSpec = Type.number;
            const arraySpec = Type.array(elementSpec);

            it("has the correct definition type", () => {
                chai.expect(definitionOf(arraySpec).type).to.equal("array");
            });

            it("uses the element spec for the nested type", () => {
                chai.expect(definitionOf(arraySpec).nested).to.eql({
                    element: definitionOf(elementSpec)
                });
            });

        });

    });

    describe("map", () => {
        const testKeySpec = constrain(Type.string, [Constraint.string.regex(/^[a-z]+$/)]);
        const testSpec = Type.map(testKeySpec, Type.array(Type.number));

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
            chai.expect(result.err).to.be.an("object");
            chai.expect(result.err).to.have.property("code", "type.map.invalid_data");
            chai.expect(result.err).to.have.property("nestedErrors").to.have.length(2);
            const nestedError0 = result.err && result.err.nestedErrors && result.err.nestedErrors[0];
            chai.expect(nestedError0).to.have.property("code", "type.map.invalid_key");
            chai.expect(nestedError0).to.have.property("key", "NotValid");
            chai.expect(nestedError0).to.have.property("value", "NotValid");
            chai.expect(nestedError0).to.have.property("nestedErrors").to.have.length(1);
            const nestedError1 = result.err && result.err.nestedErrors && result.err.nestedErrors[1];
            chai.expect(nestedError1).to.have.property("code", "type.map.invalid_key");
            chai.expect(nestedError1).to.have.property("key", "AlsoNotValid");
            chai.expect(nestedError1).to.have.property("value", "AlsoNotValid");
            chai.expect(nestedError1).to.have.property("nestedErrors").to.have.length(1);
        });

        it("rejects invalid values", () => {
            const data = {
                abc: "notAnArray",
                def: [3],
                ghi: "alsoNotAnArray"
            };
            const result = verify(testSpec, data);
            chai.expect(result.err).to.be.an("object");
            chai.expect(result.err).to.have.property("code", "type.map.invalid_data");
            chai.expect(result.err).to.have.property("nestedErrors").to.have.length(2);
            const nestedError0 = result.err && result.err.nestedErrors && result.err.nestedErrors[0];
            chai.expect(nestedError0).to.have.property("code", "type.map.invalid_value");
            chai.expect(nestedError0).to.have.property("key", "abc");
            chai.expect(nestedError0).to.have.property("value", "notAnArray");
            chai.expect(nestedError0).to.have.property("nestedErrors").to.have.length(1);
            const nestedError1 = result.err && result.err.nestedErrors && result.err.nestedErrors[1];
            chai.expect(nestedError1).to.have.property("code", "type.map.invalid_value");
            chai.expect(nestedError1).to.have.property("key", "ghi");
            chai.expect(nestedError1).to.have.property("value", "alsoNotAnArray");
            chai.expect(nestedError1).to.have.property("nestedErrors").to.have.length(1);
        });

        describe("failEarly", () => {
            it("does not fail early by default", () => {
                const result = verify(testSpec, { NotValidKey: [1], invalidvalue: "x" });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("fails early when global option tells it to do so", () => {
                const result = verify(testSpec, { NotValidKey: [1], invalidvalue: "x" }, { failEarly: true });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(1);
            });

            it("fails early when local option tells it to do so", () => {
                const result = verify(adjust(testSpec, { failEarly: true }), { NotValidKey: [1], invalidvalue: "x" });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(1);
            });

            it("does not fail early when global option tells it to do so", () => {
                const result = verify(testSpec, { NotValidKey: [1], invalidvalue: "x" }, { failEarly: false });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("does not fail early when local option tells it to do so", () => {
                const result = verify(adjust(testSpec, { failEarly: false }), { NotValidKey: [1], invalidvalue: "x" });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("gives local option on fail early precendence over global option", () => {
                const result1 = verify(adjust(testSpec, { failEarly: true }), { NotValidKey: [1], invalidvalue: "x" }, { failEarly: false });
                chai.expect(result1.err).to.have.property("nestedErrors").that.has.length(1);

                const result2 = verify(adjust(testSpec, { failEarly: false }), { NotValidKey: [1], invalidvalue: "x" }, { failEarly: true });
                chai.expect(result2.err).to.have.property("nestedErrors").that.has.length(2);
            });

        });

        describe("skipInvalidKeys", () => {
            const charSpec = constrain(Type.string, [Constraint.string.length({ min: 1, max: 1})]);
            const charToNumberMapSpec = Type.map(charSpec, Type.number);

            it("does not skip invalid keys by default", () => {
                const result = verify(charToNumberMapSpec, { abc: 123 });
                chai.expect(result.err).to.be.an("object");
            });

            it("does not skip invalid keys when local option tells it to do so", () => {
                const result = verify(adjust(charToNumberMapSpec, { skipInvalidKeys: false }), { def: 456 });
                chai.expect(result.err).to.be.an("object");
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
                chai.expect(result.err).to.be.an("object");
            });

            it("does not skip invalid values when local option tells it to do so", () => {
                const result = verify(adjust(stringToNumberMapSpec, { skipInvalidValues: false }), { a: "Not a number" });
                chai.expect(result.err).to.be.an("object");
            });

            it("skips invalid keys when local option tells it to do so", () => {
                const value = verify(adjust(stringToNumberMapSpec, { skipInvalidValues: true }), { a: 123, b: "Not A Number", c: 456 }).value();
                chai.expect(value).to.eql({ a: 123, c: 456 });
            });

        });

        describe("non-ValidationError", () => {
            const errorMessage = "Not a validation error.";
            const errorConstraint = {
                definition: { name: "error-constraint" },
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

        describe("definition", () => {
            const keySpec = constrain(Type.string, [Constraint.string.length({ min: 1 })]);
            const valueSpec = Type.number;
            const mapSpec = Type.map(keySpec, valueSpec);

            it("has the correct definition type", () => {
                chai.expect(definitionOf(mapSpec).type).to.equal("map");
            });

            it("uses the key spec and value spec for the nestes types", () => {
                chai.expect(definitionOf(mapSpec).nested).to.eql({
                    key: definitionOf(keySpec),
                    value: definitionOf(valueSpec)
                });
            });

        });

    });

    describe("tuple", () => {
        const integer = constrain(Type.number, [Constraint.number.integer]);
        const tupleSpec = Type.tuple(Type.string, integer, Type.boolean);

        const resultValue = verify(tupleSpec, ["x", 1, true]).value();
        staticAssertIsNotAny(resultValue);
        staticAssertIsArray(resultValue);
        staticAssertUndefinedNotAllowed(resultValue);
        staticAssertUndefinedNotAllowed(resultValue[0]);

        it("accepts valid tuple data", () => {
            const data = ["abc", 123, true];
            const resultValue: [string, number, boolean] = verify(tupleSpec, data).value();
            chai.expect(resultValue).to.be.eql(data);
        });

        it("rejects non-tuple data", () => {
            chai.expect(verify(tupleSpec, "not_a_tuple").err).to.have.property("code", "type.tuple.not_a_tuple");
        });

        it("rejects tuples with incorrect length", () => {
            chai.expect(verify(tupleSpec, ["one", 2]).err).to.have.property("code", "type.tuple.incorrect_length");
            chai.expect(verify(tupleSpec, ["one", 2, true, "four"]).err).to.have.property("code", "type.tuple.incorrect_length");
        });

        it("rejects tuples with invalid data", () => {
            const err0 = verify(tupleSpec, ["one", 3.141592, "not_a_boolean"]).err;
            chai.expect(err0).to.have.property("code", "type.tuple.invalid_elements");
            chai.expect(err0).to.have.property("nestedErrors").that.has.length(2);
            const err1 = err0 && err0.nestedErrors && err0.nestedErrors[0];
            chai.expect(err1).to.have.property("code", "type.tuple.invalid_element");
            chai.expect(err1).to.have.property("key", 1);
            chai.expect(err1).to.have.property("nestedErrors").that.has.length(1);
            const err2 = err0 && err0.nestedErrors && err0.nestedErrors[1];
            chai.expect(err2).to.have.property("code", "type.tuple.invalid_element");
            chai.expect(err2).to.have.property("key", 2);
            chai.expect(err2).to.have.property("nestedErrors").that.has.length(1);
        });

        describe("failEarly", () => {
            it("does not fail early by default", () => {
                const result = verify(tupleSpec, ["xyz", null, null]);
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("fails early when global option tells it to do so", () => {
                const result = verify(tupleSpec, ["xyz", null, null], { failEarly: true });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(1);
            });

            it("fails early when local option tells it to do so", () => {
                const result = verify(adjust(tupleSpec, { failEarly: true }), ["xyz", null, null]);
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(1);
            });

            it("does not fail early when global option tells it to do so", () => {
                const result = verify(tupleSpec, ["xyz", null, null], { failEarly: false });
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("does not fail early when local option tells it to do so", () => {
                const result = verify(adjust(tupleSpec, { failEarly: false }), ["xyz", null, null]);
                chai.expect(result.err).to.have.property("nestedErrors").that.has.length(2);
            });

            it("gives local option on fail early precendence over global option", () => {
                const result1 = verify(adjust(tupleSpec, { failEarly: true }), ["xyz", null, null], { failEarly: false });
                chai.expect(result1.err).to.have.property("nestedErrors").that.has.length(1);

                const result2 = verify(adjust(tupleSpec, { failEarly: false }), ["xyz", null, null], { failEarly: true });
                chai.expect(result2.err).to.have.property("nestedErrors").that.has.length(2);
            });

        });

        describe("definition", () => {
            const tupleSpec = Type.tuple(Type.string, Type.number, Type.boolean);

            it("has the correct definition type", () => {
                chai.expect(definitionOf(tupleSpec).type).to.equal("tuple");
            });

            it("has the correct nested definitions", () => {
                chai.expect(definitionOf(tupleSpec).nested).to.eql({
                    0: definitionOf(Type.string),
                    1: definitionOf(Type.number),
                    2: definitionOf(Type.boolean)
                });
            });

        });

    });

});

