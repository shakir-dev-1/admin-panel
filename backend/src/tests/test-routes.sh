#!/bin/bash
echo "=== Testing Marvalero Admin Backend ==="

# Test 1: Public test log endpoint
echo -e "\n1. Testing public endpoint:"
curl -X GET http://localhost:3000/admin/auth/test-log

# Test 2: Admin login
echo -e "\n\n2. Testing admin login:"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@marvalero.com", "password": "admin123"}')

echo "Login response: $LOGIN_RESPONSE"

# Extract token from response - FIXED: looking for "accessToken" instead of "access_token"
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Alternative: use jq if available (more reliable)
# TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Trying alternative extraction..."
  # Try alternative pattern without quotes
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o 'accessToken":"[^"]*"' | cut -d'"' -f2)
  
  if [ -z "$TOKEN" ]; then
    echo "Still failed to get token. Response was:"
    echo "$LOGIN_RESPONSE"
    echo "Please check the response format and update the extraction pattern."
    exit 1
  fi
fi

echo -e "\nToken extracted: ${TOKEN:0:30}..."

# Test 3: Protected ping endpoint
echo -e "\n3. Testing protected ping endpoint:"
curl -X GET http://localhost:3000/admin/ping \
  -H "Authorization: Bearer $TOKEN"

# Test 4: Protected dashboard endpoint
echo -e "\n\n4. Testing protected dashboard endpoint:"
curl -X GET http://localhost:3000/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Test 5: Protected dashboard endpoint
echo -e "\n\n5. Testing protected dashboard endpoint with invalid token:"
curl -X GET http://localhost:3000/admin/dashboard \
  -H "Authorization: Bearer $TOKEN-invalid"

echo -e "\n\n=== Tests completed ==="