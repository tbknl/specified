import { Spec, EvalResult, ValidationFailure, VerifiedType }  from "./spec";

interface OptionalSpec extends Spec<any, any> {
    optional: true;
    defaultValue?: unknown;
}
interface NonOptionalSpec extends Spec<any, any> { optional?: false; }

type NonOptionalAttributes<S> = {
    [A in keyof S]: S[A] extends { optional: true } ? never : A;
};

type OptionalAttributes<S> = {
    [A in keyof S]: S[A] extends { optional: true } ? A : never;
};

type NonOptSchema<S> = Pick<S, NonOptionalAttributes<S>[keyof S]>;
type OptSchema<S> = Pick<S, OptionalAttributes<S>[keyof S]>;

interface Schema {
    [attr: string]: OptionalSpec | NonOptionalSpec;
}

type ResolveGeneric<T> = { [K in keyof T]: T[K] } & {};

type Model<S extends Schema> = ResolveGeneric<{
    [P in keyof NonOptSchema<S>]: S[P] extends NonOptionalSpec ? VerifiedType<S[P]> : never;
} & {
    [P in keyof OptSchema<S>]?: S[P] extends OptionalSpec ? VerifiedType<S[P]> : never;
}>;

const objectEval = <S extends Schema>(schema: S, defaultStrict: boolean, typeName: "object" | "interface") => (data: unknown, options: { local?: { strict?: boolean, failEarly?: boolean }, global: { failEarly?: boolean } }) => {
    const settings = { strict: defaultStrict, failEarly: false, ...options.global, ...options.local };
    if (typeof data !== "object" || data === null || data instanceof Array) {
        return { err: { code: `type.${typeName}.not_a_regular_object`, value: data, message: "Not a regular object." } };
    }
    const nestedErrors: ValidationFailure[] = [];
    if (settings.strict) {
        const extraKeys = Object.keys(data).filter(k => !(k in schema));
        extraKeys.forEach(ek => {
            nestedErrors.push({ code: `type.${typeName}.extra_attribute`, key: ek, value: data[ek], message: `Data has attribute that is not part of the strict schema: "${ek}".` });
        });
    }
    const attributes = Object.keys(schema);
    const model = {};
    for (let attrIndex = 0; attrIndex < attributes.length && (!settings.failEarly || !nestedErrors.length); ++attrIndex) {
        const attr = attributes[attrIndex];
        const attrSpec = schema[attr];
        if (!(attr in data) && !attrSpec.optional) {
            nestedErrors.push({ code: `type.${typeName}.missing_attribute`, value: data, message: `Missing attribute: "${attr}".`, key: attr });
        }
        else {
            const pass = Symbol();
            const value: unknown = !attrSpec.optional ? data[attr] :
                data.hasOwnProperty(attr) ? data[attr] : attrSpec.hasOwnProperty("defaultValue") ? attrSpec.defaultValue : pass;
            if (value !== pass) {
                const attrResult = attrSpec.eval(value, { global: options.global });
                if (attrResult.err) {
                    nestedErrors.push({ code: `type.${typeName}.invalid_attribute`, value, message: `Evaluation of attribute "${attr}" failed.`, key: attr, nestedErrors: [attrResult.err] });
                }
                else {
                    model[attr] = attrResult.value;
                }
            }
        }
    }
    if (nestedErrors.length) {
        return { err: { code: `type.${typeName}.invalid_attribute_data`, value: data, message: "Invalid attribute data.", nestedErrors } }
    }
    return { err: null, value: model as Model<S> };
};

