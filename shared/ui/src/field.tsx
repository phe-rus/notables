import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn";
import { SearchIcon } from "./icons";

export const SearchField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function SearchField({ className, placeholder = "Search", ...props }, ref) {
    return (
      <label
        className={cn(
          "flex items-center gap-2 rounded-[10px] bg-fill px-2.5 py-2 text-[14px] text-label-tertiary focus-within:ring-2 focus-within:ring-accent/60",
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
