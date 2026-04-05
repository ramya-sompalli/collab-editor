# Simple Operational Transformation engine

def transform(op1: dict, op2: dict) -> dict:
    """Transform op1 against op2 so they can be applied in any order."""
    if op1["type"] == "insert" and op2["type"] == "insert":
        if op2["pos"] <= op1["pos"]:
            op1["pos"] += len(op2["char"])
    elif op1["type"] == "insert" and op2["type"] == "delete":
        if op2["pos"] < op1["pos"]:
            op1["pos"] -= 1
    elif op1["type"] == "delete" and op2["type"] == "insert":
        if op2["pos"] <= op1["pos"]:
            op1["pos"] += len(op2["char"])
    elif op1["type"] == "delete" and op2["type"] == "delete":
        if op2["pos"] < op1["pos"]:
            op1["pos"] -= 1
        elif op2["pos"] == op1["pos"]:
            op1["type"] = "noop"
    return op1

def apply_operation(content: str, op: dict) -> str:
    """Apply an operation to document content."""
    if op["type"] == "insert":
        pos = op["pos"]
        return content[:pos] + op["char"] + content[pos:]
    elif op["type"] == "delete":
        pos = op["pos"]
        return content[:pos] + content[pos+1:]
    elif op["type"] == "full_sync":
        return op["content"]
    return content