import markdown
import sys

with open('Technical_Document.md', 'r', encoding='utf-8') as f:
    text = f.read()

html_content = markdown.markdown(text, extensions=['fenced_code', 'tables'])

html_template = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Technical Document</title>
    <style>
        body {{ font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        code {{ background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; }}
        pre {{ background-color: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }}
        .mermaid {{ margin-bottom: 20px; }}
    </style>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({{ startOnLoad: true }});
    </script>
</head>
<body>
    {html_content.replace('<pre><code class="language-mermaid">', '<div class="mermaid">').replace('</code></pre>', '</div>')}
</body>
</html>
"""

with open('Technical_Document.html', 'w', encoding='utf-8') as f:
    f.write(html_template)
