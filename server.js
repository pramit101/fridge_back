import express from "express";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());

// Configure multer to store files in memory as a buffer
const upload = multer({ storage: multer.memoryStorage() });

// Get the API key from the environment variables
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GOOGLE_API_KEY environment variable is not set.");
  process.exit(1);
}

// Initialize the Generative AI client
const genAI = new GoogleGenerativeAI(apiKey);

// A simple GET endpoint for a health check
app.get("/", (req, res) => {
  res.send("Server is running.");
});

// The main POST endpoint to handle photo uploads
app.post("/upload-photos", upload.single("file"), async (req, res) => {
  // Use a try-catch block to catch and log any errors that occur
  try {
    // Check if a file was successfully uploaded
    if (!req.file) {
      console.error("❌ No file received in the request.");
      return res.status(400).json({ error: "No file uploaded." });
    }

    console.log(`✅ File received: ${req.file.originalname}`);

    // Get the file data directly from the buffer
    const imageBuffer = req.file.buffer;
    
    // Use the correct model for image processing
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Define the request content for the generative model
    const request = [
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: imageBuffer.toString("base64"),
        },
      },
      {
        text: `Identify only the food and drink items in this fridge.
               Ignore packaging, labels, or non-food objects.
               Return a JSON object like: { "items": ["milk", "eggs", "cheese"] }`,
      },
    ];

    console.log("⏳ Sending request to Generative AI model...");

    const result = await model.generateContent(request);

    // Process the model's response
    let output;
    const responseText = result.response.text();
    console.log(`✅ AI response received: ${responseText}`);

    try {
      // Attempt to parse the JSON output from the model
      output = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse AI response as JSON:", parseError);
      output = { items: [] }; // Fallback to an empty array to prevent a crash
    }

    // Send the final JSON response back to the client
    res.json(output);

  } catch (error) {
    // Log the full stack trace of any unhandled errors
    console.error("❌ An unexpected server error occurred:");
    console.error(error);
    // Send a 500 status code with an error message to the client
    res.status(500).json({ error: "Internal server error during processing" });
  }
});

// Start the server
app.listen(3000, () =>
  console.log("✅ Server running on http://localhost:3000")
);
