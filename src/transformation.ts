type Constructor<A extends any[], R> = new (...args: A) => R;

// TODO: tests!

//const instantiateWithSingleArg = <A, T>(ctor: new (arg: A) => T) => (value: A): { err: null, value: T } => ({ err: null, value: new ctor(value) });
const instantiateWithSingleArg = <A, T>(ctor: Constructor<[A], T>) => (value: A): { err: null, value: T } => ({ err: null, value: new ctor(value) });

//const instantiateWithMultipleArgs = <T, Ctor extends new (...args: any[]) => T>(ctor: Ctor) => (value: ConstructorParameters<Ctor>) => ({ err: null, value: new ctor(...value) });
const instantiateWithMultipleArgs = <A extends any[], T>(ctor: Constructor<A, T>) => (value: A) => ({ err: null, value: new ctor(...value) });

const isoDateTimeUtc = (value: string) => {
    const date = new Date(value);
    if (date.toISOString() !== value) {
        return { err: {
            code: "transform.isoDateTime",
            value,
            message: "Not a valid ISO UTC date-time string.",
            allowed: "YYYY-MM-DDThh::mm::ss.uuuZ"
        } };
    }
    else {
        return date;
    }
};

export const Transformation = {
    instantiateWithSingleArg,
    instantiateWithMultipleArgs,
    isoDateTimeUtc
};

