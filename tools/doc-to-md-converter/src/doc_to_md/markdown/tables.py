def escape_markdown_cell(value: object) -> str:
    text = "" if value is None else str(value)
    text = text.replace("\n", " ").replace("\r", " ")
    text = text.replace("|", "\\|")
    text = " ".join(text.split())
    return text


def rows_to_markdown_table(rows: list[list[object]]) -> str:
    if not rows:
        return ""

    max_columns = max(len(row) for row in rows)

    normalized_rows = []
    for row in rows:
        normalized = list(row) + [""] * (max_columns - len(row))
        normalized_rows.append([escape_markdown_cell(cell) for cell in normalized])

    header = normalized_rows[0]
    body = normalized_rows[1:]

    lines = []
    lines.append("| " + " | ".join(header) + " |")
    lines.append("| " + " | ".join(["---"] * max_columns) + " |")

    for row in body:
        lines.append("| " + " | ".join(row) + " |")

    return "\n".join(lines)
