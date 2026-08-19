import markdown
import sys

with open('README.md', 'r', encoding='utf-8') as f:
    text = f.read()

html_content = markdown.markdown(text, extensions=['fenced_code', 'tables'])

html_template = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Technical Document</title>
    <style>
        /* 기본 화면 및 인쇄 스타일 */
        body {{ 
            font-family: 'Malgun Gothic', sans-serif; 
            font-size: 11pt; /* 요청하신 11pt 글자 크기 */
            line-height: 1.6; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 20px; 
            box-sizing: border-box; 
        }}
        h1, h2, h3, h4, h5, h6 {{
            font-family: inherit; /* 타이틀은 기본 글자체 */
        }}
        table {{ border-collapse: collapse; width: 100%; margin-bottom: 20px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11pt; }}
        th {{ background-color: #f2f2f2; }}
        code {{ background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; }}
        pre {{ background-color: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }}
        
        .mermaid {{ 
            margin: 30px auto; 
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
            width: 100%;
            overflow: visible;
        }}
        .mermaid svg {{
            max-width: 100%;
            height: auto;
        }}

        /* PDF 인쇄(Print) 전용 스타일 */
        @media print {{
            @page {{ 
                size: A4 portrait; /* 용지 세로 방향 설정 시 글자 크기가 작아지지 않도록 꽉 차게 렌더링 */
                margin: 10mm; /* 양쪽 여백 너비 좁게 */
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
            theme: 'default',
            securityLevel: 'loose'
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
