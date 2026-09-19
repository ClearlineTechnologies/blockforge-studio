import { generateProject } from "../shared/generator.mjs";
self.onmessage = (e) => {
  try {
    self.postMessage({
      revision: e.data.revision,
      result: generateProject(e.data.project),
    });
  } catch (err: any) {
    self.postMessage({ revision: e.data.revision, error: err.message });
  }
};
