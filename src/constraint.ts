export const Constraint = {
    generic: {
        oneOf: <T>(...options: T[]) => {
            return {
                definition: {
                    name: "oneOf",
                    settings: { options }
                },
                eval: (value: T) => {
                    return { err: options.indexOf(value) < 0 ? {
                        code: "constraint.generic.oneOf.unknown_value",
                        value,
                        message: "Not one of the accepted options."
                    } : null };
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
                return { err: value % 1 !== 0 ? {
                    code: "constraint.number.integer",
                    value,
                    message: "Not an integer."
                } : null };
            }
        },
        finite: {
            definition: {
                name: "finite"
            },
            eval: (value: number) => {
                return { err: !Number.isFinite(value) ? {
                    code: "constraint.number.finite",
                    value,
                    message: "Not a finite number."
                } : null };
            }
        },
        above:  (lowerLimit: number) => {
            return {
                definition: {
                    name: "above",
                    settings: { lowerLimit }
                },
                eval: (value: number) => {
                    return { err: !(value > lowerLimit) ? {
                        code: "constraint.number.above",
                        value,
                        message: `Not above ${lowerLimit}.`
                    } : null };
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
                    return { err: !(value < upperLimit) ? {
                        code: "constraint.number.below",
                        value,
                        message: `Not below ${upperLimit}.`
                    } : null };
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
                    return { err: !(value >= lowerLimit) ? {
                        code: "constraint.number.atLeast",
                        value,
                        message: `Less than ${lowerLimit}.`
                    } : null };
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
                    return { err: !(value <= upperLimit) ? {
                        code: "constraint.number.atMost",
                        value,
                        message: `Larger than ${upperLimit}.`
                    } : null };
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
                return { err: value === "" ? {
                    code: "constraint.string.notEmpty",
                    value,
                    message: "Empty string."
                } : null };
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
                        return { err: {
                            code: "constraint.string.length.too_short",
                            value,
                            message: `String length less than ${min}`
                        } };
                    }
                    else if (typeof max !== "undefined" && value.length > max) {
                        return { err: {
                            code: "constraint.string.length.too_long",
                            value,
                            message: `String length greater than ${max}`
                        } };
                    }
                    return { err: null };
                }
            };
        },
        regex: (re: RegExp, custom: { errorMessage: string; errorCode: string; } = { errorMessage: "Regex mismatch.", errorCode: "constraint.string.regex" }) => {
            return {
                definition: {
                    name: "regex",
                    settings: { expression: re.source }
                },
                eval: (value: string) => {
                    return { err: !re.test(value) ? {
                        code: custom.errorCode,
                        value,
                        message: custom.errorMessage
                    } : null };
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
                    return { err: value.substr(0, prefix.length) !== prefix ? {
                        code: "constraint.string.startsWith",
                        value,
                        message: `String does not start with '${prefix}'.`
                    } : null };
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
                    return { err: value.substr(value.length - suffix.length) !== suffix ? {
                        code: "constraint.string.endsWith",
                        value,
                        message: `String does not end with '${suffix}'.`
                    } : null };
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
                        return { err: {
                            code: "constraint.map.size.too_small",
                            value,
                            message: `Object size less than ${min}`
                        } };
                    }
                    else if (typeof max !== "undefined" && numKeys > max) {
                        return { err: {
                            code: "constraint.map.size.too_large",
                            value,
                            message: `Object size greater than ${max}`
                        } };
                    }
                    return { err: null };
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
                    return { err:
                        (typeof min !== "undefined" && value.length < min) ? {
                            code: "constraint.array.length.too_short",
                            value,
                            message: `Array length less than ${min}`
                        } :
                        (typeof max !== "undefined" && value.length > max) ? {
                            code: "constraint.array.length.too_long",
                            value,
                            message: `Array length greater than ${max}`
                        } :
                        null
                    };
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
                    return { err: value.indexOf(includedValue) < 0 ? {
                        code: "constraint.array.includes",
                        value,
                        message: "Value is not included in array."
                    } : null };
                }
            };
        }
    }
};

