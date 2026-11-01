import { Children, type ReactNode } from "react";
import { Text } from "react-native";

/**
 * React Native only styles text inside <Text>, so components that take strings as children
 * (Button, Badge, Hint) wrap them with their label classes. Elements pass through untouched.
 */
export function wrapText(children: ReactNode, className: string): ReactNode {
  return Children.map(children, (child) =>
    typeof child === "string" || typeof child === "number" ? <Text className={className}>{child}</Text> : child,
  );
}
