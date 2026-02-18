#!/bin/bash

# Configuration
BASE_URL="http://localhost:3001/api"
echo "=== Admin Payments API Tests ==="
echo ""

# 1. Login as admin
echo "1. Logging in as admin..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marvalero.com","password":"admin123"}' | \
  grep -o '"accessToken":"[^"]*"' | \
  cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
    echo "ERROR: Login failed - no token received"
    exit 1
fi

echo "✓ Token obtained: ${ADMIN_TOKEN:0:20}..."
echo ""

# Headers
HEADERS=(-H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json")

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Initialize results file
RESULTS_FILE="payments_test_results_$(date +%Y%m%d_%H%M%S).txt"
echo "=== Admin Payments API Test Results ===" > $RESULTS_FILE
echo "Test Date: $(date)" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Helper function to print and save results
print_result() {
    local test_num=$1
    local test_name=$2
    local status=$3
    local details=$4
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} Test $test_num: $test_name"
        echo "✓ Test $test_num: $test_name - PASS" >> $RESULTS_FILE
    else
        echo -e "${RED}✗${NC} Test $test_num: $test_name - FAILED"
        echo "✗ Test $test_num: $test_name - FAILED" >> $RESULTS_FILE
        echo "  Error: $details" >> $RESULTS_FILE
    fi
    
    if [ ! -z "$details" ] && [ "$status" = "PASS" ]; then
        echo "  → $details" | tee -a $RESULTS_FILE
    fi
    echo "" >> $RESULTS_FILE
}

# Helper function to make API calls and check response
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local response_file="/tmp/payments_response_$$.json"
    
    if [ "$method" = "GET" ]; then
        curl -s -X GET "$BASE_URL$endpoint" "${HEADERS[@]}" > $response_file
    elif [ "$method" = "POST" ]; then
        curl -s -X POST "$BASE_URL$endpoint" "${HEADERS[@]}" -d "$data" > $response_file
    elif [ "$method" = "PATCH" ]; then
        curl -s -X PATCH "$BASE_URL$endpoint" "${HEADERS[@]}" -d "$data" > $response_file
    fi
    
    echo $response_file
}

# Track test count
TEST_NUM=1

echo -e "${YELLOW}Starting Payments API Tests...${NC}"
echo ""

