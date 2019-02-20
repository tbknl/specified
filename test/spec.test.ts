import * as chai from "chai";
import { Type, verify, optional, constrain, adjust, either, alias, definitionOf, Constraint, ValidationError } from "..";


describe("spec", () => {

    describe("optional", () => {
        const testSpec = Type.object({
            name: Type.string,
            age: optional(Type.number)
        });

        it("accepts data in an optional attribute", () => {
            const data = {
                name: "dave",
                age: 36
            };
            const result = verify(testSpec, data).value();
            chai.expect(result).to.have.property("name").that.equals("dave");
            chai.expect(result).to.have.property("age").that.equals(36);
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
            chai.expect(err && err.generateReportJson()).to.eql({
                msg: "Object validation failed.",
                nested: [
                    {
                        key: "name",
                        msg: "Attribute not present: \"name\"."
                    }
                ]
            });
        });

        it("rejects the undefined value in the data for an optional attribute", () => {
            const data = {
                name: "dave",
                age: undefined
            };
            const err = verify(testSpec, data).err;
            chai.expect(err && err.generateReportJson()).to.eql({
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

    });

    describe("constrain", () => {

        const { integer, above } = Constraint.number;

        const integerAbove25 = constrain(Type.number, [integer, above(25)]);

        it("checks the constraints of a spec", () => {
            const data = 36.5;
            chai.expect(verify(integerAbove25, data).err).to.be.instanceof(ValidationError);
        });

        it("is possible to make custom constraints", () => {
            const booleanArray = Type.array(Type.boolean);
            const exactlyOneTrue = {
                definition: {
                    name: "exactlyOneTrue"
                },
                eval: (value: boolean[]) => {
                    const count = value.reduce((aggr, elem) => aggr + (elem ? 1 : 0), 0);
                    if (count !== 1) {
                        throw new ValidationError("Not exactly one true.");
                    }
                }
            };
            const booleanArrayWithOneTrue = constrain(booleanArray, [exactlyOneTrue]);
            chai.expect(verify(booleanArrayWithOneTrue, [false, true, false, false]).err).to.equal(null);
            chai.expect(verify(booleanArrayWithOneTrue, [false, false, false]).err).to.be.instanceof(ValidationError);
            chai.expect(verify(booleanArrayWithOneTrue, [true, false, true]).err).to.be.instanceof(ValidationError);
        });

        it("checks that all constraints are met", () => {
            const partiallyOverlapping = constrain(Type.string, [
                Constraint.generic.oneOf("one", "two", "three"),
                Constraint.generic.oneOf("two", "three", "four")
            ]);

            const model1 = verify(partiallyOverlapping, "two").value();
            chai.expect(model1).to.equal("two");

            chai.expect(verify(partiallyOverlapping, "four").err).to.be.instanceof(ValidationError);
        });

        // TODO: constrain with different constraint types (e.g. boolean[] and number[]).

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

    });

    describe("adjust", () => {

        describe("definition", () => {
            const aliasedSpec = alias("justSomeObject", Type.object({ a: Type.number }));
            const adjustedSpec = adjust(aliasedSpec, { strict: false });

            it("resets the alias", () => {
                chai.expect(definitionOf(adjustedSpec)).to.not.have.property("alias");
            });

            it("adds the adjustments to the definition", () => {
                chai.expect(definitionOf(adjustedSpec).adjustments).to.eql({ strict: false })
            });

            it("merges the adjustments to already existing adjustments of the definition", () => {
                const doubleAdjustedSpec1 = adjust(adjustedSpec, { strict: true, failEarly: true });
                chai.expect(definitionOf(doubleAdjustedSpec1).adjustments).to.eql({ strict: false, failEarly: true })

                const doubleAdjustedSpec2 = adjust(adjustedSpec, { failEarly: false });
                chai.expect(definitionOf(doubleAdjustedSpec2).adjustments).to.eql({ strict: false, failEarly: false })
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
            chai.expect(typeof myModel1).to.equal("string");
            chai.expect(myModel1).to.equal("a string");

            const myModel2 = verify(stringOrBool, true).value();
            chai.expect(typeof myModel2).to.equal("boolean");
            chai.expect(myModel2).to.equal(true);
        });

        it("rejects values not matching one of the specs", () => {
            chai.expect(verify(stringOrBool, 12345).err).to.be.instanceof(
                ValidationError
            ).to.have.property("nestedErrors").to.have.length(2);
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
                chai.expect(definitionOf(eitherSpec).nestedTypes).to.eql({
                    1: definitionOf(option1Spec),
                    2: definitionOf(option2Spec),
                    3: definitionOf(option3Spec)
                });
            });

        });

    });

    describe("validation error report", () => {

        describe("json report", () => {

            it("reports correctly on flat types", () => {
                const numberSpec = Type.number;
                const result = verify(numberSpec, "not_a_number");
                chai.expect(result.err).to.be.instanceof(ValidationError);
                const report = result.err && result.err.generateReportJson();
                chai.expect(report).to.eql({
                    msg: "Not a number." // TODO: Type identifiers, with coupled messages?
                });
            });

            it("reports correctly on constraints", () => {
                const positiveNumberSpec = constrain(Type.number, [Constraint.number.above(0)]);
                const result = verify(positiveNumberSpec, -1);
                const report = result.err && result.err.generateReportJson();
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
                const report = result.err && result.err.generateReportJson();
                chai.expect(report).to.eql({
                    msg: "Object validation failed.",
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

    });

});

