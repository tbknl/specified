import {Type, constrain, Constraint, either, optional, verify} from "..";

const productCatalogSpec = Type.array(Type.object({
    name: Type.string,
    code: constrain(Type.string, [Constraint.string.regex(/^[a-z]{2}-\d+$/)]),
    description: optional(Type.string),
    price: constrain(Type.number, [Constraint.number.above(0)])
    details: Type.map(Type.string, Type.unknown)
}));

const myProduct = verify(productSpec, { description: "Peanut butter", price: 3.50 }).value();

const model = verify(exampleSchema, data).value();

