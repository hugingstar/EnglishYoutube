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
        /* 기본 화면 스타일 - 여백 축소 */
        body {{ font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; max-width: 1000px; margin: 0 auto; padding: 15px; box-sizing: border-box; }}
        table {{ border-collapse: collapse; width: 100%; margin-bottom: 20px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        code {{ background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; }}
        pre {{ background-color: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }}
        
        .mermaid {{ 
            margin: 20px auto; 
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
        }}

        /* PDF 인쇄(Print) 스타일 - 양쪽 여백 좁게, 그림 회전(가로모드) */
        @media print {{
            @page {{ 
                margin: 10mm; /* 양쪽 여백을 매우 좁게 설정 */
                size: A4 landscape; /* 그림과 글씨가 작아지는 것을 방지하기 위해 용지 자체를 90도 회전(가로) */
            }}
            body {{ 
                padding: 0; 
                max-width: 100%;
            }}
        }}
    </style>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({{ 
            startOnLoad: true,
            theme: 'default'
        }});
    </script>
</head>
<body>
    {html_content.replace('<pre><code class="language-mermaid">', '<div class="mermaid">').replace('</code></pre>', '</div>')}
</body>
</html>
"""

with open('Technical_Document.html', 'w', encoding='utf-8') as f:
    f.write(html_template)
