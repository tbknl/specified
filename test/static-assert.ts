
// From: https://stackoverflow.com/questions/58778637/assert-type-is-not-any/58779181#58779181
type IsAny<T> = unknown extends T ? T extends {} ? T : never : never;
type IsNotAny<T> = T extends IsAny<T> ? never : T;
export function staticAssertIsNotAny<T>(_x: IsNotAny<T>) {}

type UndefinedNotAllowed<T> = undefined extends T ? never : T;
export function staticAssertUndefinedNotAllowed<T>(_x: UndefinedNotAllowed<T>) {}

type IsArray<T> = (T extends Array<any> ? never : T) extends never ? IsNotAny<T> : never;
export function staticAssertIsArray<T>(_x: IsArray<T>) {}

// TODO: Apply static assertions in all test files.

