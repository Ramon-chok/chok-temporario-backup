import { Listbox } from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export function CustomSelect({ value, onChange, options, placeholder, className }: CustomSelectProps) {
  const selected = options.find((opt) => opt.value === value) || null;

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className || ''}`}>
        <Listbox.Button className="saas-filter-control mt-2 flex w-full items-center justify-between px-3 py-2 text-sm">
          <span className={`${selected ? 'text-[var(--foreground)]' : 'text-[var(--text-muted)]/80'}`}>
            {selected ? selected.label : placeholder || 'Selecione'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
        </Listbox.Button>
        <Listbox.Options className="saas-filter-listbox-options absolute z-50 mt-1 max-h-60 w-full overflow-auto py-1 ring-1 ring-black/10 focus:outline-none">
          {options.map((option) => (
            <Listbox.Option
              key={option.value}
              value={option.value}
              className={({ active }) =>
                `saas-filter-listbox-option relative cursor-pointer select-none py-2 pl-10 pr-4 text-sm ${
                  active ? 'saas-filter-listbox-option-active' : ''
                }`
              }
            >
              {({ selected }) => (
                <>
                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{option.label}</span>
                  {selected ? (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#b480ff]">
                      <Check className="w-4 h-4" />
                    </span>
                  ) : null}
                </>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
}
