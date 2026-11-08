FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssh-server supervisor && \
    mkdir -p /var/run/sshd /root/.ssh && \
    chmod 700 /root/.ssh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY services/auth-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/auth-service/src/ ./src

COPY ssh-keys/id_rsa.pub /root/.ssh/authorized_keys
RUN chmod 600 /root/.ssh/authorized_keys

COPY services/auth-service/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000

CMD ["/usr/bin/supervisord", "-n"]