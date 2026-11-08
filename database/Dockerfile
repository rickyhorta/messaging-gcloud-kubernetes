FROM postgres:15

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssh-server supervisor && \
    mkdir -p /var/run/sshd /root/.ssh && \
    chmod 700 /root/.ssh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY ssh-keys/id_rsa.pub /root/.ssh/authorized_keys
RUN chmod 600 /root/.ssh/authorized_keys

COPY database/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

CMD ["/usr/bin/supervisord", "-n"]
