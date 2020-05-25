import {ValidationError} from "./validation_error";


export interface ValidationFailure {
    code: string;
    value: unknown;
    message: string;
    key?: string | number;
    nestedErrors?: ValidationFailure[];
}

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
}

type EvalResultFailure = { err: ValidationFailure; };
type EvalResultSuccess<T> = { err: null; value: T; };
export type EvalResult<T> = EvalResultFailure | EvalResultSuccess<T>;

export interface Spec<R extends EvalResult<any>, LocalOpts extends {} = {}> {
    readonly eval: (value: unknown, options: SpecOptions<LocalOpts>) => R;
    readonly definition: SpecDefinition;
}

export type VerifiedType<S extends Spec<any, any>> = Extract<ReturnType<S["eval"]>, { err: null }>["value"];
export type EvalResultOf<S extends Spec<any, any>> = EvalResultFailure | EvalResultSuccess<VerifiedType<S>>;
export type LocalOptionsOf<S extends Spec<any, any>> = Required<Parameters<S["eval"]>[1]>["local"];

interface VerifyResult<T> {
    readonly err: ValidationFailure | null; // TODO: Use ValidationFailure instead of ValidationError.
    readonly value: () => T;
}

interface VerifyOptions {
    errorClass: new (msg: string, err: ValidationFailure) => ValidationFailure;
}

// TODO: Document backwards-incompatibility: result.err is of type ValidationFailure, has no report generating functions in it. Upgrade path: ...
export const verify = <S extends Spec<EvalResult<any>, {}>>(spec: S, value: unknown, globalOptions: GlobalOptions = {}, verifyOptions: VerifyOptions = { errorClass: ValidationError }): VerifyResult<VerifiedType<S>> => {
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
};


export const alias = <S extends Spec<EvalResult<any>, any>>(aliasName: string, spec: S): Spec<EvalResultOf<S>, LocalOptionsOf<S>> => {
    return {
        definition: {
            ...spec.definition,
            alias: aliasName
        },
        eval: spec.eval
    };
};


const removeAlias = (specDef: SpecDefinition): SpecDefinition => {
    const def = { ...specDef };
    delete def.alias;
    return def;
};


export const constrain = <S extends Spec<EvalResult<any>, any>>(spec: S, constraints: Array<SpecConstraint<VerifiedType<S>>>): Spec<EvalResultOf<S>, LocalOptionsOf<S>> => {
    return {
        definition: {
            ...removeAlias(spec.definition),
            constraints: [...(spec.definition.constraints || []), ...constraints.map(c => c.definition)]
        },
        eval: (value: unknown, options: SpecOptions<LocalOptionsOf<S>>): EvalResultOf<S> => {
            const candidateResult = spec.eval(value, options);
            if (!candidateResult.err) {
                for (let c of constraints) {
                    const { err } = c.eval(candidateResult.value);
                    if (err) {
                        return { err };
                    }
                }
            }
            return candidateResult;
        }
    };
};


export const optional = <S extends Spec<EvalResult<any>, any>>(spec: S, options?: { defaultValue?: VerifiedType<S> }): Spec<EvalResultOf<S>, LocalOptionsOf<S>> & { optional: true } => {
    const defaultValue = options && "defaultValue" in options ? { defaultValue: options.defaultValue } : {};
    return {
        definition: {
            ...spec.definition,
            flags: [...(spec.definition.flags || []), "optional"],
            ...defaultValue
        },
        eval: spec.eval,
        optional: true as true,
        ...defaultValue
    };
};


export const adjust = <S extends Spec<EvalResult<any>, any>>(spec: S, adjustedOptions: LocalOptionsOf<S>): Spec<EvalResultOf<S>, LocalOptionsOf<S>> => {
    return {
        definition: {
            ...removeAlias(spec.definition),
            adjustments: { ...adjustedOptions, ...spec.definition.adjustments }
        },
        eval: (value: unknown, options: SpecOptions<LocalOptionsOf<S>>) => {
            return spec.eval(value, { local: { ...adjustedOptions, ...options.local }, global: options.global });
        }
    };
};


