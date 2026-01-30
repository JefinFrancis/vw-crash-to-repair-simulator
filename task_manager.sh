#!/bin/bash

# VW Project - Task Management Utilities
# This script provides utilities for managing the project kanban board

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display current project status
show_status() {
    echo -e "${BLUE}=== VW Crash-to-Repair Simulator - Project Status ===${NC}"
    echo ""
    
    # Parse JSON and show statistics
    if command -v jq &> /dev/null; then
        TOTAL=$(jq -r '.statistics.totalTasks' tasks.json)
        COMPLETED=$(jq -r '.statistics.completedTasks' tasks.json)
        IN_PROGRESS=$(jq -r '.statistics.inProgressTasks' tasks.json)
        TODO=$(jq -r '.statistics.todoTasks' tasks.json)
        BACKLOG=$(jq -r '.statistics.backlogTasks' tasks.json)
        
        echo -e "${GREEN}✅ Completed: $COMPLETED${NC}"
        echo -e "${YELLOW}🚧 In Progress: $IN_PROGRESS${NC}"
        echo -e "${BLUE}🔄 To Do: $TODO${NC}"
        echo -e "${RED}📋 Backlog: $BACKLOG${NC}"
        echo -e "📊 Total Tasks: $TOTAL"
    else
        echo "Install 'jq' for detailed statistics: sudo apt install jq"
    fi
    
    echo ""
    echo "📝 View full board: cat PROJECT_BOARD.md"
    echo "📊 View task data: cat tasks.json | jq ."
}

# Function to add a new task
add_task() {
    echo -e "${BLUE}Adding new task...${NC}"
    echo "Task title:"
    read title
    echo "Task description:"
    read description
    echo "Priority (low/medium/high):"
    read priority
    echo "Estimated hours:"
    read hours
    echo "Labels (comma-separated):"
    read labels
    
    # Generate task ID
    TASK_ID="TASK-$(date +%s | tail -c 4)"
    
    echo ""
    echo -e "${GREEN}Task $TASK_ID created!${NC}"
    echo "Don't forget to update both PROJECT_BOARD.md and tasks.json"
}

# Function to move task to different status
move_task() {
    echo -e "${BLUE}Moving task...${NC}"
    echo "Task ID:"
    read task_id
    echo "New status (todo/inProgress/review/done/backlog):"
    read new_status
    
    echo -e "${YELLOW}Please manually update the task status in both files${NC}"
}

# Function to show help
show_help() {
    echo -e "${BLUE}VW Project Task Manager${NC}"
    echo ""
    echo "Usage: ./task_manager.sh [command]"
    echo ""
    echo "Commands:"
    echo "  status    - Show current project status"
    echo "  add       - Add a new task"
    echo "  move      - Move task between columns"
    echo "  help      - Show this help message"
    echo ""
    echo "Files:"
    echo "  PROJECT_BOARD.md  - Human-readable Kanban board"
    echo "  tasks.json        - Machine-readable task data"
}

# Main script logic
case $1 in
    "status")
        show_status
        ;;
    "add")
        add_task
        ;;
    "move")
        move_task
        ;;
    "help")
        show_help
        ;;
    *)
        show_status
        ;;
esac