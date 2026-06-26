"""试卷库 API 路由：试卷 CRUD + 在线测试 + 批改 + 错题本。"""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.dependencies import CurrentUser, DbSession, RequireStudentOrTeacher
from app.models.exam import ErrorNote, ExamAttempt, ExamPaper, ExamQuestion

router = APIRouter(prefix="/exams", tags=["exams"])


# ── Schemas ──

class PaperCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    textbook_id: int | None = None
    time_limit_minutes: int = Field(120, ge=10, le=300)

class PaperUpdate(BaseModel):
    title: str | None = None
    time_limit_minutes: int | None = None

class QuestionCreate(BaseModel):
    type: str = Field(..., pattern=r"^(选择题|填空题|解答题)$")
    stem: str = Field(..., min_length=1)
    options: list[str] = Field(default_factory=list)
    answer: str | None = None
    explanation: str | None = None
    difficulty: int = Field(1, ge=1, le=5)

class QuestionUpdate(BaseModel):
    stem: str | None = None
    options: list[str] | None = None
    answer: str | None = None
    explanation: str | None = None
    difficulty: int | None = None

class SubmitAttempt(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)


# ── 试卷 CRUD ──

@router.get("/papers")
async def list_papers(
    db: DbSession, user: CurrentUser,
    textbook_id: int | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=50),
) -> dict:
    q = select(ExamPaper)
    count_q = select(func.count(ExamPaper.id))
    if textbook_id:
        q = q.where(ExamPaper.textbook_id == textbook_id)
        count_q = count_q.where(ExamPaper.textbook_id == textbook_id)

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(q.order_by(ExamPaper.created_at.desc()).offset(offset).limit(page_size))
    return {"items": [_paper_dict(p) for p in result.scalars().all()], "total": total}


@router.post("/papers", status_code=201)
async def create_paper(payload: PaperCreate, db: DbSession, user: CurrentUser) -> dict:
    paper = ExamPaper(
        title=payload.title, user_id=user.id,
        textbook_id=payload.textbook_id, time_limit_minutes=payload.time_limit_minutes,
    )
    db.add(paper)
    await db.commit()
    await db.refresh(paper)
    return _paper_dict(paper)


@router.get("/papers/{paper_id}")
async def get_paper(paper_id: int, db: DbSession, user: CurrentUser) -> dict:
    paper = await db.get(ExamPaper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="试卷不存在")
    # 获取题目
    result = await db.execute(
        select(ExamQuestion).where(ExamQuestion.paper_id == paper_id)
        .order_by(ExamQuestion.sort_order, ExamQuestion.id)
    )
    questions = [_question_dict(q) for q in result.scalars().all()]
    return {**_paper_dict(paper), "questions": questions}


@router.put("/papers/{paper_id}")
async def update_paper(paper_id: int, payload: PaperUpdate, db: DbSession, user: CurrentUser) -> dict:
    paper = await db.get(ExamPaper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="试卷不存在")
    if paper.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能编辑自己的试卷")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(paper, k, v)
    await db.commit()
    await db.refresh(paper)
    return _paper_dict(paper)


# ── 题目管理 ──

@router.post("/papers/{paper_id}/questions", status_code=201)
async def add_question(paper_id: int, payload: QuestionCreate, db: DbSession, user: CurrentUser) -> dict:
    paper = await db.get(ExamPaper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="试卷不存在")
    if paper.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能编辑自己的试卷")

    count = (await db.execute(
        select(func.count(ExamQuestion.id)).where(ExamQuestion.paper_id == paper_id)
    )).scalar() or 0

    q = ExamQuestion(
        paper_id=paper_id, type=payload.type, stem=payload.stem,
        options=json.dumps(payload.options, ensure_ascii=False), answer=payload.answer,
        explanation=payload.explanation, difficulty=payload.difficulty,
        sort_order=count,
    )
    db.add(q)
    paper.total_questions = count + 1
    await db.commit()
    await db.refresh(q)
    return _question_dict(q)


@router.put("/questions/{question_id}")
async def update_question(question_id: int, payload: QuestionUpdate, db: DbSession, user: CurrentUser) -> dict:
    q = await db.get(ExamQuestion, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="题目不存在")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(q, k, v)
    await db.commit()
    await db.refresh(q)
    return _question_dict(q)


# ── 在线测试 ──

