import { merge } from "lodash";

import { type RecursivePartial } from "../../types";
import {
  type ComponentState,
  type EmbedLayout,
  type EmbedMode,
  type EmbedSelected,
  type EmbedSettings,
} from "./componentState";

export type ComponentAction =
  | { type: "UPDATE_SETTINGS"; settings: RecursivePartial<EmbedSettings> }
  | { type: "CHANGE_LAYOUT"; layout: EmbedLayout }
  | { type: "CHANGE_MODE"; mode: EmbedMode }
  | { type: "SET_SELECTED"; selected: EmbedSelected };

export const reducer = (
  state: ComponentState,
  action: ComponentAction,
): ComponentState => {
  switch (action.type) {
    case "UPDATE_SETTINGS": {
      const settings = merge({}, state.settings, action.settings);
      return {
        ...state,
        settings,
      };
    }

    case "CHANGE_LAYOUT":
      return {
        ...state,
        layout: action.layout,
      };

    case "CHANGE_MODE":
      return {
        ...state,
        mode: action.mode,
      };

    case "SET_SELECTED":
      return {
        ...state,
        selected: action.selected,
      };
  }
};
