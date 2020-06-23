import { Spec, EvalResult, ValidationFailure, VerifiedType }  from "./spec";

interface OptionalSpec extends Spec<any, any> {
    optional: true;
}
interface NonOptionalSpec extends Spec<any, any> {
    optional?: false;
    defaultValue?: unknown;
}

type NonOptionalAttributes<S> = {
    [A in keyof S]: S[A] extends { optional: true } ? never : A;
};

type OptionalAttributes<S> = {
    [A in keyof S]: S[A] extends { optional: true } ? A : never;
};

type NonOptSchema<S> = Pick<S, NonOptionalAttributes<S>[keyof S]>;
type OptSchema<S> = Pick<S, OptionalAttributes<S>[keyof S]>;

interface Schema {
    [attr: string]: (OptionalSpec | NonOptionalSpec) & { description?: string };
}

type ResolveGeneric<T> = { [K in keyof T]: T[K] } & {};

type Model<S extends Schema> = ResolveGeneric<{
    [P in keyof NonOptSchema<S>]: S[P] extends NonOptionalSpec ? VerifiedType<S[P]> : never;
} & {
    [P in keyof OptSchema<S>]?: S[P] extends OptionalSpec ? VerifiedType<S[P]> : never;
}>;

type SpecType<S> = S extends Spec<EvalResult<any>, any> ? VerifiedType<S> : never;
type TupleSpecTypes<T> = { [P in keyof T]: SpecType<T[P]> };

const objectDefinition = <S extends Schema>(schema: S, typeName: "object" | "interface") => ({
    type: typeName,
    nested: Object.keys(schema).reduce((o, a) => {
        o[a] = schema[a].definition;
        return o;
    }, {}),
    descriptions: Object.keys(schema).reduce((d, a) => {
        if (schema[a].hasOwnProperty("description")) {
            d[a] = schema[a].description;
        }
        return d;
    }, {})
});

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
        if (!(attr in data) && !attrSpec.optional && !attrSpec.hasOwnProperty("defaultValue")) {
            nestedErrors.push({ code: `type.${typeName}.missing_attribute`, value: data, message: `Missing attribute: "${attr}".`, key: attr });
        }
        else {
            const pass = Symbol();
            const value: unknown = data.hasOwnProperty(attr) ? data[attr] : attrSpec.optional ? pass : attrSpec.hasOwnProperty("defaultValue") ? attrSpec.defaultValue : undefined;
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
        version: 1 as 1,
        definition: {
            type: "unknown"
        },
        eval: (value: unknown) => {
            return { err: null, value };
        }
    },
    null: {
        version: 1 as 1,
        definition: {
            type: "null"
        },
        eval: (value: unknown) => {
            if (value !== null) {
                return { err: { code: "type.null.not_null", value, allowed: null, message: "Not null." } };
            }
            return { err: null, value: null };
        }
    },
    string: {
        version: 1 as 1,
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
    },
    boolean: {
        version: 1 as 1,
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
        version: 1 as 1,
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
        version: 1 as 1,
        definition: {
            type: "literal",
            settings: { values: Object.keys(def) }
        },
        eval: (value: unknown) => {
            if (typeof value !== "string" || !def.hasOwnProperty(value)) {
                return { err: { code: "type.literal.incorrect_literal", value, allowed: Object.keys(def), message: "Incorrect literal." } };
            }
            return { err: null, value: value as keyof D };
        }
    }),
    literalValue: <V extends any[]>(...values: V) => ({
        version: 1 as 1,
        definition: {
            type: "literalValue",
            settings: { values }
        },
        eval: (value: unknown) => {
            for (const v of values) {
                if (value === v) {
                    return { err: null, value: value as V[number] };
                }
            }
            return { err: { code: "type.literalValue.incorrect_literal_value", value, allowed: values, message: "Incorrect literal value." } };
        }
    }),
    array: <S extends Spec<any, any>>(spec: S) => ({
        version: 1 as 1,
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
            version: 1 as 1,
            definition: objectDefinition(schema, "object"),
            eval: objectEval(schema, true, "object")
        };
    },
    interface: <S extends Schema>(schema: S) => {
        return {
            version: 1 as 1,
            definition: objectDefinition(schema, "interface"),
            eval: objectEval(schema, false, "interface")
        };
    },
    map: <T>(keySpec: Spec<EvalResult<string>>, valueSpec: Spec<EvalResult<T>>) => {
        return {
            version: 1 as 1,
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
    tuple: <SpecsTuple extends Spec<any, any>[]>(...specs: SpecsTuple) => {
        return {
            version: 1 as 1,
            definition: {
                type: "tuple",
                nested: specs.reduce((n, spec, i) => {
                    n[i] = spec.definition;
                    return n;
                }, {})
            },
            eval: (data: unknown, options: { local?: { failEarly?: boolean }, global: { failEarly?: boolean } }) => {
                const settings = { failEarly: false, ...options.global, ...options.local };
                if (!(data instanceof Array)) {
                    return { err: { code: "type.tuple.not_a_tuple", value: data, message: "Not an tuple." } };
                }
                if (data.length !== specs.length) {
                    return { err: { code: "type.tuple.incorrect_length", value: data, message: `Data does not have correct tuple length ${specs.length}.` } };
                }
                const values = [] as unknown as TupleSpecTypes<SpecsTuple>;
                const nestedErrors: ValidationFailure[] = [];
                for (let i = 0; i < data.length && (!settings.failEarly || !nestedErrors.length); ++i) {
                    const elementValue = data[i];
                    const elementResult = specs[i].eval(elementValue, { global: options.global });
                    if (elementResult.err) {
                        nestedErrors.push({
                            code: "type.tuple.invalid_element",
                            value: elementValue,
                            message: `Evaluation of tuple element at index "${i}" failed.`,
                            key: i,
                            nestedErrors: [elementResult.err]
                        });
                    }
                    else {
                        values.push(elementResult.value);
                    }
                }
                if (nestedErrors.length) {
                    return { err: { code: "type.tuple.invalid_elements", value: data, message: "Tuple validation failed.", nestedErrors } };
                }
                return { err: null, value: values };
            }
        };
    },
    instance: <T>(ctor: new(..._args: unknown[]) => T) => {
        return {
            version: 1 as 1,
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
        version: 1 as 1,
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
            version: 1 as 1,
            definition: {
                type: "booleanKey",
                settings: {
                    keys,
                    caseInsensitive
                }
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
                    return { err: {
                        code: "type.booleanKey.invalid_key",
                        value,
                        allowed: [...keys.truthy, ...keys.falsy],
                        message: "Not a valid boolean value."
                    } };
                }
            }
        };
    }
};