@router.post("/papers/{paper_id}/start")
async def start_test(paper_id: int, db: DbSession, user: CurrentUser) -> dict:
    """开始测试，创建答题记录。"""
    paper = await db.get(ExamPaper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="试卷不存在")
    if paper.status != 1:
        raise HTTPException(status_code=400, detail="试卷未发布")

    attempt = ExamAttempt(
        paper_id=paper_id, user_id=user.id,
        total_score=paper.total_questions * 10,  # 每题 10 分
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    # 返回试卷 + 题目（隐藏答案）
    result = await db.execute(
        select(ExamQuestion).where(ExamQuestion.paper_id == paper_id)
        .order_by(ExamQuestion.sort_order, ExamQuestion.id)
    )
    questions = [_question_dict(q, hide_answer=True) for q in result.scalars().all()]

    return {
        "attempt_id": attempt.id,
        "paper": _paper_dict(paper),
        "questions": questions,
        "total_score": attempt.total_score,
    }


@router.post("/attempts/{attempt_id}/submit")
async def submit_test(attempt_id: int, payload: SubmitAttempt, db: DbSession, user: CurrentUser) -> dict:
    """提交测试，自动批改客观题。"""
    attempt = await db.get(ExamAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="答题记录不存在")
    if attempt.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能提交自己的测试")
    if attempt.submitted_at:
        raise HTTPException(status_code=400, detail="已提交过")

    attempt.answers = json.dumps(payload.answers)
    attempt.submitted_at = datetime.now(timezone.utc)

    # 自动批改客观题
    score = 0
    result_q = await db.execute(
        select(ExamQuestion).where(ExamQuestion.paper_id == attempt.paper_id)
    )
    for q in result_q.scalars().all():
        user_ans = payload.answers.get(str(q.id), "")
        if q.type in ("选择题", "填空题") and q.answer:
            if user_ans.strip().lower() == q.answer.strip().lower():
                score += 10

    attempt.score = score
    attempt.is_graded = True
    await db.commit()
    await db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "score": float(attempt.score),
        "total_score": float(attempt.total_score),
        "is_graded": True,
    }


@router.get("/attempts/{attempt_id}/result")
async def get_result(attempt_id: int, db: DbSession, user: CurrentUser) -> dict:
    attempt = await db.get(ExamAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="答题记录不存在")
    if attempt.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权查看")

    # 获取题目（含答案）
    result = await db.execute(
        select(ExamQuestion).where(ExamQuestion.paper_id == attempt.paper_id)
        .order_by(ExamQuestion.sort_order, ExamQuestion.id)
    )
    questions = [_question_dict(q) for q in result.scalars().all()]
    answers = json.loads(attempt.answers) if attempt.answers else {}

    return {
        "attempt_id": attempt.id,
        "score": float(attempt.score) if attempt.score else 0,
        "total_score": float(attempt.total_score) if attempt.total_score else 0,
        "is_graded": attempt.is_graded,
        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        "questions": questions,
        "answers": answers,
    }


# ── 错题本 ──

@router.get("/errors")
async def list_errors(
    db: DbSession, user: CurrentUser,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=50),
) -> dict:
    q = select(ErrorNote).where(ErrorNote.user_id == user.id, ErrorNote.mastered == False)
    count_q = select(func.count(ErrorNote.id)).where(ErrorNote.user_id == user.id, ErrorNote.mastered == False)
    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(q.order_by(ErrorNote.created_at.desc()).offset(offset).limit(page_size))
    items = []
    for e in result.scalars().all():
        items.append({
            "id": e.id, "question_id": e.question_id,
            "user_answer": e.user_answer, "correct_answer": e.correct_answer,
            "notes": e.notes, "mastered": e.mastered,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.put("/errors/{error_id}")
async def update_error(error_id: int, db: DbSession, user: CurrentUser) -> dict:
    """标记错题为已掌握。"""
    e = await db.get(ErrorNote, error_id)
    if not e:
        raise HTTPException(status_code=404, detail="错题不存在")
    if e.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权操作")
    e.mastered = True
    await db.commit()
    return {"message": "已标记为掌握"}


# ── Helpers ──

def _paper_dict(p: ExamPaper) -> dict:
    return {
        "id": p.id, "title": p.title, "user_id": p.user_id,
        "textbook_id": p.textbook_id, "status": p.status,
        "total_questions": p.total_questions, "time_limit_minutes": p.time_limit_minutes,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }

def _question_dict(q: ExamQuestion, hide_answer: bool = False) -> dict:
    options = json.loads(q.options) if isinstance(q.options, str) else (q.options or [])
    return {
        "id": q.id, "paper_id": q.paper_id, "type": q.type, "stem": q.stem,
        "options": options, "answer": None if hide_answer else q.answer,
        "explanation": None if hide_answer else q.explanation,
        "difficulty": q.difficulty, "sort_order": q.sort_order,
    }
