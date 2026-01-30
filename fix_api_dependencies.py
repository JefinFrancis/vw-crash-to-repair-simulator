#!/usr/bin/env python3
"""
Fix FastAPI dependency injection parameter ordering across all API files.
Dependency parameters must come before parameters with default values.
"""

import os
import re
from pathlib import Path

def fix_function_signature(content: str, service_param: str, service_type: str) -> str:
    """Fix function signatures to put service dependencies first."""
    
    # Pattern to match function signatures with dependency parameters at the end
    pattern = rf'(async def \w+\([^)]*?)(\s*{re.escape(service_param)}: {re.escape(service_type)})(\s*\) -> [^:]+:)'
    
    def reorder_params(match):
        func_start = match.group(1)
        service_dep = match.group(2)
        func_end = match.group(3)
        
        # Check if there are already parameters
        if func_start.strip().endswith('('):
            # No other parameters, just add the service dependency
            return func_start + service_dep + func_end
        else:
            # Move service dependency to the beginning
            return func_start.replace(func_start.split('(')[0] + '(', 
                                    func_start.split('(')[0] + '(\n    ' + service_dep.strip() + ',') + func_end
    
    return re.sub(pattern, reorder_params, content, flags=re.DOTALL)

def fix_api_file(file_path: Path):
    """Fix dependency injection issues in a single API file."""
    print(f"Fixing {file_path}")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Define service patterns for each file
    service_mappings = {
        'vehicles.py': ('vehicle_service', 'VehicleServiceDep'),
        'dealers.py': ('dealer_service', 'DealerServiceDep'),
        'parts.py': ('part_service', 'PartServiceDep'),
        'damage.py': ('damage_service', 'DamageReportServiceDep'),
        'appointments.py': ('appointment_service', 'AppointmentServiceDep'),
    }
    
    filename = file_path.name
    if filename in service_mappings:
        service_param, service_type = service_mappings[filename]
        
        # Simple fix: move all service dependencies to the start of parameter lists
        # Find function definitions and reorder parameters
        lines = content.split('\n')
        new_lines = []
        in_function = False
        function_lines = []
        
        for line in lines:
            if re.match(r'^(async )?def \w+\(', line.strip()):
                in_function = True
                function_lines = [line]
            elif in_function and line.strip().startswith(')'):
                function_lines.append(line)
                # Process the complete function signature
                func_text = '\n'.join(function_lines)
                
                # Check if this function has our service dependency
                if f'{service_param}: {service_type}' in func_text:
                    # Simple approach: move the service dependency line to the front
                    func_lines = func_text.split('\n')
                    service_line = None
                    other_lines = []
                    
                    for i, func_line in enumerate(func_lines):
                        if f'{service_param}: {service_type}' in func_line:
                            service_line = func_line
                        else:
                            other_lines.append(func_line)
                    
                    if service_line and len(other_lines) > 1:
                        # Reconstruct with service dependency first
                        new_func = [other_lines[0]]  # function definition line
                        new_func.append(service_line)
                        new_func.extend(other_lines[1:])
                        new_lines.extend(new_func)
                    else:
                        new_lines.extend(func_lines)
                else:
                    new_lines.extend(func_lines)
                
                in_function = False
                function_lines = []
            elif in_function:
                function_lines.append(line)
            else:
                new_lines.append(line)
        
        content = '\n'.join(new_lines)
    
    with open(file_path, 'w') as f:
        f.write(content)

def main():
    """Fix all API files."""
    api_dir = Path('/home/jefin/Desktop/VW/vw-crash-to-repair-simulator/backend/src/api/v1')
    
    for file_path in api_dir.glob('*.py'):
        if file_path.name not in ['__init__.py', 'health.py', 'beamng.py']:
            fix_api_file(file_path)
    
    print("Fixed all API dependency injection issues!")

if __name__ == '__main__':
    main()