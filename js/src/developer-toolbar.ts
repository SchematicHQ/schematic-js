import { CheckFlagReturn } from "./types";

interface DeveloperToolbarDependencies {
  getAllFlags: () => Record<string, CheckFlagReturn>;
  getFlagValue: (flagKey: string) => boolean | undefined;
  addFlagValueListener: (flagKey: string, listener: (value: boolean) => void) => () => void;
  notifyFlagCheckListeners: (flagKey: string, check: CheckFlagReturn) => void;
  notifyFlagValueListeners: (flagKey: string, value: boolean) => void;
  getFlagCheck: (flagKey: string) => CheckFlagReturn | undefined;
}

interface ToolbarState {
  selectedFlagKey: string | null;
  availableFlagKeys: string[];
  flagValue: boolean | null; 
}

function createElement<T extends keyof HTMLElementTagNameMap>(
  tag: T,
  styles?: Partial<CSSStyleDeclaration> | string,
  textContent?: string,
): HTMLElementTagNameMap[T] {
  const element = document.createElement(tag);
  if (typeof styles === "string") {
    element.style.cssText = styles;
  } else if (styles) {
    Object.assign(element.style, styles);
  }
  if (textContent !== undefined) {
    element.textContent = textContent;
  }
  return element;
}

const BUTTON_STYLES = {
  disabled: {
    background: "rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.5)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    cursor: "not-allowed",
  },
  enabled: {
    true: {
      background: "rgba(255, 107, 53, 0.15)",
      borderColor: "rgba(255, 107, 53, 0.4)",
    },
    false: {
      background: "rgba(255, 107, 53, 0.2)",
      borderColor: "rgba(255, 107, 53, 0.5)",
    },
    hover: {
      true: {
        background: "rgba(255, 107, 53, 0.25)",
        borderColor: "rgba(255, 107, 53, 0.6)",
      },
      false: {
        background: "rgba(255, 107, 53, 0.3)",
        borderColor: "rgba(255, 107, 53, 0.6)",
      },
    },
  },
} as const;

export class DeveloperToolbar {
  private element: HTMLElement | null = null;
  private select: HTMLSelectElement | null = null;
  private toggle: HTMLButtonElement | null = null;
  private valueLabel: HTMLElement | null = null;
  private flagListeners: Array<() => void> = [];
  private manualOverrides: Record<string, CheckFlagReturn> = {};
  private getAllFlags: () => Record<string, CheckFlagReturn>;
  private getFlagValue: (flagKey: string) => boolean | undefined;
  private addFlagValueListener: (flagKey: string, listener: (value: boolean) => void) => () => void;
  private notifyFlagCheckListeners: (flagKey: string, check: CheckFlagReturn) => void;
  private notifyFlagValueListeners: (flagKey: string, value: boolean) => void;
  private getFlagCheck: (flagKey: string) => CheckFlagReturn | undefined;

  constructor(deps: DeveloperToolbarDependencies) {
    this.getAllFlags = deps.getAllFlags;
    this.getFlagValue = deps.getFlagValue;
    this.addFlagValueListener = deps.addFlagValueListener;
    this.notifyFlagCheckListeners = deps.notifyFlagCheckListeners;
    this.notifyFlagValueListeners = deps.notifyFlagValueListeners;
    this.getFlagCheck = deps.getFlagCheck;
  }

  initialize(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (!this.element) {
      this.createDOM();
      document.body.appendChild(this.element!);
    }

    this.setupSelectedFlagListener();
    this.render();
  }

