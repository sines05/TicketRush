package utils

import (
	"regexp"
	"strings"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

func GenerateSlug(s string) string {
	// Remove accents
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	result, _, _ := transform.String(t, s)

	// To lowercase
	result = strings.ToLower(result)

	// Replace special characters (including đ)
	result = strings.ReplaceAll(result, "đ", "d")
	result = strings.ReplaceAll(result, "Đ", "d")

	// Remove non-alphanumeric characters (except spaces and hyphens)
	reg, _ := regexp.Compile("[^a-z0-9 -]+")
	result = reg.ReplaceAllString(result, "")

	// Replace spaces with hyphens
	result = strings.Join(strings.Fields(result), "-")

	return result
}
