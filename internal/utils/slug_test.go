package utils

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestGenerateSlug(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Hello World", "hello-world"},
		{"Sơn Tùng M-TP", "son-tung-m-tp"},
		{"Chào buổi sáng 2026!", "chao-buoi-sang-2026"},
		{"  Multiple   Spaces  ", "multiple-spaces"},
		{"Đêm nhạc hội", "dem-nhac-hoi"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			assert.Equal(t, tt.expected, GenerateSlug(tt.input))
		})
	}
}
