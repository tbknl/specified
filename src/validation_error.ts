type ValidationErrorKey = string | number;

interface ValidationErrorJsonReport {
    msg: string;
    key?: ValidationErrorKey;
    nested?: ValidationErrorJsonReport[];
}


export class ValidationError {
    private readonly key: ValidationErrorKey | undefined;
    private readonly nestedErrors: ValidationError[];
    public readonly message: string;

    public constructor(message: string, options?: { key?: ValidationErrorKey, nestedErrors?: ValidationError[] }) {
        this.key = options ? options.key : undefined;
        this.message = message;
        this.nestedErrors = options && options.nestedErrors || [];
    }

    public getKey() {
        return this.key;
    }

    public getNestedErrors() {
        return this.nestedErrors;
    }

    public generateReportJson(): ValidationErrorJsonReport {
        const keyProp = typeof this.key === "undefined" ? {} : { key: this.key };
        const nestedProp = this.nestedErrors.length ? { nested: this.nestedErrors.map(ve => ve.generateReportJson()) } : {};
        return {
            msg: this.message,
            ...keyProp,
            ...nestedProp
        };
    }

    public generateErrorPathList() {
        const errorPathList: { path: ValidationErrorKey[], msg: string }[] = [];
        const pathKey = typeof this.key !== "undefined" ? [this.key] : [];
        if (this.nestedErrors.length) {
            this.nestedErrors.forEach(ne => {
                errorPathList.push(...ne.generateErrorPathList().map(nep => {
                    return { path: pathKey.concat(nep.path), msg: nep.msg };
                }));
            });
        }
        else {
            errorPathList.push({ path: pathKey, msg: this.message });
        }
        return errorPathList;
    }

    public toString() {
        return `ValidationError: ${this.message}`;
    }
}

