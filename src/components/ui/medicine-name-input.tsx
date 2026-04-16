"use client";

import React, { useState, useRef, useEffect, useCallback, useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { searchMedicineNames, buildMedicineSearchIndex } from "@/lib/medicine-names";

interface MedicineNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  inventoryNames?: string[];
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const MedicineNameInput = React.forwardRef<HTMLInputElement, MedicineNameInputProps>(
  function MedicineNameInput(
    {
      value,
      onChange,
      onBlur,
      name,
      inventoryNames = [],
      placeholder = "e.g., Paracetamol 500mg",
      className,
      id,
      disabled,
    },
    forwardedRef
  ) {
  // Issue 1: per-instance IDs so FieldArray rows never share the same DOM id
  const uid = useId();
  const listboxId = `ml${uid}suggestions`;
  const optionId = (idx: number) => `ml${uid}option${idx}`;

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Internal ref for focus management; forwarded ref is merged via callback
  const internalRef = useRef<HTMLInputElement>(null);
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [forwardedRef]
  );
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Issue 2: memoize normalized inventory set — O(1) lookup instead of O(n) per render
  const inventorySet = useMemo(
    () => new Set(inventoryNames.map(n => n.toLowerCase())),
    [inventoryNames]
  );

  // Issue 5: pre-build search index only when inventoryNames changes, not on every keystroke
  const searchIndex = useMemo(
    () => buildMedicineSearchIndex(inventoryNames),
    [inventoryNames]
  );

  const updateSuggestions = useCallback(
    (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      // Pass pre-built index to avoid rebuilding on every keystroke (Issue 5)
      const results = searchMedicineNames(query, [], 10, searchIndex);
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIndex(-1);
    },
    [searchIndex]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    updateSuggestions(val);
  };

  const selectSuggestion = (suggestedName: string) => {
    onChange(suggestedName);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    internalRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Highlight the matched portion of a suggestion
  const highlight = (name: string, query: string) => {
    const idx = name.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{name}</span>;
    return (
      <>
        {name.slice(0, idx)}
        <span className="font-semibold text-foreground">{name.slice(idx, idx + query.length)}</span>
        {name.slice(idx + query.length)}
      </>
    );
  };

  // Issue 2: O(1) Set lookup instead of linear .some() scan on every render
  const isFromInventory = (n: string) => inventorySet.has(n.toLowerCase());

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={setInputRef}
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        onFocus={() => value.length >= 2 && updateSuggestions(value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
          className
        )}
      />

      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-md text-sm"
        >
          {suggestions.map((suggestedName, idx) => (
            <li
              key={suggestedName}
              id={optionId(idx)}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(suggestedName);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                "flex items-center justify-between px-3 py-2 cursor-pointer text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                idx === activeIndex && "bg-accent text-accent-foreground"
              )}
            >
              <span>{highlight(suggestedName, value)}</span>
              {isFromInventory(suggestedName) && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 flex-shrink-0">
                  In Stock
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
