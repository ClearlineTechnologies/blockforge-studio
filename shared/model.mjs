export const uid = () => globalThis.crypto.randomUUID();
const f = (key, label, type = "text", value = "", extra = {}) => ({
  key,
  label,
  type,
  value,
  ...extra,
});
const exp = (key, label, value = { kind: "number", value: 0 }) =>
  f(key, label, "expr", value);
export const literal = (value) => ({
  kind:
    typeof value === "boolean"
      ? "boolean"
      : typeof value === "number"
        ? "number"
        : "text",
  value,
});
export const ref = (value) => ({ kind: "reference", value });
export const binary = (left, op, right) => ({
  kind: "binary",
  left,
  op,
  right,
});
export const definitions = [
  {
    kind: "notify",
    label: "Show notification",
    category: "World & player",
    icon: "MessageSquare",
    description: "Display a GTA notification in the feed.",
    fields: [exp("message", "Message", literal("Hello, Los Santos."))],
  },
  {
    kind: "subtitle",
    label: "Show subtitle",
    category: "World & player",
    fields: [
      exp("message", "Message", literal("Mission started")),
      f("duration", "Duration (ms)", "number", 3000),
    ],
  },
  {
    kind: "wanted",
    label: "Set wanted level",
    category: "World & player",
    fields: [f("level", "Wanted level", "number", 0)],
  },
  {
    kind: "health",
    label: "Set player health",
    category: "World & player",
    fields: [exp("value", "Health", literal(200))],
  },
  {
    kind: "armor",
    label: "Set player armor",
    category: "World & player",
    fields: [exp("value", "Armor", literal(100))],
  },
  {
    kind: "money",
    label: "Set player money",
    category: "World & player",
    fields: [exp("value", "Money", literal(10000))],
  },
  {
    kind: "invincible",
    label: "Set player invincible",
    category: "World & player",
    fields: [exp("value", "Enabled", literal(true))],
  },
  {
    kind: "teleport",
    label: "Teleport player",
    category: "World & player",
    fields: [
      exp("x", "X", literal(-1037)),
      exp("y", "Y", literal(-2737)),
      exp("z", "Z", literal(20)),
    ],
  },
  {
    kind: "weather",
    label: "Set weather",
    category: "World & player",
    fields: [
      f("weather", "Weather", "select", "ExtraSunny", {
        options: [
          "ExtraSunny",
          "Clear",
          "Clouds",
          "Smog",
          "Foggy",
          "Overcast",
          "Raining",
          "ThunderStorm",
          "Clearing",
          "Neutral",
          "Snowing",
          "Blizzard",
        ],
      }),
    ],
  },
  {
    kind: "time",
    label: "Set world time",
    category: "World & player",
    fields: [
      f("hour", "Hour", "number", 12),
      f("minute", "Minute", "number", 0),
    ],
  },
  {
    kind: "vehicle",
    label: "Spawn vehicle",
    category: "Entities",
    description:
      "Requests a model, checks availability, creates a vehicle, then releases the model.",
    fields: [
      f("name", "Store vehicle as", "identifier", "vehicle"),
      exp("model", "Model name", literal("adder")),
      exp("position", "Position", {
        kind: "reference",
        value:
          "Game.Player.Character.Position + Game.Player.Character.ForwardVector * 5f",
      }),
    ],
  },
  {
    kind: "ped",
    label: "Spawn pedestrian",
    category: "Entities",
    fields: [
      f("name", "Store ped as", "identifier", "ped"),
      exp("model", "Model name", literal("a_m_y_business_01")),
      exp("position", "Position", ref("Game.Player.Character.Position")),
    ],
  },
  {
    kind: "deleteEntity",
    label: "Delete entity",
    category: "Entities",
    fields: [exp("entity", "Entity", ref("vehicle"))],
  },
  {
    kind: "repair",
    label: "Repair vehicle",
    category: "Entities",
    fields: [
      exp("vehicle", "Vehicle", ref("Game.Player.Character.CurrentVehicle")),
    ],
  },
  {
    kind: "blip",
    label: "Add map blip",
    category: "Entities",
    fields: [
      f("name", "Store blip as", "identifier", "blip"),
      exp("position", "Position", ref("Game.Player.Character.Position")),
      exp("label", "Label", literal("Destination")),
    ],
  },
  {
    kind: "weapon",
    label: "Give player weapon",
    category: "Entities",
    fields: [
      f("hash", "Weapon", "select", "Pistol", {
        options: [
          "Pistol",
          "CombatPistol",
          "SMG",
          "AssaultRifle",
          "CarbineRifle",
          "PumpShotgun",
          "SniperRifle",
          "Knife",
          "Unarmed",
        ],
      }),
      f("ammo", "Ammo", "number", 100),
    ],
  },
  {
    kind: "if",
    label: "If condition",
    category: "Control flow",
    container: true,
    fields: [
      exp(
        "condition",
        "Condition",
        binary(ref("Game.Player.WantedLevel"), ">", literal(0)),
      ),
    ],
  },
  {
    kind: "ifElse",
    label: "If / otherwise",
    category: "Control flow",
    container: true,
    otherwise: true,
    fields: [exp("condition", "Condition", literal(true))],
  },
  {
    kind: "repeat",
    label: "Repeat count",
    category: "Control flow",
    container: true,
    fields: [
      f("variable", "Counter", "identifier", "i"),
      exp("count", "Count", literal(5)),
    ],
  },
  {
    kind: "while",
    label: "While condition",
    category: "Control flow",
    container: true,
    fields: [exp("condition", "Condition", literal(false))],
  },
  {
    kind: "foreach",
    label: "For each item",
    category: "Control flow",
    container: true,
    fields: [
      f("type", "Item type", "type", "var"),
      f("variable", "Item variable", "identifier", "item"),
      exp("collection", "Collection", ref("World.GetAllVehicles()")),
    ],
  },
  {
    kind: "return",
    label: "Return",
    category: "Control flow",
    fields: [f("value", "Return expression (optional)", "code", "")],
  },
  { kind: "break", label: "Break loop", category: "Control flow", fields: [] },
  {
    kind: "continue",
    label: "Continue loop",
    category: "Control flow",
    fields: [],
  },
  {
    kind: "wait",
    label: "Wait",
    category: "Control flow",
    description:
      "Yields the SHVDN script thread. Avoid long waits inside tick processing.",
    fields: [exp("duration", "Milliseconds", literal(100))],
  },
  {
    kind: "try",
    label: "Try / catch",
    category: "Control flow",
    container: true,
    otherwise: true,
    fields: [f("exception", "Exception variable", "identifier", "error")],
  },
  {
    kind: "key",
    label: "When key pressed",
    category: "Events & input",
    container: true,
    description: "Place inside the KeyDown handler.",
    fields: [
      f("key", "Key", "select", "F7", {
        options: [
          "F1",
          "F2",
          "F3",
          "F4",
          "F5",
          "F6",
          "F7",
          "F8",
          "F9",
          "F10",
          "F11",
          "F12",
          "E",
          "G",
          "H",
          "J",
          "K",
          "L",
          "NumPad0",
          "NumPad1",
          "Space",
        ],
      }),
    ],
  },
  {
    kind: "field",
    label: "Class field",
    category: "Variables",
    scope: "fields",
    fields: [
      f("type", "Type", "type", "int"),
      f("name", "Name", "identifier", "counter"),
      exp("value", "Initial value", literal(0)),
    ],
  },
  {
    kind: "variable",
    label: "Local variable",
    category: "Variables",
    fields: [
      f("type", "Type", "type", "var"),
      f("name", "Name", "identifier", "value"),
      exp("value", "Initial value", literal(0)),
    ],
  },
  {
    kind: "assign",
    label: "Set value",
    category: "Variables",
    fields: [
      exp("target", "Variable or property", ref("counter")),
      exp("value", "Value", literal(1)),
    ],
  },
  {
    kind: "increment",
    label: "Increase value",
    category: "Variables",
    fields: [
      exp("target", "Variable", ref("counter")),
      exp("value", "Amount", literal(1)),
    ],
  },
  {
    kind: "call",
    label: "Call method",
    category: "C#",
    fields: [
      f("method", "Method", "text", "DoWork"),
      f("args", "Arguments", "args", []),
    ],
  },
  {
    kind: "api",
    label: "Framework API call",
    category: "C#",
    fields: [
      f("target", "Instance (empty for static)", "text", ""),
      f("member", "Member", "text", ""),
      f("args", "Arguments", "args", []),
      f("result", "Store result (optional)", "text", ""),
    ],
  },
  {
    kind: "new",
    label: "Create object",
    category: "C#",
    fields: [
      f("type", "Type", "type", "System.Text.StringBuilder"),
      f("name", "Variable", "identifier", "builder"),
      f("args", "Arguments", "args", []),
    ],
  },
  {
    kind: "comment",
    label: "Comment",
    category: "C#",
    fields: [f("text", "Comment", "text", "Describe your intent here.")],
  },
  {
    kind: "raw",
    label: "C# source",
    category: "C#",
    description:
      "Escape hatch for any C# statement. Compiled by Roslyn with the rest of the project.",
    fields: [f("code", "C# statements", "code", "// Your C# here")],
  },
  {
    kind: "member",
    label: "C# class member",
    category: "C#",
    scope: "fields",
    fields: [
      f(
        "code",
        "Field, property, or method declaration",
        "code",
        "public int Counter { get; set; }",
      ),
    ],
  },
  {
    kind: "menu",
    label: "Create menu",
    category: "LemonUI",
    dependency: "lemon",
    fields: [
      f("name", "Menu field", "identifier", "mainMenu"),
      exp("title", "Banner title", literal("My Mod")),
      exp("subtitle", "Subtitle", literal("MAIN MENU")),
      exp("description", "Description", literal("Choose an action")),
    ],
  },
  {
    kind: "menuItem",
    label: "Add menu item",
    category: "LemonUI",
    dependency: "lemon",
    fields: [
      f("menu", "Menu", "identifier", "mainMenu"),
      f("name", "Item variable", "identifier", "actionItem"),
      exp("title", "Title", literal("Repair vehicle")),
      exp(
        "description",
        "Description",
        literal("Restore your current vehicle"),
      ),
      f("handler", "Click handler (optional)", "text", ""),
    ],
  },
  {
    kind: "menuCheckbox",
    label: "Add checkbox",
    category: "LemonUI",
    dependency: "lemon",
    fields: [
      f("menu", "Menu", "identifier", "mainMenu"),
      f("name", "Item field", "identifier", "godModeItem"),
      exp("title", "Title", literal("Invincible")),
      exp("value", "Checked", literal(false)),
    ],
  },
  {
    kind: "menuToggle",
    label: "Toggle menu",
    category: "LemonUI",
    dependency: "lemon",
    fields: [f("menu", "Menu", "identifier", "mainMenu")],
  },
  {
    kind: "menuVisible",
    label: "Set menu visibility",
    category: "LemonUI",
    dependency: "lemon",
    fields: [
      f("menu", "Menu", "identifier", "mainMenu"),
      exp("value", "Visible", literal(true)),
    ],
  },
  {
    kind: "menuProcess",
    label: "Process menus",
    category: "LemonUI",
    dependency: "lemon",
    description: "Call once per tick to draw menus and handle input.",
    fields: [],
  },
  {
    kind: "phone",
    label: "Create phone",
    category: "iFruitAddon2",
    dependency: "ifruit",
    fields: [f("name", "Phone field", "identifier", "phone")],
  },
  {
    kind: "contact",
    label: "Add phone contact",
    category: "iFruitAddon2",
    dependency: "ifruit",
    fields: [
      f("phone", "Phone", "identifier", "phone"),
      f("name", "Contact variable", "identifier", "mechanic"),
      exp("label", "Contact name", literal("Mechanic")),
      f("timeout", "Answer delay (ms)", "number", 1000),
      f("handler", "Answered handler (optional)", "text", ""),
    ],
  },
  {
    kind: "phoneUpdate",
    label: "Update phone",
    category: "iFruitAddon2",
    dependency: "ifruit",
    fields: [f("phone", "Phone", "identifier", "phone")],
  },
  {
    kind: "phoneClose",
    label: "Close phone",
    category: "iFruitAddon2",
    dependency: "ifruit",
    fields: [
      f("phone", "Phone", "identifier", "phone"),
      f("delay", "Delay (ms)", "number", 0),
    ],
  },
  {
    kind: "native",
    label: "Call GTA native",
    category: "GTA natives",
    description:
      "Use a native hash name from GTA.Native.Hash. Check native argument types in the API documentation.",
    fields: [
      f("hash", "Native hash", "text", "SET_PLAYER_WANTED_LEVEL"),
      f("returnType", "Return type (void for no result)", "type", "void"),
      f("args", "Arguments", "args", [
        ref("Game.Player.Handle"),
        literal(0),
        literal(false),
      ]),
      f("result", "Store result (optional)", "text", ""),
    ],
  },
];
export const registry = Object.fromEntries(definitions.map((d) => [d.kind, d]));
export const categories = [...new Set(definitions.map((d) => d.category))];
export function block(kind, values = {}, children = []) {
  const def = registry[kind];
  if (!def) throw new Error("Unknown block " + kind);
  return {
    id: uid(),
    kind,
    values: {
      ...Object.fromEntries(
        def.fields.map((f) => [f.key, structuredClone(f.value)]),
      ),
      ...values,
    },
    children,
    otherwise: [],
    collapsed: false,
    disabled: false,
  };
}
export function method(name, event = "method", blocks = []) {
  return { id: uid(), name, event, returnType: "void", parameters: "", blocks };
}
export function script(name = "Main") {
  return {
    id: uid(),
    name: name + ".cs",
    className: name,
    methods: [
      method("Fields", "fields"),
      method("Initialize", "constructor"),
      method("OnTick", "tick"),
      method("OnKeyDown", "keyDown"),
      method("OnAborted", "aborted"),
    ],
  };
}
export function createProject(name = "MyMod", template = "starter") {
  const file = script(name.replace(/[^a-zA-Z0-9_]/g, "") || "MyMod");
  const p = {
    schemaVersion: 1,
    id: uid(),
    name,
    namespace: "MyMods",
    version: "1.0.0",
    description: "A GTA V single-player mod made with BlockForge.",
    author: "",
    frameworks: ["shvdn"],
    usings: [],
    references: [],
    files: [file],
    createdAt: new Date().toISOString(),
  };
  if (template === "blank") return p;
  file.methods[1].blocks.push(
    block("notify", {
      message: literal("~b~" + name + "~s~ loaded. Press F7 to open."),
    }),
  );
  if (template === "starter" || template === "menu") {
    p.frameworks.push("lemon");
    file.methods[1].blocks.push(
      block("menu", {
        title: literal(name),
        description: literal("Your city. Your rules."),
      }),
      block("menuItem", {
        title: literal("Repair vehicle"),
        handler: "RepairVehicle",
      }),
    );
    file.methods[2].blocks.push(block("menuProcess"));
    file.methods[3].blocks.push(block("key", {}, [block("menuToggle")]));
    file.methods.push(
      method("RepairVehicle", "menuClick", [
        block(
          "if",
          {
            condition: binary(
              ref("Game.Player.Character.CurrentVehicle"),
              "!=",
              { kind: "null" },
            ),
          },
          [
            block("repair"),
            block("notify", { message: literal("~g~Vehicle repaired.") }),
          ],
        ),
      ]),
    );
  }
  if (template === "phone") {
    p.frameworks.push("ifruit");
    file.methods[1].blocks.push(
      block("phone"),
      block("contact", { handler: "OnMechanicAnswered" }),
    );
    file.methods[2].blocks.push(block("phoneUpdate"));
    file.methods.push(
      method("OnMechanicAnswered", "phoneAnswered", [
        block("notify", { message: literal("Mechanic is on the way.") }),
        block("phoneClose"),
      ]),
    );
  }
  return p;
}
export function walk(blocks, visit, depth = 0) {
  for (const b of blocks) {
    visit(b, depth);
    walk(b.children || [], visit, depth + 1);
    walk(b.otherwise || [], visit, depth + 1);
  }
}
export function findBlock(blocks, id) {
  for (const b of blocks) {
    if (b.id === id) return b;
    const n =
      findBlock(b.children || [], id) || findBlock(b.otherwise || [], id);
    if (n) return n;
  }
  return null;
}
export function findLocation(blocks, id) {
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id === id) return { list: blocks, index: i };
    const n =
      findLocation(blocks[i].children || [], id) ||
      findLocation(blocks[i].otherwise || [], id);
    if (n) return n;
  }
  return null;
}
export function flatten(
  blocks,
  depth = 0,
  parent = null,
  branch = "children",
  out = [],
) {
  for (const b of blocks) {
    out.push({ block: b, depth, parent, branch });
    if (!b.collapsed) {
      flatten(b.children || [], depth + 1, b.id, "children", out);
      if (b.otherwise?.length)
        flatten(b.otherwise, depth + 1, b.id, "otherwise", out);
    }
  }
  return out;
}
export function countBlocks(project) {
  let n = 0;
  for (const f of project.files)
    for (const m of f.methods) walk(m.blocks, () => n++);
  return n;
}
export function cloneBlock(b) {
  const copy = structuredClone(b);
  walk([copy], (n) => (n.id = uid()));
  return copy;
}
export function validateProject(p) {
  if (!p || p.schemaVersion !== 1 || !Array.isArray(p.files) || !p.files.length)
    throw new Error("Not a BlockForge version 1 project.");
  if (typeof p.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(p.id))
    throw new Error("Invalid project ID.");
  if (
    typeof p.name !== "string" ||
    !/^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(p.name)
  )
    throw new Error(
      "Project name must be a C# identifier (letters, numbers, underscores).",
    );
  if (
    typeof p.namespace !== "string" ||
    !/^([A-Za-z_][A-Za-z0-9_]*)(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(p.namespace)
  )
    throw new Error("Invalid namespace.");
  if (!/^\d+\.\d+\.\d+(\.\d+)?$/.test(p.version))
    throw new Error("Version must be numeric, such as 1.0.0.");
  if (
    !Array.isArray(p.frameworks) ||
    !p.frameworks.includes("shvdn") ||
    p.frameworks.some((f) => !["shvdn", "lemon", "ifruit"].includes(f))
  )
    throw new Error("Invalid frameworks.");
  if (
    !Array.isArray(p.references) ||
    p.references.some((r) => !/^[-\w.]+\.dll$/i.test(r))
  )
    throw new Error("Invalid assembly reference.");
  if (
    !Array.isArray(p.usings) ||
    p.usings.some((u) => !/^\w+(\.\w+)*$/.test(u))
  )
    throw new Error("Invalid using namespace.");
  const ids = new Set(),
    names = new Set();
  let n = 0;
  const id = (x) => {
    if (typeof x !== "string" || !/^[\w-]+$/.test(x) || ids.has(x))
      throw new Error("Invalid or duplicate object ID.");
    ids.add(x);
  };
  const check = (blocks, depth = 0) => {
    if (!Array.isArray(blocks) || depth > 64)
      throw new Error("Maximum nesting depth is 64.");
    for (const b of blocks) {
      id(b.id);
      if (
        !Object.hasOwn(registry, b.kind) ||
        !b.values ||
        typeof b.values !== "object"
      )
        throw new Error("Unknown or invalid block.");
      if (++n > 100000) throw new Error("Project exceeds 100,000 blocks.");
      check(b.children || [], depth + 1);
      check(b.otherwise || [], depth + 1);
    }
  };
  for (const f of p.files) {
    id(f.id);
    if (!/^[A-Za-z_][\w]*\.cs$/.test(f.name) || names.has(f.name.toLowerCase()))
      throw new Error("Script filenames must be unique C# filenames.");
    names.add(f.name.toLowerCase());
    if (!/^[A-Za-z_]\w*$/.test(f.className))
      throw new Error("Invalid class name.");
    if (!Array.isArray(f.methods)) throw new Error("Invalid methods.");
    for (const m of f.methods) {
      id(m.id);
      if (!/^[A-Za-z_]\w*$/.test(m.name))
        throw new Error("Invalid method name.");
      if (
        ![
          "fields",
          "constructor",
          "tick",
          "keyDown",
          "keyUp",
          "aborted",
          "method",
          "menuClick",
          "phoneAnswered",
        ].includes(m.event)
      )
        throw new Error("Invalid method event.");
      check(m.blocks);
    }
  }
  return p;
}
