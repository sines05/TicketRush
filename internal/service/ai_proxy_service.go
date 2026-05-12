package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"ticketrush/internal/config"
)

type AIProxyService interface {
	Chat(message string, userID string, threadID string) (string, string, []interface{}, error)
}

type aiProxyService struct {
	cfg *config.Config
}

func NewAIProxyService(cfg *config.Config) AIProxyService {
	return &aiProxyService{
		cfg: cfg,
	}
}

type chatRequest struct {
	Message  string `json:"message"`
	UserID   string `json:"user_id,omitempty"`
	ThreadID string `json:"thread_id,omitempty"`
}

type chatResponse struct {
	Reply        string        `json:"reply"`
	ThreadID     string        `json:"thread_id"`
	UIComponents []interface{} `json:"ui_components"`
}

func (s *aiProxyService) Chat(message string, userID string, threadID string) (string, string, []interface{}, error) {
	url := fmt.Sprintf("%s/chat", s.cfg.AIAgentURL)

	reqBody := chatRequest{
		Message:  message,
		UserID:   userID,
		ThreadID: threadID,
	}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Secret", s.cfg.InternalSecret)
	if userID != "" {
		req.Header.Set("X-User-ID", userID)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to call AI agent: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", "", nil, fmt.Errorf("AI agent returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var resBody chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&resBody); err != nil {
		return "", "", nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return resBody.Reply, resBody.ThreadID, resBody.UIComponents, nil
}
