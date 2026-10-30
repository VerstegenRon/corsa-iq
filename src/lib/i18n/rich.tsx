import { Fragment, type ReactNode } from "react";

/** A dictionary text whose {placeholders} are filled with elements, such as a bold time inside a sentence. */
export function richFormat(template: string, values: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{key !== undefined && key in values ? values[key] : part}</Fragment>;
  });
}
