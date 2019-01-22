interface ValidationErrorJsonReport {
    msg: string;
    key?: string | number;
    nested?: ValidationErrorJsonReport[];
}


export class ValidationError extends Error {
    private readonly key: string | number | undefined;
    private readonly nestedErrors: ValidationError[];

    public constructor(message: string, options?: { key?: string | number, nestedErrors?: ValidationError[] }) {
        super(message);
        this.key = options ? options.key : undefined;
        this.nestedErrors = options && options.nestedErrors || [];
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
}

