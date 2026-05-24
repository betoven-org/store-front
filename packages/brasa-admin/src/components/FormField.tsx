type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "textarea" | "select" | "file" | "checkbox";
  value?: string | boolean;
  onChange?: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  error?: string;
  required?: boolean;
  options?: SelectOption[];
  placeholder?: string;
  description?: string;
};

export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  required = false,
  options = [],
  placeholder,
  description,
}: Props) {
  const baseInputClasses =
    "w-full h-[34px] rounded-md border bg-card px-2.5 text-[13px] text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-muted-foreground";
  const borderClass = error ? "border-destructive/30" : "border-border";

  const inputId = `field-${name}`;
  const errorId = `error-${name}`;
  const descId = `desc-${name}`;

  const ariaProps = {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": [error && errorId, description && descId]
      .filter(Boolean)
      .join(" ") || undefined,
  };

  const renderInput = () => {
    if (type === "textarea") {
      return (
        <textarea
          id={inputId}
          name={name}
          value={value as string}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={4}
          className={`${baseInputClasses} ${borderClass} h-auto min-h-[120px] py-2.5 resize-y`}
          {...ariaProps}
        />
      );
    }

    if (type === "select") {
      return (
        <select
          id={inputId}
          name={name}
          value={value as string}
          onChange={onChange}
          required={required}
          className={`${baseInputClasses} ${borderClass}`}
          {...ariaProps}
        >
          <option value="">{placeholder || "Selecione..."}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === "checkbox") {
      return (
        <div className="flex items-center gap-2">
          <input
            id={inputId}
            name={name}
            type="checkbox"
            checked={value as boolean}
            onChange={onChange}
            className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            {...ariaProps}
          />
          <label htmlFor={inputId} className="text-sm text-foreground">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </label>
        </div>
      );
    }

    if (type === "file") {
      return (
        <input
          id={inputId}
          name={name}
          type="file"
          onChange={onChange}
          required={required}
          className={`${baseInputClasses} ${borderClass} file:mr-3 file:rounded file:border-0 file:bg-foreground file:px-3 file:py-1 file:text-sm file:font-medium file:text-background hover:file:bg-foreground/90`}
          {...ariaProps}
        />
      );
    }

    return (
      <input
        id={inputId}
        name={name}
        type={type}
        value={value as string}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`${baseInputClasses} ${borderClass}`}
        {...ariaProps}
      />
    );
  };

  // Checkbox has its own label rendering
  if (type === "checkbox") {
    return (
      <div className="space-y-1">
        {renderInput()}
        {description && (
          <p id={descId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {renderInput()}
      {description && (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
