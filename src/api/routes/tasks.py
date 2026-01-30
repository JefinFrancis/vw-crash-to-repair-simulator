# Task Management Routes
# Routes for project task management and Kanban board

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

router = APIRouter()

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent.parent

@router.get("/tasks")
async def get_tasks():
    """Get all tasks from the task management system."""
    try:
        tasks_file = PROJECT_ROOT / "tasks.json"
        with open(tasks_file, 'r') as f:
            data = json.load(f)
        return JSONResponse(content=data)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Tasks file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid tasks file format")

@router.get("/tasks/statistics")
async def get_task_statistics():
    """Get task statistics."""
    try:
        tasks_file = PROJECT_ROOT / "tasks.json"
        with open(tasks_file, 'r') as f:
            data = json.load(f)
        return JSONResponse(content=data.get('statistics', {}))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Tasks file not found")

@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Get a specific task by ID."""
    try:
        tasks_file = PROJECT_ROOT / "tasks.json"
        with open(tasks_file, 'r') as f:
            data = json.load(f)
        
        # Find task in all columns
        for column in data['columns'].values():
            for task in column['tasks']:
                if task['id'] == task_id:
                    return JSONResponse(content=task)
        
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Tasks file not found")

@router.get("/tasks/status/{status}")
async def get_tasks_by_status(status: str):
    """Get all tasks with a specific status."""
    try:
        tasks_file = PROJECT_ROOT / "tasks.json"
        with open(tasks_file, 'r') as f:
            data = json.load(f)
        
        if status not in data['columns']:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        return JSONResponse(content=data['columns'][status]['tasks'])
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Tasks file not found")

@router.post("/tasks/{task_id}/move/{new_status}")
async def move_task(task_id: str, new_status: str):
    """Move a task to a different status."""
    try:
        tasks_file = PROJECT_ROOT / "tasks.json"
        
        # Read current data
        with open(tasks_file, 'r') as f:
            data = json.load(f)
        
        # Validate new status
        if new_status not in data['columns']:
            raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")
        
        # Find and remove task from current column
        task_found = None
        for column in data['columns'].values():
            for i, task in enumerate(column['tasks']):
                if task['id'] == task_id:
                    task_found = column['tasks'].pop(i)
                    break
            if task_found:
                break
        
        if not task_found:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        
        # Update task status and add completion date if moving to done
        task_found['status'] = new_status
        if new_status == 'done':
            task_found['completedDate'] = datetime.now().strftime("%Y-%m-%d")
        
        # Add task to new column
        data['columns'][new_status]['tasks'].append(task_found)
        
        # Update statistics
        update_statistics(data)
        
        # Save updated data
        with open(tasks_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        return JSONResponse(content={"message": f"Task {task_id} moved to {new_status}", "task": task_found})
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Tasks file not found")

def update_statistics(data: Dict):
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
    
    for column in data['columns'].values():
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
    data['statistics'] = stats
    data['project']['lastUpdated'] = datetime.now().strftime("%Y-%m-%d")