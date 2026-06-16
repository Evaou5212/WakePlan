var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
import_dotenv.default.config({ path: import_path.default.join(process.cwd(), ".env.local") });
import_dotenv.default.config({ path: import_path.default.join(process.cwd(), ".env") });
var DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
var DEFAULT_MODEL_ID = "eleven_multilingual_v2";
function readEnvValue(name) {
  for (const file of [".env.local", ".env", ".env.example"]) {
    try {
      const envContent = import_fs.default.readFileSync(import_path.default.join(process.cwd(), file), "utf-8");
      const match = envContent.match(new RegExp(`^${name}=(.*)$`, "m"));
      if (match?.[1] && match[1].trim() && match[1].trim() !== "your_key_here") {
        return match[1].trim();
      }
    } catch {
    }
  }
  return process.env[name];
}
function getElevenLabsConfig() {
  return {
    key: readEnvValue("ELEVENLABS_API_KEY") || "",
    voiceId: readEnvValue("ELEVENLABS_VOICE_ID") || DEFAULT_VOICE_ID,
    modelId: readEnvValue("ELEVENLABS_MODEL_ID") || DEFAULT_MODEL_ID
  };
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/eleven-config", (_req, res) => {
    res.json(getElevenLabsConfig());
  });
  app.get("/api/voices", async (_req, res) => {
    try {
      const { key } = getElevenLabsConfig();
      if (!key) {
        return res.status(500).json({ error: "ElevenLabs API key is missing." });
      }
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": key }
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch voices from ElevenLabs" });
      }
      const data = await response.json();
      const voices = (data.voices || []).map((v) => ({
        name: v.name,
        voiceId: v.voice_id,
        category: v.category,
        apiAvailable: v.category === "premade"
      }));
      res.json({ voices });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/get-eleven-key", (_req, res) => {
    res.json({ key: getElevenLabsConfig().key });
  });
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceId } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      const { key: elevenLabsKey, voiceId: defaultVoiceId, modelId } = getElevenLabsConfig();
      if (!elevenLabsKey) {
        return res.status(500).json({ error: "ElevenLabs API key is missing. Please provide ELEVENLABS_API_KEY." });
      }
      const targetVoice = voiceId || defaultVoiceId;
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": elevenLabsKey
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              use_speaker_boost: true
            }
          })
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs error:", errorText);
        return res.status(response.status).json({ error: "Failed to fetch from ElevenLabs" });
      }
      res.setHeader("Content-Type", "audio/mpeg");
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
