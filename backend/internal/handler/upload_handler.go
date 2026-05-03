package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"ticketrush/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

type uploadResponse struct {
	URL string `json:"url"`
}

func (h *UploadHandler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "Thiếu file upload (field: file)", "MISSING_FILE")
		return
	}

	// Minimal safety: limit size and allow only common image types.
	const maxBytes = 5 * 1024 * 1024 // 5MB
	if file.Size <= 0 || file.Size > maxBytes {
		utils.SendError(c, http.StatusBadRequest, "File quá lớn (tối đa 5MB)", "FILE_TOO_LARGE")
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp":
	default:
		utils.SendError(c, http.StatusBadRequest, "Định dạng ảnh không hỗ trợ (jpg, png, webp)", "UNSUPPORTED_FILE_TYPE")
		return
	}

	if err := os.MkdirAll("uploads", 0o755); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Không tạo được thư mục uploads", "UPLOAD_FAILED")
		return
	}

	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	dstPath := filepath.Join("uploads", filename)
	if err := c.SaveUploadedFile(file, dstPath); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Lưu file thất bại", "UPLOAD_FAILED")
		return
	}

	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	url := fmt.Sprintf("%s://%s/uploads/%s", scheme, c.Request.Host, filename)

	utils.SendSuccess(c, http.StatusOK, uploadResponse{URL: url}, "Thành công")
}
