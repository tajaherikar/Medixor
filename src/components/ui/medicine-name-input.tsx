"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { searchMedicineNames } from "@/lib/medicine-names";

interface MedicineNameInputProps {
  value: string;
  onChange: (value: string) => void;
  inventoryNames?: string[];
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function MedicineNameInput({
  value,
  onChange,
  inventoryNames = [],
  placeholder = "e.g., Paracetamol 500mg",
  className,
  id,
  disabled,
}: MedicineNameInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSuggestions = useCallback(
    (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const results = searchMedicineNames(query, inventoryNames, 10);
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIndex(-1);
    },
    [inventoryNames]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    updateSuggestions(val);
  };

  const selectSuggestion = (name: string) => {
    onChange(name);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
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

  // Check if name came from existing inventory (show badge)
  const isFromInventory = (name: string) =>
    inventoryNames.some(n => n.toLowerCase() === name.toLowerCase());

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 2 && updateSuggestions(value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="medicine-suggestions"
        aria-activedescendant={activeIndex >= 0 ? `medicine-suggestion-${activeIndex}` : undefined}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
          className
        )}
      />

      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id="medicine-suggestions"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-md text-sm"
        >
          {suggestions.map((name, idx) => (
            <li
              key={name}
              id={`medicine-suggestion-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(name);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                "flex items-center justify-between px-3 py-2 cursor-pointer text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                idx === activeIndex && "bg-accent text-accent-foreground"
              )}
            >
              <span>{highlight(name, value)}</span>
              {isFromInventory(name) && (
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
}
