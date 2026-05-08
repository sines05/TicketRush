package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
	RedisHost         string
	RedisPort         string
	JWTSecret         string
	Port              string
	GoogleClientID    string
	GoogleClientSecret string
	GoogleRedirectURL  string
	FacebookClientID     string
	FacebookClientSecret string
	FacebookRedirectURL  string
	SMTPHost             string
	SMTPPort             string
	SMTPUser             string
	SMTPPass             string
	SMTPFrom             string
}

func LoadConfig() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := &Config{
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnv("DB_PORT", "5432"),
		DBUser:            getEnv("DB_USER", "user"),
		DBPassword:        getEnv("DB_PASSWORD", "password"),
		DBName:            getEnv("DB_NAME", "ticketrush"),
		RedisHost:         getEnv("REDIS_HOST", "localhost"),
		RedisPort:         getEnv("REDIS_PORT", "6379"),
		JWTSecret:         getEnv("JWT_SECRET", "super-secret"),
		Port:              getEnv("PORT", "8080"),
		GoogleClientID:    getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/auth/google/callback"),
		FacebookClientID:     getEnv("FACEBOOK_CLIENT_ID", ""),
		FacebookClientSecret: getEnv("FACEBOOK_CLIENT_SECRET", ""),
		FacebookRedirectURL:  getEnv("FACEBOOK_REDIRECT_URL", "http://localhost:8080/api/v1/auth/facebook/callback"),
		SMTPHost:             getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:             getEnv("SMTP_PORT", "587"),
		SMTPUser:             getEnv("SMTP_USER", ""),
		SMTPPass:             getEnv("SMTP_PASS", ""),
		SMTPFrom:             getEnv("SMTP_FROM", "no-reply@ticketrush.com"),
	}

	if cfg.GoogleClientID == "" || cfg.GoogleClientSecret == "" {
		log.Printf("WARNING: OAuth credentials missing for %s", "Google")
	}
	if cfg.FacebookClientID == "" {
		log.Printf("WARNING: OAuth credentials missing for %s", "Facebook")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
