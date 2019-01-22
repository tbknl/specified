# specified

Type-safe typescript data specification verification.

## Rationale

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

const myProduct = verify(productSpec, { description: "Peanut butter", price: 3.50 }).value();
// NOTE: myProduct now has the expected typescript type: { description: string, price: number }
```


## Reference

* `Type` contains these predefined type specs:
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

* `ValidationError`: The error class for validation errors thrown by the types and constraints.
	 - `err.generateReportJson()`: Generate a JSON report of the error details.

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

