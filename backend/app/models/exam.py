"""Exam ORM 模型 - 试卷、题目、答题记录、错题本。"""
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ExamPaper(Base):
    """试卷表。"""

    __tablename__ = "exam_papers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    textbook_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    source_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0:编辑中 1:已发布
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=120)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ExamQuestion(Base):
    """试题表。"""

    __tablename__ = "exam_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    paper_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exam_papers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # 选择题/填空题/解答题
    stem: Mapped[str] = mapped_column(Text, nullable=False)  # 题干 (Markdown)
    options: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON: ["A. ...", ...]
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # 1-5
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ExamAttempt(Base):
    """答题记录表。"""

    __tablename__ = "exam_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    paper_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    answers: Mapped[str] = mapped_column(Text, nullable=False, default="{}")  # JSON
    score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    total_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    is_graded: Mapped[bool] = mapped_column(default=False, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    grading_result: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON


class ErrorNote(Base):
    """错题本表。"""

    __tablename__ = "error_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    mastered: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
