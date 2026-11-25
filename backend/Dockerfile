FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 TF_CPP_MIN_LOG_LEVEL=2 TF_NUM_INTRAOP_THREADS=2 TF_NUM_INTEROP_THREADS=2 OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 DERM_WORK_DIR=/tmp/derm-runtime
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend /app/backend
COPY training /app/training
RUN useradd --create-home --uid 10001 appuser
USER appuser
EXPOSE 7860
CMD ["sh","-c","python backend/prepare_runtime.py && exec uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1 --no-access-log"]
