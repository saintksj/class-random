// Vercel Serverless Function: 출석부 사진 → 학생 이름 추출 (Gemini)
// API 키는 Vercel > Settings > Environment Variables 의 GEMINI_API_KEY 에서 읽어요.
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY 환경변수가 없어요. Vercel 프로젝트의 Settings > Environment Variables에 API 키를 등록한 뒤 다시 배포(Redeploy)해 주세요.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 가능합니다." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { imageBase64, mimeType } = body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "이미지 데이터와 파일 형식이 필요합니다." });
    }

    const base64Data = String(imageBase64).replace(/^data:image\/\w+;base64,/, "");
    const ai = getGeminiClient();

    const executeWithRetry = async () => {
      let delayMs = 1000;
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              { inlineData: { data: base64Data, mimeType } },
              "이 사진은 학교 출석부 또는 명단 사진입니다. 이미지 안에 인쇄되거나 필기된 모든 학생들의 '이름(실명)'을 하나씩 찾아내서 추출해 주세요. 번호나 성적, 출석 표시('O', 'X'), 성별 등 다른 쓸데없는 정보는 무시하고 오직 온전한 학생 이름들만 골라 배열로 담아 주셔야 합니다."
            ],
            config: {
              systemInstruction: "You are a specialized OCR and classroom assistant. Your goal is to inspect photos of attendance books, name tags, or class lists, find all student names (in Korean, English, etc.), and return them strictly as a JSON array of clean names.",
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  names: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "추출된 학생 이름들의 목록"
                  }
                },
                required: ["names"]
              } as any
            }
          });
        } catch (error: any) {
          const errStr = String(error).toLowerCase();
          const isRetriable =
            errStr.includes("503") || errStr.includes("unavailable") ||
            errStr.includes("429") || errStr.includes("resource_exhausted") ||
            errStr.includes("rate limit") || errStr.includes("spikes in demand");
          if (!isRetriable || attempt === maxRetries) throw error;
          await new Promise((r) => setTimeout(r, delayMs));
          delayMs *= 2;
        }
      }
      throw new Error("최대 재시도 횟수를 초과했습니다.");
    };

    const response = await executeWithRetry();
    const responseText = response?.text;
    if (!responseText) {
      throw new Error("제미나이 AI가 사진 속 이름을 찾지 못했습니다. 사진 화질을 확인해 주세요!");
    }

    return res.status(200).json(JSON.parse(responseText.trim()));
  } catch (error: any) {
    console.error("Attendance OCR API error:", error);
    const errStr = String(error).toLowerCase();
    let friendlyMessage = "이미지를 분석하는 도중 오류가 생겼습니다. 다시 시도해 주세요!";

    if (errStr.includes("503") || errStr.includes("unavailable") || errStr.includes("spikes in demand")) {
      friendlyMessage = "현재 구글 인공지능(Gemini AI) 서버에 사용량이 일시적으로 몰려 응답이 지연되고 있어요. 잠시 후 한 번만 더 사진을 업로드해 주세요! 🌸";
    } else if (errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("rate limit")) {
      friendlyMessage = "앗, 요청이 너무 빨랐나 봐요! 5초 정도 쉬었다가 다시 시도해 주세요. 🎈";
    } else if (errStr.includes("403") || errStr.includes("api_key_invalid") || errStr.includes("api key not valid") || errStr.includes("permission_denied")) {
      friendlyMessage = "Gemini API 키가 유효하지 않거나 권한이 없어요. Vercel의 Settings > Environment Variables에서 GEMINI_API_KEY를 확인한 뒤 다시 배포해 주세요! 🌟";
    } else if (errStr.includes("json")) {
      friendlyMessage = "사진에서 글자를 알아보기 조금 힘든 것 같아요. 이름이 잘 보이는 밝고 선명한 사진으로 다시 올려주세요! 📸";
    } else if (error?.message) {
      friendlyMessage = error.message;
    }

    return res.status(500).json({ error: friendlyMessage });
  }
}
