import sys
import os
import subprocess

if len(sys.argv) < 3:
    print("usage: python task_brief.py PLAN_FILE TASK_NUMBER")
    sys.exit(2)

plan_file = sys.argv[1]
task_num = sys.argv[2]

# Get git sdd directory
try:
    git_dir = subprocess.check_output(["git", "rev-parse", "--git-path", "sdd"]).decode().strip()
except Exception as e:
    git_dir = os.path.join(".git", "sdd")

os.makedirs(git_dir, exist_ok=True)
out_file = os.path.join(git_dir, f"task-{task_num}-brief.md")

with open(plan_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_fence = False
in_task = False
task_lines = []

for line in lines:
    if line.startswith("```"):
        in_fence = not in_fence
    
    if not in_fence and line.strip().startswith("### Task"):
        parts = line.strip().split()
        if len(parts) >= 3:
            # Look for the task number (e.g. Task 1:)
            # Extract numbers from parts[2] (e.g. "1:")
            digits = "".join(filter(str.isdigit, parts[2]))
            if not digits and len(parts) > 3:
                digits = "".join(filter(str.isdigit, parts[3]))
            if digits == task_num:
                in_task = True
            else:
                in_task = False
        else:
            in_task = False
            
    if in_task:
        task_lines.append(line)

if not task_lines:
    print(f"Error: task {task_num} not found in {plan_file}", file=sys.stderr)
    sys.exit(3)

with open(out_file, 'w', encoding='utf-8') as f:
    f.writelines(task_lines)

print(f"wrote {out_file}: {len(task_lines)} lines")
