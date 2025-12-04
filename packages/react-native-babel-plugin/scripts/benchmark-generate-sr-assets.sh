#!/bin/bash
#
# Benchmark script for generate-sr-assets.ts
#
# This script tests the performance of the Session Replay asset generation.
# It can optionally create synthetic test files to simulate larger projects.
#
# Usage:
#   ./benchmark-generate-sr-assets.sh [OPTIONS]
#
# Options:
#   --synthetic N    Generate N synthetic test files (default: 0, use existing project)
#   --cleanup        Remove synthetic files after test
#   --runs N         Number of runs to average (default: 1)
#   --help           Show this help message
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$(dirname "$PLUGIN_DIR")")"
EXAMPLE_DIR="$REPO_ROOT/example"
SYNTHETIC_DIR="$EXAMPLE_DIR/src/__synthetic_benchmark__"

# Default options
SYNTHETIC_COUNT=0
CLEANUP=false
RUNS=1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

show_help() {
    head -25 "$0" | tail -20
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --synthetic)
            SYNTHETIC_COUNT="$2"
            shift 2
            ;;
        --cleanup)
            CLEANUP=true
            shift
            ;;
        --runs)
            RUNS="$2"
            shift 2
            ;;
        --help)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            ;;
    esac
done

# Generate synthetic test files
generate_synthetic_files() {
    local count=$1
    print_header "Generating $count synthetic test files"
    
    mkdir -p "$SYNTHETIC_DIR"
    
    # Templates for different file types
    # All templates use inline SVG components with static values for clean benchmark output
    
    local svg_component='import React from "react";
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from "react-native-svg";

export const SyntheticIcon%d = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="grad%d" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#ff0000" />
        <Stop offset="1" stopColor="#0000ff" />
      </LinearGradient>
    </Defs>
    <Circle cx="12" cy="12" r="10" stroke="#333333" strokeWidth="2" fill="url(#grad%d)" />
    <Path d="M12 6v6l4 2" stroke="#333333" strokeWidth="2" strokeLinecap="round" />
    <Rect x="4" y="4" width="4" height="4" fill="#666666" />
  </Svg>
);

export default SyntheticIcon%d;
'

    local regular_component='import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
}

