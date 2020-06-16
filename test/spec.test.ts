import * as chai from "chai";
import {
    Type, verify, optional, constrain, adjust, either, alias, definitionOf,
    extractAliases, Constraint, FormatValidationError
} from "..";
import { staticAssertIsNotAny, staticAssertUndefinedNotAllowed, staticAssertIsPropertyOptional } from "./static-assert";


const specWithUnknownVersion = {
    ...Type.number,
    version: 0 as 1
};

const constraintWithUnknownVersion = {
    ...Constraint.number.integer,
    version: 0 as 1
};

describe("spec", () => {

    describe("optional", () => {
        const testSpec = Type.object({
            name: Type.string,
            age: optional(Type.number),
            gender: optional(Type.string, { defaultValue: "unknown" })
        });

        it("produces the correct result type", () => {
            const value = verify(testSpec, { name: "test1" }).value();
            staticAssertIsNotAny(value.name);
            staticAssertIsNotAny(value.age);
            staticAssertIsNotAny(value.gender);
            staticAssertUndefinedNotAllowed(value);
            staticAssertUndefinedNotAllowed(value.name);
            staticAssertIsPropertyOptional("age", value);
            staticAssertUndefinedNotAllowed(value.gender);
            const typedValue: { name: string, age?: number, gender: string } = value;
            chai.expect(typedValue).to.have.property("name").that.equals("test1");
            chai.expect(typedValue).to.have.property("gender").that.equals("unknown");
        });

        it("accepts data in an optional attribute", () => {
            const data = {
                name: "dave",
                age: 36,
                gender: "male"
            };
            const result = verify(testSpec, data).value();
            chai.expect(result).to.have.property("name").that.equals("dave");
            chai.expect(result).to.have.property("age").that.equals(36);
            chai.expect(result).to.have.property("gender").that.equals("male");
        });

        it("accepts that there is no data for an optional attribute", () => {
            const data = {
                name: "dave"
            };
            const result = verify(testSpec, data).value();
            chai.expect(result).to.have.property("name").that.equals("dave");
            chai.expect(result).to.not.have.property("age");
        });

        it("rejects missing data in a non-optional attribute", () => {
            const data = {
                age: 36
            };
            const err = verify(testSpec, data).err;
            chai.expect(err && err.code).to.equal("type.object.invalid_attribute_data");
            chai.expect(err && err.nestedErrors && err.nestedErrors[0].key).to.equal("name");
            chai.expect(err && err.nestedErrors && err.nestedErrors[0].code).to.equal("type.object.missing_attribute");
        });

        it("rejects the undefined value in the data for an optional attribute", () => {
            const data = {
                name: "dave",
                age: undefined
            };
            const err = verify(testSpec, data).err;
            chai.expect(err && err.code).to.equal("type.object.invalid_attribute_data");
            chai.expect(err && err.nestedErrors && err.nestedErrors[0].key).to.equal("age");
            chai.expect(err && err.nestedErrors && err.nestedErrors[0].code).to.equal("type.object.invalid_attribute");
        });

        it("uses the default value if the data does not contain the optional attribute", () => {
            const data = {
                name: "dave",
                age: 37
            };
            const result = verify(testSpec, data).value();
            chai.expect(result).to.have.property("gender").that.equals("unknown");
        });

        describe("definition", () => {
            const innerSpec = Type.object({ a: Type.number });
            const optSpec = optional(innerSpec);
            const defaultValue = { a: 123 };
            const optWithDefaultSpec = optional(innerSpec, { defaultValue });

            it("has the correct definition", () => {
                chai.expect(definitionOf(optSpec).type).to.equal(definitionOf(innerSpec).type);
                chai.expect(definitionOf(optWithDefaultSpec).type).to.equal(definitionOf(innerSpec).type);
                chai.expect(definitionOf(optWithDefaultSpec).defaultValue).to.equal(defaultValue);
            });

            it("has the optional flag set", () => {
                chai.expect(definitionOf(optSpec).flags).to.contain("optional");
                chai.expect(definitionOf(optWithDefaultSpec).flags).to.contain("optional");
                chai.expect(definitionOf(optSpec)).to.not.have.property("defaultValue");
            });

        });

        describe("spec version", () => {

            it("throws an error in case of an incorrect spec version", () => {
                chai.expect(() => optional(specWithUnknownVersion)).to.throw();
            });

        });

    });

    describe("constrain", () => {

        const { integer, above } = Constraint.number;

        const integerAbove25 = constrain(Type.number, [integer, above(25)]);
        staticAssertIsNotAny(integerAbove25);

        // Static type checkL allows for the constraint input type to be broader than the spec type:
        const dummyConstraintStringOrNumber = {
            version: 1 as 1,
            definition: { name: "dummyStringOrNumber" },
            eval: (_value: string | number) => ({ err: null })
        };
        const dummyConstraintUnknownArray = {
            version: 1 as 1,
            definition: { name: "dummyUnknownArray" },
            eval: (_value: unknown[]) => ({ err: null })
        };
        const constrainedSpec1 = constrain(Type.string, [dummyConstraintStringOrNumber]);
        staticAssertIsNotAny(constrainedSpec1);
        const constrainedSpec2 = constrain(Type.array(Type.boolean), [dummyConstraintUnknownArray]);
        staticAssertIsNotAny(constrainedSpec2);

        it("checks the constraints of a spec", () => {
            const data = 36.5;
            chai.expect(verify(integerAbove25, data).err).to.be.an("object");
        });

        it("is possible to make custom constraints", () => {
            const booleanArray = Type.array(Type.boolean);
            const exactlyOneTrue = {
                version: 1 as 1,
                definition: {
                    name: "exactlyOneTrue"
                },
                eval: (value: boolean[]) => {
                    const count = value.reduce((aggr, elem) => aggr + (elem ? 1 : 0), 0);
                    return { err: count !== 1 ? {
                        code: "test.not_exactly_one_true",
                        value,
                        message: "Not exactly one true."
                    } : null };
                }
            };
            const booleanArrayWithOneTrue = constrain(booleanArray, [exactlyOneTrue]);
            chai.expect(verify(booleanArrayWithOneTrue, [false, true, false, false]).err).to.equal(null);
            chai.expect(verify(booleanArrayWithOneTrue, [false, false, false]).err).to.be.an("object");
            chai.expect(verify(booleanArrayWithOneTrue, [true, false, true]).err).to.be.an("object");
        });

        it("checks that all constraints are met", () => {
            const partiallyOverlapping = constrain(Type.string, [
                Constraint.generic.oneOf("one", "two", "three"),
                Constraint.generic.oneOf("two", "three", "four")
            ]);

            const model1 = verify(partiallyOverlapping, "two").value();
            staticAssertIsNotAny(model1);
            staticAssertUndefinedNotAllowed(model1);
            chai.expect(model1).to.equal("two");

            chai.expect(verify(partiallyOverlapping, "four").err).to.be.an("object");
        });

        describe("definition", () => {
            const constraints = [Constraint.number.integer, Constraint.number.above(0)];
            const constrainedSpec = constrain(Type.number, constraints);

            it("adds constraints to the definition", () => {
                chai.expect(definitionOf(constrainedSpec).constraints).to.eql(constraints.map(c => c.definition));
            });

            it("concatenates constraints to constraints already present in the definition", () => {
                const moreConstraints = [Constraint.number.atMost(10)];
                const moreConstrainedSpec = constrain(constrainedSpec, moreConstraints);
                chai.expect(definitionOf(moreConstrainedSpec).constraints).to.eql([...constraints, ...moreConstraints].map(c => c.definition));
            });

            it("resets the alias", () => {
                const aliasedSpec = alias("justSomeNumber", Type.number);
                const constrainedAliasedSpec = constrain(aliasedSpec, [Constraint.number.atLeast(0)]);
                chai.expect(definitionOf(constrainedAliasedSpec)).to.not.have.property("alias");
            });

        });

        describe("spec version", () => {

            it("throws an error in case of an incorrect spec version", () => {
                chai.expect(() => constrain(specWithUnknownVersion, [Constraint.number.integer])).to.throw();
            });

        });

        describe("constraint version", () => {

            it("throws an error in case of an incorrect constraint version", () => {
                chai.expect(() => constrain(Type.number, [constraintWithUnknownVersion])).to.throw();
            });

        });

    });

    describe("adjust", () => {

        describe("definition", () => {
            const aliasedSpec = alias("justSomeObject", Type.object({ a: Type.number }));
            const adjustedSpec = adjust(aliasedSpec, { strict: false });

            it("resets the alias", () => {
                chai.expect(definitionOf(adjustedSpec)).to.not.have.property("alias");
            });

            it("adds the adjustments to the definition", () => {
                chai.expect(definitionOf(adjustedSpec).adjustments).to.eql({ strict: false });
            });

            it("merges the adjustments to already existing adjustments of the definition", () => {
                const doubleAdjustedSpec1 = adjust(adjustedSpec, { strict: true, failEarly: true });
                chai.expect(definitionOf(doubleAdjustedSpec1).adjustments).to.eql({ strict: false, failEarly: true });

                const doubleAdjustedSpec2 = adjust(adjustedSpec, { failEarly: false });
                chai.expect(definitionOf(doubleAdjustedSpec2).adjustments).to.eql({ strict: false, failEarly: false });
            });

        });

        describe("spec version", () => {

            it("throws an error in case of an incorrect spec version", () => {
                chai.expect(() => adjust(specWithUnknownVersion, {})).to.throw();
            });

        });
    });

    describe("either", () => {
        const stringOrBool = either(Type.string, Type.boolean);
        const eitherOfNine = either(
            constrain(Type.number, [Constraint.number.above(100)]),
            constrain(Type.number, [Constraint.number.below(10)]),
            constrain(Type.string, [Constraint.generic.oneOf("X", "Y", "Z")]),
            Type.object({ a: Type.number }),
            Type.object({ b: Type.string }),
            Type.array(constrain(Type.number, [Constraint.number.above(0)])),
            constrain(Type.array(Type.boolean), [Constraint.array.length({ min: 2, max: 5 })]),
            constrain(Type.string, [Constraint.string.regex(/^a+$/)]),
            Type.array(either(Type.boolean, Type.object({ b: Type.boolean })))
        );

        it("accepts either value of 2 specs", () => {
            const myModel1 = verify(stringOrBool, "a string").value();
            staticAssertIsNotAny(myModel1);
            staticAssertUndefinedNotAllowed(myModel1);
            chai.expect(typeof myModel1).to.equal("string");
            chai.expect(myModel1).to.equal("a string");

            const myModel2 = verify(stringOrBool, true).value();
            chai.expect(typeof myModel2).to.equal("boolean");
            chai.expect(myModel2).to.equal(true);
        });

        it("rejects values not matching one of the specs", () => {
            chai.expect(verify(stringOrBool, 12345).err).to.be.an("object").that.has.property("nestedErrors").to.have.length(2);
        });

        it("accepts either value of upto 9 specs", () => {
            const myModel1 = verify(eitherOfNine, 101).value();
            chai.expect(myModel1).to.equal(101);

            const myModel2 = verify(eitherOfNine, 9).value();
            chai.expect(myModel2).to.equal(9);

            const myModel3 = verify(eitherOfNine, "Y").value();
            chai.expect(myModel3).to.equal("Y");

            const myModel4 = verify(eitherOfNine, { a: 123 }).value();
            chai.expect(myModel4).to.eql({ a: 123 });

            const myModel5 = verify(eitherOfNine, { b: "" }).value();
            chai.expect(myModel5).to.eql({ b: "" });

            const myModel6 = verify(eitherOfNine, [1, 2, 3, 4]).value();
            chai.expect(myModel6).to.eql([1, 2, 3, 4]);

            const myModel7 = verify(eitherOfNine, [true, false, true]).value();
            chai.expect(myModel7).to.eql([true, false, true]);

            const myModel8 = verify(eitherOfNine, "aaaaaaa").value();
            chai.expect(myModel8).to.equal("aaaaaaa");

            const myModel9 = verify(eitherOfNine, [true, { b: true}, false, { b: false }]).value();
            chai.expect(myModel9).to.eql([true, { b: true}, false, { b: false }]);
        });

        // TODO: Rejects for eitherOfNine.

        describe("definition", () => {
            const option1Spec = Type.null;
            const option2Spec = Type.number;
            const option3Spec = Type.string;
            const eitherSpec = either(option1Spec, option2Spec, option3Spec);

            it("has the correct definition type", () => {
                chai.expect(definitionOf(eitherSpec).type).to.equal("either");
            });

            it("uses the definitions of the spec options for the nested types", () => {
                chai.expect(definitionOf(eitherSpec).nested).to.eql({
                    1: definitionOf(option1Spec),
                    2: definitionOf(option2Spec),
                    3: definitionOf(option3Spec)
                });
            });

        });

        describe("spec version", () => {

            it("throws an error in case of one of the specs has an incorrect spec version", () => {
                chai.expect(() => either(specWithUnknownVersion, Type.string)).to.throw();
                chai.expect(() => either(Type.string, specWithUnknownVersion)).to.throw();
            });

        });

    });

    describe("validation error report", () => {

        describe("json report", () => {

            it("reports correctly on flat types", () => {
                const numberSpec = Type.number;
                const result = verify(numberSpec, "not_a_number");
                chai.expect(result.err).to.be.an("object");
                const report = result.err && FormatValidationError.generateReportJson(result.err);
                chai.expect(report).to.eql({
                    msg: "Not a number." // TODO: Type identifiers, with coupled messages?
                });
            });

            it("reports correctly on constraints", () => {
                const positiveNumberSpec = constrain(Type.number, [Constraint.number.above(0)]);
                const result = verify(positiveNumberSpec, -1);
                const report = result.err && FormatValidationError.generateReportJson(result.err);
                chai.expect(report).to.eql({
                    msg: "Not above 0." // TODO: Type identifiers, with coupled TEMPLATED messages?
                });
            });

            it("reports correctly on object types", () => {
                const customerSpec = Type.object({
                    name: constrain(Type.string, [Constraint.string.notEmpty]),
                    address: Type.object({
                        street: Type.string,
                        city: Type.string
                    })
                });
                const result = verify(customerSpec, {
                    name: 123,
                    address: {
                        street: "firststreet",
                        city: "Outoftown"
                    }
                });
                const report = result.err && FormatValidationError.generateReportJson(result.err);
                chai.expect(report).to.eql({
                    msg: "Invalid attribute data.",
                    nested: [
                        {
                            key: "name",
                            msg: "Evaluation of attribute \"name\" failed.",
                            nested: [{ msg: "Not a string." }]
                        }
                    ]
                });
            });

            // TODO: Nested type: object.
            // TODO: Nested type: object with optional field.
            // TODO: Nested type: map.
            // TODO: Nested type: array.
            // TODO: Disjunctive specs (either).

        });

    });

    describe("alias", () => {
        const aliasedSpec = alias("numberAlias", Type.number);

        it("sets an alias on the spec definition", () => {
            chai.expect(definitionOf(aliasedSpec).alias).to.equal("numberAlias");
        });

        it("overwrites an alias when the spec already has an alias", () => {
            const aliasedAliasedSpec = alias("overwrittenAlias", aliasedSpec);
            chai.expect(definitionOf(aliasedAliasedSpec).alias).to.equal("overwrittenAlias");
        });

        describe("spec version", () => {

            it("throws an error in case of an incorrect spec version", () => {
                chai.expect(() => alias("dummyAlias", specWithUnknownVersion)).to.throw();
            });

        });
    });

    describe("extractAliases", () => {
        it("extracts no aliases from a flat definition", () => {
            const aliasName = "numberAlias";
            const aliasedSpec = Type.number;
            const numberAliasSpec = alias(aliasName, aliasedSpec);
            const result = extractAliases(definitionOf(numberAliasSpec));
            chai.expect(result.aliases).to.eql({
                [aliasName]: definitionOf(numberAliasSpec)
            });
            chai.expect(result.definition).to.eql({
                alias: aliasName
            });
        });

        it("extracts aliases from a nested definition", () => {
            const stringAliasSpec = alias("stringAlias", Type.string);
            const booleanAliasSpec = alias("booleanAlias", Type.boolean);
            const mapAliasName = "mapAlias";
            const mapAliasSpec = alias(mapAliasName, Type.map(stringAliasSpec, booleanAliasSpec));
            const numberAliasSpec = alias("numberAlias", Type.number);
            const arrayAliasName = "arrayAlias";
            const arrayAliasSpec = alias(arrayAliasName, Type.array(numberAliasSpec));
            const objectAliasName = "objectAlias";
            const objectAliasSpec = alias(objectAliasName, Type.object({
                a: mapAliasSpec,
                b: arrayAliasSpec
            }));
            const result = extractAliases(definitionOf(objectAliasSpec));
            chai.expect(result.definition).to.eql({
                alias: objectAliasName
            });
            chai.expect(result.aliases).to.eql({
                [objectAliasName]: {
                    alias: objectAliasName,
                    descriptions: {},
                    type: "object",
                    nested: {
                        a: { alias: mapAliasName },
                        b: { alias: arrayAliasName }
                    }
                },
                [mapAliasName]: extractAliases(definitionOf(mapAliasSpec)).aliases[mapAliasName],
                [arrayAliasName]: extractAliases(definitionOf(arrayAliasSpec)).aliases[arrayAliasName],
                stringAlias: definitionOf(stringAliasSpec),
                booleanAlias: definitionOf(booleanAliasSpec),
                numberAlias: definitionOf(numberAliasSpec)
            });
        });

        it("extracts aliases from a nested definition containing the same aliased spec twice", () => {
            const numberAliasSpec = alias("numberAlias", Type.number);
            const arrayAliasName = "arrayAlias";
            const arrayAliasSpec = alias(arrayAliasName, Type.array(numberAliasSpec));
            const objectSpec = Type.object({
                a: numberAliasSpec,
                b: arrayAliasSpec
            });
            const result = extractAliases(definitionOf(objectSpec));
            chai.expect(result.aliases).to.eql({
                [arrayAliasName]: extractAliases(definitionOf(arrayAliasSpec)).aliases[arrayAliasName],
                numberAlias: definitionOf(numberAliasSpec)
            });
        });

    });

});

