from fastapi import APIRouter
from pydantic import BaseModel
import subprocess, tempfile, os

router = APIRouter(prefix="/execute", tags=["execute"])

LANGUAGE_CONFIG = {
    "python":     {"cmd": ["python"],   "ext": ".py"},
    "javascript": {"cmd": ["node"],     "ext": ".js"},
    "typescript": {"cmd": ["npx", "ts-node"], "ext": ".ts"},
    "java":       {"cmd": ["java"],     "ext": ".java"},
    "cpp":        {"cmd": ["g++", "-o", "out.exe", "-x", "c++"], "ext": ".cpp", "run": ["out.exe"]},
    "c":          {"cmd": ["gcc", "-o", "out.exe", "-x", "c"],   "ext": ".c",   "run": ["out.exe"]},
    "php":        {"cmd": ["php"],      "ext": ".php"},
    "ruby":       {"cmd": ["ruby"],     "ext": ".rb"},
    "go":         {"cmd": ["go", "run"],"ext": ".go"},
}

class ExecuteRequest(BaseModel):
    code: str
    language: str = "python"

@router.post("/")
def execute_code(data: ExecuteRequest):
    config = LANGUAGE_CONFIG.get(data.language)

    # Languages that are syntax only (no execution)
    if not config:
        return {"stdout": f"✅ {data.language.upper()} is display-only in this editor (no execution needed)", "stderr": ""}

    with tempfile.NamedTemporaryFile(
        suffix=config["ext"], delete=False, mode="w", encoding="utf-8"
    ) as f:
        f.write(data.code)
        tmp_path = f.name

    try:
        # For C/C++ — compile first then run
        if data.language in ("cpp", "c"):
            out_path = tmp_path.replace(config["ext"], ".exe")
            compile_cmd = config["cmd"] + [tmp_path, "-o", out_path]
            compile_result = subprocess.run(
                compile_cmd, capture_output=True, text=True, timeout=10
            )
            if compile_result.returncode != 0:
                return {"stdout": "", "stderr": compile_result.stderr}
            run_result = subprocess.run(
                [out_path], capture_output=True, text=True, timeout=10
            )
            return {"stdout": run_result.stdout, "stderr": run_result.stderr}

        # For Java — special handling
        elif data.language == "java":
            import re
            match = re.search(r'public\s+class\s+(\w+)', data.code)
            class_name = match.group(1) if match else "Main"
            dir_path = os.path.dirname(tmp_path)
            java_path = os.path.join(dir_path, f"{class_name}.java")
            with open(java_path, "w") as jf:
                jf.write(data.code)
            compile_result = subprocess.run(
                ["javac", java_path], capture_output=True, text=True, timeout=10
            )
            if compile_result.returncode != 0:
                return {"stdout": "", "stderr": compile_result.stderr}
            run_result = subprocess.run(
                ["java", "-cp", dir_path, class_name],
                capture_output=True, text=True, timeout=10
            )
            return {"stdout": run_result.stdout, "stderr": run_result.stderr}

        # All other languages
        else:
            result = subprocess.run(
                config["cmd"] + [tmp_path],
                capture_output=True, text=True, timeout=10
            )
            return {"stdout": result.stdout, "stderr": result.stderr}

    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "⏰ Execution timed out (10s limit)"}
    except FileNotFoundError as e:
        return {"stdout": "", "stderr": f"❌ Runtime not installed: {str(e)}"}
    except Exception as e:
        return {"stdout": "", "stderr": f"❌ Error: {str(e)}"}
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass