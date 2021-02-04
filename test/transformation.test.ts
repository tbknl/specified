import * as chai from "chai";
import { Type, verify, transform, Transformation } from "..";
import { staticAssertIsNotAny, staticAssertEqualType } from "./static-assert";

describe("Transformation", () => {

    describe("instantiateWithSingleArg", () => {

        it("TODO", () => {
            class Boxed {
                constructor(public readonly value: string) {}
            }
            const boxedStringSpec = transform(Type.string, Transformation.instantiateWithSingleArg(Boxed));
            const source = "abc";
            const box = verify(boxedStringSpec, source).value();
            staticAssertIsNotAny(box);
            staticAssertEqualType<Boxed, typeof box>(true);
            chai.expect(box.value).to.equal(source);
        });

        // TODO: More tests.
    });

});

