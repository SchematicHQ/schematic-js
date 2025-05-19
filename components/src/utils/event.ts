export type DebugEventData = {
  type: string;
  data?: unknown;
};

export const dispatchEmbedEvent = <TDetail>(type: string, detail?: TDetail) => {
  dispatchEvent(
    new CustomEvent(`sch_${type}`, {
      bubbles: true,
      ...(detail && { detail }),
    }),
  );

  dispatchEvent(
    new CustomEvent<DebugEventData>("sch_debug", {
      bubbles: true,
      detail: { type, ...(detail && { data: detail }) },
    }),
  );
};
