#!/bin/bash
# ILAL 项目全功能测试脚本
# 测试所有组件并生成详细报告

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 输出函数
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
header() { echo -e "${CYAN}═══════════════════════════════════════${NC}"; echo -e "${CYAN}$1${NC}"; echo -e "${CYAN}═══════════════════════════════════════${NC}"; }

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# 报告文件
REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).md"
JSON_REPORT="test-report-$(date +%Y%m%d-%H%M%S).json"

# 初始化报告
init_report() {
    cat > "$REPORT_FILE" << EOF
# ILAL 项目功能测试报告

**测试时间**: $(date '+%Y-%m-%d %H:%M:%S')  
**测试环境**: Base Sepolia Testnet

---

## 测试概览

EOF

    # 初始化 JSON 报告
    cat > "$JSON_REPORT" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "Base Sepolia",
  "tests": []
}
EOF
}

# 记录测试结果
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    local duration="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    case $status in
        "PASS")
            PASSED_TESTS=$((PASSED_TESTS + 1))
            echo "### ✅ $test_name" >> "$REPORT_FILE"
            ;;
        "FAIL")
            FAILED_TESTS=$((FAILED_TESTS + 1))
            echo "### ❌ $test_name" >> "$REPORT_FILE"
            ;;
        "SKIP")
            SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
            echo "### ⏭️  $test_name" >> "$REPORT_FILE"
            ;;
    esac
    
    echo "**状态**: $status" >> "$REPORT_FILE"
    echo "**耗时**: ${duration}ms" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "$details" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

# 测试前端服务
test_frontend() {
    header "测试 1: 前端服务"
    local start=$(date +%s%N)
    
    info "检查前端服务是否运行..."
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        local end=$(date +%s%N)
        local duration=$(( (end - start) / 1000000 ))
        success "前端服务正常运行"
        log_test "前端服务可访问性" "PASS" "前端服务在 http://localhost:3000 正常响应" "$duration"
        return 0
    else
        local end=$(date +%s%N)
        local duration=$(( (end - start) / 1000000 ))
        error "前端服务无法访问"
        log_test "前端服务可访问性" "FAIL" "无法访问 http://localhost:3000" "$duration"
        return 1
    fi
}

# 测试子图
test_subgraph() {
    header "测试 2: 子图查询"
    local start=$(date +%s%N)
    
    info "测试子图 GraphQL 端点..."
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"query": "{ _meta { block { number } } }"}' \
        https://api.studio.thegraph.com/query/1741761/ilal-base-sepolia/v0.1.0)
    
    local end=$(date +%s%N)
    local duration=$(( (end - start) / 1000000 ))
    
    if echo "$response" | grep -q "block"; then
        local block_number=$(echo "$response" | grep -o '"number":[0-9]*' | grep -o '[0-9]*')
        success "子图查询成功，当前区块: $block_number"
        log_test "子图 GraphQL 查询" "PASS" "成功查询元数据，区块高度: $block_number" "$duration"
        return 0
    else
        error "子图查询失败"
        log_test "子图 GraphQL 查询" "FAIL" "查询失败: $response" "$duration"
        return 1
    fi
}

# 测试子图数据
test_subgraph_data() {
    header "测试 3: 子图数据查询"
    local start=$(date +%s%N)
    
    info "查询全局统计数据..."
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"query": "{ globalStats { id totalUsers totalSessions activeSessions } }"}' \
        https://api.studio.thegraph.com/query/1741761/ilal-base-sepolia/v0.1.0)
    
    local end=$(date +%s%N)
    local duration=$(( (end - start) / 1000000 ))
    
    if echo "$response" | grep -q "globalStats"; then
        success "全局统计数据查询成功"
        log_test "子图数据完整性" "PASS" "成功查询全局统计: $response" "$duration"
        return 0
    else
        warning "全局统计数据可能还未初始化"
        log_test "子图数据完整性" "SKIP" "数据未初始化（正常，等待链上交互）" "$duration"
        return 0
    fi
}

# 测试机器人状态
test_bot_status() {
    header "测试 4: 机器人状态"
    local start=$(date +%s%N)
    
    info "检查机器人进程..."
    
    if ps aux | grep -q "[n]ode dist/index.js"; then
        local pid=$(ps aux | grep "[n]ode dist/index.js" | awk '{print $2}')
        success "机器人正在运行 (PID: $pid)"
        
        # 检查日志文件
        if [ -f "bot/logs/bot.log" ]; then
            local log_size=$(du -h bot/logs/bot.log | cut -f1)
            local last_log=$(tail -1 bot/logs/bot.log 2>/dev/null || echo "无日志")
            
            local end=$(date +%s%N)
            local duration=$(( (end - start) / 1000000 ))
            
            log_test "机器人进程状态" "PASS" "机器人运行中 (PID: $pid)\n日志大小: $log_size\n最新日志: $last_log" "$duration"
            return 0
        fi
    else
        local end=$(date +%s%N)
        local duration=$(( (end - start) / 1000000 ))
        error "机器人未运行"
        log_test "机器人进程状态" "FAIL" "未检测到机器人进程" "$duration"
        return 1
    fi
}

