import { forwardRef, type InputHTMLAttributes } from "react";
import { SearchIcon } from "../../icons/icons";
import { cn } from "../../lib/class-names";

export const SearchField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function SearchField({ className, placeholder = "Search", ...props }, ref) {
    return (
      <label
        className={cn(
          "control-field flex items-center gap-2 rounded-lg px-2.5 py-2 text-subheadline text-label-tertiary",
          className,
        )}
      >
        <SearchIcon size={15} strokeWidth={2} />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className="min-w-0 grow bg-transparent text-label outline-none placeholder:text-label-tertiary"
          {...props}
        />
      </label>
    );
  },
);
