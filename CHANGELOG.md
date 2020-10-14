# Changelog

## v1.0.0
* Change interface of types and constraints  functions to return errors instead of throwing them.
* Replaced ValidationError class with ValidationFailure interface. Exception thrown by `verify(...).value()` is still of class ValidationError.
* Added stable error codes and original data value to ValidationFailure interface.
* Moved error report generators to separate `FormatValidationFailure` space.
* Added custom error class to options of `verify`.
* Nesting of missing attribute error in `Type.object` and `Type.interface`.
* Customizable error message and error code for `Constraint.string.regex`.
* Removed deprecated `Type.dateString`.
* Added static type assertions to the tests.
* Added new `Type.tuple(...)` type.
* Rewrite of `either` to support any amount of specs, instead of the maximum of 9 from before.
* Added schema attribute descriptions to `Type.object` and `Type.interface` definitions.
* Added `Type.literalValue` for literal constant values.
* Added version 1 to Spec and SpecConstraint interface, to prevent older specs from accidentally being evaluated, and to prepare for potential future interface changes.
* Added `allowed` field to `ValidationFailure` interface. And filled this field where applicable in the built-in types and constraints.
* Fix for the type bug where the resulting property of an optional attribute was marked as optional when a defaultValue was provided.
* Added `code`, `value` and `allowed` to optionally be included in formatted errors.

## v0.4.1
* Added automatic resolving of generic type of complex schema models. Hugely improves inspecting value types of verification result variables in TS editors.

## v0.4.0
* Added 'booleanKey' type.
* Added 'interface' type. Same behavior as object type, except it is non-strict by default.
* Added 'symbol' type.
* Added 'defaultValue' option to 'optional'.

## v0.3.3
* (FIX) Export SpecOptions generic to prevent TS4023 error on usage.

## v0.3.2
* (FIX) Fix for .d.ts files of specified dependent packages to not contain imports of specified internal modules.
* Mark Type.dateString as deprecated in readme.

## v0.3.1
* npm audit fixes

## v0.3.0
* Small readme update.
* Change build target to ES5. (PR by pheew)

## v0.2.0
* ae740fa - Added 'getNestedErrors' method to 'ValidationError'.
* def47ee - Added 'unknown' type.
* c167796 - Added 'definitionOf', 'alias' and 'extractAliases' functions.

## v0.1.0
* Added method to generate error paths to ValidationError.
* Added skip invalid elements to array, skip invalid keys or values to map type.
* Replaced Object.assign with ellipsis.

## v0.0.0
* First version implementation.

