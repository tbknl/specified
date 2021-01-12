# specified

Type-safe Typescript data specification verification.

## Rationale

Any data flowing into a program at run-time should be checked for validity, while it also has an implicit or explicit type. Examples are: user input, http request body payloads, http response body payloads, message bus event payloads, environment variables, configuration files. The `specified` package allows to describe a "spec" of the data, by specifying its type and any constraints. The spec can then be used to verify the data and will automatically assign the correct Typescript type to the result.


## Design goals

* Single definition of type and validation.
* Strictly typed and type-safe.
* Zero dependencies.
* Easy extendability: simple to create custom convertions and validations.


## Upgrade from v0.x to v1.y

See the document [UPGRADE.md](./UPGRADE.md) for information about upgrading from an older major version to the current version of specified.


## Specs

### What is a spec?

A spec can describe any type of variable, but in most use cases it will describe an object or interface. Specs can be used nested inside other specs. A spec consists of a type and optionally some constraints.

Here are some examples of simple specs:

```typescript
import { Type, constrain, Constraint } from "specified";

const stringSpec = Type.string;

const integerSpec = constrain(Type.number, [Constraint.number.integer]);

const interfaceSpec = Type.interface({
    propertyOne: Type.string,
    propertyTwo: integerSpec
});
```

The argument to the function `Type.interface` is called a *schema*. A schema describes all the known properties of an interface or object model. The value of each property in a schema is again a spec, describing the type and constraints that the value of that property in the data should have. See the section [Schemas](#schemas) for all information regarding schemas.

A full list of all built-in spec types and constraints can be found below in the [Reference](#reference) section. Custom types and constraints can be created in case the built-in ones don't fulfill your needs.

Some of the built-in spec types are designed to (potentially) transform the input data into a different type. For example, `Type.numeric` will accept any input that can be converted to a 'number' and when it can convert it then it always returns a value of type 'number'.

### Verifying data 

A spec can be used to check whether some data is valid according to that spec. For this purpose the `verify` function can be used, by supplying it both the spec and the data. The output of the verification contains two fields: `err` which indicates a validation failure error or `null` in case of a successful validation; and `value()` which is a function that either returns a version of the data that corresponds to the spec or it throws a validation error in case of a validation failure. When the `err` field of the output is `null`, then `value()` will be guaranteed not to throw an error.

So, there are two ways to use the output of the verification. One way is to first check for a validation failure error and then safely use the value:

```typescript
import { Type, verify } from "specified";

const verificationResult = verify(Type.string, 123);
if (verificationResult.err) {
    console.log("Validation failure!");
}
else {
    console.log(`The verified value: ${verificationResult.value()}`);
}
```

The other way is to make sure that a potential validation error is caught:

```typescript
import { Type, verify, ValidationError } from "specified";

try {
    const verifiedValue = verify(Type.string, 123).value();
    console.log(`The verified value: ${verifiedValue}`);
}
catch (err) {
    if (err instanceof ValidationError) {
        console.log("Validation failure!");
    }
}
```

Of course the validation failure error contains more details about what exactly went wrong when verifying the data. The structure of the validation failure error will be discussed later on in this document.

### Typescript type of the validated data

The type of the output value of the data verification is inferred by typescript, corresponding to the type indicated by the used spec. Some examples:

```typescript
import { Type, verify } from "specified";

const myStringValue1: string = verify(Type.string, 123).value();
const myStringValue2: string = verify(Type.number, 123).value(); // COMPILE ERROR: Type 'number' is not assignable to type 'string'.
```

The useful generic type helper `VerifiedType<...>` will construct the typescript type of the verification output value corresponding to the provided spec. Some examples:

```typescript
import { Type, VerifiedType } from "specified";

type verifiedValueType1 = VerifiedType<typeof Type.boolean>; // This type will be 'boolean'.
type verifiedValueType2 = VerifiedType<typeof Type.array(Type.number)>; // This type will be 'number[]'.
type verifiedValueType3 = VerifiedType<typeof Type.object({ x: Type.string })>; // This type will be '{ x: string; }'.

const pointSpec = Type.interface({ x: number, y: number });
interface Point extends VerifiedType<typeof pointSpec> {}
```


## Spec constraints

Besides the type of the data, a spec can optionally describe constraints that the data should adhere to in order to successfully validate.

Only constraints that match with the type of the spec can be added to the spec. Some constraints are generic or can match with multiple spec types.

Constraints do not influence the verification output value. They merely check that the data adheres to the constraint.

Some examples of constraints:

```typescript
import { Type, constrain, Constraint } from "specified";

const nonEmptyStringSpec = constrain(Type.string, [Constraint.string.length({ min: 1 })]);
const positiveIntegerSpec = constrain(Type.number, [
    Constraint.number.integer,
    Constraint.number.above(0)
]);
```


## Spec transformation

The resulting value of a spec verification can be automatically transformed in the process of verification, by using the [transform](#transform) function. This function takes a source spec and a transformation function and returns a new spec that automatically applies the transformation function to the output of source spec's evaluation value. Note that both the source spec verification can fail and the tranformation itself can fail.

There are a few built-in transformation functions in this package, see the reference section [transformation](#transformation). But it is also easy to create a custom transformation spec, like in the following example:
```typescript
import { Type, transform } from "specified";

const sourceSpec = Type.tuple(Type.number, Type.number);
const transformedSpec = transform(
    sourceSpec,
    (value: [number, number]) => {
        if (value[0] < 0 || value[1] < 0) {
            return { err: {
                code: "transform.coordinates.negative_value",
                value,
                message: "Negative value not allowed."
            } };
        }
        else {
            return { err: null, value: { x: value[0], y: value[0] } };
        }
    }
);
```

Note that a spec with a transformation is just a regular spec. Therefore all operations for specs can be applied to it, like for example adding constraints to it.


## Combining specs

A union of two or more specs can be created with the `either(spec1, spec2, ... , specN)` function, resulting in a new spec, which succeeds verification if the data value is accepted by one of the provided specs. The resulting typescript type is the union of verification result types of the provided specs. For example, `either(Type.string, Type.number)` results in the type `string | number`. See the [either](#either) reference section for more information.


## Validation failure

When verifying data according to a certain spec and the data does not conform to the type or the constraints of that spec, then it will result in a *validation failure*. The failure will be returned in the `err` field of the verification result.

The data structure of the validation failure conforms to the `ValidationFailure` interface. This interface has the following properties:

* `code`: A unique identifier string that corresponds with the reason of the occurred failure. Each spec type and each spec constraint has one or more unique reasons for which it can fail, each with a unique error code.  When programmatically checking for a specific error then this code should be used.
* `value`: The data value for which the failure occurred. For a nested spec only the nested value will be part of the validation failure instance.
* `allowed`: Either an enumeration of all data values allowed by the spec, or a description of the data specification (for example: the regular expression in case of the `Constraint.string.regex` constraint). Not all failure reasons have this field filled in.
* `message`: A human readable message describing the failure reason. This message is not guaranteed to be exactly the same across different versions of *specified*. Therefore the `code` field should be used when programatically checking for a specific failure.
* `key`: For failures in a nested spec, this field indicates under which index number (for `Type.array` and `Type.tuple`) or key string (for `Type.object`, `Type.interface` and `Type.map`) the failed spec is nested within the parent spec. For non-nested spec this field is not applicable.
* `nestedErrors`: In case of nested failure this field contains an array with one or more object conforming to the `ValidationFailure` interface. Note that nested failures can itself also contain nested failures.

The exported `FormatValidationFailure` contains functions that format an instance of `ValidationFailure` into a more human readable JSON format. This is especially useful for failures containing nested errors.


## Full example

A simple but full example of using specified:

```typescript
import {Type, constrain, Constraint, verify} from "specified";

const productSpec = Type.interface({
    description: Type.string,
    price: constrain(Type.number, [Constraint.number.above(0)])
});

interface Product extends VerifiedType<typeof productSpec> {}

const data = JSON.parse('{"description":"Peanut butter","price":3.50}');
const verificationResult = verify(productSpec, data);
if (verificationResult.err) {
    console.log(FormatValidationFailure.generateErrorPathList(verificationResult.err));
}
else {
    const product: Product = verificationResult.value();
    console.log(product);
}
```


## Reference

### Spec modifiers

#### constrain

The `constrain(spec, [constraint1, constraint2, ...])` function adds one or more constraints to a spec. When evaluating data against the spec then these constraints are evaluated and will cause the evaluation to fail in case the data does not adhere to the constraint.

#### adjust

The function `adjust(spec, localOptionsToAdjust)` creates a clone of the spec, with one or more adjustments on the local options of the spec. For example `adjust(Type.object({}), { strict: false })`.

#### optional

The function `optional(spec)` only applies to a spec which is used as a [schema](#schema) attribute. It causes the attribute to become optional, so that the evaluation of the schema does not fail when this attribute is not present.

#### either

The function `either(spec1, spec2, ...)` combines multiple specs to create a new spec. Verification of this new spec will succeed if either one or more of the specs in the combination succeeds. The specs in the combination are evaluated in the order they are passed to the `either` function.

#### transform

The function `transform(sourceSpec, transformFunc)` creates a new spec that applies the supplied transformation function to the output value of the source spec upon evaluation. A failure on the evaluation of the contained source spec will result in a failure on the transormed spec. The transformation function may also fail itself.

The transformation function should have a single parameter that has a type that is compatible with the output value type of the source spec. In case of a failure, the transformation function should produce a result in the form of `{ err: ValidationFailure }` and in case of a successfull transformation `{ err: null, value: transformedValue }`. Note that the type of the transformed value may be different from the output value type of the source spec.


### Type

#### Type.string

The spec type `Type.string` accepts any data of type string. It results in the typescript type `string`.

Verification of a spec with this type will result in a failure with error code `type.string.not_a_string` in case the data value is not a string.

#### Type.number

The spec type `Type.number` accepts any data of type number, including number values such as `NaN` and `Infinity`. Constraints can be used to prevent these kind of values. It results in the typescript type `number`.

Verification of a spec with this type will result in a failure with error code `type.number.not_a_number` in case the data value is not a number.

#### Type.boolean

The spec type `Type.boolean` accepts data of the type boolean, so basically only the values `true` and `false`. It returns the typescript type `boolean`.

Verification of a spec with this type will result in a failure with error code `type.boolean.not_a_boolean` in case the data value is not a boolean.

#### Type.unknown

The spec type `Type.unknown` accepts any data, but returns `unknown` as its data type. This spec type will never cause a validition failure.

Use cases for this spec type include:
* checking that a property on an object exists, but it doesn't matter what its value is.
* splitting a complex spec into multiple parts, where using `unknown` for the parts of the data that will be verified using a different spec.

#### Type.null

The spec type `Type.null` accepts only the value `null` and results in the typescript type `null`.

Verification of a spec with this type will result in a failure with error code `type.null.not_null` in case the data value is something else than `null`.

#### Type.symbol

The spec type `Type.symbol` accepts any symbol and results in the typescript type `symbol`.

Verification of a spec with this type will result in a failure with error code `type.symbol.not_a_symbol` in case the data value is not a symbol.

#### Type.literal

The spec type `Type.literal(objectWithLiteralValuesAsKeys)` accepts only the literal string values which are provided as keys in its type parameter. The values of the type parameter object should all be `1` or `true` and have no functional meaning. An example:

```typescript
const sizeSpec = Type.literal({ "tiny": 1, "small": 1, "regular": 1, "big": 1, "huge": 1 });
```
The typescript type of the verification output value is the union type of all literal strings. In the example that typescript type is `"tiny" | "small" | "regular" | "big" | "huge"`.

Verification of a spec with this type will result in a failure with error code `type.literal.incorrect_literal` in case the data value does not equal one of the specified literals.

The `Type.literal` spec type is useful to describe "enumerations". It can be used for implementing the [discriminated union pattern](#discriminated-union-pattern).

#### Type.literalValue

The spec type `Type.literalValue(acceptedValues)` accepts any of the values provided in its type parameters. It results in the typescript type that is the type union of the accepted values.

It is advisable to only use actual literal values only, which for example allows typescript to help indicating which are the possible values or to help checking that all possible values are handled in a switch-statement.

Verification of a spec with this type will result in a failure with error code `type.literalValue.incorrect_literal_value` in case the data value does not equal one of the specified accepted values.

The `Type.literalValue` can be used for implementing the [discriminated union pattern](#discriminated-union-pattern).

#### Type.array

The spec type `Type.array(elementSpec)` accepts arrays of which the elements are accepted by the `elementSpec` spec. The resulting typescript type is an array of the result type of its elements. For example `Type.array(Type.number)` will result in the type `number[]`.

There are 2 [local options](#local-options) and 1 [global option](#global-options) that can adjust the behavior of evaluation of the `Type.array` spec. The local options can be adjusted using the [adjust](#adjust) function. Local options are not applied recursively. Global options can be provided when invoking the `verify` function.

* `failEarly` is both a global and local boolean option that causes the evaluation of the spec to fail directly when one of the evaluation of one of its elements fails when set to `true`. At most 1 nested element error will be reported in that case. The default value `false` lets the evaluation of all elements be finalized in case of evaluation failures of one or more of the elements. All nested element errors will be returned in this case. Note: the local option takes precedence over the global option.
* `skipInvalid` is a local boolean option with default value `false`, which causes the evaluation to skip elements that are not accepted by the element spec when set to `true`. Invalid elements will not be part of the evaluation result and their errors are ignored.

Verification of a spec with this type can result in a the following failures:

* Error code `type.array.not_an_array` in case the data value is not an array.
* Error code `type.array.invalid_elements` if the evaluation of one or more elements returns a failure. For each failed element it will contain a nested error with error code `type.array.invalid_element` and the element index in the `key` field, which in turn contains the element's failure as a nested error.

#### Type.tuple

The spec type `Type.tuple(...specs)` accepts a tuple (an array with a fixed length) of which each element is accepted by the provided spec at the same position in the tuple. The resulting typescript type is a tuple with the result type of each of it element specs at the same position. For example, the spec `Type.tuple(Type.string, Type.number, Type.boolean)` has the result type `[string, number, boolean]`. It will accept the data `["abc", 123, true]`, but it will fail on the data `[123, "abc", true]` and `["abc", 123]` and `["abc", 123, true, "extraElement"]`.

The behavior of the evaluation of `Type.tuple` can be adjusted  with the global and local (using the [adjust](#adjust) function) boolean option `failEarly` to stop the evaluation on the first encountered failure when evaluating its elements when set to `true`. It will result in at most 1 nested error in that case. The default value is `false`, which can result in multiple element failures. The local option for `failEarly` takes precedence over the global option, and it does not work recursively.

Verification of a spec with this type can result in the following failures:

* Error code `type.tuple.not_a_tuple` in case the data is not a tuple (i.e. an array).
* Error code `type.tuple.incorrect_length` in case the data is an array, but its length is not equal to the number of specified element specs.
* Error code `type.tuple.invalid_elements` if the evaluation of one or more elements returns a failure. For each failed element it will contain a nested error with error code `type.tuple.invalid_element` and the element index in the `key` field, which in turn contains the element's failure as a nested error.

#### Type.object and Type.interface

The spec types `Type.object(schema)` and `Type.interface(schema)` accepts objects of which the data properties are valid according to the spec provided in the [schema](#schemas) at the attribute with the same name. For example the spec `Type.object({ x: Type.number, y: Type.string })` accepts the data `{ x: 123, y: "abc" }`. The verification result typescript type is an object with a property named after each attribute in the schema, with the type of each property's value being the result type of the spec corresponding to the attribute in the schema.

The only difference between the spec types `Type.object(schema)` and `Type.interface(schema)` is that by default `Type.object` is strictly not allowing attributes to be present in the data that are not part of the schema, while `Type.interface` allows (but ignores) unspecified attributes in the data. `Type.interface(schema)` is equivalent to `adjust(Type.object(schema), { strict: false })`.

There are 2 [local options](#local-options) and 1 [global option](#global-options) that can adjust the behavior of evaluation of the `Type.object` and `Type.interface` spec. The local options can be adjusted using the [adjust](#adjust) function. Local options are not applied recursively. Global options can be provided when invoking the `verify` function.

* `failEarly` is both a global and local boolean option that causes the evaluation of the spec to fail directly when one of the evaluation of one of its attribute data values fails when set to `true`. At most 1 nested attribute error will be reported in that case. The default value `false` lets the evaluation of all attributes be finalized in case of evaluation failures of one or more of the attributes. All nested attribute errors will be returned in this case. Note: the local option takes precedence over the global option.
* `strict` is a local boolean option with default value `true` for `Type.object` and `false` for `Type.interface`. When set to `false`, it causes the evaluation to ignore properties that are not present as attributes in the schema. When set to `true`, properties not present as attributes in the schema will cause the evaluation to fail.

Verification of a spec with one of these types can result in the following failures:

* Error code `type.object.not_a_regular_object` or `type.interface.not_a_regular_object` in case the data value is not an object, or when it's `null` or an array instance.
* Error code `type.object.extra_attribute` or `type.interface.extra_attribute` when evaluating in strict mode and the data object contains a key that is not present as an attribute in the schema.
* Error code `type.object.missing_attribute` or `type.interface.missing_attribute` in case a mandatory attribute (i.e. not declared as optional) is missing in the data object.
* Error code `type.object.invalid_attribute_data` or `type.interface.invalid_attribute_data` if the evaluation of one or more of the object properties values returns a failure. For each failed attribute it will contain a nested error with error code `type.object.invalid_attribute` or `type.interface.invalid_attribute` and the attribute name in the `key` field, which in turn contains the property value's failure as a nested error.

#### Type.map

The spec type `Type.map(keySpec, valueSpec)` accepts objects of which the keys are valid according to the `keySpec` (which must have a `string` result type) and the values are valid according to the `valueSpec`. The verification result's typescript type is an object with `string` keys and the values with the resulting type of the `valueSpec` verification: `{ [key: string]: VerifiedType<typeof valueSpec> }`.

With the following global and local options the behavior of the `Type.map` spec can be adjusted:

* `failEarly` is both a global and local boolean option that causes the evaluation of the spec to fail directly on the first failure encountered when verifying the data keys and values when set to `true`. At most 1 nested error will be reported in that case. The default value `false` lets the evaluation of all keys and values be finalized in case of evaluation failures of one or more keys or values. All nested attribute errors will be returned in this case. Note: the local option takes precedence over the global option.
* `skipInvalidKeys` is a local boolean option with default value `false`. It causes the evaluation to skip keys that are not accepted by the key spec when set to `true`. Invalid keys will not be part of the evaluation result and their errors are ignored. Their corresponding values will not be evaluated.
* `skipInvalidValues` is a local boolean option with default value `false`. It causes the evaluation to skip values that are not accepted by the value spec when set to `true`. Invalid values will cause its key to not be part of the evaluation result and their errors are ignored.

Verification of the `Type.map` spec can result in the following failures:

* Error code `type.map.not_a_regular_object` when the data value is not an object or when it's `null` or an array instance.
* Error code `type.map.invalid_data` in case the evaluation of one or more keys or values fails. It will contain nested errors with either the `type.map.invalid_key` or `type.map.invalid_value` error code and the `key` field set to the failing data key, which in turn contains a nested error with the failure of the key or value evaluation.

#### Type.instance

The spec type `Type.instance(ctor)` accepts objects that are class instances create through the `ctor` constructor function. The resulting typescript type is the instance type of the class.

Verification of the `Type.instance` spec can result in a failure with the error code `type.instance.not_an_instance_of` in case the data value is not an instance of the class of which `ctor` is the constructor.

Example:
```typescript
class MyClass {}
const myClassSpec = Type.instance(MyClass);
const myInstance = new MyClass();
const myVerifiedInstance = verify(myClassSpec, myInstance).value();
```

#### Type.numeric

The spec type `Type.numeric` accepts every value that can convert into a finite number. The resulting typescript type of the verification is `number`. These are examples of accepted values: `123`, `"-123"`, `true` (which results in value `1`).

Verification of this type can result in a failure with error code `type.numeric.not_a_finite_number` when the data value does not represent a finite number.

#### Type.booleanKey

The spec type `Type.booleanKey(keys, options)` can operate in two modes, depending on whether only truthy keys are provided or also falsy keys. The resulting typescript type is always a `boolean`.

* If only truthy keys are provided, for example `Type.booleanKey({ truthy: ["yes", "true"] })`, then the evaluation will result in the value `true` only if the data value converted to a `string` exactly equals one of the truthy keys, otherwise the result will be `false`.
* If both truthy and falsy values are provided, for example `Type.booleanKey({ truthy: ["Yes"], falsy: ["No"] })`, then the evaluation will result in either `true` or `false` when the data value converted to a `string` is one of the provided truthy or falsy keys respectively. If the data value is not one of the specified keys, then the verification will result in a failure with error code `type.booleanKey.invalid_key`.

The `option` parameter of the spec is optional and can contain the optional `caseInsensitive` boolean option, which is by default `false`. When set to `true`, the comparison between the data value and the keys is done in a case-insensitive way, by converting both the key and data value to lower case characters.


### Constraint

The specified distribution contains a number of built-in constraints that can be applied to a spec of the same type using the [constrain](#constrain) function.

The constraints are divided into groups, according to their type. Some constraints can apply to multiple types.

#### Constraint.generic.oneOf

The generic constraint `Constraint.generic.oneOf(valueOptions)` checks whether the evaluated value from the spec equals one of the values in the `valueOptions` array. Note that the spec result type should be compatible with the value options' type.

Verification of a spec with this constraint can result in a failure with error code `constraint.generic.oneOf.unknown_value`.

#### Constraint.number.integer

The constraint `Constraint.number.integer` applies to number values, and checks whether the number value is an integer.

Verification of a spec with this constraint can result in a failure with error code `constraint.number.integer`.

#### Constraint.number.finite

The constraint `Constraint.number.finite` applies to number values, and checks whether the number value is finite, i.e. that it is not equal to `NaN` or `Infinite` or `-Infinite`.

Verification of a spec with this constraint can result in a failure with error code `constraint.number.finite`.

#### Constraint.number.above

The constraint `Constraint.number.above(lowerLimit)` applies to number values. It checks whether the data value is higher than the provided lower limit.

Verification of a spec with this constraint can result in a failure with error code `constraint.number.above`.

#### Constraint.number.below

The constraint `Constraint.number.below(upperLimit)` applies to number values. It checks whether the data value is lower than the provided upper limit.

Verification of a spec with this constraint can result in a failure with error code `constraint.number.below`.

#### Constraint.number.atLeast

The constraint `Constraint.number.atLeast(lowerLimit)` applies to number values. It checks whether the data value is higher than or equal to the provided lower limit.

Verification of a spec with this constraint can result in a failure with error code `constraint.number.atLeast`.

#### Constraint.number.atMost

The constraint `Constraint.number.atMost(upperLimit)` applies to number values. It checks whether the data value is lower than or equal to the provided upper limit.

Verification of a spec with this constraint can result in a failure with error code `constraint.number.atMost`.

#### Constraint.string.notEmpty

The constraint `Constraint.string.notEmpty` applies to string values. It checks whether the value is not an empty string.

Verification of a spec with this constraint can result in a failure with error code `constraint.string.notEmpty`.

#### Constraint.string.length

The constraint `Constraint.string.length({ min, max })` applies to string values. It checks whether the string value's length is within the required range.

The range can be defined with 
* only the minimum length, for example `Constraint.string.length({ min: 3 })`,
* only the maximum length, for example `Constraint.string.length({ max: 10 })`,
* both a minimum and maximum, for example `Constraint.string.length({ min: 3, max: 10 })`.

Verification of a spec with this constraint can result in a failure with error code `constraint.string.length.too_short` or `constraint.string.length.too_long`.

#### Constraint.string.regex

The constraint `Constraint.string.regex(pattern)` applies to string values. It checks that the string value matches the regular expression pattern.

Verification of a spec with this constraint can by default result in a failure with error code `constraint.string.regex`. But a custom error code and custom error message can be provided as a second parameter to this constraint, to override them. For example: `Constraint.string.regex(/^[a-z]+$/, custom: { errorMessage: "Not a lowercase word.", errorCode: "Constraint.string.lowercaseWord" })`.

#### Constraint.string.startsWith

The constraint `Constraint.string.startsWith(prefix)` applies to string values. It checks that the string value starts with the provided prefix string.

Verification of a spec with this constraint can result in a failure with error code `constraint.string.startsWith`.

#### Constraint.string.endsWith

The constraint `Constraint.string.endsWith(suffix)` applies to string values. It checks that the string value ends with the provided suffix string.

Verification of a spec with this constraint can result in a failure with error code `constraint.string.endsWith`.

#### Constraint.map.size

The constraint `Constraint.map.size({ min, max })` applies to the [map type](#typemap). It checks whether the number of keys in the map is within the required range.

The range can be defined with 
* only the minimum length, for example `Constraint.map.size({ min: 3 })`,
* only the maximum length, for example `Constraint.map.size({ max: 10 })`,
* both a minimum and maximum, for example `Constraint.map.size({ min: 3, max: 10 })`.

Verification of a spec with this constraint can result in a failure with error code `constraint.map.size.too_small` or `constraint.map.size.too_large`.

#### Constraint.array.length

The constraint `Constraint.array.length({ min, max })` applies to array values. It checks whether the array's length is within the required range.

The range can be defined with 
* only the minimum length, for example `Constraint.array.length({ min: 3 })`,
* only the maximum length, for example `Constraint.array.length({ max: 10 })`,
* both a minimum and maximum, for example `Constraint.array.length({ min: 3, max: 10 })`.

Verification of a spec with this constraint can result in a failure with error code `constraint.array.length.too_short` or `constraint.array.length.too_long`.

#### Constraint.array.includes

The constraint `Constraint.array.includes(needle)` applies to arrays. It checks that the `needle` value is included in the array. Note that it only compares value and not nested structures, therefore an object instance is only considered to be "included" if the exact same object reference is part of the array.

Verification of a spec with this constraint can result in a failure with error code `constraint.array.includes`.

#### Constraint.array.unique

The constraint `Constraint.array.unique(equalsFunc)` applies to arrays. It checks whether all elements in the array are equal according to the `equalsFunc` function. The default `equalsFunc` does a simple `===` comparison.

Verification of a spec with this constraint can result in a failure with error code `constraint.array.unique`.

NOTE: In the worst case scenario, this constraint does `1/2 * (N^2 - N)` calls to the `equalsFunc` function, where `N` is the array length.


### Transformation

TODO


### Spec definitions

#### definitionOf

The function `definitionOf(spec)` returns the definition of the provided spec. The definition contains various information about the spec. It conforms to the following interface:

```typescript
interface SpecDefinition {
    readonly type: string;
    readonly nested?: { [key: string]: SpecDefinition };
    readonly alias?: string;
    readonly constraints?: ConstraintDefinition[];
    readonly adjustments?: object;
    readonly flags?: string[];
    readonly defaultValue?: unknown;
    readonly descriptions?: { [attr: string]: string };
}
```

For example, `definitionOf(Type.array(constrain(Type.number, [Constraint.number.above(0)])))` results in this definition:

```json
{
    "type": "array",
    "nested": {
        "element": {
            "type": "number",
            "constraints": [
                {
                    "name": "above",
                    "settings": {
                        "lowerLimit": 0
                    }
                }
            ]
        }
    }
}
```

#### alias

The `alias(aliasName, spec)` function creates a new spec with the alias name string set or overwritten in the spec's definition.

Aliases can be extracted from a spec definition using the [extractAliases](#extractaliases) function.

#### extractAliases

The `extractAliases(definition)` extracts aliases from the provided definition. The result is the list of aliased sub-definitions together with the definition in which all aliased sub-definitions are replaced by the alias name.

Example:
```typescript
const integerSpec = alias("integer", constrain(Type.number, [Constraint.number.integer]));
const coordinatesSpec = Type.object({ x: integerSpec, y: integerSpec });
const coordinatesSpecDef = definitionOf(coordinatesSpec);
const coordinatesSpecDefWithExtractedAliases = extractAliases(coordinatesSpecDef);
```
This will result in:
```json
{
    "definition": {
        "type": "object",
            "nested": {
                "x": {
                    "alias": "integer"
                },
                "y": {
                    "alias": "integer"
                }
            }
    },
    "aliases": {
        "integer": {
            "type": "number",
            "constraints": [
            {
                "name": "integer"
            }
            ],
            "alias": "integer"
        }
    }
}
```

### Validation failures

#### ValidationFailure

The `ValidationFailure` interface describes the error as returned by the `verify` function.

```typescript
interface ValidationFailure {
    code: string;
    value: unknown;
    allowed?: unknown;
    message: string;
    key?: ValidationErrorKey;
    nestedErrors?: ValidationFailure[];
}
```

#### ValidationError

The `ValidationError` class implements the `ValidationFailure` interface. An new instance of this class is thrown by the `.value()` function of the verification result in case of a validation failure.

Note that for forwards-compatibility reasons it is discouraged to rely on the methods of this class, but instead to treat it as an instance of the `ValidationFailure` instance only. The class should then only be used in a catch handler to detect the type of error, as in this example:

```typescript
try {
    ...
    verifiedData = verify(spec, data).value();
    ...
}
catch (err) {
    if (err instanceof ValidationError) {
        const validationFailure: ValidationFailure = err;
        // Do something with the validation failure here.
    }
}
```

#### FormatValidationFailure

The `FormatValidationFailure` namespace contains functions to convert an object with the `ValidationFailure` interface into a reportable representation.

##### generateReportJson

The function `FormatValidationFailure.generateReportJson(err, options)` generates a JSON report with the error details.

Supported options are:

* `include` contains boolean switches for including extra details in the report. The supported switches are:
	* `include.message` to include the message in the report. Default value: `true`.
	* `include.code` to include the error code in the report. Default value: `false`.
	* `include.value` to include the data value on which the spec evaluation failed. Default value: `false`. Note: be careful to not include sensitive data in reports.
	* `include.allowed` to include a description of which data values are allowed by this spec.

##### generateErrorPathList

The function `generateErrorPathList(err, options)` generates a list of all (nested) "paths" in the validation which caused a failure. Note that it depends on the spec options whether all paths were evaluated or that it already returned upon the first failure.

Supported options are:

* `include` contains boolean switches for including extra details in the report. The supported switches are:
	* `include.message` to include the message in the report. Default value: `true`.
	* `include.code` to include the error code in the report. Default value: `false`.
	* `include.value` to include the data value on which the spec evaluation failed. Default value: `false`. Note: be careful to not include sensitive data in reports.
	* `include.allowed` to include a description of which data values are allowed by this spec.

Here is an example of a path list:
```json
[
	{
		"msg": "Data has attribute that is not part of the strict schema: \"b\".",
		"path": ["objArray", 1, "b"]
	},
	{
		"msg": "Missing attribute: \"a\".",
		"path": ["objArray", 1, "a"]
	},
	{
		"msg": "Not a number.",
		"path": ["objArray", 2, "a"]
	},
	{
		"msg": "Not an array.",
		"path": ["arrayMap", "y"]
	},
	{
		"msg": "Not a number.",
		"path": ["arrayMap", "z", 1]
	}
]
```

### Verification

#### verify

The `verify(spec, data, globalOptions, verifyOptions)` function evaluates whether the provided data is valid according to the provided spec.

See the section on [verifying data](#verifiyingdata) on how to process the result of this function.

By default `globalOptions` is empty. But it may contain the following options, which will then be applied to all (nested) specs during evaluation:

* `failEarly`: Stop the evaluation upon the first encountered failure.

The `verifyOptions` contain the following options:

* `errorClass`: The error class to use when throwing an error from the `.value()` function of the verification result. Default value: `ValidationError`. The used class must have a constructor functionwith this signature: `function (msg: string, err: ValidationFailure): ValidationFailure`.

#### VerifiedType

The `VerifiedType<Spec>` typescript generic type corresponds to the verification result type of the provided spec.

Example usage:
```typescript
const spec = Type.array(Type.number);
type SpecResultData = VerifiedType<typeof spec>; // Equals 'number[]'.
```


## Schemas

A schema describes an object or interface by its attributes and their value specifications. The attributes can be declared optional.

A simple example:
```typescript
const exampleSchema = {
    numattr: Type.number,
    optStrAttr: optional(Type.string)
};

const exampleObjectSpec = Type.object(exampleSchema);
type ExampleObjectType = VerifiedType<typeof exampleObjectSpec>;
// ExampleObjectType corresponds to { numAttr: number, optStrAttr?: string }
```

### Attribute descriptions

A description can be added to a schema attribute, which will appear in the [definition of](#definitionof) the spec under the `descriptions` key.

An example:
```typescript
const personSpec = Type.interface({
    name: {
        ...Type.string,
	description: "The person's name."
    },
    age: {
        ...Type.number,
        description: "The age in years."
    }
});
```

### Reusable "base" schemas

A schema can be used as a "base" schema for multiple specs, when declared in a separate variable.

Here's an example:
```typescript
const shapeBaseSchema = {
    color: Type.literal({ blue: 1, red: 1 }),
    filled: Type.boolean
};

const circleShapeSpec = Type.object({
    ...shapeBaseSchema,
    shapeType: Type.literal({ circle: 1 }),
    radius: Type.number
});

const rectangleShapeSpec = Type.object({
    ...shapeBaseSchema,
    shapeType: Type.literal({ rectangle: 1 }),
    width: Type.number,
    height: Type.number
});
```
Note that it is important that the base schema's typescript type is inferred, for the specs to be strongly typed.

### Discriminated unions

In the base schema example the `shapeType` attribute can be used as a discriminated union in case a generic shape spec is needed:
```typescript
const shapeSpec = either(circleShapeSpec, rectangleShapeSpec);
const shape = verify(shapeSpec, shapeData).value();
if (shape.shapeType === "circle") {
    console.log(`Circle radius: ${shape.radius}`); // NOTE: 'radius' is strongly-typed here!
}
```

The following example shows how it is possible to add an unknown type to the union:
```typescript
const otherShapeSpec = Type.object({
    ...shapeBaseSchema,
    shapeType: optional(Type.literal({}))
});

const shapeSpec = either(circleShapeSpec, rectangleShapeSpec, otherShapeSpec);
```


## Extendability

It is relatively easy to extend the specified library with custom spec types and spec constraints, in case the types and constraints which are delivered with this package do not fulfill your needs.

Types and constraints are decoupled from the core of specified through the use of interfaces. This means that there is no dependency needed on the specified library to create a custom type or constraint. Many examples of type and constraint implementations can be found in the source code of the specified package.

### Custom types

A spec type is the basic part of a spec. It consists of an object structure that contains meta information, but most importantly an evaluation function. The evaluation function takes a value of an unknown type, then performs checks on the value and then guarantees the type of the returned value, or returns a validation-failure instead.

There are three kinds of spec types:
* Simple: The evaluation function just checks for a type. There are no settings that modify the behavior of the evaluation. Example: `Type.number`.
* Configurable: The actual spec type is the result of a function call, which has parameters to modify the behavior of the evaluation. Example: `Type.literal({ accepted: 1, literals: 1 })`.
* Higher-order: The spec type covers a data structure that contains nested specs. Example: `Type.array(nestedSpec)`.


The object structure of a type contains the following properties:
* `version`: The version of the type interface that is used. This enables future changes to this interface, while maintaining backwards compatibility. Currently only the literal  value `1` is supported.
* `definition`: The definition of the spec type. See [spec definitions](#specdefinitions). It always contains the `type` property, that should be unique within a project. For 'configurable' spec types it should contain the `settings` property, which contains the values set for the configuration parameters. For 'higher-order' spec types, it should contain the `nested` property which contains the definition of the nested spec(s).
* `eval`: The evaluation function that determines whether the supplied value conforms to the type. Next to the `value` parameter it has a second `options` parameter that may contain local and global options to be applied during evaluation. See [adjust](#adjust) and [verify](#verify) for explanations of local and global options respectively. The evaluation function returns either `{ err: { ... } }` in case of a validation failure, where the `err` property conforms to the [`ValidationFailure`](#validationfailure) interface. Or, upon successful evaluation, it returns `{ err: null. value: value }` , where the `value` has the correct typescript type. In case the value contains mutable data, it is best to clone the output value of the evaluation function, because a change in the original data may render a successful evaluation obsolete.

Here's an illustrative example of a spec type implementation, specifically the `Type.number` type:
```typescript
const type_number = {
    version: 1 as 1,
    definition: {
        type: "number"
    },
    eval: (value: unknown) => {
        if (typeof value !== "number") {
            return { err: { code: "type.number.not_a_number", value, message: "Not a number." } };
        }
        return { err: null, value };
    }
};
```

After defining a custom spec type in your project, you can use it like any other spec type.

### Custom constraints

A spec constraint consists (much like a spec type) of an object structure with meta information and an evaluation function. It differs from a spec type in two ways: it doesn't return an output value, only a potential failure, and it takes a typed input parameter. The input parameter type determines on which spec types the constraint can be put, as it needs to be compatible with the spec type's output value type.

There are two kinds of spec constraints:
* Simple: The evaluation function just checks whether the value meets the constraint. There are no settings that modify the behavior of the evaluation. Example: `Constraint.number.integer`.
* Configurable: The actual spec constraint is the result of a function call, which has parameters to modify the behavior of the evaluation. Example: `Constraint.string.length({ min, max })`.

The object structure of a type contains the following properties:
* `version`: The version of the type interface that is used. This enables future changes to this interface, while maintaining backwards compatibility. Currently only the literal  value `1` is supported.
* `definition`: The definition of the spec constraint. It has a mandatory `name` string property, which should be unique within your project. In case of a 'configurable' constraint, it should also contain the `settings` property, indicating the values for the configuration parameters.
* `eval`: The evaluation function that determines whether the supplied value meets the constraint. The evaluation function returns either `{ err: { ... } }` in case of a validation failure, where the `err` property conforms to the [`ValidationFailure`](#validationfailure) interface. Or, upon successful evaluation, it returns `{ err: null }`.

As an example, here's the implementation of the "integer" constraint for the number type:
```typescript
const constraint_integer = {
    version: 1 as 1,
    definition: {
        name: "integer"
    },
    eval: (value: number) => {
        return { err: value % 1 !== 0 ? {
            code: "constraint.number.integer",
            value,
            message: "Not an integer."
        } : null };
    }
};
```

## Contributors

* [Dave van Soest](https://github.com/tbknl)
* [Niek Bruins](https://github.com/pheew)

