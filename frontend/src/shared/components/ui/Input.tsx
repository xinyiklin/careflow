import { forwardRef } from "react";

import type { ComponentPropsWithoutRef, ForwardedRef, ReactNode } from "react";

type InputBaseProps = {
  className?: string;
  children?: ReactNode;
};

type InputProps =
  | ({ as?: "input" } & InputBaseProps & ComponentPropsWithoutRef<"input">)
  | ({ as: "textarea" } & InputBaseProps & ComponentPropsWithoutRef<"textarea">)
  | ({ as: "select" } & InputBaseProps & ComponentPropsWithoutRef<"select">);

type InputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function inputClassName({
  className = "",
  isTextarea = false,
  isDateLikeInput = false,
}: {
  className?: string;
  isTextarea?: boolean;
  isDateLikeInput?: boolean;
}) {
  return [
    "w-full rounded-xl border border-cf-border-strong bg-cf-surface",
    "px-3 py-2.5 text-sm text-cf-text shadow-sm outline-none transition",
    "focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/20",
    "disabled:cursor-not-allowed disabled:opacity-50",
    isTextarea ? "resize-y" : "",
    isDateLikeInput
      ? "[color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
      : "",
    className,
  ].join(" ");
}

const Input = forwardRef<InputElement, InputProps>(function Input(props, ref) {
  const { as: Tag = "input", className = "", children, ...restProps } = props;

  if (Tag === "textarea") {
    return (
      <textarea
        ref={ref as ForwardedRef<HTMLTextAreaElement>}
        className={inputClassName({ className, isTextarea: true })}
        {...(restProps as ComponentPropsWithoutRef<"textarea">)}
      >
        {children}
      </textarea>
    );
  }

  if (Tag === "select") {
    return (
      <select
        ref={ref as ForwardedRef<HTMLSelectElement>}
        className={inputClassName({ className })}
        {...(restProps as ComponentPropsWithoutRef<"select">)}
      >
        {children}
      </select>
    );
  }

  const inputProps = restProps as ComponentPropsWithoutRef<"input">;
  const isDateLikeInput =
    typeof inputProps.type === "string" &&
    ["date", "time", "datetime-local"].includes(inputProps.type);

  return (
    <input
      ref={ref as ForwardedRef<HTMLInputElement>}
      className={inputClassName({ className, isDateLikeInput })}
      {...inputProps}
    />
  );
});

export default Input;