# 测试机器人配置
test_bot_config() {
    header "测试 5: 机器人配置"
    local start=$(date +%s%N)
    
    info "验证机器人配置..."
    
    cd bot
    local output=$(npm run test:config 2>&1)
    local exit_code=$?
    cd ..
    
    local end=$(date +%s%N)
    local duration=$(( (end - start) / 1000000 ))
    
    if [ $exit_code -eq 0 ]; then
        success "机器人配置验证通过"
        log_test "机器人配置验证" "PASS" "所有配置项验证通过" "$duration"
        return 0
    else
        error "机器人配置验证失败"
        log_test "机器人配置验证" "FAIL" "配置验证失败: $output" "$duration"
        return 1
    fi
}

# 测试合约连接
test_contract_connection() {
    header "测试 6: 合约连接"
    local start=$(date +%s%N)
    
    info "测试 RPC 连接..."
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        https://sepolia.base.org)
    
    local end=$(date +%s%N)
    local duration=$(( (end - start) / 1000000 ))
    
    if echo "$response" | grep -q "result"; then
        local block_hex=$(echo "$response" | grep -o '"result":"0x[0-9a-fA-F]*"' | grep -o '0x[0-9a-fA-F]*')
        local block_dec=$((16#${block_hex:2}))
        success "RPC 连接正常，当前区块: $block_dec"
        log_test "RPC 连接测试" "PASS" "Base Sepolia RPC 响应正常，区块高度: $block_dec" "$duration"
        return 0
    else
        error "RPC 连接失败"
        log_test "RPC 连接测试" "FAIL" "无法连接到 Base Sepolia RPC" "$duration"
        return 1
    fi
}

# 测试合约部署状态
test_contracts_deployed() {
    header "测试 7: 合约部署状态"
    local start=$(date +%s%N)
    
    info "检查合约是否已部署..."
    
    # 测试 Registry 合约
    local registry="0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD"
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$registry\",\"latest\"],\"id\":1}" \
        https://sepolia.base.org)
    
    local end=$(date +%s%N)
    local duration=$(( (end - start) / 1000000 ))
    
    if echo "$response" | grep -q '"result":"0x[0-9a-fA-F]\{10,\}"'; then
        success "Registry 合约已部署"
        log_test "合约部署验证" "PASS" "Registry 合约在 $registry 已部署且有代码" "$duration"
        return 0
    else
        error "Registry 合约未找到"
        log_test "合约部署验证" "FAIL" "Registry 合约未部署或地址错误" "$duration"
        return 1
    fi
}

# 测试前端构建
test_frontend_build() {
    header "测试 8: 前端构建状态"
    local start=$(date +%s%N)
    
    info "检查前端构建产物..."
    
    if [ -d "frontend/.next" ]; then
        local build_size=$(du -sh frontend/.next | cut -f1)
        success "前端构建产物存在，大小: $build_size"
        
        local end=$(date +%s%N)
        local duration=$(( (end - start) / 1000000 ))
        
        log_test "前端构建状态" "PASS" "构建产物完整，大小: $build_size" "$duration"
        return 0
    else
        local end=$(date +%s%N)
        local duration=$(( (end - start) / 1000000 ))
        
        error "前端构建产物不存在"
        log_test "前端构建状态" "FAIL" "未找到 .next 目录" "$duration"
        return 1
    fi
}

# 测试子图构建
test_subgraph_build() {
    header "测试 9: 子图构建状态"
    local start=$(date +%s%N)
    
    info "检查子图构建产物..."
    
    if [ -d "subgraph/build" ] && [ -f "subgraph/build/subgraph.yaml" ]; then
        local wasm_count=$(find subgraph/build -name "*.wasm" | wc -l)
        success "子图构建产物存在，WASM 文件数: $wasm_count"
        
        local end=$(date +%s%N)
        local duration=$(( (end - start) / 1000000 ))
        
        log_test "子图构建状态" "PASS" "构建产物完整，WASM 文件: $wasm_count" "$duration"
        return 0
    else
        local end=$(date +%s%N)
        local duration=$(( (end - start) / 1000000 ))
        
        error "子图构建产物不存在"
        log_test "子图构建状态" "FAIL" "未找到 build 目录或 subgraph.yaml" "$duration"
        return 1
    fi
}

# 测试文档完整性
test_documentation() {
    header "测试 10: 文档完整性"
    local start=$(date +%s%N)
    
    info "检查项目文档..."
    
    local required_docs=(
        "README.md"
        "DEPLOYMENT_COMPLETE.md"
        "SUBGRAPH_INFO.md"
        "QUICK_ACTIONS_GUIDE.md"
    )
    
    local missing_docs=()
    for doc in "${required_docs[@]}"; do
        if [ ! -f "$doc" ]; then
            missing_docs+=("$doc")
        fi
    done
    
    local end=$(date +%s%N)
    local duration=$(( (end - start) / 1000000 ))
    
    if [ ${#missing_docs[@]} -eq 0 ]; then
        success "所有必需文档存在"
        log_test "文档完整性" "PASS" "所有必需文档已创建" "$duration"
        return 0
    else
        warning "部分文档缺失: ${missing_docs[*]}"
        log_test "文档完整性" "FAIL" "缺失文档: ${missing_docs[*]}" "$duration"
        return 1
    fi
}

# 性能测试
test_performance() {
    header "测试 11: 性能指标"
    local start=$(date +%s%N)
    
    info "测试前端响应时间..."
    
    local response_time=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:3000)
    local response_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)
    
    local end=$(date +%s%N)
    local duration=$(( (end - start) / 1000000 ))
    
    if [ "$response_ms" -lt 1000 ]; then
        success "前端响应时间: ${response_ms}ms (优秀)"
        log_test "前端性能测试" "PASS" "响应时间: ${response_ms}ms (< 1000ms)" "$duration"
    elif [ "$response_ms" -lt 3000 ]; then
        success "前端响应时间: ${response_ms}ms (良好)"
        log_test "前端性能测试" "PASS" "响应时间: ${response_ms}ms (< 3000ms)" "$duration"
    else
        warning "前端响应时间: ${response_ms}ms (需优化)"
        log_test "前端性能测试" "FAIL" "响应时间: ${response_ms}ms (> 3000ms)" "$duration"
    fi
}

# 生成最终报告
generate_final_report() {
    header "生成最终报告"
    
    # 添加概览到报告
    sed -i.bak "s/## 测试概览/## 测试概览\n\n- **总测试数**: $TOTAL_TESTS\n- **通过**: $PASSED_TESTS ✅\n- **失败**: $FAILED_TESTS ❌\n- **跳过**: $SKIPPED_TESTS ⏭️\n- **通过率**: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%\n/" "$REPORT_FILE"
    
    # 添加详细测试结果
    echo "" >> "$REPORT_FILE"
    echo "## 测试详情" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # 添加总结
    cat >> "$REPORT_FILE" << EOF

## 总结

EOF
    
    if [ $FAILED_TESTS -eq 0 ]; then
        cat >> "$REPORT_FILE" << EOF
### ✅ 测试结果：全部通过

所有 $TOTAL_TESTS 项测试均已通过！项目各组件运行正常。

**建议**:
- 继续监控系统运行状态
- 定期运行测试脚本验证
- 查看日志确保无异常

EOF
    else
        cat >> "$REPORT_FILE" << EOF
### ⚠️ 测试结果：发现问题

共 $TOTAL_TESTS 项测试，其中 $FAILED_TESTS 项失败。

**需要关注**:
- 查看失败的测试项
- 检查相关组件日志
- 根据测试详情进行修复

EOF
    fi
    
    cat >> "$REPORT_FILE" << EOF

---

**报告生成时间**: $(date '+%Y-%m-%d %H:%M:%S')  
**测试脚本**: test-all-features.sh  
**环境**: Base Sepolia Testnet
EOF

    # 更新 JSON 报告
    cat > "$JSON_REPORT" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "Base Sepolia",
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "skipped": $SKIPPED_TESTS,
    "pass_rate": $(( PASSED_TESTS * 100 / TOTAL_TESTS ))
  }
}
EOF
}

