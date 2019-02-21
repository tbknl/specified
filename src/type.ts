import {Spec, SpecOptions, Schema, Model} from "./spec";
import {ValidationError} from "./validation_error";


export const Type = {
    null: {
        definition: {
            type: "null"
        },
        eval: (value: unknown): null => {
            if (value !== null) {
                throw new ValidationError("Not null.");
            }
            return null;
        }
    },
    string: {
        definition: {
            type: "string"
        },
        eval: (value: unknown) => {
            if (typeof value !== "string") {
                throw new ValidationError("Not a string.");
            }
            return value;
        }
    },
    number: {
        definition: {
            type: "number"
        },
        eval: (value: unknown) => {
            if (typeof value !== "number") {
                throw new ValidationError("Not a number.");
            }
            return value;
        }
    },
    boolean: {
        definition: {
            type: "boolean"
        },
        eval: (value: unknown) => {
            if (typeof value !== "boolean") {
                throw new ValidationError("Not a boolean.");
            }
            return value;
        }
    },
    literal: <D extends { [k: string]: true | 1 }>(def: D) => {
        return {
            definition: {
                type: "literal"
            },
            eval: (value: unknown): (keyof D) => {
                if (typeof value !== "string" || !def.hasOwnProperty(value)) {
                    throw new ValidationError("Incorrect literal.");
                }
                return value;
            }
        };
    },
    array: <T>(spec: Spec<T>) => {
        return {
            definition: {
                type: "array",
                nested: { element: spec.definition }
            },
            eval: (data: unknown, options: SpecOptions<{ failEarly?: boolean, skipInvalid?: boolean }>) => {
                const settings = { failEarly: false, skipInvalid: false, ...options.global, ...options.local };
                if (!(data instanceof Array)) {
                    throw new ValidationError("Not an array.");
                }
                const values: T[] = [];
                const nestedErrors: ValidationError[] = [];
                for (let i = 0; i < data.length && (!settings.failEarly || !nestedErrors.length); ++i) {
                    try {
                        values.push(spec.eval(data[i], { global: options.global }));
                    }
                    catch (err) {
                        if (err instanceof ValidationError) {
                            if (!settings.skipInvalid) {
                                nestedErrors.push(new ValidationError(`Evaluation of array element at index "${i}" failed.`, {key: i, nestedErrors: [err] }));
                            }
                        }
                        else {
                            throw err;
                        }
                    }
                }
                if (nestedErrors.length) {
                    throw new ValidationError("Array validation failed.", { nestedErrors });
                }
                return values;
            }
        };
    },
    object: <S extends Schema>(schema: S) => {
        return {
            definition: {
                type: "object",
                nested: Object.keys(schema).reduce((o, a) => {
                    o[a] = schema[a].definition;
                    return o;
                }, {})
            },
            eval: (data: unknown, options: SpecOptions<{ strict?: boolean, failEarly?: boolean }>) => {
                const settings = { strict: true, failEarly: false, ...options.global, ...options.local };
                if (typeof data !== "object" || data === null || data instanceof Array) {
                    throw new ValidationError("Not a regular object.");
                }
                if (settings.strict) {
                    const extraKeys = Object.keys(data).filter(k => !(k in schema));
                    if (extraKeys.length) {
                        throw new ValidationError(`Data has attributes that are not part of the schema: "${extraKeys.join(",")}".`);
                    }
                }
                const nestedErrors: ValidationError[] = [];
                const attributes = Object.keys(schema);
                const model = {};
                for (let attrIndex = 0; attrIndex < attributes.length && (!settings.failEarly || !nestedErrors.length); ++attrIndex) {
                    const attr = attributes[attrIndex];
                    const attrSpec = schema[attr];
                    if (!(attr in data) && !attrSpec.optional) {
                        nestedErrors.push(new ValidationError(`Attribute not present: "${attr}".`, { key: attr }));
                    }
                    else {
                        if (!attrSpec.optional || data.hasOwnProperty(attr)) {
                            const value: unknown = data[attr];
                            try {
                                model[attr] = attrSpec.eval(value, { global: options.global });
                            }
                            catch (err) {
                                if (err instanceof ValidationError) {
                                    nestedErrors.push(new ValidationError(`Evaluation of attribute "${attr}" failed.`, { key: attr, nestedErrors: [err] }));
                                }
                                else {
                                    throw err;
                                }
                            }
                        }
                    }
                }
                if (nestedErrors.length) {
                    throw new ValidationError("Object validation failed.", { nestedErrors });
                }
                return model as Model<S>;
            }
        };
    },
    map: <T>(keySpec: Spec<string>, valueSpec: Spec<T>) => {
        return {
            definition: {
                type: "map",
                nested: {
                    key: keySpec.definition,
                    value: valueSpec.definition
                }
            },
            eval: (data: unknown, options: SpecOptions<{ failEarly?: boolean, skipInvalidKeys?: boolean, skipInvalidValues?: boolean }>) => {
                const settings = { failEarly: false, skipInvalidKeys: false, skipInvalidValues: false, ...options.global, ...options.local };
                if (typeof data !== "object" || data === null || data instanceof Array) {
                    throw new ValidationError("Not a regular object.");
                }
                const result: { [key: string]: T } = {};
                const nestedErrors: ValidationError[] = [];
                const dataKeys = Object.keys(data);
                for (let dataKeyIndex = 0; dataKeyIndex < dataKeys.length && (!settings.failEarly || !nestedErrors.length); ++dataKeyIndex) {
                    const dk = dataKeys[dataKeyIndex];
                    try {
                        const rk = keySpec.eval(dk, { global: options.global });
                        try {
                            result[rk] = valueSpec.eval(data[dk], { global: options.global });
                        }
                        catch (err) {
                            if (err instanceof ValidationError) {
                                if (!settings.skipInvalidValues) {
                                    nestedErrors.push(new ValidationError(`Evaluation of map value for key "${dk}" failed.`, { key: dk, nestedErrors: [err] }));
                                }
                            }
                            else {
                                throw err;
                            }
                        }
                    }
                    catch (err) {
                        if (err instanceof ValidationError) {
                            if (!settings.skipInvalidKeys) {
                                nestedErrors.push(new ValidationError(`Evaluation of map key "${dk}" failed.`, { key: dk, nestedErrors: [err] }));
                            }
                        }
                        else {
                            throw err;
                        }
                    }
                }
                if (nestedErrors.length) {
                    throw new ValidationError("Map validation failed.", { nestedErrors });
                }
                return result;
            }
        };
    },
    instance: <T>(ctor: new() => T) => {
        return {
            definition: {
                type: "instance"
            },
            eval: (value: unknown) => {
                if (!(value instanceof ctor)) {
                    throw new ValidationError(`Not an instance of "${ctor.name}".`);
                }
                return value;
            }
        };
    },
    dateString: {
        definition: {
            type: "dateString"
        },
        eval: (value: unknown) => {
            const ts = Date.parse(`${value}`);
            if (ts % 1 !== 0) {
                throw new ValidationError("Not a valid date.");
            }
            return new Date(ts);
        }
    },
    numeric: {
        definition: {
            type: "numeric"
        },
        eval: (value: unknown) => {
            const num: number = Number(value) + 0;
            if (!Number.isFinite(num)) {
                throw new ValidationError("Not a finite number.");
            }
            return num;
        }
    }
};

