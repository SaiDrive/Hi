import { GoogleGenAI } from "@google/genai";
import type { ContentItem, ContentType, UserImage } from '../types';

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTextContent = async (prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: "You are a brand ambassador and expert social media content creator. Generate concise, engaging, and professional content based on the user's notes.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text content:", error);
    throw new Error("Failed to generate text content.");
  }
};

export const generateImageContent = async (prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Create a vibrant, professional, and eye-catching image for a social media post. The theme is: ${prompt}`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Error generating image content:", error);
    throw new Error("Failed to generate image content.");
  }
};

export const generateVideoContent = async (prompt: string, startImage?: UserImage): Promise<string> => {
  try {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
        throw new Error("API_KEY_REQUIRED");
    }

    const ai = getAiClient();

    const imagePayload = startImage ? {
      imageBytes: startImage.base64,
      mimeType: 'image/png',
    } : undefined;

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Create a short, dynamic, and engaging video for social media. The theme is: ${prompt}`,
      image: imagePayload,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if(operation.error) {
        throw new Error(operation.error.message || "Video generation failed in operation.");
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video URI not found in operation response.");
    }
    
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        const errorText = await response.text();
        if(errorText.includes("Requested entity was not found.")){
            throw new Error("API_KEY_INVALID");
        }
        throw new Error(`Failed to fetch video data: ${response.statusText}`);
    }
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error) {
    console.error("Error generating video content:", error);
    if(error instanceof Error) {
        if(error.message.includes("API_KEY_REQUIRED")){
            throw new Error("Please select an API key to generate videos.");
        }
        if(error.message.includes("API_KEY_INVALID")){
            throw new Error("Your API key is invalid. Please select a new one.");
        }
    }
    throw new Error("Failed to generate video content.");
  }
};
