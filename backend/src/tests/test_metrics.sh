#!/bin/bash

# Set your API base URL
API_URL="http://localhost:3000"

echo "1. Logging in as admin..."
TOKEN=$(curl -s -X POST "$API_URL/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marvalero.com","password":"admin123"}' | \
  grep -o '"accessToken":"[^"]*"' | \
  cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "ERROR: Login failed - no token received"
    exit 1
fi

echo "Token obtained: ${TOKEN:0:20}..."

echo -e "\n2. Testing authenticated metrics endpoint..."
curl -X GET "$API_URL/admin/metrics" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo -e "\n3. Testing unauthenticated metrics endpoint..."
curl -X GET "$API_URL/admin/metrics" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n"