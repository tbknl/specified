import * as chai from "chai";
import { Type, verify, constrain, Constraint } from "..";


describe("constraint", () => {

    it("has the correct return type", () => {
        const int = constrain(Type.number, [Constraint.number.integer]);
        const int1: number = verify(int, 1).value();
        chai.expect(int1).to.equal(1);
    });

    describe("generic", () => {

        describe("oneOf", () => {
            const xory = constrain(Type.string, [Constraint.generic.oneOf("x", "y")]);
            const oneOr2 = constrain(Type.number, [Constraint.generic.oneOf(1, 2)]);

            it("accepts if value equals one of the specified values", () => {
                chai.expect(verify(xory, "x").value()).to.equal("x");
                chai.expect(verify(xory, "y").value()).to.equal("y");
                chai.expect(verify(oneOr2, 1).value()).to.equal(1);
                chai.expect(verify(oneOr2, 2).value()).to.equal(2);
            });

            it("rejects if value equals none of the specified values", () => {
                chai.expect(verify(xory, "z").err).to.have.property("code", "constraint.generic.oneOf.unknown_value");
                chai.expect(verify(oneOr2, 3).err).to.have.property("code", "constraint.generic.oneOf.unknown_value");
            });

        });
    });

    describe("number", () => {

        describe("integer", () => {
            const int = constrain(Type.number, [Constraint.number.integer]);

            it("accepts integers", () => {
                chai.expect(verify(int, 1).value()).to.equal(1);
                chai.expect(verify(int, 0).value()).to.equal(0);
                chai.expect(verify(int, 123).value()).to.equal(123);
                chai.expect(verify(int, -456).value()).to.equal(-456);
                chai.expect(verify(int, 789.00).value()).to.equal(789);
            });

            it("rejects non-integers", () => {
                chai.expect(verify(int, 3.5).err).to.have.property("code", "constraint.number.integer");
                chai.expect(verify(int, -2.4).err).to.have.property("code", "constraint.number.integer");
                chai.expect(verify(int, NaN).err).to.have.property("code", "constraint.number.integer");
                chai.expect(verify(int, Infinity).err).to.have.property("code", "constraint.number.integer");
            });

        });

        describe("finite", () => {
            const finite = constrain(Type.number, [Constraint.number.finite]);

            it("accepts integers", () => {
                chai.expect(verify(finite, 1).value()).to.equal(1);
                chai.expect(verify(finite, -1).value()).to.equal(-1);
                chai.expect(verify(finite, 123.456).value()).to.equal(123.456);
                chai.expect(verify(finite, -789.012).value()).to.equal(-789.012);
            });

            it("rejects non-integers", () => {
                chai.expect(verify(finite, NaN).err).to.have.property("code", "constraint.number.finite");
                chai.expect(verify(finite, Infinity).err).to.have.property("code", "constraint.number.finite");
                chai.expect(verify(finite, -Infinity).err).to.have.property("code", "constraint.number.finite");
            });

        });

        describe("above", () => {
            const above25 = constrain(Type.number, [Constraint.number.above(25)]);

            it("accepts number above the specified limit", () => {
                chai.expect(verify(above25, 26).value()).to.equal(26);
                chai.expect(verify(above25, 1234).value()).to.equal(1234);
                chai.expect(verify(above25, Infinity).value()).to.equal(Infinity);
            });

            it("rejects numbers below or equal to the specified limit", () => {
                chai.expect(verify(above25, 24).err).to.have.property("code", "constraint.number.above");
                chai.expect(verify(above25, 25).err).to.have.property("code", "constraint.number.above");
                chai.expect(verify(above25, -1).err).to.have.property("code", "constraint.number.above");
                chai.expect(verify(above25, -Infinity).err).to.have.property("code", "constraint.number.above");
                chai.expect(verify(above25, NaN).err).to.have.property("code", "constraint.number.above");
            });

        });

        describe("below", () => {
            const below25 = constrain(Type.number, [Constraint.number.below(25)]);

            it("accepts number below the specified limit", () => {
                chai.expect(verify(below25, 24).value()).to.equal(24);
                chai.expect(verify(below25, -1234).value()).to.equal(-1234);
                chai.expect(verify(below25, -Infinity).value()).to.equal(-Infinity);
            });

            it("rejects numbers above or equal to the specified limit", () => {
                chai.expect(verify(below25, 26).err).to.have.property("code", "constraint.number.below");
                chai.expect(verify(below25, 25).err).to.have.property("code", "constraint.number.below");
                chai.expect(verify(below25, 1234).err).to.have.property("code", "constraint.number.below");
                chai.expect(verify(below25, Infinity).err).to.have.property("code", "constraint.number.below");
                chai.expect(verify(below25, NaN).err).to.have.property("code", "constraint.number.below");
            });

        });

        describe("atLeast", () => {
            const atLeast25 = constrain(Type.number, [Constraint.number.atLeast(25)]);

            it("accepts number of at least the specified limit", () => {
                chai.expect(verify(atLeast25, 25).value()).to.equal(25);
                chai.expect(verify(atLeast25, 26).value()).to.equal(26);
                chai.expect(verify(atLeast25, 1234).value()).to.equal(1234);
                chai.expect(verify(atLeast25, Infinity).value()).to.equal(Infinity);
            });

            it("rejects numbers below the specified limit", () => {
                chai.expect(verify(atLeast25, 24).err).to.have.property("code", "constraint.number.atLeast");
                chai.expect(verify(atLeast25, -1).err).to.have.property("code", "constraint.number.atLeast");
                chai.expect(verify(atLeast25, -Infinity).err).to.have.property("code", "constraint.number.atLeast");
                chai.expect(verify(atLeast25, NaN).err).to.have.property("code", "constraint.number.atLeast");
            });

        });

        describe("atMost", () => {
            const atMost = constrain(Type.number, [Constraint.number.atMost(25)]);

            it("accepts number of at most the specified limit", () => {
                chai.expect(verify(atMost, 24).value()).to.equal(24);
                chai.expect(verify(atMost, 25).value()).to.equal(25);
                chai.expect(verify(atMost, -1234).value()).to.equal(-1234);
                chai.expect(verify(atMost, -Infinity).value()).to.equal(-Infinity);
            });

            it("rejects numbers above the specified limit", () => {
                chai.expect(verify(atMost, 26).err).to.have.property("code", "constraint.number.atMost");
                chai.expect(verify(atMost, 1234).err).to.have.property("code", "constraint.number.atMost");
                chai.expect(verify(atMost, Infinity).err).to.have.property("code", "constraint.number.atMost");
                chai.expect(verify(atMost, NaN).err).to.have.property("code", "constraint.number.atMost");
            });

        });

    });

    describe("string", () => {

        describe("notEmpty", () => {
            const filledString = constrain(Type.string, [Constraint.string.notEmpty]);

            it("accepts filled strings", () => {
                chai.expect(verify(filledString, "1").value()).to.equal("1");
                chai.expect(verify(filledString, "something").value()).to.equal("something");
            });

            it("rejects empty strings", () => {
                chai.expect(verify(filledString, "").err).to.have.property("code", "constraint.string.notEmpty");
            });

        });

        describe("length", () => {

            describe("minimum length", () => {
                const minLength3 = constrain(Type.string, [Constraint.string.length({ min: 3 })]);

                it("accepts strings with at least the specified length", () => {
                    chai.expect(verify(minLength3, "abc").value()).to.equal("abc");
                    chai.expect(verify(minLength3, "abcdefg").value()).to.equal("abcdefg");
                });

                it("rejects strings shorter than the specified length", () => {
                    chai.expect(verify(minLength3, "ab").err).to.have.property("code", "constraint.string.length.too_short");
                });

            });

            describe("maximum length", () => {
                const maxLength5 = constrain(Type.string, [Constraint.string.length({ max: 5 })]);

                it("accepts strings with at most the specified length", () => {
                    chai.expect(verify(maxLength5, "abc").value()).to.equal("abc");
                    chai.expect(verify(maxLength5, "abcde").value()).to.equal("abcde");
                });

                it("rejects strings longer than the specified length", () => {
                    chai.expect(verify(maxLength5, "abcdef").err).to.have.property("code", "constraint.string.length.too_long");
                });

            });

            describe("length in range", () => {
                const lengthInRange3and5 = constrain(Type.string, [Constraint.string.length({ min: 3, max: 5 })]);

                it("accepts strings with a length in the specified range", () => {
                    chai.expect(verify(lengthInRange3and5, "abc").value()).to.equal("abc");
                    chai.expect(verify(lengthInRange3and5, "abcd").value()).to.equal("abcd");
                    chai.expect(verify(lengthInRange3and5, "abcde").value()).to.equal("abcde");
                });

                it("rejects strings with a length outside the specified range", () => {
                    chai.expect(verify(lengthInRange3and5, "ab").err).to.have.property("code", "constraint.string.length.too_short");
                    chai.expect(verify(lengthInRange3and5, "abcdef").err).to.have.property("code", "constraint.string.length.too_long");
                });

            });

        });

        describe("regex", () => {
            const regex = /^A+$/;
            const onlyA = constrain(Type.string, [Constraint.string.regex(regex)]);

            it("accepts strings match the specified regex", () => {
                chai.expect(verify(onlyA, "AAA").value()).to.equal("AAA");
            });

            it("rejects strings that do not match the specified regex", () => {
                const value = "ABBA";
                const err = verify(onlyA, value).err;
                chai.expect(err).to.have.property("code", "constraint.string.regex");
                chai.expect(err).to.have.property("value", value);
                chai.expect(err).to.have.property("allowed", regex.source);
            });

            it("allows to specify a custom error message and error code", () => {
                const custom = { errorMessage: "Not a uuid.", errorCode: "constraint.string.uuid" };
                const customUuid = constrain(Type.string, [Constraint.string.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i, custom)]);
                const err = verify(customUuid, "definitely_not_a_uuid!").err;
                chai.expect(err).to.have.property("code", custom.errorCode);
                chai.expect(err).to.have.property("message", custom.errorMessage);
            });

        });

        describe("startsWith", () => {
            const startsWithThis = constrain(Type.string, [Constraint.string.startsWith("This")]);

            it("accepts strings that start with the specified prefix", () => {
                chai.expect(verify(startsWithThis, "This is OK").value()).to.equal("This is OK");
                chai.expect(verify(startsWithThis, "This too").value()).to.equal("This too");
                chai.expect(verify(startsWithThis, "This").value()).to.equal("This");
                chai.expect(verify(startsWithThis, "Thisisoktoo").value()).to.equal("Thisisoktoo");
            });

            it("rejects strings that do not start with the specified prefix", () => {
                chai.expect(verify(startsWithThis, "That").err).to.have.property("code", "constraint.string.startsWith");
            });

        });

        describe("endsWith", () => {
            const endsWithDude = constrain(Type.string, [Constraint.string.endsWith("dude!")]);

            it("accepts strings that end with the specified suffix", () => {
                chai.expect(verify(endsWithDude, "This is OK dude!").value()).to.equal("This is OK dude!");
                chai.expect(verify(endsWithDude, "Hey dude!").value()).to.equal("Hey dude!");
                chai.expect(verify(endsWithDude, "dude!").value()).to.equal("dude!");
            });

            it("rejects strings that do not end with the specified suffix", () => {
                chai.expect(verify(endsWithDude, "dude! No!").err).to.have.property("code", "constraint.string.endsWith");
            });

        });

    });

    describe("map", () => {

        describe("size", () => {

            describe("minimum size", () => {
                const atLeast2 = constrain(Type.map(Type.string, Type.number), [Constraint.map.size({ min: 2 })]);

                it("accepts maps with at least the specified size", () => {
                    chai.expect(verify(atLeast2, { a: 1, b: 2 }).value()).to.eql({ a: 1, b: 2 });
                    chai.expect(verify(atLeast2, { a: 1, b: 2, c: 3 }).value()).to.eql({ a: 1, b: 2, c: 3 });
                });

                it("rejects maps with less keys than the specified size", () => {
                    chai.expect(verify(atLeast2, { a: 1 }).err).to.have.property("code", "constraint.map.size.too_small");
                    chai.expect(verify(atLeast2, {}).err).to.have.property("code", "constraint.map.size.too_small");
                });

            });

            describe("maximum size", () => {
                const atMost4 = constrain(Type.map(Type.string, Type.number), [Constraint.map.size({ max: 4 })]);

                it("accepts maps with at most the specified size", () => {
                    chai.expect(verify(atMost4, { a: 1, b: 2 }).value()).to.eql({ a: 1, b: 2 });
                    chai.expect(verify(atMost4, { a: 1, b: 2, c: 3, d: 4 }).value()).to.eql({ a: 1, b: 2, c: 3, d: 4 });
                });

                it("rejects maps with more keys than the specified size", () => {
                    chai.expect(verify(atMost4, { a: 1, b: 2, c: 3, d: 4, e: 5 }).err).to.have.property("code", "constraint.map.size.too_large");
                });

            });

            describe("size in range", () => {
                const sizeOf2to4 = constrain(Type.map(Type.string, Type.number), [Constraint.map.size({ min: 2, max: 4 })]);

                it("accepts maps with a length in the specified range", () => {
                    chai.expect(verify(sizeOf2to4, { a: 1, b: 2 }).value()).to.eql({ a: 1, b: 2 });
                    chai.expect(verify(sizeOf2to4, { a: 1, b: 2, c: 3, d: 4 }).value()).to.eql({ a: 1, b: 2, c: 3, d: 4 });
                });

                it("rejects maps with a length outside the specified range", () => {
                    chai.expect(verify(sizeOf2to4, { a: 1 }).err).to.have.property("code", "constraint.map.size.too_small");
                    chai.expect(verify(sizeOf2to4, { a: 1, b: 2, c: 3, d: 4, e: 5 }).err).to.have.property("code", "constraint.map.size.too_large");
                });

            });

        });

    });

    describe("array", () => {

        describe("length", () => {

            describe("minimum length", () => {
                const minLength3 = constrain(Type.array(Type.number), [Constraint.array.length({ min: 3 })]);

                it("accepts arrays with at least the specified length", () => {
                    chai.expect(verify(minLength3, [1, 2, 3]).value()).to.eql( [1, 2, 3]);
                    chai.expect(verify(minLength3, [1, 2, 3, 4]).value()).to.eql([1, 2, 3, 4]);
                });

                it("rejects arrays shorter than the specified length", () => {
                    chai.expect(verify(minLength3, [1, 2]).err).to.have.property("code", "constraint.array.length.too_short");
                });

            });

            describe("maximum length", () => {
                const maxLength5 = constrain(Type.array(Type.number), [Constraint.array.length({ max: 5 })]);

                it("accepts arrays with at most the specified length", () => {
                    chai.expect(verify(maxLength5, [1, 2, 3]).value()).to.eql([1, 2, 3]);
                    chai.expect(verify(maxLength5, [1, 2, 3, 4, 5]).value()).to.eql([1, 2, 3, 4, 5]);
                });

                it("rejects arrays longer than the specified length", () => {
                    chai.expect(verify(maxLength5, [1, 2, 3, 4, 5, 6]).err).to.have.property("code", "constraint.array.length.too_long");
                });

            });

            describe("length in range", () => {
                const lengthInRange3and5 = constrain(Type.array(Type.number), [Constraint.array.length({ min: 3, max: 5 })]);

                it("accepts arrays with a length in the specified range", () => {
                    chai.expect(verify(lengthInRange3and5, [1, 2, 3]).value()).to.eql([1, 2, 3]);
                    chai.expect(verify(lengthInRange3and5, [1, 2, 3, 4]).value()).to.eql([1, 2, 3, 4]);
                    chai.expect(verify(lengthInRange3and5, [1, 2, 3, 4, 5]).value()).to.eql([1, 2, 3, 4, 5]);
                });

                it("rejects arrays with a length outside the specified range", () => {
                    chai.expect(verify(lengthInRange3and5, [1, 2]).err).to.have.property("code", "constraint.array.length.too_short");
                    chai.expect(verify(lengthInRange3and5, [1, 2, 3, 4, 5, 6]).err).to.have.property("code", "constraint.array.length.too_long");
                });

            });

        });

        describe("includes", () => {
            const includes999 = constrain(Type.array(Type.number), [Constraint.array.includes(999)]);

            it("accepts arrays that include the specified value", () => {
                chai.expect(verify(includes999, [1, 2, 999, 4]).value()).to.eql([1, 2, 999, 4]);
                chai.expect(verify(includes999, [999]).value()).to.eql([999]);
            });

            it("rejects arrays that does not include the specified value", () => {
                chai.expect(verify(includes999, [1, 2, 3]).err).to.have.property("code", "constraint.array.includes");
            });

        });

        describe("unique", () => {
            const uniqueNumbers = constrain(Type.array(Type.number), [Constraint.array.unique()]);

            it("accepts arrays with unique elements", () => {
                chai.expect(verify(uniqueNumbers, []).err).to.be.null;
                chai.expect(verify(uniqueNumbers, [123]).err).to.be.null;
                chai.expect(verify(uniqueNumbers, [9, 5, 1, 4, 8]).err).to.be.null;
            });
            
            it("rejects arrays with duplicate elements", () => {
                chai.expect(verify(uniqueNumbers, [9, 777, 1, 4, 777]).err).to.have.property("code", "constraint.array.unique");
            });
            
            it("allows for providing a custom equality function", () => {
                const objectsWithUniqueX = constrain(Type.array(Type.interface({ x: Type.number })), [Constraint.array.unique(
                    (a: { x: number }, b: { x: number }) => a.x === b.x
                )]);
                chai.expect(verify(objectsWithUniqueX, [{ x: 1 }, { x: 2 }]).err).to.be.null;
                chai.expect(verify(objectsWithUniqueX, [{ x: 777 }, { x: 3 }, { x: 777, y: "ignored" }]).err).to.have.property("code", "constraint.array.unique");
            });
            
        });

    });

});