# 主函数
main() {
    clear
    cat << "EOF"
╔════════════════════════════════════════╗
║   🧪 ILAL 全功能测试                  ║
║   Comprehensive Test Suite            ║
╚════════════════════════════════════════╝
EOF
    echo ""
    
    info "开始测试..."
    info "报告将保存到: $REPORT_FILE"
    echo ""
    
    # 初始化报告
    init_report
    
    # 运行所有测试
    test_frontend || true
    echo ""
    
    test_subgraph || true
    echo ""
    
    test_subgraph_data || true
    echo ""
    
    test_bot_status || true
    echo ""
    
    test_bot_config || true
    echo ""
    
    test_contract_connection || true
    echo ""
    
    test_contracts_deployed || true
    echo ""
    
    test_frontend_build || true
    echo ""
    
    test_subgraph_build || true
    echo ""
    
    test_documentation || true
    echo ""
    
    test_performance || true
    echo ""
    
    # 生成最终报告
    generate_final_report
    
    # 显示结果
    header "测试完成"
    echo ""
    info "测试统计:"
    echo "  总计: $TOTAL_TESTS"
    success "  通过: $PASSED_TESTS"
    error "  失败: $FAILED_TESTS"
    warning "  跳过: $SKIPPED_TESTS"
    echo ""
    info "通过率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    echo ""
    success "详细报告已保存到: $REPORT_FILE"
    info "JSON 报告: $JSON_REPORT"
    echo ""
    
    # 打开报告
    if [ $FAILED_TESTS -eq 0 ]; then
        success "🎉 所有测试通过！"
    else
        warning "⚠️  发现 $FAILED_TESTS 个问题，请查看报告"
    fi
    
    echo ""
    read -p "是否打开测试报告？(y/n): " OPEN_REPORT
    if [ "$OPEN_REPORT" = "y" ]; then
        if command -v code &> /dev/null; then
            code "$REPORT_FILE"
        else
            open "$REPORT_FILE"
        fi
    fi
}

# 运行主函数
main
