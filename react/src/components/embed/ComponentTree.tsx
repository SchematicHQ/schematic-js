import { useEffect, useState } from "react";
import { useEmbed } from "../../hooks";
import { createRenderer } from "./renderer";

export const ComponentTree = () => {
  const [children, setChildren] = useState<React.ReactNode>("Loading");

  const { error, nodes } = useEmbed();

  useEffect(() => {
    const renderer = createRenderer();
    setChildren(nodes.map(renderer));
  }, [nodes]);

  if (error) {
    return <div>{error.message}</div>;
  }

  return <>{children}</>;
};
