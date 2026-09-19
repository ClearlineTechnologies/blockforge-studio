const response = await fetch("http://127.0.0.1:4173/api/status");
const status = await response.json();
if (status.app !== "blockforge-studio")
  throw new Error("Port 4173 is not BlockForge.");
const stop = await fetch("http://127.0.0.1:4173/api/shutdown", {
  method: "POST",
  headers: { "X-BlockForge": "1" },
});
console.log(
  stop.ok ? "BlockForge server stopped." : "Could not stop the server.",
);
