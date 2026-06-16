import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah — free-tier premade voice
const DEFAULT_MODEL_ID = "eleven_multilingual_v2"; // closer to ElevenLabs website preview

function readEnvValue(name: string): string | undefined {
  // Prefer env files so .env.local edits apply without restarting the server
  for (const file of [".env.local", ".env", ".env.example"]) {
    try {
      const envContent = fs.readFileSync(path.join(process.cwd(), file), "utf-8");
      const match = envContent.match(new RegExp(`^${name}=(.*)$`, "m"));
      if (match?.[1] && match[1].trim() && match[1].trim() !== "your_key_here") {
        return match[1].trim();
      }
    } catch {
      // file may not exist
    }
  }

  return process.env[name];
}

function getElevenLabsConfig() {
  return {
    key: readEnvValue("ELEVENLABS_API_KEY") || "",
    voiceId: readEnvValue("ELEVENLABS_VOICE_ID") || DEFAULT_VOICE_ID,
    modelId: readEnvValue("ELEVENLABS_MODEL_ID") || DEFAULT_MODEL_ID,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
        headers: { "xi-api-key": key },
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch voices from ElevenLabs" });
      }

      const data = await response.json();
      const voices = (data.voices || []).map((v: { name: string; voice_id: string; category: string }) => ({
        name: v.name,
        voiceId: v.voice_id,
        category: v.category,
        apiAvailable: v.category === "premade",
      }));
      res.json({ voices });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Backward compatibility
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
            "xi-api-key": elevenLabsKey,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              use_speaker_boost: true,
            },
          }),
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