export const Type = {
    unknown: {
        definition: {
            type: "unknown"
        },
        eval: (value: unknown) => {
            return { err: null, value };
        }
    },
    null: {
        definition: {
            type: "null"
        },
        eval: (value: unknown) => {
            if (value !== null) {
                return { err: { code: "type.null.not_null", value, message: "Not null." } };
            }
            return { err: null, value: null };
        }
    },
    string: {
        definition: {
            type: "string"
        },
        eval: (value: unknown) => {
            if (typeof value !== "string") {
                return { err: { code: "type.string.not_a_string", value, message: "Not a string." } };
            }
            return { err: null, value };
        }
    },
    number: {
        definition: {
            type: "number"
        },
        eval: (value: unknown) => {
            if (typeof value !== "number") {
                return { err: { code: "type.number.not_a_number", value, message: "Not a number." } };
            }
            return { err: null, value };
        }
    },
    boolean: {
        definition: {
            type: "boolean"
        },
        eval: (value: unknown) => {
            if (typeof value !== "boolean") {
                return { err: { code: "type.boolean.not_a_boolean", value, message: "Not a boolean." } };
            }
            return { err: null, value };
        }
    },
	symbol: {
		definition: {
			type: "symbol"
		},
		eval: (value: unknown) => {
			if (typeof value !== "symbol") {
                return { err: { code: "type.symbol.not_a_symbol", value, message: "Not a symbol." } };
			}
            return { err: null, value };
		}
	},
    literal: <D extends { [k: string]: true | 1 }>(def: D) => ({
        definition: {
            type: "literal",
            settings: { values: Object.keys(def) }
        },
        eval: (value: unknown) => {
            if (typeof value !== "string" || !def.hasOwnProperty(value)) {
                return { err: { code: "type.literal.incorrect_literal", value, message: "Incorrect literal." } };
            }
            return { err: null, value: value as keyof D };
        }
    }),
    array: <S extends Spec<any, any>>(spec: S) => ({
        definition: {
            type: "array",
            nested: { element: spec.definition }
        },
        eval: (data: unknown, options: { local?: { failEarly?: boolean, skipInvalid?: boolean }, global: { failEarly?: boolean } }) => {
            const settings = { failEarly: false, skipInvalid: false, ...options.global, ...options.local };
            if (!(data instanceof Array)) {
                return { err: { code: "type.array.not_an_array", value: data, message: "Not an array." } };
            }
            const values: VerifiedType<S>[] = [];
            const nestedErrors: ValidationFailure[] = [];
            for (let i = 0; i < data.length && (!settings.failEarly || !nestedErrors.length); ++i) {
                const elementValue = data[i];
                const elementResult = spec.eval(elementValue, { global: options.global });
                if (elementResult.err) {
                    if (!settings.skipInvalid) {
                        nestedErrors.push({
                            code: "type.array.invalid_element",
                            value: elementValue,
                            message: `Evaluation of array element at index "${i}" failed.`,
                            key: i,
                            nestedErrors: [elementResult.err]
                        });
                    }
                }
                else {
                    values.push(elementResult.value);
                }
            }
            if (nestedErrors.length) {
                return { err: { code: "type.array.invalid_elements", value: data, message: "Array validation failed.", nestedErrors } };
            }
            return { err: null, value: values };
        }
    }),
    object: <S extends Schema>(schema: S) => {
        return {
            definition: {
                type: "object",
                nested: Object.keys(schema).reduce((o, a) => {
                    o[a] = schema[a].definition;
                    return o;
                }, {})
            },
            eval: objectEval(schema, true, "object")
        };
    },
    interface: <S extends Schema>(schema: S) => {
        return {
            definition: {
                type: "interface",
                nested: Object.keys(schema).reduce((o, a) => {
                    o[a] = schema[a].definition;
                    return o;
                }, {})
            },
            eval: objectEval(schema, false, "interface")
        };
    },
    map: <T>(keySpec: Spec<EvalResult<string>>, valueSpec: Spec<EvalResult<T>>) => {
        return {
            definition: {
                type: "map",
                nested: {
                    key: keySpec.definition,
                    value: valueSpec.definition
                }
            },
            eval: (data: unknown, options: { local?: { failEarly?: boolean, skipInvalidKeys?: boolean, skipInvalidValues?: boolean }, global: { failEarly?: boolean } }) => {
                const settings = { failEarly: false, skipInvalidKeys: false, skipInvalidValues: false, ...options.global, ...options.local };
                if (typeof data !== "object" || data === null || data instanceof Array) {
                    return { err: { code: "type.map.not_a_regular_object", value: data, message: "Not a regular object." } };
                }
                const result: { [key: string]: T } = {};
                const nestedErrors: ValidationFailure[] = [];
                const dataKeys = Object.keys(data);
                for (let dataKeyIndex = 0; dataKeyIndex < dataKeys.length && (!settings.failEarly || !nestedErrors.length); ++dataKeyIndex) {
                    const dk = dataKeys[dataKeyIndex];
                    const keyResult = keySpec.eval(dk, { global: options.global });
                    if (keyResult.err) {
                        if (!settings.skipInvalidKeys) {
                            nestedErrors.push({ code: "type.map.invalid_key", value: dk, message: `Evaluation of map key "${dk}" failed.`, key: dk, nestedErrors: [keyResult.err] });
                        }
                    }
                    else {
                        const value = data[dk];
                        const valueResult = valueSpec.eval(value, { global: options.global });
                        if (valueResult.err) {
                            if (!settings.skipInvalidValues) {
                                nestedErrors.push({ code: "type.map.invalid_value", value, message: `Evaluation of map value for key "${dk}" failed.`, key: dk, nestedErrors: [valueResult.err] });
                            }
                        }
                        else {
                            result[keyResult.value] = valueResult.value;
                        }
                    }
                }
                if (nestedErrors.length) {
                    return { err: { code: "type.map.invalid_data", value: data, message: "Invalid map data.", nestedErrors } };
                }
                return { err: null, value: result };
            }
        };
    },
    instance: <T>(ctor: new() => T) => {
        return {
            definition: {
                type: "instance",
                settings: { className: "name" in ctor ? ctor.name : "" }
            },
            eval: (value: unknown) => {
                if (!(value instanceof ctor)) {
                    return { err: { code: "type.instance.not_an_instance_of", value, message: `Not an instance of "${ctor.name}".` } };
                }
                return { err: null, value };
            }
        };
    },
    numeric: {
        definition: {
            type: "numeric"
        },
        eval: (value: unknown) => {
            const num: number = Number(value) + 0;
            if (!Number.isFinite(num)) {
                return { err: { code: "type.numeric.not_a_finite_number", value, message: "Not a finite number." } };
            }
            return { err: null, value: num };
        }
    },
    booleanKey: (keys: { truthy: string[], falsy?: string[] }, options?: { caseInsensitive?: boolean }) => {
        const caseInsensitive = options && options.caseInsensitive;
        const truthy = keys.truthy.reduce((r, k) => {
            r[caseInsensitive ? k.toLowerCase() : k] = true;
            return r;
        }, {} as { [key: string]: true });
        const falsy = (keys.falsy || []).reduce((r, k) => {
            r[caseInsensitive ? k.toLowerCase() : k] = true;
            return r;
        }, {} as { [key: string]: true });
        return {
            definition: {
                type: "booleanKey",
                settings: { keys }
            },
            eval: (value: unknown) => {
                const valueStr = caseInsensitive ? `${value}`.toLowerCase() : `${value}`;
                if (truthy.hasOwnProperty(valueStr)) {
                    return { err: null, value: true };
                }
                else if (!keys.falsy || falsy.hasOwnProperty(valueStr)) {
                    return { err: null, value: false };
                }
                else {
                    return { err: { code: "type.booleanKey.invalid_key", value, message: "Not a valid boolean value." } };
                }
            }
        };
    }
};

