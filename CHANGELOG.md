# Changelog

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

