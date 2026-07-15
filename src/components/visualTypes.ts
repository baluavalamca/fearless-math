/**
 * Shared visual spec type — kept React-free on purpose.
 *
 * Non-UI modules (practiceFactory, exampleFactory, tests) only need the SHAPE of
 * a visual, not the renderer. Importing it from here instead of from
 * VisualRenderer keeps those modules from pulling the whole React component graph
 * (and its `import.meta` asset globs) into a plain CommonJS compile.
 */
export interface VisualSpec {
  component: string;
  props: Record<string, unknown>;
  caption?: string;
}
