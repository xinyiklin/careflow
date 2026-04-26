import { forwardRef } from "react";

const Input = forwardRef(function Input(
  { as: Tag = "input", className = "", children, type, ...props },
  ref
) {
  const isDateLikeInput =
    Tag === "input" && ["date", "time", "datetime-local"].includes(type);

  return (
    <Tag
      ref={ref}
      type={type}
      className={[
        "w-full rounded-xl border border-cf-border-strong bg-cf-surface",
        "px-3 py-2.5 text-sm text-cf-text shadow-sm outline-none transition",
        "focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        Tag === "textarea" ? "resize-y" : "",
        isDateLikeInput
          ? "[color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
          : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
});

export default Input;