export const SyntheticComponent%d: React.FC<Props> = ({ 
  title, 
  onPress, 
  variant = "primary" 
}) => {
  return (
    <TouchableOpacity 
      style={[styles.container, variant === "secondary" && styles.secondary]} 
      onPress={onPress}
    >
      <View style={styles.inner}>
        <Text style={styles.text}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  secondary: {
    backgroundColor: "#5856D6",
  },
  inner: {
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SyntheticComponent%d;
'

    # Complex SVG component with multiple nested elements (no Text - not supported by transformer)
    local svg_complex_component='import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, G, Polygon, Ellipse, Line, Polyline, Rect } from "react-native-svg";

export const SyntheticComplexSvg%d = () => {
  return (
    <View style={styles.container}>
      <Svg width="100" height="100" viewBox="0 0 100 100">
        <G transform="translate(50, 50)">
          <Circle cx="0" cy="0" r="40" fill="#e0e0e0" stroke="#333333" strokeWidth="2" />
          <Polygon points="0,-30 10,-10 30,-10 15,5 20,25 0,15 -20,25 -15,5 -30,-10 -10,-10" fill="#ffd700" />
          <Ellipse cx="0" cy="20" rx="15" ry="8" fill="#ff6b6b" />
          <Line x1="-20" y1="-20" x2="20" y2="20" stroke="#333333" strokeWidth="1" />
          <Polyline points="-30,30 -20,20 -10,30 0,20 10,30" stroke="#4a90d9" strokeWidth="2" fill="none" />
          <Rect x="-10" y="35" width="20" height="10" fill="#333333" rx="2" />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SyntheticComplexSvg%d;
'

    local progress=0
    local svg_ratio=30  # 30% of files will have SVG content
    
    for i in $(seq 1 $count); do
        local random=$((RANDOM % 100))
        local filename
        local content
        
        if [ $random -lt $svg_ratio ]; then
            # SVG component (30%)
            if [ $((random % 2)) -eq 0 ]; then
                filename="SvgComponent$i.tsx"
                content=$(printf "$svg_component" $i $i $i $i)
            else
                filename="SvgComplexComponent$i.tsx"
                content=$(printf "$svg_complex_component" $i $i)
            fi
        else
            # Regular component (70%)
            filename="Component$i.tsx"
            content=$(printf "$regular_component" $i $i)
        fi
        
        echo "$content" > "$SYNTHETIC_DIR/$filename"
        
        # Show progress every 100 files
        if [ $((i % 100)) -eq 0 ] || [ $i -eq $count ]; then
            printf "\r  Generated %d/%d files..." $i $count
        fi
    done
    
    echo ""
    print_success "Created $count synthetic files in $SYNTHETIC_DIR"
}

# Clean up synthetic files
cleanup_synthetic_files() {
    if [ -d "$SYNTHETIC_DIR" ]; then
        print_header "Cleaning up synthetic files"
        rm -rf "$SYNTHETIC_DIR"
        print_success "Removed $SYNTHETIC_DIR"
    fi
}

# Run the benchmark
# Outputs duration to a temp file so we can display script output AND capture timing
run_benchmark() {
    local run_number=$1
    local duration_file="$2"
    
    echo -e "\n${YELLOW}Run $run_number:${NC}"
    
    # Clear any existing assets
    local assets_dir="$REPO_ROOT/packages/react-native-session-replay/assets"
    if [ -d "$assets_dir" ]; then
        rm -f "$assets_dir"/*.svg "$assets_dir"/assets.bin "$assets_dir"/assets.json 2>/dev/null || true
    fi
    
    # Run the script and capture timing
    local start_time=$(date +%s.%N)
    
    cd "$EXAMPLE_DIR"
    # Run the generate script - output goes directly to terminal
    node "$PLUGIN_DIR/lib/commonjs/cli/generate-sr-assets.js"
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    echo -e "\n  ${GREEN}Benchmark duration: ${duration}s${NC}"
    
    # Write duration to temp file for collection
    echo "$duration" >> "$duration_file"
}

# Main execution
main() {
    print_header "Session Replay Asset Generation Benchmark"
    
    echo "Configuration:"
    echo "  • Synthetic files: $SYNTHETIC_COUNT"
    echo "  • Number of runs: $RUNS"
    echo "  • Cleanup after: $CLEANUP"
    echo "  • Example directory: $EXAMPLE_DIR"
    
    # Step 1: Build the plugin
    print_header "Step 1: Building the babel plugin"
    cd "$PLUGIN_DIR"
    yarn prepare
    print_success "Plugin built successfully"
    
    # Step 2: Generate synthetic files if requested
    if [ $SYNTHETIC_COUNT -gt 0 ]; then
        generate_synthetic_files $SYNTHETIC_COUNT
    fi
    
    # Count total source files
    local total_files=$(find "$EXAMPLE_DIR/src" -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "\n${BLUE}Total source files to process: $total_files${NC}"
    
    # Step 3: Run benchmark
    print_header "Step 3: Running benchmark ($RUNS run(s))"
    
    local total_duration=0
    local durations=()
    local duration_file=$(mktemp)
    
    for run in $(seq 1 $RUNS); do
        run_benchmark $run "$duration_file"
    done
    
    # Read durations from temp file
    while IFS= read -r duration; do
        durations+=("$duration")
        total_duration=$(echo "$total_duration + $duration" | bc)
    done < "$duration_file"
    rm -f "$duration_file"
    
    # Calculate statistics
    local avg_duration=$(echo "scale=3; $total_duration / $RUNS" | bc)
    local files_per_second=$(echo "scale=1; $total_files / $avg_duration" | bc)
    
    # Step 4: Results
    print_header "Results"
    
    echo "Summary:"
    echo "  • Files processed: $total_files"
    echo "  • Number of runs: $RUNS"
    echo "  • Average duration: ${avg_duration}s"
    echo "  • Processing rate: ~${files_per_second} files/second"
    
    if [ $RUNS -gt 1 ]; then
        echo ""
        echo "Individual runs:"
        for i in "${!durations[@]}"; do
            echo "  • Run $((i+1)): ${durations[$i]}s"
        done
    fi
    
    # Estimate scaling
    echo ""
    echo "Estimated times for larger projects:"
    for scale in 1000 2000 5000 10000; do
        local estimated=$(echo "scale=1; $scale / $files_per_second" | bc)
        echo "  • $scale files: ~${estimated}s"
    done
    
    # Step 5: Cleanup if requested
    if [ "$CLEANUP" = true ] && [ $SYNTHETIC_COUNT -gt 0 ]; then
        cleanup_synthetic_files
    fi
    
    print_header "Benchmark Complete"
}

# Handle cleanup on exit if interrupted
trap 'if [ "$CLEANUP" = true ]; then cleanup_synthetic_files; fi' EXIT

# Run main
main

