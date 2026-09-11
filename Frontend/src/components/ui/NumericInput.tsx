'use client';

import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string | undefined | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (numericValue: number, cleanString: string) => void;
  allowDecimal?: boolean;
}

export function formatNumberWithCommas(
  val: string | number | null | undefined,
  allowDecimal: boolean = false
): string {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).replace(/,/g, '').trim();
  if (str === '') return '';

  if (!allowDecimal) {
    const cleanDigits = str.replace(/\D/g, '');
    if (!cleanDigits) return '';
    const withoutLeading = cleanDigits.length > 1 ? cleanDigits.replace(/^0+/, '') || '0' : cleanDigits;
    return withoutLeading.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } else {
    const parts = str.split('.');
    const intDigits = parts[0].replace(/\D/g, '');
    const intFormatted = (intDigits.length > 1 ? intDigits.replace(/^0+/, '') || '0' : intDigits || '0')
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (parts.length > 1) {
      const decDigits = parts[1].replace(/\D/g, '').slice(0, 2);
      return `${intFormatted}.${decDigits}`;
    }
    return str.endsWith('.') ? `${intFormatted}.` : intFormatted;
  }
}

export function cleanNumericString(
  val: string | number | null | undefined,
  allowDecimal: boolean = false
): string {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).replace(/,/g, '').trim();
  if (!allowDecimal) {
    const clean = str.replace(/\D/g, '');
    return clean.length > 1 ? clean.replace(/^0+/, '') || '0' : clean;
  } else {
    const parts = str.split('.');
    const intPart = parts[0].replace(/\D/g, '');
    const cleanInt = intPart.length > 1 ? intPart.replace(/^0+/, '') || '0' : intPart || '0';
    if (parts.length > 1) {
      const decPart = parts[1].replace(/\D/g, '').slice(0, 2);
      return `${cleanInt}.${decPart}`;
    }
    return str.endsWith('.') ? `${cleanInt}.` : cleanInt;
  }
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      allowDecimal = false,
      placeholder,
      className,
      onKeyDown,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLInputElement | null>(null);
    const inputRef = (forwardedRef as React.RefObject<HTMLInputElement>) || internalRef;

    const [displayValue, setDisplayValue] = useState<string>(() =>
      formatNumberWithCommas(value, allowDecimal)
    );

    const cursorTargetRef = useRef<number | null>(null);
    const isFocusedRef = useRef(false);

    // Sync from props value
    useEffect(() => {
      const formatted = formatNumberWithCommas(value, allowDecimal);
      const currentClean = cleanNumericString(displayValue, allowDecimal);
      const nextClean = cleanNumericString(value, allowDecimal);

      // If input is focused and user cleared the input (empty string), do not force '0' from parent
      if (isFocusedRef.current && displayValue === '' && (nextClean === '0' || nextClean === '')) {
        return;
      }

      if (currentClean !== nextClean || (value === '' && displayValue !== '')) {
        setDisplayValue(formatted);
      }
    }, [value, allowDecimal]);

    // Restore cursor position after DOM updates
    useLayoutEffect(() => {
      if (cursorTargetRef.current !== null && inputRef.current) {
        const target = Math.min(cursorTargetRef.current, inputRef.current.value.length);
        inputRef.current.setSelectionRange(target, target);
        cursorTargetRef.current = null;
      }
    });

    const triggerChange = (
      cleanStr: string,
      originalEvent: React.ChangeEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>
    ) => {
      const numVal = cleanStr === '' ? 0 : Number(cleanStr) || 0;
      if (onValueChange) {
        onValueChange(numVal, cleanStr);
      }
      if (onChange) {
        const syntheticEvent = {
          ...originalEvent,
          target: {
            ...originalEvent.target,
            value: cleanStr,
            name: props.name || '',
          },
          currentTarget: {
            ...originalEvent.currentTarget,
            value: cleanStr,
            name: props.name || '',
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const rawValue = input.value;
      const cursorBefore = input.selectionStart || 0;

      // Count digits before cursor in raw input
      const digitsBefore = (rawValue.slice(0, cursorBefore).match(/\d/g) || []).length;

      const cleanStr = cleanNumericString(rawValue, allowDecimal);
      const formatted = formatNumberWithCommas(cleanStr, allowDecimal);

      // Find new cursor position
      let newCursor = 0;
      let digitsCounted = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) digitsCounted++;
        if (digitsCounted === digitsBefore) {
          newCursor = i + 1;
          break;
        }
      }
      if (digitsBefore === 0) newCursor = 0;
      if (digitsCounted < digitsBefore) newCursor = formatted.length;

      cursorTargetRef.current = newCursor;
      setDisplayValue(formatted);
      triggerChange(cleanStr, e);
    };

    const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        const input = e.currentTarget;
        const selStart = input.selectionStart;
        const selEnd = input.selectionEnd;

        // If cursor is right after a comma, backspace should delete the digit before the comma
        if (selStart !== null && selStart === selEnd && selStart > 1) {
          if (input.value[selStart - 1] === ',') {
            e.preventDefault();
            const before = input.value.slice(0, selStart - 2);
            const after = input.value.slice(selStart);
            const raw = cleanNumericString(before + after, allowDecimal);
            const formatted = formatNumberWithCommas(raw, allowDecimal);

            const digitsBefore = (before.match(/\d/g) || []).length;
            let newCursor = 0;
            let count = 0;
            for (let i = 0; i < formatted.length; i++) {
              if (/\d/.test(formatted[i])) count++;
              if (count === digitsBefore) {
                newCursor = i + 1;
                break;
              }
            }
            if (digitsBefore === 0) newCursor = 0;

            cursorTargetRef.current = newCursor;
            setDisplayValue(formatted);
            triggerChange(raw, e);
            return;
          }
        }
      }

      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    return (
      <input
        ref={inputRef}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={displayValue}
        placeholder={placeholder}
        className={className}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        onFocus={(e) => {
          isFocusedRef.current = true;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          isFocusedRef.current = false;
          // Sync formatted value on blur
          setDisplayValue(formatNumberWithCommas(value, allowDecimal));
          props.onBlur?.(e);
        }}
        {...props}
      />
    );
  }
);

NumericInput.displayName = 'NumericInput';
export default NumericInput;
