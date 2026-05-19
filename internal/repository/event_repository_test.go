package repository

import "testing"

func TestNormalizeLocationFilter(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{name: "hanoi slug", input: "hanoi", expected: "Hà Nội"},
		{name: "danang slug", input: "danang", expected: "Đà Nẵng"},
		{name: "nhatrang slug", input: "nhatrang", expected: "Nha Trang"},
		{name: "hcm slug", input: "hcm", expected: "Hồ Chí Minh"},
		{name: "cantho slug", input: "cantho", expected: "Cần Thơ"},
		{name: "dalat slug", input: "dalat", expected: "Đà Lạt"},
		{name: "real location name", input: "Hà Nội", expected: "Hà Nội"},
		{name: "other is preserved", input: "other", expected: "other"},
		{name: "trimmed slug", input: "  hanoi  ", expected: "Hà Nội"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeLocationFilter(tt.input); got != tt.expected {
				t.Fatalf("normalizeLocationFilter(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}
