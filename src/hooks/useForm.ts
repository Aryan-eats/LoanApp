import { useState, useCallback } from 'react';
import type { ChangeEvent, FocusEvent, FormEvent } from 'react';

type ValidationRule<T> = {
  validate: (value: unknown, formValues: T) => boolean;
  message: string;
};

type FieldValidation<T> = ValidationRule<T>[];

type FormErrors<T> = Partial<Record<keyof T, string>>;
type FormTouched<T> = Partial<Record<keyof T, boolean>>;

interface UseFormOptions<T> {
  initialValues: T;
  validations?: Partial<Record<keyof T, FieldValidation<T>>>;
  onSubmit?: (values: T) => void | Promise<void>;
}

interface UseFormReturn<T> {
  values: T;
  errors: FormErrors<T>;
  touched: FormTouched<T>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  setFieldValue: (field: keyof T, value: unknown) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched?: boolean) => void;
  resetForm: () => void;
  validateField: (field: keyof T) => string | null;
  validateForm: () => boolean;
}

export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { initialValues, validations = {}, onSubmit } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<FormTouched<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  const validateField = useCallback((field: keyof T): string | null => {
    const fieldValidations = (validations as Partial<Record<keyof T, FieldValidation<T>>>)[field];
    if (!fieldValidations) return null;

    for (const rule of fieldValidations) {
      if (!rule.validate(values[field], values)) {
        return rule.message;
      }
    }
    return null;
  }, [values, validations]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors<T> = {};
    let isValid = true;

    for (const field of Object.keys(validations) as Array<keyof T>) {
      const error = validateField(field);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [validations, validateField]);

  const isValid = hasValidated && Object.keys(errors).length === 0;

  const handleChange = useCallback((
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({ ...prev, [name]: newValue }));
    
    if (errors[name as keyof T]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name as keyof T];
        return next;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((
    e: FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const { name } = target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setHasValidated(true);
    
    const error = validateField(name as keyof T);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    const allTouched = Object.keys(initialValues).reduce((acc, key) => {
      acc[key as keyof T] = true;
      return acc;
    }, {} as FormTouched<T>);
    setTouched(allTouched);
    setHasValidated(true);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit?.(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, initialValues, validateForm, onSubmit]);

  const setFieldValue = useCallback((field: keyof T, value: unknown) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
    validateField,
    validateForm,
  };
}

export default useForm;
