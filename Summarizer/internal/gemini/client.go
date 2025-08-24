package gemini

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const defaultModel = "gemini-1.5-flash-latest"

func endpointForModel(model string) string {
	return fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", model)
}

type part struct {
	Text string `json:"text"`
}

type content struct {
	Parts []part `json:"parts"`
}

type requestBody struct {
	Contents []content `json:"contents"`
}

type candidate struct {
	Content content `json:"content"`
}

type responseBody struct {
	Candidates []candidate `json:"candidates"`
}

type errorPayload struct {
	Error struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
	} `json:"error"`
}

// buildFallbackSummary creates a basic summary without AI
func buildFallbackSummary(messages []string, reason string) string {
	count := len(messages)
	if count == 0 {
		return "No messages to summarize."
	}
	// Include up to the first 2 lines as a hint
	previewLines := 2
	if count < previewLines {
		previewLines = count
	}
	preview := strings.Join(messages[:previewLines], " \n")
	if reason != "" {
		reason = "; " + reason
	}
	return fmt.Sprintf("Summary: Conversation with %d messages. Preview: %s%s (AI summary unavailable)", count, preview, reason)
}

// SummarizeMessages calls the Gemini API and returns a summary. On API issues, returns a safe fallback string instead of an error.
func SummarizeMessages(messages []string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = defaultModel
	}

	// If no API key, return a deterministic fallback
	if apiKey == "" {
		return buildFallbackSummary(messages, "Gemini API key not configured"), nil
	}

	combined := strings.Join(messages, "\n")
	prompt := fmt.Sprintf("Summarize the following Discord chat in a few concise bullet points, include key topics and decisions:\n\n%s", combined)

	reqBody := requestBody{Contents: []content{{Parts: []part{{Text: prompt}}}}}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		// Return fallback rather than error to avoid failing the gRPC call
		return buildFallbackSummary(messages, "request marshal failed"), nil
	}

	url := fmt.Sprintf("%s?key=%s", endpointForModel(model), apiKey)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return buildFallbackSummary(messages, "failed to create request"), nil
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return buildFallbackSummary(messages, "request to Gemini failed"), nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	// If HTTP error, try to parse and fallback
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var ep errorPayload
		_ = json.Unmarshal(body, &ep)
		reason := resp.Status
		if ep.Error.Message != "" {
			reason = ep.Error.Message
		}
		return buildFallbackSummary(messages, reason), nil
	}

	var result responseBody
	if err := json.Unmarshal(body, &result); err != nil {
		return buildFallbackSummary(messages, "failed to parse Gemini response"), nil
	}

	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return buildFallbackSummary(messages, "no content returned"), nil
	}

	return result.Candidates[0].Content.Parts[0].Text, nil
}
 