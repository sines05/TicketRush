package utils

import (
	"errors"
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

// TranslateValidatorError converts validator.ValidationErrors into a user-friendly map
func TranslateValidatorError(err error) map[string]string {
	var ve validator.ValidationErrors
	if errors.As(err, &ve) {
		out := make(map[string]string, len(ve))
		for _, fe := range ve {
			out[fe.Field()] = getErrorMsg(fe)
		}
		return out
	}
	return nil
}

func getErrorMsg(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "Trường này là bắt buộc"
	case "email":
		return "Email không hợp lệ"
	case "min":
		return fmt.Sprintf("Độ dài tối thiểu là %s ký tự", fe.Param())
	case "max":
		return fmt.Sprintf("Độ dài tối đa là %s ký tự", fe.Param())
	case "oneof":
		return fmt.Sprintf("Phải là một trong các giá trị: %s", strings.Join(strings.Split(fe.Param(), " "), ", "))
	}
	return "Giá trị không hợp lệ"
}
