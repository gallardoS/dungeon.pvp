FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV FLASK_APP=src/game/server.py
ENV PYTHONPATH=/app

EXPOSE 8080

CMD ["python", "src/game/server.py"]
