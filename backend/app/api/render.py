"""LaTeX/Markdown → PNG 服务端渲染 API。"""
import io
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

router = APIRouter(prefix="/render", tags=["render"])


class RenderRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    mode: str = Field("latex", pattern=r"^(latex|markdown)$")
    width: int = Field(800, ge=100, le=2000)


def _latex_to_png(latex: str, width: int = 800) -> bytes:
    """用 LaTeX standalone 类 + dvipng 生成 PNG。"""
    tex = r"""\documentclass[preview,border=12pt]{standalone}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage[UTF8]{ctex}
\begin{document}
\Large
""" + latex + r"""
\end{document}"""
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = Path(tmpdir) / "formula.tex"
        tex_path.write_text(tex, encoding="utf-8")
        # xelatex → pdf → png
        subprocess.run(["xelatex", "-interaction=nonstopmode", "-output-directory", tmpdir, str(tex_path)],
                       capture_output=True, timeout=10)
        pdf_path = Path(tmpdir) / "formula.pdf"
        if not pdf_path.exists():
            raise RuntimeError("xelatex failed")
        # pdftoppm 转 PNG
        subprocess.run(["pdftoppm", "-png", "-r", "300", str(pdf_path), str(Path(tmpdir) / "out")],
                       capture_output=True, timeout=10)
        png_path = Path(tmpdir) / "out-1.png"
        if not png_path.exists():
            # 尝试不带 -1 后缀
            candidates = list(Path(tmpdir).glob("out*.png"))
            if candidates:
                png_path = candidates[0]
            else:
                raise RuntimeError("pdftoppm failed")
        return png_path.read_bytes()


def _markdown_to_png(md: str, width: int = 800) -> bytes:
    """用 pandoc + LaTeX → PDF → PNG。"""
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = Path(tmpdir) / "doc.tex"
        # pandoc markdown → standalone latex
        result = subprocess.run(
            ["pandoc", "-f", "markdown", "-t", "latex", "--standalone",
             "-V", f"geometry:paperwidth={width}pt",
             "--highlight-style=tango"],
            input=md.encode("utf-8"), capture_output=True, timeout=10
        )
        if result.returncode != 0:
            raise RuntimeError(f"pandoc failed: {result.stderr.decode()}")
        tex_path.write_text(result.stdout.decode("utf-8"), encoding="utf-8")
        subprocess.run(["xelatex", "-interaction=nonstopmode", "-output-directory", tmpdir, str(tex_path)],
                       capture_output=True, timeout=15)
        pdf_path = Path(tmpdir) / "doc.pdf"
        if not pdf_path.exists():
            raise RuntimeError("xelatex failed for markdown")
        subprocess.run(["pdftoppm", "-png", "-r", "200", str(pdf_path), str(Path(tmpdir) / "out")],
                       capture_output=True, timeout=10)
        candidates = list(Path(tmpdir).glob("out*.png"))
        if not candidates:
            raise RuntimeError("pdftoppm failed")
        return candidates[0].read_bytes()


@router.post("/image")
async def render_image(payload: RenderRequest) -> Response:
    """将 LaTeX/Markdown 渲染为 PNG 图片。"""
    try:
        if payload.mode == "latex":
            png_data = _latex_to_png(payload.content, payload.width)
        else:
            png_data = _markdown_to_png(payload.content, payload.width)
        return Response(content=png_data, media_type="image/png",
                        headers={"Content-Disposition": "inline; filename=rendered.png"})
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"渲染失败: {str(e)}")
