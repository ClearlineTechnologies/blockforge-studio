export type Expr = {
  kind: string;
  value?: any;
  left?: Expr;
  right?: Expr;
  op?: string;
  x?: Expr;
  y?: Expr;
  z?: Expr;
};
export type Block = {
  id: string;
  kind: string;
  values: Record<string, any>;
  children: Block[];
  otherwise: Block[];
  collapsed: boolean;
  disabled: boolean;
};
export type Method = {
  id: string;
  name: string;
  event: string;
  returnType: string;
  parameters: string;
  blocks: Block[];
};
export type ScriptFile = {
  id: string;
  name: string;
  className: string;
  methods: Method[];
};
export type Project = {
  schemaVersion: number;
  id: string;
  name: string;
  namespace: string;
  version: string;
  description: string;
  author: string;
  frameworks: string[];
  usings: string[];
  references: string[];
  files: ScriptFile[];
  createdAt: string;
};
export type Diagnostic = {
  severity: string;
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  blockId?: string;
};
export type BuildResult = {
  id: string;
  success: boolean;
  duration: number;
  lineCount: number;
  diagnostics: Diagnostic[];
  output: string;
  builtAt: string;
  name: string;
  version: string;
};
export type ApiMember = {
  kind: string;
  type: string;
  name: string;
  isStatic: boolean;
  returnType: string;
  canWrite?: boolean;
  parameters: { name: string; type: string; optional: boolean }[];
  description: string;
  assembly: string;
};
