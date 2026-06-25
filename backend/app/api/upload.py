"""通用文件上传 API：图片、讲义附件等。"""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from app.dependencies import CurrentUser

router = APIRouter(prefix="/upload", tags=["upload"])

# 上传目录
UPLOAD_DIR = Path("uploads/images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
}
MAX_SIZE = 500 * 1024 * 1024  # 500MB


@router.post("/image")
async def upload_image(file: UploadFile = File(...), user: CurrentUser = None):
    """上传图片，返回可访问的 URL。"""
    if not file.content_type or file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {file.content_type}，仅支持 JPG/PNG/WebP/GIF/SVG")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"文件大小不能超过 {MAX_SIZE // 1024 // 1024}MB")

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(content)

    url = f"/api/v1/upload/images/{filename}"
    return {"url": url, "filename": filename, "size": len(content), "type": file.content_type}


@router.get("/images/{filename}")
async def serve_image(filename: str):
    """返回已上传的图片文件。"""
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="图片不存在")
    # 根据扩展名返回正确 MIME
    ext = filename.rsplit(".", 1)[-1].lower()
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                "gif": "image/gif", "webp": "image/webp", "svg": "image/svg+xml"}
    return FileResponse(filepath, media_type=mime_map.get(ext, "image/jpeg"))
