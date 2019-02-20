import {Type, constrain, Constraint, verify} from "..";

const productSpec = Type.object({
    description: Type.string,
    price: constrain(Type.number, [Constraint.number.above(0)])
});

const myProduct = verify(productSpec, { description: "Peanut butter", price: 3.50 }).value();
// NOTE: myProduct now has the expected typescript type: { description: string, price: number }

console.log(myProduct);