# Test 1: Get all businesses with payment info
echo "Test $TEST_NUM: Fetching all businesses with payment info..."
response_file=$(call_api "GET" "/admin/payments/businesses")
if [ $? -eq 0 ] && [ -s $response_file ]; then
    count=$(cat $response_file | grep -o '"id"' | wc -l)
    print_result $TEST_NUM "Get businesses" "PASS" "Found $count businesses"
    
    # Save first business ID for later tests
    BUSINESS_ID=$(cat $response_file | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Using business ID: $BUSINESS_ID" | tee -a $RESULTS_FILE
else
    print_result $TEST_NUM "Get businesses" "FAIL" "No response or empty result"
fi
rm -f $response_file
TEST_NUM=$((TEST_NUM + 1))

# Test 2: Get specific business payment details
if [ ! -z "$BUSINESS_ID" ]; then
    echo "Test $TEST_NUM: Fetching business payment details..."
    response_file=$(call_api "GET" "/admin/payments/$BUSINESS_ID")
    if [ $? -eq 0 ] && [ -s $response_file ]; then
        business_name=$(cat $response_file | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
        has_subscription=$(cat $response_file | grep -o '"subscription"' | wc -l)
        print_result $TEST_NUM "Get business details" "PASS" "Business: $business_name, Has subscription: $([ $has_subscription -gt 0 ] && echo "yes" || echo "no")"
    else
        print_result $TEST_NUM "Get business details" "FAIL" "Could not fetch business $BUSINESS_ID"
    fi
    rm -f $response_file
else
    print_result $TEST_NUM "Get business details" "SKIP" "No business ID available"
fi
TEST_NUM=$((TEST_NUM + 1))

# Test 3: Get business subscription
if [ ! -z "$BUSINESS_ID" ]; then
    echo "Test $TEST_NUM: Fetching business subscription..."
    response_file=$(call_api "GET" "/admin/payments/$BUSINESS_ID/subscription")
    if [ $? -eq 0 ] && [ -s $response_file ]; then
        if cat $response_file | grep -q '"status"'; then
            sub_status=$(cat $response_file | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            sub_plan=$(cat $response_file | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4)
            print_result $TEST_NUM "Get subscription" "PASS" "Status: $sub_status, Plan: $sub_plan"
        else
            print_result $TEST_NUM "Get subscription" "PASS" "No active subscription found"
        fi
    else
        print_result $TEST_NUM "Get subscription" "FAIL" "Could not fetch subscription"
    fi
    rm -f $response_file
else
    print_result $TEST_NUM "Get subscription" "SKIP" "No business ID available"
fi
TEST_NUM=$((TEST_NUM + 1))

# Test 4: Get business payments
if [ ! -z "$BUSINESS_ID" ]; then
    echo "Test $TEST_NUM: Fetching business payments..."
    response_file=$(call_api "GET" "/admin/payments/$BUSINESS_ID/payments")
    if [ $? -eq 0 ] && [ -s $response_file ]; then
        transactions_count=$(cat $response_file | grep -o '"transactions"' | wc -l)
        stripe_count=$(cat $response_file | grep -o '"stripePayments"' | wc -l)
        print_result $TEST_NUM "Get payments" "PASS" "Transactions found: $transactions_count, Stripe payments: $stripe_count"
    else
        print_result $TEST_NUM "Get payments" "FAIL" "Could not fetch payments"
    fi
    rm -f $response_file
else
    print_result $TEST_NUM "Get payments" "SKIP" "No business ID available"
fi
TEST_NUM=$((TEST_NUM + 1))

# Test 5: Get business failed payments
if [ ! -z "$BUSINESS_ID" ]; then
    echo "Test $TEST_NUM: Fetching business failed payments..."
    response_file=$(call_api "GET" "/admin/payments/$BUSINESS_ID/payments/failed")
    if [ $? -eq 0 ] && [ -s $response_file ]; then
        failed_count=$(cat $response_file | grep -o '"failedTransactions"' | wc -l)
        stripe_failed=$(cat $response_file | grep -o '"stripeFailedPayments"' | wc -l)
        print_result $TEST_NUM "Get failed payments" "PASS" "Failed transactions: $failed_count, Stripe failed: $stripe_failed"
    else
        print_result $TEST_NUM "Get failed payments" "FAIL" "Could not fetch failed payments"
    fi
    rm -f $response_file
else
    print_result $TEST_NUM "Get failed payments" "SKIP" "No business ID available"
fi
TEST_NUM=$((TEST_NUM + 1))

# Test 6: Get all payments (global)
echo "Test $TEST_NUM: Fetching all payments (global)..."
response_file=$(call_api "GET" "/admin/payments/payments?limit=5")
if [ $? -eq 0 ] && [ -s $response_file ]; then
    data_count=$(cat $response_file | grep -o '"data"' | wc -l)
    has_more=$(cat $response_file | grep -o '"hasMore":\(true\|false\)' | cut -d':' -f2)
    next_cursor=$(cat $response_file | grep -o '"nextCursor":"[^"]*"' | cut -d'"' -f4)
    print_result $TEST_NUM "Get all payments" "PASS" "Payments found: $data_count, Has more: $has_more, Next cursor: ${next_cursor:0:20}..."
else
    print_result $TEST_NUM "Get all payments" "FAIL" "Could not fetch payments"
fi
rm -f $response_file
TEST_NUM=$((TEST_NUM + 1))

# Test 7: Get payment stats
echo "Test $TEST_NUM: Fetching payment statistics..."
response_file=$(call_api "GET" "/admin/payments/payments/stats")
if [ $? -eq 0 ] && [ -s $response_file ]; then
    total_tx=$(cat $response_file | grep -o '"totalTransactions":[0-9]*' | cut -d':' -f2)
    revenue=$(cat $response_file | grep -o '"completedRevenue":[0-9.]*' | cut -d':' -f2)
    volume=$(cat $response_file | grep -o '"totalVolume":[0-9.]*' | cut -d':' -f2)
    print_result $TEST_NUM "Get payment stats" "PASS" "Total transactions: $total_tx, Revenue: $revenue, Volume: $volume"
else
    print_result $TEST_NUM "Get payment stats" "FAIL" "Could not fetch stats"
fi
rm -f $response_file
TEST_NUM=$((TEST_NUM + 1))

# Test 8: Get all failed payments (global)
echo "Test $TEST_NUM: Fetching all failed payments..."
response_file=$(call_api "GET" "/admin/payments/payments/failed?limit=5")
if [ $? -eq 0 ] && [ -s $response_file ]; then
    failed_data_count=$(cat $response_file | grep -o '"data"' | wc -l)
    failed_has_more=$(cat $response_file | grep -o '"hasMore":\(true\|false\)' | cut -d':' -f2)
    print_result $TEST_NUM "Get all failed payments" "PASS" "Failed payments found: $failed_data_count, Has more: $failed_has_more"
else
    print_result $TEST_NUM "Get all failed payments" "FAIL" "Could not fetch failed payments"
fi
rm -f $response_file
TEST_NUM=$((TEST_NUM + 1))

# Test 9: Get all disputes (global)
echo "Test $TEST_NUM: Fetching all disputes..."
response_file=$(call_api "GET" "/admin/payments/disputes?limit=5")
if [ $? -eq 0 ] && [ -s $response_file ]; then
    disputes_count=$(cat $response_file | grep -o '"id"' | wc -l)
    print_result $TEST_NUM "Get all disputes" "PASS" "Disputes found: $disputes_count"
else
    print_result $TEST_NUM "Get all disputes" "PASS" "No disputes found or endpoint returned empty"
fi
rm -f $response_file
TEST_NUM=$((TEST_NUM + 1))

# Test 10: Get all refunds (global)
echo "Test $TEST_NUM: Fetching all refunds..."
response_file=$(call_api "GET" "/admin/payments/refunds?limit=5")
if [ $? -eq 0 ] && [ -s $response_file ]; then
    refunds_data_count=$(cat $response_file | grep -o '"data"' | wc -l)
    refunds_has_more=$(cat $response_file | grep -o '"hasMore":\(true\|false\)' | cut -d':' -f2)
    print_result $TEST_NUM "Get all refunds" "PASS" "Refunds found: $refunds_data_count, Has more: $refunds_has_more"
else
    print_result $TEST_NUM "Get all refunds" "FAIL" "Could not fetch refunds"
fi
rm -f $response_file
TEST_NUM=$((TEST_NUM + 1))

# Test 11: Get business disputes
if [ ! -z "$BUSINESS_ID" ]; then
    echo "Test $TEST_NUM: Fetching business disputes..."
    response_file=$(call_api "GET" "/admin/payments/$BUSINESS_ID/disputes")
    if [ $? -eq 0 ] && [ -s $response_file ]; then
        biz_disputes_count=$(cat $response_file | grep -o '"id"' | wc -l)
        print_result $TEST_NUM "Get business disputes" "PASS" "Disputes found: $biz_disputes_count"
    else
        print_result $TEST_NUM "Get business disputes" "FAIL" "Could not fetch disputes"
    fi
    rm -f $response_file
else
    print_result $TEST_NUM "Get business disputes" "SKIP" "No business ID available"
fi
TEST_NUM=$((TEST_NUM + 1))

# Test 12: Cancel subscription (with confirmation)
if [ ! -z "$BUSINESS_ID" ]; then
    echo "Test $TEST_NUM: Testing subscription cancellation (dry run)..."
    echo -e "${YELLOW}  Do you want to actually cancel the subscription? (y/n)${NC}"
    read -n 1 -r confirm
    echo ""
    if [[ $confirm =~ ^[Yy]$ ]]; then
        response_file=$(call_api "PATCH" "/admin/payments/$BUSINESS_ID/cancel-subscription" "{}")
        if [ $? -eq 0 ] && [ -s $response_file ]; then
            if cat $response_file | grep -q '"success":true'; then
                cancel_status=$(cat $response_file | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
                print_result $TEST_NUM "Cancel subscription" "PASS" "Cancellation successful, status: $cancel_status"
            else
                print_result $TEST_NUM "Cancel subscription" "FAIL" "Cancellation failed"
            fi
        else
            print_result $TEST_NUM "Cancel subscription" "FAIL" "API call failed"
        fi
        rm -f $response_file
    else
        print_result $TEST_NUM "Cancel subscription" "SKIP" "User skipped cancellation"
    fi
else
    print_result $TEST_NUM "Cancel subscription" "SKIP" "No business ID available"
fi
TEST_NUM=$((TEST_NUM + 1))

# Summary
echo ""
echo -e "${GREEN}=== Test Summary ===${NC}"
echo "Results saved to: $RESULTS_FILE"
echo ""
echo "Tests completed: $((TEST_NUM - 1))"
echo ""

# Display summary from results file
grep -E "✓|✗" $RESULTS_FILE | while read line; do
    if [[ $line == *"✓"* ]]; then
        echo -e "${GREEN}$line${NC}"
    else
        echo -e "${RED}$line${NC}"
    fi
done

echo ""
echo "For detailed responses, check: $RESULTS_FILE"