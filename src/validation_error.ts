type ValidationErrorKey = string | number;

interface ValidationErrorJsonReport {
    msg: string;
    key?: ValidationErrorKey;
    nested?: ValidationErrorJsonReport[];
}


interface ValidationFailure {
    code: string;
    value: unknown;
    message: string;
    key?: string | number;
    nestedErrors?: ValidationFailure[];
}

export class ValidationError implements ValidationFailure {
    public readonly nestedErrors: ValidationError[];
    public readonly message: string;
    public readonly code: string;
    public readonly value: unknown;
    public readonly key: ValidationErrorKey | undefined;

    public constructor(message: string, options?: ValidationFailure) {
        this.key = options ? options.key : undefined;
        this.message = message;
        this.code = options ? options.code : "";
        this.value = options ? options.value : undefined;
        this.nestedErrors = options && options.nestedErrors ? options.nestedErrors.map(ne => new ValidationError(ne.message, ne)) : [];
    }

    public getKey() {
        return this.key;
    }

    public getNestedErrors() {
        return this.nestedErrors;
    }

    public generateReportJson(): ValidationErrorJsonReport {
        return FormatValidationError.generateReportJson(this);
    }

    public generateErrorPathList() {
        return FormatValidationError.generateErrorPathList(this);
    }

    public toString() {
        return `ValidationError: ${this.message}`;
    }
}

export const FormatValidationError = {
    generateReportJson(err: ValidationFailure): ValidationErrorJsonReport {
        const keyProp = typeof err.key === "undefined" ? {} : { key: err.key };
        const nestedProp = err.nestedErrors ? { nested: err.nestedErrors.map(ve => this.generateReportJson(ve)) } : {};
        return {
            msg: err.message,
            ...keyProp,
            ...nestedProp
        };
    },
    generateErrorPathList(err: ValidationFailure) {
        const errorPathList: { path: ValidationErrorKey[], msg: string }[] = [];
        const pathKey = typeof err.key !== "undefined" ? [err.key] : [];
        if (err.nestedErrors) {
            err.nestedErrors.forEach(ne => {
                errorPathList.push(...this.generateErrorPathList(ne).map(nep => {
                    return { path: pathKey.concat(nep.path), msg: nep.msg };
                }));
            });
        }
        else {
            errorPathList.push({ path: pathKey, msg: err.message });
        }
        return errorPathList;
    }
};
