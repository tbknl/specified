import * as chai from "chai";
import { staticAssertIsNotAny, staticAssertIsArray, staticAssertUndefinedNotAllowed } from "./static-assert";
import { Type, verify, either, optional } from "..";


describe("pattern", () => {

    describe("discriminated union", () => {
        const shapeSpec = either(
            Type.object({
                type: Type.literal({ circle: 1 }),
                radius: Type.number
            }),
            Type.object({
                type: Type.literal({ square: 1 }),
                size: Type.number
            })
        );

        it("infers the correct type", () => {
            const shapesData = [
                { type: "circle", radius: 3 },
                { type: "square", size: 5 }
            ];
            const shapes = verify(Type.array(shapeSpec), shapesData).value();
            staticAssertIsNotAny(shapes);
            staticAssertIsArray(shapes);
            staticAssertUndefinedNotAllowed(shapes);

            shapes.forEach(s => {
                staticAssertIsNotAny(s);
                staticAssertUndefinedNotAllowed(s);

                if (s.type === "circle") {
                    const radius: number = s.radius; // MOTE: Type-script infers the correct type of radius!
                    chai.expect(radius).to.equal(3);
                }
                else if (s.type === "square") {
                    const size: number = s.size; // MOTE: Type-script infers the correct type of size!
                    chai.expect(size).to.equal(5);
                }
            });
        });

    });

    describe("discriminated union with base schema", () => {
        const carBaseSchema = {
            brand: Type.string,
            model: Type.string
        };

        const electricCarSpec = Type.object({
            ...carBaseSchema,
            engine: Type.literal({ electric: 1 }),
            batteries: Type.number
        });

        const fuelCarSpec = Type.object({
            ...carBaseSchema,
            engine: Type.literal({ fuel: 1 }),
            cylinders: Type.number
        });

        const otherCarSpec = Type.object({
            ...carBaseSchema,
            engine: optional(Type.literal({}))
        });

        const carSpec = either(electricCarSpec, fuelCarSpec, otherCarSpec);

        it("infers the correct type", () => {
            const car = verify(carSpec, { engine: "electric", brand: "Tesla", model: "Model 4", batteries: 24 }).value();
            chai.expect(car.engine).to.equal("electric");
            if (car.engine === "electric") {
                staticAssertIsNotAny(car.batteries);
                chai.expect(car.batteries).to.equal(24);
            }
            else {
                chai.expect(true).to.equal(false); // Fail!
            }
        });

    });

    describe("either instance", () => {
        abstract class Animal {
            public abstract makeSound(): string;
        }
        class Cat extends Animal {
            public makeSound() { return "meow"; }
        }
        class Dog extends Animal {
            public makeSound() { return "woof"; }
        }

        const animalSpec = either(Type.instance(Cat), Type.instance(Dog));

        it("understands the correct instance class", () => {
            const dog = new Dog();
            const animal = verify(animalSpec, dog).value();
            const sound = animal.makeSound();
            chai.expect(sound).to.equal("woof");
        });

    });

});

