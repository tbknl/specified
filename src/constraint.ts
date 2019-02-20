import {ValidationError} from "./validation_error";


export const Constraint = {
    generic: {
        oneOf: <T>(...options: T[]) => {
            return {
                definition: {
                    name: "oneOf",
                    settings: { options }
                },
                eval: (value: T) => {
                    if (options.indexOf(value) < 0) {
                        throw new ValidationError("Not one of the accepted options.");
                    }
                }
            };
        }
    },
    number: {
        integer: {
            definition: {
                name: "integer"
            },
            eval: (value: number) => {
                if (value % 1 !== 0) {
                    throw new ValidationError("Not an integer.");
                }
            }
        },
        finite: {
            definition: {
                name: "finite"
            },
            eval: (value: number) => {
                if (!Number.isFinite(value)) {
                    throw new ValidationError("Not a finite number.");
                }
            }
        },
        above:  (lowerLimit: number) => {
            return {
                definition: {
                    name: "above",
                    settings: { lowerLimit }
                },
                eval: (value: number) => {
                    if (!(value > lowerLimit)) {
                        throw new ValidationError(`Not above ${lowerLimit}.`);
                    }
                }
            };
        },
        below: (upperLimit: number) => {
            return {
                definition: {
                    name: "below",
                    settings: { upperLimit }
                },
                eval: (value: number) => {
                    if (!(value < upperLimit)) {
                        throw new ValidationError(`Not below ${upperLimit}.`);
                    }
                }
            };
        },
        atLeast:  (lowerLimit: number) => {
            return {
                definition: {
                    name: "atLeast",
                    settings: { lowerLimit }
                },
                eval: (value: number) => {
                    if (!(value >= lowerLimit)) {
                        throw new ValidationError(`Less than ${lowerLimit}.`);
                    }
                }
            };
        },
        atMost: (upperLimit: number) => {
            return {
                definition: {
                    name: "atMost",
                    settings: { upperLimit }
                },
                eval: (value: number) => {
                    if (!(value <= upperLimit)) {
                        throw new ValidationError(`Larger than ${upperLimit}.`);
                    }
                }
            };
        }
    },
    string: {
        notEmpty: {
            definition: {
                name: "notEmpty"
            },
            eval: (value: string) => {
                if (value === "") {
                    throw new ValidationError("Empty string.");
                }
            }
        },
        length: ({ min, max }: { min?: number, max: number } | { min: number, max?: number }) => {
            return {
                definition: {
                    name: "length",
                    settings: { min, max }
                },
                eval: (value: string) => {
                    if (typeof min !== "undefined" && value.length < min) {
                        throw new ValidationError(`String length less than ${min}`);
                    }
                    else if (typeof max !== "undefined" && value.length > max) {
                        throw new ValidationError(`String length greater than ${max}`);
                    }
                }
            };
        },
        regex: (re: RegExp) => {
            return {
                definition: {
                    name: "regex",
                    settings: { expression: re.source }
                },
                eval: (value: string) => {
                    if (!re.test(value)) {
                        throw new ValidationError("Regex mismatch.");
                    }
                }
            };
        },
        startsWith: (prefix: string) => {
            return {
                definition: {
                    name: "startsWith",
                    settings: { prefix }
                },
                eval: (value: string) => {
                    if (value.substr(0, prefix.length) !== prefix) {
                        throw new ValidationError(`String does not start with '${prefix}'.`);
                    }
                }
            };
        },
        endsWith: (suffix: string) => {
            return {
                definition: {
                    name: "endsWith",
                    settings: { suffix }
                },
                eval: (value: string) => {
                    if (value.substr(value.length - suffix.length) !== suffix) {
                        throw new ValidationError(`String does not end with '${suffix}'.`);
                    }
                }
            };
        }
    },
    map: {
        size: <T extends {}>({ min, max }: { min?: number, max: number } | { min: number, max?: number }) => {
            return {
                definition: {
                    name: "size",
                    settings: { min, max }
                },
                eval: (value: T) => {
                    const numKeys = Object.keys(value).length ;
                    if (typeof min !== "undefined" && numKeys < min) {
                        throw new ValidationError(`Object size less than ${min}`);
                    }
                    else if (typeof max !== "undefined" && numKeys > max) {
                        throw new ValidationError(`Object size greater than ${max}`);
                    }
                }
            };
        }
    },
    array: {
        length: <T>({ min, max }: { min?: number, max: number } | { min: number, max?: number }) => {
            return {
                definition: {
                    name: "length",
                    settings: { min, max }
                },
                eval: (value: T[]) => {
                    if (typeof min !== "undefined" && value.length < min) {
                        throw new ValidationError(`Array length less than ${min}`);
                    }
                    else if (typeof max !== "undefined" && value.length > max) {
                        throw new ValidationError(`Array length greater than ${max}`);
                    }
                }
            };
        },
        includes: <T>(includedValue: T) => {
            return {
                definition: {
                    name: "includes",
                    settings: { value: includedValue }
                },
                eval: (value: T[]) => {
                    if (value.indexOf(includedValue) < 0) {
                        throw new ValidationError("Value is not included in array.");
                    }
                }
            };
        }
    }
};

