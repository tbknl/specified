import {ValidationError, ValidationFailure} from "./validation_error";
export {ValidationFailure} from "./validation_error";


export interface GlobalOptions {
    readonly failEarly?: boolean;
}

export interface SpecOptions<LocalOptions extends {} = {}> {
    readonly local?: LocalOptions;
    readonly global: GlobalOptions;
}

export interface ConstraintDefinition {
    readonly name: string;
    readonly settings?: object;
}

export interface SpecConstraint<T> {
    readonly version: 1;
    readonly eval: (value: T) => { err?: ValidationFailure | null };
    readonly definition: ConstraintDefinition;
}

export interface SpecDefinition {
    readonly type: string;
    readonly nested?: { [key: string]: SpecDefinition };
    readonly alias?: string;
    readonly constraints?: ConstraintDefinition[];
    readonly adjustments?: object;
    readonly flags?: string[];
    readonly defaultValue?: unknown;
    readonly descriptions?: { [attr: string]: string };
}

export type EvalResult<T> = { err: ValidationFailure; } | { err: null; value: T; };

export interface Spec<R extends EvalResult<any>, LocalOpts extends {} = {}> {
    readonly version: 1;
    readonly eval: (value: unknown, options: SpecOptions<LocalOpts>) => R;
    readonly definition: SpecDefinition;
}

export type VerifiedType<S extends Spec<any, any>> = Extract<ReturnType<S["eval"]>, { err: null }>["value"];
export type EvalResultOf<S extends Spec<any, any>> = { err: ValidationFailure; } | { err: null; value: VerifiedType<S>; };
export type LocalOptionsOf<S extends Spec<any, any>> = Required<Parameters<S["eval"]>[1]>["local"];

interface VerifyResult<T> {
    readonly err: ValidationFailure | null;
    readonly value: () => T;
}

interface VerifyOptions {
    errorClass: new (msg: string, err: ValidationFailure) => ValidationFailure;
}

export const verify = <S extends Spec<EvalResult<any>, {}>>(
    spec: S,
    value: unknown,
    globalOptions: GlobalOptions = {},
    verifyOptions: VerifyOptions = { errorClass: ValidationError }
): VerifyResult<VerifiedType<S>> => {
    if (spec.version === 1) {
        const result = spec.eval(value, { global: globalOptions });
        if (result.err) {
            return {
                err: result.err,
                value: (): VerifiedType<S> => {
                    throw new verifyOptions.errorClass(result.err.message, result.err);
                }
            };
        }
        else {
            return {
                err: null,
                value: () => result.value
            };
        }
    }
    else {
        throw Error(`Unknown spec version '${spec.version}'`);
    }
};


export const alias = <S extends Spec<EvalResult<any>, any>>(aliasName: string, spec: S): Spec<EvalResultOf<S>, LocalOptionsOf<S>> => {
    if (spec.version === 1) {
        return {
            version: 1 as 1,
            definition: {
                ...spec.definition,
                alias: aliasName
            },
            eval: spec.eval
        };
    }
    else {
        throw Error(`Unknown spec version '${spec.version}'`);
    }
};


const removeAlias = (specDef: SpecDefinition): SpecDefinition => {
    const def = { ...specDef };
    delete def.alias;
    return def;
};


export const constrain = <S extends Spec<EvalResult<any>, any>>(spec: S, constraints: Array<SpecConstraint<VerifiedType<S>>>): Spec<EvalResultOf<S>, LocalOptionsOf<S>> => {
    if (spec.version === 1) {
        if (constraints.reduce((r, constraint) => r && constraint.version === 1, true)) {
        return {
            version: 1 as 1,
            definition: {
                ...removeAlias(spec.definition),
                constraints: [...(spec.definition.constraints || []), ...constraints.map(c => c.definition)]
            },
            eval: (value: unknown, options: SpecOptions<LocalOptionsOf<S>>): EvalResultOf<S> => {
                const candidateResult = spec.eval(value, options);
                if (!candidateResult.err) {
                    for (const c of constraints) {
                        const { err } = c.eval(candidateResult.value);
                        if (err) {
                            return { err };
                        }
                    }
                }
                return candidateResult;
            }
        };
        }
        else {
            throw Error(`Unknown constraint version '${constraints.map(c => c.version)}'`);
        }
    }
    else {
        throw Error(`Unknown spec version '${spec.version}'`);
    }
};


