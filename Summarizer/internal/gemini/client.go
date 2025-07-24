package gemini

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
)

const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"

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

// SummarizeMessages calls the Gemini API and returns a summary
func SummarizeMessages(messages []string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		// Provide a simple fallback summary when API key is not available
		messageCount := len(messages)
		if messageCount == 0 {
			return "No messages to summarize.", nil
		}
		
		// Create a basic summary
		return fmt.Sprintf("Summary: Conversation with %d messages. Topics discussed include general chat and interactions between users. (Detailed AI summary unavailable - Gemini API key not configured)", messageCount), nil
	}

	// Construct the prompt
	combined := strings.Join(messages, "\n")
	prompt := fmt.Sprintf("Summarize the following Discord chat:\n\n%s", combined)

	reqBody := requestBody{
		Contents: []content{
			{Parts: []part{{Text: prompt}}},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %v", err)
	}

	url := fmt.Sprintf("%s?key=%s", geminiEndpoint, apiKey)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request to Gemini failed: %v", err)
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	
	// Add debugging to see what Gemini returns
	fmt.Printf("Gemini response status: %d\n", resp.StatusCode)
	fmt.Printf("Gemini response body: %s\n", string(body))

	var result responseBody
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to parse Gemini response: %v", err)
	}

	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no summary returned from Gemini")
	}

	return result.Candidates[0].Content.Parts[0].Text, nil
}
 