import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import OutCall "http-outcalls/outcall";
import Text "mo:core/Text";

actor {
  include MixinStorage();

  // Groq API config
  let GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
  let GROQ_API_KEY = "gsk_REPLACE_WITH_GROQ_KEY";
  let GROQ_MODEL = "llama-3.3-70b-versatile";

  // Types
  type CaseAnalysisInput = {
    caseDescription : Text;
    lawType : Text;
    documentContext : ?Text;
  };

  type PracticeModeInput = {
    conversationHistory : [Text];
    userInput : Text;
    lawType : Text;
  };

  type FeedbackInput = {
    fullConversation : [Text];
    lawType : Text;
  };

  type CaseAnalysisResult = {
    caseType : Text;
    applicableLaw : Text;
    userRights : Text;
    procedure : Text;
    oppositionArguments : [Text];
  };

  type PracticeModeResponse = {
    counterArgument : Text;
  };

  type FeedbackResponse = {
    strengths : [Text];
    weaknesses : [Text];
    suggestions : [Text];
  };

  // Transform for HTTP outcalls
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Join array of texts with separator
  func joinTexts(arr : [Text], sep : Text) : Text {
    var result = "";
    var first = true;
    for (item in arr.vals()) {
      if (first) { first := false } else { result #= sep };
      result #= item;
    };
    result;
  };

  // Escape special chars for JSON strings
  func escapeJson(t : Text) : Text {
    var r = "";
    for (c in t.chars()) {
      let n = c.toNat32();
      if (n == 34) { r #= "\\\"" }
      else if (n == 10) { r #= "\\n" }
      else if (n == 13) { r #= "\\r" }
      else if (n == 92) { r #= "\\\\" }
      else { r #= Text.fromChar(c) };
    };
    r;
  };

  // Build OpenAI-compatible request body
  func buildRequestBody(systemPrompt : Text, userPrompt : Text) : Text {
    "{\"model\":\"" # GROQ_MODEL # "\",\"messages\":[{\"role\":\"system\",\"content\":\"" # escapeJson(systemPrompt) # "\"},{\"role\":\"user\",\"content\":\"" # escapeJson(userPrompt) # "\"}],\"temperature\":0.7,\"max_tokens\":1024}";
  };

  // Find index of needle in haystack
  func indexOf(haystack : Text, needle : Text) : ?Nat {
    let hArr = haystack.chars().toArray();
    let nArr = needle.chars().toArray();
    let hLen = hArr.size();
    let nLen = nArr.size();
    if (nLen == 0) return ?0;
    if (nLen > hLen) return null;
    var i = 0;
    while (i + nLen <= hLen) {
      var j = 0;
      var ok = true;
      while (j < nLen) {
        if (hArr[i + j] != nArr[j]) { ok := false; j := nLen };
        j += 1;
      };
      if (ok) return ?i;
      i += 1;
    };
    null;
  };

  // Extract a JSON string field value for given key
  func extractStr(json : Text, key : Text) : Text {
    let needle = "\"" # key # "\":\"";
    switch (indexOf(json, needle)) {
      case (null) { "" };
      case (?idx) {
        let rest = Text.fromIter(json.chars().drop(idx + needle.size()));
        switch (indexOf(rest, "\"")) {
          case (null) { rest };
          case (?endIdx) { Text.fromIter(rest.chars().take(endIdx)) };
        };
      };
    };
  };

  // Extract JSON array field as array of strings
  func extractArr(json : Text, key : Text) : [Text] {
    let needle = "\"" # key # "\":[";
    switch (indexOf(json, needle)) {
      case (null) { [] };
      case (?startIdx) {
        let after = Text.fromIter(json.chars().drop(startIdx + needle.size()));
        switch (indexOf(after, "]")) {
          case (null) { [] };
          case (?endIdx) {
            let inner = Text.fromIter(after.chars().take(endIdx));
            let parts = inner.split(#text "\",\"").toArray();
            var results : [Text] = [];
            for (part in parts.vals()) {
              let chars = part.chars().toArray();
              var s = 0;
              var e = chars.size();
              if (e > 0 and chars[0].toNat32() == 34) { s := 1 };
              if (e > s and chars[e - 1].toNat32() == 34) { e -= 1 };
              if (e > s) {
                let cleaned = Text.fromIter(part.chars().drop(s).take(e - s));
                if (cleaned != "") {
                  results := results.concat([cleaned]);
                };
              };
            };
            results;
          };
        };
      };
    };
  };

  // Extract AI text content from Groq API response
  func extractContent(response : Text) : Text {
    extractStr(response, "content");
  };

  // API: Analyze Case
  public shared ({ caller = _ }) func analyzeCase(input : CaseAnalysisInput) : async CaseAnalysisResult {
    let docContext = switch (input.documentContext) {
      case (null) { "" };
      case (?ctx) { " Document context: " # ctx };
    };
    let systemPrompt = "You are a legal AI assistant specializing in " # input.lawType # ". Only respond to legal matters. Respond ONLY with valid compact JSON, no markdown, no explanation. Format: {\"caseType\":\"...\",\"applicableLaw\":\"...\",\"userRights\":\"...\",\"procedure\":\"...\",\"oppositionArguments\":[\"...\",\"...\"]}";
    let userPrompt = "Analyze this " # input.lawType # " case: " # input.caseDescription # docContext;
    let body = buildRequestBody(systemPrompt, userPrompt);
    let headers : [OutCall.Header] = [
      { name = "Authorization"; value = "Bearer " # GROQ_API_KEY },
      { name = "Content-Type"; value = "application/json" },
    ];
    let apiResponse = await OutCall.httpPostRequest(GROQ_API_URL, headers, body, transform);
    let content = extractContent(apiResponse);
    {
      caseType = extractStr(content, "caseType");
      applicableLaw = extractStr(content, "applicableLaw");
      userRights = extractStr(content, "userRights");
      procedure = extractStr(content, "procedure");
      oppositionArguments = extractArr(content, "oppositionArguments");
    };
  };

  // API: Practice Mode
  public shared ({ caller = _ }) func practiceMode(input : PracticeModeInput) : async PracticeModeResponse {
    let historyText = joinTexts(input.conversationHistory, " | ");
    let systemPrompt = "You are an opposing lawyer in a " # input.lawType # " case simulation. Only engage with legal arguments. Respond with a single concise counter-argument as plain text. No JSON, no formatting.";
    let userPrompt = if (historyText == "") {
      "Make your opening argument as opposing counsel in this " # input.lawType # " case. Case: " # input.userInput;
    } else {
      "History: " # historyText # " Defense said: " # input.userInput # " Respond as opposing counsel.";
    };
    let body = buildRequestBody(systemPrompt, userPrompt);
    let headers : [OutCall.Header] = [
      { name = "Authorization"; value = "Bearer " # GROQ_API_KEY },
      { name = "Content-Type"; value = "application/json" },
    ];
    let apiResponse = await OutCall.httpPostRequest(GROQ_API_URL, headers, body, transform);
    { counterArgument = extractContent(apiResponse) };
  };

  // API: Get Feedback
  public shared ({ caller = _ }) func getFeedback(input : FeedbackInput) : async FeedbackResponse {
    let conversationText = joinTexts(input.fullConversation, " | ");
    let systemPrompt = "You are a legal coach reviewing a " # input.lawType # " practice session. Respond ONLY with valid compact JSON, no markdown. Format: {\"strengths\":[\"...\",\"...\"],\"weaknesses\":[\"...\",\"...\"],\"suggestions\":[\"...\",\"...\"]}";
    let userPrompt = "Review this " # input.lawType # " session: " # conversationText;
    let body = buildRequestBody(systemPrompt, userPrompt);
    let headers : [OutCall.Header] = [
      { name = "Authorization"; value = "Bearer " # GROQ_API_KEY },
      { name = "Content-Type"; value = "application/json" },
    ];
    let apiResponse = await OutCall.httpPostRequest(GROQ_API_URL, headers, body, transform);
    let content = extractContent(apiResponse);
    {
      strengths = extractArr(content, "strengths");
      weaknesses = extractArr(content, "weaknesses");
      suggestions = extractArr(content, "suggestions");
    };
  };

  // Document management
  public shared ({ caller = _ }) func uploadDocument(_blob : Storage.ExternalBlob, _name : Text) : async () {};

  public shared ({ caller = _ }) func downloadDocument(_name : Text) : async ?Text {
    null;
  };
};