export function optional<S extends Spec<EvalResult<any>, any>>(spec: S): Spec<EvalResultOf<S>, LocalOptionsOf<S>> & { optional: true };
export function optional<S extends Spec<EvalResult<any>, any>>(spec: S, options: {}): Spec<EvalResultOf<S>, LocalOptionsOf<S>> & { optional: true };
export function optional<S extends Spec<EvalResult<any>, any>>(spec: S, options: { defaultValue: VerifiedType<S> }): Spec<EvalResultOf<S>, LocalOptionsOf<S>> & { optional: false };
export function optional<S extends Spec<EvalResult<any>, any>>(
    spec: S,
    options?: { defaultValue?: VerifiedType<S> }
): Spec<EvalResultOf<S>, LocalOptionsOf<S>> & ({ optional: true } | { optional: false }) {
    if (spec.version === 1) {
        if (options && typeof options.defaultValue !== "undefined") {
            const defaultValue = options.hasOwnProperty("defaultValue") ? { defaultValue: options.defaultValue } : {};
            return {
                version: 1 as 1,
                definition: {
                    ...spec.definition,
                    flags: [...(spec.definition.flags || []), "optional"],
                    ...defaultValue
                },
                eval: spec.eval,
                optional: false as false,
                ...defaultValue
            };
        }
        else {
            return {
                version: 1 as 1,
                definition: {
                    ...spec.definition,
                    flags: [...(spec.definition.flags || []), "optional"]
                },
                eval: spec.eval,
                optional: true as true
            };
        }
    }
    else {
        throw Error(`Unknown spec version '${spec.version}'`);
    }
}


export const adjust = <S extends Spec<EvalResult<any>, any>>(spec: S, adjustedOptions: LocalOptionsOf<S>): Spec<EvalResultOf<S>, LocalOptionsOf<S>> => {
    if (spec.version === 1) {
        return {
            version: 1 as 1,
            definition: {
                ...removeAlias(spec.definition),
                adjustments: { ...adjustedOptions, ...spec.definition.adjustments }
            },
            eval: (value: unknown, options: SpecOptions<LocalOptionsOf<S>>) => {
                return spec.eval(value, { local: { ...adjustedOptions, ...options.local }, global: options.global });
            }
        };
    }
    else {
        throw Error(`Unknown spec version '${spec.version}'`);
    }
};


export const definitionOf = <S extends Spec<EvalResult<any>, any>>(spec: S) => {
    if (spec.version === 1) {
        return spec.definition;
    }
    else {
        throw Error(`Unknown spec version '${spec.version}'`);
    }
};


export interface AliasedNestedSpecDefinition extends Pick<SpecDefinition, Exclude<keyof SpecDefinition, "nested">> {
    nested?: { [key: string]: SpecDefinition | { alias: string } };
}


const _extractAliases = (def: SpecDefinition, aliases: { [name: string]: AliasedNestedSpecDefinition }): AliasedNestedSpecDefinition | { alias: string } => {
    const aliasedDefinition = {
        ...def,
        ...(def.nested ? { nested: Object.keys(def.nested).reduce((o, k) => {
            const nt: SpecDefinition = (def.nested as any)[k];
            o[k] = _extractAliases(nt, aliases);
            return o;
        }, {}) } : {})
    };
    if (def.alias) {
        aliases[def.alias] = aliasedDefinition;
        return { alias: def.alias };
    }
    else {
        return aliasedDefinition;
    }
};


export const extractAliases = (def: SpecDefinition) => {
    const aliases: { [name: string]: AliasedNestedSpecDefinition } = {};
    return {
        definition: _extractAliases(def, aliases),
        aliases
    };
};


type SpecEvalResultType<S> = S extends Spec<EvalResult<any>, any> ? EvalResultOf<S> : never;
type TupleSpecEvalResultTypes<T> = { [P in keyof T]: SpecEvalResultType<T[P]> };
type TupleTypeUnion<TT> = TT extends Array<infer U> ? U : never;

export const either = <SpecsTuple extends Spec<any, any>[]>(...specs: SpecsTuple) => {
    if (specs.reduce((r, spec) => r && spec.version === 1, true)) {
        const nested = specs.reduce((n, spec, index) => {
            n[index + 1] = spec.definition;
            return n;
        }, {});
        return {
            version: 1 as 1,
            definition: {
                type: "either",
                nested
            },
            eval: (value: unknown, options: SpecOptions): TupleTypeUnion<TupleSpecEvalResultTypes<SpecsTuple>> | { err: ValidationFailure; } => {
                const validationErrors: ValidationFailure[] = [];

                for (const spec of specs) {
                    const result = spec.eval(value, { global: options.global });
                    if (result.err) { validationErrors.push(result.err); } else { return result; }
                }

                return { err: {
                    code: "either.no_matching_spec",
                    value,
                    message: "Evaluation of value failed for every possible spec.",
                    nestedErrors: validationErrors
                } };
            }
        };
    }
    else {
        throw Error(`Unknown spec version '${specs.map(spec => spec.version)}'`);
    }
};