export const definitionOf = <S extends Spec<EvalResult<any>, any>>(spec: S) => {
    return spec.definition;
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


export const either = <
    R1 extends EvalResult<any>, 
    R2 extends EvalResult<any>, 
    R3 extends EvalResult<any> = never,
    R4 extends EvalResult<any> = never,
    R5 extends EvalResult<any> = never,
    R6 extends EvalResult<any> = never,
    R7 extends EvalResult<any> = never,
    R8 extends EvalResult<any> = never,
    R9 extends EvalResult<any> = never
    >(
        spec1: Spec<R1, {}>,
        spec2: Spec<R2, {}>,
        spec3?: Spec<R3, {}>,
        spec4?: Spec<R4, {}>,
        spec5?: Spec<R5, {}>,
        spec6?: Spec<R6, {}>,
        spec7?: Spec<R7, {}>,
        spec8?: Spec<R8, {}>,
        spec9?: Spec<R9, {}>
    ) => {
    const nested = {
        1: spec1.definition,
        2: spec2.definition
    };
    if (spec3) { nested[3] = spec3.definition; }
    if (spec4) { nested[4] = spec4.definition; }
    if (spec5) { nested[5] = spec5.definition; }
    if (spec6) { nested[6] = spec6.definition; }
    if (spec7) { nested[7] = spec7.definition; }
    if (spec8) { nested[8] = spec8.definition; }
    if (spec9) { nested[9] = spec9.definition; }
    return {
        definition: {
            type: "either",
            nested
        },
        eval: (value: unknown, options: SpecOptions): R1| R2| R3| R4| R5| R6| R7| R8| R9 | EvalResultFailure => {
            const validationErrors: ValidationFailure[] = [];

            const resultSpec1 = spec1.eval(value, { global: options.global });
            if (resultSpec1.err) { validationErrors.push(resultSpec1.err); } else { return resultSpec1; }

            const resultSpec2 = spec2.eval(value, { global: options.global });
            if (resultSpec2.err) { validationErrors.push(resultSpec2.err); } else { return resultSpec2; }

            if (spec3) {
                const resultSpec3 = spec3.eval(value, { global: options.global });
                if (resultSpec3.err) { validationErrors.push(resultSpec3.err); } else { return resultSpec3; }
            }

            if (spec4) {
                const resultSpec4 = spec4.eval(value, { global: options.global });
                if (resultSpec4.err) { validationErrors.push(resultSpec4.err); } else { return resultSpec4; }
            }

            if (spec5) {
                const resultSpec5 = spec5.eval(value, { global: options.global });
                if (resultSpec5.err) { validationErrors.push(resultSpec5.err); } else { return resultSpec5; }
            }

            if (spec6) {
                const resultSpec6 = spec6.eval(value, { global: options.global });
                if (resultSpec6.err) { validationErrors.push(resultSpec6.err); } else { return resultSpec6; }
            }

            if (spec7) {
                const resultSpec7 = spec7.eval(value, { global: options.global });
                if (resultSpec7.err) { validationErrors.push(resultSpec7.err); } else { return resultSpec7; }
            }

            if (spec8) {
                const resultSpec8 = spec8.eval(value, { global: options.global });
                if (resultSpec8.err) { validationErrors.push(resultSpec8.err); } else { return resultSpec8; }
            }

            if (spec9) {
                const resultSpec9 = spec9.eval(value, { global: options.global });
                if (resultSpec9.err) { validationErrors.push(resultSpec9.err); } else { return resultSpec9; }
            }

            return { err: {
                code: "either.no_matching_spec",
                value,
                message: "Evaluation of value failed for every possible spec.",
                nestedErrors: validationErrors
            } };
        }
    };
};

