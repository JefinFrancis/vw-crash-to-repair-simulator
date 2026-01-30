#!/usr/bin/env python3
"""
VW Project Task Manager
A Python utility to manage the project's Kanban board tasks.
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional

class TaskManager:
    def __init__(self, tasks_file: str = "tasks.json", board_file: str = "PROJECT_BOARD.md"):
        self.tasks_file = tasks_file
        self.board_file = board_file
        self.data = self.load_tasks()
    
    def load_tasks(self) -> Dict:
        """Load tasks from JSON file."""
        try:
            with open(self.tasks_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"❌ Error: {self.tasks_file} not found!")
            sys.exit(1)
    
    def save_tasks(self):
        """Save tasks to JSON file."""
        self.update_statistics()
        self.data['project']['lastUpdated'] = datetime.now().strftime("%Y-%m-%d")
        
        with open(self.tasks_file, 'w') as f:
            json.dump(self.data, f, indent=2)
        print(f"✅ Tasks saved to {self.tasks_file}")
    
    def update_statistics(self):
        """Update project statistics."""
        stats = {
            'totalTasks': 0,
            'completedTasks': 0,
            'inProgressTasks': 0,
            'todoTasks': 0,
            'backlogTasks': 0,
            'totalEstimatedHours': 0,
            'completedHours': 0,
            'remainingHours': 0
        }
        
        for column in self.data['columns'].values():
            for task in column['tasks']:
                stats['totalTasks'] += 1
                
                if task['status'] == 'done':
                    stats['completedTasks'] += 1
                    stats['completedHours'] += task.get('actualHours', task.get('estimatedHours', 0))
                elif task['status'] == 'inProgress':
                    stats['inProgressTasks'] += 1
                elif task['status'] == 'todo':
                    stats['todoTasks'] += 1
                elif task['status'] == 'backlog':
                    stats['backlogTasks'] += 1
                
                stats['totalEstimatedHours'] += task.get('estimatedHours', 0)
        
        stats['remainingHours'] = stats['totalEstimatedHours'] - stats['completedHours']
        self.data['statistics'] = stats
    
    def add_task(self, title: str, description: str, priority: str = "medium", 
                estimated_hours: int = 4, labels: List[str] = None, 
                assignee: str = None, status: str = "todo") -> str:
        """Add a new task."""
        if labels is None:
            labels = []
        
        # Generate task ID
        existing_ids = []
        for column in self.data['columns'].values():
            for task in column['tasks']:
                if task['id'].startswith('TASK-'):
                    try:
                        num = int(task['id'].split('-')[1])
                        existing_ids.append(num)
                    except:
                        pass
        
        new_id = f"TASK-{max(existing_ids, default=0) + 1:03d}"
        
        new_task = {
            "id": new_id,
            "title": title,
            "description": description,
            "priority": priority.lower(),
            "estimatedHours": estimated_hours,
            "labels": labels,
            "assignee": assignee,
            "createdDate": datetime.now().strftime("%Y-%m-%d"),
            "dueDate": None,
            "dependencies": [],
            "status": status.lower()
        }
        
        # Add to appropriate column
        self.data['columns'][status]['tasks'].append(new_task)
        print(f"✅ Task {new_id} added: {title}")
        return new_id
    
    def move_task(self, task_id: str, new_status: str) -> bool:
        """Move a task to a different status."""
        task = self.find_task(task_id)
        if not task:
            print(f"❌ Task {task_id} not found!")
            return False
        
        # Remove from current column
        for column in self.data['columns'].values():
            column['tasks'] = [t for t in column['tasks'] if t['id'] != task_id]
        
        # Update task status
        task['status'] = new_status.lower()
        
        # Add completion date if moving to done
        if new_status.lower() == 'done':
            task['completedDate'] = datetime.now().strftime("%Y-%m-%d")
        
        # Add to new column
        self.data['columns'][new_status]['tasks'].append(task)
        print(f"✅ Task {task_id} moved to {new_status}")
        return True
    
    def find_task(self, task_id: str) -> Optional[Dict]:
        """Find a task by ID."""
        for column in self.data['columns'].values():
            for task in column['tasks']:
                if task['id'] == task_id:
                    return task
        return None
    
    def list_tasks(self, status: str = None):
        """List all tasks or tasks with specific status."""
        if status:
            if status in self.data['columns']:
                tasks = self.data['columns'][status]['tasks']
                print(f"\n📋 Tasks in {status.upper()}:")
                for task in tasks:
                    self.print_task(task)
            else:
                print(f"❌ Invalid status: {status}")
        else:
            print("\n📋 ALL TASKS:")
            for column_name, column in self.data['columns'].items():
                if column['tasks']:
                    print(f"\n{column['icon']} {column['name']}:")
                    for task in column['tasks']:
                        self.print_task(task)
    
    def print_task(self, task: Dict):
        """Print task information."""
        priority_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(task.get('priority'), '⚪')
        print(f"  {priority_emoji} {task['id']}: {task['title']}")
        print(f"      📝 {task['description']}")
        if task.get('labels'):
            print(f"      🏷️  {', '.join(task['labels'])}")
        if task.get('estimatedHours'):
            print(f"      ⏱️  {task['estimatedHours']}h estimated")
        print()
    
    def show_statistics(self):
        """Show project statistics."""
        self.update_statistics()
        stats = self.data['statistics']
        
        print("\n📊 PROJECT STATISTICS")
        print("=" * 30)
        print(f"Total Tasks:     {stats['totalTasks']}")
        print(f"✅ Completed:    {stats['completedTasks']}")
        print(f"🚧 In Progress:  {stats['inProgressTasks']}")
        print(f"🔄 To Do:        {stats['todoTasks']}")
        print(f"📋 Backlog:      {stats['backlogTasks']}")
        print(f"⏱️  Total Hours:   {stats['totalEstimatedHours']}")
        print(f"✅ Done Hours:   {stats['completedHours']}")
        print(f"⏳ Remaining:    {stats['remainingHours']}")


def main():
    """Main CLI interface."""
    manager = TaskManager()
    
    if len(sys.argv) < 2:
        print("🚗 VW Project Task Manager")
        print("\nUsage:")
        print("  python task_manager.py <command> [args]")
        print("\nCommands:")
        print("  list [status]           - List all tasks or tasks with specific status")
        print("  add <title>            - Add a new task (interactive)")
        print("  move <task_id> <status> - Move task to new status")
        print("  stats                  - Show project statistics")
        print("  find <task_id>         - Find and display a specific task")
        print("\nStatuses: todo, inProgress, review, done, backlog")
        return
    
    command = sys.argv[1].lower()
    
    if command == "list":
        status = sys.argv[2] if len(sys.argv) > 2 else None
        manager.list_tasks(status)
    
    elif command == "add":
        if len(sys.argv) < 3:
            print("❌ Please provide task title")
            return
        
        title = " ".join(sys.argv[2:])
        print(f"Adding task: {title}")
        description = input("Description: ")
        priority = input("Priority (low/medium/high) [medium]: ") or "medium"
        try:
            hours = int(input("Estimated hours [4]: ") or "4")
        except:
            hours = 4
        labels = input("Labels (comma-separated): ").split(",") if input("Labels (comma-separated): ") else []
        labels = [l.strip() for l in labels if l.strip()]
        
        manager.add_task(title, description, priority, hours, labels)
        manager.save_tasks()
    
    elif command == "move":
        if len(sys.argv) < 4:
            print("❌ Usage: move <task_id> <new_status>")
            return
        
        task_id = sys.argv[2].upper()
        new_status = sys.argv[3].lower()
        
        if manager.move_task(task_id, new_status):
            manager.save_tasks()
    
    elif command == "stats":
        manager.show_statistics()
    
    elif command == "find":
        if len(sys.argv) < 3:
            print("❌ Usage: find <task_id>")
            return
        
        task_id = sys.argv[2].upper()
        task = manager.find_task(task_id)
        if task:
            print(f"\n📋 Task {task_id}:")
            manager.print_task(task)
        else:
            print(f"❌ Task {task_id} not found!")
    
    else:
        print(f"❌ Unknown command: {command}")


if __name__ == "__main__":
    main()