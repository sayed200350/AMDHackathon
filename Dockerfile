FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir streamlit httpx python-dotenv

COPY ui/app.py /app/app.py

ENV API_BASE=http://129.212.186.87:8080

EXPOSE 8501

HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

ENTRYPOINT ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0", "--server.headless=true"]
