import sys
import os
import subprocess

if len(sys.argv) < 3:
    print("usage: python review_package.py BASE HEAD")
    sys.exit(2)

base = sys.argv[1]
head = sys.argv[2]

try:
    git_dir = subprocess.check_output(["git", "rev-parse", "--git-path", "sdd"]).decode().strip()
except Exception:
    git_dir = os.path.join(".git", "sdd")

os.makedirs(git_dir, exist_ok=True)

try:
    base_short = subprocess.check_output(["git", "rev-parse", "--short", base]).decode().strip()
    head_short = subprocess.check_output(["git", "rev-parse", "--short", head]).decode().strip()
except Exception as e:
    print(f"Error verifying commits: {e}", file=sys.stderr)
    sys.exit(2)

out_file = os.path.join(git_dir, f"review-{base_short}..{head_short}.diff")

try:
    commits = subprocess.check_output(["git", "log", "--oneline", f"{base}..{head}"]).decode(errors='replace')
    files_changed = subprocess.check_output(["git", "diff", "--stat", f"{base}..{head}"]).decode(errors='replace')
    diff = subprocess.check_output(["git", "diff", "-U10", f"{base}..{head}"]).decode(errors='replace')
except Exception as e:
    print(f"Error running git diff: {e}", file=sys.stderr)
    sys.exit(3)

with open(out_file, 'w', encoding='utf-8') as f:
    f.write(f"# Review package: {base}..{head}\n\n")
    f.write("## Commits\n")
    f.write(commits)
    f.write("\n## Files changed\n")
    f.write(files_changed)
    f.write("\n## Diff\n")
    f.write(diff)

commit_count = len(commits.strip().split('\n')) if commits.strip() else 0
file_size = os.path.getsize(out_file)
print(f"wrote {out_file}: {commit_count} commit(s), {file_size} bytes")
