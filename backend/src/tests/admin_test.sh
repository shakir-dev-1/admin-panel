#!/bin/bash

# Configuration
BASE_URL="http://localhost:3001/api"
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZWI3NDQ2YS02YjU5LTRkMGYtOTU2NS00MDM3MGUyZWJkODciLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE3NzAwMzkzODgsImV4cCI6MTc3MDEyNTc4OH0.K9LLYSsCG-BPz1oS2jArePoccL_giQIBTwsFXHmtoxg"
TEST_USER_ID="1ee6b383-abd9-4d9f-8a9b-b7fc8fa84001"
TEST_ADMIN_ID="9eb7446a-6b59-4d0f-9565-40370e2ebd87"

# Headers
HEADERS=(-H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json")

echo "=== Testing Admin Endpoints ==="
echo ""

# 1. Ping
echo "1. Testing Ping..."
curl -s -X GET "$BASE_URL/admin/ping" "${HEADERS[@]}"
echo -e "\n"

# 2. Dashboard
echo "2. Testing Dashboard..."
curl -s -X GET "$BASE_URL/admin/dashboard" "${HEADERS[@]}"
echo -e "\n"

# 3. Recent Users
echo "3. Testing Recent Users..."
curl -s -X GET "$BASE_URL/admin/users/recent?limit=5" "${HEADERS[@]}"
echo -e "\n"

# 4. All Users
echo "4. Testing All Users..."
curl -s -X GET "$BASE_URL/admin/users/all" "${HEADERS[@]}"
echo -e "\n"

# 5. Users with Pagination
echo "5. Testing Users Pagination..."
curl -s -X GET "$BASE_URL/admin/users?page=1&limit=5&sortBy=createdAt&sortOrder=desc" "${HEADERS[@]}"
echo -e "\n"

# 6. All Business Users
echo "6. Testing All Business Users..."
curl -s -X GET "$BASE_URL/admin/business/users" "${HEADERS[@]}"
echo -e "\n"

# Save to test results
echo "=== Test Results Summary ===" > test_results.txt
curl -s -X GET "$BASE_URL/admin/ping" "${HEADERS[@]}" >> test_results.txt
echo -e "\n" >> test_results.txt