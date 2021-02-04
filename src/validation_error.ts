type ValidationErrorKey = string | number;

interface ValidationErrorJsonReport {
    msg?: string;
    code?: string;
    value?: unknown;
    allowed?: unknown;
    key?: ValidationErrorKey;
    nested?: ValidationErrorJsonReport[];
}

type ValidationErrorPathList = Array<{
    path: ValidationErrorKey[];
    msg?: string;
    code?: string;
    value?: unknown;
    allowed?: unknown;
}>;

export interface ValidationFailure {
    code: string;
    value: unknown;
    allowed?: unknown;
    message: string;
    key?: ValidationErrorKey;
    nestedErrors?: ValidationFailure[];
}

export class ValidationError implements ValidationFailure {
    public readonly nestedErrors: ValidationError[];
    public readonly message: string;
    public readonly code: string;
    public readonly value: unknown;
    public readonly allowed: unknown;
    public readonly key: ValidationErrorKey | undefined;

    public constructor(message: string, options?: ValidationFailure) {
        this.key = options ? options.key : undefined;
        this.message = message;
        this.code = options ? options.code : "";
        this.value = options ? options.value : undefined;
        this.allowed = options ? options.allowed : undefined;
        this.nestedErrors = options && options.nestedErrors ? options.nestedErrors.map(ne => new ValidationError(ne.message, ne)) : [];
    }

    // DEPRECATED
    public getKey() {
        return this.key;
    }

    // DEPRECATED
    public getNestedErrors() {
        return this.nestedErrors;
    }

    // DEPRECATED
    public generateReportJson(): ValidationErrorJsonReport {
        return FormatValidationFailure.generateReportJson(this);
    }

    // DEPRECATED
    public generateErrorPathList() {
        return FormatValidationFailure.generateErrorPathList(this);
    }

    public toString() {
        return `ValidationError: ${this.message}`;
    }
}

interface ErrorReportOptions {
    include?: { message?: boolean; code?: boolean; value?: boolean; allowed?: boolean; };
}

interface ErrorReportOptionsImpl {
    include: { message: boolean; code: boolean; value: boolean; allowed: boolean; };
}

export const FormatValidationFailure = (() => {
    const generateReportJsonImpl = (err: ValidationFailure, options: ErrorReportOptionsImpl): ValidationErrorJsonReport => {
        const keyProp = typeof err.key === "undefined" ? {} : { key: err.key };
        const nestedProp = err.nestedErrors ? { nested: err.nestedErrors.map(ve => generateReportJsonImpl(ve, options)) } : {};
        return {
            ...(options.include.message && { msg: err.message }),
            ...(options.include.code && { code: err.code }),
            ...(options.include.value && { value: err.value }),
            ...(options.include.allowed && { allowed: err.allowed }),
            ...keyProp,
            ...nestedProp
        };
    };

    const generateErrorPathListImpl = (err: ValidationFailure, options: ErrorReportOptionsImpl): ValidationErrorPathList => {
        const pathKey = typeof err.key !== "undefined" ? [err.key] : [];
        if (err.nestedErrors) {
            return err.nestedErrors.reduce((acc, ne) => acc.concat(generateErrorPathListImpl(ne, options).map(nep => ({
                path: pathKey.concat(nep.path),
                ...(options.include.message && { msg: nep.msg }),
                ...(options.include.code && { code: nep.code }),
                ...(options.include.value && { value: nep.value }),
                ...(options.include.allowed && { allowed: nep.allowed })
            }))), [] as ValidationErrorPathList);
        }
        else {
            return [{
                path: pathKey,
                ...(options.include.message && { msg: err.message }),
                ...(options.include.code && { code: err.code }),
                ...(options.include.value && { value: err.value }),
                ...(options.include.allowed && { allowed: err.allowed })
            }];
        }
    };

    return {
        generateReportJson(err: ValidationFailure, options?: ErrorReportOptions): ValidationErrorJsonReport {
            const optionsImpl = {
                include: {
                    message: !options || !options.include || !options.include.hasOwnProperty("message") || options.include.message || false,
                    code: options && options.include && options.include.code || false,
                    value: options && options.include && options.include.value || false,
                    allowed: options && options.include && options.include.allowed || false
                }
            };
            return generateReportJsonImpl(err, optionsImpl);
        },
        generateErrorPathList(err: ValidationFailure, options?: ErrorReportOptions) {
            const optionsImpl = {
                include: {
                    message: !options || !options.include || !options.include.hasOwnProperty("message") || options.include.message || false,
                    code: options && options.include && options.include.code || false,
                    value: options && options.include && options.include.value || false,
                    allowed: options && options.include && options.include.allowed || false
                }
            };
            return generateErrorPathListImpl(err, optionsImpl);
        }
    };
})();