  cleanup(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
      document.body.style.paddingTop = "";
    }
    this.flagListeners.forEach((unsubscribe) => unsubscribe());
    this.flagListeners = [];
    this.select = null;
    this.toggle = null;
    this.valueLabel = null;
    this.manualOverrides = {};
  }

  getManualOverride(flagKey: string): CheckFlagReturn | undefined {
    return this.manualOverrides[flagKey];
  }

  hasManualOverride(flagKey: string): boolean {
    return flagKey in this.manualOverrides;
  }

  setManualOverride(flagKey: string, value: boolean): void {
    // Store as CheckFlagReturn object for stable reference
    const override: CheckFlagReturn = {
      flag: flagKey,
      value: value,
      reason: "Developer toolbar override",
    };
    this.manualOverrides[flagKey] = override;
    this.notifyFlagCheckListeners(flagKey, override);
    this.notifyFlagValueListeners(flagKey, override.value);
  }

  getAllManualOverrides(): Record<string, CheckFlagReturn> {
    return { ...this.manualOverrides };
  }

  private getState(): ToolbarState {
    const flags = this.getAllFlags();
    const availableFlagKeys = Object.keys(flags).sort();
    const selectedFlagKey = this.select?.value || null;

    if (!selectedFlagKey) {
      return {
        selectedFlagKey: null,
        availableFlagKeys,
        flagValue: null,
      };
    }

    const currentValue = this.getFlagValue(selectedFlagKey) ?? false;
    const flagValue = this.hasManualOverride(selectedFlagKey)
      ? this.manualOverrides[selectedFlagKey].value
      : currentValue;

    return {
      selectedFlagKey,
      availableFlagKeys,
      flagValue,
    };
  }

  private getDisplayValue(flagKey: string): boolean {
    const currentValue = this.getFlagValue(flagKey) ?? false;
    if (this.hasManualOverride(flagKey)) {
      return this.manualOverrides[flagKey].value;
    }
    return currentValue;
  }

  private render(): void {
    if (!this.element || !this.select || !this.toggle || !this.valueLabel) {
      return;
    }

    const state = this.getState();

    this.updateSelectOptions(state.availableFlagKeys, state.selectedFlagKey);
    this.updateButtonAndLabel(state);
  }

  private updateSelectOptions(flagKeys: string[], selectedKey: string | null): void {
    if (!this.select) return;

    const currentValue = this.select.value;
    this.select.innerHTML = "";

    const placeholder = createElement(
      "option",
      undefined,
      "Select a flag...",
    );
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = !selectedKey || !flagKeys.includes(selectedKey);
    this.select.appendChild(placeholder);

    flagKeys.forEach((flagKey) => {
      const option = createElement("option", undefined, flagKey);
      option.value = flagKey;
      option.selected = flagKey === selectedKey;
      this.select!.appendChild(option);
    });
  }

  private updateButtonAndLabel(state: ToolbarState): void {
    if (!this.toggle || !this.valueLabel) return;

    this.toggle.classList.remove("flag-true", "flag-false", "flag-null");

    if (state.flagValue === null) {
      this.toggle.disabled = true;
      this.toggle.textContent = "Select a flag";
      this.toggle.classList.add("flag-null");
      Object.assign(this.toggle.style, BUTTON_STYLES.disabled);
      this.valueLabel.textContent = "Current value: —";
      this.valueLabel.style.color = "rgba(255, 255, 255, 0.7)";
    } else {
      this.toggle.disabled = false;
      this.toggle.textContent = state.flagValue ? "Restrict feature" : "Allow feature";
      this.toggle.classList.add(state.flagValue ? "flag-true" : "flag-false");
      this.toggle.style.color = "#ff6b35";
      this.toggle.style.cursor = "pointer";
      Object.assign(
        this.toggle.style,
        BUTTON_STYLES.enabled[state.flagValue ? "true" : "false"],
      );
      this.valueLabel.textContent = `Current value: ${state.flagValue ? "true" : "false"}`;
      this.valueLabel.style.color = "rgba(255, 255, 255, 0.7)";
    }
  }

  private createDOM(): void {
    this.element = createElement("div", `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999999;
      background: rgb(5, 5, 5);
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 13px;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      gap: 16px;
    `);
    this.element.id = "schematic-developer-toolbar";

    const label = createElement(
      "span",
      "font-weight: 600; color: #fff; font-size: 13px;",
      "Schematic Dev Toolbar",
    );
    this.element.appendChild(label);

    this.select = createElement("select", `
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    `);
    this.select.id = "schematic-toolbar-select";
    this.setupSelectHandlers();
    this.element.appendChild(this.select);
    
    if (!document.getElementById("schematic-toolbar-styles")) {
      const style = createElement("style", undefined, `
        #schematic-toolbar-select:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }
        #schematic-toolbar-button.flag-true:hover:not(:disabled) {
          background: rgba(255, 107, 53, 0.25) !important;
          border-color: rgba(255, 107, 53, 0.6) !important;
        }
        #schematic-toolbar-button.flag-false:hover:not(:disabled) {
          background: rgba(255, 107, 53, 0.3) !important;
          border-color: rgba(255, 107, 53, 0.6) !important;
        }
      `);
      style.id = "schematic-toolbar-styles";
      document.head.appendChild(style);
    }

    const valueLabelContainer = createElement("div", "display: flex; align-items: center; gap: 12px;");
    this.valueLabel = createElement(
      "span",
      "color: rgba(255, 255, 255, 0.7); font-size: 12px;",
      "Current value: —",
    );
    valueLabelContainer.appendChild(this.valueLabel);

    this.toggle = createElement("button", `
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: not-allowed;
      min-width: 120px;
      transition: all 0.2s ease;
    `, "Select a flag");
    this.toggle.id = "schematic-toolbar-button";
    this.toggle.disabled = true;
    this.setupButtonHandlers();
    valueLabelContainer.appendChild(this.toggle);

    this.element.appendChild(valueLabelContainer);

    document.body.style.paddingTop = "45px";
  }

  private setupSelectHandlers(): void {
    if (!this.select) return;

    this.select.addEventListener("change", () => {
      this.setupSelectedFlagListener();
      this.render();
    });
  }

  private setupButtonHandlers(): void {
    if (!this.toggle) return;

    this.toggle.addEventListener("click", () => {
      const state = this.getState();
      if (!state.selectedFlagKey || state.flagValue === null) {
        return;
      }

      const currentValue = this.getDisplayValue(state.selectedFlagKey);
      this.setManualOverride(state.selectedFlagKey, !currentValue);
      this.render();
    });
  }

  /**
   * Sets up a listener for the currently selected flag to update the toolbar if the flag value changes.
   */
  private setupSelectedFlagListener(): void {
    this.flagListeners.forEach((unsubscribe) => unsubscribe());
    this.flagListeners = [];

    const selectedFlag = this.select?.value;
    if (selectedFlag && !this.hasManualOverride(selectedFlag)) {
      const unsubscribe = this.addFlagValueListener(selectedFlag, () => {
        if (this.select?.value === selectedFlag) {
          this.render();
        }
      });
      this.flagListeners.push(unsubscribe);
    }
  }
}
