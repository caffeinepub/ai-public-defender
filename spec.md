# AI Public Defender

## Current State
The backend has placeholder `AI_API_URL` and returns fake/stub data. The JSON parsing functions return hardcoded "FAKE DATA" strings. The frontend correctly calls the backend actor methods but receives fake responses.

## Requested Changes (Diff)

### Add
- Real AI API integration via HTTP outcalls using OpenAI-compatible API (Groq free tier: `https://api.groq.com/openai/v1/chat/completions`)
- Proper JSON parsing for `CaseAnalysisResult` and `FeedbackResponse` from AI responses
- API key passed via request headers

### Modify
- `analyzeCase`: Replace stub with real Groq API call, parse actual JSON from AI response
- `practiceMode`: Replace stub with real API call returning actual counter-argument text
- `getFeedback`: Replace stub with real API call, parse actual JSON feedback
- Prompt format updated to OpenAI chat completions format (JSON body with model, messages)

### Remove
- All "FAKE DATA" stub responses
- Unused `FeedbackResponse` module with compareByLawType

## Implementation Plan
1. Update `main.mo` to build proper OpenAI-compatible JSON request bodies
2. Use `https://api.groq.com/openai/v1/chat/completions` with `llama-3.3-70b-versatile` model
3. Implement text-based JSON field extraction (no full JSON parser needed)
4. Use Authorization header with Groq API key
5. Return parsed structured data to frontend
