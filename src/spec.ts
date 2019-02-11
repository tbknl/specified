import {ValidationError} from "./validation_error";


export interface GlobalOptions {
    readonly failEarly?: boolean;
}

export interface SpecOptions<LocalOptions extends {} = {}> {
    readonly local?: LocalOptions;
    readonly global: GlobalOptions;
}

export interface SpecConstraint<T> {
    readonly eval: (value: T) => void;
    readonly tag: string;
}

export interface Spec<T, LocalOpts extends {} = {}> {
    readonly eval: (value: unknown, options: SpecOptions<LocalOpts>) => T;
    readonly tag: string;
}

export type VerifiedType<S extends Spec<any, any>> = ReturnType<S["eval"]>;


interface OptionalSpec extends Spec<any, any> { optional: true; }
interface NonOptionalSpec extends Spec<any, any> { optional?: false; }

type NonOptionalAttributes<S> = {
    [A in keyof S]: S[A] extends { optional: true } ? never : A;
};

type OptionalAttributes<S> = {
    [A in keyof S]: S[A] extends { optional: true } ? A : never;
};

type NonOptSchema<S> = Pick<S, NonOptionalAttributes<S>[keyof S]>;
type OptSchema<S> = Pick<S, OptionalAttributes<S>[keyof S]>;

export interface Schema {
    [attr: string]: OptionalSpec | NonOptionalSpec;
}

export type Model<S extends Schema> = {
    [P in keyof NonOptSchema<S>]: S[P] extends NonOptionalSpec ? ReturnType<S[P]["eval"]> : never;
} & {
    [P in keyof OptSchema<S>]?: S[P] extends OptionalSpec ? ReturnType<S[P]["eval"]> : never;
};


interface VerifyResult<T> {
    readonly err: ValidationError | null;
    readonly value: () => T;
}

export const verify = <T>(spec: Spec<T, {}>, value: unknown, globalOptions: GlobalOptions = {}): VerifyResult<T> => {
    try {
        const result = spec.eval(value, { global: globalOptions });
        return {
            err: null,
            value: () => result
        };
    }
    catch (err) {
        if (err instanceof ValidationError) {
            const validationError = err;
            return {
                err: validationError,
                value: (): T => { throw validationError; }
            };
        }
        throw err;
    }
};


export const constrain = <T, LocalOpts extends {}>(spec: Spec<T, LocalOpts>, constraints: Array<SpecConstraint<T>>) => {
    return {
        tag: `constrain(${constraints.map(c => c.tag).join(",")})[${spec.tag}]`,
        eval: (value: unknown, options: SpecOptions<LocalOpts>) => {
            const candidateResult = spec.eval(value, options);
            constraints.forEach(c => c.eval(candidateResult));
            return candidateResult;
        }
    };
};

export const optional = <T, LocalOpts extends {}>(spec: Spec<T, LocalOpts>) => {
    return {
        tag: `optional[${spec.tag}]`,
        eval: spec.eval,
        optional: true as true
    };
};


export const adjust = <T, LocalOpts extends {}>(spec: Spec<T, LocalOpts>, adjustedOptions: LocalOpts): Spec<T, LocalOpts> => {
    return {
        tag: `adjusted[${spec.tag}]`,
        eval: (value: unknown, options: SpecOptions<LocalOpts>) => {
            return spec.eval(value, { local: { ...adjustedOptions, ...options.local }, global: options.global });
        }
    };
};


export const either = <T1, T2, T3 = never, T4 = never, T5 = never, T6 = never, T7 = never, T8 = never, T9 = never>(
        spec1: Spec<T1, {}>,
        spec2: Spec<T2, {}>,
        spec3?: Spec<T3, {}>,
        spec4?: Spec<T4, {}>,
        spec5?: Spec<T5, {}>,
        spec6?: Spec<T6, {}>,
        spec7?: Spec<T7, {}>,
        spec8?: Spec<T8, {}>,
        spec9?: Spec<T9, {}>
    ) => {
    return {
        tag: "either",
        eval: (value: unknown, options: SpecOptions): T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9  => {
            const validationErrors: ValidationError[] = [];

            const resultSpec1 = verify(spec1, value, options.global);
            if (resultSpec1.err) { validationErrors.push(resultSpec1.err); } else { return resultSpec1.value(); }

            const resultSpec2 = verify(spec2, value, options.global);
            if (resultSpec2.err) { validationErrors.push(resultSpec2.err); } else { return resultSpec2.value(); }

            if (spec3) {
                const resultSpec3 = verify(spec3, value, options.global);
                if (resultSpec3.err) { validationErrors.push(resultSpec3.err); } else { return resultSpec3.value(); }
            }

            if (spec4) {
                const resultSpec4 = verify(spec4, value, options.global);
                if (resultSpec4.err) { validationErrors.push(resultSpec4.err); } else { return resultSpec4.value(); }
            }

            if (spec5) {
                const resultSpec5 = verify(spec5, value, options.global);
                if (resultSpec5.err) { validationErrors.push(resultSpec5.err); } else { return resultSpec5.value(); }
            }

            if (spec6) {
                const resultSpec6 = verify(spec6, value, options.global);
                if (resultSpec6.err) { validationErrors.push(resultSpec6.err); } else { return resultSpec6.value(); }
            }

            if (spec7) {
                const resultSpec7 = verify(spec7, value, options.global);
                if (resultSpec7.err) { validationErrors.push(resultSpec7.err); } else { return resultSpec7.value(); }
            }

            if (spec8) {
                const resultSpec8 = verify(spec8, value, options.global);
                if (resultSpec8.err) { validationErrors.push(resultSpec8.err); } else { return resultSpec8.value(); }
            }

            if (spec9) {
                const resultSpec9 = verify(spec9, value, options.global);
                if (resultSpec9.err) { validationErrors.push(resultSpec9.err); } else { return resultSpec9.value(); }
            }

            throw new ValidationError("Evaluation of value failed for every possible spec.", {
                nestedErrors: validationErrors
            });
        }
    };
};

