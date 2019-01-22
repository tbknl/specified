import * as chai from "chai";
import { Type, verify, either } from "..";


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
            shapes.forEach(s => {
                if (s.type === "circle") {
                    const radius = s.radius; // MOTE: Type-script infers the correct type of radius!
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

        const carSpec = either(electricCarSpec, fuelCarSpec);

        it("infers the correct type", () => {
            const car = verify(carSpec, { engine: "electric", brand: "Tesla", model: "Model 4", batteries: 24 }).value();
            chai.expect(car.engine).to.equal("electric");
            if (car.engine === "electric") {
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

