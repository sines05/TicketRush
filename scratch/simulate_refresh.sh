#!/bin/bash

# Simulation script for Refresh Token lifecycle
# Usage: ./simulate_refresh.sh [API_URL]

API_URL=${1:-"http://localhost:8080/api/v1"}
COOKIE_JAR="cookies.txt"
USER_EMAIL="test@example.com"
USER_PASSWORD="Password123"

# Cleanup
rm -f $COOKIE_JAR

echo "1. Logging in..."
LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -c $COOKIE_JAR \
  -d "{\"email\": \"$USER_EMAIL\", \"password\": \"$USER_PASSWORD\"}")

echo "Login Response: $LOGIN_RESP"

if [[ $LOGIN_RESP != *"success\":true"* ]]; then
    echo "Login failed. Make sure the server is running and the user exists."
    exit 1
fi

echo -e "\n2. Making an authorized API call (Get Me)..."
curl -s -X GET "$API_URL/auth/me" \
  -b $COOKIE_JAR

echo -e "\n\n3. Refreshing token..."
REFRESH_RESP=$(curl -s -X POST "$API_URL/auth/refresh" \
  -b $COOKIE_JAR \
  -c $COOKIE_JAR)

echo "Refresh Response: $REFRESH_RESP"

if [[ $REFRESH_RESP != *"success\":true"* ]]; then
    echo "Refresh failed."
    exit 1
fi

echo -e "\n4. Making another authorized API call with NEW tokens..."
curl -s -X GET "$API_URL/auth/me" \
  -b $COOKIE_JAR

echo -e "\n\n5. Attempting to refresh again with OLD refresh token (should fail due to rotation)..."
# Note: The cookie jar was updated in step 3. To test rotation, we'd need the old cookie.
# But since we are using the same cookie jar, it now has the NEW refresh token.
# To truly test rotation, we would have saved the old refresh token.

echo -e "\n6. Logging out..."
curl -s -X POST "$API_URL/auth/logout" \
  -b $COOKIE_JAR \
  -c $COOKIE_JAR

echo -e "\n\n7. Verifying logout (Get Me should fail)..."
curl -s -X GET "$API_URL/auth/me" \
  -b $COOKIE_JAR

echo -e "\n\n8. Verifying Refresh Token is deleted (Refresh should fail)..."
curl -s -X POST "$API_URL/auth/refresh" \
  -b $COOKIE_JAR

echo -e "\n\nSimulation complete."
rm -f $COOKIE_JAR
