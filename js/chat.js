// Change this if Ollama runs on another host or port.
const OLLAMA = "/ollama";

const log = document.getElementById("log");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const modelSel = document.getElementById("model");
let history = [];
let controller = null;

function addMessage(role, text) {
  document.getElementById("empty")?.remove();
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

async function loadModels() {
  try {
    const res = await fetch(OLLAMA + "/api/tags");
    if (!res.ok) {
      addMessage("error",
        "Ollama request failed: " + res.status + " " + res.statusText + " (" + res.url + ")");
      return;
    }
    const data = await res.json();
    modelSel.innerHTML = "";
    if (!data.models.length) {
      addMessage("error", "No models installed. Run: ollama pull llama3.1");
      return;
    }
    for (const m of data.models) {
      const opt = document.createElement("option");
      opt.value = opt.textContent = m.name;
      modelSel.appendChild(opt);
    }
  } catch (err) {
    addMessage("error",
      "Can't reach Ollama at " + OLLAMA + " (" + err.message + "). " +
      "Check that Ollama is running and that Nginx proxies /ollama/ to it.");
  }
}

async function send(text) {
  history.push({ role: "user", content: text });
  addMessage("user", text);
  const out = addMessage("assistant", "");
  let reply = "";

  controller = new AbortController();
  sendBtn.textContent = "Stop";
  sendBtn.type = "button";

  try {
    const res = await fetch(OLLAMA + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelSel.value, messages: history, stream: true }),
      signal: controller.signal
    });
    if (!res.ok) throw new Error("Ollama returned " + res.status);

    // Ollama streams one JSON object per line.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line);
        if (chunk.message?.content) {
          reply += chunk.message.content;
          out.textContent = reply;
          log.scrollTop = log.scrollHeight;
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      out.classList.add("error");
      out.textContent = "Request failed: " + err.message;
    }
  }

  if (reply) history.push({ role: "assistant", content: reply });
  controller = null;
  sendBtn.textContent = "Send";
  sendBtn.type = "submit";
}

document.getElementById("form").addEventListener("submit", e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || controller) return;
  input.value = "";
  input.style.height = "";
  send(text);
});

sendBtn.addEventListener("click", () => {
  if (controller) controller.abort();
});

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    document.getElementById("form").requestSubmit();
  }
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
});

document.getElementById("clear").addEventListener("click", () => {
  if (controller) controller.abort();
  history = [];
  log.innerHTML = '<p class="empty" id="empty">New chat started.</p>';
});

loadModels();
