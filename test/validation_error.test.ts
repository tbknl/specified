import * as chai from "chai";
import { Type, verify, ValidationError, FormatValidationError, either } from "..";

const dummyValidationFailure = {
    code: "dummy",
    value: "Dummy",
    message: "dummy failure"
};


describe("validation error", () => {
    const nestedSpec = Type.object({
        objArray: Type.array(Type.object({
            a: Type.number
        })),
        arrayMap: Type.map(Type.string, Type.array(Type.number))
    });

    describe("get key", () => {

        it("returns the key provided to the constructor", () => {
            const key = 1234;
            const validationError = new ValidationError("message", { ...dummyValidationFailure, key });
            chai.expect(validationError.getKey()).to.equal(key);
        });

        it("returns undefined when no key was provided to the constructor", () => {
            const validationError = new ValidationError("message", { ...dummyValidationFailure });
            chai.expect(validationError.getKey()).to.equal(undefined);
        });

    });

    describe("get nested errors", () => {

        it("returns the nested errors provided to the constructor", () => {
            const nestedErrors = [
                new ValidationError("Nested 1", { ...dummyValidationFailure }),
                new ValidationError("Nested 2", { ...dummyValidationFailure })
            ];
            const validationError = new ValidationError("message", { ...dummyValidationFailure, nestedErrors });
            chai.expect(validationError.getNestedErrors()).to.eql(nestedErrors);
        });

        it("returns an empty array when no nested errors were provided to the constructor", () => {
            const validationError = new ValidationError("message", { ...dummyValidationFailure });
            chai.expect(validationError.getNestedErrors()).to.eql([]);
        });

    });

    describe("generate report json", () => {

        it("generates a json-able report", () => {
            const data = {
                objArray: [{ a: 123 }, { b: 456 }, { a: "nan" }],
                arrayMap: { x: [1, 2, 3], y: "NotAnArray", z: [7, "eight", 9] }
            };
            const result = verify(nestedSpec, data);
            chai.expect(result.err).to.be.an("object")
            chai.expect(result.err && FormatValidationError.generateReportJson(result.err)).to.eql({
				msg: "Invalid attribute data.",
				nested: [
					{
						key: "objArray",
						msg: "Evaluation of attribute \"objArray\" failed.",
						nested: [
							{
								msg: "Array validation failed.",
								nested: [
									{
										key: 1,
										msg: "Evaluation of array element at index \"1\" failed.",
										nested: [
                                            {
                                                msg: "Invalid attribute data.",
                                                nested: [
                                                    {
                                                        key: "b",
                                                        msg: "Data has attribute that is not part of the strict schema: \"b\"."
                                                    },
                                                    {
                                                        key: "a",
                                                        msg: "Missing attribute: \"a\"."
                                                    }
                                                ]
                                            }
                                        ]
									},
									{
										key: 2,
										msg: "Evaluation of array element at index \"2\" failed.",
										nested: [
											{
												msg: "Invalid attribute data.",
												nested: [
													{
														key: "a",
														msg: "Evaluation of attribute \"a\" failed.",
														nested: [{ msg: "Not a number." }]
													}
												]
											}
										]
									}
								]
							}
						]
					},
					{
						key: "arrayMap",
						msg: "Evaluation of attribute \"arrayMap\" failed.",
						nested: [
							{
								msg: "Invalid map data.",
								nested: [
									{
										key: "y",
										msg: "Evaluation of map value for key \"y\" failed.",
										nested: [{ msg: "Not an array." }]
									},
									{
										key: "z",
										msg: "Evaluation of map value for key \"z\" failed.",
										nested: [
											{
												msg: "Array validation failed.",
												nested: [
													{
														key: 1,
														msg: "Evaluation of array element at index \"1\" failed.",
														nested: [{ msg: "Not a number." }]
													}
												]
											}
										]
									}
								]
							}
						]
					}
				]
            });
        });

    });

    describe("generate error path list", () => {

		it("generates an list of error paths with its messages", () => {
			const data = {
				objArray: [{ a: 123 }, { b: 456 }, { a: "nan" }],
				arrayMap: { x: [1, 2, 3], y: "NotAnArray", z: [7, "eight", 9] }
			};
			const result = verify(nestedSpec, data);
            chai.expect(result.err).to.be.an("object")
            chai.expect(result.err && FormatValidationError.generateErrorPathList(result.err)).to.eql([
                {
                    msg: "Data has attribute that is not part of the strict schema: \"b\".",
                    path: ["objArray", 1, "b"]
                },
                {
                    msg: "Missing attribute: \"a\".",
                    path: ["objArray", 1, "a"]
                },
                {
                    msg: "Not a number.",
                    path: ["objArray", 2, "a"]
                },
                {
                    msg: "Not an array.",
                    path: ["arrayMap", "y"]
                },
                {
                    msg: "Not a number.",
                    path: ["arrayMap", "z", 1]
                }
			]);
		});

        it("generates an empty path for non-nested specs", () => {
            const result = verify(Type.number, "bla");
            chai.expect(result.err && FormatValidationError.generateErrorPathList(result.err)).to.eql([
                {
                    msg: "Not a number.",
                    path: []
                }
            ]);
        });

        it("generates no nested paths for an either-spec", () => {
            const objectEitherSpec = Type.object({
                a: either(Type.number, Type.string)
            });
            const result = verify(objectEitherSpec, { a: [] });
            chai.expect(result.err && FormatValidationError.generateErrorPathList(result.err)).to.eql([
                {
                    msg: "Not a number.",
                    path: ["a"]
                },
                {
                    msg: "Not a string.",
                    path: ["a"]
                }
            ]);
        });

    });

    describe("toString()", () => {
		const message = "This is just a test";

    	it("prints the message", () => {
    		const testError = new ValidationError(message);
    		chai.expect(testError.toString()).to.eql(`ValidationError: ${message}`);
		});

		it("works when converted to string", () => {
			const testError = new ValidationError(message);
			chai.expect(String(testError)).to.eql(`ValidationError: ${message}`);
		});

	});

});

