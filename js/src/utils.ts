import { Keys, SchematicContext } from "./types";

export function contextString(context: SchematicContext): string {
  const sortedContext = Object.keys(context).reduce((acc, key) => {
    const sortedKeys = Object.keys(
      context[key as keyof SchematicContext] || {},
    ).sort();
    const sortedObj = sortedKeys.reduce((obj, sortedKey) => {
      obj[sortedKey] = context[key as keyof SchematicContext]![sortedKey];
      return obj;
    }, {} as Keys);
    acc[key as keyof SchematicContext] = sortedObj;
    return acc;
  }, {} as SchematicContext);

  return JSON.stringify(sortedContext);
}
