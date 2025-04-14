import { useContext } from "react";

import { ComponentContext } from "../context";

export const useComponent = () => useContext(ComponentContext);
