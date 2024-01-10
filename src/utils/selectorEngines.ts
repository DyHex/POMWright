export function createCypressIdEngine() {
  return {
    query(document: { querySelector: (arg0: string) => any }, selector: any) {
      const attr = `[data-cy="${selector}"]`;
      const el = document.querySelector(attr);
      return el;
    },

    queryAll(
      document: {
        querySelectorAll: (
          arg0: string,
        ) => Iterable<unknown> | ArrayLike<unknown>;
      },
      selector: any,
    ) {
      const attr = `[data-cy="${selector}"]`;
      const els = Array.from(document.querySelectorAll(attr));
      return els;
    },
  };
}
