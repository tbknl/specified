# specified

Type-safe Typescript data specification verification.

## Rationale

Any data flowing into a program at run-time should be checked for validity, while it also has an implicit or explicit type. Examples are: user input, http request body payloads, http response body payloads, message bus event payloads, environment variables, configuration files. The `specified` package allows to describe a "spec" of the data, by specifying its type and any constraints. The spec can then be used to verify the data and will automatically assign the correct Typescript type to the result.


## Design goals

* Single definition of type and validation.
* Strictly typed and type-safe.
* Zero dependencies.
* Easy extensability: simple to create custom convertions and validations.


## Examples

Simple short example:

```typescript
import {Type, constrain, Constraint, verify} from "specified";

const productSpec = Type.object({
    description: Type.string,
    price: constrain(Type.number, [Constraint.number.above(0)])
});

const data = JSON.parse('{"description":"Peanut butter","price":3.50}');
const myProduct = verify(productSpec, data).value();
// NOTE: myProduct now has the expected typescript type: { description: string, price: number }
```


## Reference

* `Type` contains these predefined type specs:
	 - `unknown`: Accepts anything, but returns `unknown` as its type.
	 - `null`: Only accepts `null`.
	 - `string`: Accepts strings.
	 - `number`: Accepts numbers.
	 - `boolean`: Accepts booleans.
	 - `literal({ key1: 1, key2: 1, ... })`: Only accepts the literal values of the keys.
	 - `array(spec)`: Accepts arrays of which the elements are according to specification `spec`.
	 - `object(schema)`: Accepts object that follow the specified schema (see below).
	 - `map(keySpec, valueSpec)`: Accepts objects of which all keys are according to `keySpec` and all values according to `valueSpec`.
	 - `instance(classCtor)`: Accepts instances of the specified class.
	 - `dateString`: Accepts anything convertable to a date and returns a Date instance.
	 - `numeric`: Accepts anything that is convertible to a number.

* `Constraint` contains predefined constraints for some of the types.

* `result = verify(spec, data, globalOptions)` verifies that the data is conforms to the spec and returns an object containing the result value or a validation error if one occurred. Optionally global options can be provided that are passed to all nested specs.
	 - `result.err`: Either `null` or an instance of `ValidationError`.
	 - `result.value()`: Returns the result value if no validation error occurred. The value has the typescript type `VerifiedType<typeof spec>`.
* `constrain(spec, [constraint1, constraint2, ...])`: Adds one or more constraints to a spec.
* `adjust`: Adjust the local options of a spec, if it has any. For example `adjust(Type.object({}), { strict: false })`.
* `either(spec1, spec2, ...)` creates a new spec that accepts any of the upto 9 specs provided.
* `optional(spec)` makes a schema attribute optional.
* `definitionOf(spec)` returns the definition of a spec.
* `alias(spec, alias)` adds a string alias to the spec's definition.
* `extractAliases(definition)` extracts aliases from a definition.

* `ValidationError`: The error class for validation errors thrown by the types and constraints.
	 - `err.generateReportJson()`: Generate a JSON report of the error details.
	 - `err.generateErrorPathList()`: Generate a list of paths into the data which failed verification.

* `VerifiedType<Spec>` corresponds to the verification result type of the spec. Example: `type v = VerifiedType<typeof Type.number>; // Equals <number>.`
* `Spec<T, L>` is the generic type of a spec, where `T` is its result type (as is provided by `VerifiedType`) and `L` is the inferred type with the available local options properties for the spec.
* `SpecConstraint<T>` defines what a constraint for spec with result type `T` looks like.
* `GlobalOptions` defines the global options available for each spec, which is optionally passed into `verify`.

### Schema

A schema describes an object by its attributes and their value specifications. The attributes can be declared optional.

For example:
```typescript
const exampleSchema = {
    numattr: Type.number,
    optStrAttr: optional(Type.string)
};

const exampleObjectSpec = Type.object(exampleSchema);
type ExampleObjectType = VerifiedType<typeof exampleObjectSpec>;
// ExampleObjectType corresponds to { numAttr: number, optStrAttr?: string }
```


## Contributors

* [Dave van Soest](https://github.com/tbknl)
* [Niek Bruins](https://github.com/pheew)

