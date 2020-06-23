# Upgrading

This document contains information about upgrading to a newer major version of specified from an older major version.

## Upgrade from v0.x to v1.y

* The API of specified v1.y is compatible with all specified v0.x versions, which were in turn always backwards compatible.
* The underlying interfaces of spec types and spec constraints have changed significantly. Definitions of existing specs will however continue to work. Custom spec types and custom constraints will require a mostly trivial update to the new interfaces. Most notably, their evaluation functions should no longer throw in case of a validation failure, but return the error instead.
* The `err` property returned by the `verify` function is no longer an instance of the `ValidationError` class, but rather an object that implements the `ValidationFailure` interface.
    * The exception thrown in case the `value()` function is called when the validation has failed, is still an instance of `ValidationError`, which also implements the `ValidationFailure` interface. However, it is discouraged to depend on this behavior of the `value()` function, as it will likely be deprecated in future releases. Instead, always check the value of `err` first.
* The error-formatting methods `generateReportJson` and `generateErrorPathList` of the `ValidationError` class are now part of their own 'namespace' object `FormatValidationFailure`, which works on any object that conforms to the `ValidationFailure` interface.
