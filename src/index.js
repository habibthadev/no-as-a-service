import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

dotenv.config();
app.use(express.json()); // Add JSON body parser middleware

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5001;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.post("/ask", async (req, res) => {
  try {
    const modelName = "gemini-1.5-flash";
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: { message: "Prompt is required" } });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: { message: "API key is not set" } });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: { message: "Internal server error" } });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
// Export the app for testing or further configuration
export default app;
