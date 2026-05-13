export const createKeyboardExecutionHandler = (
  fn?: React.ReactEventHandler,
) => {
  const handler: React.KeyboardEventHandler = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fn?.(event);
    }
  };

  return handler;
};
